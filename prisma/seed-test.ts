import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("=== Seed donnees de test ===");

  const etab = await prisma.etablissement.findFirst();
  if (!etab) throw new Error("Aucun etablissement. Lance d'abord prisma/seed.ts");

  const directeur = await prisma.user.findFirst({
    where: { etablissementId: etab.id, roles: { has: "DIRECTEUR" } },
  });
  if (!directeur) throw new Error("Aucun directeur");

  // 1. Annee scolaire
  const annee = await prisma.anneeScolaire.upsert({
    where: { etablissementId_libelle: { etablissementId: etab.id, libelle: "2025-2026" } },
    update: {},
    create: {
      etablissementId: etab.id,
      libelle: "2025-2026",
      dateDebut: new Date("2025-10-01"),
      dateFin: new Date("2026-06-30"),
      active: true,
    },
  });
  console.log("  Annee :", annee.libelle);

  // 2. Trimestres
  const trimestres = [
    { nom: "Trimestre 1", ordre: 1, debut: "2025-10-01", fin: "2025-12-20" },
    { nom: "Trimestre 2", ordre: 2, debut: "2026-01-05", fin: "2026-03-28" },
    { nom: "Trimestre 3", ordre: 3, debut: "2026-04-06", fin: "2026-06-27" },
  ];
  for (const t of trimestres) {
    await prisma.trimestre.upsert({
      where: { anneeScolaireId_ordre: { anneeScolaireId: annee.id, ordre: t.ordre } },
      update: {},
      create: {
        anneeScolaireId: annee.id,
        nom: t.nom,
        ordre: t.ordre,
        dateDebut: new Date(t.debut),
        dateFin: new Date(t.fin),
      },
    });
  }
  console.log("  Trimestres : 3");

  // 3. Matieres
  const matieres = [
    { nom: "Francais", cycle: "PREMIER_CYCLE", coefficient: 3 },
    { nom: "Mathematiques", cycle: "PREMIER_CYCLE", coefficient: 3 },
    { nom: "Sciences", cycle: "PREMIER_CYCLE", coefficient: 2 },
    { nom: "Histoire-Geographie", cycle: "PREMIER_CYCLE", coefficient: 2 },
    { nom: "Anglais", cycle: "PREMIER_CYCLE", coefficient: 1 },
    { nom: "Education civique", cycle: "PREMIER_CYCLE", coefficient: 1 },
  ];
  for (const m of matieres) {
    await prisma.matiere.upsert({
      where: { etablissementId_nom_cycle: { etablissementId: etab.id, nom: m.nom, cycle: m.cycle as any } },
      update: {},
      create: { etablissementId: etab.id, nom: m.nom, cycle: m.cycle as any, coefficient: m.coefficient },
    });
  }
  console.log("  Matieres : 6");

  // 4. Classes
  const classes = [
    { niveau: 4, section: "A", cycle: "PREMIER_CYCLE", salle: "Salle 4A" },
    { niveau: 5, section: "A", cycle: "PREMIER_CYCLE", salle: "Salle 5A" },
    { niveau: 6, section: "A", cycle: "PREMIER_CYCLE", salle: "Salle 6A" },
  ];
  const classesCreees = [];
  for (const c of classes) {
    const classe = await prisma.classe.upsert({
      where: {
        etablissementId_anneeScolaireId_niveau_section: {
          etablissementId: etab.id,
          anneeScolaireId: annee.id,
          niveau: c.niveau,
          section: c.section,
        },
      },
      update: {},
      create: {
        etablissementId: etab.id,
        anneeScolaireId: annee.id,
        niveau: c.niveau,
        cycle: c.cycle as any,
        section: c.section,
        salle: c.salle,
      },
    });
    classesCreees.push(classe);
  }
  console.log("  Classes : 3");

  // 5. Eleves (10 par classe)
  const noms = ["Diallo","Traore","Coulibaly","Keita","Sanogo","Doumbia","Cisse","Toure","Maiga","Dembele","Kone","Sissoko","Bah","Camara","Sylla"];
  const prenoms = ["Amadou","Fatoumata","Ibrahim","Aminata","Moussa","Awa","Seydou","Mariam","Bakary","Kadiatou","Modibo","Rokia","Oumar","Assitan","Cheick"];
  let compteur = 0;
  for (const classe of classesCreees) {
    for (let i = 0; i < 10; i++) {
      compteur++;
      const matricule = `2025-${String(compteur).padStart(4, "0")}`;
      const exists = await prisma.eleve.findUnique({
        where: { etablissementId_matricule: { etablissementId: etab.id, matricule } },
      });
      if (exists) continue;
      await prisma.eleve.create({
        data: {
          etablissementId: etab.id,
          matricule,
          nom: noms[compteur % noms.length],
          prenom: prenoms[compteur % prenoms.length],
          dateNaissance: new Date(2012 + (classe.niveau % 3), (compteur % 12), (compteur % 28) + 1),
          sexe: compteur % 2 === 0 ? "M" : "F",
          classeId: classe.id,
          statut: "INSCRIT",
        },
      });
    }
  }
  console.log("  Eleves : 30");

  console.log("=== Termine ===");
  console.log("Tu peux maintenant tester le module Notes.");

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });