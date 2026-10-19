"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_ECOLE, compteConnecte } from "@/lib/auth/session";
import { accesUtilisable } from "@/lib/auth/comptes";

// Ouvre une ecole du compte : elle devient l'ecole courante (cookie), apres verification de l'acces
export async function choisirEcole(etablissementId: string) {
  const compte = await compteConnecte();
  if (!compte) redirect("/login?connexion");
  const acces = compte.acces.find((a) => a.etablissementId === etablissementId);
  if (!acces || !accesUtilisable(acces)) redirect("/ecoles");

  (await cookies()).set(COOKIE_ECOLE, etablissementId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 365 * 24 * 3600,
  });
  redirect("/dashboard");
}
