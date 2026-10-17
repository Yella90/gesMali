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
    },
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
