// Appreciation du conseil de classe, deduite de la moyenne generale du trimestre.
// Enregistree a la generation des bulletins ; sert aussi pour les bulletins generes avant.

const PALIERS: { min: number; texte: string }[] = [
  { min: 16, texte: "Excellent travail. Félicitations du conseil de classe." },
  { min: 14, texte: "Très bon travail. Encouragements du conseil de classe." },
  { min: 12, texte: "Bon travail. Continuez ainsi." },
  { min: 10, texte: "Travail passable. Peut mieux faire." },
  { min: 8, texte: "Travail insuffisant. Des efforts sont nécessaires." },
  { min: 0, texte: "Travail très insuffisant. Doit se ressaisir." },
];

export function appreciationAutomatique(moyenneGenerale: number): string {
  return (PALIERS.find((p) => moyenneGenerale >= p.min) ?? PALIERS[PALIERS.length - 1]).texte;
}
