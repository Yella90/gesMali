// Informations affichees dans les pages legales (CGU, confidentialite, cookies).
// A COMPLETER avant la mise en production : les valeurs entre crochets
// apparaissent telles quelles sur les pages publiques.
// Les textes sont un modele : les faire relire par un juriste (loi malienne
// n° 2013-015 sur les donnees personnelles, APDP).

export const LEGAL = {
  // Societe ou personne qui edite et exploite GES Mali
  editeur: "Laye Soma Doumbia",
  adresse: "Mali",
  email: "doumbialayesoma@gmail.com",
  telephone: "+223 90 69 23 63",
  // Prospection et vente (abonnements des ecoles, demonstrations)
  commercial: "Yacouba Traoré, chargé commercial",

  // Hebergement
  hebergeurApplication: "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis (exécution en région Francfort, Allemagne)",
  hebergeurBase: "Neon Inc. (base de données PostgreSQL), serveurs Amazon Web Services situés à Francfort, Allemagne",
  // E-mails (liens de confirmation, mot de passe oublie) : file d'envoi chez alwaysdata,
  // envoi par le serveur de messagerie de Google
  hebergeurEmails: "alwaysdata SAS, Paris, France (file d'envoi) et Google LLC (service Gmail, envoi des messages)",
  // Copie quotidienne de la base, conservee 30 jours (sauvegarde/README.md)
  hebergeurSauvegardes: "alwaysdata SAS, serveurs situés en France",
  dureeSauvegardes: "30 jours",

  miseAJour: "21 octobre 2026",
} as const;
