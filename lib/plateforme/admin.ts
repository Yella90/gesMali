// Administration de la plateforme (toutes les ecoles) : reservee aux comptes listes dans
// ADMINS_PLATEFORME. Hors du filtre d'ecole par nature.

import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { compteConnecte } from "@/lib/auth/session";
import { DUREE_ESSAI_JOURS, etatEcole, finEssaiDans } from "./etat";

export async function requireAdministrateur() {
  const compte = await compteConnecte();
  if (!compte?.administrateurPlateforme) throw new Error("Accès réservé à l'administration de la plateforme");
  return compte;
}

export async function listeEcoles(maintenant = new Date()) {
  const [ecoles, activite] = await Promise.all([
    prisma.etablissement.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nom: true,
        type: true,
        adresse: true,
        telephone: true,
        statut: true,
        finEssai: true,
        createdAt: true,
        _count: { select: { eleves: { where: { statut: "INSCRIT" } }, acces: true, classes: true } },
        acces: { where: { roles: { has: "DIRECTEUR" } }, select: { user: { select: { email: true } } }, take: 3 },
      },
    }),
    prisma.auditLog.groupBy({ by: ["etablissementId"], _max: { createdAt: true } }),
  ]);
  const derniere = new Map(activite.map((a) => [a.etablissementId, a._max.createdAt]));

  return ecoles.map((e) => ({
    id: e.id,
    nom: e.nom,
    type: e.type,
    adresse: e.adresse,
    telephone: e.telephone,
    statut: e.statut,
    etat: etatEcole(e, maintenant),
    finEssai: e.finEssai,
    creeLe: e.createdAt,
    eleves: e._count.eleves,
    comptes: e._count.acces,
    classes: e._count.classes,
    directeurs: e.acces.map((a) => a.user.email),
    derniereActivite: derniere.get(e.id) ?? null,
  }));
}

export type ActionStatut = "activer" | "suspendre" | "reactiver" | "prolonger";

// Statut d'une ecole : activer (fin de l'essai), suspendre, reactiver (retour a l'essai s'il
// n'est pas termine), prolonger l'essai d'une periode de DUREE_ESSAI_JOURS
export async function changerStatutEcole(etablissementId: string, action: ActionStatut, parUserId: string, maintenant = new Date()) {
  const e = await prisma.etablissement.findUnique({ where: { id: etablissementId } });
  if (!e) throw new Error("École introuvable");

  const data =
    action === "activer"
      ? { statut: "ACTIF" as const, finEssai: null }
      : action === "suspendre"
        ? { statut: "SUSPENDU" as const }
        : action === "reactiver"
          ? { statut: e.finEssai && e.finEssai > maintenant ? ("ESSAI" as const) : ("ACTIF" as const) }
          : {
              statut: "ESSAI" as const,
              finEssai: finEssaiDans(DUREE_ESSAI_JOURS, e.finEssai && e.finEssai > maintenant ? e.finEssai : maintenant),
            };

  const maj = await prisma.etablissement.update({ where: { id: etablissementId }, data });
  await prisma.auditLog.create({
    data: {
      userId: parUserId,
      etablissementId,
      action: "PLATEFORME_" + action.toUpperCase(),
      entite: "Etablissement",
      entiteId: etablissementId,
      details: { avant: e.statut, apres: maj.statut, finEssai: maj.finEssai },
    },
  });
  return maj;
}

// Mot de passe provisoire remis au directeur d'une ecole creee par l'administration
export function motDePasseProvisoire(): string {
  return randomBytes(9).toString("base64url");
}
