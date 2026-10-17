-- AlterTable
ALTER TABLE "Eleve" ADD COLUMN     "codeParent" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Eleve_codeParent_key" ON "Eleve"("codeParent");

-- CreateIndex
CREATE INDEX "PaiementFrais_trancheId_idx" ON "PaiementFrais"("trancheId");

-- CreateIndex
CREATE INDEX "Rappel_trancheId_idx" ON "Rappel"("trancheId");
