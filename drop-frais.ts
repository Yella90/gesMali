import "dotenv/config";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();
  await client.query('DROP TABLE IF EXISTS "PaiementFrais" CASCADE');
  await client.query('DROP TABLE IF EXISTS "TrancheFrais" CASCADE');
  await client.query('DROP TABLE IF EXISTS "FraisScolarite" CASCADE');
  client.release();
  await pool.end();
  console.log("Tables Frais supprimees");
}
main().catch((e) => { console.error(e); process.exit(1); });