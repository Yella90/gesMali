import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";

export default async function EmploiDuTempsPage() {
  const user = await requirePermission("classe.read");

  const classes = await prisma.classe.findMany({
    where: { etablissementId: user.etablissementId },
    include: {
      anneeScolaire: { select: { libelle: true } },
      _count: { select: { affectations: true } },
    },
    orderBy: [{ niveau: "asc" }, { section: "asc" }],
  });

  // Compter les creneaux horaires par classe
  const creneauxParClasse = await prisma.affectation.groupBy({
    by: ["classeId"],
    where: { classeId: { in: classes.map((c) => c.id) }, jour: { not: null } },
    _count: { _all: true },
  });
  const mapCreneaux: Record<string, number> = {};
  for (const c of creneauxParClasse) {
    mapCreneaux[c.classeId] = c._count._all;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Emploi du temps</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-1">
          Sélectionnez une classe pour voir sa grille hebdomadaire
        </p>
      </div>

      {classes.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-[var(--color-border-strong)] py-16 text-center">
          <p className="text-sm text-[var(--color-ink-muted)]">Aucune classe.</p>
          <Link href="/classes/nouveau" className="inline-flex items-center h-10 px-4 rounded-lg bg-[var(--color-brand)] text-white text-sm font-medium mt-4">
            + Créer une classe
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {classes.map((c) => {
            const lib = c.nom || (c.niveau + (c.section ? " " + c.section : ""));
            const nbCreneaux = mapCreneaux[c.id] ?? 0;
            const nbAffs = c._count.affectations;
            const complet = nbCreneaux >= 10;

            return (
              <Link
                key={c.id}
                href={"/emploi-du-temps/" + c.id}
                className="block bg-white rounded-xl border border-[var(--color-border)] p-4 hover:border-[var(--color-border-strong)] hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-lg">{lib}</p>
                    <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                      {c.anneeScolaire.libelle} · {c.cycle === "PRESCOLAIRE" ? "Préscolaire" : c.cycle === "PREMIER_CYCLE" ? "Premier cycle" : "Second cycle"}
                    </p>
                  </div>
                  <div className={"w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold " + (complet ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]" : nbCreneaux > 0 ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)]" : "bg-neutral-100 text-neutral-500")}>
                    {nbCreneaux}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-ink-muted)]">
                    {nbCreneaux} créneau{nbCreneaux > 1 ? "x" : ""} planifié{nbCreneaux > 1 ? "s" : ""}
                  </span>
                  {nbAffs === 0 ? (
                    <span className="text-red-700 font-medium">Aucune affectation</span>
                  ) : nbCreneaux === 0 ? (
                    <span className="text-amber-700 font-medium">Horaire non défini</span>
                  ) : (
                    <span className="text-[var(--color-brand)] font-medium">Voir →</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}