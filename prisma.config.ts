import "dotenv/config";
import { defineConfig } from "@prisma/config";

// La CLI Prisma (migrations) utilise DIRECT_URL si elle est definie : avec Neon, l'URL
// directe (sans "-pooler") ; avec Supabase, le "Session pooler" (port 5432).
// L'application, elle, utilise toujours DATABASE_URL (lib/db.ts).
const brute = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!brute) throw new Error("DATABASE_URL manquant");

// Meme schema que l'application (DATABASE_SCHEMA, "public" par defaut)
const url = new URL(brute);
if (process.env.DATABASE_SCHEMA && !url.searchParams.has("schema")) {
  url.searchParams.set("schema", process.env.DATABASE_SCHEMA);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: url.toString() },
});
