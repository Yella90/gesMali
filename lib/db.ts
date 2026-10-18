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
// Parametres propres a Prisma, inconnus du driver pg
url.searchParams.delete("schema");
url.searchParams.delete("pgbouncer");
const connectionString = url.toString();

const isLocal =
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1");

// Pool configure pour Neon (connexions qui se ferment)
function creerPool() {
  const p = new Pool({
    connectionString,
    // Certificat verifie (Neon a un certificat valide). DATABASE_SSL_NO_VERIFY=1 pour un
    // serveur au certificat auto-signe uniquement.
    ssl: isLocal ? false : { rejectUnauthorized: process.env.DATABASE_SSL_NO_VERIFY !== "1" },
    max: 5, // Limiter les connexions simultanees
    idleTimeoutMillis: 30000, // Fermer les connexions inactives apres 30s
    connectionTimeoutMillis: 10000, // Timeout de connexion 10s
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });
  // Gestion d'erreur sur le pool (une seule fois par pool, meme apres rechargement a chaud)
  p.on("error", (err) => {
    console.error("[pg pool error]", err.message);
  });
  return p;
}

const pool = globalForPrisma.pool ?? creerPool();

// Schema PostgreSQL de l'application ("public" par defaut). Une instance de demonstration
// peut vivre dans un schema dedie d'un projet partage (ex. DATABASE_SCHEMA=ges_mali).
export const DB_SCHEMA = process.env.DATABASE_SCHEMA || "public";
if (!/^[a-z_][a-z0-9_]*$/.test(DB_SCHEMA)) throw new Error("DATABASE_SCHEMA invalide");

const adapter = new PrismaPg(pool, { schema: DB_SCHEMA });

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