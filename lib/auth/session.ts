import { cache } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { Role, Permission } from "./permissions";
import { peut } from "./permissions";

// UtilisateurCourant aplatit User + Employe pour ne pas casser le code existant
export type UtilisateurCourant = {
  id: string;
  roles: Role[];
  etablissementId: string;
  // Identite (vient de Employe)
  nom: string;
  prenom: string;
  telephone: string | null;
  poste: string;
  posteLibre: string | null;
  // Lien vers la fiche employe
  employeId: string;
  salaireReference: number | null;
  typeRemuneration: string | null;
};

// cache() : une seule lecture par requete, meme si layout et page l'appellent tous les deux
export const getUtilisateurCourant = cache(async (): Promise<UtilisateurCourant | null> => {
  let session = null;
  try {
    session = await auth();
  } catch {
    return null;
  }

  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employe: true },
  });

  if (!user || !user.actif || !user.employe.actif) return null;

  return {
    id: user.id,
    roles: user.roles as Role[],
    etablissementId: user.etablissementId,
    nom: user.employe.nom,
    prenom: user.employe.prenom,
    telephone: user.employe.telephone,
    poste: user.employe.poste,
    posteLibre: user.employe.posteLibre,
    employeId: user.employe.id,
    salaireReference: user.employe.salaireReference,
    typeRemuneration: user.employe.typeRemuneration,
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

// Un e-mail de connexion est unique sur toute la plateforme, toutes ecoles confondues
export async function emailDejaUtilise(email: string): Promise<boolean> {
  return (await prisma.user.count({ where: { email } })) > 0;
}
