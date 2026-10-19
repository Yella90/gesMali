"use server";

import { ecole } from "@/lib/data/ecole";
import { requirePermission } from "@/lib/auth/session";
import { enregistrerAudit } from "@/lib/audit";
import { matiereSchema } from "@/lib/validators/matiere";
import { revalidatePath } from "next/cache";
import { capter } from "@/lib/actions/serveur";

async function creerMatiereCorps(formData: FormData) {
  const user = await requirePermission("matiere.manage");
  const db = ecole(user);
  const raw = {
    nom: formData.get("nom"),
    code: formData.get("code") || null,
    cycle: formData.get("cycle"),
    coefficient: formData.get("coefficient") ?? 1,
  };
  const data = matiereSchema.parse(raw);

  const matiere = await db.matiere.create({
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

async function modifierMatiereCorps(id: string, formData: FormData) {
  const user = await requirePermission("matiere.manage");
  const db = ecole(user);
  const m = await db.matiere.findUnique({ where: { id } });
  if (!m || m.etablissementId !== user.etablissementId) throw new Error("Acces refuse");

  const raw = {
    nom: formData.get("nom"),
    code: formData.get("code") || null,
    cycle: formData.get("cycle"),
    coefficient: formData.get("coefficient") ?? 1,
  };
  const data = matiereSchema.parse(raw);

  await db.matiere.update({ where: { id }, data });
  await enregistrerAudit({ userId: user.id, action: "UPDATE_MATIERE", entite: "Matiere", entiteId: id });
  revalidatePath("/matieres");
}

async function supprimerMatiereCorps(id: string) {
  const user = await requirePermission("matiere.manage");
  const db = ecole(user);
  const m = await db.matiere.findUnique({
    where: { id },
    include: { _count: { select: { notes: true, bulletinLignes: true } } },
  });
  if (!m || m.etablissementId !== user.etablissementId) throw new Error("Acces refuse");
  if (m._count.notes > 0 || m._count.bulletinLignes > 0) {
    throw new Error("Matiere utilisee dans des notes ou bulletins");
  }
  await db.matiere.delete({ where: { id } });
  await enregistrerAudit({ userId: user.id, action: "DELETE_MATIERE", entite: "Matiere", entiteId: id });
  revalidatePath("/matieres");
}

// Actions appelees par le client : l'erreur metier est renvoyee au lieu d'etre levee,
// sinon Next la remplace par un message generique en production (voir lib/actions/serveur.ts)
export async function creerMatiere(...a: Parameters<typeof creerMatiereCorps>) {
  return capter(() => creerMatiereCorps(...a));
}
export async function modifierMatiere(...a: Parameters<typeof modifierMatiereCorps>) {
  return capter(() => modifierMatiereCorps(...a));
}
export async function supprimerMatiere(...a: Parameters<typeof supprimerMatiereCorps>) {
  return capter(() => supprimerMatiereCorps(...a));
}
