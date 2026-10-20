"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { capter } from "@/lib/actions/serveur";
import { COOKIE_ECOLE, compteConnecte } from "@/lib/auth/session";
import { adresseIp, envoiAutorise, inscriptionAutorisee, noterInscription } from "@/lib/auth/limite";
import { envoiDisponible } from "@/lib/email/file";
import {
  confirmerInscription as confirmerInscriptionParLien,
  demanderInscription,
  INSCRIPTION_FERMEE,
  verifierMotDePasse,
} from "@/lib/email/parcours";
import { creerEcole, lireEcole } from "@/lib/plateforme/creation";
import { urlApplication } from "@/lib/portail/acces";

// Inscription d'une ecole en ligne, en periode d'essai.
// Deja connecte : l'ecole est ajoutee au compte (qui en devient le directeur), tout de suite.
// Sinon : un lien est envoye a l'adresse du directeur ; l'ecole et son compte ne sont crees
// qu'au clic sur ce lien (adresse confirmee).
async function inscrireEcoleCorps(fd: FormData): Promise<{ email: string }> {
  // Champ invisible rempli par les robots
  if (String(fd.get("site") ?? "")) throw new Error("Inscription refusée");
  if (fd.get("conditions") !== "on") throw new Error("Acceptez les conditions d'utilisation pour créer votre école");

  const ip = adresseIp(await headers());
  if (!(await inscriptionAutorisee(ip))) {
    throw new Error("Trop d'écoles créées depuis cette connexion aujourd'hui : réessayez demain");
  }

  const compte = await compteConnecte();
  if (compte) {
    fd.set("directeurEmail", compte.email);
    const r = await creerEcole(lireEcole(fd), { statut: "ESSAI", parUserId: compte.id });
    await noterInscription(ip);
    // La nouvelle ecole devient l'ecole courante
    (await cookies()).set(COOKIE_ECOLE, r.etablissementId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 365 * 24 * 3600,
    });
    redirect("/dashboard");
  }

  if (!envoiDisponible()) throw new Error(INSCRIPTION_FERMEE);
  const donnees = lireEcole(fd);
  verifierMotDePasse(String(fd.get("motDePasse") ?? ""), String(fd.get("confirmation") ?? ""));
  if (!(await envoiAutorise(ip, donnees.directeurEmail))) {
    throw new Error("Trop de demandes envoyées : réessayez dans une heure");
  }
  await demanderInscription(donnees, String(fd.get("motDePasse")), await urlApplication());
  await noterInscription(ip);
  return { email: donnees.directeurEmail };
}

// Clic sur « Créer mon école » depuis le lien recu (un bouton, et non la simple ouverture
// du lien : les messageries qui verifient les liens d'un e-mail ne creent pas l'ecole)
async function confirmerInscriptionCorps(jeton: string) {
  await confirmerInscriptionParLien(String(jeton ?? ""));
  redirect("/login?connexion=ecole-creee");
}

export async function inscrireEcole(...a: Parameters<typeof inscrireEcoleCorps>) {
  return capter(() => inscrireEcoleCorps(...a));
}
export async function confirmerInscription(...a: Parameters<typeof confirmerInscriptionCorps>) {
  return capter(() => confirmerInscriptionCorps(...a));
}
