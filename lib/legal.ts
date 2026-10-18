// Informations affichees dans les pages legales (CGU, confidentialite, cookies).
// A COMPLETER avant la mise en production : les valeurs entre crochets
// apparaissent telles quelles sur les pages publiques.
// Les textes sont un modele : les faire relire par un juriste (loi malienne
// n° 2013-015 sur les donnees personnelles, APDP).

export const LEGAL = {
  // Societe ou personne qui edite et exploite GES Mali
  editeur: "[Nom de l'éditeur de GES Mali]",
  adresse: "[Adresse de l'éditeur, Bamako, Mali]",
  email: "doumbialayesoma@gmail.com",
  telephone: "+223 90 69 23 63",

  // Hebergement
  hebergeurApplication: "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis (exécution en région Francfort, Allemagne)",
  hebergeurBase: "Neon Inc. (base de données PostgreSQL), serveurs situés à Francfort, Allemagne",

  miseAJour: "18 octobre 2026",
} as const;
