// Donnees des graphiques financiers du tableau de bord, agregees en base
// (une requete pour tous les mois, comme lib/frais/requetes.ts).

import { prisma, DB_SCHEMA } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { fmtPeriode, fmtPeriodeCourt, periodeActuelle } from "@/lib/frais/periode";

const T = (table: string) => Prisma.raw('"' + DB_SCHEMA + '"."' + table + '"');

export type MoisFinances = {
  periode: string; // AAAA-MM
  libelle: string; // "Oct 2026"
  attendu: number; // echeances des eleves du mois
  encaisse: number; // frais de scolarite recus dans le mois
  salaires: number; // paiements du personnel du mois (hors annules)
};

// Valide un parametre "AAAA-MM", sinon le mois courant
export function moisValide(p: string | undefined): string {
  return p && /^\d{4}-(0[1-9]|1[0-2])$/.test(p) ? p : periodeActuelle();
}

// Les `nb` mois qui se terminent par `moisFin`, du plus ancien au plus recent
export function moisPrecedents(moisFin: string, nb: number): string[] {
  const [a, m] = moisFin.split("-").map(Number);
  const liste: string[] = [];
  for (let i = nb - 1; i >= 0; i--) {
    const d = new Date(a, m - 1 - i, 1);
    liste.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"));
  }
  return liste;
}

export async function financesMensuelles(etablissementId: string, moisFin: string, nb = 6): Promise<MoisFinances[]> {
  const mois = moisPrecedents(moisFin, nb);
  const rows = await prisma.$queryRaw<{ periode: string; attendu: number; encaisse: number; salaires: number }[]>`
    WITH mois AS (SELECT unnest(${mois}::text[]) AS periode)
    SELECT m.periode,
      COALESCE((SELECT SUM(t.montant) FROM ${T("TrancheFrais")} t
                JOIN ${T("FraisScolarite")} f ON f.id = t."fraisId"
                WHERE f."etablissementId" = ${etablissementId} AND t.periode = m.periode), 0)::float8 AS attendu,
      COALESCE((SELECT SUM(p.montant) FROM ${T("PaiementFrais")} p
                JOIN ${T("TrancheFrais")} t ON t.id = p."trancheId"
                JOIN ${T("FraisScolarite")} f ON f.id = t."fraisId"
                WHERE f."etablissementId" = ${etablissementId} AND NOT p.annule
                  AND to_char(p."datePaiement", 'YYYY-MM') = m.periode), 0)::float8 AS encaisse,
      COALESCE((SELECT SUM(s.montant) FROM ${T("Paiement")} s
                WHERE s."etablissementId" = ${etablissementId} AND s.statut <> 'ANNULE'
                  AND s.periode = m.periode), 0)::float8 AS salaires
    FROM mois m
    ORDER BY m.periode
  `;
  return rows.map((r) => ({ ...r, libelle: fmtPeriodeCourt(r.periode) }));
}

// Masse salariale prevue : salaires de reference du personnel actif
export async function salairesPrevus(etablissementId: string): Promise<number> {
  const r = await prisma.employe.aggregate({
    where: { etablissementId, actif: true },
    _sum: { salaireReference: true },
  });
  return r._sum.salaireReference ?? 0;
}

// Mois proposes dans le selecteur : les 12 derniers mois
export function optionsMois(): { valeur: string; libelle: string }[] {
  return moisPrecedents(periodeActuelle(), 12)
    .reverse()
    .map((p) => ({ valeur: p, libelle: fmtPeriode(p) }));
}
