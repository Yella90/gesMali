"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { capter } from "@/lib/actions/serveur";
import { COOKIE_ECOLE, compteConnecte, emailDejaUtilise } from "@/lib/auth/session";
import { adresseIp, inscriptionAutorisee, noterInscription } from "@/lib/auth/limite";
import { creerEcole, lireEcole } from "@/lib/plateforme/creation";

const MOT_DE_PASSE_MIN = 8;

// Inscription d'une ecole en ligne : periode d'essai, puis connexion directe a la nouvelle ecole.
// Deja connecte : l'ecole est ajoutee au compte (qui en devient le directeur).
async function inscrireEcoleCorps(fd: FormData) {
  // Champ invisible rempli par les robots
  if (String(fd.get("site") ?? "")) throw new Error("Inscription refusée");
  if (fd.get("conditions") !== "on") throw new Error("Acceptez les conditions d'utilisation pour créer votre école");

  const ip = adresseIp(await headers());
  if (!(await inscriptionAutorisee(ip))) {
    throw new Error("Trop d'écoles créées depuis cette connexion aujourd'hui : réessayez demain");
  }

  const compte = await compteConnecte();
  if (compte) fd.set("directeurEmail", compte.email);
  const donnees = lireEcole(fd);

  const motDePasse = String(fd.get("motDePasse") ?? "");
  if (!compte) {
    if (await emailDejaUtilise(donnees.directeurEmail)) {
      throw new Error("Cette adresse a déjà un compte GES Mali : connectez-vous, puis créez l'école depuis « Mes écoles »");
    }
    if (motDePasse.length < MOT_DE_PASSE_MIN) throw new Error("Mot de passe : " + MOT_DE_PASSE_MIN + " caractères minimum");
    if (motDePasse !== String(fd.get("confirmation") ?? "")) throw new Error("La confirmation ne correspond pas au mot de passe");
  }

  const r = await creerEcole(donnees, { statut: "ESSAI", motDePasse: compte ? null : motDePasse });
  await noterInscription(ip);

  // La nouvelle ecole devient l'ecole courante
  (await cookies()).set(COOKIE_ECOLE, r.etablissementId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 365 * 24 * 3600,
  });

  if (compte) redirect("/dashboard");
  await signIn("credentials", { email: donnees.directeurEmail, password: motDePasse, redirectTo: "/dashboard" });
  return { ok: true };
}

export async function inscrireEcole(...a: Parameters<typeof inscrireEcoleCorps>) {
  return capter(() => inscrireEcoleCorps(...a));
}
