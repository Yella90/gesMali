import "dotenv/config";
import { Pool } from "pg";
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

  const tables = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('InscriptionAnnuelle','AnneeScolaire','ParametresEtablissement') ORDER BY tablename"
  );
  console.log("Tables :");
  for (const r of tables.rows) console.log("  " + r.tablename);

  const cols = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='ParametresEtablissement' AND column_name LIKE '%Reinscription%' OR (table_name='ParametresEtablissement' AND column_name='reinscriptionRequise')"
  );
  console.log("\nNouveaux parametres :");
  for (const r of cols.rows) console.log("  " + r.column_name);

  await pool.end();
}
main().catch(console.error);