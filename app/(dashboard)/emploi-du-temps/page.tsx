import Link from "next/link";
import { FileDown } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { peut } from "@/lib/auth/permissions";
import { filtreClasses } from "@/lib/data/guard";
import { anneeAffichee } from "@/lib/classes/annees";
import { ChoixAnnee } from "@/components/annees/ChoixAnnee";

export default async function EmploiDuTempsPage({ searchParams }: { searchParams: Promise<{ annee?: string }> }) {
  const user = await requirePermission("classe.read");
  const { annee: anneeId } = await searchParams;
  const { annees, annee } = await anneeAffichee(user.etablissementId, anneeId);

  const classes = annee
    ? await prisma.classe.findMany({
        where: { etablissementId: user.etablissementId, anneeScolaireId: annee.id, ...(await filtreClasses(user)) },
        include: { _count: { select: { affectations: true } } },
        orderBy: [{ niveau: "asc" }, { section: "asc" }],
      })
    : [];

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
  const sansHoraire = classes.filter((c) => !mapCreneaux[c.id]).length;
  const peutPlanifier = peut(user.roles, "personnel.manage");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Emploi du temps</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-1">
            Sélectionnez une classe pour voir sa grille hebdomadaire
            {annee ? " · année " + annee.libelle : ""}
          </p>
        </div>
        {/* Une page par classe planifiee ; le PDF d'une seule classe s'exporte depuis sa grille */}
        {annee && classes.length > sansHoraire && (
          <a
            href={"/api/emploi-du-temps/pdf?annee=" + annee.id}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm hover:bg-neutral-50"
          >
            <FileDown className="h-4 w-4" aria-hidden />
            Exporter toutes les classes (PDF)
          </a>
        )}
      </div>

      <ChoixAnnee annees={annees} annee={annee} base="/emploi-du-temps" />

      {annee?.active && sansHoraire > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">
            {sansHoraire === classes.length
              ? "Aucune classe n'a encore d'emploi du temps cette année."
              : sansHoraire + " classe(s) sans emploi du temps."}
          </p>
          <p className="mt-0.5 text-xs">
            {peutPlanifier
              ? "Ouvrez une classe pour planifier ses cours directement sur sa grille : jour, heures, matière et enseignant."
              : "La direction planifie les cours depuis la grille de chaque classe."}
          </p>
        </div>
      )}

      {classes.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-[var(--color-border-strong)] py-16 text-center">
          <p className="text-sm text-[var(--color-ink-muted)]">Aucune classe pour cette année.</p>
          {peut(user.roles, "classe.manage") && annee?.active && (
            <Link href="/classes/nouveau" className="inline-flex items-center h-10 px-4 rounded-lg bg-[var(--color-brand)] text-white text-sm font-medium mt-4">
              + Créer une classe
            </Link>
          )}
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
                      {c.cycle === "PRESCOLAIRE" ? "Préscolaire" : c.cycle === "PREMIER_CYCLE" ? "Premier cycle" : "Second cycle"}
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
                    <span className="text-red-700 font-medium">Aucun enseignant affecté</span>
                  ) : nbCreneaux === 0 ? (
                    <span className="text-amber-700 font-medium">Horaires à définir</span>
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
