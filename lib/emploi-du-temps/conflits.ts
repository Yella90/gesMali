// Conflits d'un creneau : la classe a deja cours a cette heure, ou l'enseignant
// est deja dans une autre classe de la meme annee scolaire.

import { ecole } from "@/lib/data/ecole";
import { libelleClasse } from "@/lib/classes/annees";
import { libJour } from "./creneaux";

type Creneau = { jour: string; heureDebut: string; heureFin: string; enseignantId: string };

// Message du premier conflit trouve, ou null. exclureId : le creneau en cours de modification.
export async function conflitCreneau(
  classe: { id: string; anneeScolaireId: string; etablissementId: string },
  c: Creneau,
  nomEnseignant: string,
  exclureId?: string
): Promise<string | null> {
  const db = ecole(classe.etablissementId);
  const chevauchement = {
    jour: c.jour,
    heureDebut: { lt: c.heureFin },
    heureFin: { gt: c.heureDebut },
    ...(exclureId ? { id: { not: exclureId } } : {}),
  };

  const [coursClasse, coursEnseignant] = await Promise.all([
    db.affectation.findFirst({
      where: { classeId: classe.id, ...chevauchement },
      include: {
        matiere: { select: { nom: true } },
        enseignant: { select: { nom: true, prenom: true } },
      },
      orderBy: { heureDebut: "asc" },
    }),
    db.affectation.findFirst({
      where: {
        enseignantId: c.enseignantId,
        classeId: { not: classe.id },
        classe: { anneeScolaireId: classe.anneeScolaireId },
        ...chevauchement,
      },
      include: {
        classe: { select: { nom: true, niveau: true, section: true } },
        matiere: { select: { nom: true } },
      },
      orderBy: { heureDebut: "asc" },
    }),
  ]);

  const quand = (a: { heureDebut: string | null; heureFin: string | null }) =>
    "le " + libJour(c.jour).toLowerCase() + " de " + a.heureDebut + " à " + a.heureFin;

  if (coursClasse) {
    return (
      "La classe a déjà cours " + quand(coursClasse) + " : " +
      (coursClasse.matiere?.nom ?? "titulariat") + " avec " +
      coursClasse.enseignant.nom + " " + coursClasse.enseignant.prenom
    );
  }
  if (coursEnseignant) {
    return (
      nomEnseignant + " enseigne déjà en " + libelleClasse(coursEnseignant.classe) + " " + quand(coursEnseignant) +
      " (" + (coursEnseignant.matiere?.nom ?? "titulariat") + ")"
    );
  }
  return null;
}
