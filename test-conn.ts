import "dotenv/config";
import { Pool } from "pg";
async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  try {
    const r = await pool.query("SELECT NOW() as now");
    console.log("  OK  Connexion reussie :", r.rows[0].now);
  } catch (e: any) {
    console.error("  !!  Echec :", e.message);
    process.exit(1);
  }
  await pool.end();
}
main();