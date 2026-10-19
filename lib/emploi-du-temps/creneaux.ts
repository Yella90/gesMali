// Creneaux de l'emploi du temps : jours, heures "HH:MM" et chevauchements.
// Partage entre la grille d'une classe (client) et les actions serveur.

import type { Prisma } from "@/lib/generated/prisma/client";

export const JOURS = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"] as const;

const LIBELLES_JOURS: Record<string, string> = {
  LUNDI: "Lundi",
  MARDI: "Mardi",
  MERCREDI: "Mercredi",
  JEUDI: "Jeudi",
  VENDREDI: "Vendredi",
  SAMEDI: "Samedi",
};

export function libJour(j: string): string {
  return LIBELLES_JOURS[j] ?? j;
}

export function estJour(j: string): boolean {
  return (JOURS as readonly string[]).includes(j);
}

// Heure sur 24 h avec zeros : "08:30". Les heures se comparent alors comme des chaines.
export const FORMAT_HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;

// "08:30" -> 8.5
export function enHeures(h: string): number {
  const [hh, mm] = h.split(":").map(Number);
  return hh + (mm || 0) / 60;
}

// "08:30" + 60 -> "09:30" (null au-dela de minuit)
export function decaler(h: string, minutes: number): string | null {
  const total = Math.round(enHeures(h) * 60) + minutes;
  if (total >= 24 * 60) return null;
  return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
}

type Plage = { heureDebut: string; heureFin: string };

// Deux cours du meme jour se chevauchent si chacun commence avant la fin de l'autre
export function chevauche(a: Plage, b: Plage): boolean {
  return a.heureDebut < b.heureFin && b.heureDebut < a.heureFin;
}

// Saisie d'un creneau depuis la grille d'une classe
export type DonneesCreneau = {
  jour: string;
  heureDebut: string;
  heureFin: string;
  matiereId: string;
  enseignantId: string;
};

// Enseignants planifiables : employes actifs au poste d'enseignant ou au compte de role ENSEIGNANT
export const FILTRE_ENSEIGNANTS: Prisma.EmployeWhereInput = {
  actif: true,
  OR: [{ poste: "Enseignant" }, { user: { roles: { has: "ENSEIGNANT" } } }],
};

export function estEnseignant(e: { actif: boolean; poste: string; user: { roles: string[] } | null }): boolean {
  return e.actif && (e.poste === "Enseignant" || !!e.user?.roles.includes("ENSEIGNANT"));
}
