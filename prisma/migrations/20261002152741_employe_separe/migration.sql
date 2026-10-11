/*
  Warnings:

  - You are about to drop the column `enseignantId` on the `Paiement` table. All the data in the column will be lost.
  - You are about to drop the column `nom` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `prenom` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `telephone` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[employeId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `employeId` to the `Paiement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `employeId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'COMPTABLE';

-- DropForeignKey
ALTER TABLE "Affectation" DROP CONSTRAINT "Affectation_enseignantId_fkey";

-- DropForeignKey
ALTER TABLE "Classe" DROP CONSTRAINT "Classe_professeurPrincipalId_fkey";

-- DropForeignKey
ALTER TABLE "Classe" DROP CONSTRAINT "Classe_titulaireId_fkey";

-- DropForeignKey
ALTER TABLE "Paiement" DROP CONSTRAINT "Paiement_enseignantId_fkey";

-- DropIndex
DROP INDEX "Paiement_enseignantId_periode_idx";

-- AlterTable
ALTER TABLE "Bulletin" ADD COLUMN     "moyenneClasse" DOUBLE PRECISION,
ADD COLUMN     "moyennePlusFaible" DOUBLE PRECISION,
ADD COLUMN     "moyennePlusForte" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "BulletinLigne" ADD COLUMN     "moyenneClasseMatiere" DOUBLE PRECISION,
ADD COLUMN     "moyenneCompo" DOUBLE PRECISION,
ADD COLUMN     "moyenneDevoirs" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Classe" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Paiement" DROP COLUMN "enseignantId",
ADD COLUMN     "employeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "nom",
DROP COLUMN "prenom",
DROP COLUMN "telephone",
ADD COLUMN     "employeId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Employe" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "telephone" TEXT,
    "poste" TEXT NOT NULL,
    "posteLibre" TEXT,
    "dateEmbauche" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateSortie" TIMESTAMP(3),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "salaireReference" DOUBLE PRECISION,
    "typeRemuneration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Employe_etablissementId_actif_idx" ON "Employe"("etablissementId", "actif");

-- CreateIndex
CREATE INDEX "Employe_nom_prenom_idx" ON "Employe"("nom", "prenom");

-- CreateIndex
CREATE INDEX "Paiement_employeId_periode_idx" ON "Paiement"("employeId", "periode");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeId_key" ON "User"("employeId");

-- AddForeignKey
ALTER TABLE "Employe" ADD CONSTRAINT "Employe_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "Employe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classe" ADD CONSTRAINT "Classe_titulaireId_fkey" FOREIGN KEY ("titulaireId") REFERENCES "Employe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classe" ADD CONSTRAINT "Classe_professeurPrincipalId_fkey" FOREIGN KEY ("professeurPrincipalId") REFERENCES "Employe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Affectation" ADD CONSTRAINT "Affectation_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "Employe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinLigne" ADD CONSTRAINT "BulletinLigne_professeurId_fkey" FOREIGN KEY ("professeurId") REFERENCES "Employe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "Employe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
