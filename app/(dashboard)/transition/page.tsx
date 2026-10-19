import Link from "next/link";
import { ecole } from "@/lib/data/ecole";
import { requirePermission } from "@/lib/auth/session";

export default async function TransitionPage() {
  const user = await requirePermission("parametres.manage");
  const db = ecole(user);

  const annees = await db.anneeScolaire.findMany({
    where: { etablissementId: user.etablissementId },
    include: {
      trimestres: { orderBy: { ordre: "asc" } },
      _count: { select: { classes: true, inscriptions: true } },
    },
    orderBy: { libelle: "desc" },
  });

  const anneeActive = annees.find((a) => a.active);
  const archives = annees.filter((a) => a.archivee);

  // Verifier si la transition est possible
  let transitionPossible = false;
  const raisons: string[] = [];

  if (!anneeActive) {
    raisons.push("Aucune année scolaire active");
  } else {
    if (anneeActive.trimestres.length !== 3) {
      raisons.push("L'année active doit avoir 3 trimestres");
    }
    const nonClotures = anneeActive.trimestres.filter((t) => !t.cloture);
    if (nonClotures.length > 0) {
      raisons.push(
        nonClotures.length +
          " trimestre(s) non clôturé(s) : " +
          nonClotures.map((t) => t.nom).join(", ")
      );
    }
    const nbBulletins = await db.bulletin.count({
      where: { trimestre: { anneeScolaireId: anneeActive.id } },
    });
    if (nbBulletins === 0) {
      raisons.push("Aucun bulletin généré pour l'année active");
    }

    if (raisons.length === 0) transitionPossible = true;
  }

  const dateArchive = (d: Date | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const estSupprimable = (annee: any) => {
    if (!annee.archivee || annee.notesSupprimees) return false;
    if (!annee.archiveeLe) return false;
    const unAnApres = new Date(annee.archiveeLe);
    unAnApres.setFullYear(unAnApres.getFullYear() + 1);
    return new Date() >= unAnApres;
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Transition annuelle</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-1">
            Passer les élèves vers la nouvelle année scolaire
          </p>
        </div>
        {transitionPossible && (
          <Link
            href="/transition/nouvelle"
            className="inline-flex items-center h-10 px-5 rounded-lg bg-[var(--color-brand)] text-white text-sm font-medium hover:bg-[var(--color-brand-dark)]"
          >
            + Nouvelle transition
          </Link>
        )}
      </div>

      {/* Etat de l'annee active */}
      {anneeActive && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="p-5 border-b border-[var(--color-border)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">
                  Année active : {anneeActive.libelle}
                </h2>
                <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                  {anneeActive._count.classes} classe(s) ·{" "}
                  {anneeActive._count.inscriptions} inscription(s)
                </p>
              </div>
              <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                Active
              </span>
            </div>
          </div>

          {/* Trimestres */}
          <div className="p-5 border-b border-[var(--color-border)]">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)] mb-3">
              Trimestres
            </p>
            <div className="grid grid-cols-3 gap-3">
              {anneeActive.trimestres.map((t) => (
                <div
                  key={t.id}
                  className={
                    "rounded-lg border p-3 " +
                    (t.cloture
                      ? "border-[var(--color-accent-soft)] bg-[var(--color-accent-soft)]/40"
                      : "border-amber-200 bg-amber-50")
                  }
                >
                  <p className="font-medium text-sm">{t.nom}</p>
                  <p className="text-[10px] text-[var(--color-ink-muted)] mt-1">
                    {t.dateFin
                      ? "Fin " + new Date(t.dateFin).toLocaleDateString("fr-FR")
                      : "Sans fin"}
                  </p>
                  <p className="text-xs mt-2">
                    {t.cloture ? (
                      <span className="text-[var(--color-accent)]">Clôturé</span>
                    ) : (
                      <span className="text-amber-700">En cours</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Etat de preparation */}
          <div className="p-5">
            {transitionPossible ? (
              <div className="rounded-lg border border-[var(--color-accent-soft)] bg-[var(--color-accent-soft)]/40 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)] text-white flex items-center justify-center flex-shrink-0">
                    ✓
                  </div>
                  <div>
                    <p className="font-medium text-[var(--color-accent)]">
                      Prét pour la transition
                    </p>
                    <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                      Tous les trimestres sont clôturés et les bulletins sont générés.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 font-bold">
                    !
                  </div>
                  <div>
                    <p className="font-medium text-amber-900">
                      Transition impossible pour le moment
                    </p>
                    <ul className="text-xs text-amber-800 mt-1 space-y-0.5">
                      {raisons.map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Annees archivees */}
      {archives.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="p-5 border-b border-[var(--color-border)]">
            <h2 className="font-semibold">Années archivées</h2>
            <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
              Les notes sont conservées 1 an avant suppression définitive
            </p>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {archives.map((a) => (
              <div key={a.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{a.libelle}</p>
                  <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                    Archivée le {dateArchive(a.archiveeLe)}
                    {a.notesSupprimees && " · Notes supprimées"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!a.notesSupprimees && (
                    <a
                      href={"/api/transition/export/" + a.id}
                      className="inline-flex items-center h-9 px-3 rounded-lg border border-[var(--color-border-strong)] bg-white text-xs hover:bg-neutral-50"
                    >
                      Exporter CSV
                    </a>
                  )}
                  {estSupprimable(a) && (
                    <Link
                      href={"/transition/supprimer/" + a.id}
                      className="inline-flex items-center h-9 px-3 rounded-lg border border-red-200 bg-white text-red-700 text-xs hover:bg-red-50"
                    >
                      Supprimer les notes
                    </Link>
                  )}
                  {!a.notesSupprimees && !estSupprimable(a) && (
                    <span className="text-xs text-[var(--color-ink-muted)] px-3 py-2">
                      Conservation en cours
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}