import "dotenv/config";
import { Pool } from "pg";
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const r = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  for (const row of r.rows) console.log("  " + row.tablename);
  await pool.end();
}
main().catch(console.error);