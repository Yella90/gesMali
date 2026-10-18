// Applique les migrations Prisma pendant le build Vercel, en production uniquement.
// Les deploiements de previsualisation (branches, PR) partagent souvent la meme
// base : y migrer modifierait la base de production avant validation.
// Forcer ailleurs (autre hebergeur, CI) avec MIGRER_AU_BUILD=1.

import { execSync, spawnSync } from "node:child_process";

const env = process.env.VERCEL_ENV;
const force = process.env.MIGRER_AU_BUILD === "1";

if (env !== "production" && !force) {
  console.log("[migrations] ignorees (VERCEL_ENV=" + (env ?? "non defini") + ")");
  process.exit(0);
}

// 1. Lecture seule : y a-t-il des migrations en attente ? (code 0 = base a jour)
const statut = spawnSync("npx", ["prisma", "migrate", "status"], { stdio: "inherit", shell: true });
if (statut.status === 0) {
  console.log("[migrations] base a jour, rien a appliquer");
  process.exit(0);
}

// 2. Application. Le verrou "advisory lock" de Prisma ne tient pas derriere un
// pooler de connexions (Neon "-pooler", Supabase port 6543) : il expire et fait
// echouer le build. On le desactive ; un seul build de production tourne a la fois.
console.log("[migrations] prisma migrate deploy (" + (force ? "MIGRER_AU_BUILD=1" : "VERCEL_ENV=production") + ")");
execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  env: { ...process.env, PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: "1" },
});
