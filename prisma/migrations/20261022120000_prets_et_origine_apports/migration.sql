-- Apports de capital : fonds propres ou pret. Un pret a un echeancier (EcheancePret)
-- et des remboursements (mouvements REMBOURSEMENT_PRET). Ajouts seulement : les apports
-- existants gardent origineApport NULL, lu comme fonds propres.
-- CreateEnum
CREATE TYPE "OrigineApport" AS ENUM ('FONDS_PROPRES', 'PRET');

-- AlterEnum
ALTER TYPE "TypeMouvement" ADD VALUE 'REMBOURSEMENT_PRET';

-- AlterTable
ALTER TABLE "MouvementTresorerie" ADD COLUMN     "origineApport" "OrigineApport",
ADD COLUMN     "pretId" TEXT;

-- CreateTable
CREATE TABLE "Pret" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "preteur" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "tauxAnnuel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dureeMois" INTEGER NOT NULL,
    "dateObtention" TIMESTAMP(3) NOT NULL,
    "premiereEcheance" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "annule" BOOLEAN NOT NULL DEFAULT false,
    "motifAnnulation" TEXT,
    "saisieParId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EcheancePret" (
    "id" TEXT NOT NULL,
    "pretId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "dateEcheance" TIMESTAMP(3) NOT NULL,
    "capital" DOUBLE PRECISION NOT NULL,
    "interet" DOUBLE PRECISION NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "EcheancePret_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pret_etablissementId_idx" ON "Pret"("etablissementId");

-- CreateIndex
CREATE UNIQUE INDEX "EcheancePret_pretId_ordre_key" ON "EcheancePret"("pretId", "ordre");

-- CreateIndex
CREATE INDEX "MouvementTresorerie_pretId_idx" ON "MouvementTresorerie"("pretId");

-- AddForeignKey
ALTER TABLE "MouvementTresorerie" ADD CONSTRAINT "MouvementTresorerie_pretId_fkey" FOREIGN KEY ("pretId") REFERENCES "Pret"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pret" ADD CONSTRAINT "Pret_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pret" ADD CONSTRAINT "Pret_saisieParId_fkey" FOREIGN KEY ("saisieParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EcheancePret" ADD CONSTRAINT "EcheancePret_pretId_fkey" FOREIGN KEY ("pretId") REFERENCES "Pret"("id") ON DELETE CASCADE ON UPDATE CASCADE;

