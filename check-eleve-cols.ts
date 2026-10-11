import "dotenv/config";
import { Pool } from "pg";
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const r = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'Eleve' ORDER BY ordinal_position"
  );
  for (const row of r.rows) console.log("  " + row.column_name);
  await pool.end();
}
main().catch(console.error);