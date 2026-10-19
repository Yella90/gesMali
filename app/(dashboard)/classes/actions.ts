"use server";

import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { enregistrerAudit } from "@/lib/audit";
import { classeSchema } from "@/lib/validators/classe";
import { revalidatePath } from "next/cache";
import { capter } from "@/lib/actions/serveur";

async function creerClasseCorps(formData: FormData) {
  const user = await requirePermission("classe.manage");
  const raw = {
    nom: formData.get("nom") || null,
    niveau: formData.get("niveau"),
    cycle: formData.get("cycle"),
    section: formData.get("section") || null,
    salle: formData.get("salle") || null,
    anneeScolaireId: formData.get("anneeScolaireId"),
    titulaireId: formData.get("titulaireId") || null,
    fraisInscription: formData.get("fraisInscription") || 0,
    fraisScolariteMensuel: formData.get("fraisScolariteMensuel") || 0,
    capaciteMax: formData.get("capaciteMax") || 50,
  };
  const data = classeSchema.parse(raw);

  const annee = await prisma.anneeScolaire.findUnique({ where: { id: data.anneeScolaireId } });
  if (!annee || annee.etablissementId !== user.etablissementId) throw new Error("Annee invalide");

  const classe = await prisma.classe.create({
    data: { ...data, etablissementId: user.etablissementId },
  });

  await enregistrerAudit({
    userId: user.id,
    action: "CREATE_CLASSE",
    entite: "Classe",
    entiteId: classe.id,
    details: { fraisInscription: data.fraisInscription, fraisMensuel: data.fraisScolariteMensuel },
  });
  revalidatePath("/classes");
  return { success: true, id: classe.id };
}

async function modifierClasseCorps(classeId: string, formData: FormData) {
  const user = await requirePermission("classe.manage");

  const classe = await prisma.classe.findUnique({ where: { id: classeId } });
  if (!classe || classe.etablissementId !== user.etablissementId) {
    throw new Error("Acces refuse");
  }

  const raw = {
    nom: formData.get("nom") || null,
    niveau: formData.get("niveau"),
    cycle: formData.get("cycle"),
    section: formData.get("section") || null,
    salle: formData.get("salle") || null,
    anneeScolaireId: classe.anneeScolaireId,
    titulaireId: formData.get("titulaireId") || null,
    fraisInscription: formData.get("fraisInscription") || 0,
    fraisScolariteMensuel: formData.get("fraisScolariteMensuel") || 0,
    capaciteMax: formData.get("capaciteMax") || 50,
  };
  const data = classeSchema.parse(raw);

  await prisma.classe.update({
    where: { id: classeId },
    data: {
      nom: data.nom,
      niveau: data.niveau,
      cycle: data.cycle,
      section: data.section,
      salle: data.salle,
      titulaireId: data.titulaireId,
      fraisInscription: data.fraisInscription,
      fraisScolariteMensuel: data.fraisScolariteMensuel,
      capaciteMax: data.capaciteMax,
    },
  });

  await enregistrerAudit({
    userId: user.id,
    action: "UPDATE_CLASSE",
    entite: "Classe",
    entiteId: classeId,
  });
  revalidatePath("/classes");
  revalidatePath("/classes/" + classeId);
  return { success: true };
}

export async function supprimerClasse(id: string) {
  const user = await requirePermission("classe.manage");
  const classe = await prisma.classe.findUnique({ where: { id }, include: { eleves: true } });
  if (!classe || classe.etablissementId !== user.etablissementId) throw new Error("Acces refuse");
  if (classe.eleves.length > 0) throw new Error("Classe non vide");
  await prisma.classe.delete({ where: { id } });
  await enregistrerAudit({ userId: user.id, action: "DELETE_CLASSE", entite: "Classe", entiteId: id });
  revalidatePath("/classes");
}

// Actions appelees par le client : l'erreur metier est renvoyee au lieu d'etre levee,
// sinon Next la remplace par un message generique en production (voir lib/actions/serveur.ts)
export async function creerClasse(...a: Parameters<typeof creerClasseCorps>) {
  return capter(() => creerClasseCorps(...a));
}
export async function modifierClasse(...a: Parameters<typeof modifierClasseCorps>) {
  return capter(() => modifierClasseCorps(...a));
}
