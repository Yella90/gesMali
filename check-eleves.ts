import "dotenv/config";
import { PrismaClient } from "./lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // 1. Voir les classes
  const classes = await prisma.classe.findMany({
    include: { _count: { select: { eleves: { where: { statut: "INSCRIT" } } } } },
    orderBy: [{ niveau: "asc" }, { section: "asc" }],
  });
  console.log("=== Classes existantes ===");
  for (const c of classes) {
    const lib = c.nom || (c.niveau + (c.section ? " " + c.section : ""));
    console.log("  " + lib + " (" + c._count.eleves + " eleves) - id: " + c.id);
  }

  // 2. Voir les eleves sans classe
  const sansClasse = await prisma.eleve.findMany({
    where: { classeId: null, statut: "INSCRIT" },
    orderBy: { matricule: "asc" },
  });
  console.log("\n=== Eleves sans classe (" + sansClasse.length + ") ===");
  for (const e of sansClasse) {
    console.log("  " + e.matricule + " - " + e.nom + " " + e.prenom);
  }

  await prisma.$disconnect();
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });