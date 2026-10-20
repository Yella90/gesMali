-- Dernier changement de mot de passe : les sessions ouvertes avant sont fermees
ALTER TABLE "User" ADD COLUMN "motDePasseModifieLe" TIMESTAMP(3);
