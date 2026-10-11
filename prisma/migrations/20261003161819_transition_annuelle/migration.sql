-- CreateEnum
CREATE TYPE "DecisionEleve" AS ENUM ('INSCRIT', 'ADMIS', 'REDOUBLE', 'DIPLOME', 'TRANSFERE');

-- AlterTable
ALTER TABLE "AnneeScolaire" ADD COLUMN     "archivee" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "archiveeLe" TIMESTAMP(3),
ADD COLUMN     "notesSupprimees" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ParametresEtablissement" ADD COLUMN     "archiverNotes" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "copierAffectations" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "fraisReinscription" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "reinscriptionRequise" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "InscriptionAnnuelle" (
    "id" TEXT NOT NULL,
    "eleveId" TEXT NOT NULL,
    "classeId" TEXT NOT NULL,
    "anneeScolaireId" TEXT NOT NULL,
    "decision" "DecisionEleve" NOT NULL,
    "moyenneAnnuelle" DOUBLE PRECISION,
    "dateInscription" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InscriptionAnnuelle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InscriptionAnnuelle_classeId_idx" ON "InscriptionAnnuelle"("classeId");

-- CreateIndex
CREATE INDEX "InscriptionAnnuelle_anneeScolaireId_idx" ON "InscriptionAnnuelle"("anneeScolaireId");

-- CreateIndex
CREATE UNIQUE INDEX "InscriptionAnnuelle_eleveId_anneeScolaireId_key" ON "InscriptionAnnuelle"("eleveId", "anneeScolaireId");

-- AddForeignKey
ALTER TABLE "InscriptionAnnuelle" ADD CONSTRAINT "InscriptionAnnuelle_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "Eleve"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscriptionAnnuelle" ADD CONSTRAINT "InscriptionAnnuelle_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscriptionAnnuelle" ADD CONSTRAINT "InscriptionAnnuelle_anneeScolaireId_fkey" FOREIGN KEY ("anneeScolaireId") REFERENCES "AnneeScolaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
