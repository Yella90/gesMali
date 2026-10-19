import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { SaisieNotes } from "./SaisieNotes";
import { filtreClasses, filtreClasseId } from "@/lib/data/guard";
import { libelleClasse, ORDRE_CLASSES } from "@/lib/classes/annees";

export default async function NotesPage() {
  const user = await requirePermission("note.read");

  const [classes, matieres, trimestres, paramsEtab] = await Promise.all([
    prisma.classe.findMany({
      where: { etablissementId: user.etablissementId, ...(await filtreClasses(user)) },
      include: { anneeScolaire: { select: { libelle: true, active: true } } },
      orderBy: ORDRE_CLASSES,
    }),
    prisma.matiere.findMany({
      where: { etablissementId: user.etablissementId },
      orderBy: { nom: "asc" },
    }),
    prisma.trimestre.findMany({
      where: { anneeScolaire: { etablissementId: user.etablissementId } },
      include: { anneeScolaire: { select: { libelle: true } } },
      orderBy: [{ anneeScolaire: { libelle: "desc" } }, { ordre: "asc" }],
    }),
    prisma.parametresEtablissement.findUnique({
      where: { etablissementId: user.etablissementId },
    }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Saisie des notes</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-1">
          Sélectionnez une classe, une matière et un trimestre pour saisir les notes de toute la classe.
        </p>
      </div>

      <SaisieNotes
        classes={classes.map((c) => ({
          id: c.id,
          label: libelleClasse(c),
          cycle: c.cycle,
        }))}
        matieres={matieres.map((m) => ({
          id: m.id,
          nom: m.nom,
          cycle: m.cycle,
        }))}
        trimestres={trimestres.map((t) => ({
          id: t.id,
          label: t.nom + " (" + t.anneeScolaire.libelle + ")",
          cloture: t.cloture,
        }))}
        modeSaisie={paramsEtab?.modeSaisieNotes ?? "DECENTRALISEE"}
      />
    </div>
  );
}