-- CreateEnum
CREATE TYPE "Caisse" AS ENUM ('ESPECES', 'BANQUE', 'MOBILE_MONEY');

-- CreateEnum
CREATE TYPE "TypeMouvement" AS ENUM ('APPORT_CAPITAL', 'DEPENSE', 'RETRAIT_PROMOTEUR');

-- CreateEnum
CREATE TYPE "StatutPresence" AS ENUM ('PRESENT', 'ABSENT', 'RETARD');

-- CreateTable
CREATE TABLE "MouvementTresorerie" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "type" "TypeMouvement" NOT NULL,
    "caisse" "Caisse" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "libelle" TEXT NOT NULL,
    "categorie" TEXT,
    "reference" TEXT,
    "derogation" BOOLEAN NOT NULL DEFAULT false,
    "motifDerogation" TEXT,
    "annule" BOOLEAN NOT NULL DEFAULT false,
    "motifAnnulation" TEXT,
    "saisieParId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MouvementTresorerie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepenseRecurrente" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "jourEcheance" INTEGER NOT NULL,
    "caisse" "Caisse" NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepenseRecurrente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presence" (
    "id" TEXT NOT NULL,
    "eleveId" TEXT NOT NULL,
    "classeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "statut" "StatutPresence" NOT NULL,
    "justifie" BOOLEAN NOT NULL DEFAULT false,
    "motif" TEXT,
    "dureeMinutes" INTEGER,
    "saisieParId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Presence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MouvementTresorerie_etablissementId_date_idx" ON "MouvementTresorerie"("etablissementId", "date");

-- CreateIndex
CREATE INDEX "DepenseRecurrente_etablissementId_idx" ON "DepenseRecurrente"("etablissementId");

-- CreateIndex
CREATE INDEX "Presence_classeId_date_idx" ON "Presence"("classeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Presence_eleveId_date_key" ON "Presence"("eleveId", "date");

-- AddForeignKey
ALTER TABLE "MouvementTresorerie" ADD CONSTRAINT "MouvementTresorerie_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MouvementTresorerie" ADD CONSTRAINT "MouvementTresorerie_saisieParId_fkey" FOREIGN KEY ("saisieParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepenseRecurrente" ADD CONSTRAINT "DepenseRecurrente_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "Eleve"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_saisieParId_fkey" FOREIGN KEY ("saisieParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
