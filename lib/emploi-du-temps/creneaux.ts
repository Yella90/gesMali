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

// 90 -> "1 h 30", 120 -> "2 h"
export function fmtDuree(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h + " h" + (m ? " " + String(m).padStart(2, "0") : "");
}

// Cours d'un jour places sur des voies : ceux qui se chevauchent (donnees anciennes) cote a cote
export function disposer<T extends Plage>(liste: T[]) {
  const places: { c: T; voie: number; voies: number }[] = [];
  let groupe: typeof places = [];
  let finsVoies: string[] = [];
  const clore = () => {
    for (const p of groupe) p.voies = finsVoies.length;
    groupe = [];
    finsVoies = [];
  };
  const tries = [...liste].sort((a, b) => a.heureDebut.localeCompare(b.heureDebut) || a.heureFin.localeCompare(b.heureFin));
  for (const c of tries) {
    if (finsVoies.length && finsVoies.every((fin) => fin <= c.heureDebut)) clore();
    let voie = finsVoies.findIndex((fin) => fin <= c.heureDebut);
    if (voie < 0) voie = finsVoies.push(c.heureFin) - 1;
    else finsVoies[voie] = c.heureFin;
    const p = { c, voie, voies: 1 };
    groupe.push(p);
    places.push(p);
  }
  clore();
  return places;
}

// Plage d'heures affichee : 8h a 18h, elargie aux cours planifies hors de cette plage
export function plageHeures(liste: Plage[]): number[] {
  let min = 8;
  let max = 18;
  for (const c of liste) {
    min = Math.min(min, Math.floor(enHeures(c.heureDebut)));
    max = Math.max(max, Math.ceil(enHeures(c.heureFin)));
  }
  return Array.from({ length: max - min }, (_, i) => min + i);
}

// Couleur stable d'une matiere : indice dans une palette de 8 teintes (grille et PDF)
export function indiceCouleur(nom: string): number {
  let h = 0;
  for (let i = 0; i < nom.length; i++) h = (h * 31 + nom.charCodeAt(i)) % 8;
  return h;
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
