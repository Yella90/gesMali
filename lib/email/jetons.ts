// Liens envoyes par e-mail (inscription d'une ecole, confirmation d'adresse, mot de passe
// oublie) : le jeton aleatoire n'existe que dans le lien, la base n'en garde que l'empreinte.
// Un lien ne sert qu'une fois et expire.

import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

export type TypeJeton = "INSCRIPTION" | "VERIFICATION" | "REINITIALISATION";

const HEURE_MS = 3600 * 1000;
export const DUREE_JETON_MS: Record<TypeJeton, number> = {
  INSCRIPTION: 48 * HEURE_MS,
  VERIFICATION: 48 * HEURE_MS,
  REINITIALISATION: HEURE_MS,
};

const empreinte = (jeton: string) => createHash("sha256").update(jeton).digest("hex");

export async function creerJeton(
  type: TypeJeton,
  email: string,
  options: { userId?: string; donnees?: Prisma.InputJsonValue } = {},
  maintenant = new Date()
): Promise<string> {
  const jeton = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    // Un seul lien valable a la fois par adresse et par usage
    prisma.jetonEmail.updateMany({ where: { email, type, utiliseLe: null }, data: { utiliseLe: maintenant } }),
    prisma.jetonEmail.create({
      data: {
        type,
        email,
        userId: options.userId,
        donnees: options.donnees,
        empreinte: empreinte(jeton),
        expireLe: new Date(maintenant.getTime() + DUREE_JETON_MS[type]),
      },
    }),
    // Menage : liens expires depuis plus d'une semaine
    prisma.jetonEmail.deleteMany({ where: { expireLe: { lt: new Date(maintenant.getTime() - 7 * 24 * HEURE_MS) } } }),
  ]);
  return jeton;
}

// Lien encore valable (pour afficher sa page), sans le consommer
export async function lireJeton(type: TypeJeton, jeton: string, maintenant = new Date()) {
  if (!jeton) return null;
  return prisma.jetonEmail.findFirst({ where: { empreinte: empreinte(jeton), type, utiliseLe: null, expireLe: { gt: maintenant } } });
}

// Lien consomme mais operation echouee (erreur technique) : le lien redevient utilisable
export async function restaurerJeton(id: string) {
  await prisma.jetonEmail.updateMany({ where: { id }, data: { utiliseLe: null } });
}

// Consomme le lien : une seule utilisation, meme si deux clics arrivent en meme temps
export async function consommerJeton(type: TypeJeton, jeton: string, maintenant = new Date()) {
  if (!jeton) return null;
  const e = empreinte(jeton);
  const r = await prisma.jetonEmail.updateMany({
    where: { empreinte: e, type, utiliseLe: null, expireLe: { gt: maintenant } },
    data: { utiliseLe: maintenant },
  });
  return r.count === 1 ? prisma.jetonEmail.findUnique({ where: { empreinte: e } }) : null;
}
