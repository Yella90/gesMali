"use server";

import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { enregistrerAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function modifierEtablissement(formData: FormData) {
  const user = await requirePermission("parametres.manage");

  const nom = (formData.get("nom") as string)?.trim();
  const type = formData.get("type") as "PUBLIC" | "PRIVE" | "COMMUNAUTAIRE" | "MEDERSA";
  const adresse = (formData.get("adresse") as string)?.trim() || null;
  const telephone = (formData.get("telephone") as string)?.trim() || null;
  const email = (formData.get("email") as string)?.trim() || null;

  if (!nom || nom.length < 2) throw new Error("Nom trop court");

  await prisma.etablissement.update({
    where: { id: user.etablissementId },
    data: { nom, type, adresse, telephone, email },
  });

  await enregistrerAudit({
    userId: user.id,
    action: "UPDATE_ETABLISSEMENT",
    entite: "Etablissement",
    entiteId: user.etablissementId,
  });

  revalidatePath("/parametres");
  revalidatePath("/parametres/etablissement");
  return { success: true };
}

export async function modifierParametresNotes(formData: FormData) {
  const user = await requirePermission("parametres.manage");

  const modeSaisieNotes = formData.get("modeSaisieNotes") as "DECENTRALISEE" | "CENTRALISEE" | "MIXTE";
  const validationObligatoire = formData.get("validationObligatoire") === "on";
  const ponderationDevoirs = Number(formData.get("ponderationDevoirs"));
  const ponderationCompo = Number(formData.get("ponderationCompo"));

  if (!["DECENTRALISEE", "CENTRALISEE", "MIXTE"].includes(modeSaisieNotes)) {
    throw new Error("Mode de saisie invalide");
  }
  if (ponderationDevoirs < 0 || ponderationCompo < 0) throw new Error("Ponderations invalides");

  const somme = ponderationDevoirs + ponderationCompo;
  if (Math.abs(somme - 1) > 0.01) throw new Error("La somme des ponderations doit etre egale a 1 (actuel : " + somme.toFixed(2) + ")");

  await prisma.parametresEtablissement.update({
    where: { etablissementId: user.etablissementId },
    data: {
      modeSaisieNotes,
      validationObligatoire,
      ponderationDevoirs,
      ponderationCompo,
    },
  });

  await enregistrerAudit({
    userId: user.id,
    action: "UPDATE_PARAMETRES_NOTES",
    entite: "ParametresEtablissement",
    entiteId: user.etablissementId,
    details: { modeSaisieNotes, ponderationDevoirs, ponderationCompo },
  });

  revalidatePath("/parametres");
  revalidatePath("/parametres/notes");
  return { success: true };
}

export async function basculerAnnee(id: string) {
  const user = await requirePermission("parametres.manage");

  const annee = await prisma.anneeScolaire.findUnique({ where: { id } });
  if (!annee || annee.etablissementId !== user.etablissementId) {
    throw new Error("Acces refuse");
  }

  // Desactiver toutes les autres annees
  await prisma.anneeScolaire.updateMany({
    where: { etablissementId: user.etablissementId },
    data: { active: false },
  });

  // Activer celle-ci
  await prisma.anneeScolaire.update({
    where: { id },
    data: { active: true },
  });

  await enregistrerAudit({
    userId: user.id,
    action: "ACTIVER_ANNEE",
    entite: "AnneeScolaire",
    entiteId: id,
    details: { libelle: annee.libelle },
  });

  revalidatePath("/parametres");
  revalidatePath("/parametres/etablissement");
  revalidatePath("/");
  return { success: true };
}