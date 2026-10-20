// Textes des e-mails de GES Mali (deposes dans la file d'envoi, voir lib/email/file.ts)

import type { Email } from "./file";

export function emailInscription(destinataire: string, p: { prenom: string; ecole: string; lien: string }): Email {
  return {
    destinataire,
    objet: "Confirmez l'inscription de votre école sur GES Mali",
    titre: "Bienvenue sur GES Mali",
    message:
      "Bonjour " + p.prenom + ",\n\n" +
      "Pour créer l'école « " + p.ecole + " » et ouvrir votre période d'essai de 30 jours, confirmez votre adresse " +
      "en ouvrant ce lien (valable 48 heures) :\n\n" + p.lien + "\n\n" +
      "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : aucune école ne sera créée.",
  };
}

// Inscription demandee avec une adresse qui a deja un compte : rien n'est cree
export function emailCompteExistant(destinataire: string, p: { ecole: string; lienConnexion: string; lienMotDePasse: string }): Email {
  return {
    destinataire,
    objet: "Votre compte GES Mali existe déjà",
    titre: "Vous avez déjà un compte",
    message:
      "Bonjour,\n\n" +
      "Une inscription de l'école « " + p.ecole + " » a été demandée avec cette adresse, qui a déjà un compte GES Mali.\n\n" +
      "Pour créer cette école, connectez-vous avec votre compte habituel, puis ouvrez « Mes écoles » et « Créer une nouvelle école » :\n\n" +
      p.lienConnexion + "\n\n" +
      "Mot de passe oublié ? Choisissez-en un nouveau ici :\n\n" + p.lienMotDePasse + "\n\n" +
      "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : rien n'a été modifié.",
  };
}

export function emailVerification(destinataire: string, p: { lien: string }): Email {
  return {
    destinataire,
    objet: "Confirmez votre adresse e-mail GES Mali",
    titre: "Confirmez votre adresse e-mail",
    message:
      "Bonjour,\n\n" +
      "Pour confirmer que cette adresse est bien la vôtre, ouvrez ce lien (valable 48 heures) :\n\n" + p.lien + "\n\n" +
      "Une adresse confirmée permet à d'autres écoles de vous donner accès à leur espace avec le même compte.\n" +
      "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
  };
}

export function emailReinitialisation(destinataire: string, p: { lien: string }): Email {
  return {
    destinataire,
    objet: "Réinitialisation de votre mot de passe GES Mali",
    titre: "Mot de passe oublié",
    message:
      "Bonjour,\n\n" +
      "Pour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :\n\n" + p.lien + "\n\n" +
      "Si vous n'avez rien demandé, ignorez ce message : votre mot de passe actuel reste valable.",
  };
}
