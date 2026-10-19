"use server";

import bcrypt from "bcryptjs";
import { compteConnecte, getUtilisateurCourant } from "@/lib/auth/session";
import { modifierMotDePasseCompte } from "@/lib/auth/comptes";
import { enregistrerAudit } from "@/lib/audit";
import { capter } from "@/lib/actions/serveur";

const LONGUEUR_MIN_MOT_DE_PASSE = 8;

// Le titulaire du compte change son mot de passe (valable dans toutes ses ecoles)
async function changerMonMotDePasseCorps(actuel: string, nouveau: string, confirmation: string) {
  const compte = await compteConnecte();
  if (!compte) throw new Error("Non authentifie");
  if (typeof nouveau !== "string" || nouveau.length < LONGUEUR_MIN_MOT_DE_PASSE) {
    throw new Error("Nouveau mot de passe : " + LONGUEUR_MIN_MOT_DE_PASSE + " caractères minimum");
  }
  if (nouveau !== confirmation) throw new Error("La confirmation ne correspond pas au nouveau mot de passe");
  if (!(await bcrypt.compare(String(actuel ?? ""), compte.passwordHash))) throw new Error("Mot de passe actuel incorrect");

  await modifierMotDePasseCompte(compte.id, nouveau);

  const courant = await getUtilisateurCourant();
  if (courant) {
    await enregistrerAudit({ userId: compte.id, action: "CHANGER_MON_MOT_DE_PASSE", entite: "User", entiteId: compte.id });
  }
  return { ok: true };
}

export async function changerMonMotDePasse(...a: Parameters<typeof changerMonMotDePasseCorps>) {
  return capter(() => changerMonMotDePasseCorps(...a));
}
