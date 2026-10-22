// Prets : echeancier, reste du et retard calcules a partir des remboursements,
// remboursements comptes dans les soldes, et rapport financier qui separe fonds propres et prets.

import { before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/db";
import { calculerEcheancier } from "@/lib/tresorerie/echeancier";
import { listerPrets } from "@/lib/tresorerie/prets";
import { soldesCaisses } from "@/lib/tresorerie/tresorerie";
import { rapportFinancier } from "@/lib/tresorerie/rapport";
import { creerEcole, viderBase, type Ecole } from "./donnees";

let a: Ecole;
let b: Ecole;
let pretId: string;

const banque = async (e: Ecole) => (await soldesCaisses(e.etablissementId)).find((s) => s.caisse === "BANQUE")!;

before(async () => {
  await viderBase();
  a = await creerEcole("Ecole A");
  b = await creerEcole("Ecole B");
});

describe("echeancier", () => {
  test("sans interets : parts egales, la derniere solde le capital", () => {
    const e = calculerEcheancier(1000000, 0, 3, new Date(2026, 10, 5));
    assert.deepEqual(e.map((x) => x.montant), [333333, 333333, 333334]);
    assert.equal(e.reduce((s, x) => s + x.capital, 0), 1000000);
    assert.deepEqual(e.map((x) => x.dateEcheance.getMonth()), [10, 11, 0]);
  });

  test("avec interets : mensualites constantes, capital rembourse en entier", () => {
    const e = calculerEcheancier(1200000, 12, 12, new Date(2026, 10, 5));
    assert.equal(e.length, 12);
    assert.equal(e[0].interet, 12000, "1 % du capital restant le premier mois");
    assert.ok(e.slice(0, -1).every((x) => x.montant === e[0].montant));
    assert.equal(Math.round(e.reduce((s, x) => s + x.capital, 0)), 1200000);
    assert.ok(e.reduce((s, x) => s + x.interet, 0) > 0);
  });
});

describe("prets de l'ecole", () => {
  before(async () => {
    // Pret de 300 000 F sur 3 mois sans interets, recu a la banque
    const pret = await prisma.pret.create({
      data: {
        etablissementId: a.etablissementId, preteur: "Banque test 2", montant: 300000, dureeMois: 3,
        dateObtention: new Date("2026-09-01"), premiereEcheance: new Date("2026-09-15"), saisieParId: a.ids.User,
        echeances: { create: calculerEcheancier(300000, 0, 3, new Date("2026-09-15")) },
      },
    });
    pretId = pret.id;
    await prisma.mouvementTresorerie.create({
      data: {
        etablissementId: a.etablissementId, type: "APPORT_CAPITAL", origineApport: "PRET", pretId, caisse: "BANQUE",
        date: new Date("2026-09-01"), montant: 300000, libelle: "Prêt de Banque test 2", saisieParId: a.ids.User,
      },
    });
    await prisma.mouvementTresorerie.create({
      data: {
        etablissementId: a.etablissementId, type: "APPORT_CAPITAL", origineApport: "FONDS_PROPRES", caisse: "BANQUE",
        date: new Date("2026-09-02"), montant: 50000, libelle: "Apport du promoteur", saisieParId: a.ids.User,
      },
    });
  });

  test("sans remboursement : tout reste du, les echeances passees sont en retard", async () => {
    const p = (await listerPrets(a.etablissementId, new Date("2026-10-20"))).find((x) => x.id === pretId)!;
    assert.equal(p.resteDu, 300000);
    assert.equal(p.enRetard, 200000, "echeances du 15/09 et du 15/10");
    assert.deepEqual(p.echeances.map((e) => e.statut), ["en_retard", "en_retard", "a_venir"]);
    assert.equal(p.prochaine?.montant, 100000);
    assert.equal(p.apportId !== null, true);
  });

  test("remboursement : couvre les echeances dans l'ordre et sort de la caisse", async () => {
    const avant = await banque(a);
    await prisma.mouvementTresorerie.create({
      data: {
        etablissementId: a.etablissementId, type: "REMBOURSEMENT_PRET", pretId, caisse: "BANQUE",
        date: new Date("2026-10-16"), montant: 150000, libelle: "Remboursement", saisieParId: a.ids.User,
      },
    });
    const p = (await listerPrets(a.etablissementId, new Date("2026-10-20"))).find((x) => x.id === pretId)!;
    assert.equal(p.rembourse, 150000);
    assert.equal(p.resteDu, 150000);
    assert.equal(p.enRetard, 50000);
    assert.deepEqual(p.echeances.map((e) => [e.statut, e.paye]), [["payee", 100000], ["en_retard", 50000], ["a_venir", 0]]);
    const apres = await banque(a);
    assert.equal(apres.remboursements, avant.remboursements + 150000);
    assert.equal(apres.solde, avant.solde - 150000);
  });

  test("rapport financier : fonds propres, prets recus et remboursements separes", async () => {
    const r = await rapportFinancier(a.etablissementId, new Date("2026-09-01"), new Date("2026-11-01"));
    assert.equal(r.apports, 50000, "le pret n'est pas compte en fonds propres");
    assert.equal(r.pretsRecus, 300000);
    assert.equal(r.remboursements, 150000);
    assert.ok(!r.charges.some((c) => /pr[eê]t/i.test(c.libelle)), "un remboursement n'est pas une charge");
  });

  test("les prets d'une ecole ne sont pas visibles depuis une autre", async () => {
    assert.equal((await listerPrets(b.etablissementId)).some((p) => p.id === pretId), false);
  });
});
