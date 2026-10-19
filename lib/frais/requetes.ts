// Requetes SQL agregees pour les pages frais.
// Le lien vers la base (Neon) est lent : ce qui coute, c'est le volume de donnees
// rapatrie, pas l'execution (quelques ms). Les `include` imbriques de Prisma
// ramenaient toutes les tranches et tous les paiements ; ici les sommes, comptes
// et filtres sont faits en base et on ne renvoie que ce qui est affiche.

import { prisma, DB_SCHEMA } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { periodeActuelle } from "@/lib/frais/periode";
import type { TotauxFrais } from "@/lib/frais/calculs";

export type ClasseLib = { nom: string | null; niveau: number; section: string | null };

// Les requetes brutes ne passent pas par le schema de l'adaptateur Prisma :
// les tables sont qualifiees explicitement (DB_SCHEMA est valide dans lib/db.ts)
const T = (table: string) => Prisma.raw('"' + DB_SCHEMA + '"."' + table + '"');
const ELEVE = T("Eleve");
const CLASSE = T("Classe");
const ANNEE = T("AnneeScolaire");
const FRAIS = T("FraisScolarite");
const TRANCHE = T("TrancheFrais");
const PAIEMENT = T("PaiementFrais");
const RAPPEL = T("Rappel");

type ColonnesClasse = { classeNom: string | null; classeNiveau: number | null; classeSection: string | null };

// Somme des paiements non annules, par tranche
const PAYES = Prisma.sql`
  SELECT "trancheId", SUM(montant) AS paye
  FROM ${PAIEMENT}
  WHERE NOT annule
  GROUP BY "trancheId"
`;

function classeOuNull(r: ColonnesClasse): ClasseLib | null {
  if (r.classeNiveau === null) return null;
  return { nom: r.classeNom, niveau: r.classeNiveau, section: r.classeSection };
}

// ─── Impayes ───

export type FiltresImpayes = { periode?: string; type?: "inscription" | "mensuel" };

export type TrancheImpayee = {
  id: string;
  ordre: number;
  libelle: string;
  montant: number;
  paye: number;
  dateEcheance: Date;
  eleve: { id: string; matricule: string; nom: string; prenom: string; classe: ClasseLib | null };
};

export type StatsImpayes = {
  nb: number;
  total: number;
  nbInscriptions: number;
  totalInscriptions: number;
  nbMensuel: number;
  totalMensuel: number;
};

// Tranches de l'etablissement dont le reste est > 0, avec les filtres
function impayesFiltres(etablissementId: string, f: FiltresImpayes) {
  return Prisma.sql`
    SELECT t.id, t."fraisId", t.ordre, t.libelle, t.montant, t."dateEcheance",
           COALESCE(p.paye, 0)::float8 AS paye
    FROM ${TRANCHE} t
    JOIN ${FRAIS} f ON f.id = t."fraisId"
    LEFT JOIN payes p ON p."trancheId" = t.id
    WHERE f."etablissementId" = ${etablissementId}
      AND t.montant - COALESCE(p.paye, 0) > 0.01
      ${f.periode ? Prisma.sql`AND t.periode = ${f.periode}` : Prisma.empty}
      ${f.type === "inscription" ? Prisma.sql`AND t.ordre = 0` : Prisma.empty}
      ${f.type === "mensuel" ? Prisma.sql`AND t.ordre <> 0` : Prisma.empty}
  `;
}

export async function statsImpayes(etablissementId: string, f: FiltresImpayes): Promise<StatsImpayes> {
  const [s] = await prisma.$queryRaw<StatsImpayes[]>`
    WITH payes AS (${PAYES}), imp AS (${impayesFiltres(etablissementId, f)})
    SELECT COUNT(*)::int AS nb,
           COALESCE(SUM(montant - paye), 0)::float8 AS total,
           (COUNT(*) FILTER (WHERE ordre = 0))::int AS "nbInscriptions",
           COALESCE(SUM(montant - paye) FILTER (WHERE ordre = 0), 0)::float8 AS "totalInscriptions",
           (COUNT(*) FILTER (WHERE ordre <> 0))::int AS "nbMensuel",
           COALESCE(SUM(montant - paye) FILTER (WHERE ordre <> 0), 0)::float8 AS "totalMensuel"
    FROM imp
  `;
  return s;
}

export async function tranchesImpayees(
  etablissementId: string,
  f: FiltresImpayes,
  limite: number,
  decalage: number
): Promise<TrancheImpayee[]> {
  const rows = await prisma.$queryRaw<
    ({
      id: string; ordre: number; libelle: string; montant: number; paye: number; dateEcheance: Date;
      eleveId: string; matricule: string; nom: string; prenom: string;
    } & ColonnesClasse)[]
  >`
    WITH payes AS (${PAYES}), imp AS (${impayesFiltres(etablissementId, f)})
    SELECT i.id, i.ordre, i.libelle, i.montant, i.paye, i."dateEcheance",
           e.id AS "eleveId", e.matricule, e.nom, e.prenom,
           c.nom AS "classeNom", c.niveau AS "classeNiveau", c.section AS "classeSection"
    FROM imp i
    JOIN ${FRAIS} f ON f.id = i."fraisId"
    JOIN ${ELEVE} e ON e.id = f."eleveId"
    LEFT JOIN ${CLASSE} c ON c.id = e."classeId"
    ORDER BY i."dateEcheance" ASC, i.id
    LIMIT ${limite} OFFSET ${decalage}
  `;

  return rows.map((r) => ({
    id: r.id,
    ordre: r.ordre,
    libelle: r.libelle,
    montant: r.montant,
    paye: r.paye,
    dateEcheance: r.dateEcheance,
    eleve: { id: r.eleveId, matricule: r.matricule, nom: r.nom, prenom: r.prenom, classe: classeOuNull(r) },
  }));
}

// Periodes deja ecoulees de l'etablissement (plus recente d'abord)
export async function periodesEcoulees(etablissementId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ periode: string }[]>`
    SELECT DISTINCT t.periode
    FROM ${TRANCHE} t
    JOIN ${FRAIS} f ON f.id = t."fraisId"
    WHERE f."etablissementId" = ${etablissementId}
      AND t.periode <= ${periodeActuelle()}
    ORDER BY t.periode DESC
  `;
  return rows.map((r) => r.periode);
}

// Periodes deja ecoulees qui ont au moins une tranche impayee (plus recente d'abord)
export async function periodesImpayeesEcoulees(etablissementId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ periode: string }[]>`
    WITH payes AS (${PAYES})
    SELECT DISTINCT t.periode
    FROM ${TRANCHE} t
    JOIN ${FRAIS} f ON f.id = t."fraisId"
    LEFT JOIN payes p ON p."trancheId" = t.id
    WHERE f."etablissementId" = ${etablissementId}
      AND t.periode <= ${periodeActuelle()}
      AND t.montant - COALESCE(p.paye, 0) > 0.01
    ORDER BY t.periode DESC
  `;
  return rows.map((r) => r.periode);
}

// ─── Liste des frais : eleves inscrits + totaux de leurs frais de l'annee active ───

export type EleveAvecFrais = {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  classe: ClasseLib | null;
  frais: {
    fraisInscription: number;
    fraisScolariteMensuel: number;
    dateDebut: Date;
    totaux: TotauxFrais;
  } | null;
};

// Sans annee active, on prend les frais les plus recents de l'eleve
export async function elevesAvecFrais(etablissementId: string): Promise<EleveAvecFrais[]> {
  const rows = await prisma.$queryRaw<
    ({
      id: string; matricule: string; nom: string; prenom: string;
      fraisId: string | null; fraisInscription: number | null; fraisScolariteMensuel: number | null; dateDebut: Date | null;
      inscriptionId: string | null; inscriptionMontant: number | null; inscriptionPaye: number;
      moisTotal: number; payeMensuel: number; totalPaye: number;
    } & ColonnesClasse)[]
  >`
    WITH payes AS (${PAYES}),
    annee AS (
      SELECT id FROM ${ANNEE}
      WHERE "etablissementId" = ${etablissementId} AND active
      LIMIT 1
    ),
    totaux AS (
      -- @@unique([fraisId, ordre]) : au plus une tranche d'inscription (ordre 0)
      SELECT t."fraisId",
             MAX(t.id) FILTER (WHERE t.ordre = 0) AS "inscriptionId",
             MAX(t.montant) FILTER (WHERE t.ordre = 0) AS "inscriptionMontant",
             COALESCE(SUM(p.paye) FILTER (WHERE t.ordre = 0), 0)::float8 AS "inscriptionPaye",
             (COUNT(*) FILTER (WHERE t.ordre > 0))::int AS "moisTotal",
             COALESCE(SUM(p.paye) FILTER (WHERE t.ordre > 0), 0)::float8 AS "payeMensuel",
             COALESCE(SUM(p.paye), 0)::float8 AS "totalPaye"
      FROM ${TRANCHE} t
      LEFT JOIN payes p ON p."trancheId" = t.id
      GROUP BY t."fraisId"
    )
    SELECT e.id, e.matricule, e.nom, e.prenom,
           c.nom AS "classeNom", c.niveau AS "classeNiveau", c.section AS "classeSection",
           f.id AS "fraisId", f."fraisInscription", f."fraisScolariteMensuel", f."dateDebut",
           tt."inscriptionId", tt."inscriptionMontant",
           COALESCE(tt."inscriptionPaye", 0)::float8 AS "inscriptionPaye",
           COALESCE(tt."moisTotal", 0)::int AS "moisTotal",
           COALESCE(tt."payeMensuel", 0)::float8 AS "payeMensuel",
           COALESCE(tt."totalPaye", 0)::float8 AS "totalPaye"
    FROM ${ELEVE} e
    LEFT JOIN ${CLASSE} c ON c.id = e."classeId"
    LEFT JOIN LATERAL (
      SELECT fs.* FROM ${FRAIS} fs
      WHERE fs."eleveId" = e.id
        AND (NOT EXISTS (SELECT 1 FROM annee) OR fs."anneeScolaireId" = (SELECT id FROM annee))
      ORDER BY fs."dateDebut" DESC
      LIMIT 1
    ) f ON true
    LEFT JOIN totaux tt ON tt."fraisId" = f.id
    WHERE e."etablissementId" = ${etablissementId}
      AND e.statut = 'INSCRIT'
    ORDER BY e.nom ASC
  `;

  return rows.map((r) => ({
    id: r.id,
    matricule: r.matricule,
    nom: r.nom,
    prenom: r.prenom,
    classe: classeOuNull(r),
    frais: r.fraisId
      ? {
          fraisInscription: r.fraisInscription!,
          fraisScolariteMensuel: r.fraisScolariteMensuel!,
          dateDebut: r.dateDebut!,
          totaux: {
            inscription: r.inscriptionId
              ? { id: r.inscriptionId, montant: r.inscriptionMontant!, paye: r.inscriptionPaye }
              : null,
            moisTotal: r.moisTotal,
            payeMensuel: r.payeMensuel,
            totalPaye: r.totalPaye,
          },
        }
      : null,
  }));
}

// ─── Rappels ───

export type RappelLigne = {
  id: string;
  dateRappel: Date;
  envoye: boolean;
  trancheLibelle: string;
  reste: number;
  eleve: { id: string; nom: string; prenom: string; classe: ClasseLib | null };
};

export async function listeRappels(etablissementId: string, envoye: boolean | undefined, limite: number): Promise<RappelLigne[]> {
  const rows = await prisma.$queryRaw<
    ({
      id: string; dateRappel: Date; envoye: boolean; trancheLibelle: string; reste: number;
      eleveId: string; nom: string; prenom: string;
    } & ColonnesClasse)[]
  >`
    WITH payes AS (${PAYES})
    SELECT r.id, r."dateRappel", r.envoye,
           t.libelle AS "trancheLibelle",
           (t.montant - COALESCE(p.paye, 0))::float8 AS reste,
           e.id AS "eleveId", e.nom, e.prenom,
           c.nom AS "classeNom", c.niveau AS "classeNiveau", c.section AS "classeSection"
    FROM ${RAPPEL} r
    JOIN ${TRANCHE} t ON t.id = r."trancheId"
    JOIN ${FRAIS} f ON f.id = t."fraisId"
    JOIN ${ELEVE} e ON e.id = f."eleveId"
    LEFT JOIN ${CLASSE} c ON c.id = e."classeId"
    LEFT JOIN payes p ON p."trancheId" = t.id
    WHERE f."etablissementId" = ${etablissementId}
      ${envoye === undefined ? Prisma.empty : Prisma.sql`AND r.envoye = ${envoye}`}
    ORDER BY r.envoye ASC, r."dateRappel" DESC
    LIMIT ${limite}
  `;

  return rows.map((r) => ({
    id: r.id,
    dateRappel: r.dateRappel,
    envoye: r.envoye,
    trancheLibelle: r.trancheLibelle,
    reste: r.reste,
    eleve: { id: r.eleveId, nom: r.nom, prenom: r.prenom, classe: classeOuNull(r) },
  }));
}

// Numero du prochain recu de frais. recuNumero est unique dans toute la base : la
// numerotation reste commune a toutes les ecoles (une numerotation par ecole demandera
// une colonne etablissementId sur les paiements de frais).
export async function prochainNumeroRecu(): Promise<string> {
  const nb = await prisma.paiementFrais.count();
  return "REC-" + new Date().getFullYear() + "-" + String(nb + 1).padStart(5, "0");
}
