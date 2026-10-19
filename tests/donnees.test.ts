import { before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/db";
import { creerEcole, viderBase, type Ecole } from "./donnees";

let a: Ecole;
let b: Ecole;

before(async () => {
  await viderBase();
  a = await creerEcole("Ecole A");
  b = await creerEcole("Ecole B");
});

test("les deux ecoles fictives ont une ligne dans chaque table", async () => {
  for (const ecole of [a, b]) {
    for (const [modele, id] of Object.entries(ecole.ids)) {
      const delegue = (prisma as unknown as Record<string, { findUnique: (a: object) => Promise<unknown> }>)[
        modele.charAt(0).toLowerCase() + modele.slice(1)
      ];
      assert.ok(await delegue.findUnique({ where: { id } }), modele + " manquant");
    }
  }
});

test("la base de test accepte des requetes en parallele", async () => {
  const comptes = await Promise.all(Array.from({ length: 10 }, () => prisma.eleve.count()));
  assert.deepEqual(comptes, Array(10).fill(2));
});
