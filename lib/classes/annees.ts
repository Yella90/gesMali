// Classes et annees scolaires : une annee a la fois dans les listes, l'annee active
// en premier dans les menus deroulants, les classes archivees reperees par leur annee.

import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

export const ORDRE_CLASSES: Prisma.ClasseOrderByWithRelationInput[] = [
  { anneeScolaire: { active: "desc" } },
  { anneeScolaire: { libelle: "desc" } },
  { niveau: "asc" },
  { section: "asc" },
];

type ClasseLib = { nom: string | null; niveau: number; section: string | null; anneeScolaire?: { libelle: string; active: boolean } };

// "2 A", et "2eme A · 2025-2026" pour une classe d'une annee archivee
export function libelleClasse(c: ClasseLib): string {
  const lib = c.nom || c.niveau + (c.section ? " " + c.section : "");
  return c.anneeScolaire && !c.anneeScolaire.active ? lib + " · " + c.anneeScolaire.libelle : lib;
}

// Annees de l'etablissement et annee affichee (?annee=, sinon l'annee active)
export async function anneeAffichee(etablissementId: string, anneeId?: string) {
  const annees = await prisma.anneeScolaire.findMany({
    where: { etablissementId },
    select: { id: true, libelle: true, active: true },
    orderBy: { libelle: "desc" },
  });
  const annee = annees.find((a) => a.id === anneeId) ?? annees.find((a) => a.active) ?? annees[0] ?? null;
  return { annees, annee };
}
