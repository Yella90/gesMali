// Calcul des moyennes selon la pondération configurée
// Par défaut : Article 20 du JO Mali (2013) = composition 2/3, devoirs 1/3

export type NoteInput = {
  matiereId: string;
  type: "DEVOIR" | "COMPOSITION";
  numero: number;
  valeur: number | null;
};

export type MatiereInput = {
  id: string;
  nom: string;
  coefficient: number;
};

export type LigneCalculee = {
  matiereId: string;
  nomMatiere: string;
  moyenneDevoirs: number | null;
  moyenneCompo: number | null;
  moyenne: number;
  coefficient: number;
  points: number;
};

export type ResultatCalcul = {
  lignes: LigneCalculee[];
  moyenneGenerale: number;
  totalPoints: number;
  totalCoeffs: number;
};

export function calculerMoyennesEleve(
  notes: NoteInput[],
  matieres: MatiereInput[],
  ponderationDevoirs: number = 0.333,
  ponderationCompo: number = 0.667
): ResultatCalcul {
  const parMatiere = new Map<string, NoteInput[]>();
  for (const n of notes) {
    if (n.valeur == null) continue;
    if (!parMatiere.has(n.matiereId)) parMatiere.set(n.matiereId, []);
    parMatiere.get(n.matiereId)!.push(n);
  }

  const lignes: LigneCalculee[] = [];
  let totalPoints = 0;
  let totalCoeffs = 0;

  for (const matiere of matieres) {
    const notesMatiere = parMatiere.get(matiere.id) ?? [];
    if (notesMatiere.length === 0) continue;

    const devoirs = notesMatiere.filter((n) => n.type === "DEVOIR");
    const compositions = notesMatiere.filter((n) => n.type === "COMPOSITION");

    const moyenneDevoirs = devoirs.length
      ? devoirs.reduce((s, n) => s + (n.valeur ?? 0), 0) / devoirs.length
      : null;
    const moyenneCompo = compositions.length
      ? compositions.reduce((s, n) => s + (n.valeur ?? 0), 0) / compositions.length
      : null;

    let moyenneMatiere: number;
    if (moyenneDevoirs != null && moyenneCompo != null) {
      moyenneMatiere = moyenneCompo * ponderationCompo + moyenneDevoirs * ponderationDevoirs;
    } else {
      moyenneMatiere = moyenneDevoirs ?? moyenneCompo ?? 0;
    }

    const points = moyenneMatiere * matiere.coefficient;
    totalPoints += points;
    totalCoeffs += matiere.coefficient;

    lignes.push({
      matiereId: matiere.id,
      nomMatiere: matiere.nom,
      moyenneDevoirs: moyenneDevoirs != null ? Number(moyenneDevoirs.toFixed(2)) : null,
      moyenneCompo: moyenneCompo != null ? Number(moyenneCompo.toFixed(2)) : null,
      moyenne: Number(moyenneMatiere.toFixed(2)),
      coefficient: matiere.coefficient,
      points: Number(points.toFixed(2)),
    });
  }

  const moyenneGenerale = totalCoeffs > 0 ? totalPoints / totalCoeffs : 0;

  return {
    lignes,
    moyenneGenerale: Number(moyenneGenerale.toFixed(2)),
    totalPoints: Number(totalPoints.toFixed(2)),
    totalCoeffs,
  };
}