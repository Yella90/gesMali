import { cache } from "react";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import type { Role, Permission } from "./permissions";
import { peut } from "./permissions";
import { estAdministrateurPlateforme, etatEcole } from "@/lib/plateforme/etat";
import { accesUtilisable, chargerCompte, choisirAcces, sessionValable, type CompteAvecAcces } from "./comptes";

export { emailDejaUtilise } from "./comptes";

// Ecole choisie par un compte qui a acces a plusieurs ecoles. Le cookie ne fait que
// designer une ecole : l'acces est toujours verifie cote serveur.
export const COOKIE_ECOLE = "gesmali-ecole";

// UtilisateurCourant aplatit compte + acces a l'ecole courante + fiche employe de cette ecole
export type UtilisateurCourant = {
  id: string;
  email: string;
  roles: Role[];
  etablissementId: string;
  // Identite (vient de la fiche Employe de l'ecole courante)
  nom: string;
  prenom: string;
  telephone: string | null;
  poste: string;
  posteLibre: string | null;
  // Lien vers la fiche employe de l'ecole courante
  employeId: string;
  salaireReference: number | null;
  typeRemuneration: string | null;
  // Plateforme
  nbEcoles: number;
  joursEssai: number | null;
  administrateurPlateforme: boolean;
};

// Compte connecte (session valide, compte actif), avec ses acces. cache() : une lecture par requete
export const compteConnecte = cache(async (): Promise<(CompteAvecAcces & { administrateurPlateforme: boolean }) | null> => {
  let session = null;
  try {
    session = await auth();
  } catch {
    return null;
  }
  if (!session?.user?.id) return null;
  const user = await chargerCompte({ id: session.user.id });
  if (!user || !user.actif) return null;
  // Session ouverte avant le dernier changement de mot de passe
  if (!sessionValable(user, (session as { connecteLe?: number }).connecteLe)) return null;
  return { ...user, administrateurPlateforme: estAdministrateurPlateforme(user.email) };
});

export async function ecoleChoisie(): Promise<string | undefined> {
  try {
    return (await cookies()).get(COOKIE_ECOLE)?.value;
  } catch {
    return undefined;
  }
}

// Utilisateur dans son ecole courante, ou null (non connecte, ou ecole a choisir / fermee)
export const getUtilisateurCourant = cache(async (): Promise<UtilisateurCourant | null> => {
  const compte = await compteConnecte();
  if (!compte) return null;
  const a = choisirAcces(compte.acces, await ecoleChoisie());
  if (!a) return null;

  return {
    id: compte.id,
    email: compte.email,
    roles: a.roles as Role[],
    etablissementId: a.etablissementId,
    nom: a.employe.nom,
    prenom: a.employe.prenom,
    telephone: a.employe.telephone,
    poste: a.employe.poste,
    posteLibre: a.employe.posteLibre,
    employeId: a.employe.id,
    salaireReference: a.employe.salaireReference,
    typeRemuneration: a.employe.typeRemuneration,
    nbEcoles: compte.acces.filter((x) => accesUtilisable(x)).length,
    joursEssai: etatEcole(a.etablissement).joursEssai,
    administrateurPlateforme: compte.administrateurPlateforme,
  };
});

export async function requireUtilisateur(): Promise<UtilisateurCourant> {
  const user = await getUtilisateurCourant();
  if (!user) throw new Error("Non authentifie");
  return user;
}

export async function requirePermission(permission: Permission): Promise<UtilisateurCourant> {
  const user = await requireUtilisateur();
  if (!peut(user.roles, permission)) throw new Error("Permission refusee");
  return user;
}
