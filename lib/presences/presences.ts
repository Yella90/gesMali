// Presences : un enregistrement par eleve et par jour (colonne date sans heure).
// Les dates circulent en texte "AAAA-MM-JJ" et sont stockees a minuit UTC.

import { ecole } from "@/lib/data/ecole";

export const STATUTS = ["PRESENT", "ABSENT", "RETARD"] as const;
export type StatutPresenceT = (typeof STATUTS)[number];

export const LIB_STATUT: Record<StatutPresenceT, string> = {
  PRESENT: "Présent",
  ABSENT: "Absent",
  RETARD: "En retard",
};

export function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10);
}

// Date "AAAA-MM-JJ" valide et pas dans le futur, sinon aujourd'hui
export function jourValide(v: string | undefined | null): string {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v + "T00:00:00Z"))) return aujourdhui();
  return v > aujourdhui() ? aujourdhui() : v;
}

export function jourUtc(jour: string): Date {
  return new Date(jour + "T00:00:00Z");
}

// Mois [debut, fin[ contenant le jour donne
export function moisDuJour(jour: string) {
  const [a, m] = jour.split("-").map(Number);
  return { mois: jour.slice(0, 7), debut: new Date(Date.UTC(a, m - 1, 1)), fin: new Date(Date.UTC(a, m, 1)) };
}

export type SyntheseEleve = {
  eleveId: string;
  nom: string;
  matricule: string;
  jours: number; // jours d'appel
  absences: number;
  absencesJustifiees: number;
  retards: number;
  minutesRetard: number;
};

// Bilan par eleve d'une classe sur une periode, et detail des absences et retards
export async function syntheseClasse(etablissementId: string, classeId: string, debut: Date, fin: Date) {
  const db = ecole(etablissementId);
  const [eleves, presences] = await Promise.all([
    db.eleve.findMany({
      where: { classeId, statut: "INSCRIT" },
      select: { id: true, nom: true, prenom: true, matricule: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    }),
    db.presence.findMany({
      where: { classeId, date: { gte: debut, lt: fin } },
      select: { eleveId: true, date: true, statut: true, justifie: true, motif: true, dureeMinutes: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const parEleve = new Map<string, SyntheseEleve>(
    eleves.map((e) => [
      e.id,
      { eleveId: e.id, nom: e.nom + " " + e.prenom, matricule: e.matricule, jours: 0, absences: 0, absencesJustifiees: 0, retards: 0, minutesRetard: 0 },
    ])
  );
  for (const p of presences) {
    const s = parEleve.get(p.eleveId);
    if (!s) continue;
    s.jours++;
    if (p.statut === "ABSENT") {
      s.absences++;
      if (p.justifie) s.absencesJustifiees++;
    } else if (p.statut === "RETARD") {
      s.retards++;
      s.minutesRetard += p.dureeMinutes ?? 0;
    }
  }
  const noms = new Map(eleves.map((e) => [e.id, e.nom + " " + e.prenom]));
  const incidents = presences
    .filter((p) => p.statut !== "PRESENT" && noms.has(p.eleveId))
    .map((p) => ({ ...p, nom: noms.get(p.eleveId)! }));
  const joursAppel = new Set(presences.map((p) => p.date.toISOString().slice(0, 10))).size;

  return { lignes: [...parEleve.values()], incidents, joursAppel };
}
