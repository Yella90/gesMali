// Administration de la plateforme (toutes les ecoles) : reservee aux comptes listes dans
// ADMINS_PLATEFORME. Hors du filtre d'ecole par nature.

import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { compteConnecte } from "@/lib/auth/session";
import { DUREE_ESSAI_JOURS, estAdministrateurPlateforme, etatEcole, finEssaiDans } from "./etat";

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

// Donnees qui empechent de supprimer une ecole : seule une ecole sans activite (creee par
// erreur, en double, abandonnee pendant l'essai) peut etre supprimee ; les autres se suspendent
const CONTENU = {
  eleves: "élèves",
  classes: "classes",
  frais: "frais de scolarité",
  paiementsFrais: "paiements de frais",
  paiements: "paiements du personnel",
  mouvements: "mouvements de trésorerie",
  depenses: "dépenses récurrentes",
} as const;

export async function contenuEcole(etablissementId: string): Promise<Record<keyof typeof CONTENU, number>> {
  const w = { where: { etablissementId } };
  const [eleves, classes, frais, paiementsFrais, paiements, mouvements, depenses] = await Promise.all([
    prisma.eleve.count(w),
    prisma.classe.count(w),
    prisma.fraisScolarite.count(w),
    prisma.paiementFrais.count(w),
    prisma.paiement.count(w),
    prisma.mouvementTresorerie.count(w),
    prisma.depenseRecurrente.count(w),
  ]);
  return { eleves, classes, frais, paiementsFrais, paiements, mouvements, depenses };
}

// Supprime une ecole vide : ses parametres, annees, matieres, fiches du personnel, acces et
// journal. Les comptes de son personnel perdent l'acces ; un compte qui ne sert plus nulle
// part et n'a laisse aucune trace est supprime. La suppression reste dans le journal de la
// plateforme (sans ecole). nomConfirme : le nom de l'ecole, retape par l'administrateur.
export async function supprimerEcole(etablissementId: string, parUserId: string, nomConfirme: string) {
  const e = await prisma.etablissement.findUnique({ where: { id: etablissementId }, select: { id: true, nom: true } });
  if (!e) throw new Error("École introuvable");
  if (nomConfirme.trim() !== e.nom.trim()) throw new Error("Le nom saisi ne correspond pas : rien n'a été supprimé");
  const contenu = await contenuEcole(etablissementId);
  const pleins = (Object.keys(CONTENU) as (keyof typeof CONTENU)[]).filter((k) => contenu[k] > 0);
  if (pleins.length) {
    throw new Error(
      "« " + e.nom + " » contient des données (" + pleins.map((k) => contenu[k] + " " + CONTENU[k]).join(", ") +
        ") : elle ne peut pas être supprimée. Suspendez-la plutôt."
    );
  }

  return prisma.$transaction(async (tx) => {
    // Comptes lies a l'ecole : par un acces, par leur ecole ou leur fiche d'origine
    const acces = await tx.acces.findMany({ where: { etablissementId }, select: { userId: true } });
    await tx.acces.deleteMany({ where: { etablissementId } });
    await tx.auditLog.deleteMany({ where: { etablissementId } });
    const comptes = await tx.user.findMany({
      where: { OR: [{ id: { in: acces.map((a) => a.userId) } }, { etablissementId }, { employe: { etablissementId } }] },
      select: {
        id: true,
        email: true,
        etablissementId: true,
        employe: { select: { etablissementId: true } },
        _count: {
          select: {
            acces: true,
            auditLogs: true,
            notesSaisies: true,
            notesModifiees: true,
            bulletinsGeneres: true,
            paiementsSaisis: true,
            paiementsAnnules: true,
            fraisSaisis: true,
            rappelsSaisis: true,
            mouvementsSaisis: true,
            presencesSaisies: true,
          },
        },
      },
    });

    const supprimes: string[] = [];
    for (const u of comptes) {
      const traces = Object.values(u._count).reduce((a, b) => a + b, 0);
      if (traces === 0 && u.id !== parUserId && !estAdministrateurPlateforme(u.email)) {
        await tx.user.delete({ where: { id: u.id } });
        supprimes.push(u.email);
      } else {
        await tx.user.update({
          where: { id: u.id },
          data: {
            ...(u.etablissementId === etablissementId ? { etablissementId: null } : {}),
            ...(u.employe?.etablissementId === etablissementId ? { employeId: null } : {}),
          },
        });
      }
    }

    const annees = await tx.anneeScolaire.findMany({ where: { etablissementId }, select: { id: true } });
    await tx.trimestre.deleteMany({ where: { anneeScolaireId: { in: annees.map((a) => a.id) } } });
    await tx.anneeScolaire.deleteMany({ where: { etablissementId } });
    await tx.matiere.deleteMany({ where: { etablissementId } });
    await tx.compteurRecu.deleteMany({ where: { etablissementId } });
    await tx.parametresEtablissement.deleteMany({ where: { etablissementId } });
    await tx.employe.deleteMany({ where: { etablissementId } });
    await tx.etablissement.delete({ where: { id: etablissementId } });

    await tx.auditLog.create({
      data: {
        userId: parUserId,
        etablissementId: null,
        action: "PLATEFORME_SUPPRIMER",
        entite: "Etablissement",
        entiteId: etablissementId,
        details: { nom: e.nom, comptesSupprimes: supprimes },
      },
    });
    return { nom: e.nom, comptesSupprimes: supprimes };
  });
}

// Mot de passe provisoire remis au directeur d'une ecole creee par l'administration
export function motDePasseProvisoire(): string {
  return randomBytes(9).toString("base64url");
}
