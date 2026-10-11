-- CreateEnum
CREATE TYPE "Role" AS ENUM ('DIRECTEUR', 'SECRETAIRE', 'ENSEIGNANT');

-- CreateEnum
CREATE TYPE "TypeEtablissement" AS ENUM ('PUBLIC', 'PRIVE', 'COMMUNAUTAIRE', 'MEDERSA');

-- CreateEnum
CREATE TYPE "ModeSaisieNotes" AS ENUM ('DECENTRALISEE', 'CENTRALISEE', 'MIXTE');

-- CreateEnum
CREATE TYPE "Cycle" AS ENUM ('PRESCOLAIRE', 'PREMIER_CYCLE', 'SECOND_CYCLE');

-- CreateEnum
CREATE TYPE "Sexe" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "StatutEleve" AS ENUM ('INSCRIT', 'TRANSFERE', 'RADIE', 'DIPLOME');

-- CreateEnum
CREATE TYPE "TypeAffectation" AS ENUM ('TITULAIRE', 'PROFESSEUR_MATIERE');

-- CreateEnum
CREATE TYPE "TypeNote" AS ENUM ('DEVOIR', 'COMPOSITION');

-- CreateEnum
CREATE TYPE "StatutNote" AS ENUM ('BROUILLON', 'SOUMISE', 'VALIDEE', 'VERROUILLEE');

-- CreateEnum
CREATE TYPE "DecisionBulletin" AS ENUM ('ADMIS', 'REDOUBLE', 'ADMIS_AVEC_RESERVE', 'EN_ATTENTE');

-- CreateEnum
CREATE TYPE "TypePaiement" AS ENUM ('MENSUEL', 'HORAIRE', 'PRIME', 'AVANCE', 'REMBOURSEMENT');

-- CreateEnum
CREATE TYPE "ModePaiement" AS ENUM ('ESPECES', 'VIREMENT', 'MOBILE_MONEY', 'CHEQUE');

-- CreateEnum
CREATE TYPE "StatutPaiement" AS ENUM ('PAYE', 'EN_ATTENTE', 'ANNULE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "telephone" TEXT,
    "roles" "Role"[],
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "etablissementId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Etablissement" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "TypeEtablissement" NOT NULL,
    "adresse" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "logo" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Etablissement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParametresEtablissement" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "modeSaisieNotes" "ModeSaisieNotes" NOT NULL DEFAULT 'DECENTRALISEE',
    "validationObligatoire" BOOLEAN NOT NULL DEFAULT true,
    "ponderationDevoirs" DOUBLE PRECISION NOT NULL DEFAULT 0.333,
    "ponderationCompo" DOUBLE PRECISION NOT NULL DEFAULT 0.667,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParametresEtablissement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnneeScolaire" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AnneeScolaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trimestre" (
    "id" TEXT NOT NULL,
    "anneeScolaireId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "cloture" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Trimestre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Matiere" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "code" TEXT,
    "cycle" "Cycle" NOT NULL,
    "coefficient" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Matiere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classe" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "anneeScolaireId" TEXT NOT NULL,
    "nom" TEXT,
    "niveau" INTEGER NOT NULL,
    "cycle" "Cycle" NOT NULL,
    "section" TEXT,
    "salle" TEXT,
    "fraisInscription" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fraisScolariteMensuel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capaciteMax" INTEGER NOT NULL DEFAULT 50,
    "titulaireId" TEXT,
    "professeurPrincipalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Classe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Eleve" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "matricule" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "dateNaissance" TIMESTAMP(3) NOT NULL,
    "sexe" "Sexe" NOT NULL,
    "tuteurNom" TEXT,
    "tuteurTelephone" TEXT,
    "classeId" TEXT,
    "statut" "StatutEleve" NOT NULL DEFAULT 'INSCRIT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Eleve_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Affectation" (
    "id" TEXT NOT NULL,
    "enseignantId" TEXT NOT NULL,
    "classeId" TEXT NOT NULL,
    "matiereId" TEXT,
    "type" "TypeAffectation" NOT NULL,

    CONSTRAINT "Affectation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "eleveId" TEXT NOT NULL,
    "matiereId" TEXT NOT NULL,
    "classeId" TEXT NOT NULL,
    "trimestreId" TEXT NOT NULL,
    "type" "TypeNote" NOT NULL,
    "numero" INTEGER NOT NULL,
    "valeur" DOUBLE PRECISION,
    "sur" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "statut" "StatutNote" NOT NULL DEFAULT 'BROUILLON',
    "saisieParId" TEXT NOT NULL,
    "modifieeParId" TEXT,
    "modifieeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bulletin" (
    "id" TEXT NOT NULL,
    "eleveId" TEXT NOT NULL,
    "trimestreId" TEXT NOT NULL,
    "classeId" TEXT NOT NULL,
    "moyenneGenerale" DOUBLE PRECISION NOT NULL,
    "totalPoints" DOUBLE PRECISION NOT NULL,
    "totalCoeffs" INTEGER NOT NULL,
    "rang" INTEGER,
    "effectifClasse" INTEGER NOT NULL,
    "appreciation" TEXT,
    "decision" "DecisionBulletin",
    "genereParId" TEXT NOT NULL,
    "genereLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Bulletin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulletinLigne" (
    "id" TEXT NOT NULL,
    "bulletinId" TEXT NOT NULL,
    "matiereId" TEXT NOT NULL,
    "nomMatiere" TEXT NOT NULL,
    "moyenneMatiere" DOUBLE PRECISION NOT NULL,
    "coefficient" INTEGER NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,
    "rangMatiere" INTEGER,
    "appreciation" TEXT,
    "professeurId" TEXT,
    "nomProfesseur" TEXT,

    CONSTRAINT "BulletinLigne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "enseignantId" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "type" "TypePaiement" NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "nombreHeures" DOUBLE PRECISION,
    "tauxHoraire" DOUBLE PRECISION,
    "brut" DOUBLE PRECISION,
    "net" DOUBLE PRECISION,
    "cotisations" DOUBLE PRECISION,
    "datePaiement" TIMESTAMP(3) NOT NULL,
    "modePaiement" "ModePaiement" NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "statut" "StatutPaiement" NOT NULL DEFAULT 'PAYE',
    "saisieParId" TEXT NOT NULL,
    "annuleParId" TEXT,
    "motifAnnulation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraisScolarite" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "eleveId" TEXT NOT NULL,
    "anneeScolaireId" TEXT NOT NULL,
    "fraisInscription" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fraisScolariteMensuel" DOUBLE PRECISION NOT NULL,
    "reduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FraisScolarite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrancheFrais" (
    "id" TEXT NOT NULL,
    "fraisId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "dateEcheance" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrancheFrais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaiementFrais" (
    "id" TEXT NOT NULL,
    "trancheId" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "datePaiement" TIMESTAMP(3) NOT NULL,
    "mode" "ModePaiement" NOT NULL,
    "reference" TEXT,
    "recuNumero" TEXT NOT NULL,
    "annule" BOOLEAN NOT NULL DEFAULT false,
    "motifAnnulation" TEXT,
    "saisieParId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaiementFrais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rappel" (
    "id" TEXT NOT NULL,
    "trancheId" TEXT NOT NULL,
    "dateRappel" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "envoye" BOOLEAN NOT NULL DEFAULT false,
    "contenu" TEXT,
    "saisieParId" TEXT NOT NULL,

    CONSTRAINT "Rappel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "entiteId" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_etablissementId_idx" ON "User"("etablissementId");

-- CreateIndex
CREATE UNIQUE INDEX "ParametresEtablissement_etablissementId_key" ON "ParametresEtablissement"("etablissementId");

-- CreateIndex
CREATE UNIQUE INDEX "AnneeScolaire_etablissementId_libelle_key" ON "AnneeScolaire"("etablissementId", "libelle");

-- CreateIndex
CREATE UNIQUE INDEX "Trimestre_anneeScolaireId_ordre_key" ON "Trimestre"("anneeScolaireId", "ordre");

-- CreateIndex
CREATE UNIQUE INDEX "Matiere_etablissementId_nom_cycle_key" ON "Matiere"("etablissementId", "nom", "cycle");

-- CreateIndex
CREATE UNIQUE INDEX "Classe_etablissementId_anneeScolaireId_niveau_section_key" ON "Classe"("etablissementId", "anneeScolaireId", "niveau", "section");

-- CreateIndex
CREATE INDEX "Eleve_classeId_statut_idx" ON "Eleve"("classeId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "Eleve_etablissementId_matricule_key" ON "Eleve"("etablissementId", "matricule");

-- CreateIndex
CREATE UNIQUE INDEX "Affectation_enseignantId_classeId_matiereId_key" ON "Affectation"("enseignantId", "classeId", "matiereId");

-- CreateIndex
CREATE INDEX "Note_classeId_trimestreId_statut_idx" ON "Note"("classeId", "trimestreId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "Note_eleveId_matiereId_trimestreId_type_numero_key" ON "Note"("eleveId", "matiereId", "trimestreId", "type", "numero");

-- CreateIndex
CREATE INDEX "Bulletin_classeId_trimestreId_moyenneGenerale_idx" ON "Bulletin"("classeId", "trimestreId", "moyenneGenerale" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Bulletin_eleveId_trimestreId_key" ON "Bulletin"("eleveId", "trimestreId");

-- CreateIndex
CREATE UNIQUE INDEX "BulletinLigne_bulletinId_matiereId_key" ON "BulletinLigne"("bulletinId", "matiereId");

-- CreateIndex
CREATE INDEX "Paiement_etablissementId_datePaiement_idx" ON "Paiement"("etablissementId", "datePaiement");

-- CreateIndex
CREATE INDEX "Paiement_enseignantId_periode_idx" ON "Paiement"("enseignantId", "periode");

-- CreateIndex
CREATE UNIQUE INDEX "FraisScolarite_eleveId_anneeScolaireId_key" ON "FraisScolarite"("eleveId", "anneeScolaireId");

-- CreateIndex
CREATE INDEX "TrancheFrais_periode_idx" ON "TrancheFrais"("periode");

-- CreateIndex
CREATE UNIQUE INDEX "TrancheFrais_fraisId_ordre_key" ON "TrancheFrais"("fraisId", "ordre");

-- CreateIndex
CREATE UNIQUE INDEX "PaiementFrais_recuNumero_key" ON "PaiementFrais"("recuNumero");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entite_entiteId_idx" ON "AuditLog"("entite", "entiteId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParametresEtablissement" ADD CONSTRAINT "ParametresEtablissement_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnneeScolaire" ADD CONSTRAINT "AnneeScolaire_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trimestre" ADD CONSTRAINT "Trimestre_anneeScolaireId_fkey" FOREIGN KEY ("anneeScolaireId") REFERENCES "AnneeScolaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matiere" ADD CONSTRAINT "Matiere_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classe" ADD CONSTRAINT "Classe_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classe" ADD CONSTRAINT "Classe_anneeScolaireId_fkey" FOREIGN KEY ("anneeScolaireId") REFERENCES "AnneeScolaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classe" ADD CONSTRAINT "Classe_titulaireId_fkey" FOREIGN KEY ("titulaireId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classe" ADD CONSTRAINT "Classe_professeurPrincipalId_fkey" FOREIGN KEY ("professeurPrincipalId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Eleve" ADD CONSTRAINT "Eleve_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Eleve" ADD CONSTRAINT "Eleve_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Affectation" ADD CONSTRAINT "Affectation_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Affectation" ADD CONSTRAINT "Affectation_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Affectation" ADD CONSTRAINT "Affectation_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "Matiere"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "Eleve"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "Matiere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_trimestreId_fkey" FOREIGN KEY ("trimestreId") REFERENCES "Trimestre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_saisieParId_fkey" FOREIGN KEY ("saisieParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_modifieeParId_fkey" FOREIGN KEY ("modifieeParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "Eleve"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_trimestreId_fkey" FOREIGN KEY ("trimestreId") REFERENCES "Trimestre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_genereParId_fkey" FOREIGN KEY ("genereParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinLigne" ADD CONSTRAINT "BulletinLigne_bulletinId_fkey" FOREIGN KEY ("bulletinId") REFERENCES "Bulletin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinLigne" ADD CONSTRAINT "BulletinLigne_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "Matiere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_saisieParId_fkey" FOREIGN KEY ("saisieParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_annuleParId_fkey" FOREIGN KEY ("annuleParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraisScolarite" ADD CONSTRAINT "FraisScolarite_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraisScolarite" ADD CONSTRAINT "FraisScolarite_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "Eleve"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraisScolarite" ADD CONSTRAINT "FraisScolarite_anneeScolaireId_fkey" FOREIGN KEY ("anneeScolaireId") REFERENCES "AnneeScolaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrancheFrais" ADD CONSTRAINT "TrancheFrais_fraisId_fkey" FOREIGN KEY ("fraisId") REFERENCES "FraisScolarite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaiementFrais" ADD CONSTRAINT "PaiementFrais_trancheId_fkey" FOREIGN KEY ("trancheId") REFERENCES "TrancheFrais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaiementFrais" ADD CONSTRAINT "PaiementFrais_saisieParId_fkey" FOREIGN KEY ("saisieParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rappel" ADD CONSTRAINT "Rappel_trancheId_fkey" FOREIGN KEY ("trancheId") REFERENCES "TrancheFrais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rappel" ADD CONSTRAINT "Rappel_saisieParId_fkey" FOREIGN KEY ("saisieParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
