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
  return classe;
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