// Messages renvoyes au client par les actions serveur : erreurs metier telles quelles,
// erreurs techniques (base, reseau) remplacees par un message neutre.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { capter } from "@/lib/actions/serveur";

const echec = (e: unknown) => capter(async () => { throw e; });

describe("capter", () => {
  test("erreur metier : son message", async () => {
    assert.deepEqual(await echec(new Error("Solde insuffisant en caisse Banque")), { ok: false, erreur: "Solde insuffisant en caisse Banque" });
  });

  test("connexion a la base coupee : message neutre", async () => {
    const neutre = { ok: false, erreur: "Opération impossible pour le moment, réessayez" };
    assert.deepEqual(await echec(new Error("Connection terminated unexpectedly")), neutre);
    assert.deepEqual(await echec(Object.assign(new Error("Erreur du pilote"), { clientVersion: "7.10.1" })), neutre);
    assert.deepEqual(await echec(Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), { code: "ECONNREFUSED" })), neutre);
    assert.deepEqual(await echec(Object.assign(new Error('relation "x" does not exist'), { severity: "ERROR", code: "42P01" })), neutre);
  });

  test("succes : la donnee", async () => {
    assert.deepEqual(await capter(async () => 42), { ok: true, data: 42 });
  });
});
