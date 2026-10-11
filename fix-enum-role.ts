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

    // 1. Verifier les valeurs actuelles de l'enum
    console.log("\n--- Valeurs actuelles de l'enum Role ---");
    const valeurs = await pool.query(
      "SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role') ORDER BY enumsortorder"
    );
    for (const r of valeurs.rows) console.log("  " + r.enumlabel);

    // 2. Ajouter COMPTABLE si absent
    const aComptable = valeurs.rows.some((r: any) => r.enumlabel === "COMPTABLE");
    if (!aComptable) {
      console.log("\nAjout de COMPTABLE a l'enum...");
      await pool.query(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'COMPTABLE'`);
      console.log("OK COMPTABLE ajoute");
    } else {
      console.log("\nCOMPTABLE deja present");
    }

    // 3. Verifier apres ajout
    console.log("\n--- Valeurs apres ajout ---");
    const final = await pool.query(
      "SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role') ORDER BY enumsortorder"
    );
    for (const r of final.rows) console.log("  " + r.enumlabel);

    // 4. Marquer la migration comme appliquee
    const migName = "20261001_role_comptable";
    const migExist = await pool.query(
      "SELECT migration_name FROM _prisma_migrations WHERE migration_name = $1",
      [migName]
    );
    if (migExist.rows.length === 0) {
      await pool.query(
        'INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, finished_at, applied_steps_count) VALUES (gen_random_uuid()::text, $1, $2, NOW(), NOW(), 1)',
        ["manual", migName]
      );
      console.log("\nMigration " + migName + " enregistree");
    }

    console.log("\n=== Termine ===");
  } catch (e) {
    console.error("Erreur :", e);
    process.exit(1);
  }
  await pool.end();
}
main();