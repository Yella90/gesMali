// Regles communes a l'inscription d'un eleve et a la reprise des donnees :
// matricule "AAAA-NNNN" et echeancier des frais de l'annee scolaire.

import { ecole } from "@/lib/data/ecole";

const MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function periodeStr(annee: number, mois: number) {
  return annee + "-" + String(mois).padStart(2, "0");
}

// Prochain numero de matricule de l'annee (plus grand numero existant + 1)
export async function prochainNumeroMatricule(etablissementId: string, annee = new Date().getFullYear()): Promise<number> {
  const db = ecole(etablissementId);
  const existants = await db.eleve.findMany({
    where: { etablissementId, matricule: { startsWith: annee + "-" } },
    select: { matricule: true },
  });
  const max = existants.reduce((m, e) => Math.max(m, Number(e.matricule.slice(5)) || 0), 0);
  // Les anciens matricules venaient du nombre total d'eleves : on reste au-dessus
  const total = await db.eleve.count({ where: { etablissementId } });
  return Math.max(max, total) + 1;
}

export function formatMatricule(numero: number, annee = new Date().getFullYear()): string {
  return annee + "-" + String(numero).padStart(4, "0");
}

export async function genererMatricule(etablissementId: string): Promise<string> {
  return formatMatricule(await prochainNumeroMatricule(etablissementId));
}

type Tranche = { libelle: string; periode: string; ordre: number; montant: number; dateEcheance: Date };

// Echeancier : inscription (si > 0) puis une mensualite par mois de l'annee scolaire
export function tranchesAnnee(fraisInscription: number, fraisMensuel: number, dateDebutAnnee: Date, dateFinAnnee: Date): Tranche[] {
  const debut = new Date(dateDebutAnnee);
  const fin = new Date(dateFinAnnee);
  const nombreMois = (fin.getFullYear() - debut.getFullYear()) * 12 + (fin.getMonth() - debut.getMonth()) + 1;
  const tranches: Tranche[] = [];
  if (fraisInscription > 0) {
    tranches.push({
      libelle: "Inscription",
      periode: periodeStr(debut.getFullYear(), debut.getMonth() + 1),
      ordre: 0,
      montant: fraisInscription,
      dateEcheance: new Date(debut.getFullYear(), debut.getMonth(), debut.getDate()),
    });
  }
  let anneeCur = debut.getFullYear();
  let moisCur = debut.getMonth() + 1;
  for (let i = 0; i < nombreMois; i++) {
    tranches.push({
      libelle: MOIS_FR[moisCur - 1] + " " + anneeCur,
      periode: periodeStr(anneeCur, moisCur),
      ordre: i + 1,
      montant: fraisMensuel,
      dateEcheance: new Date(anneeCur, moisCur - 1, 5),
    });
    moisCur++;
    if (moisCur > 12) { moisCur = 1; anneeCur++; }
  }
  return tranches;
}

// Cree FraisScolarite + toutes les TrancheFrais en une seule operation imbriquee.
// Retourne l'id de la tranche "Inscription" (si elle existe) et l'id des frais.
export async function genererFraisPourEleve(
  eleveId: string,
  anneeScolaireId: string,
  fraisInscription: number,
  fraisMensuel: number,
  dateDebutAnnee: Date,
  dateFinAnnee: Date,
  etablissementId: string
): Promise<{ trancheInscriptionId: string | null; fraisId: string }> {
  const db = ecole(etablissementId);
  const frais = await db.fraisScolarite.create({
    data: {
      etablissementId,
      eleveId,
      anneeScolaireId,
      fraisInscription,
      fraisScolariteMensuel: fraisMensuel,
      reduction: 0,
      dateDebut: new Date(dateDebutAnnee),
      tranches: { create: tranchesAnnee(fraisInscription, fraisMensuel, dateDebutAnnee, dateFinAnnee) },
    },
    include: { tranches: true },
  });
  const tInscription = frais.tranches.find((t) => t.ordre === 0);
  return { trancheInscriptionId: tInscription?.id ?? null, fraisId: frais.id };
}
