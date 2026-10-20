-- Liens envoyes par e-mail (inscription, confirmation d'adresse, mot de passe oublie),
-- adresse confirmee des comptes, numeros de recu propres a chaque ecole.
-- Aucun numero de recu existant n'est modifie.

-- Liens envoyes par e-mail
CREATE TYPE "TypeJeton" AS ENUM ('INSCRIPTION', 'VERIFICATION', 'REINITIALISATION');

CREATE TABLE "JetonEmail" (
    "id" TEXT NOT NULL,
    "type" "TypeJeton" NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "donnees" JSONB,
    "empreinte" TEXT NOT NULL,
    "expireLe" TIMESTAMP(3) NOT NULL,
    "utiliseLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JetonEmail_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JetonEmail_empreinte_key" ON "JetonEmail"("empreinte");
CREATE INDEX "JetonEmail_email_type_idx" ON "JetonEmail"("email", "type");
ALTER TABLE "JetonEmail" ADD CONSTRAINT "JetonEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Adresse confirmee (comptes existants : non confirmee)
ALTER TABLE "User" ADD COLUMN "emailVerifieLe" TIMESTAMP(3);

-- Paiements de frais : ecole du paiement (echeance -> frais -> ecole)
ALTER TABLE "PaiementFrais" ADD COLUMN "etablissementId" TEXT;

UPDATE "PaiementFrais" p SET "etablissementId" = f."etablissementId"
FROM "TrancheFrais" t JOIN "FraisScolarite" f ON f."id" = t."fraisId"
WHERE t."id" = p."trancheId";

ALTER TABLE "PaiementFrais" ALTER COLUMN "etablissementId" SET NOT NULL;
ALTER TABLE "PaiementFrais" ADD CONSTRAINT "PaiementFrais_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Numero de recu unique par ecole (et non plus dans toute la base)
DROP INDEX "PaiementFrais_recuNumero_key";
CREATE UNIQUE INDEX "PaiementFrais_etablissementId_recuNumero_key" ON "PaiementFrais"("etablissementId", "recuNumero");

-- Compteur de recus par ecole et par annee
CREATE TABLE "CompteurRecu" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "dernier" INTEGER NOT NULL,

    CONSTRAINT "CompteurRecu_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompteurRecu_etablissementId_annee_key" ON "CompteurRecu"("etablissementId", "annee");
ALTER TABLE "CompteurRecu" ADD CONSTRAINT "CompteurRecu_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
