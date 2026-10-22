"use server";

import { revalidatePath } from "next/cache";
import { ecole } from "@/lib/data/ecole";
import { requirePermission } from "@/lib/auth/session";
import { enregistrerAudit } from "@/lib/audit";
import { CAISSES, enregistrerTransfert, LIB_CAISSE, soldeCaisse, type CaisseT } from "@/lib/tresorerie/tresorerie";
import { capter } from "@/lib/actions/serveur";
import { calculerEcheancier } from "@/lib/tresorerie/echeancier";
import { listerPrets } from "@/lib/tresorerie/prets";

const TYPES = ["APPORT_CAPITAL", "DEPENSE", "RETRAIT_PROMOTEUR"] as const;
type TypeM = (typeof TYPES)[number];

function caisseValide(v: FormDataEntryValue | null): CaisseT {
  const c = String(v ?? "");
  if (!(CAISSES as readonly string[]).includes(c)) throw new Error("Caisse invalide");
  return c as CaisseT;
}

async function creerMouvementCorps(formData: FormData) {
  const type = String(formData.get("type") ?? "") as TypeM;
  if (!TYPES.includes(type)) throw new Error("Type de mouvement invalide");
  // Depenses : direction et comptabilite. Apports et retraits : directeur seul.
  const user = await requirePermission(type === "DEPENSE" ? "tresorerie.depense" : "tresorerie.capital");
  const db = ecole(user);

  const caisse = caisseValide(formData.get("caisse"));
  const montant = Number(formData.get("montant"));
  const origineApport: "PRET" | "FONDS_PROPRES" | null =
    type === "APPORT_CAPITAL" ? (formData.get("origineApport") === "PRET" ? "PRET" : "FONDS_PROPRES") : null;
  const preteur = String(formData.get("preteur") ?? "").trim();
  const libelleSaisi = String(formData.get("libelle") ?? "").trim();
  const libelle = origineApport === "PRET" && !libelleSaisi ? "Prêt de " + preteur : libelleSaisi;
  const categorie = type === "DEPENSE" ? String(formData.get("categorie") ?? "").trim() || "Autre" : null;
  const reference = String(formData.get("reference") ?? "").trim() || null;
  const dateTexte = String(formData.get("date") ?? "");
  const date = dateTexte ? new Date(dateTexte) : new Date();
  if (!Number.isFinite(montant) || montant <= 0) throw new Error("Montant invalide");
  if (libelle.length < 3) throw new Error("Indiquez un libellé (3 caractères minimum)");
  if (Number.isNaN(date.getTime())) throw new Error("Date invalide");

  // Sorties : le solde de la caisse doit couvrir le montant, sauf derogation du directeur
  let derogation = false;
  let motifDerogation: string | null = null;
  if (type !== "APPORT_CAPITAL") {
    const disponible = await soldeCaisse(user.etablissementId, caisse);
    if (montant > disponible + 0.01) {
      const demande = formData.get("derogation") === "on";
      motifDerogation = String(formData.get("motifDerogation") ?? "").trim() || null;
      if (!demande || !user.roles.includes("DIRECTEUR")) {
        throw new Error(
          "Solde insuffisant en caisse " + LIB_CAISSE[caisse] + " : " + disponible.toLocaleString("fr-FR") + " F disponibles"
        );
      }
      if (!motifDerogation || motifDerogation.length < 5) throw new Error("Motif de dérogation obligatoire (5 caractères minimum)");
      derogation = true;
    }
  }

  const donnees = {
    etablissementId: user.etablissementId,
    type,
    caisse,
    date,
    montant,
    libelle,
    categorie,
    reference,
    origineApport,
    derogation,
    motifDerogation,
    saisieParId: user.id,
  };

  // Pret : le pret, son echeancier et l'entree d'argent sont enregistres ensemble
  let pretId: string | null = null;
  const m =
    origineApport === "PRET"
      ? await db.$transaction(async (tx) => {
          const p = lirePret(formData, preteur, montant, date);
          const pret = await tx.pret.create({
            data: {
              etablissementId: user.etablissementId,
              ...p,
              saisieParId: user.id,
              echeances: { create: calculerEcheancier(montant, p.tauxAnnuel, p.dureeMois, p.premiereEcheance) },
            },
          });
          pretId = pret.id;
          return tx.mouvementTresorerie.create({ data: { ...donnees, pretId: pret.id } });
        })
      : await db.mouvementTresorerie.create({ data: donnees });

  await enregistrerAudit({
    userId: user.id,
    action: "TRESORERIE_" + type,
    entite: "MouvementTresorerie",
    entiteId: m.id,
    details: { caisse, montant, libelle, derogation, origineApport, pretId },
  });
  revalidatePath("/tresorerie");
  revalidatePath("/finance");
  revalidatePath("/dashboard");
  return { id: m.id };
}

// Conditions d'un pret saisies avec l'apport
function lirePret(formData: FormData, preteur: string, montant: number, dateObtention: Date) {
  const dureeMois = Number(formData.get("dureeMois"));
  const tauxAnnuel = Number(String(formData.get("tauxAnnuel") ?? "0").replace(",", ".") || 0);
  const premiere = String(formData.get("premiereEcheance") ?? "");
  const premiereEcheance = premiere ? new Date(premiere) : new Date(dateObtention.getFullYear(), dateObtention.getMonth() + 1, dateObtention.getDate());
  const notes = String(formData.get("notesPret") ?? "").trim() || null;
  if (preteur.length < 2) throw new Error("Indiquez le prêteur (banque, microfinance, personne…)");
  if (!Number.isInteger(dureeMois) || dureeMois < 1 || dureeMois > 360) throw new Error("Durée du prêt entre 1 et 360 mois");
  if (!Number.isFinite(tauxAnnuel) || tauxAnnuel < 0 || tauxAnnuel > 100) throw new Error("Taux d'intérêt annuel invalide");
  if (Number.isNaN(premiereEcheance.getTime())) throw new Error("Date de première échéance invalide");
  if (premiereEcheance < dateObtention) throw new Error("La première échéance doit suivre la date du prêt");
  return { preteur, montant, tauxAnnuel, dureeMois, dateObtention, premiereEcheance, notes };
}

// Remboursement d'un pret : sortie de caisse, plafonnee au reste du.
// Solde insuffisant : derogation du directeur, comme les autres sorties.
async function rembourserPretCorps(formData: FormData) {
  const user = await requirePermission("tresorerie.capital");
  const db = ecole(user);
  const pretId = String(formData.get("pretId") ?? "");
  const caisse = caisseValide(formData.get("caisse"));
  const montant = Number(formData.get("montant"));
  const reference = String(formData.get("reference") ?? "").trim() || null;
  const dateTexte = String(formData.get("date") ?? "");
  const date = dateTexte ? new Date(dateTexte) : new Date();
  if (!Number.isFinite(montant) || montant <= 0) throw new Error("Montant invalide");
  if (Number.isNaN(date.getTime())) throw new Error("Date invalide");

  const pret = (await listerPrets(user.etablissementId)).find((p) => p.id === pretId);
  if (!pret) throw new Error("Prêt introuvable");
  if (montant > pret.resteDu + 0.5) throw new Error("Le montant dépasse le reste dû : " + pret.resteDu.toLocaleString("fr-FR") + " F");

  let derogation = false;
  let motifDerogation: string | null = null;
  const disponible = await soldeCaisse(user.etablissementId, caisse);
  if (montant > disponible + 0.01) {
    motifDerogation = String(formData.get("motifDerogation") ?? "").trim() || null;
    if (formData.get("derogation") !== "on" || !user.roles.includes("DIRECTEUR")) {
      throw new Error("Solde insuffisant en caisse " + LIB_CAISSE[caisse] + " : " + disponible.toLocaleString("fr-FR") + " F disponibles");
    }
    if (!motifDerogation || motifDerogation.length < 5) throw new Error("Motif de dérogation obligatoire (5 caractères minimum)");
    derogation = true;
  }

  const m = await db.mouvementTresorerie.create({
    data: {
      etablissementId: user.etablissementId,
      type: "REMBOURSEMENT_PRET",
      caisse,
      date,
      montant,
      libelle: "Remboursement du prêt de " + pret.preteur,
      reference,
      pretId: pret.id,
      derogation,
      motifDerogation,
      saisieParId: user.id,
    },
  });
  await enregistrerAudit({
    userId: user.id,
    action: "TRESORERIE_REMBOURSEMENT_PRET",
    entite: "MouvementTresorerie",
    entiteId: m.id,
    details: { pretId: pret.id, caisse, montant, derogation },
  });
  revalidatePath("/tresorerie");
  revalidatePath("/finance");
  revalidatePath("/dashboard");
  return { id: m.id };
}

// Transfert entre caisses : direction et comptabilite (comme les depenses).
// Derogation au solde insuffisant : directeur seul.
async function creerTransfertCorps(formData: FormData) {
  const user = await requirePermission("tresorerie.depense");
  const de = caisseValide(formData.get("de"));
  const vers = caisseValide(formData.get("vers"));
  const dateTexte = String(formData.get("date") ?? "");
  const demandeDerogation = formData.get("derogation") === "on" && user.roles.includes("DIRECTEUR");

  const m = await enregistrerTransfert(user.etablissementId, {
    de,
    vers,
    montant: Number(formData.get("montant")),
    date: dateTexte ? new Date(dateTexte) : new Date(),
    libelle: String(formData.get("libelle") ?? ""),
    reference: String(formData.get("reference") ?? ""),
    motifDerogation: demandeDerogation ? String(formData.get("motifDerogation") ?? "") : null,
    saisieParId: user.id,
  });
  await enregistrerAudit({
    userId: user.id,
    action: "TRESORERIE_TRANSFERT",
    entite: "MouvementTresorerie",
    entiteId: m.id,
    details: { de, vers, montant: m.montant, derogation: m.derogation },
  });
  revalidatePath("/tresorerie");
  revalidatePath("/dashboard");
  return { id: m.id };
}

async function annulerMouvementCorps(id: string, motif: string) {
  const user = await requirePermission("tresorerie.capital");
  const db = ecole(user);
  if (!motif || motif.trim().length < 3) throw new Error("Motif obligatoire (3 caractères minimum)");
  const m = await db.mouvementTresorerie.findUnique({ where: { id } });
  if (!m || m.etablissementId !== user.etablissementId) throw new Error("Mouvement introuvable");
  if (m.annule) throw new Error("Déjà annulé");

  // Annuler l'argent recu d'un pret annule le pret, s'il n'a encore aucun remboursement
  const annulePret = m.type === "APPORT_CAPITAL" && m.pretId;
  if (annulePret) {
    const remboursements = await db.mouvementTresorerie.count({ where: { pretId: m.pretId, type: "REMBOURSEMENT_PRET", annule: false } });
    if (remboursements > 0) throw new Error("Ce prêt a des remboursements : annulez-les d'abord");
  }
  await db.$transaction(async (tx) => {
    await tx.mouvementTresorerie.update({ where: { id }, data: { annule: true, motifAnnulation: motif.trim() } });
    if (annulePret) await tx.pret.update({ where: { id: m.pretId! }, data: { annule: true, motifAnnulation: motif.trim() } });
  });
  await enregistrerAudit({
    userId: user.id,
    action: "TRESORERIE_ANNULATION",
    entite: "MouvementTresorerie",
    entiteId: id,
    details: { motif, pretAnnule: annulePret ? m.pretId : null },
  });
  revalidatePath("/tresorerie");
  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

async function creerDepenseRecurrenteCorps(formData: FormData) {
  const user = await requirePermission("tresorerie.depense");
  const db = ecole(user);
  const libelle = String(formData.get("libelle") ?? "").trim();
  const categorie = String(formData.get("categorie") ?? "").trim() || "Autre";
  const montant = Number(formData.get("montant"));
  const jourEcheance = Number(formData.get("jourEcheance"));
  const caisse = caisseValide(formData.get("caisse"));
  if (libelle.length < 3) throw new Error("Indiquez un libellé");
  if (!Number.isFinite(montant) || montant <= 0) throw new Error("Montant invalide");
  if (!Number.isInteger(jourEcheance) || jourEcheance < 1 || jourEcheance > 28) throw new Error("Jour d'échéance entre 1 et 28");
  const d = await db.depenseRecurrente.create({
    data: { etablissementId: user.etablissementId, libelle, categorie, montant, jourEcheance, caisse },
  });
  await enregistrerAudit({ userId: user.id, action: "DEPENSE_RECURRENTE_CREEE", entite: "DepenseRecurrente", entiteId: d.id });
  revalidatePath("/tresorerie");
}

async function basculerDepenseRecurrenteCorps(id: string) {
  const user = await requirePermission("tresorerie.depense");
  const db = ecole(user);
  const d = await db.depenseRecurrente.findUnique({ where: { id } });
  if (!d || d.etablissementId !== user.etablissementId) throw new Error("Dépense introuvable");
  await db.depenseRecurrente.update({ where: { id }, data: { actif: !d.actif } });
  revalidatePath("/tresorerie");
}

// Actions appelees par le client : l'erreur metier est renvoyee au lieu d'etre levee,
// sinon Next la remplace par un message generique en production (voir lib/actions/serveur.ts)
export async function creerMouvement(...a: Parameters<typeof creerMouvementCorps>) {
  return capter(() => creerMouvementCorps(...a));
}
export async function creerTransfert(...a: Parameters<typeof creerTransfertCorps>) {
  return capter(() => creerTransfertCorps(...a));
}
export async function rembourserPret(...a: Parameters<typeof rembourserPretCorps>) {
  return capter(() => rembourserPretCorps(...a));
}
export async function annulerMouvement(...a: Parameters<typeof annulerMouvementCorps>) {
  return capter(() => annulerMouvementCorps(...a));
}
export async function creerDepenseRecurrente(...a: Parameters<typeof creerDepenseRecurrenteCorps>) {
  return capter(() => creerDepenseRecurrenteCorps(...a));
}
export async function basculerDepenseRecurrente(...a: Parameters<typeof basculerDepenseRecurrenteCorps>) {
  return capter(() => basculerDepenseRecurrenteCorps(...a));
}
