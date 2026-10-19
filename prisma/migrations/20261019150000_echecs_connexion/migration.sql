-- Echecs de connexion par e-mail et par adresse IP (blocage temporaire commun a tous les serveurs)
CREATE TABLE "EchecConnexion" (
    "cle" TEXT NOT NULL,
    "nombre" INTEGER NOT NULL DEFAULT 1,
    "depuis" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EchecConnexion_pkey" PRIMARY KEY ("cle")
);

CREATE INDEX "EchecConnexion_depuis_idx" ON "EchecConnexion"("depuis");
