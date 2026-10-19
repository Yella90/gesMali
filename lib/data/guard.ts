import { cache } from "react";
import { prisma } from "@/lib/db";
import type { UtilisateurCourant } from "@/lib/auth/session";

export async function verifierEleve(user: UtilisateurCourant, eleveId: string) {
  const eleve = await prisma.eleve.findUnique({
    where: { id: eleveId },
    select: { id: true, classeId: true, etablissementId: true, statut: true },
  });
  if (!eleve) throw new Error("Eleve introuvable");
  if (eleve.etablissementId !== user.etablissementId) throw new Error("Acces refuse");
  if (!eleve.classeId) throw new Error("Eleve sans classe");
  return eleve as { id: string; classeId: string; etablissementId: string; statut: string };
}

export async function verifierClasse(user: UtilisateurCourant, classeId: string) {
  const classe = await prisma.classe.findUnique({
    where: { id: classeId },
    select: { id: true, etablissementId: true, cycle: true, anneeScolaireId: true },
  });
  if (!classe) throw new Error("Classe introuvable");
  if (classe.etablissementId !== user.etablissementId) throw new Error("Acces refuse");
  const visibles = await classesVisibles(user);
  if (visibles && !visibles.includes(classeId)) throw new Error("Acces refuse : classe non affectee");
  return classe;
}

// Un utilisateur qui n'est QU'enseignant ne voit que ses classes : affectations,
// titulaire ou professeur principal. null = toutes les classes de l'etablissement.
export function estEnseignantSeul(user: UtilisateurCourant): boolean {
  return user.roles.includes("ENSEIGNANT") && !user.roles.some((r) => r === "DIRECTEUR" || r === "SECRETAIRE" || r === "COMPTABLE");
}

export const classesVisibles = cache(async (user: UtilisateurCourant): Promise<string[] | null> => {
  if (!estEnseignantSeul(user)) return null;
  const [affectations, classes] = await Promise.all([
    prisma.affectation.findMany({ where: { enseignantId: user.employeId }, select: { classeId: true } }),
    prisma.classe.findMany({
      where: {
        etablissementId: user.etablissementId,
        OR: [{ titulaireId: user.employeId }, { professeurPrincipalId: user.employeId }],
      },
      select: { id: true },
    }),
  ]);
  return [...new Set([...affectations.map((a) => a.classeId), ...classes.map((c) => c.id)])];
});

// Filtre Prisma a ajouter aux listes de classes (ou d'eleves via classeId)
export async function filtreClasses(user: UtilisateurCourant) {
  const v = await classesVisibles(user);
  return v ? { id: { in: v } } : {};
}
export async function filtreClasseId(user: UtilisateurCourant) {
  const v = await classesVisibles(user);
  return v ? { classeId: { in: v } } : {};
}

export async function verifierMatiere(user: UtilisateurCourant, matiereId: string) {
  const m = await prisma.matiere.findUnique({
    where: { id: matiereId },
    select: { id: true, etablissementId: true, coefficient: true, nom: true, cycle: true },
  });
  if (!m) throw new Error("Matiere introuvable");
  if (m.etablissementId !== user.etablissementId) throw new Error("Acces refuse");
  return m;
}

export async function verifierTrimestre(user: UtilisateurCourant, trimestreId: string) {
  const t = await prisma.trimestre.findUnique({
    where: { id: trimestreId },
    include: { anneeScolaire: { select: { etablissementId: true } } },
  });
  if (!t) throw new Error("Trimestre introuvable");
  if (t.anneeScolaire.etablissementId !== user.etablissementId) throw new Error("Acces refuse");
  return t;
}

// Affectation : pointe maintenant vers Employe, pas User
export async function verifierAffectation(
  user: UtilisateurCourant,
  classeId: string,
  matiereId: string | null
): Promise<void> {
  if (user.roles.includes("DIRECTEUR") || user.roles.includes("SECRETAIRE")) return;

  // Utiliser l'employeId (pas le user.id)
  if (matiereId) {
    const aff = await prisma.affectation.findFirst({
      where: { enseignantId: user.employeId, classeId, matiereId },
    });
    if (aff) return;
  }

  const affTitulaire = await prisma.affectation.findFirst({
    where: {
      enseignantId: user.employeId,
      classeId,
      matiereId: null,
      type: "TITULAIRE",
    },
  });
  if (!affTitulaire) {
    throw new Error("Vous n'enseignez pas cette classe/matiere");
  }
}
// Classe consultable par l'utilisateur (false pour un enseignant non affecte)
export async function classeVisible(user: UtilisateurCourant, classeId: string | null): Promise<boolean> {
  const v = await classesVisibles(user);
  return !v || (!!classeId && v.includes(classeId));
}
