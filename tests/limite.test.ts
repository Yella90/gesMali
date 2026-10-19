// Blocage des connexions echouees : compteurs en base, par e-mail et par adresse IP.

import { before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/db";
import { adresseIp, connexionBloquee, effacerEchecs, MAX_ECHECS, noterEchec } from "@/lib/auth/limite";
import { viderBase } from "./donnees";

const t0 = new Date("2026-10-19T10:00:00Z");
const plus = (minutes: number) => new Date(t0.getTime() + minutes * 60 * 1000);

before(async () => {
  await viderBase();
});

test("5 echecs sur un meme e-mail bloquent ce compte, pas les autres", async () => {
  for (let i = 0; i < MAX_ECHECS.email - 1; i++) await noterEchec("Awa@Ecole.ml ", "10.0.0.1", plus(i));
  assert.equal(await connexionBloquee("awa@ecole.ml", "10.0.0.9", plus(5)), false);
  await noterEchec("awa@ecole.ml", "10.0.0.1", plus(5));
  assert.equal(await connexionBloquee("awa@ecole.ml", "10.0.0.9", plus(6)), true);
  assert.equal(await connexionBloquee("moussa@ecole.ml", "10.0.0.9", plus(6)), false);
});

test("le blocage tombe apres 15 minutes, et le compteur repart de 1", async () => {
  assert.equal(await connexionBloquee("awa@ecole.ml", null, plus(21)), false);
  await noterEchec("awa@ecole.ml", null, plus(21));
  const ligne = await prisma.echecConnexion.findUniqueOrThrow({ where: { cle: "email:awa@ecole.ml" } });
  assert.equal(ligne.nombre, 1);
});

test("50 echecs depuis une meme adresse la bloquent, quel que soit le compte", async () => {
  for (let i = 0; i < MAX_ECHECS.ip - 1; i++) await noterEchec("compte" + i + "@ecole.ml", "41.73.0.5", plus(30));
  assert.equal(await connexionBloquee("nouveau@ecole.ml", "41.73.0.5", plus(31)), false);
  await noterEchec("compte49@ecole.ml", "41.73.0.5", plus(31));
  assert.equal(await connexionBloquee("nouveau@ecole.ml", "41.73.0.5", plus(32)), true);
  assert.equal(await connexionBloquee("nouveau@ecole.ml", "41.73.0.6", plus(32)), false);
});

test("une connexion reussie efface le compteur du compte, pas celui de l'adresse", async () => {
  await noterEchec("fanta@ecole.ml", "41.73.0.5", plus(33));
  await effacerEchecs("Fanta@ecole.ml");
  assert.equal(await prisma.echecConnexion.count({ where: { cle: "email:fanta@ecole.ml" } }), 0);
  assert.ok(await prisma.echecConnexion.findUnique({ where: { cle: "ip:41.73.0.5" } }));
});

test("echecs simultanes : aucun n'est perdu", async () => {
  await Promise.all(Array.from({ length: 10 }, () => noterEchec("simultane@ecole.ml", null, plus(40))));
  const ligne = await prisma.echecConnexion.findUniqueOrThrow({ where: { cle: "email:simultane@ecole.ml" } });
  assert.equal(ligne.nombre, 10);
});

test("les lignes de plus d'un jour sont supprimees", async () => {
  await noterEchec("recent@ecole.ml", null, plus(60 * 26));
  assert.equal(await prisma.echecConnexion.count({ where: { depuis: { lt: plus(60 * 2) } } }), 0);
});

test("adresse IP lue dans les en-tetes de l'hebergeur", () => {
  assert.equal(adresseIp(new Headers({ "x-real-ip": "41.73.0.5" })), "41.73.0.5");
  assert.equal(adresseIp(new Headers({ "x-forwarded-for": "41.73.0.7, 10.0.0.1" })), "41.73.0.7");
  assert.equal(adresseIp(new Headers()), null);
});
