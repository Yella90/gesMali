// Textes des e-mails de GES Mali (deposes dans la file d'envoi, voir lib/email/file.ts),
// en version texte et HTML (lib/email/gabarit.ts)

import type { Email } from "./file";
import { htmlEmail, texteEmail, type ContenuEmail } from "./gabarit";

function composer(destinataire: string, c: ContenuEmail): Email {
  return { destinataire, objet: c.objet, titre: c.titre, message: texteEmail(c), messageHtml: htmlEmail(c) };
}

export function emailInscription(destinataire: string, p: { prenom: string; ecole: string; lien: string }): Email {
  return composer(destinataire, {
    objet: "Confirmez l'inscription de votre école sur GES Mali",
    titre: "Bienvenue sur GES Mali",
    apercu: "Un clic pour créer « " + p.ecole + " » et ouvrir vos 30 jours d'essai.",
    avant: [
      "Bonjour " + p.prenom + ",",
      "Pour créer l'école « " + p.ecole + " » et ouvrir votre période d'essai de 30 jours, confirmez votre adresse e-mail :",
    ],
    bouton: { libelle: "Créer mon école", lien: p.lien },
    apres: ["Ce lien est valable 48 heures. Vous vous connecterez ensuite avec cette adresse et le mot de passe choisi."],
    note: "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : aucune école ne sera créée.",
  });
}

// Inscription demandee avec une adresse qui a deja un compte : rien n'est cree
export function emailCompteExistant(destinataire: string, p: { ecole: string; lienConnexion: string; lienMotDePasse: string }): Email {
  return composer(destinataire, {
    objet: "Votre compte GES Mali existe déjà",
    titre: "Vous avez déjà un compte",
    apercu: "Connectez-vous pour créer « " + p.ecole + " » depuis votre compte.",
    avant: [
      "Bonjour,",
      "Une inscription de l'école « " + p.ecole + " » a été demandée avec cette adresse, qui a déjà un compte GES Mali.",
      "Pour créer cette école, connectez-vous avec votre compte habituel, puis ouvrez « Mes écoles » et « Créer une nouvelle école ».",
    ],
    bouton: { libelle: "Me connecter", lien: p.lienConnexion },
    apres: [{ texte: "Mot de passe oublié ?", libelleLien: "Choisir un nouveau mot de passe", lien: p.lienMotDePasse }],
    note: "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : rien n'a été modifié.",
  });
}

export function emailVerification(destinataire: string, p: { lien: string }): Email {
  return composer(destinataire, {
    objet: "Confirmez votre adresse e-mail GES Mali",
    titre: "Confirmez votre adresse e-mail",
    apercu: "Un clic pour confirmer que cette adresse est bien la vôtre.",
    avant: ["Bonjour,", "Pour confirmer que cette adresse est bien la vôtre, cliquez sur le bouton ci-dessous :"],
    bouton: { libelle: "Confirmer mon adresse", lien: p.lien },
    apres: [
      "Ce lien est valable 48 heures. Une adresse confirmée permet à d'autres écoles de vous donner accès à leur espace avec le même compte.",
    ],
    note: "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
  });
}

export function emailReinitialisation(destinataire: string, p: { lien: string }): Email {
  return composer(destinataire, {
    objet: "Réinitialisation de votre mot de passe GES Mali",
    titre: "Mot de passe oublié",
    apercu: "Choisissez un nouveau mot de passe : lien valable 1 heure.",
    avant: ["Bonjour,", "Pour choisir un nouveau mot de passe, cliquez sur le bouton ci-dessous :"],
    bouton: { libelle: "Choisir un nouveau mot de passe", lien: p.lien },
    apres: ["Ce lien est valable 1 heure et ne sert qu'une fois. Les sessions ouvertes sur vos autres appareils seront fermées."],
    note: "Si vous n'avez rien demandé, ignorez ce message : votre mot de passe actuel reste valable.",
  });
}
