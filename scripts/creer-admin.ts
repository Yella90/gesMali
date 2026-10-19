// Cree le compte de connexion d'un administrateur de la plateforme, sans ecole, dans la
// base du .env (celle de la production si le .env la designe).
//
//   npm run admin:creer -- vous@exemple.ml                   cree le compte
//   npm run admin:creer -- vous@exemple.ml --reinitialiser   nouveau mot de passe
//
// Le mot de passe genere s'affiche une seule fois : le changer ensuite dans « Mon compte ».
// Les droits d'administration viennent de ADMINS_PLATEFORME (Vercel) : y mettre le meme e-mail.

import { prisma } from "@/lib/db";
import { creerCompteAdministrateur } from "@/lib/auth/comptes";

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith("--"));
  if (!email) {
    console.error("Usage : npm run admin:creer -- vous@exemple.ml [--reinitialiser]");
    process.exitCode = 1;
    return;
  }

  const r = await creerCompteAdministrateur(email, { reinitialiser: args.includes("--reinitialiser") });
  if (r.cree) console.log("Compte administrateur cree : " + r.email);
  else if (r.motDePasse) console.log("Mot de passe reinitialise : " + r.email);
  else {
    console.log("Le compte " + r.email + " existe deja : connectez-vous avec son mot de passe habituel");
    console.log("(ou relancez avec --reinitialiser pour en generer un nouveau).");
  }
  if (r.motDePasse) {
    console.log("Mot de passe provisoire : " + r.motDePasse);
    console.log("A changer apres la premiere connexion, dans « Mon compte ».");
  }
  console.log("Droits d'administration : ajouter " + r.email + " a ADMINS_PLATEFORME sur Vercel, puis redeployer.");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
