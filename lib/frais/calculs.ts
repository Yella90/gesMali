// Calculs lies aux frais de scolarite

export type TrancheAvecPaiements = {
  id: string;
  ordre: number;
  libelle: string;
  montant: number;
  dateEcheance: Date | string;
  paiements: { montant: number; annule: boolean }[];
};

export type FraisSituation = {
  totalPaye: number;
  attenduJusquMaintenant: number;
  attenduTotal: number;
  retard: number;
  moisEcoules: number;
  moisTotal: number;
  moisPayes: number;
  statut: "A_JOUR" | "EN_RETARD" | "EN_AVANCE" | "SOLDE";
  resteTotal: number;

  fraisInscription: number;
  inscriptionPayee: number;
  inscriptionReste: number;
  inscriptionStatut: "PAYEE" | "PARTIELLE" | "IMPAYEE" | "AUCUNE";
  inscriptionTrancheId: string | null;
};

// Nombre de mois entre deux dates (inclusif)
export function nombreMoisEntre(debut: Date, fin: Date): number {
  return (fin.getFullYear() - debut.getFullYear()) * 12 + (fin.getMonth() - debut.getMonth()) + 1;
}

// Calcule la situation d'un eleve
export function calculerSituation(
  fraisInscription: number,
  fraisMensuel: number,
  dateDebut: Date | string,
  tranches: TrancheAvecPaiements[],
  maintenant: Date = new Date()
): FraisSituation {
  const debut = typeof dateDebut === "string" ? new Date(dateDebut) : dateDebut;

  // Separer les tranches
  const trancheInscription = tranches.find((t) => t.ordre === 0) ?? null;
  const tranchesMensuelles = tranches.filter((t) => t.ordre > 0);
  const moisTotal = tranchesMensuelles.length;

  // === INSCRIPTION ===
  let inscriptionStatut: FraisSituation["inscriptionStatut"] = "AUCUNE";
  let inscriptionPayee = 0;
  let inscriptionReste = 0;
  if (trancheInscription) {
    inscriptionPayee = trancheInscription.paiements
      .filter((p) => !p.annule)
      .reduce((s, p) => s + p.montant, 0);
    inscriptionReste = Math.max(0, trancheInscription.montant - inscriptionPayee);
    if (inscriptionReste <= 0.01) inscriptionStatut = "PAYEE";
    else if (inscriptionPayee > 0) inscriptionStatut = "PARTIELLE";
    else inscriptionStatut = "IMPAYEE";
  } else if (fraisInscription > 0) {
    inscriptionReste = fraisInscription;
    inscriptionStatut = "IMPAYEE";
  }

  // === MOIS ECOULES (avec plafonnement) ===
  // On compte les mois depuis le debut de l'annee scolaire
  // mais on ne peut pas depasser le nombre total de mensualites de l'annee
  let moisEcoules = nombreMoisEntre(debut, maintenant);
  if (moisEcoules < 0) moisEcoules = 0;
  if (moisEcoules > moisTotal) moisEcoules = moisTotal; // <-- PLAFOND

  // === TOTAUX ===
  const totalPaye = tranches.reduce(
    (s, t) => s + t.paiements.filter((p) => !p.annule).reduce((ss, p) => ss + p.montant, 0),
    0
  );

  const aInscription = fraisInscription > 0;
  const attenduJusquMaintenant =
    (aInscription ? fraisInscription : 0) + moisEcoules * fraisMensuel;

  const attenduTotal = fraisInscription + moisTotal * fraisMensuel;

  const retard = Math.max(0, attenduJusquMaintenant - totalPaye);

  // Combien de mois payes
  const paiementsMensuels = tranchesMensuelles.reduce(
    (s, t) => s + t.paiements.filter((p) => !p.annule).reduce((ss, p) => ss + p.montant, 0),
    0
  );
  const moisPayes = fraisMensuel > 0 ? Math.floor(paiementsMensuels / fraisMensuel) : 0;

  const resteTotal = Math.max(0, attenduTotal - totalPaye);

  let statut: FraisSituation["statut"];
  if (totalPaye >= attenduTotal - 0.01) {
    statut = "SOLDE";
  } else if (retard > 0.01) {
    statut = "EN_RETARD";
  } else if (totalPaye > attenduJusquMaintenant + 0.01) {
    statut = "EN_AVANCE";
  } else {
    statut = "A_JOUR";
  }

  return {
    totalPaye,
    attenduJusquMaintenant,
    attenduTotal,
    retard,
    moisEcoules,
    moisTotal,
    moisPayes,
    statut,
    resteTotal,
    fraisInscription,
    inscriptionPayee,
    inscriptionReste,
    inscriptionStatut,
    inscriptionTrancheId: trancheInscription?.id ?? null,
  };
}

export function libelleStatut(statut: FraisSituation["statut"]): string {
  switch (statut) {
    case "SOLDE": return "Soldé";
    case "EN_RETARD": return "En retard";
    case "EN_AVANCE": return "En avance";
    case "A_JOUR": return "à jour";
  }
}

export function libelleStatutInscription(s: FraisSituation["inscriptionStatut"]): string {
  switch (s) {
    case "PAYEE": return "Payée";
    case "PARTIELLE": return "Partielle";
    case "IMPAYEE": return "Impayée";
    case "AUCUNE": return "-";
  }
}