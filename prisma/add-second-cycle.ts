import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const etab = await prisma.etablissement.findFirst();
  if (!etab) throw new Error("Aucun etablissement");

  const matieres = [
    { nom: "Francais", cycle: "SECOND_CYCLE", coefficient: 4 },
    { nom: "Mathematiques", cycle: "SECOND_CYCLE", coefficient: 4 },
    { nom: "Anglais", cycle: "SECOND_CYCLE", coefficient: 2 },
    { nom: "Histoire-Geographie", cycle: "SECOND_CYCLE", coefficient: 2 },
    { nom: "Sciences", cycle: "SECOND_CYCLE", coefficient: 2 },
    { nom: "Physique-Chimie", cycle: "SECOND_CYCLE", coefficient: 2 },
    { nom: "Education civique", cycle: "SECOND_CYCLE", coefficient: 1 },
    { nom: "Education physique", cycle: "SECOND_CYCLE", coefficient: 1 },
  ];

  let crees = 0;
  let existants = 0;

  for (const m of matieres) {
    const existing = await prisma.matiere.findFirst({
      where: {
        etablissementId: etab.id,
        nom: m.nom,
        cycle: m.cycle as any,
      },
    });

    if (existing) {
      existants++;
      continue;
    }

    await prisma.matiere.create({
      data: {
        etablissementId: etab.id,
        nom: m.nom,
        cycle: m.cycle as any,
        coefficient: m.coefficient,
      },
    });
    console.log("  + " + m.nom + " (SECOND_CYCLE)");
    crees++;
  }

  console.log("\n" + crees + " cree(s), " + existants + " deja existant(s)");
  await prisma.$disconnect();
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });