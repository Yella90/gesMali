-- Transferts entre caisses (especes, banque, Mobile Money) : un mouvement TRANSFERT sort
-- de "caisse" et entre dans "caisseDestination" ; ni recette ni depense.
ALTER TYPE "TypeMouvement" ADD VALUE 'TRANSFERT';

ALTER TABLE "MouvementTresorerie" ADD COLUMN "caisseDestination" "Caisse";

-- Caisse d'arrivee pour un transfert seulement, et differente de la caisse de depart
-- ("type"::text : la nouvelle valeur de l'enum ne peut pas servir dans la meme transaction)
ALTER TABLE "MouvementTresorerie" ADD CONSTRAINT "MouvementTresorerie_transfert_check" CHECK (
  ("type"::text = 'TRANSFERT') = ("caisseDestination" IS NOT NULL)
  AND ("caisseDestination" IS NULL OR "caisseDestination" <> "caisse")
);
