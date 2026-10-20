"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { compteConnecte, getUtilisateurCourant } from "@/lib/auth/session";
import { modifierMotDePasseCompte } from "@/lib/auth/comptes";
import { adresseIp, envoiAutorise } from "@/lib/auth/limite";
import { enregistrerAudit } from "@/lib/audit";
import { capter } from "@/lib/actions/serveur";
import { envoiDisponible } from "@/lib/email/file";
import { demanderVerification } from "@/lib/email/parcours";
import { urlApplication } from "@/lib/portail/acces";

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

  // Ecole du journal lue avant le changement : la session en cours devient ensuite invalide
  const courant = await getUtilisateurCourant();
  await modifierMotDePasseCompte(compte.id, nouveau);
  if (courant) {
    await enregistrerAudit({
      userId: compte.id,
      etablissementId: courant.etablissementId,
      action: "CHANGER_MON_MOT_DE_PASSE",
      entite: "User",
      entiteId: compte.id,
    });
  }

  // Les sessions ouvertes avant le changement sont fermees, celle-ci comprise : nouvelle
  // session pour rester connecte ici
  try {
    await signIn("credentials", { email: compte.email, password: nouveau, redirect: false });
  } catch (e) {
    console.error("[mot de passe] reconnexion", e);
  }
  // Redirection (et non simple reponse) : la page suivante est rendue avec la nouvelle session ;
  // rendue dans la meme requete, elle verrait encore l'ancienne, desormais refusee
  redirect("/compte?mot-de-passe=modifie");
}

// Lien de confirmation de l'adresse du compte
async function envoyerConfirmationCorps() {
  const compte = await compteConnecte();
  if (!compte) throw new Error("Non authentifie");
  if (compte.emailVerifieLe) return { email: compte.email };
  if (!envoiDisponible()) throw new Error("L'envoi d'e-mails n'est pas encore disponible : réessayez plus tard");
  if (!(await envoiAutorise(adresseIp(await headers()), compte.email))) {
    throw new Error("Trop de demandes envoyées : réessayez dans une heure");
  }
  await demanderVerification(compte, await urlApplication());
  return { email: compte.email };
}

export async function changerMonMotDePasse(...a: Parameters<typeof changerMonMotDePasseCorps>) {
  return capter(() => changerMonMotDePasseCorps(...a));
}
export async function envoyerConfirmation() {
  return capter(() => envoyerConfirmationCorps());
}
