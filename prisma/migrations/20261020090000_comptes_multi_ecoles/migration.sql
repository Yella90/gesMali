-- Comptes multi-ecoles, statut des ecoles (essai, active, suspendue), journal d'audit par ecole.
-- Sans suppression : les colonnes d'origine de User (fiche, ecole, roles) restent, et
-- l'ancienne version de l'application continue de fonctionner pendant le deploiement.

-- Statut des ecoles
CREATE TYPE "StatutEtablissement" AS ENUM ('ESSAI', 'ACTIF', 'SUSPENDU');

ALTER TABLE "Etablissement" ADD COLUMN "finEssai" TIMESTAMP(3),
ADD COLUMN "statut" "StatutEtablissement" NOT NULL DEFAULT 'ACTIF';

UPDATE "Etablissement" SET "statut" = 'SUSPENDU' WHERE "actif" = false;

-- Acces d'un compte a une ecole
CREATE TABLE "Acces" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "employeId" TEXT NOT NULL,
    "roles" "Role"[],
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Acces_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Acces_employeId_key" ON "Acces"("employeId");
CREATE INDEX "Acces_etablissementId_idx" ON "Acces"("etablissementId");
CREATE UNIQUE INDEX "Acces_userId_etablissementId_key" ON "Acces"("userId", "etablissementId");

ALTER TABLE "Acces" ADD CONSTRAINT "Acces_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Acces" ADD CONSTRAINT "Acces_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Acces" ADD CONSTRAINT "Acces_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "Employe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Chaque compte existant garde son acces a son ecole d'origine
INSERT INTO "Acces" ("id", "userId", "etablissementId", "employeId", "roles", "actif", "createdAt")
SELECT 'acces_' || "id", "id", "etablissementId", "employeId", "roles", "actif", "createdAt" FROM "User";

-- Journal d'audit : ecole concernee (lignes existantes : ecole d'origine de leur auteur)
ALTER TABLE "AuditLog" ADD COLUMN "etablissementId" TEXT;

UPDATE "AuditLog" a SET "etablissementId" = u."etablissementId" FROM "User" u WHERE u."id" = a."userId";

CREATE INDEX "AuditLog_etablissementId_createdAt_idx" ON "AuditLog"("etablissementId", "createdAt");

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
