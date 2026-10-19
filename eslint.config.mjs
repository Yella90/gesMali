import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Textes en francais : les apostrophes dans le JSX sont rendues correctement
      "react/no-unescaped-entities": "off",
      // Dette technique connue : a typer progressivement, ne bloque pas le build
      "@typescript-eslint/no-explicit-any": "warn",
      // Multi-ecoles : la base se lit et s'ecrit par ecole(user), filtree sur l'ecole
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/db",
              importNames: ["prisma"],
              message: "Acces non filtre a la base : utiliser ecole(user) de @/lib/data/ecole.",
            },
          ],
        },
      ],
    },
  },
  {
    // Acces non filtre autorise : connexion et utilisateur courant (recherche par e-mail ou
    // session), journal d'audit, logo public, espace parent (recherche par code), requetes
    // SQL brutes qui filtrent elles-memes par etablissementId, et donnees de test
    files: [
      "auth.ts",
      "lib/auth/session.ts",
      "lib/audit.ts",
      "lib/data/ecole.ts",
      "lib/etablissement/logo.ts",
      "lib/portail/eleve.ts",
      "lib/frais/requetes.ts",
      "lib/tresorerie/tresorerie.ts",
      "lib/tresorerie/rapport.ts",
      "lib/tableau-de-bord/finances.ts",
      "app/api/etablissements/[[]id]/logo/route.ts",
      "tests/**",
    ],
    rules: { "no-restricted-imports": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Client Prisma genere
    "lib/generated/**",
    // Scripts de maintenance locaux (hors application)
    "check-*.ts",
    "force-*.ts",
    "fix-*.ts",
    "drop-*.ts",
    "reset-password.ts",
    "test-conn.ts",
    "prisma/*.ts",
  ]),
]);

export default eslintConfig;
