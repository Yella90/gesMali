-- Administrateur de la plateforme sans ecole : la fiche et l'ecole d'origine d'un compte
-- deviennent facultatives (aucune donnee modifiee).
ALTER TABLE "User" ALTER COLUMN "etablissementId" DROP NOT NULL,
ALTER COLUMN "employeId" DROP NOT NULL;
