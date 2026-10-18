// Applique les migrations Prisma pendant le build Vercel, en production uniquement.
// Les deploiements de previsualisation (branches, PR) partagent souvent la meme
// base : y migrer modifierait la base de production avant validation.
// Forcer ailleurs (autre hebergeur, CI) avec MIGRER_AU_BUILD=1.

import { execSync } from "node:child_process";

const env = process.env.VERCEL_ENV;
const force = process.env.MIGRER_AU_BUILD === "1";

if (env === "production" || force) {
  console.log("[migrations] prisma migrate deploy (" + (force ? "MIGRER_AU_BUILD=1" : "VERCEL_ENV=production") + ")");
  // Une migration en echec arrete le build : la version precedente reste en ligne
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
} else {
  console.log("[migrations] ignorees (VERCEL_ENV=" + (env ?? "non defini") + ")");
}
