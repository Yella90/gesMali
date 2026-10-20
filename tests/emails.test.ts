// E-mails : file d'envoi, liens a usage unique, inscription confirmee par e-mail, mot de passe
// oublie, confirmation d'adresse et limites d'envoi. La file (mail_sortant) est dans la base
// locale de test (scripts/tests.mjs) : aucun e-mail ne part.

import { before, describe, test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { deposerEmail, SYSTEME } from "@/lib/email/file";
import { consommerJeton, creerJeton, lireJeton } from "@/lib/email/jetons";
import {
  CHEMINS,
  confirmerInscription,
  demanderInscription,
  demanderReinitialisation,
  demanderVerification,
  reinitialiserParLien,
  verifierAdresse,
} from "@/lib/email/parcours";
import { ecoleSchema } from "@/lib/plateforme/creation";
import { connexionBloquee, envoiAutorise, MAX_ECHECS, MAX_ENVOIS, noterEchec } from "@/lib/auth/limite";
import { sessionValable } from "@/lib/auth/comptes";
import { viderBase } from "./donnees";

const BASE = "https://ges-mali.test";

type Mail = { systeme: string; destinataire: string; objet: string; titre: string; message: string; statut: string };
const mails = (destinataire: string) =>
  prisma.$queryRaw<Mail[]>`SELECT * FROM mail_sortant WHERE destinataire = ${destinataire} ORDER BY id`;

// Jeton du dernier lien de ce type envoye a cette adresse
async function dernierLien(destinataire: string, chemin: string): Promise<string> {
  const m = (await mails(destinataire)).at(-1);
  assert.ok(m, "un e-mail pour " + destinataire);
  const i = m.message.indexOf(BASE + chemin);
  assert.ok(i >= 0, "lien " + chemin + " dans le message");
  return m.message.slice(i + (BASE + chemin).length).split(/\s/)[0];
}

const ecole = (email: string, nom = "École Les Karités") =>
  ecoleSchema.parse({
    nom,
    type: "PRIVE",
    cycles: ["PREMIER_CYCLE"],
    anneeDebut: "2026-10-01",
    anneeFin: "2027-06-30",
    directeurNom: "Coulibaly",
    directeurPrenom: "Fanta",
    directeurEmail: email,
  });

async function nouveauCompte(email: string, actif = true) {
  return prisma.user.create({ data: { email, passwordHash: await bcrypt.hash("ancien-mdp", 4), roles: [], actif } });
}

before(async () => {
  await viderBase();
});

describe("file d'envoi", () => {
  test("le message est depose en attente, au nom de GES Mali", async () => {
    await deposerEmail({ destinataire: "file@ecole.test", objet: "Objet", titre: "Titre", message: "Texte" });
    const [m] = await mails("file@ecole.test");
    assert.deepEqual(
      [m.systeme, m.objet, m.titre, m.message, m.statut],
      [SYSTEME, "Objet", "Titre", "Texte", "EN_ATTENTE"]
    );
  });
});

describe("mise en forme des e-mails", () => {
  test("version texte et version HTML : meme lien, caracteres speciaux echappes", async () => {
    const email = "forme@ecole.test";
    await demanderInscription(ecole(email, "École <Les \"Fromagers\"> & Cie"), "motdepasse8", BASE);
    const [m] = await prisma.$queryRaw<{ message: string; message_html: string | null }[]>`
      SELECT message, message_html FROM mail_sortant WHERE destinataire = ${email}`;
    const lien = BASE + CHEMINS.INSCRIPTION + (await dernierLien(email, CHEMINS.INSCRIPTION));
    assert.ok(m.message.includes("Créer mon école : " + lien), "texte : libelle du bouton et lien");
    assert.ok(m.message_html, "version HTML deposee");
    assert.ok(m.message_html.includes('href="' + lien + '"'), "HTML : lien du bouton");
    assert.ok(m.message_html.includes("&lt;Les &quot;Fromagers&quot;&gt; &amp; Cie"), "HTML : nom de l'ecole echappe");
    assert.ok(!m.message_html.includes("<Les"), "aucune balise venue des donnees");
    assert.match(m.message_html, /<meta name="viewport"/);
  });
});

describe("liens a usage unique", () => {
  test("seule l'empreinte est gardee ; le lien sert une fois", async () => {
    const jeton = await creerJeton("VERIFICATION", "jeton@ecole.test");
    const ligne = await prisma.jetonEmail.findFirstOrThrow({ where: { email: "jeton@ecole.test" } });
    assert.notEqual(ligne.empreinte, jeton);
    assert.match(ligne.empreinte, /^[0-9a-f]{64}$/);
    assert.ok(await lireJeton("VERIFICATION", jeton));
    assert.equal(await lireJeton("REINITIALISATION", jeton), null, "lien d'un autre usage");
    assert.ok(await consommerJeton("VERIFICATION", jeton));
    assert.equal(await consommerJeton("VERIFICATION", jeton), null);
    assert.equal(await lireJeton("VERIFICATION", jeton), null);
  });

  test("un nouveau lien annule le precedent", async () => {
    const ancien = await creerJeton("REINITIALISATION", "deux@ecole.test");
    const nouveau = await creerJeton("REINITIALISATION", "deux@ecole.test");
    assert.equal(await lireJeton("REINITIALISATION", ancien), null);
    assert.ok(await lireJeton("REINITIALISATION", nouveau));
  });

  test("lien expire : 1 heure pour le mot de passe oublie", async () => {
    const il_y_a_2h = new Date(Date.now() - 2 * 3600 * 1000);
    const jeton = await creerJeton("REINITIALISATION", "expire@ecole.test", {}, il_y_a_2h);
    assert.equal(await lireJeton("REINITIALISATION", jeton), null);
    assert.equal(await consommerJeton("REINITIALISATION", jeton), null);
  });

  test("clics simultanes : un seul passe", async () => {
    const jeton = await creerJeton("VERIFICATION", "clics@ecole.test");
    const r = await Promise.all(Array.from({ length: 5 }, () => consommerJeton("VERIFICATION", jeton)));
    assert.equal(r.filter(Boolean).length, 1);
  });
});

describe("inscription confirmee par e-mail", () => {
  const email = "fanta.coulibaly@karites.test";
  let jeton: string;

  test("la demande n'ecrit rien d'autre que le lien et l'e-mail", async () => {
    const ecoles = await prisma.etablissement.count();
    await demanderInscription(ecole(email), "motdepasse8", BASE);
    assert.equal(await prisma.etablissement.count(), ecoles);
    assert.equal(await prisma.user.count({ where: { email } }), 0);
    const [m] = await mails(email);
    assert.match(m.objet, /Confirmez l'inscription/);
    assert.match(m.message, /Fanta/);
    jeton = await dernierLien(email, CHEMINS.INSCRIPTION);
    const ligne = await prisma.jetonEmail.findFirstOrThrow({ where: { email, type: "INSCRIPTION" } });
    assert.ok(!JSON.stringify(ligne.donnees).includes("motdepasse8"), "seule l'empreinte du mot de passe est gardee");
  });

  test("le clic cree l'ecole et le compte, adresse confirmee", async () => {
    const r = await confirmerInscription(jeton);
    const e = await prisma.etablissement.findUniqueOrThrow({ where: { id: r.etablissementId } });
    assert.equal(e.nom, "École Les Karités");
    assert.equal(e.statut, "ESSAI");
    const u = await prisma.user.findUniqueOrThrow({ where: { email }, include: { acces: true } });
    assert.ok(u.emailVerifieLe);
    assert.ok(await bcrypt.compare("motdepasse8", u.passwordHash));
    assert.deepEqual(u.acces.map((a) => [a.etablissementId, a.roles]), [[r.etablissementId, ["DIRECTEUR"]]]);
    const ligne = await prisma.jetonEmail.findFirstOrThrow({ where: { email, type: "INSCRIPTION" } });
    assert.equal(ligne.donnees, null, "empreinte effacee du lien utilise");
  });

  test("le lien ne sert qu'une fois", async () => {
    const ecoles = await prisma.etablissement.count();
    await assert.rejects(confirmerInscription(jeton), /plus valable/);
    assert.equal(await prisma.etablissement.count(), ecoles);
  });

  test("adresse qui a deja un compte : e-mail d'information, aucun lien d'inscription", async () => {
    const liens = await prisma.jetonEmail.count({ where: { email, type: "INSCRIPTION" } });
    await demanderInscription(ecole(email, "École Bis"), "motdepasse8", BASE);
    const m = (await mails(email)).at(-1)!;
    assert.match(m.objet, /existe déjà/);
    assert.ok(m.message.includes(BASE + "/mot-de-passe/oublie"));
    // Le bouton mene a la connexion, puis directement au formulaire de creation d'ecole
    assert.ok(m.message.includes(BASE + "/login?callbackUrl=%2Finscription"));
    assert.equal(await prisma.jetonEmail.count({ where: { email, type: "INSCRIPTION" } }), liens);
  });

  test("compte cree entre la demande et le clic : refus, le lien reste valable", async () => {
    const autre = "entre-temps@karites.test";
    await demanderInscription(ecole(autre, "École Entre-Temps"), "motdepasse8", BASE);
    const lien = await dernierLien(autre, CHEMINS.INSCRIPTION);
    await nouveauCompte(autre);
    await assert.rejects(confirmerInscription(lien), /déjà un compte/);
    assert.ok(await lireJeton("INSCRIPTION", lien));
  });

  test("mot de passe trop court : refus", async () => {
    await assert.rejects(demanderInscription(ecole("court@karites.test"), "court", BASE), /8 caractères/);
  });
});

describe("mot de passe oublie", () => {
  const email = "oubli@ecole.test";
  let userId: string;

  before(async () => {
    userId = (await nouveauCompte(email)).id;
  });

  test("adresse sans compte, ou compte desactive : aucun e-mail", async () => {
    await demanderReinitialisation("inconnu@ecole.test", BASE);
    assert.equal((await mails("inconnu@ecole.test")).length, 0);
    await nouveauCompte("inactif@ecole.test", false);
    await demanderReinitialisation("inactif@ecole.test", BASE);
    assert.equal((await mails("inactif@ecole.test")).length, 0);
  });

  test("le lien permet de choisir un nouveau mot de passe, une seule fois", async () => {
    for (let i = 0; i < MAX_ECHECS.email; i++) await noterEchec(email, null);
    assert.equal(await connexionBloquee(email, null), true);
    const connecteAvant = Date.now() - 1000;

    await demanderReinitialisation(email, BASE);
    const jeton = await dernierLien(email, CHEMINS.REINITIALISATION);

    // Confirmation differente : refus, sans consommer le lien
    await assert.rejects(reinitialiserParLien(jeton, "nouveau-mdp", "autre-mdp"), /confirmation/);
    await reinitialiserParLien(jeton, "nouveau-mdp", "nouveau-mdp");

    const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    assert.ok(await bcrypt.compare("nouveau-mdp", u.passwordHash));
    assert.ok(u.emailVerifieLe, "adresse confirmee par le lien");
    assert.equal(await connexionBloquee(email, null), false, "blocage leve");
    // Sessions ouvertes avant le changement : fermees
    assert.equal(sessionValable(u, connecteAvant), false);
    assert.equal(sessionValable(u, Date.now()), true);
    assert.equal(sessionValable({ motDePasseModifieLe: null }, undefined), true);

    await assert.rejects(reinitialiserParLien(jeton, "encore-un", "encore-un"), /plus valable/);
  });
});

describe("confirmation d'adresse", () => {
  test("le lien confirme l'adresse du compte", async () => {
    const u = await nouveauCompte("confirmer@ecole.test");
    await demanderVerification(u, BASE);
    await verifierAdresse(await dernierLien(u.email, CHEMINS.VERIFICATION));
    assert.ok((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).emailVerifieLe);
  });

  test("adresse du compte changee entre-temps : refus", async () => {
    const u = await nouveauCompte("ancienne@ecole.test");
    await demanderVerification(u, BASE);
    const jeton = await dernierLien(u.email, CHEMINS.VERIFICATION);
    await prisma.user.update({ where: { id: u.id }, data: { email: "nouvelle@ecole.test" } });
    await assert.rejects(verifierAdresse(jeton), /plus valable/);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).emailVerifieLe, null);
  });
});

describe("limites d'envoi", () => {
  test("3 par heure pour une adresse, 10 par heure depuis une IP", async () => {
    const t = new Date("2031-05-01T08:00:00Z");
    for (let i = 0; i < MAX_ENVOIS.email; i++) assert.equal(await envoiAutorise("10.0.0.1", "limite@ecole.test", t), true);
    assert.equal(await envoiAutorise("10.0.0.1", "limite@ecole.test", t), false);
    // Une heure plus tard : de nouveau possible
    assert.equal(await envoiAutorise("10.0.0.2", "limite@ecole.test", new Date(t.getTime() + 3600 * 1000 + 1)), true);

    let acceptes = MAX_ENVOIS.email;
    for (let i = 0; acceptes < MAX_ENVOIS.ip; i++) {
      if (await envoiAutorise("10.0.0.1", "autre" + i + "@ecole.test", t)) acceptes++;
    }
    assert.equal(await envoiAutorise("10.0.0.1", "encore@ecole.test", t), false);
  });
});
