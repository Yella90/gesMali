import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";

export default async function TrimestresPage() {
  const user = await requirePermission("trimestre.read");

  const annees = await prisma.anneeScolaire.findMany({
    where: { etablissementId: user.etablissementId },
    include: {
      trimestres: {
        orderBy: { ordre: "asc" },
        include: { _count: { select: { notes: true, bulletins: true } } },
      },
      _count: { select: { classes: true } },
    },
    orderBy: { libelle: "desc" },
  });

  function fmtDate(d: Date | string) {
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Trimestres</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-1">
            {annees.length} année(s) scolaire(s) · {annees.reduce((s, a) => s + a.trimestres.length, 0)} trimestre(s)
          </p>
        </div>
        <Link
          href="/trimestres/nouveau"
          className="inline-flex items-center h-10 px-4 rounded-lg bg-[var(--color-brand)] text-white text-sm font-medium hover:bg-[var(--color-brand-dark)]"
        >
          + Nouvelle année / trimestre
        </Link>
      </div>

      {annees.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-[var(--color-border-strong)] py-16 text-center">
          <p className="text-sm text-[var(--color-ink-muted)]">
            Aucune année scolaire. Créez-en une pour commencer.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {annees.map((a) => {
            const trimestresOuverts = a.trimestres.filter((t) => !t.cloture).length;
            return (
              <div key={a.id} className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
                {/* Header annee */}
                <div className="p-4 md:p-5 border-b border-[var(--color-border)] flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-lg">{a.libelle}</h2>
                      {a.active && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-ink-muted)] mt-1 tnum">
                      {fmtDate(a.dateDebut)} → {fmtDate(a.dateFin)} · {a._count.classes} classe(s) · {trimestresOuverts} trimestre(s) ouvert(s)
                    </p>
                  </div>
                </div>

                {/* Liste trimestres */}
                {a.trimestres.length === 0 ? (
                  <p className="p-6 text-center text-sm text-[var(--color-ink-muted)]">
                    Aucun trimestre pour cette année.
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--color-border)]">
                    {a.trimestres.map((t) => {
                      const cloture = t.cloture;
                      return (
                        <Link
                          key={t.id}
                          href={"/trimestres/" + t.id}
                          className="block p-4 md:px-5 hover:bg-neutral-50/60"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 md:gap-4 min-w-0">
                              <div className={"w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold tnum flex-shrink-0 " + (cloture ? "bg-neutral-100 text-neutral-500" : "bg-[var(--color-brand-soft)] text-[var(--color-brand)]")}>
                                T{t.ordre}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium">{t.nom}</p>
                                <p className="text-xs text-[var(--color-ink-muted)] mt-0.5 tnum">
                                  {fmtDate(t.dateDebut)}
                                  {t.dateFin ? " → " + fmtDate(t.dateFin) : ""}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 md:gap-5">
                              <div className="hidden md:flex flex-col items-end text-xs text-[var(--color-ink-muted)]">
                                <span className="tnum">{t._count.notes} note(s)</span>
                                <span className="tnum">{t._count.bulletins} bulletin(s)</span>
                              </div>
                              <span
                                className={
                                  "inline-flex px-2 py-0.5 rounded-md text-xs whitespace-nowrap " +
                                  (cloture
                                    ? "bg-neutral-100 text-neutral-600"
                                    : "bg-[var(--color-accent-soft)] text-[var(--color-accent)]")
                                }
                              >
                                {cloture ? "Cloturé" : "Ouvert"}
                              </span>
                              <span className="text-[var(--color-ink-muted)] text-lg flex-shrink-0">›</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}