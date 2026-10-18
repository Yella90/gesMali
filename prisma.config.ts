import "dotenv/config";
import { defineConfig } from "@prisma/config";

// La CLI Prisma (migrations) utilise DIRECT_URL si elle est definie : avec Neon,
// l'URL directe (sans "-pooler") est recommandee pour les migrations.
// L'application, elle, utilise toujours DATABASE_URL (lib/db.ts).
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL manquant");

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url },
});
