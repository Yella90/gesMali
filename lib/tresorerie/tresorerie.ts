// Tresorerie : soldes par caisse et prevision du mois.
// Le solde n'est jamais stocke : il est recalcule a partir des encaissements de
// frais (PaiementFrais), des paiements du personnel (Paiement) et des mouvements
// manuels (MouvementTresorerie : apports, depenses, retraits du promoteur, transferts
// d'une caisse a une autre).

// SQL brut : filtre explicite par etablissementId ; requetes Prisma : ecole(etablissementId)
import { prisma, DB_SCHEMA } from "@/lib/db";
import { ecole } from "@/lib/data/ecole";
import { Prisma } from "@/lib/generated/prisma/client";

export const CAISSES = ["ESPECES", "BANQUE", "MOBILE_MONEY"] as const;
export type CaisseT = (typeof CAISSES)[number];

export const LIB_CAISSE: Record<CaisseT, string> = {
  ESPECES: "Espèces",
  BANQUE: "Banque",
  MOBILE_MONEY: "Mobile Money",
};

// Un mode de paiement alimente une caisse (virement et cheque : la banque)
export function caisseDuMode(mode: string): CaisseT {
  if (mode === "ESPECES") return "ESPECES";
  if (mode === "MOBILE_MONEY") return "MOBILE_MONEY";
  return "BANQUE";
}

export const CATEGORIES_DEPENSE = [
  "Loyer",
  "Électricité et eau",
  "Internet et téléphone",
  "Fournitures scolaires",
  "Entretien et réparations",
  "Transport",
  "Impôts et taxes",
  "Autre",
];

const T = (t: string) => Prisma.raw('"' + DB_SCHEMA + '"."' + t + '"');

export type SoldeCaisse = {
  caisse: CaisseT;
  frais: number; // encaissements de scolarite
  apports: number;
  transfertsRecus: number; // venus d'une autre caisse
  salaires: number;
  depenses: number;
  retraits: number;
  transfertsEnvoyes: number; // partis vers une autre caisse
  solde: number;
};

// Soldes de chaque caisse a une date (incluse), ou a ce jour
export async function soldesCaisses(etablissementId: string, jusquA?: Date): Promise<SoldeCaisse[]> {
  const fin = jusquA ?? new Date(8640000000000000);
  const [frais, salaires, mouvements] = await Promise.all([
    prisma.$queryRaw<{ mode: string; total: number }[]>`
      SELECT p.mode::text AS mode, COALESCE(SUM(p.montant), 0)::float8 AS total
      FROM ${T("PaiementFrais")} p
      JOIN ${T("TrancheFrais")} t ON t.id = p."trancheId"
      JOIN ${T("FraisScolarite")} f ON f.id = t."fraisId"
      WHERE f."etablissementId" = ${etablissementId} AND NOT p.annule AND p."datePaiement" <= ${fin}
      GROUP BY p.mode`,
    prisma.$queryRaw<{ mode: string; total: number }[]>`
      SELECT s."modePaiement"::text AS mode, COALESCE(SUM(s.montant), 0)::float8 AS total
      FROM ${T("Paiement")} s
      WHERE s."etablissementId" = ${etablissementId} AND s.statut <> 'ANNULE' AND s."datePaiement" <= ${fin}
      GROUP BY s."modePaiement"`,
    // Transfert : TRANSFERT sur la caisse de depart, TRANSFERT_RECU sur la caisse d'arrivee
    prisma.$queryRaw<{ caisse: CaisseT; type: string; total: number }[]>`
      SELECT m.caisse::text AS caisse, m.type::text AS type, COALESCE(SUM(m.montant), 0)::float8 AS total
      FROM ${T("MouvementTresorerie")} m
      WHERE m."etablissementId" = ${etablissementId} AND NOT m.annule AND m.date <= ${fin}
      GROUP BY m.caisse, m.type
      UNION ALL
      SELECT m."caisseDestination"::text, 'TRANSFERT_RECU', COALESCE(SUM(m.montant), 0)::float8
      FROM ${T("MouvementTresorerie")} m
      WHERE m."etablissementId" = ${etablissementId} AND NOT m.annule AND m.date <= ${fin}
        AND m."caisseDestination" IS NOT NULL
      GROUP BY m."caisseDestination"`,
  ]);

  return CAISSES.map((caisse) => {
    const f = frais.filter((x) => caisseDuMode(x.mode) === caisse).reduce((s, x) => s + x.total, 0);
    const sal = salaires.filter((x) => caisseDuMode(x.mode) === caisse).reduce((s, x) => s + x.total, 0);
    const m = (type: string) => mouvements.find((x) => x.caisse === caisse && x.type === type)?.total ?? 0;
    const apports = m("APPORT_CAPITAL");
    const depenses = m("DEPENSE");
    const retraits = m("RETRAIT_PROMOTEUR");
    const transfertsRecus = m("TRANSFERT_RECU");
    const transfertsEnvoyes = m("TRANSFERT");
    return {
      caisse,
      frais: f,
      apports,
      transfertsRecus,
      salaires: sal,
      depenses,
      retraits,
      transfertsEnvoyes,
      solde: f + apports + transfertsRecus - sal - depenses - retraits - transfertsEnvoyes,
    };
  });
}

export async function soldeCaisse(etablissementId: string, caisse: CaisseT): Promise<number> {
  return (await soldesCaisses(etablissementId)).find((s) => s.caisse === caisse)?.solde ?? 0;
}

// Transfert d'une caisse a une autre : depot des especes a la banque, retrait au guichet,
// recharge ou retrait Mobile Money... Le solde de la caisse de depart doit couvrir le
// montant, sauf derogation (reservee au directeur par l'action, motif obligatoire).
export async function enregistrerTransfert(
  etablissementId: string,
  p: {
    de: CaisseT;
    vers: CaisseT;
    montant: number;
    date: Date;
    libelle?: string | null;
    reference?: string | null;
    motifDerogation?: string | null; // renseigne : la derogation est demandee
    saisieParId: string;
  }
) {
  if (!CAISSES.includes(p.de) || !CAISSES.includes(p.vers)) throw new Error("Caisse invalide");
  if (p.de === p.vers) throw new Error("Choisissez deux caisses différentes");
  if (!Number.isFinite(p.montant) || p.montant <= 0) throw new Error("Montant invalide");
  if (Number.isNaN(p.date.getTime())) throw new Error("Date invalide");

  let derogation = false;
  let motifDerogation: string | null = null;
  const disponible = await soldeCaisse(etablissementId, p.de);
  if (p.montant > disponible + 0.01) {
    if (p.motifDerogation === undefined || p.motifDerogation === null) {
      throw new Error("Solde insuffisant en caisse " + LIB_CAISSE[p.de] + " : " + disponible.toLocaleString("fr-FR") + " F disponibles");
    }
    if (p.motifDerogation.trim().length < 5) throw new Error("Motif de dérogation obligatoire (5 caractères minimum)");
    derogation = true;
    motifDerogation = p.motifDerogation.trim();
  }

  return ecole(etablissementId).mouvementTresorerie.create({
    data: {
      etablissementId,
      type: "TRANSFERT",
      caisse: p.de,
      caisseDestination: p.vers,
      date: p.date,
      montant: p.montant,
      libelle: p.libelle?.trim() || "Transfert " + LIB_CAISSE[p.de] + " → " + LIB_CAISSE[p.vers],
      reference: p.reference?.trim() || null,
      derogation,
      motifDerogation,
      saisieParId: p.saisieParId,
    },
  });
}

export type Prevision = {
  soldeTotal: number;
  salairesRestants: number; // salaires mensuels pas encore verses ce mois
  depensesRestantes: number; // depenses recurrentes dont l'echeance n'est pas passee
  sortiesPrevues: number;
  fraisAttendus: number; // echeances du mois encore impayees
  manque: number; // > 0 : le solde ne couvre pas les sorties prevues
  niveau: "ok" | "juste" | "insuffisant";
  employesHoraires: number; // payes a l'heure : non comptes (heures inconnues)
};

// Le solde couvre-t-il les sorties prevues d'ici la fin du mois ?
export async function previsionMois(etablissementId: string, maintenant = new Date()): Promise<Prevision> {
  const periode = maintenant.getFullYear() + "-" + String(maintenant.getMonth() + 1).padStart(2, "0");
  const [soldes, employes, dejaPayes, recurrentes, attendus] = await Promise.all([
    soldesCaisses(etablissementId),
    ecole(etablissementId).employe.findMany({
      where: { etablissementId, actif: true, salaireReference: { gt: 0 } },
      select: { id: true, salaireReference: true, typeRemuneration: true },
    }),
    ecole(etablissementId).paiement.groupBy({
      by: ["employeId"],
      where: { etablissementId, periode, type: "MENSUEL", statut: { not: "ANNULE" } },
      _sum: { montant: true },
    }),
    ecole(etablissementId).depenseRecurrente.findMany({
      where: { etablissementId, actif: true, jourEcheance: { gte: maintenant.getDate() } },
      select: { montant: true },
    }),
    prisma.$queryRaw<{ reste: number }[]>`
      WITH payes AS (SELECT "trancheId", SUM(montant) paye FROM ${T("PaiementFrais")} WHERE NOT annule GROUP BY 1)
      SELECT COALESCE(SUM(GREATEST(t.montant - COALESCE(p.paye, 0), 0)), 0)::float8 AS reste
      FROM ${T("TrancheFrais")} t
      JOIN ${T("FraisScolarite")} f ON f.id = t."fraisId"
      LEFT JOIN payes p ON p."trancheId" = t.id
      WHERE f."etablissementId" = ${etablissementId} AND t.periode = ${periode}`,
  ]);

  const payes = new Map(dejaPayes.map((d) => [d.employeId, d._sum.montant ?? 0]));
  let salairesRestants = 0;
  let employesHoraires = 0;
  for (const e of employes) {
    if (e.typeRemuneration === "HORAIRE") {
      employesHoraires++;
      continue;
    }
    salairesRestants += Math.max(0, (e.salaireReference ?? 0) - (payes.get(e.id) ?? 0));
  }
  const depensesRestantes = recurrentes.reduce((s, d) => s + d.montant, 0);
  const sortiesPrevues = salairesRestants + depensesRestantes;
  const soldeTotal = soldes.reduce((s, c) => s + c.solde, 0);
  const manque = Math.max(0, sortiesPrevues - soldeTotal);
  const niveau = manque > 0 ? "insuffisant" : soldeTotal < sortiesPrevues * 1.1 ? "juste" : "ok";

  return {
    soldeTotal,
    salairesRestants,
    depensesRestantes,
    sortiesPrevues,
    fraisAttendus: attendus[0]?.reste ?? 0,
    manque,
    niveau,
    employesHoraires,
  };
}

const TYPES_PAIEMENT: Record<string, string> = {
  MENSUEL: "Salaire",
  HORAIRE: "Heures",
  PRIME: "Prime",
  AVANCE: "Avance",
  REMBOURSEMENT: "Remboursement",
};
const LIB_MOUVEMENT: Record<string, string> = {
  APPORT_CAPITAL: "Apport de capital",
  DEPENSE: "Dépense",
  RETRAIT_PROMOTEUR: "Retrait du promoteur",
  TRANSFERT: "Transfert",
};

export type LigneJournal = {
  cle: string;
  date: Date;
  nature: string;
  libelle: string;
  caisse: CaisseT;
  entree: number;
  sortie: number;
  // Transfert : caisse d'arrivee et montant (ni entree ni sortie pour l'ecole)
  caisseDestination?: CaisseT;
  transfert?: number;
  reference?: string | null; // n° de facture, de bordereau...
  mouvementId?: string; // mouvement manuel annulable
  annule?: boolean;
  derogation?: boolean;
};

// Tous les mouvements d'une periode [debut, fin[ : frais (regroupes par jour et caisse),
// paiements du personnel et mouvements manuels, du plus recent au plus ancien
export async function journal(etablissementId: string, debut: Date, fin: Date): Promise<LigneJournal[]> {
  const [frais, salaires, mouvements] = await Promise.all([
    prisma.$queryRaw<{ jour: Date; mode: string; n: number; total: number }[]>`
      SELECT date_trunc('day', p."datePaiement") AS jour, p.mode::text AS mode,
             COUNT(*)::int AS n, SUM(p.montant)::float8 AS total
      FROM ${T("PaiementFrais")} p
      JOIN ${T("TrancheFrais")} t ON t.id = p."trancheId"
      JOIN ${T("FraisScolarite")} f ON f.id = t."fraisId"
      WHERE f."etablissementId" = ${etablissementId} AND NOT p.annule
        AND p."datePaiement" >= ${debut} AND p."datePaiement" < ${fin}
      GROUP BY 1, 2`,
    ecole(etablissementId).paiement.findMany({
      where: { etablissementId, statut: { not: "ANNULE" }, datePaiement: { gte: debut, lt: fin } },
      select: { id: true, datePaiement: true, montant: true, type: true, modePaiement: true, periode: true, employe: { select: { nom: true, prenom: true } } },
    }),
    ecole(etablissementId).mouvementTresorerie.findMany({
      where: { etablissementId, date: { gte: debut, lt: fin } },
    }),
  ]);

  const lignes: LigneJournal[] = [];
  const parCaisse = new Map<string, LigneJournal>();
  for (const f of frais) {
    const caisse = caisseDuMode(f.mode);
    const cle = "f-" + new Date(f.jour).toISOString().slice(0, 10) + "-" + caisse;
    const l = parCaisse.get(cle);
    if (l) {
      l.entree += f.total;
      l.libelle = l.libelle.replace(/\d+ reçu/, (m) => String(Number(m.split(" ")[0]) + f.n) + " reçu");
    } else {
      const n: LigneJournal = { cle, date: new Date(f.jour), nature: "Frais de scolarité", libelle: f.n + " reçu(s)", caisse, entree: f.total, sortie: 0 };
      parCaisse.set(cle, n);
      lignes.push(n);
    }
  }
  for (const s of salaires) {
    lignes.push({
      cle: "s-" + s.id,
      date: s.datePaiement,
      nature: TYPES_PAIEMENT[s.type] ?? s.type,
      libelle: s.employe.prenom + " " + s.employe.nom + " (" + s.periode + ")",
      caisse: caisseDuMode(s.modePaiement),
      entree: 0,
      sortie: s.montant,
    });
  }
  for (const m of mouvements) {
    if (m.type === "TRANSFERT" && m.caisseDestination) {
      lignes.push({
        cle: "m-" + m.id,
        date: m.date,
        nature: LIB_MOUVEMENT.TRANSFERT,
        libelle: m.libelle + (m.annule && m.motifAnnulation ? " (annulé : " + m.motifAnnulation + ")" : ""),
        caisse: m.caisse,
        caisseDestination: m.caisseDestination,
        entree: 0,
        sortie: 0,
        transfert: m.montant,
        reference: m.reference,
        mouvementId: m.id,
        annule: m.annule,
        derogation: m.derogation,
      });
      continue;
    }
    const entree = m.type === "APPORT_CAPITAL";
    lignes.push({
      cle: "m-" + m.id,
      date: m.date,
      nature: LIB_MOUVEMENT[m.type] + (m.categorie ? " : " + m.categorie : ""),
      libelle: m.libelle + (m.annule && m.motifAnnulation ? " (annulé : " + m.motifAnnulation + ")" : ""),
      caisse: m.caisse,
      entree: entree && !m.annule ? m.montant : 0,
      sortie: !entree && !m.annule ? m.montant : 0,
      reference: m.reference,
      mouvementId: m.id,
      annule: m.annule,
      derogation: m.derogation,
    });
  }
  return lignes.sort((a, b) => b.date.getTime() - a.date.getTime());
}
