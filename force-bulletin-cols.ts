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

    // ===== Bulletin =====
    console.log("\n--- Bulletin ---");
    const bCols = ["moyenneClasse","moyennePlusForte","moyennePlusFaible"];
    for (const col of bCols) {
      const exists = await pool.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name='Bulletin' AND column_name=$1",
        [col]
      );
      if (exists.rows.length === 0) {
        await pool.query('ALTER TABLE "Bulletin" ADD COLUMN "' + col + '" DOUBLE PRECISION');
        console.log("  + " + col);
      } else {
        console.log("  = " + col + " (deja present)");
      }
    }

    // ===== BulletinLigne =====
    console.log("\n--- BulletinLigne ---");
    const lCols = ["moyenneDevoirs","moyenneCompo","moyenneClasseMatiere"];
    for (const col of lCols) {
      const exists = await pool.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name='BulletinLigne' AND column_name=$1",
        [col]
      );
      if (exists.rows.length === 0) {
        await pool.query('ALTER TABLE "BulletinLigne" ADD COLUMN "' + col + '" DOUBLE PRECISION');
        console.log("  + " + col);
      } else {
        console.log("  = " + col + " (deja present)");
      }
    }

    // Marquer les migrations comme appliquees
    console.log("\n--- Migrations ---");
    const migs = ["20261001_bulletin_details", "20261001_email_parent"];
    for (const m of migs) {
      const ex = await pool.query(
        "SELECT migration_name FROM _prisma_migrations WHERE migration_name = $1",
        [m]
      );
      if (ex.rows.length === 0) {
        await pool.query(
          'INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, finished_at, applied_steps_count) VALUES (gen_random_uuid()::text, $1, $2, NOW(), NOW(), 1)',
          ["manual", m]
        );
        console.log("  + " + m);
      }
    }

    // Verification finale
    console.log("\n=== Verification ===");
    const cols = await pool.query(
      "SELECT table_name, column_name FROM information_schema.columns WHERE table_name IN ('Bulletin','BulletinLigne') AND column_name IN ('moyenneClasse','moyennePlusForte','moyennePlusFaible','moyenneDevoirs','moyenneCompo','moyenneClasseMatiere') ORDER BY table_name, column_name"
    );
    for (const r of cols.rows) console.log("  " + r.table_name + "." + r.column_name);
  } catch (e) {
    console.error("Erreur :", e);
    process.exit(1);
  }
  await pool.end();
}
main();