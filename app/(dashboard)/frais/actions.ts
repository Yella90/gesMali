"use server";

import { ecole } from "@/lib/data/ecole";
import { prochainNumeroRecu } from "@/lib/frais/requetes";
import { requirePermission } from "@/lib/auth/session";
import { enregistrerAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { capter } from "@/lib/actions/serveur";

const MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function libelleMois(annee: number, mois: number) {
  return MOIS_FR[mois - 1] + " " + annee;
}

function periodeStr(annee: number, mois: number) {
  return annee + "-" + String(mois).padStart(2, "0");
}

// Configuration des frais d'un eleve
export async function configurerFrais(data: {
  eleveId: string;
  anneeScolaireId: string;
  fraisInscription: number;
  montant: number;
  reduction: number;
  nombreMois: number;
  moisDebut: number;
  anneeDebut: number;
  jourEcheance: number;
}) {
  const user = await requirePermission("frais.manage");
  const db = ecole(user);

  const eleve = await db.eleve.findUnique({ where: { id: data.eleveId } });
  if (!eleve || eleve.etablissementId !== user.etablissementId) {
    throw new Error("Eleve introuvable");
  }

  const annee = await db.anneeScolaire.findUnique({ where: { id: data.anneeScolaireId } });
  if (!annee || annee.etablissementId !== user.etablissementId) {
    throw new Error("Annee introuvable");
  }

  if (data.fraisInscription < 0) throw new Error("Frais d'inscription invalide");
  if (data.montant <= 0) throw new Error("Scolarite annuelle invalide");
  if (data.reduction < 0 || data.reduction >= data.montant) {
    throw new Error("Reduction invalide");
  }
  if (data.nombreMois < 1 || data.nombreMois > 12) throw new Error("Nombre de mois invalide");

  const scolariteNette = data.montant - data.reduction;
  const mensualite = Math.round((scolariteNette / data.nombreMois) * 100) / 100;
  const montantTotal = data.fraisInscription + scolariteNette;

  const tranches: any[] = [];
  if (data.fraisInscription > 0) {
    tranches.push({
      libelle: "Inscription",
      periode: periodeStr(data.anneeDebut, data.moisDebut),
      ordre: 0,
      montant: data.fraisInscription,
      dateEcheance: new Date(data.anneeDebut, data.moisDebut - 1, data.jourEcheance),
    });
  }

  let anneeCur = data.anneeDebut;
  let mois = data.moisDebut;
  for (let i = 0; i < data.nombreMois; i++) {
    tranches.push({
      libelle: libelleMois(anneeCur, mois),
      periode: periodeStr(anneeCur, mois),
      ordre: i + 1,
      montant: mensualite,
      dateEcheance: new Date(anneeCur, mois - 1, data.jourEcheance),
    });
    mois++;
    if (mois > 12) { mois = 1; anneeCur++; }
  }

  const totalMensualites = mensualite * data.nombreMois;
  const reliquat = Math.round((scolariteNette - totalMensualites) * 100) / 100;
  if (reliquat !== 0) tranches[tranches.length - 1].montant += reliquat;

  const existing = await db.fraisScolarite.findUnique({
    where: { eleveId_anneeScolaireId: { eleveId: data.eleveId, anneeScolaireId: data.anneeScolaireId } },
    include: { tranches: { include: { paiements: true } } },
  });

  if (existing) {
    const aDesPaiements = existing.tranches.some((t) => t.paiements.some((p) => !p.annule));
    if (aDesPaiements) throw new Error("Des paiements existent deja. Annulez-les avant de reconfigurer.");
    await db.fraisScolarite.delete({ where: { id: existing.id } });
  }

  await db.fraisScolarite.create({
    data: {
      etablissementId: user.etablissementId,
      eleveId: data.eleveId,
      anneeScolaireId: data.anneeScolaireId,
      fraisInscription: data.fraisInscription,
      fraisScolariteMensuel: mensualite,
      reduction: data.reduction,
      dateDebut: new Date(data.anneeDebut, data.moisDebut - 1, 1),
      tranches: { create: tranches },
    },
  });

  await enregistrerAudit({
    userId: user.id,
    action: "CONFIGURER_FRAIS",
    entite: "FraisScolarite",
    entiteId: data.eleveId,
    details: { montantTotal, inscription: data.fraisInscription, scolarite: scolariteNette, nombreMois: data.nombreMois },
  });

  revalidatePath("/frais");
  revalidatePath("/frais/eleve/" + data.eleveId);
  return { success: true, mensualite, montantTotal };
}

// Genere les frais d'un eleve a partir de sa classe
async function genererFraisEleveCorps(eleveId: string) {
  const user = await requirePermission("frais.manage");
  const db = ecole(user);

  const eleve = await db.eleve.findUnique({
    where: { id: eleveId },
    include: {
      classe: { include: { anneeScolaire: true } },
      fraisScolarite: true,
    },
  });

  if (!eleve || eleve.etablissementId !== user.etablissementId) {
    throw new Error("Eleve introuvable");
  }
  if (!eleve.classe) throw new Error("Aucune classe assignee");
  if (eleve.fraisScolarite.length > 0) throw new Error("Frais deja configures");

  const classe = eleve.classe;
  if (classe.fraisInscription === 0 && classe.fraisScolariteMensuel === 0) {
    throw new Error("La classe n'a aucun frais defini");
  }

  const annee = classe.anneeScolaire;
  const debut = new Date(annee.dateDebut);
  const fin = new Date(annee.dateFin);

  const nombreMois = (fin.getFullYear() - debut.getFullYear()) * 12 + (fin.getMonth() - debut.getMonth()) + 1;

  const tranches: any[] = [];

  if (classe.fraisInscription > 0) {
    tranches.push({
      libelle: "Inscription",
      periode: periodeStr(debut.getFullYear(), debut.getMonth() + 1),
      ordre: 0,
      montant: classe.fraisInscription,
      dateEcheance: new Date(debut.getFullYear(), debut.getMonth(), 5),
    });
  }

  let anneeCur = debut.getFullYear();
  let moisCur = debut.getMonth() + 1;
  for (let i = 0; i < nombreMois; i++) {
    tranches.push({
      libelle: libelleMois(anneeCur, moisCur),
      periode: periodeStr(anneeCur, moisCur),
      ordre: i + 1,
      montant: classe.fraisScolariteMensuel,
      dateEcheance: new Date(anneeCur, moisCur - 1, 5),
    });
    moisCur++;
    if (moisCur > 12) { moisCur = 1; anneeCur++; }
  }

  await db.fraisScolarite.create({
    data: {
      etablissementId: user.etablissementId,
      eleveId,
      anneeScolaireId: annee.id,
      fraisInscription: classe.fraisInscription,
      fraisScolariteMensuel: classe.fraisScolariteMensuel,
      reduction: 0,
      dateDebut: debut,
      tranches: { create: tranches },
    },
  });

  await enregistrerAudit({
    userId: user.id,
    action: "GENERER_FRAIS_ELEVE",
    entite: "FraisScolarite",
    entiteId: eleveId,
    details: { nombreMois, fraisInscription: classe.fraisInscription, fraisMensuel: classe.fraisScolariteMensuel },
  });

  revalidatePath("/frais");
  revalidatePath("/frais/eleve/" + eleveId);
  return { success: true, nombreMois };
}

// Encaisser un paiement
async function encaisserPaiementCorps(data: {
  trancheId: string;
  montant: number;
  mode: "ESPECES" | "VIREMENT" | "MOBILE_MONEY" | "CHEQUE";
  reference?: string;
  datePaiement?: string;
}) {
  const user = await requirePermission("frais.encaisser");
  const db = ecole(user);

  const tranche = await db.trancheFrais.findUnique({
    where: { id: data.trancheId },
    include: { frais: { include: { eleve: true } }, paiements: true },
  });
  if (!tranche) throw new Error("Tranche introuvable");
  if (tranche.frais.eleve.etablissementId !== user.etablissementId) {
    throw new Error("Acces refuse");
  }
  if (data.montant <= 0) throw new Error("Montant invalide");

  const dejaPaye = tranche.paiements
    .filter((p) => !p.annule)
    .reduce((s, p) => s + p.montant, 0);
  const reste = tranche.montant - dejaPaye;
  if (data.montant > reste + 0.01) throw new Error("Montant superieur au reste a payer (" + reste.toFixed(2) + ")");

  const recuNumero = await prochainNumeroRecu();

  const paiement = await db.paiementFrais.create({
    data: {
      trancheId: data.trancheId,
      montant: data.montant,
      datePaiement: data.datePaiement ? new Date(data.datePaiement) : new Date(),
      mode: data.mode,
      reference: data.reference || null,
      recuNumero,
      saisieParId: user.id,
    },
  });

  await enregistrerAudit({
    userId: user.id,
    action: "ENCAISSER_PAIEMENT",
    entite: "PaiementFrais",
    entiteId: paiement.id,
    details: { recuNumero, montant: data.montant, tranche: tranche.libelle },
  });

  revalidatePath("/frais");
  revalidatePath("/frais/eleve/" + tranche.frais.eleveId);
  return { success: true, id: paiement.id, recuNumero };
}

// Annuler un paiement
export async function annulerPaiement(id: string, motif: string) {
  const user = await requirePermission("frais.manage");
  const db = ecole(user);
  const p = await db.paiementFrais.findUnique({
    where: { id },
    include: { tranche: { include: { frais: { include: { eleve: true } } } } },
  });
  if (!p) throw new Error("Paiement introuvable");
  if (p.tranche.frais.eleve.etablissementId !== user.etablissementId) {
    throw new Error("Acces refuse");
  }

  await db.paiementFrais.update({
    where: { id },
    data: { annule: true, motifAnnulation: motif },
  });

  await enregistrerAudit({
    userId: user.id,
    action: "ANNULER_PAIEMENT",
    entite: "PaiementFrais",
    entiteId: id,
    details: { motif },
  });

  revalidatePath("/frais");
  revalidatePath("/frais/eleve/" + p.tranche.frais.eleveId);
}

// Genere les rappels pour les echeances impayees
async function genererRappelsCorps(periode?: string) {
  const user = await requirePermission("frais.manage");
  const db = ecole(user);

  const where: any = { frais: { etablissementId: user.etablissementId } };
  if (periode) where.periode = periode;

  const tranches = await db.trancheFrais.findMany({
    where,
    include: { paiements: true, rappels: true, frais: { include: { eleve: true } } },
    orderBy: { dateEcheance: "asc" },
  });

  let crees = 0;
  let ignores = 0;

  for (const t of tranches) {
    const paye = t.paiements.filter((p) => !p.annule).reduce((s, p) => s + p.montant, 0);
    const reste = t.montant - paye;

    if (reste <= 0.01) { ignores++; continue; }

    const rappelExistant = t.rappels.find((r) => !r.envoye);
    if (rappelExistant) { ignores++; continue; }

    await db.rappel.create({
      data: {
        trancheId: t.id,
        contenu: "Rappel pour " + t.libelle + " - reste a payer : " + reste.toFixed(2) + " F CFA",
        saisieParId: user.id,
        envoye: false,
      },
    });
    crees++;
  }

  await enregistrerAudit({
    userId: user.id,
    action: "GENERER_RAPPELS",
    entite: "Rappel",
    entiteId: periode || "TOUTES",
    details: { crees, ignores, periode: periode || "toutes" },
  });

  revalidatePath("/frais/rappels");
  return { crees, ignores, total: tranches.length };
}

// Marquer un rappel comme envoye
async function marquerRappelEnvoyeCorps(id: string) {
  const user = await requirePermission("frais.manage");
  const db = ecole(user);
  // Le rappel doit appartenir a l'ecole : rappel -> echeance -> frais -> etablissement
  const rappel = await db.rappel.findUnique({
    where: { id },
    select: { tranche: { select: { frais: { select: { etablissementId: true } } } } },
  });
  if (!rappel || rappel.tranche.frais.etablissementId !== user.etablissementId) throw new Error("Rappel introuvable");
  await db.rappel.update({ where: { id }, data: { envoye: true } });
  await enregistrerAudit({
    userId: user.id,
    action: "MARQUER_RAPPEL_ENVOYE",
    entite: "Rappel",
    entiteId: id,
  });
  revalidatePath("/frais/rappels");
}

// Actions appelees par le client : l'erreur metier est renvoyee au lieu d'etre levee,
// sinon Next la remplace par un message generique en production (voir lib/actions/serveur.ts)
export async function encaisserPaiement(...a: Parameters<typeof encaisserPaiementCorps>) {
  return capter(() => encaisserPaiementCorps(...a));
}
export async function genererFraisEleve(...a: Parameters<typeof genererFraisEleveCorps>) {
  return capter(() => genererFraisEleveCorps(...a));
}
export async function genererRappels(...a: Parameters<typeof genererRappelsCorps>) {
  return capter(() => genererRappelsCorps(...a));
}
export async function marquerRappelEnvoye(...a: Parameters<typeof marquerRappelEnvoyeCorps>) {
  return capter(() => marquerRappelEnvoyeCorps(...a));
}
