import { cache } from "react";
import { prisma } from "@/lib/db";
import { codeParentValide } from "@/lib/portail/acces";

// Statuts pour lesquels l'espace parent reste ouvert
const STATUTS_ACCESSIBLES = ["INSCRIT", "DIPLOME"] as const;

// Eleve correspondant a un code parent, ou null (code inconnu, regenere, eleve radie...)
export const eleveParCodeParent = cache(async (code: string) => {
  if (!codeParentValide(code)) return null;
  const eleve = await prisma.eleve.findUnique({
    where: { codeParent: code },
    include: {
      etablissement: { select: { nom: true, adresse: true, telephone: true, email: true } },
      classe: { include: { anneeScolaire: true } },
    },
  });
  if (!eleve || !(STATUTS_ACCESSIBLES as readonly string[]).includes(eleve.statut)) return null;
  return eleve;
});
