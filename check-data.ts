import "dotenv/config";
import { PrismaClient } from "./lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const etabs = await prisma.etablissement.findMany();
  const annees = await prisma.anneeScolaire.findMany();
  const classes = await prisma.classe.findMany();
  const eleves = await prisma.eleve.findMany();
  const matieres = await prisma.matiere.findMany();
  const trimestres = await prisma.trimestre.findMany();
  const notes = await prisma.note.findMany();

  console.log("Etablissements :", etabs.length);
  console.log("Annees        :", annees.length);
  console.log("Classes       :", classes.length);
  console.log("Eleves        :", eleves.length);
  console.log("Matieres      :", matieres.length);
  console.log("Trimestres    :", trimestres.length);
  console.log("Notes         :", notes.length);

  await prisma.$disconnect();
  await pool.end();
}
main().catch(console.error);