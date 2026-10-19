import { notFound } from "next/navigation";
import { ecole } from "@/lib/data/ecole";
import { requirePermission } from "@/lib/auth/session";
import { peut } from "@/lib/auth/permissions";
import { classeVisible } from "@/lib/data/guard";
import { libelleClasse } from "@/lib/classes/annees";
import { FILTRE_ENSEIGNANTS } from "@/lib/emploi-du-temps/creneaux";
import { GrilleEmploiDuTemps, type Occupation } from "./GrilleEmploiDuTemps";

export default async function EmploiDuTempsClassePage({ params }: { params: Promise<{ classeId: string }> }) {
  const { classeId } = await params;
  const user = await requirePermission("classe.read");
  const db = ecole(user);

  const classe = await db.classe.findUnique({
    where: { id: classeId },
    include: {
      anneeScolaire: { select: { id: true, libelle: true, active: true } },
      affectations: {
        include: {
          enseignant: { select: { nom: true, prenom: true } },
          matiere: { select: { nom: true } },
        },
      },
    },
  });
  if (!classe || classe.etablissementId !== user.etablissementId) notFound();
  if (!(await classeVisible(user, classe.id))) notFound();

  // Planification : droit de gerer le personnel, classes de l'annee active seulement
  const modifiable = peut(user.roles, "personnel.manage") && classe.anneeScolaire.active;

  const [matieres, enseignants, occupations] = modifiable
    ? await Promise.all([
        db.matiere.findMany({
          where: { etablissementId: user.etablissementId, cycle: classe.cycle },
          select: { id: true, nom: true },
          orderBy: { nom: "asc" },
        }),
        db.employe.findMany({
          where: { etablissementId: user.etablissementId, ...FILTRE_ENSEIGNANTS },
          select: { id: true, nom: true, prenom: true },
          orderBy: [{ nom: "asc" }, { prenom: "asc" }],
        }),
        // Cours des enseignants dans les autres classes de l'annee, pour signaler les conflits
        db.affectation.findMany({
          where: {
            classeId: { not: classe.id },
            classe: { anneeScolaireId: classe.anneeScolaireId },
            jour: { not: null },
            heureDebut: { not: null },
            heureFin: { not: null },
          },
          select: {
            enseignantId: true,
            jour: true,
            heureDebut: true,
            heureFin: true,
            classe: { select: { nom: true, niveau: true, section: true } },
          },
        }),
      ])
    : [[], [], []];

  return (
    <GrilleEmploiDuTemps
      classeId={classe.id}
      titre={libelleClasse({ nom: classe.nom, niveau: classe.niveau, section: classe.section })}
      annee={classe.anneeScolaire}
      modifiable={modifiable}
      affectations={classe.affectations.map((a) => ({
        id: a.id,
        type: a.type,
        jour: a.jour,
        heureDebut: a.heureDebut,
        heureFin: a.heureFin,
        matiereId: a.matiereId,
        matiere: a.matiere?.nom ?? null,
        enseignantId: a.enseignantId,
        enseignant: a.enseignant.nom + " " + a.enseignant.prenom,
      }))}
      matieres={matieres}
      enseignants={enseignants.map((e) => ({ id: e.id, nom: e.nom + " " + e.prenom }))}
      occupations={occupations.map(
        (o): Occupation => ({
          enseignantId: o.enseignantId,
          jour: o.jour!,
          heureDebut: o.heureDebut!,
          heureFin: o.heureFin!,
          classe: libelleClasse(o.classe),
        })
      )}
    />
  );
}
