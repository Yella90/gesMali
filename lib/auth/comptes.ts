// Comptes de connexion et leurs acces aux ecoles (sans dependance a la session :
// utilise par la connexion elle-meme, auth.ts, et par lib/auth/session.ts).

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { etatEcole } from "@/lib/plateforme/etat";

const AVEC_ACCES = {
  acces: {
    include: {
      employe: true,
      etablissement: { select: { id: true, nom: true, statut: true, finEssai: true } },
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.UserInclude;

export type CompteAvecAcces = Prisma.UserGetPayload<{ include: typeof AVEC_ACCES }>;
export type AccesCompte = CompteAvecAcces["acces"][number];

// Compte et ses acces. Un compte cree par une version anterieure (avant les acces par
// ecole) recoit son acces a son ecole d'origine.
export async function chargerCompte(where: Prisma.UserWhereUniqueInput): Promise<CompteAvecAcces | null> {
  const user = await prisma.user.findUnique({ where, include: AVEC_ACCES });
  // Deja des acces, ou compte sans ecole d'origine (administrateur de la plateforme)
  if (!user || user.acces.length > 0 || !user.etablissementId || !user.employeId) return user;
  try {
    await prisma.acces.create({
      data: { userId: user.id, etablissementId: user.etablissementId, employeId: user.employeId, roles: user.roles, actif: user.actif },
    });
  } catch {
    return user;
  }
  return prisma.user.findUnique({ where, include: AVEC_ACCES });
}

// Acces utilisable : actif, fiche employe active, ecole ouverte (active ou en essai)
export function accesUtilisable(a: AccesCompte, maintenant = new Date()): boolean {
  return a.actif && a.employe.actif && etatEcole(a.etablissement, maintenant).ouverte;
}

// Ecole courante : celle choisie si son acces est utilisable, sinon la seule utilisable
export function choisirAcces(acces: AccesCompte[], choisie: string | undefined, maintenant = new Date()): AccesCompte | null {
  const utilisables = acces.filter((a) => accesUtilisable(a, maintenant));
  return utilisables.find((a) => a.etablissementId === choisie) ?? (utilisables.length === 1 ? utilisables[0] : null);
}

// Un e-mail de connexion est unique sur toute la plateforme, toutes ecoles confondues
export async function emailDejaUtilise(email: string): Promise<boolean> {
  return (await prisma.user.count({ where: { email } })) > 0;
}

// Nouveau mot de passe d'un compte (valable dans toutes ses ecoles)
export async function modifierMotDePasseCompte(userId: string, motDePasse: string) {
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(motDePasse, 10) } });
}

// ─── Comptes du personnel d'une ecole ───────────────────────────────────────────
// Operations faites hors du filtre d'ecole : un compte peut appartenir a plusieurs
// ecoles. L'ecole (etablissementId) vient toujours de l'utilisateur connecte.

const ROLES = ["DIRECTEUR", "SECRETAIRE", "COMPTABLE", "ENSEIGNANT"] as const;
type RoleCompte = (typeof ROLES)[number];

export function roleValide(role: string): role is RoleCompte {
  return (ROLES as readonly string[]).includes(role);
}

// Donne a une fiche employe l'acces a l'application. E-mail nouveau : un compte est cree
// avec ce mot de passe. E-mail deja utilise (la meme personne dans une autre ecole) : le
// compte existant recoit l'acces a cette ecole et garde son mot de passe.
export async function ouvrirAcces(p: {
  etablissementId: string;
  employeId: string;
  email: string;
  motDePasse: string | null;
  role: string;
}): Promise<{ userId: string; compteExistant: boolean }> {
  const email = p.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email invalide");
  if (!roleValide(p.role)) throw new Error("Role invalide");
  const role: RoleCompte = p.role;

  return prisma.$transaction(async (tx) => {
    const employe = await tx.employe.findUnique({ where: { id: p.employeId }, include: { acces: true } });
    if (!employe || employe.etablissementId !== p.etablissementId) throw new Error("Employé introuvable");
    if (employe.acces) throw new Error("Cet employé a déjà un compte");

    const existant = await tx.user.findUnique({ where: { email }, include: { acces: { where: { etablissementId: p.etablissementId } } } });
    if (existant) {
      if (existant.acces.length) throw new Error("Ce compte a déjà accès à votre école, avec une autre fiche employé");
      await tx.acces.create({ data: { userId: existant.id, etablissementId: p.etablissementId, employeId: p.employeId, roles: [role] } });
      return { userId: existant.id, compteExistant: true };
    }

    if (!p.motDePasse || p.motDePasse.length < 6) throw new Error("Mot de passe : 6 caracteres minimum");
    const user = await tx.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(p.motDePasse, 10),
        roles: [role],
        employeId: p.employeId,
        etablissementId: p.etablissementId,
      },
    });
    await tx.acces.create({ data: { userId: user.id, etablissementId: p.etablissementId, employeId: p.employeId, roles: [role] } });
    return { userId: user.id, compteExistant: false };
  });
}

// Retire l'acces d'une fiche employe a l'application. Le compte lui-meme n'est supprime
// que s'il ne sert plus dans aucune ecole et n'a laisse aucune trace (notes, paiements...).
export async function retirerAcces(etablissementId: string, employeId: string): Promise<{ email: string; compteSupprime: boolean }> {
  const acces = await prisma.acces.findUnique({ where: { employeId }, include: { user: { include: { _count: { select: { acces: true } } } } } });
  if (!acces || acces.etablissementId !== etablissementId) throw new Error("Aucun compte a supprimer");
  const u = acces.user;

  await prisma.acces.delete({ where: { id: acces.id } });
  if (u._count.acces > 1) return { email: u.email, compteSupprime: false };

  const [notes, notesModifiees, bulletins, paiements, frais, rappels, audits, mouvements, presences] = await Promise.all([
    prisma.note.count({ where: { saisieParId: u.id } }),
    prisma.note.count({ where: { modifieeParId: u.id } }),
    prisma.bulletin.count({ where: { genereParId: u.id } }),
    prisma.paiement.count({ where: { OR: [{ saisieParId: u.id }, { annuleParId: u.id }] } }),
    prisma.paiementFrais.count({ where: { saisieParId: u.id } }),
    prisma.rappel.count({ where: { saisieParId: u.id } }),
    prisma.auditLog.count({ where: { userId: u.id } }),
    prisma.mouvementTresorerie.count({ where: { saisieParId: u.id } }),
    prisma.presence.count({ where: { saisieParId: u.id } }),
  ]);
  if (notes + notesModifiees + bulletins + paiements + frais + rappels + audits + mouvements + presences > 0) {
    return { email: u.email, compteSupprime: false };
  }
  await prisma.user.delete({ where: { id: u.id } });
  return { email: u.email, compteSupprime: true };
}

// Mot de passe fixe par la direction : seulement pour un compte qui ne sert que dans cette ecole
export async function reinitialiserMotDePasse(etablissementId: string, employeId: string, motDePasse: string) {
  const acces = await prisma.acces.findUnique({ where: { employeId }, include: { user: { include: { _count: { select: { acces: true } } } } } });
  if (!acces || acces.etablissementId !== etablissementId) throw new Error("Aucun compte pour cet employe");
  if (acces.user._count.acces > 1) {
    throw new Error("Ce compte sert aussi dans une autre école : seule la personne peut changer son mot de passe, depuis « Mon compte »");
  }
  if (!motDePasse || motDePasse.length < 6) throw new Error("Mot de passe : 6 caracteres minimum");
  await modifierMotDePasseCompte(acces.userId, motDePasse);
}

// Compte de connexion d'un administrateur de la plateforme, sans ecole. Ses droits viennent
// de ADMINS_PLATEFORME. Compte deja existant : rien n'est cree ; reinitialiser lui donne
// un nouveau mot de passe. Renvoie le mot de passe genere (a changer dans « Mon compte »).
export async function creerCompteAdministrateur(
  email: string,
  { reinitialiser = false }: { reinitialiser?: boolean } = {}
): Promise<{ email: string; motDePasse: string | null; cree: boolean }> {
  const adresse = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adresse)) throw new Error("E-mail invalide : " + email);
  const motDePasse = randomBytes(12).toString("base64url");

  const existant = await prisma.user.findUnique({ where: { email: adresse } });
  if (existant) {
    if (!reinitialiser) return { email: adresse, motDePasse: null, cree: false };
    await modifierMotDePasseCompte(existant.id, motDePasse);
    return { email: adresse, motDePasse, cree: false };
  }
  await prisma.user.create({ data: { email: adresse, passwordHash: await bcrypt.hash(motDePasse, 10), roles: [] } });
  return { email: adresse, motDePasse, cree: true };
}
