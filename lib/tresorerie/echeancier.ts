// Echeancier d'un pret, sans dependance serveur : utilise par le formulaire (apercu) et par
// l'action qui enregistre le pret.

export type Echeance = { ordre: number; dateEcheance: Date; capital: number; interet: number; montant: number };

// Mensualites constantes, arrondies au franc ; la derniere solde le capital restant.
// Taux 0 : capital divise en parts egales.
export function calculerEcheancier(montant: number, tauxAnnuel: number, dureeMois: number, premiereEcheance: Date): Echeance[] {
  const r = tauxAnnuel / 100 / 12;
  const mensualite = r > 0 ? Math.round((montant * r) / (1 - Math.pow(1 + r, -dureeMois))) : Math.round(montant / dureeMois);
  const echeances: Echeance[] = [];
  let restant = montant;
  for (let i = 0; i < dureeMois; i++) {
    const interet = Math.round(restant * r);
    const derniere = i === dureeMois - 1;
    const capital = derniere ? restant : Math.min(restant, mensualite - interet);
    restant = Math.round((restant - capital) * 100) / 100;
    const d = new Date(premiereEcheance.getFullYear(), premiereEcheance.getMonth() + i, premiereEcheance.getDate());
    echeances.push({ ordre: i + 1, dateEcheance: d, capital, interet, montant: capital + interet });
  }
  return echeances;
}
