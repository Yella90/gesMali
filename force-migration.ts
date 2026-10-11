import "dotenv/config";
import { Pool } from "pg";
async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  try {
    console.log("Connexion...");
    const test = await pool.query("SELECT NOW()");
    console.log("OK", test.rows[0].now);

    // Verifier si la colonne existe
    const check = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='Eleve' AND column_name='emailParent'"
    );
    if (check.rows.length > 0) {
      console.log("La colonne emailParent existe deja.");
    } else {
      console.log("Ajout de la colonne emailParent...");
      await pool.query('ALTER TABLE "Eleve" ADD COLUMN "emailParent" TEXT');
      console.log("OK Colonne ajoutee");
    }

    // Marquer la migration comme appliquee
    const migName = "20261001_email_parent";
    const exists = await pool.query(
      "SELECT migration_name FROM _prisma_migrations WHERE migration_name = $1",
      [migName]
    );
    if (exists.rows.length === 0) {
      await pool.query(
        'INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, finished_at, applied_steps_count) VALUES (gen_random_uuid()::text, $1, $2, NOW(), NOW(), 1)',
        ["manual", migName]
      );
      console.log("OK Migration marquee comme appliquee");
    }

    // Verifier a nouveau
    const final = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='Eleve' ORDER BY ordinal_position"
    );
    console.log("\nColonnes de Eleve :");
    for (const row of final.rows) console.log("  " + row.column_name);
  } catch (e) {
    console.error("Erreur :", e);
    process.exit(1);
  }
  await pool.end();
}
main();