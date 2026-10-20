// Parcours qui passent par un lien recu par e-mail : inscription d'une ecole, mot de passe
// oublie, confirmation d'adresse. base : adresse publique de l'application (liens des e-mails).
// Les limites d'envoi (envoiAutorise) sont appliquees par les actions, qui connaissent l'IP.

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { modifierMotDePasseCompte } from "@/lib/auth/comptes";
import { effacerEchecs } from "@/lib/auth/limite";
import { creerEcole, ecoleSchema, type DonneesEcole } from "@/lib/plateforme/creation";
import { deposerEmail } from "./file";
import { consommerJeton, creerJeton, restaurerJeton, type TypeJeton } from "./jetons";
import { emailCompteExistant, emailInscription, emailReinitialisation, emailVerification } from "./messages";

export const MOT_DE_PASSE_MIN = 8;
export const INSCRIPTION_FERMEE = "Les inscriptions en ligne ne sont pas encore ouvertes : contactez l'équipe GES Mali";
export const LIEN_INVALIDE = "Ce lien n'est plus valable (déjà utilisé ou expiré) : faites une nouvelle demande";

export const CHEMINS: Record<TypeJeton, string> = {
  INSCRIPTION: "/inscription/confirmer/",
  VERIFICATION: "/verifier-email/",
  REINITIALISATION: "/mot-de-passe/",
};

export function verifierMotDePasse(motDePasse: string, confirmation: string) {
  if (motDePasse.length < MOT_DE_PASSE_MIN) throw new Error("Mot de passe : " + MOT_DE_PASSE_MIN + " caractères minimum");
  if (motDePasse !== confirmation) throw new Error("La confirmation ne correspond pas au mot de passe");
}

// Donnees d'une inscription en attente de confirmation (dans le jeton)
type Inscription = { ecole: Prisma.InputJsonObject; motDePasseHash: string };

// Inscription d'une ecole : rien n'est cree avant le clic sur le lien recu. Adresse qui a deja
// un compte : la personne recoit un message qui l'invite a se connecter (l'ecran affiche la
// meme reponse dans les deux cas : il ne revele pas quelles adresses ont un compte).
export async function demanderInscription(d: DonneesEcole, motDePasse: string, base: string) {
  if (motDePasse.length < MOT_DE_PASSE_MIN) throw new Error("Mot de passe : " + MOT_DE_PASSE_MIN + " caractères minimum");
  const existant = await prisma.user.count({ where: { email: d.directeurEmail } });
  if (existant) {
    await deposerEmail(
      emailCompteExistant(d.directeurEmail, { ecole: d.nom, lienConnexion: base + "/login?callbackUrl=" + encodeURIComponent("/inscription"), lienMotDePasse: base + "/mot-de-passe/oublie" })
    );
    return;
  }
  const donnees: Inscription = {
    ecole: { ...d, anneeDebut: d.anneeDebut.toISOString(), anneeFin: d.anneeFin.toISOString() },
    motDePasseHash: await bcrypt.hash(motDePasse, 10),
  };
  const jeton = await creerJeton("INSCRIPTION", d.directeurEmail, { donnees });
  await deposerEmail(emailInscription(d.directeurEmail, { prenom: d.directeurPrenom, ecole: d.nom, lien: base + CHEMINS.INSCRIPTION + jeton }));
}

// Ecole decrite par un lien d'inscription (page de confirmation)
export function ecoleDuJeton(donnees: unknown): DonneesEcole | null {
  const r = ecoleSchema.safeParse((donnees as Partial<Inscription> | null)?.ecole);
  return r.success ? r.data : null;
}

// Clic sur le lien d'inscription : l'ecole est creee, avec un compte a l'adresse confirmee
export async function confirmerInscription(jeton: string, maintenant = new Date()) {
  const j = await consommerJeton("INSCRIPTION", jeton, maintenant);
  if (!j) throw new Error(LIEN_INVALIDE);
  try {
    const d = ecoleDuJeton(j.donnees);
    const motDePasseHash = (j.donnees as Partial<Inscription> | null)?.motDePasseHash;
    if (!d || d.directeurEmail !== j.email || typeof motDePasseHash !== "string") throw new Error(LIEN_INVALIDE);
    if (await prisma.user.count({ where: { email: j.email } })) {
      throw new Error("Cette adresse a déjà un compte GES Mali : connectez-vous, puis créez l'école depuis « Mes écoles »");
    }
    const r = await creerEcole(d, { statut: "ESSAI", motDePasseHash, emailVerifie: true });
    // L'empreinte du mot de passe ne reste pas dans le lien utilise
    await prisma.jetonEmail.update({ where: { id: j.id }, data: { donnees: Prisma.DbNull } });
    return { email: j.email, etablissementId: r.etablissementId };
  } catch (e) {
    // Ecole non creee : le lien reste utilisable
    await restaurerJeton(j.id);
    throw e;
  }
}

// Mot de passe oublie : rien ne se passe pour une adresse sans compte actif (meme reponse a l'ecran)
export async function demanderReinitialisation(email: string, base: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, actif: true } });
  if (!user?.actif) return;
  const jeton = await creerJeton("REINITIALISATION", email, { userId: user.id });
  await deposerEmail(emailReinitialisation(email, { lien: base + CHEMINS.REINITIALISATION + jeton }));
}

// Nouveau mot de passe choisi depuis le lien recu : l'adresse est confirmee du meme coup,
// les sessions ouvertes et le blocage apres echecs de connexion tombent
export async function reinitialiserParLien(jeton: string, motDePasse: string, confirmation: string) {
  verifierMotDePasse(motDePasse, confirmation);
  const j = await consommerJeton("REINITIALISATION", jeton);
  if (!j?.userId) throw new Error(LIEN_INVALIDE);
  const user = await prisma.user.findUnique({ where: { id: j.userId }, select: { id: true, email: true, actif: true } });
  if (!user?.actif || user.email !== j.email) throw new Error(LIEN_INVALIDE);
  await modifierMotDePasseCompte(user.id, motDePasse, { emailVerifie: true });
  await effacerEchecs(user.email);
  return { email: user.email };
}

// Confirmation de l'adresse d'un compte (demandee depuis « Mon compte »)
export async function demanderVerification(user: { id: string; email: string }, base: string) {
  const jeton = await creerJeton("VERIFICATION", user.email, { userId: user.id });
  await deposerEmail(emailVerification(user.email, { lien: base + CHEMINS.VERIFICATION + jeton }));
}

export async function verifierAdresse(jeton: string) {
  const j = await consommerJeton("VERIFICATION", jeton);
  if (!j?.userId) throw new Error(LIEN_INVALIDE);
  // Le compte a toujours cette adresse
  const r = await prisma.user.updateMany({ where: { id: j.userId, email: j.email }, data: { emailVerifieLe: new Date() } });
  if (r.count !== 1) throw new Error(LIEN_INVALIDE);
  return { email: j.email };
}
