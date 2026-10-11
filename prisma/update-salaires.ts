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

  console.log("=== Mise a jour des salaires de reference ===\n");

  // Salaires par poste
  const salaires: Record<string, { salaire: number; type: string }> = {
    "Directeur": { salaire: 150000, type: "MENSUEL" },
    "Enseignant": { salaire: 75000, type: "MENSUEL" },
    "Secretaire": { salaire: 60000, type: "MENSUEL" },
    "Comptable": { salaire: 85000, type: "MENSUEL" },
    "Surveillant": { salaire: 50000, type: "MENSUEL" },
    "Gardien": { salaire: 40000, type: "MENSUEL" },
  };

  const employes = await prisma.employe.findMany();
  let modifs = 0;

  for (const e of employes) {
    const info = salaires[e.poste];
    if (!info) continue;
    if (e.salaireReference === info.salaire && e.typeRemuneration === info.type) continue;

    await prisma.employe.update({
      where: { id: e.id },
      data: {
        salaireReference: info.salaire,
        typeRemuneration: info.type as any,
      },
    });
    console.log("  + " + e.nom + " " + e.prenom + " (" + e.poste + ") : " + info.salaire.toLocaleString("fr-FR") + " F / " + info.type);
    modifs++;
  }

  console.log("\n" + modifs + " employe(s) mis a jour sur " + employes.length);
  console.log("=== Termine ===");

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });