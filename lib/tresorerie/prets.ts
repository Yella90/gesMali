// Prets de l'ecole : situation de chaque pret (echeancier : lib/tresorerie/echeancier.ts).
// Rien n'est stocke en plus des echeances : le reste du et le retard se calculent a partir
// des remboursements (mouvements REMBOURSEMENT_PRET non annules).

import { ecole } from "@/lib/data/ecole";
import type { Echeance } from "@/lib/tresorerie/echeancier";

export type StatutEcheance = "payee" | "partielle" | "en_retard" | "a_venir";

export type SituationPret = {
  id: string;
  preteur: string;
  montant: number;
  tauxAnnuel: number;
  dureeMois: number;
  dateObtention: Date;
  notes: string | null;
  totalDu: number; // capital + interets de toutes les echeances
  rembourse: number;
  resteDu: number;
  enRetard: number; // echeances passees non couvertes par les remboursements
  prochaine: { date: Date; montant: number } | null;
  solde: boolean; // tout est rembourse
  echeances: (Echeance & { statut: StatutEcheance; paye: number })[];
  remboursements: { id: string; date: Date; montant: number; caisse: string; reference: string | null }[];
  apportId: string | null; // mouvement d'entree de l'argent du pret
};

// Les remboursements couvrent les echeances dans l'ordre (la plus ancienne d'abord)
export function situationPret(
  p: { id: string; preteur: string; montant: number; tauxAnnuel: number; dureeMois: number; dateObtention: Date; notes: string | null },
  echeances: Echeance[],
  remboursements: SituationPret["remboursements"],
  apportId: string | null,
  maintenant = new Date()
): SituationPret {
  const rembourse = remboursements.reduce((s, r) => s + r.montant, 0);
  let reste = rembourse;
  let enRetard = 0;
  let prochaine: SituationPret["prochaine"] = null;
  const lignes = [...echeances]
    .sort((a, b) => a.ordre - b.ordre)
    .map((e) => {
      const paye = Math.min(e.montant, Math.max(0, reste));
      reste -= paye;
      const du = e.montant - paye;
      const passee = e.dateEcheance <= maintenant;
      const statut: StatutEcheance = du <= 0.5 ? "payee" : passee ? "en_retard" : paye > 0 ? "partielle" : "a_venir";
      if (statut === "en_retard") enRetard += du;
      if (du > 0.5 && !passee && !prochaine) prochaine = { date: e.dateEcheance, montant: du };
      return { ...e, paye, statut };
    });
  const totalDu = echeances.reduce((s, e) => s + e.montant, 0);
  const resteDu = Math.max(0, totalDu - rembourse);
  return {
    ...p,
    totalDu,
    rembourse,
    resteDu,
    enRetard,
    prochaine,
    solde: resteDu <= 0.5,
    echeances: lignes,
    remboursements,
    apportId,
  };
}

// Prets non annules de l'ecole, du plus recent au plus ancien
export async function listerPrets(etablissementId: string, maintenant = new Date()): Promise<SituationPret[]> {
  const prets = await ecole(etablissementId).pret.findMany({
    where: { etablissementId, annule: false },
    include: {
      echeances: true,
      mouvements: { where: { annule: false }, orderBy: { date: "asc" } },
    },
    orderBy: { dateObtention: "desc" },
  });
  return prets.map((p) =>
    situationPret(
      p,
      p.echeances,
      p.mouvements
        .filter((m) => m.type === "REMBOURSEMENT_PRET")
        .map((m) => ({ id: m.id, date: m.date, montant: m.montant, caisse: m.caisse, reference: m.reference })),
      p.mouvements.find((m) => m.type === "APPORT_CAPITAL")?.id ?? null,
      maintenant
    )
  );
}

// Montant des prets a rembourser d'ici une date (retards compris), pour la prevision
export async function pretsARembourser(etablissementId: string, jusquA: Date): Promise<number> {
  const prets = await listerPrets(etablissementId, jusquA);
  return prets.reduce((s, p) => s + p.enRetard, 0);
}
