// Tests automatises (isolation entre ecoles...), sur une base Postgres LOCALE uniquement.
//
//   1. npx prisma dev -n ges-mali-test -d     base locale sans Docker (une seule fois)
//   2. npm test
//
// TEST_DATABASE_URL change l'adresse de la base de test ; toute adresse autre que
// localhost est refusee : les tests vident la base avant de creer leurs donnees.
// Le .env (base partagee) n'est jamais utilise : DATABASE_URL et DIRECT_URL sont forces.
// La file d'envoi des e-mails (envoi-mails/schema.sql) est creee dans la meme base locale
// (MAIL_DATABASE_URL) : aucun e-mail ne part pendant les tests.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import pg from "pg";

const url = process.env.TEST_DATABASE_URL || "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable";
const hote = new URL(url).hostname;
if (!["localhost", "127.0.0.1", "[::1]"].includes(hote)) {
  console.error("[tests] base refusee : " + hote + " n'est pas une base locale");
  process.exit(1);
}

const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url, MAIL_DATABASE_URL: url, NODE_ENV: "test" };
delete env.DATABASE_SCHEMA;

function lancer(commande) {
  const r = spawnSync(commande, { stdio: "inherit", shell: true, env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// Migrations du projet appliquees a la base locale (sans rien effacer)
lancer("npx prisma migrate deploy");
const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query(readFileSync(new URL("../envoi-mails/schema.sql", import.meta.url), "utf8"));
await client.end();
// Fichiers de test executes l'un apres l'autre : ils partagent la meme base
const fichiers = process.argv.slice(2).length ? process.argv.slice(2).join(" ") : '"tests/**/*.test.ts"';
lancer("npx tsx --test --test-concurrency=1 " + fichiers);
