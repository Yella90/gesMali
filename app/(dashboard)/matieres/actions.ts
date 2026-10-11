"use server";

import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { enregistrerAudit } from "@/lib/audit";
import { matiereSchema } from "@/lib/validators/matiere";
import { revalidatePath } from "next/cache";

export async function creerMatiere(formData: FormData) {
  const user = await requirePermission("matiere.manage");
  const raw = {
    nom: formData.get("nom"),
    code: formData.get("code") || null,
    cycle: formData.get("cycle"),
    coefficient: formData.get("coefficient") ?? 1,
  };
  const data = matiereSchema.parse(raw);

  const matiere = await prisma.matiere.create({
    data: { ...data, etablissementId: user.etablissementId },
  });

  await enregistrerAudit({
    userId: user.id,
    action: "CREATE_MATIERE",
    entite: "Matiere",
    entiteId: matiere.id,
  });
  revalidatePath("/matieres");
  return { success: true, id: matiere.id };
}

export async function modifierMatiere(id: string, formData: FormData) {
  const user = await requirePermission("matiere.manage");
  const m = await prisma.matiere.findUnique({ where: { id } });
  if (!m || m.etablissementId !== user.etablissementId) throw new Error("Acces refuse");

  const raw = {
    nom: formData.get("nom"),
    code: formData.get("code") || null,
    cycle: formData.get("cycle"),
    coefficient: formData.get("coefficient") ?? 1,
  };
  const data = matiereSchema.parse(raw);

  await prisma.matiere.update({ where: { id }, data });
  await enregistrerAudit({ userId: user.id, action: "UPDATE_MATIERE", entite: "Matiere", entiteId: id });
  revalidatePath("/matieres");
}

export async function supprimerMatiere(id: string) {
  const user = await requirePermission("matiere.manage");
  const m = await prisma.matiere.findUnique({
    where: { id },
    include: { _count: { select: { notes: true, bulletinLignes: true } } },
  });
  if (!m || m.etablissementId !== user.etablissementId) throw new Error("Acces refuse");
  if (m._count.notes > 0 || m._count.bulletinLignes > 0) {
    throw new Error("Matiere utilisee dans des notes ou bulletins");
  }
  await prisma.matiere.delete({ where: { id } });
  await enregistrerAudit({ userId: user.id, action: "DELETE_MATIERE", entite: "Matiere", entiteId: id });
  revalidatePath("/matieres");
}