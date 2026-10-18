"use server";

import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { enregistrerAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function creerPaiement(formData: FormData) {
  const user = await requirePermission("paiement.create");

  const employeId = formData.get("employeId") as string;
  const periode = formData.get("periode") as string;
  const type = formData.get("type") as "MENSUEL" | "HORAIRE" | "PRIME" | "AVANCE" | "REMBOURSEMENT";
  const montant = Number(formData.get("montant"));
  const nombreHeures = formData.get("nombreHeures") ? Number(formData.get("nombreHeures")) : null;
  const tauxHoraire = formData.get("tauxHoraire") ? Number(formData.get("tauxHoraire")) : null;
  const datePaiement = formData.get("datePaiement") as string;
  const modePaiement = formData.get("modePaiement") as "ESPECES" | "VIREMENT" | "MOBILE_MONEY" | "CHEQUE";
  const reference = (formData.get("reference") as string) || null;
  const note = (formData.get("note") as string) || null;

  if (!employeId) throw new Error("Employe obligatoire");
  if (!periode || !/^\d{4}-\d{2}$/.test(periode)) throw new Error("Periode invalide (AAAA-MM)");
  if (!montant || montant <= 0) throw new Error("Montant invalide");
  if (!datePaiement) throw new Error("Date obligatoire");

  const employe = await prisma.employe.findUnique({
    where: { id: employeId },
    select: { etablissementId: true, actif: true, typeRemuneration: true },
  });
  if (!employe || employe.etablissementId !== user.etablissementId) {
    throw new Error("Employe introuvable");
  }
  if (!employe.actif) throw new Error("Cet employe est inactif");

  // Le salaire suit le mode de remuneration de l'employe (au mois OU a l'heure)
  const payeALHeure = employe.typeRemuneration === "HORAIRE";
  if (type === "MENSUEL" && payeALHeure) {
    throw new Error("Cet employe est paye a l'heure : enregistrez ses heures travaillees, pas un salaire mensuel");
  }
  if (type === "HORAIRE" && !payeALHeure) {
    throw new Error("Cet employe est paye au mois : enregistrez un salaire mensuel, pas des heures");
  }
  if (type === "HORAIRE" && (!nombreHeures || nombreHeures <= 0 || !tauxHoraire || tauxHoraire <= 0)) {
    throw new Error("Indiquez le nombre d'heures et le taux horaire");
  }
  if (type === "MENSUEL") {
    const dejaPaye = await prisma.paiement.findFirst({
      where: { employeId, periode, type: "MENSUEL", statut: { not: "ANNULE" } },
      select: { id: true },
    });
    if (dejaPaye) throw new Error("Le salaire de ce mois a deja ete enregistre pour cet employe");
  }

  const paiement = await prisma.paiement.create({
    data: {
      etablissementId: user.etablissementId,
      employeId,
      periode,
      type,
      montant,
      nombreHeures,
      tauxHoraire,
      datePaiement: new Date(datePaiement),
      modePaiement,
      reference,
      note,
      statut: "PAYE",
      saisieParId: user.id,
    },
  });

  await enregistrerAudit({
    userId: user.id,
    action: "CREATE_PAIEMENT",
    entite: "Paiement",
    entiteId: paiement.id,
    details: { employeId, montant, periode, type },
  });

  revalidatePath("/paiements");
  revalidatePath("/paiements/tableau-de-bord");
  return { success: true, id: paiement.id };
}

export async function annulerPaiement(id: string, motif: string) {
  const user = await requirePermission("paiement.annuler");
  if (!motif || motif.trim().length < 3) throw new Error("Motif obligatoire (3 caracteres min)");

  const paiement = await prisma.paiement.findUnique({ where: { id } });
  if (!paiement || paiement.etablissementId !== user.etablissementId) {
    throw new Error("Acces refuse");
  }
  if (paiement.statut === "ANNULE") throw new Error("Deja annule");

  await prisma.paiement.update({
    where: { id },
    data: {
      statut: "ANNULE",
      annuleParId: user.id,
      motifAnnulation: motif.trim(),
    },
  });

  await enregistrerAudit({
    userId: user.id,
    action: "ANNULER_PAIEMENT",
    entite: "Paiement",
    entiteId: id,
    details: { motif },
  });

  revalidatePath("/paiements");
  revalidatePath("/paiements/tableau-de-bord");
  revalidatePath("/paiements/" + id);
  return { success: true };
}