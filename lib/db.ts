import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) throw new Error("DATABASE_URL manquant");

// Nettoyer l'URL des parametres sslmode problematiques
const url = new URL(rawUrl);
url.searchParams.delete("sslmode");
url.searchParams.delete("channel_binding");
const connectionString = url.toString();

const isLocal =
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1");

// Pool configure pour Neon (connexions qui se ferment)
const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 5, // Limiter les connexions simultanees
    idleTimeoutMillis: 30000, // Fermer les connexions inactives apres 30s
    connectionTimeoutMillis: 10000, // Timeout de connexion 10s
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}

// Gestion d'erreur sur le pool
pool.on("error", (err) => {
  console.error("[pg pool error]", err.message);
});