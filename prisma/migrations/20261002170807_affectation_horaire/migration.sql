-- DropIndex
DROP INDEX "Affectation_enseignantId_classeId_matiereId_key";

-- AlterTable
ALTER TABLE "Affectation" ADD COLUMN     "heureDebut" TEXT,
ADD COLUMN     "heureFin" TEXT,
ADD COLUMN     "jour" TEXT;

-- CreateIndex
CREATE INDEX "Affectation_enseignantId_classeId_idx" ON "Affectation"("enseignantId", "classeId");

-- CreateIndex
CREATE INDEX "Affectation_classeId_jour_idx" ON "Affectation"("classeId", "jour");
