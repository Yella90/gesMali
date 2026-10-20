// Creation d'ecoles (inscription en ligne, administration) et statut des ecoles.

import { before, describe, test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ecole } from "@/lib/data/ecole";
import { creerEcole, ecoleSchema, MATIERES_PAR_CYCLE, trimestresDe, type DonneesEcole } from "@/lib/plateforme/creation";
import { changerStatutEcole, supprimerEcole } from "@/lib/plateforme/admin";
import { inscriptionAutorisee, MAX_INSCRIPTIONS_PAR_JOUR, noterInscription } from "@/lib/auth/limite";
import { creerEcole as creerEcoleTest, viderBase, type Ecole } from "./donnees";

let a: Ecole;

const donnees = (o: Partial<Record<string, unknown>> = {}): DonneesEcole =>
  ecoleSchema.parse({
    nom: "École Les Baobabs",
    type: "PRIVE",
    adresse: "Kalaban Coura, Bamako",
    telephone: "+223 70 00 00 00",
    cycles: ["PREMIER_CYCLE", "SECOND_CYCLE"],
    anneeDebut: "2026-10-01",
    anneeFin: "2027-06-30",
    directeurNom: "Keita",
    directeurPrenom: "Mariam",
    directeurEmail: "Mariam.Keita@Baobabs.ml",
    ...o,
  });

before(async () => {
  await viderBase();
  a = await creerEcoleTest("Ecole A");
});

describe("creation d'une ecole", () => {
  let etablissementId: string;
  let userId: string;

  test("ecole prete a l'emploi, en essai, avec le compte de son directeur", async () => {
    const r = await creerEcole(donnees(), { statut: "ESSAI", motDePasse: "motdepasse8" });
    etablissementId = r.etablissementId;
    userId = r.userId;
    assert.equal(r.compteExistant, false);

    const e = await prisma.etablissement.findUniqueOrThrow({
      where: { id: etablissementId },
      include: { parametres: true, anneesScolaires: { include: { trimestres: { orderBy: { ordre: "asc" } } } }, matieres: true },
    });
    assert.equal(e.statut, "ESSAI");
    const jours = Math.round((e.finEssai!.getTime() - Date.now()) / 86400000);
    assert.ok(jours >= 29 && jours <= 30, "essai de 30 jours");
    assert.ok(e.parametres);
    assert.equal(e.anneesScolaires.length, 1);
    assert.equal(e.anneesScolaires[0].libelle, "2026-2027");
    assert.equal(e.anneesScolaires[0].active, true);
    assert.deepEqual(
      e.anneesScolaires[0].trimestres.map((t) => [t.nom, t.dateDebut.toISOString().slice(0, 10)]),
      [["Trimestre 1", "2026-10-01"], ["Trimestre 2", "2027-01-05"], ["Trimestre 3", "2027-04-06"]]
    );
    assert.equal(e.matieres.length, MATIERES_PAR_CYCLE.PREMIER_CYCLE.length + MATIERES_PAR_CYCLE.SECOND_CYCLE.length);

    const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { acces: { include: { employe: true } } } });
    assert.equal(u.email, "mariam.keita@baobabs.ml");
    assert.ok(await bcrypt.compare("motdepasse8", u.passwordHash));
    assert.equal(u.acces.length, 1);
    assert.deepEqual(u.acces[0].roles, ["DIRECTEUR"]);
    assert.equal(u.acces[0].employe.poste, "Directeur");
    assert.equal(await prisma.auditLog.count({ where: { etablissementId, action: "CREATE_ETABLISSEMENT" } }), 1);
  });

  test("les donnees de la nouvelle ecole restent dans son perimetre", async () => {
    assert.equal(await ecole(a.etablissementId).matiere.count({ where: { etablissementId } }), 0);
    assert.ok((await ecole(etablissementId).matiere.count()) > 0);
    assert.equal(await ecole(etablissementId).classe.count(), 0);
  });

  test("compte existant a l'adresse non confirmee : refuse, sauf pour le compte qui cree l'ecole", async () => {
    const avant = await prisma.etablissement.count();
    await assert.rejects(
      creerEcole(donnees({ nom: "École Usurpée", directeurEmail: "mariam.keita@baobabs.ml" }), { statut: "ACTIF", motDePasse: null }),
      /pas encore confirmée/
    );
    assert.equal(await prisma.etablissement.count(), avant);
    // Le titulaire connecte cree sa propre ecole (inscription depuis « Mes ecoles »)
    const r = await creerEcole(donnees({ nom: "École Seconde", directeurEmail: "mariam.keita@baobabs.ml" }), { statut: "ESSAI", parUserId: userId });
    assert.deepEqual([r.userId, r.compteExistant], [userId, true]);
  });

  test("un compte existant (adresse confirmee) devient directeur de la nouvelle ecole et garde son mot de passe", async () => {
    await prisma.user.update({ where: { id: userId }, data: { emailVerifieLe: new Date() } });
    const r = await creerEcole(donnees({ nom: "École Les Fromagers", directeurEmail: "mariam.keita@baobabs.ml" }), {
      statut: "ACTIF",
      motDePasse: null,
    });
    assert.deepEqual([r.userId, r.compteExistant], [userId, true]);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { acces: true } });
    assert.equal(u.acces.length, 3);
    assert.ok(await bcrypt.compare("motdepasse8", u.passwordHash));
  });

  test("nouveau compte sans mot de passe valable : rien n'est cree", async () => {
    const avant = await prisma.etablissement.count();
    await assert.rejects(
      creerEcole(donnees({ nom: "École Sans Mot", directeurEmail: "nouveau@ecole.ml" }), { statut: "ESSAI", motDePasse: "court" }),
      /8 caractères/
    );
    assert.equal(await prisma.etablissement.count(), avant);
  });

  test("formulaire invalide : messages en francais", () => {
    assert.throws(() => donnees({ cycles: [] }), /au moins un cycle/);
    assert.throws(() => donnees({ anneeFin: "2026-09-01" }), /après la rentrée/);
    assert.throws(() => donnees({ directeurEmail: "pas-un-email" }), /E-mail du directeur/);
  });

  test("annee hors calendrier malien : trois parts egales", () => {
    const t = trimestresDe(new Date("2027-01-10"), new Date("2027-12-10"));
    assert.equal(t.length, 3);
    assert.equal(t[0].dateDebut.toISOString().slice(0, 10), "2027-01-10");
    assert.equal(t[2].dateFin?.toISOString().slice(0, 10), "2027-12-10");
  });

  describe("statut d'une ecole", () => {
    test("suspendre, reactiver (retour a l'essai), prolonger, activer", async () => {
      const avant = await prisma.etablissement.findUniqueOrThrow({ where: { id: etablissementId } });
      assert.equal((await changerStatutEcole(etablissementId, "suspendre", userId)).statut, "SUSPENDU");
      assert.equal((await changerStatutEcole(etablissementId, "reactiver", userId)).statut, "ESSAI");
      const prolonge = await changerStatutEcole(etablissementId, "prolonger", userId);
      assert.equal(Math.round((prolonge.finEssai!.getTime() - avant.finEssai!.getTime()) / 86400000), 30);
      const active = await changerStatutEcole(etablissementId, "activer", userId);
      assert.deepEqual([active.statut, active.finEssai], ["ACTIF", null]);
      assert.equal(await prisma.auditLog.count({ where: { etablissementId, action: { startsWith: "PLATEFORME_" } } }), 4);
    });
  });
});

describe("inscriptions limitees par adresse IP", () => {
  test(MAX_INSCRIPTIONS_PAR_JOUR + " par jour, puis refus jusqu'au lendemain", async () => {
    const t0 = new Date("2026-10-20T08:00:00Z");
    for (let i = 0; i < MAX_INSCRIPTIONS_PAR_JOUR; i++) {
      assert.equal(await inscriptionAutorisee("41.0.0.1", t0), true);
      await noterInscription("41.0.0.1", t0);
    }
    assert.equal(await inscriptionAutorisee("41.0.0.1", t0), false);
    assert.equal(await inscriptionAutorisee("41.0.0.2", t0), true);
    assert.equal(await inscriptionAutorisee("41.0.0.1", new Date("2026-10-21T09:00:00Z")), true);
  });
});

describe("suppression d'une ecole vide", () => {
  test("nom mal retape : rien n'est supprime", async () => {
    const r = await creerEcole(donnees({ nom: "École Erreur", directeurEmail: "erreur@vide.test" }), { statut: "ESSAI", motDePasse: "motdepasse8" });
    await assert.rejects(supprimerEcole(r.etablissementId, a.ids.User, "Ecole Erreur"), /ne correspond pas/);
    assert.ok(await prisma.etablissement.findUnique({ where: { id: r.etablissementId } }));
  });

  test("ecole creee par erreur : tout est efface, compte sans autre usage compris", async () => {
    const r = await creerEcole(donnees({ nom: "École En Double", directeurEmail: "double@vide.test" }), { statut: "ESSAI", motDePasse: "motdepasse8" });
    const res = await supprimerEcole(r.etablissementId, a.ids.User, " École En Double ");
    assert.deepEqual(res.comptesSupprimes, ["double@vide.test"]);
    assert.equal(await prisma.etablissement.findUnique({ where: { id: r.etablissementId } }), null);
    assert.equal(await prisma.user.count({ where: { email: "double@vide.test" } }), 0);
    for (const n of await Promise.all([
      prisma.employe.count({ where: { etablissementId: r.etablissementId } }),
      prisma.matiere.count({ where: { etablissementId: r.etablissementId } }),
      prisma.anneeScolaire.count({ where: { etablissementId: r.etablissementId } }),
      prisma.acces.count({ where: { etablissementId: r.etablissementId } }),
    ])) {
      assert.equal(n, 0);
    }
    const journal = await prisma.auditLog.findFirstOrThrow({ where: { action: "PLATEFORME_SUPPRIMER", entiteId: r.etablissementId } });
    assert.deepEqual([journal.etablissementId, journal.userId], [null, a.ids.User]);
  });

  test("compte qui sert dans une autre ecole : garde, sans l'acces supprime", async () => {
    const vide = await creerEcole(donnees({ nom: "École Vide", directeurEmail: "partage@vide.test" }), { statut: "ESSAI", motDePasse: "motdepasse8" });
    await prisma.user.update({ where: { id: vide.userId }, data: { emailVerifieLe: new Date() } });
    const autre = await creerEcole(donnees({ nom: "École Gardée", directeurEmail: "partage@vide.test" }), { statut: "ESSAI" });
    const res = await supprimerEcole(vide.etablissementId, a.ids.User, "École Vide");
    assert.deepEqual(res.comptesSupprimes, []);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: vide.userId }, include: { acces: true } });
    assert.deepEqual(u.acces.map((x) => x.etablissementId), [autre.etablissementId]);
    assert.deepEqual([u.etablissementId, u.employeId], [null, null], "plus d'ecole ni de fiche d'origine supprimee");
  });

  test("ecole avec des donnees : refus, a suspendre", async () => {
    await assert.rejects(supprimerEcole(a.etablissementId, a.ids.User, "Ecole A"), /contient des données \(.*élèves/);
    assert.ok(await prisma.etablissement.findUnique({ where: { id: a.etablissementId } }));
  });
});
