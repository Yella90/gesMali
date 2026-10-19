"use server";

import { revalidatePath } from "next/cache";
import { capter } from "@/lib/actions/serveur";
import { changerStatutEcole, motDePasseProvisoire, requireAdministrateur, type ActionStatut } from "@/lib/plateforme/admin";
import { creerEcole, lireEcole } from "@/lib/plateforme/creation";

const ACTIONS: ActionStatut[] = ["activer", "suspendre", "reactiver", "prolonger"];

async function changerStatutCorps(etablissementId: string, action: ActionStatut) {
  const admin = await requireAdministrateur();
  if (!ACTIONS.includes(action)) throw new Error("Action inconnue");
  await changerStatutEcole(etablissementId, action, admin.id);
  revalidatePath("/plateforme");
  return { ok: true };
}

// Ecole creee par l'administration : statut choisi, mot de passe provisoire pour un nouveau
// compte de directeur (affiche une seule fois), compte existant sinon
async function creerEcoleCorps(fd: FormData) {
  const admin = await requireAdministrateur();
  const donnees = lireEcole(fd);
  const statut = fd.get("statut") === "ACTIF" ? "ACTIF" : "ESSAI";
  const motDePasse = motDePasseProvisoire();
  const r = await creerEcole(donnees, { statut, motDePasse, parUserId: admin.id });
  revalidatePath("/plateforme");
  return {
    etablissementId: r.etablissementId,
    email: donnees.directeurEmail,
    motDePasse: r.compteExistant ? null : motDePasse,
  };
}

export async function changerStatut(...a: Parameters<typeof changerStatutCorps>) {
  return capter(() => changerStatutCorps(...a));
}
export async function creerEcoleAdmin(...a: Parameters<typeof creerEcoleCorps>) {
  return capter(() => creerEcoleCorps(...a));
}
