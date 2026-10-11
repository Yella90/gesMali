import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const REMPLACEMENTS: Record<string, string> = {
  "F{{e}}vrier": "Février",
  "D{{e}}cembre": "Décembre",
  "Ao{{u}}t": "Août",
  "F{{e}}v": "Fév",
  "D{{e}}c": "Déc",
};

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("=== Nettoyage des libelles en base ===\n");

  // 1. TrancheFrais.libelle
  const tranches = await prisma.trancheFrais.findMany();
  let modifsTranches = 0;
  for (const t of tranches) {
    let nouveau = t.libelle;
    for (const [k, v] of Object.entries(REMPLACEMENTS)) {
      if (nouveau.includes(k)) nouveau = nouveau.replace(new RegExp(k.replace(/[{}]/g, "\\$&"), "g"), v);
    }
    if (nouveau !== t.libelle) {
      await prisma.trancheFrais.update({ where: { id: t.id }, data: { libelle: nouveau } });
      modifsTranches++;
    }
  }
  console.log("  TrancheFrais : " + modifsTranches + " modifiee(s) sur " + tranches.length);

  // 2. Rappel.contenu (peut contenir le libelle)
  const rappels = await prisma.rappel.findMany();
  let modifsRappels = 0;
  for (const r of rappels) {
    if (!r.contenu) continue;
    let nouveau = r.contenu;
    for (const [k, v] of Object.entries(REMPLACEMENTS)) {
      if (nouveau.includes(k)) nouveau = nouveau.replace(new RegExp(k.replace(/[{}]/g, "\\$&"), "g"), v);
    }
    if (nouveau !== r.contenu) {
      await prisma.rappel.update({ where: { id: r.id }, data: { contenu: nouveau } });
      modifsRappels++;
    }
  }
  console.log("  Rappel : " + modifsRappels + " modifie(s) sur " + rappels.length);

  await prisma.$disconnect();
  await pool.end();
  console.log("\n=== Termine ===");
}
main().catch((e) => { console.error(e); process.exit(1); });