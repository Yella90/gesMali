// Utilitaire pour les periodes mensuelles (format AAAA-MM)

const MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Aoùt", "Septembre", "Octobre", "Novembre", "Décembre",
];

const MOIS_COURT = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Aoùt", "Sep", "Oct", "Nov", "Déc",
];

export function periodeActuelle(now: Date = new Date()): string {
  return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
}

export function fmtPeriode(p: string): string {
  const [an, mois] = p.split("-");
  return MOIS_FR[parseInt(mois) - 1] + " " + an;
}

export function fmtPeriodeCourt(p: string): string {
  const [an, mois] = p.split("-");
  return MOIS_COURT[parseInt(mois) - 1] + " " + an;
}

// Compare deux periodes "AAAA-MM" : retourne -1 si a < b, 0 si egal, 1 si a > b
export function comparerPeriode(a: string, b: string): number {
  return a.localeCompare(b);
}

// Verifie si la periode est ecoulee (<= mois courant)
export function estPeriodeEcoulee(p: string, now: Date = new Date()): boolean {
  return comparerPeriode(p, periodeActuelle(now)) <= 0;
}

// Verifie si la periode est dans le futur (> mois courant)
export function estPeriodeFuture(p: string, now: Date = new Date()): boolean {
  return comparerPeriode(p, periodeActuelle(now)) > 0;
}

// Filtre une liste de periodes pour ne garder que les mois ecoules
export function filtrerPeriodesEcoulees<T extends { periode: string }>(
  periodes: T[],
  now: Date = new Date()
): T[] {
  return periodes.filter((p) => estPeriodeEcoulee(p.periode, now));
}

// Genere toutes les periodes entre deux dates
export function genererPeriodesEntre(debut: Date, fin: Date): string[] {
  const periodes: string[] = [];
  let annee = debut.getFullYear();
  let mois = debut.getMonth() + 1;
  const finAnnee = fin.getFullYear();
  const finMois = fin.getMonth() + 1;

  while (annee < finAnnee || (annee === finAnnee && mois <= finMois)) {
    periodes.push(annee + "-" + String(mois).padStart(2, "0"));
    mois++;
    if (mois > 12) { mois = 1; annee++; }
  }
  return periodes;
}