import Link from "next/link";
import { ecole } from "@/lib/data/ecole";
import { requirePermission } from "@/lib/auth/session";
import { ListeEleves } from "./ListeEleves";
import { filtreClasses, filtreClasseId } from "@/lib/data/guard";
import { libelleClasse, ORDRE_CLASSES } from "@/lib/classes/annees";

export default async function ElevesPage() {
  const user = await requirePermission("eleve.read");
  const db = ecole(user);

  // Charge TOUS les eleves une seule fois
  const [eleves, classes] = await Promise.all([
    db.eleve.findMany({
      where: {
        etablissementId: user.etablissementId,
        statut: { not: "RADIE" },
        ...(await filtreClasseId(user)),
      },
      include: {
        classe: { select: { nom: true, niveau: true, section: true } },
      },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    }),
    db.classe.findMany({
      where: { etablissementId: user.etablissementId, ...(await filtreClasses(user)) },
      include: { anneeScolaire: { select: { libelle: true, active: true } } },
      orderBy: ORDRE_CLASSES,
    }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Élèves</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">
            {eleves.length} élève(s) inscrit(s)
          </p>
        </div>
        <Link
          href="/eleves/nouveau"
          className="inline-flex items-center h-10 px-4 rounded-lg bg-[var(--color-brand)] text-white text-sm font-medium hover:bg-[var(--color-brand-dark)]"
        >
          + Nouvel élève
        </Link>
      </div>

      <ListeEleves
        eleves={eleves.map((e) => ({
          id: e.id,
          matricule: e.matricule,
          nom: e.nom,
          prenom: e.prenom,
          sexe: e.sexe,
          statut: e.statut,
          classe: e.classe
            ? { nom: e.classe.nom, niveau: e.classe.niveau, section: e.classe.section }
            : null,
        }))}
        classes={classes.map((c) => ({
          id: c.id,
          label: libelleClasse(c),
        }))}
      />
    </div>
  );
}