// Transferts entre caisses : l'argent change de caisse, le total de l'ecole ne bouge pas,
// et ce n'est ni une recette ni une depense dans le rapport financier.

import { before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/db";
import { enregistrerTransfert, journal, soldesCaisses, type CaisseT } from "@/lib/tresorerie/tresorerie";
import { rapportFinancier } from "@/lib/tresorerie/rapport";
import { creerEcole, viderBase, type Ecole } from "./donnees";

let a: Ecole;
let b: Ecole;

const soldes = async (e: Ecole) =>
  Object.fromEntries((await soldesCaisses(e.etablissementId)).map((s) => [s.caisse, s.solde])) as Record<CaisseT, number>;
const total = (s: Record<CaisseT, number>) => s.ESPECES + s.BANQUE + s.MOBILE_MONEY;

before(async () => {
  await viderBase();
  a = await creerEcole("Ecole A");
  b = await creerEcole("Ecole B");
  // Fonds de depart en especes pour l'ecole A
  await prisma.mouvementTresorerie.create({
    data: {
      etablissementId: a.etablissementId, type: "APPORT_CAPITAL", caisse: "ESPECES", date: new Date("2026-10-01"),
      montant: 300000, libelle: "Fonds de depart", saisieParId: a.ids.User,
    },
  });
});

describe("transferts entre caisses", () => {
  let transfertId: string;

  test("depot des especes a la banque : une caisse baisse, l'autre monte, le total ne change pas", async () => {
    const avant = await soldes(a);
    const autre = await soldes(b);
    const m = await enregistrerTransfert(a.etablissementId, {
      de: "ESPECES", vers: "BANQUE", montant: 120000, date: new Date("2026-10-12"), reference: "BORD-17", saisieParId: a.ids.User,
    });
    transfertId = m.id;
    assert.equal(m.libelle, "Transfert Espèces → Banque");
    const apres = await soldes(a);
    assert.equal(apres.ESPECES, avant.ESPECES - 120000);
    assert.equal(apres.BANQUE, avant.BANQUE + 120000);
    assert.equal(apres.MOBILE_MONEY, avant.MOBILE_MONEY);
    assert.equal(total(apres), total(avant));
    assert.deepEqual(await soldes(b), autre, "l'autre ecole n'est pas touchee");

    const detail = (await soldesCaisses(a.etablissementId)).find((s) => s.caisse === "BANQUE")!;
    assert.equal(detail.transfertsRecus, 120000);
  });

  test("journal : une ligne de transfert, ni entree ni sortie", async () => {
    const lignes = await journal(a.etablissementId, new Date("2026-10-01"), new Date("2026-11-01"));
    const l = lignes.find((x) => x.mouvementId === transfertId)!;
    assert.deepEqual([l.caisse, l.caisseDestination, l.transfert, l.entree, l.sortie], ["ESPECES", "BANQUE", 120000, 0, 0]);
    assert.equal(l.reference, "BORD-17");
  });

  test("rapport financier : ni recette ni charge, soldes de fin a jour", async () => {
    const periode = [new Date("2026-10-01"), new Date("2026-11-01")] as const;
    const r = await rapportFinancier(a.etablissementId, ...periode);
    // Meme rapport sans le transfert (annule le temps du calcul)
    await prisma.mouvementTresorerie.update({ where: { id: transfertId }, data: { annule: true } });
    const sansTransfert = await rapportFinancier(a.etablissementId, ...periode);
    await prisma.mouvementTresorerie.update({ where: { id: transfertId }, data: { annule: false } });
    assert.equal(r.totalRecettes, sansTransfert.totalRecettes);
    assert.equal(r.totalCharges, sansTransfert.totalCharges);
    assert.equal(r.apports, sansTransfert.apports);
  });

  test("solde insuffisant : refus, sauf derogation avec motif", async () => {
    const s = await soldes(a);
    const trop = s.MOBILE_MONEY + 50000;
    await assert.rejects(
      enregistrerTransfert(a.etablissementId, { de: "MOBILE_MONEY", vers: "ESPECES", montant: trop, date: new Date("2026-10-13"), saisieParId: a.ids.User }),
      /^Error: Solde insuffisant en caisse Mobile Money/
    );
    await assert.rejects(
      enregistrerTransfert(a.etablissementId, {
        de: "MOBILE_MONEY", vers: "ESPECES", montant: trop, date: new Date("2026-10-13"), motifDerogation: "ok", saisieParId: a.ids.User,
      }),
      /Motif de dérogation/
    );
    const m = await enregistrerTransfert(a.etablissementId, {
      de: "MOBILE_MONEY", vers: "ESPECES", montant: trop, date: new Date("2026-10-13"),
      motifDerogation: "Recharge attendue demain", saisieParId: a.ids.User,
    });
    assert.equal(m.derogation, true);
    await prisma.mouvementTresorerie.update({ where: { id: m.id }, data: { annule: true, motifAnnulation: "test" } });
  });

  test("meme caisse, montant invalide : refus", async () => {
    const base = { date: new Date("2026-10-14"), saisieParId: a.ids.User };
    await assert.rejects(enregistrerTransfert(a.etablissementId, { ...base, de: "BANQUE", vers: "BANQUE", montant: 1000 }), /deux caisses différentes/);
    await assert.rejects(enregistrerTransfert(a.etablissementId, { ...base, de: "BANQUE", vers: "ESPECES", montant: 0 }), /Montant invalide/);
  });

  test("transfert annule : les deux caisses reviennent a leur solde", async () => {
    const avant = await soldes(a);
    await prisma.mouvementTresorerie.update({ where: { id: transfertId }, data: { annule: true, motifAnnulation: "erreur de saisie" } });
    const apres = await soldes(a);
    assert.equal(apres.ESPECES, avant.ESPECES + 120000);
    assert.equal(apres.BANQUE, avant.BANQUE - 120000);
  });

  test("la base refuse un transfert sans caisse d'arrivee, ou vers la meme caisse", async () => {
    const data = { etablissementId: a.etablissementId, type: "TRANSFERT" as const, caisse: "ESPECES" as const, date: new Date(), montant: 1, libelle: "x", saisieParId: a.ids.User };
    await assert.rejects(prisma.mouvementTresorerie.create({ data }));
    await assert.rejects(prisma.mouvementTresorerie.create({ data: { ...data, caisseDestination: "ESPECES" } }));
    // Une depense n'a pas de caisse d'arrivee
    await assert.rejects(prisma.mouvementTresorerie.create({ data: { ...data, type: "DEPENSE", caisseDestination: "BANQUE" } }));
  });
});
