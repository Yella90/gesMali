// Rapport financier d'une periode [debut, fin[ : meme calcul pour la page et le PDF.
// Les apports et retraits du promoteur sont presentes a part : ce ne sont ni des
// recettes ni des depenses de l'ecole.

import { prisma, DB_SCHEMA } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { soldesCaisses, type SoldeCaisse } from "@/lib/tresorerie/tresorerie";

const T = (t: string) => Prisma.raw('"' + DB_SCHEMA + '"."' + t + '"');

const TYPES: Record<string, string> = {
  MENSUEL: "Salaires mensuels",
  HORAIRE: "Heures",
  PRIME: "Primes",
  AVANCE: "Avances sur salaire",
  REMBOURSEMENT: "Remboursements",
};

export type Rapport = {
  debut: Date;
  fin: Date; // exclue
  recettes: { libelle: string; montant: number }[];
  totalRecettes: number;
  charges: { libelle: string; montant: number }[];
  totalCharges: number;
  resultat: number;
  apports: number;
  retraits: number;
  soldesDebut: SoldeCaisse[];
  soldesFin: SoldeCaisse[];
  impayes: number;
};

// Periode a partir de deux mois "AAAA-MM" (inclus)
export function periodeRapport(debutMois: string, finMois: string) {
  const [a1, m1] = debutMois.split("-").map(Number);
  const [a2, m2] = finMois.split("-").map(Number);
  return { debut: new Date(a1, m1 - 1, 1), fin: new Date(a2, m2, 1) };
}

export async function rapportFinancier(etablissementId: string, debut: Date, fin: Date): Promise<Rapport> {
  const avant = new Date(debut.getTime() - 1);
  const finIncluse = new Date(fin.getTime() - 1);
  const [frais, salaires, depenses, capital, soldesDebut, soldesFin, impayes] = await Promise.all([
    prisma.$queryRaw<{ inscription: boolean; total: number }[]>`
      SELECT (t.ordre = 0) AS inscription, COALESCE(SUM(p.montant), 0)::float8 AS total
      FROM ${T("PaiementFrais")} p
      JOIN ${T("TrancheFrais")} t ON t.id = p."trancheId"
      JOIN ${T("FraisScolarite")} f ON f.id = t."fraisId"
      WHERE f."etablissementId" = ${etablissementId} AND NOT p.annule
        AND p."datePaiement" >= ${debut} AND p."datePaiement" < ${fin}
      GROUP BY 1`,
    prisma.paiement.groupBy({
      by: ["type"],
      where: { etablissementId, statut: { not: "ANNULE" }, datePaiement: { gte: debut, lt: fin } },
      _sum: { montant: true },
    }),
    prisma.mouvementTresorerie.groupBy({
      by: ["categorie"],
      where: { etablissementId, type: "DEPENSE", annule: false, date: { gte: debut, lt: fin } },
      _sum: { montant: true },
    }),
    prisma.mouvementTresorerie.groupBy({
      by: ["type"],
      where: { etablissementId, type: { in: ["APPORT_CAPITAL", "RETRAIT_PROMOTEUR"] }, annule: false, date: { gte: debut, lt: fin } },
      _sum: { montant: true },
    }),
    soldesCaisses(etablissementId, avant),
    soldesCaisses(etablissementId, finIncluse),
    prisma.$queryRaw<{ reste: number }[]>`
      WITH payes AS (SELECT "trancheId", SUM(montant) paye FROM ${T("PaiementFrais")} WHERE NOT annule GROUP BY 1)
      SELECT COALESCE(SUM(GREATEST(t.montant - COALESCE(p.paye, 0), 0)), 0)::float8 AS reste
      FROM ${T("TrancheFrais")} t
      JOIN ${T("FraisScolarite")} f ON f.id = t."fraisId"
      LEFT JOIN payes p ON p."trancheId" = t.id
      WHERE f."etablissementId" = ${etablissementId} AND t."dateEcheance" < ${fin}`,
  ]);

  const recettes = [
    { libelle: "Frais d'inscription", montant: frais.find((x) => x.inscription)?.total ?? 0 },
    { libelle: "Mensualités de scolarité", montant: frais.find((x) => !x.inscription)?.total ?? 0 },
  ];
  const charges = [
    ...salaires.map((s) => ({ libelle: TYPES[s.type] ?? s.type, montant: s._sum.montant ?? 0 })),
    ...depenses.map((d) => ({ libelle: "Dépenses : " + (d.categorie ?? "Autre"), montant: d._sum.montant ?? 0 })),
  ].sort((a, b) => b.montant - a.montant);
  const totalRecettes = recettes.reduce((s, r) => s + r.montant, 0);
  const totalCharges = charges.reduce((s, c) => s + c.montant, 0);

  return {
    debut,
    fin,
    recettes,
    totalRecettes,
    charges,
    totalCharges,
    resultat: totalRecettes - totalCharges,
    apports: capital.find((c) => c.type === "APPORT_CAPITAL")?._sum.montant ?? 0,
    retraits: capital.find((c) => c.type === "RETRAIT_PROMOTEUR")?._sum.montant ?? 0,
    soldesDebut,
    soldesFin,
    impayes: impayes[0]?.reste ?? 0,
  };
}
