import "dotenv/config";
import { PrismaClient } from "./lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const email = "doumbialayesoma@gmail.com";
  const nouveauMotDePasse = "ChangeMoi123!";
  const hash = await bcrypt.hash(nouveauMotDePasse, 10);

  await prisma.user.update({
    where: { email },
    data: { passwordHash: hash, actif: true },
  });

  console.log("OK  mot de passe reinitialise");
  console.log("    Email    : " + email);
  console.log("    Mot de passe : " + nouveauMotDePasse);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});