// Comptes multi-ecoles : un meme compte (e-mail) peut travailler dans plusieurs ecoles.

import { before, describe, test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ecole } from "@/lib/data/ecole";
import { accesUtilisable, chargerCompte, choisirAcces, creerCompteAdministrateur, ouvrirAcces, reinitialiserMotDePasse, retirerAcces } from "@/lib/auth/comptes";
import { etatEcole, finEssaiDans } from "@/lib/plateforme/etat";
import { creerEcole, viderBase, type Ecole } from "./donnees";

let a: Ecole;
let b: Ecole;
let c: Ecole;
const maintenant = new Date("2026-10-20T10:00:00Z");

async function nouvelEmploye(e: Ecole, nom: string) {
  return prisma.employe.create({ data: { etablissementId: e.etablissementId, nom, prenom: "Test", poste: "Enseignant" } });
}

before(async () => {
  await viderBase();
  a = await creerEcole("Ecole A");
  b = await creerEcole("Ecole B");
  c = await creerEcole("Ecole C");
});

describe("etat d'une ecole", () => {
  test("active, en essai, essai termine, suspendue", () => {
    assert.deepEqual(etatEcole({ statut: "ACTIF", finEssai: null }, maintenant), { ouverte: true, libelle: "Active", joursEssai: null });
    const essai = etatEcole({ statut: "ESSAI", finEssai: finEssaiDans(12, maintenant) }, maintenant);
    assert.equal(essai.ouverte, true);
    assert.equal(essai.joursEssai, 12);
    assert.equal(etatEcole({ statut: "ESSAI", finEssai: finEssaiDans(-1, maintenant) }, maintenant).ouverte, false);
    assert.equal(etatEcole({ statut: "SUSPENDU", finEssai: null }, maintenant).ouverte, false);
  });
});

describe("un compte dans plusieurs ecoles", () => {
  let userId: string;

  test("e-mail nouveau : compte cree avec son mot de passe", async () => {
    const employe = await nouvelEmploye(a, "Traore");
    const r = await ouvrirAcces({ etablissementId: a.etablissementId, employeId: employe.id, email: " Awa.Traore@Ecole.ml ", motDePasse: "secret1", role: "ENSEIGNANT" });
    assert.equal(r.compteExistant, false);
    userId = r.userId;
    const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    assert.equal(u.email, "awa.traore@ecole.ml");
    assert.ok(await bcrypt.compare("secret1", u.passwordHash));
  });

  test("adresse non confirmee : le compte n'est pas rattache a une autre ecole", async () => {
    const employe = await nouvelEmploye(b, "Usurpation");
    await assert.rejects(
      ouvrirAcces({ etablissementId: b.etablissementId, employeId: employe.id, email: "awa.traore@ecole.ml", motDePasse: null, role: "DIRECTEUR" }),
      /pas encore confirmée/
    );
    assert.equal(await prisma.acces.count({ where: { userId } }), 1);
    await prisma.employe.delete({ where: { id: employe.id } });
  });

  test("meme e-mail (confirme) dans une autre ecole : le compte recoit l'acces et garde son mot de passe", async () => {
    await prisma.user.update({ where: { id: userId }, data: { emailVerifieLe: maintenant } });
    const employe = await nouvelEmploye(b, "Traore");
    const r = await ouvrirAcces({ etablissementId: b.etablissementId, employeId: employe.id, email: "awa.traore@ecole.ml", motDePasse: null, role: "DIRECTEUR" });
    assert.deepEqual(r, { userId, compteExistant: true });
    const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { acces: true } });
    assert.ok(await bcrypt.compare("secret1", u.passwordHash));
    assert.equal(u.acces.length, 2);
    assert.deepEqual(u.acces.find((x) => x.etablissementId === b.etablissementId)?.roles, ["DIRECTEUR"]);
  });

  test("un second acces a la meme ecole est refuse", async () => {
    const employe = await nouvelEmploye(b, "Doublon");
    await assert.rejects(
      ouvrirAcces({ etablissementId: b.etablissementId, employeId: employe.id, email: "awa.traore@ecole.ml", motDePasse: null, role: "ENSEIGNANT" }),
      /déjà accès/
    );
  });

  test("le compte est visible dans ses deux ecoles, pas ailleurs", async () => {
    assert.ok(await ecole(a.etablissementId).user.findUnique({ where: { id: userId } }));
    assert.ok(await ecole(b.etablissementId).user.findUnique({ where: { id: userId } }));
    assert.equal(await ecole(c.etablissementId).user.findUnique({ where: { id: userId } }), null);
  });

  test("ecole courante : a choisir entre deux, sinon celle choisie", async () => {
    const compte = (await chargerCompte({ id: userId }))!;
    assert.equal(choisirAcces(compte.acces, undefined, maintenant), null);
    assert.equal(choisirAcces(compte.acces, b.etablissementId, maintenant)?.etablissementId, b.etablissementId);
    assert.equal(choisirAcces(compte.acces, c.etablissementId, maintenant), null);
  });

  test("ecole suspendue : plus utilisable, l'autre devient l'ecole courante", async () => {
    await prisma.etablissement.update({ where: { id: a.etablissementId }, data: { statut: "SUSPENDU" } });
    const compte = (await chargerCompte({ id: userId }))!;
    assert.equal(compte.acces.filter((x) => accesUtilisable(x, maintenant)).length, 1);
    assert.equal(choisirAcces(compte.acces, a.etablissementId, maintenant)?.etablissementId, b.etablissementId);
    await prisma.etablissement.update({ where: { id: a.etablissementId }, data: { statut: "ACTIF" } });
  });

  test("la direction ne peut pas changer le mot de passe d'un compte partage", async () => {
    const acces = await prisma.acces.findFirstOrThrow({ where: { userId, etablissementId: b.etablissementId } });
    await assert.rejects(reinitialiserMotDePasse(b.etablissementId, acces.employeId, "nouveau1"), /autre école/);
  });

  test("retirer l'acces d'une ecole garde le compte pour l'autre", async () => {
    const acces = await prisma.acces.findFirstOrThrow({ where: { userId, etablissementId: b.etablissementId } });
    const r = await retirerAcces(b.etablissementId, acces.employeId);
    assert.equal(r.compteSupprime, false);
    assert.equal(await prisma.acces.count({ where: { userId } }), 1);
  });

  test("compte d'une seule ecole : mot de passe reinitialisable, puis compte supprime avec son dernier acces", async () => {
    const acces = await prisma.acces.findFirstOrThrow({ where: { userId, etablissementId: a.etablissementId } });
    await reinitialiserMotDePasse(a.etablissementId, acces.employeId, "nouveau1");
    assert.ok(await bcrypt.compare("nouveau1", (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).passwordHash));
    const r = await retirerAcces(a.etablissementId, acces.employeId);
    assert.equal(r.compteSupprime, true);
    assert.equal(await prisma.user.count({ where: { id: userId } }), 0);
  });

  test("une ecole ne peut pas retirer l'acces d'une autre", async () => {
    await assert.rejects(retirerAcces(b.etablissementId, a.user.employeId), /Aucun compte/);
  });
});

describe("administrateur de la plateforme sans ecole", () => {
  test("compte cree sans fiche ni ecole, avec un mot de passe genere", async () => {
    const r = await creerCompteAdministrateur(" Admin@Plateforme.ml ");
    assert.equal(r.cree, true);
    assert.ok(r.motDePasse && r.motDePasse.length >= 12);
    const u = (await chargerCompte({ email: "admin@plateforme.ml" }))!;
    assert.deepEqual([u.employeId, u.etablissementId, u.acces.length], [null, null, 0]);
    assert.ok(await bcrypt.compare(r.motDePasse!, u.passwordHash));
  });

  test("compte existant : rien ne change, sauf demande de reinitialisation", async () => {
    const avant = (await prisma.user.findUniqueOrThrow({ where: { email: "admin@plateforme.ml" } })).passwordHash;
    assert.deepEqual(await creerCompteAdministrateur("admin@plateforme.ml"), { email: "admin@plateforme.ml", motDePasse: null, cree: false });
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { email: "admin@plateforme.ml" } })).passwordHash, avant);
    const r = await creerCompteAdministrateur("admin@plateforme.ml", { reinitialiser: true });
    const u = await prisma.user.findUniqueOrThrow({ where: { email: "admin@plateforme.ml" } });
    assert.ok(await bcrypt.compare(r.motDePasse!, u.passwordHash));
  });

  test("e-mail invalide refuse", async () => {
    await assert.rejects(creerCompteAdministrateur("pas-un-email"), /E-mail invalide/);
  });

  test("invisible dans les ecoles", async () => {
    const u = await prisma.user.findUniqueOrThrow({ where: { email: "admin@plateforme.ml" } });
    assert.equal(await ecole(a.etablissementId).user.findUnique({ where: { id: u.id } }), null);
  });
});

describe("journal d'audit par ecole", () => {
  test("une entree n'est visible que dans son ecole", async () => {
    const entree = await prisma.auditLog.create({
      data: { userId: a.user.id, etablissementId: b.etablissementId, action: "TEST_B", entite: "Test", entiteId: "x" },
    });
    assert.ok(await ecole(b.etablissementId).auditLog.findUnique({ where: { id: entree.id } }));
    assert.equal(await ecole(a.etablissementId).auditLog.findUnique({ where: { id: entree.id } }), null);
  });
});
