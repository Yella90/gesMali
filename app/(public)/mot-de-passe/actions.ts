"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { capter } from "@/lib/actions/serveur";
import { adresseIp, envoiAutorise } from "@/lib/auth/limite";
import { envoiDisponible } from "@/lib/email/file";
import { demanderReinitialisation, reinitialiserParLien } from "@/lib/email/parcours";
import { urlApplication } from "@/lib/portail/acces";

// Mot de passe oublie : meme reponse que l'adresse ait un compte ou non
async function demanderLienCorps(email: string) {
  if (!envoiDisponible()) throw new Error("Demandez à la direction de votre école de réinitialiser votre mot de passe");
  const adresse = z.string().trim().toLowerCase().email("Adresse e-mail invalide").parse(email);
  if (!(await envoiAutorise(adresseIp(await headers()), adresse))) {
    throw new Error("Trop de demandes envoyées : réessayez dans une heure");
  }
  await demanderReinitialisation(adresse, await urlApplication());
  return { email: adresse };
}

async function nouveauMotDePasseCorps(jeton: string, motDePasse: string, confirmation: string) {
  await reinitialiserParLien(String(jeton ?? ""), String(motDePasse ?? ""), String(confirmation ?? ""));
  redirect("/login?connexion=mot-de-passe");
}

export async function demanderLien(...a: Parameters<typeof demanderLienCorps>) {
  return capter(() => demanderLienCorps(...a));
}
export async function nouveauMotDePasse(...a: Parameters<typeof nouveauMotDePasseCorps>) {
  return capter(() => nouveauMotDePasseCorps(...a));
}
