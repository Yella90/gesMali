import { NextResponse } from "next/server";
import { getUtilisateurCourant, type UtilisateurCourant } from "@/lib/auth/session";
import { peut, type Permission } from "@/lib/auth/permissions";

// Pour les routes API : l'utilisateur connecte avec le droit demande, ou la reponse d'erreur
export async function utilisateurApi(
  permission: Permission
): Promise<{ user: UtilisateurCourant; erreur?: never } | { user?: never; erreur: NextResponse }> {
  const user = await getUtilisateurCourant();
  if (!user) return { erreur: NextResponse.json({ error: "Non authentifie" }, { status: 401 }) };
  if (!peut(user.roles, permission)) return { erreur: NextResponse.json({ error: "Permission refusee" }, { status: 403 }) };
  return { user };
}
