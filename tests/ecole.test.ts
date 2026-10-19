// Isolation entre ecoles : le client ecole(A) ne voit ni ne modifie rien de l'ecole B.

import { before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { prisma } from "@/lib/db";
import { ecole, HORS_ECOLE, PORTEE, RELATIONS } from "@/lib/data/ecole";
import { statsImpayes, elevesAvecFrais, listeRappels, periodesEcoulees } from "@/lib/frais/requetes";
import { soldesCaisses, journal, previsionMois } from "@/lib/tresorerie/tresorerie";
import { rapportFinancier } from "@/lib/tresorerie/rapport";
import { financesMensuelles, salairesPrevus } from "@/lib/tableau-de-bord/finances";
import { creerEcole, viderBase, type Ecole } from "./donnees";

type Delegue = Record<string, (args?: object) => Promise<unknown>>;
const delegue = (client: object, modele: string) =>
  (client as Record<string, Delegue>)[modele.charAt(0).toLowerCase() + modele.slice(1)];

let a: Ecole;
let b: Ecole;

before(async () => {
  await viderBase();
  a = await creerEcole("Ecole A");
  b = await creerEcole("Ecole B");
});

// Modeles et relations lus dans prisma/schema.prisma
function schema() {
  const texte = readFileSync("prisma/schema.prisma", "utf8");
  const modeles = [...texte.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)].map(([, nom, corps]) => ({ nom, corps }));
  const noms = new Set(modeles.map((m) => m.nom));
  const relations: Record<string, Record<string, { modele: string; cle?: string }>> = {};
  for (const { nom, corps } of modeles) {
    for (const ligne of corps.split("\n")) {
      const m = ligne.trim().match(/^(\w+)\s+(\w+)(\[\])?\??(.*)$/);
      if (!m || !noms.has(m[2])) continue;
      const cle = m[4].match(/fields:\s*\[(\w+)\]/)?.[1];
      relations[nom] = { ...relations[nom], [m[1]]: cle ? { modele: m[2], cle } : { modele: m[2] } };
    }
  }
  return { noms: [...noms], relations };
}

describe("couverture du schema", () => {
  test("chaque table est rattachee a une ecole ou declaree hors ecole", () => {
    for (const nom of schema().noms) {
      assert.ok(PORTEE[nom] || HORS_ECOLE.includes(nom), nom + " : ajouter son rattachement dans lib/data/ecole.ts (PORTEE)");
    }
  });

  test("les relations declarees correspondent au schema", () => {
    const attendues = schema().relations;
    for (const nom of HORS_ECOLE) delete attendues[nom];
    assert.deepEqual(RELATIONS, attendues);
  });

  test("les donnees de test couvrent toutes les tables rattachees", () => {
    assert.deepEqual(Object.keys(a.ids).sort(), Object.keys(PORTEE).sort());
  });
});

describe("lecture, modification, suppression : rien de l'autre ecole", () => {
  for (const modele of Object.keys(PORTEE)) {
    test(modele, async () => {
      const db = delegue(ecole(a.user), modele);
      const idA = a.ids[modele];
      const idB = b.ids[modele];

      const liste = (await db.findMany({ select: { id: true } })) as { id: string }[];
      assert.ok(liste.some((x) => x.id === idA), "ligne de A absente");
      assert.ok(!liste.some((x) => x.id === idB), "ligne de B visible");

      assert.equal(await db.findUnique({ where: { id: idB } }), null);
      assert.equal(await db.findFirst({ where: { id: idB } }), null);
      assert.equal(await db.count({ where: { id: idB } }), 0);
      assert.ok(await db.findUnique({ where: { id: idA } }));

      await assert.rejects(db.update({ where: { id: idB }, data: {} }));
      await assert.rejects(db.delete({ where: { id: idB } }));
      assert.deepEqual(await db.deleteMany({ where: { id: idB } }), { count: 0 });
      assert.ok(await delegue(prisma, modele).findUnique({ where: { id: idB } }), "ligne de B supprimee");
    });
  }
});

describe("ecritures : references de l'autre ecole refusees", () => {
  test("note dans la classe de B", async () => {
    await assert.rejects(
      ecole(a.user).note.create({
        data: {
          eleveId: a.ids.Eleve, matiereId: a.ids.Matiere, classeId: b.ids.Classe, trimestreId: a.ids.Trimestre,
          type: "DEVOIR", numero: 9, valeur: 10, saisieParId: a.ids.User,
        },
      }),
      /autre école/
    );
  });

  test("eleve deplace dans une classe de B", async () => {
    await assert.rejects(
      ecole(a.user).eleve.update({ where: { id: a.ids.Eleve }, data: { classeId: b.ids.Classe } }),
      /autre école/
    );
  });

  test("ligne de bulletin imbriquee avec une matiere de B", async () => {
    const db = ecole(a.user);
    const t2 = await db.trimestre.create({ data: { anneeScolaireId: a.ids.AnneeScolaire, nom: "T2", ordre: 2, dateDebut: new Date("2027-01-05") } });
    await assert.rejects(
      db.bulletin.create({
        data: {
          eleveId: a.ids.Eleve, trimestreId: t2.id, classeId: a.ids.Classe, moyenneGenerale: 10, totalPoints: 20, totalCoeffs: 2,
          effectifClasse: 1, genereParId: a.ids.User,
          lignes: { create: [{ matiereId: b.ids.Matiere, nomMatiere: "X", moyenneMatiere: 10, coefficient: 2, points: 20 }] },
        },
      }),
      /autre école/
    );
    await db.trimestre.delete({ where: { id: t2.id } });
  });

  test("ecritures en lot : reference de B refusee", async () => {
    const db = ecole(a.user);
    await assert.rejects(
      db.note.createMany({
        data: [{
          eleveId: a.ids.Eleve, matiereId: a.ids.Matiere, classeId: b.ids.Classe, trimestreId: a.ids.Trimestre,
          type: "DEVOIR", numero: 8, valeur: 10, saisieParId: a.ids.User,
        }],
      }),
      /autre école/
    );
    await assert.rejects(db.note.updateMany({ where: { eleveId: a.ids.Eleve }, data: { classeId: b.ids.Classe } }), /autre école/);
    assert.equal(await prisma.note.count({ where: { classeId: b.ids.Classe, eleveId: a.ids.Eleve } }), 0);
  });

  test("ecritures en lot valides", async () => {
    const db = ecole(a.user);
    const r = await db.note.createMany({
      data: [{
        eleveId: a.ids.Eleve, matiereId: a.ids.Matiere, classeId: a.ids.Classe, trimestreId: a.ids.Trimestre,
        type: "DEVOIR", numero: 7, valeur: 15, saisieParId: a.ids.User,
      }],
    });
    assert.equal(r.count, 1);
    await db.note.deleteMany({ where: { numero: 7 } });
  });

  test("ligne creee dans l'ecole de B", async () => {
    await assert.rejects(
      ecole(a.user).matiere.create({ data: { etablissementId: b.etablissementId, nom: "Intrus", cycle: "SECOND_CYCLE" } }),
      /autre école/
    );
    await assert.rejects(ecole(a.user).etablissement.create({ data: { nom: "Pirate", type: "PRIVE" } }));
  });

  test("l'ecole est imposee a la creation", async () => {
    const db = ecole(a.user);
    const m = await db.matiere.create({ data: { nom: "Anglais", cycle: "SECOND_CYCLE" } as never });
    assert.equal(m.etablissementId, a.etablissementId);
    await db.matiere.delete({ where: { id: m.id } });
  });

  test("ecriture valide avec creation imbriquee (frais et echeances)", async () => {
    const db = ecole(a.user);
    const annee = await db.anneeScolaire.create({
      data: { libelle: "2027-2028", dateDebut: new Date("2027-10-01"), dateFin: new Date("2028-06-30") } as never,
    });
    const frais = await db.fraisScolarite.create({
      data: {
        eleveId: a.ids.Eleve, anneeScolaireId: annee.id, fraisScolariteMensuel: 5000, dateDebut: new Date("2027-10-01"),
        tranches: { create: [{ libelle: "Octobre 2027", periode: "2027-10", ordre: 1, montant: 5000, dateEcheance: new Date("2027-10-05") }] },
      } as never,
      include: { tranches: true },
    });
    assert.equal(frais.etablissementId, a.etablissementId);
    await prisma.fraisScolarite.delete({ where: { id: frais.id } });
    await prisma.anneeScolaire.delete({ where: { id: annee.id } });
  });
});

describe("transactions", () => {
  test("transaction en lot (presences) : filtre et verifications appliques", async () => {
    const db = ecole(a.user);
    const date = new Date("2026-10-07");
    await db.$transaction([
      db.presence.upsert({
        where: { eleveId_date: { eleveId: a.ids.Eleve, date } },
        create: { eleveId: a.ids.Eleve, date, classeId: a.ids.Classe, statut: "PRESENT", saisieParId: a.ids.User },
        update: { statut: "PRESENT" },
      }),
    ]);
    await assert.rejects(
      db.$transaction([
        db.presence.upsert({
          where: { eleveId_date: { eleveId: a.ids.Eleve, date: new Date("2026-10-08") } },
          create: { eleveId: a.ids.Eleve, date: new Date("2026-10-08"), classeId: b.ids.Classe, statut: "PRESENT", saisieParId: a.ids.User },
          update: { statut: "PRESENT" },
        }),
      ]),
      /autre école/
    );
    await prisma.presence.deleteMany({ where: { date: { in: [date, new Date("2026-10-08")] } } });
  });

  test("transaction interactive : une ligne creee plus tot dans la transaction peut etre referencee", async () => {
    const db = ecole(a.user);
    const userId = await db.$transaction(async (tx) => {
      const employe = await tx.employe.create({ data: { nom: "Traore", prenom: "Awa", poste: "Enseignant" } as never });
      const user = await tx.user.create({
        data: { email: "awa@ecolea.test", passwordHash: "x", roles: ["ENSEIGNANT"], employeId: employe.id } as never,
      });
      return user.id;
    });
    const cree = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { employe: true } });
    assert.equal(cree.etablissementId, a.etablissementId);
    assert.equal(cree.employe.etablissementId, a.etablissementId);
    await prisma.user.delete({ where: { id: userId } });
    await prisma.employe.delete({ where: { id: cree.employeId } });
  });

  test("transaction interactive : le client de transaction reste filtre", async () => {
    const ids = await ecole(a.user).$transaction(async (tx) => (await tx.classe.findMany({ select: { id: true } })).map((c) => c.id));
    assert.deepEqual(ids, [a.ids.Classe]);
  });
});

describe("requetes SQL brutes : resultats de A inchanges par les donnees de B", () => {
  async function resultats(e: Ecole) {
    const debut = new Date("2026-01-01");
    const fin = new Date("2027-12-31");
    const id = e.etablissementId;
    return {
      stats: await statsImpayes(id, {}),
      eleves: await elevesAvecFrais(id),
      rappels: (await listeRappels(id, undefined, 50)).map((r) => r.id),
      periodes: await periodesEcoulees(id),
      soldes: await soldesCaisses(id),
      journal: await journal(id, debut, fin),
      prevision: await previsionMois(id, new Date("2026-10-19")),
      rapport: await rapportFinancier(id, debut, fin),
      finances: await financesMensuelles(id, "2026-10"),
      salaires: await salairesPrevus(id),
    };
  }

  test("ajout d'impayes, encaissements, depenses et rappels dans l'ecole B", async () => {
    const avant = await resultats(a);
    const avantB = await resultats(b);
    const frais = await prisma.fraisScolarite.findUniqueOrThrow({ where: { id: b.ids.FraisScolarite } });
    const tranche = await prisma.trancheFrais.create({
      data: { fraisId: frais.id, libelle: "Septembre 2026", periode: "2026-09", ordre: 2, montant: 7000, dateEcheance: new Date("2026-09-05") },
    });
    await prisma.paiementFrais.create({
      data: { trancheId: tranche.id, montant: 3000, datePaiement: new Date("2026-10-04"), mode: "MOBILE_MONEY", recuNumero: "R-B2", saisieParId: b.ids.User },
    });
    await prisma.rappel.create({ data: { trancheId: tranche.id, saisieParId: b.ids.User } });
    await prisma.mouvementTresorerie.create({
      data: { etablissementId: b.etablissementId, type: "APPORT_CAPITAL", caisse: "BANQUE", date: new Date("2026-10-02"), montant: 500000, libelle: "Apport", saisieParId: b.ids.User },
    });
    await prisma.paiement.create({
      data: {
        etablissementId: b.etablissementId, employeId: b.ids.Employe, periode: "2026-09", type: "PRIME", montant: 25000,
        datePaiement: new Date("2026-10-15"), modePaiement: "ESPECES", saisieParId: b.ids.User,
      },
    });
    await prisma.employe.update({ where: { id: b.ids.Employe }, data: { salaireReference: 175000 } });

    assert.deepEqual(await resultats(a), avant);
    // Controle : chaque calcul de B, lui, voit les nouvelles donnees
    const apresB = await resultats(b);
    for (const k of Object.keys(avantB) as (keyof typeof avantB)[]) {
      assert.notDeepEqual(apresB[k], avantB[k], k + " : le calcul ne voit pas les donnees ajoutees, test sans effet");
    }
  });
});
