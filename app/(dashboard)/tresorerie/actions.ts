"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { enregistrerAudit } from "@/lib/audit";
import { CAISSES, LIB_CAISSE, soldeCaisse, type CaisseT } from "@/lib/tresorerie/tresorerie";
import { capter } from "@/lib/actions/serveur";

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

  const caisse = caisseValide(formData.get("caisse"));
  const montant = Number(formData.get("montant"));
  const libelle = String(formData.get("libelle") ?? "").trim();
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

  const m = await prisma.mouvementTresorerie.create({
    data: {
      etablissementId: user.etablissementId,
      type,
      caisse,
      date,
      montant,
      libelle,
      categorie,
      reference,
      derogation,
      motifDerogation,
      saisieParId: user.id,
    },
  });
  await enregistrerAudit({
    userId: user.id,
    action: "TRESORERIE_" + type,
    entite: "MouvementTresorerie",
    entiteId: m.id,
    details: { caisse, montant, libelle, derogation },
  });
  revalidatePath("/tresorerie");
  revalidatePath("/dashboard");
  return { id: m.id };
}

async function annulerMouvementCorps(id: string, motif: string) {
  const user = await requirePermission("tresorerie.capital");
  if (!motif || motif.trim().length < 3) throw new Error("Motif obligatoire (3 caractères minimum)");
  const m = await prisma.mouvementTresorerie.findUnique({ where: { id } });
  if (!m || m.etablissementId !== user.etablissementId) throw new Error("Mouvement introuvable");
  if (m.annule) throw new Error("Déjà annulé");
  await prisma.mouvementTresorerie.update({ where: { id }, data: { annule: true, motifAnnulation: motif.trim() } });
  await enregistrerAudit({ userId: user.id, action: "TRESORERIE_ANNULATION", entite: "MouvementTresorerie", entiteId: id, details: { motif } });
  revalidatePath("/tresorerie");
  revalidatePath("/dashboard");
}

async function creerDepenseRecurrenteCorps(formData: FormData) {
  const user = await requirePermission("tresorerie.depense");
  const libelle = String(formData.get("libelle") ?? "").trim();
  const categorie = String(formData.get("categorie") ?? "").trim() || "Autre";
  const montant = Number(formData.get("montant"));
  const jourEcheance = Number(formData.get("jourEcheance"));
  const caisse = caisseValide(formData.get("caisse"));
  if (libelle.length < 3) throw new Error("Indiquez un libellé");
  if (!Number.isFinite(montant) || montant <= 0) throw new Error("Montant invalide");
  if (!Number.isInteger(jourEcheance) || jourEcheance < 1 || jourEcheance > 28) throw new Error("Jour d'échéance entre 1 et 28");
  const d = await prisma.depenseRecurrente.create({
    data: { etablissementId: user.etablissementId, libelle, categorie, montant, jourEcheance, caisse },
  });
  await enregistrerAudit({ userId: user.id, action: "DEPENSE_RECURRENTE_CREEE", entite: "DepenseRecurrente", entiteId: d.id });
  revalidatePath("/tresorerie");
}

async function basculerDepenseRecurrenteCorps(id: string) {
  const user = await requirePermission("tresorerie.depense");
  const d = await prisma.depenseRecurrente.findUnique({ where: { id } });
  if (!d || d.etablissementId !== user.etablissementId) throw new Error("Dépense introuvable");
  await prisma.depenseRecurrente.update({ where: { id }, data: { actif: !d.actif } });
  revalidatePath("/tresorerie");
}

// Actions appelees par le client : l'erreur metier est renvoyee au lieu d'etre levee,
// sinon Next la remplace par un message generique en production (voir lib/actions/serveur.ts)
export async function creerMouvement(...a: Parameters<typeof creerMouvementCorps>) {
  return capter(() => creerMouvementCorps(...a));
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
