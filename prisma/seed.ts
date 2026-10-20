import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

// ═════════════════════════════════════════════
// PRNG deterministe (pour reproductibilite)
// ═════════════════════════════════════════════
function makeRng(seed: number) {
  let s = seed;
  return function () {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}
const rng = makeRng(2026);

async function retry<T>(fn: () => Promise<T>, essais = 6): Promise<T> {
  let derniere: any;
  for (let i = 1; i <= essais; i++) {
    try {
      return await fn();
    } catch (e: any) {
      derniere = e;
      const code = e?.code;
      const msg = String(e?.message || "");
      const reseau =
        ["P1017", "P1001", "P1002", "P2024"].includes(code) ||
        /closed|ECONNRESET|terminated|timeout/i.test(msg);
      if (!reseau || i === essais) throw e;
      console.log("   connexion perdue, nouvel essai " + i + "/" + (essais - 1) + "...");
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
  throw derniere;
}

// ═════════════════════════════════════════════
// UTILITAIRES
// ═════════════════════════════════════════════
const MOIS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
function libMois(a: number, m: number) { return MOIS_FR[m - 1] + " " + a; }
function perStr(a: number, m: number) { return a + "-" + String(m).padStart(2, "0"); }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

// ═════════════════════════════════════════════
// DONNEES
// ═════════════════════════════════════════════
const NOMS = ["Diallo","Traore","Coulibaly","Keita","Sanogo","Doumbia","Cisse","Toure","Maiga","Dembele","Kone","Sissoko","Bah","Camara","Sylla","Diakite","Konate","Fofana","Sidibe"];
const PRENOMS_M = ["Amadou","Ibrahim","Moussa","Seydou","Bakary","Modibo","Oumar","Cheick","Boubacar","Adama"];
const PRENOMS_F = ["Fatoumata","Aminata","Awa","Mariam","Kadiatou","Rokia","Assitan","Djeneba","Aissata","Hawa"];

const JOURS = ["LUNDI","MARDI","MERCREDI","JEUDI","VENDREDI"];
const CRENEAUX = [
  { hd: "08:00", hf: "10:00" },
  { hd: "10:00", hf: "12:00" },
  { hd: "14:00", hf: "16:00" },
];

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 2,
    keepAlive: true,
    connectionTimeoutMillis: 30000,
  });
  pool.on("error", (e) => console.log("   (pool) connexion inactive fermee :", e.message));
  const adapter = new PrismaPg(pool);
  const prisma: any = new PrismaClient({ adapter }).$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }: any) {
          return retry(() => query(args));
        },
      },
    },
  });

  console.log("=== SEED COMPLET GES MALI ===\n");

  // ─────────────────────────────────────────────
  // 1. ETABLISSEMENT + PARAMETRES
  // ─────────────────────────────────────────────
  const etab = await prisma.etablissement.create({
    data: {
      nom: "Ecole Fondamentale Les Pionniers",
      type: "PRIVE",
      adresse: "Bamako, Mali",
      telephone: "+223 20 20 20 20",
      email: "contact@pionniers.ml",
    },
  });
  await prisma.parametresEtablissement.create({
    data: {
      etablissementId: etab.id,
      modeSaisieNotes: "DECENTRALISEE",
      validationObligatoire: true,
      ponderationDevoirs: 0.333,
      ponderationCompo: 0.667,
      reinscriptionRequise: false,
      fraisReinscription: 0,
      copierAffectations: true,
      archiverNotes: true,
    },
  });
  console.log("✓ Etablissement + parametres");

  // ─────────────────────────────────────────────
  // 2. DIRECTEUR + USER
  // ─────────────────────────────────────────────
  const emailDir = "directeur@ecole.ml";
  // Mot de passe : SEED_MOT_DE_PASSE, sinon tire au hasard (affiche une fois, a la fin).
  // Jamais de mot de passe ecrit dans le code : le depot peut etre public.
  const passwordDir = process.env.SEED_MOT_DE_PASSE || randomBytes(9).toString("base64url");
  const employeDir = await prisma.employe.create({
    data: {
      etablissementId: etab.id, nom: "Maiga", prenom: "Ibrahim",
      telephone: "+223 70 00 00 00", poste: "Directeur",
      dateEmbauche: new Date("2020-09-01"),
      salaireReference: 150000, typeRemuneration: "MENSUEL", actif: true,
    },
  });
  const userDir = await prisma.user.create({
    data: {
      email: emailDir, passwordHash: await bcrypt.hash(passwordDir, 10),
      roles: ["DIRECTEUR"], actif: true, employeId: employeDir.id, etablissementId: etab.id,
    },
  });
  console.log("✓ Directeur :", emailDir);

  // ─────────────────────────────────────────────
  // 3. EMPLOYES NON-ENSEIGNANTS
  // ─────────────────────────────────────────────
  const autres = [
    { nom: "Traore", prenom: "Ousmane", poste: "Gardien", sal: 40000 },
    { nom: "Cisse", prenom: "Aminata", poste: "Secretaire", sal: 60000 },
    { nom: "Doumbia", prenom: "Moussa", poste: "Comptable", sal: 85000 },
    { nom: "Sidibe", prenom: "Rokia", poste: "Surveillant", sal: 50000 },
  ];
  for (const e of autres) {
    await prisma.employe.create({
      data: {
        etablissementId: etab.id, nom: e.nom, prenom: e.prenom,
        poste: e.poste, dateEmbauche: new Date("2023-09-01"),
        salaireReference: e.sal, typeRemuneration: "MENSUEL", actif: true,
      },
    });
  }
  console.log("✓ 4 employes non-enseignants");

  // ─────────────────────────────────────────────
  // 4. ENSEIGNANTS
  // ─────────────────────────────────────────────
  const ENSEIGNANTS = [
    { nom: "Konate", prenom: "Drissa", type: "POLY" },
    { nom: "Coulibaly", prenom: "Awa", type: "POLY" },
    { nom: "Keita", prenom: "Moussa", type: "POLY" },
    { nom: "Sanogo", prenom: "Fatoumata", type: "POLY" },
    { nom: "Traore", prenom: "Modibo", type: "POLY" },
    { nom: "Doumbia", prenom: "Djeneba", type: "POLY" },
    { nom: "Cisse", prenom: "Bakary", type: "MATHS" },
    { nom: "Sidibe", prenom: "Rokia", type: "FRANCAIS" },
    { nom: "Fofana", prenom: "Adama", type: "ANGLAIS" },
    { nom: "Diakite", prenom: "Boubacar", type: "HG" },
    { nom: "Sylla", prenom: "Aissata", type: "SCIENCES" },
    { nom: "Bah", prenom: "Hawa", type: "EC" },
  ];
  const empEns: Record<string, any> = {};
  for (let i = 0; i < ENSEIGNANTS.length; i++) {
    const e = ENSEIGNANTS[i];
    const emp = await prisma.employe.create({
      data: {
        etablissementId: etab.id, nom: e.nom, prenom: e.prenom,
        telephone: "+22376" + String(1000000 + i).slice(-6),
        poste: "Enseignant", dateEmbauche: new Date("2024-09-01"),
        salaireReference: 75000, typeRemuneration: "MENSUEL", actif: true,
      },
    });
    empEns[e.type + "_" + e.nom] = emp;
  }
  console.log("✓ 12 enseignants");

  // ─────────────────────────────────────────────
  // 5. ANNEE + 3 TRIMESTRES (CLOTURES)
  // ─────────────────────────────────────────────
  const annee = await prisma.anneeScolaire.create({
    data: {
      etablissementId: etab.id, libelle: "2025-2026",
      dateDebut: new Date("2025-10-01"), dateFin: new Date("2026-06-30"),
      active: true,
    },
  });
  const trimData = [
    { nom: "Trimestre 1", ordre: 1, d: "2025-10-01", f: "2025-12-20" },
    { nom: "Trimestre 2", ordre: 2, d: "2026-01-05", f: "2026-03-28" },
    { nom: "Trimestre 3", ordre: 3, d: "2026-04-06", f: "2026-06-27" },
  ];
  const trimestres: any[] = [];
  for (const t of trimData) {
    const tr = await prisma.trimestre.create({
      data: {
        anneeScolaireId: annee.id, nom: t.nom, ordre: t.ordre,
        dateDebut: new Date(t.d), dateFin: new Date(t.f),
        cloture: true,
      },
    });
    trimestres.push(tr);
  }
  console.log("✓ Annee + 3 trimestres CLOTURES");

  // ─────────────────────────────────────────────
  // 6. MATIERES
  // ─────────────────────────────────────────────
  const matPC = [
    { nom: "Francais", coef: 3 }, { nom: "Mathematiques", coef: 3 },
    { nom: "Sciences", coef: 2 }, { nom: "Histoire-Geographie", coef: 2 },
    { nom: "Anglais", coef: 1 }, { nom: "Education civique", coef: 1 },
  ];
  const matSC = [
    { nom: "Francais", coef: 4 }, { nom: "Mathematiques", coef: 4 },
    { nom: "Anglais", coef: 2 }, { nom: "Histoire-Geographie", coef: 2 },
    { nom: "Sciences", coef: 2 }, { nom: "Physique-Chimie", coef: 2 },
    { nom: "Education civique", coef: 1 }, { nom: "Education physique", coef: 1 },
  ];
  const matieresParCycle: Record<string, any[]> = { PREMIER_CYCLE: [], SECOND_CYCLE: [] };
  for (const m of matPC) {
    matieresParCycle.PREMIER_CYCLE.push(await prisma.matiere.create({
      data: { etablissementId: etab.id, nom: m.nom, cycle: "PREMIER_CYCLE", coefficient: m.coef },
    }));
  }
  for (const m of matSC) {
    matieresParCycle.SECOND_CYCLE.push(await prisma.matiere.create({
      data: { etablissementId: etab.id, nom: m.nom, cycle: "SECOND_CYCLE", coefficient: m.coef },
    }));
  }
  console.log("✓ 14 matieres");

  // ─────────────────────────────────────────────
  // 7. CLASSES
  // ─────────────────────────────────────────────
  const classesData = [
    { nom: "Jardin", n: 0, cyc: "PRESCOLAIRE", sec: null, salle: "Jardin" },
    { nom: "1ere A", n: 1, cyc: "PREMIER_CYCLE", sec: "A", salle: "Salle 1" },
    { nom: "2eme A", n: 2, cyc: "PREMIER_CYCLE", sec: "A", salle: "Salle 2" },
    { nom: "3eme A", n: 3, cyc: "PREMIER_CYCLE", sec: "A", salle: "Salle 3" },
    { nom: "4eme A", n: 4, cyc: "PREMIER_CYCLE", sec: "A", salle: "Salle 4" },
    { nom: "5eme A", n: 5, cyc: "PREMIER_CYCLE", sec: "A", salle: "Salle 5" },
    { nom: "6eme A", n: 6, cyc: "PREMIER_CYCLE", sec: "A", salle: "Salle 6" },
    { nom: "7eme A", n: 7, cyc: "SECOND_CYCLE", sec: "A", salle: "Salle 7" },
    { nom: "8eme A", n: 8, cyc: "SECOND_CYCLE", sec: "A", salle: "Salle 8" },
    { nom: "9eme A", n: 9, cyc: "SECOND_CYCLE", sec: "A", salle: "Salle 9" },
  ];
  const classes: any[] = [];
  for (const c of classesData) {
    const cl = await prisma.classe.create({
      data: {
        etablissementId: etab.id, anneeScolaireId: annee.id,
        nom: c.nom, niveau: c.n, cycle: c.cyc as any, section: c.sec, salle: c.salle,
        fraisInscription: 15000, fraisScolariteMensuel: 14000, capaciteMax: 50,
      },
    });
    classes.push(cl);
  }
  console.log("✓ 10 classes");

  // ─────────────────────────────────────────────
  // 8. AFFECTATIONS + CRENEAUX
  // ─────────────────────────────────────────────
  const polys = ENSEIGNANTS.filter((e) => e.type === "POLY");
  let nbAff = 0;

  // Titulaires pour Jardin + 1er cycle
  const classesTit = classes.filter((c) => c.cycle === "PRESCOLAIRE" || c.cycle === "PREMIER_CYCLE");
  for (let i = 0; i < classesTit.length; i++) {
    const classe = classesTit[i];
    const prof = polys[i % polys.length];
    const emp = empEns["POLY_" + prof.nom];

    for (let j = 0; j < 3; j++) {
      await prisma.affectation.create({
        data: {
          enseignantId: emp.id, classeId: classe.id, matiereId: null,
          type: "TITULAIRE", jour: JOURS[j],
          heureDebut: CRENEAUX[j].hd, heureFin: CRENEAUX[j].hf,
        },
      });
      nbAff++;
    }
    await prisma.classe.update({ where: { id: classe.id }, data: { titulaireId: emp.id } });
  }

  // Matieres 2nd cycle
  const profsParMat: Record<string, any> = {
    Mathematiques: empEns["MATHS_Cisse"],
    Francais: empEns["FRANCAIS_Sidibe"],
    Anglais: empEns["ANGLAIS_Fofana"],
    "Histoire-Geographie": empEns["HG_Diakite"],
    Sciences: empEns["SCIENCES_Sylla"],
    "Physique-Chimie": empEns["SCIENCES_Sylla"],
    "Education civique": empEns["EC_Bah"],
    "Education physique": empEns["EC_Bah"],
  };
  const classesSC = classes.filter((c) => c.cycle === "SECOND_CYCLE");
  for (const classe of classesSC) {
    const mats = matieresParCycle.SECOND_CYCLE;
    for (let m = 0; m < mats.length; m++) {
      const prof = profsParMat[mats[m].nom];
      if (!prof) continue;
      const crs = [
        { j: JOURS[m % 5], hd: CRENEAUX[m % 3].hd, hf: CRENEAUX[m % 3].hf },
        { j: JOURS[(m + 2) % 5], hd: CRENEAUX[(m + 1) % 3].hd, hf: CRENEAUX[(m + 1) % 3].hf },
      ];
      for (const cr of crs) {
        try {
          await prisma.affectation.create({
            data: {
              enseignantId: prof.id, classeId: classe.id, matiereId: mats[m].id,
              type: "PROFESSEUR_MATIERE", jour: cr.j,
              heureDebut: cr.hd, heureFin: cr.hf,
            },
          });
          nbAff++;
        } catch {}
      }
    }
  }
  console.log("✓ " + nbAff + " affectations");

  // ─────────────────────────────────────────────
  // 9. ELEVES + CAPACITES
  // ─────────────────────────────────────────────
  const eleves: any[] = [];
  let num = 0;
  for (const classe of classes) {
    for (let i = 0; i < 12; i++) {
      num++;
      const sexe = num % 2 === 0 ? "M" : "F";
      const prenom = sexe === "M" ? PRENOMS_M[num % PRENOMS_M.length] : PRENOMS_F[num % PRENOMS_F.length];
      const nom = NOMS[num % NOMS.length];
      const anNais = 2020 - classe.niveau;
      const el = await prisma.eleve.create({
        data: {
          etablissementId: etab.id,
          matricule: "2025-" + String(num).padStart(4, "0"),
          nom, prenom,
          dateNaissance: new Date(anNais, num % 12, (num % 28) + 1),
          sexe: sexe as any,
          tuteurNom: "Parent " + nom,
          tuteurTelephone: "+223 66 " + String(1000000 + num).slice(-6),
          emailParent: "parent" + num + "@exemple.ml",
          classeId: classe.id,
          statut: "INSCRIT",
        },
      });
      // Capacite academique : distribution realiste
      const r = rng();
      let cap: number;
      if (r < 0.05) cap = 4 + rng() * 3;        // 5% tres faible (4-7)
      else if (r < 0.20) cap = 7 + rng() * 3;   // 15% faible (7-10)
      else if (r < 0.45) cap = 10 + rng() * 2;  // 25% moyen (10-12)
      else if (r < 0.80) cap = 12 + rng() * 3;  // 35% bien (12-15)
      else cap = 15 + rng() * 4;                // 20% excellent (15-19)
      (el as any)._capacite = cap;
      eleves.push(el);
    }
  }
  console.log("✓ " + eleves.length + " eleves");

  // ─────────────────────────────────────────────
  // 10. FRAIS + QUELQUES PAIEMENTS
  // ─────────────────────────────────────────────
  const debut = new Date(annee.dateDebut);
  const fin = new Date(annee.dateFin);
  const nbMois = (fin.getFullYear() - debut.getFullYear()) * 12 + (fin.getMonth() - debut.getMonth()) + 1;

  let nbFrais = 0;
  const trancheIdsPaiement: any[] = [];

  for (const eleve of eleves) {
    const classe = classes.find((c) => c.id === eleve.classeId);
    const tranchesData: any[] = [
      { libelle: "Inscription", periode: perStr(debut.getFullYear(), debut.getMonth() + 1),
        ordre: 0, montant: classe.fraisInscription,
        dateEcheance: new Date(debut.getFullYear(), debut.getMonth(), 5) },
    ];
    let a = debut.getFullYear(), m = debut.getMonth() + 1;
    for (let k = 0; k < nbMois; k++) {
      tranchesData.push({
        libelle: libMois(a, m), periode: perStr(a, m), ordre: k + 1,
        montant: classe.fraisScolariteMensuel,
        dateEcheance: new Date(a, m - 1, 5),
      });
      m++; if (m > 12) { m = 1; a++; }
    }
    const frais = await prisma.fraisScolarite.create({
      data: {
        etablissementId: etab.id, eleveId: eleve.id, anneeScolaireId: annee.id,
        fraisInscription: classe.fraisInscription,
        fraisScolariteMensuel: classe.fraisScolariteMensuel,
        reduction: 0, dateDebut: debut,
        tranches: { create: tranchesData },
      },
      include: { tranches: { orderBy: { ordre: "asc" } } },
    });
    nbFrais++;
    // Recenser les tranches payables
    trancheIdsPaiement.push({ frais, tranches: frais.tranches });
  }
  console.log("✓ " + nbFrais + " dossiers frais");

  // Paiements partiels aleatoires : entre 0 et 9 mois par eleve
  let nbPaiements = 0;
  const paiementFraisData: any[] = [];
  for (const { frais, tranches } of trancheIdsPaiement) {
    const moisPayes = Math.floor(rng() * 10); // 0 a 9 mois payes
    for (let i = 0; i <= moisPayes && i < tranches.length; i++) {
      const t = tranches[i];
      paiementFraisData.push({
        trancheId: t.id,
        montant: t.montant,
        datePaiement: new Date(t.dateEcheance.getTime() + (rng() * 5) * 86400000),
        mode: "ESPECES" as any,
        recuNumero: "REC-2025-" + String(++nbPaiements).padStart(5, "0"),
        saisieParId: userDir.id,
      });
    }
  }
  await prisma.paiementFrais.createMany({ data: paiementFraisData });
  console.log("✓ " + nbPaiements + " paiements de frais");

  // ─────────────────────────────────────────────
  // 11. NOTES + BULLETINS POUR LES 3 TRIMESTRES
  // ─────────────────────────────────────────────
  console.log("\n--- Generation des notes + bulletins ---");

  for (const trimestre of trimestres) {
    console.log("  " + trimestre.nom + "...");
    const notesData: any[] = [];

    for (const eleve of eleves) {
      const classe = classes.find((c) => c.id === eleve.classeId);
      const mats = classe.cycle === "SECOND_CYCLE"
        ? matieresParCycle.SECOND_CYCLE
        : matieresParCycle.PREMIER_CYCLE;
      const cap = (eleve as any)._capacite;

      for (const matiere of mats) {
        // 2 devoirs + 1 composition
        for (let d = 1; d <= 2; d++) {
          notesData.push({
            eleveId: eleve.id, matiereId: matiere.id, classeId: classe.id,
            trimestreId: trimestre.id, type: "DEVOIR" as any, numero: d,
            valeur: Number(clamp(cap + (rng() - 0.5) * 4, 0, 20).toFixed(2)),
            statut: "VERROUILLEE" as any,
            saisieParId: userDir.id,
          });
        }
        notesData.push({
          eleveId: eleve.id, matiereId: matiere.id, classeId: classe.id,
          trimestreId: trimestre.id, type: "COMPOSITION" as any, numero: 1,
          valeur: Number(clamp(cap + (rng() - 0.5) * 3, 0, 20).toFixed(2)),
          statut: "VERROUILLEE" as any,
          saisieParId: userDir.id,
        });
      }
    }

    await prisma.note.createMany({ data: notesData });
    console.log("    " + notesData.length + " notes");

    // Genere les bulletins par classe
    for (const classe of classes) {
      const elevesClasse = eleves.filter((e) => e.classeId === classe.id);
      const mats = classe.cycle === "SECOND_CYCLE"
        ? matieresParCycle.SECOND_CYCLE
        : matieresParCycle.PREMIER_CYCLE;

      type LigneCalc = {
        matiereId: string; nomMatiere: string; coef: number;
        moyD: number | null; moyC: number | null; moyM: number; points: number;
      };
      type Result = {
        eleveId: string;
        lignes: LigneCalc[];
        moyGen: number; totalPoints: number; totalCoefs: number;
      };

      const resultats: Result[] = [];

      for (const eleve of elevesClasse) {
        const lignes: LigneCalc[] = [];
        let totalP = 0, totalC = 0;

        for (const matiere of mats) {
          const notesMat = notesData.filter(
            (n) => n.eleveId === eleve.id && n.matiereId === matiere.id
          );
          const devs = notesMat.filter((n) => n.type === "DEVOIR").map((n) => n.valeur);
          const comps = notesMat.filter((n) => n.type === "COMPOSITION").map((n) => n.valeur);
          const moyD = devs.length ? devs.reduce((s, v) => s + v, 0) / devs.length : null;
          const moyC = comps.length ? comps.reduce((s, v) => s + v, 0) / comps.length : null;
          const moyM = (moyC !== null && moyD !== null)
            ? (moyC * 2 + moyD) / 3
            : (moyD ?? moyC ?? 0);
          const pts = moyM * matiere.coefficient;
          lignes.push({
            matiereId: matiere.id, nomMatiere: matiere.nom, coef: matiere.coefficient,
            moyD: moyD !== null ? Number(moyD.toFixed(2)) : null,
            moyC: moyC !== null ? Number(moyC.toFixed(2)) : null,
            moyM: Number(moyM.toFixed(2)), points: Number(pts.toFixed(2)),
          });
          totalP += pts;
          totalC += matiere.coefficient;
        }
        const moyGen = totalC > 0 ? totalP / totalC : 0;
        resultats.push({
          eleveId: eleve.id, lignes,
          moyGen: Number(moyGen.toFixed(2)),
          totalPoints: Number(totalP.toFixed(2)),
          totalCoefs: totalC,
        });
      }

      resultats.sort((a, b) => b.moyGen - a.moyGen);
      const moyClasse = resultats.reduce((s, r) => s + r.moyGen, 0) / resultats.length;
      const moyForte = resultats[0].moyGen;
      const moyFaible = resultats[resultats.length - 1].moyGen;

      // Rangs par matiere
      const rangParMat: Record<string, Record<string, number>> = {};
      for (const m of mats) {
        const avecNote = resultats
          .map((r) => ({
            eid: r.eleveId,
            moy: r.lignes.find((l) => l.matiereId === m.id)?.moyM ?? null,
          }))
          .filter((x) => x.moy !== null)
          .sort((a, b) => (b.moy ?? 0) - (a.moy ?? 0));
        rangParMat[m.id] = {};
        avecNote.forEach((x, i) => { rangParMat[m.id][x.eid] = i + 1; });
      }

      for (let i = 0; i < resultats.length; i++) {
        const r = resultats[i];
        await prisma.bulletin.create({
          data: {
            eleveId: r.eleveId, trimestreId: trimestre.id, classeId: classe.id,
            moyenneGenerale: r.moyGen,
            moyenneClasse: Number(moyClasse.toFixed(2)),
            moyennePlusForte: Number(moyForte.toFixed(2)),
            moyennePlusFaible: Number(moyFaible.toFixed(2)),
            totalPoints: r.totalPoints, totalCoeffs: r.totalCoefs,
            rang: i + 1, effectifClasse: resultats.length,
            genereParId: userDir.id,
            lignes: {
              create: r.lignes.map((l) => ({
                matiereId: l.matiereId, nomMatiere: l.nomMatiere,
                moyenneDevoirs: l.moyD, moyenneCompo: l.moyC,
                moyenneMatiere: l.moyM, coefficient: l.coef, points: l.points,
                rangMatiere: rangParMat[l.matiereId]?.[r.eleveId] ?? null,
              })),
            },
          },
        });
      }
    }
  }

  // ─────────────────────────────────────────────
  // RECAP
  // ─────────────────────────────────────────────
  console.log("\n=== SEED TERMINE ===\n");
  console.log("Connexion :");
  console.log("  Email    : " + emailDir);
  console.log("  Password : " + passwordDir);
  console.log("");
  console.log("Structure :");
  console.log("  - " + classes.length + " classes (Jardin -> 9eme)");
  console.log("  - " + eleves.length + " eleves");
  console.log("  - " + nbAff + " affectations avec creneaux");
  console.log("  - " + nbFrais + " dossiers frais");
  console.log("  - " + nbPaiements + " paiements de frais");
  console.log("  - 3 trimestres CLOTURES avec notes + bulletins");
  console.log("");
  console.log("Test de la transition :");
  console.log("  1. Va sur /transition");
  console.log("  2. Clique 'Nouvelle transition'");
  console.log("  3. Choisis 2025-2026 comme source");
  console.log("  4. Nouvelle annee : 2026-2027");
  console.log("  5. Analyse puis valide");

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });