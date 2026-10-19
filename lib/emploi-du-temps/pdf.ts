// Donnees et reponse des PDF d'emploi du temps (une classe ou toutes celles d'une annee)

import { ecole } from "@/lib/data/ecole";
import type { Prisma } from "@/lib/generated/prisma/client";
import { libelleClasse } from "@/lib/classes/annees";
import { reponsePdf } from "@/lib/pdf/reponse";
import type { ClassePdf } from "@/lib/pdf/EmploiDuTempsPDF";

// Classes triees par niveau, avec leurs cours planifies (jour et heures renseignes)
export async function classesPourPdf(etablissementId: string, where: Prisma.ClasseWhereInput): Promise<ClassePdf[]> {
  const db = ecole(etablissementId);
  const classes = await db.classe.findMany({
    where,
    include: {
      anneeScolaire: { select: { libelle: true } },
      titulaire: { select: { nom: true, prenom: true } },
      affectations: {
        where: { jour: { not: null }, heureDebut: { not: null }, heureFin: { not: null } },
        include: {
          enseignant: { select: { nom: true, prenom: true } },
          matiere: { select: { nom: true } },
        },
      },
    },
    orderBy: [{ niveau: "asc" }, { section: "asc" }],
  });

  return classes.map((c) => ({
    nom: libelleClasse({ nom: c.nom, niveau: c.niveau, section: c.section }),
    annee: c.anneeScolaire.libelle,
    salle: c.salle,
    titulaire: c.titulaire ? c.titulaire.nom + " " + c.titulaire.prenom : null,
    cours: c.affectations.map((a) => ({
      jour: a.jour!,
      heureDebut: a.heureDebut!,
      heureFin: a.heureFin!,
      matiere: a.matiere?.nom ?? "Titulariat",
      enseignant: a.enseignant.nom + " " + a.enseignant.prenom,
    })),
  }));
}

export async function reponseEmploiDuTemps(etablissementId: string, nomFichier: string, classes: ClassePdf[]) {
  const db = ecole(etablissementId);
  const etablissement = await db.etablissement.findUnique({
    where: { id: etablissementId },
    select: { nom: true, adresse: true, telephone: true, logo: true },
  });
  return reponsePdf(
    // Nom de fichier sans accents ni espaces : "emploi-du-temps-6eme-A-2026-2027.pdf"
    nomFichier.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "-"),
    async () => {
      const { renderToBuffer } = await import("@react-pdf/renderer");
      const { EmploiDuTempsPDF } = await import("@/lib/pdf/EmploiDuTempsPDF");
      return renderToBuffer(EmploiDuTempsPDF({ etablissement: etablissement ?? { nom: "" }, classes }));
    },
    { detail: true, prive: true }
  );
}
