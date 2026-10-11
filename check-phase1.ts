import "dotenv/config";
import { Pool } from "pg";
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename='InscriptionAnnuelle'");
  if (tables.rows.length > 0) console.log("  OK  Table InscriptionAnnuelle existe");
  else console.log("  !!  Table InscriptionAnnuelle absente");

  const cols1 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='ParametresEtablissement' AND column_name IN ('reinscriptionRequise','fraisReinscription','copierAffectations','archiverNotes')");
  console.log("  Colonnes ParametresEtablissement : " + cols1.rows.map(r=>r.column_name).join(", "));

  const cols2 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='AnneeScolaire' AND column_name IN ('archivee','archiveeLe','notesSupprimees')");
  console.log("  Colonnes AnneeScolaire : " + cols2.rows.map(r=>r.column_name).join(", "));

  await pool.end();
}
main().catch(console.error);