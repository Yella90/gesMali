import Link from "next/link";
import { ecole } from "@/lib/data/ecole";
import { requirePermission } from "@/lib/auth/session";
import { GenererForm } from "./GenererForm";

export default async function GenererBulletinsPage() {
  const user = await requirePermission("bulletin.generate");
  const db = ecole(user);

  const [classes, trimestres] = await Promise.all([
    db.classe.findMany({
      where: { etablissementId: user.etablissementId },
      include: {
        anneeScolaire: { select: { libelle: true } },
        _count: { select: { eleves: { where: { statut: "INSCRIT" } } } },
      },
      orderBy: [{ anneeScolaire: { libelle: "desc" } }, { niveau: "asc" }, { section: "asc" }],
    }),
    db.trimestre.findMany({
      where: {
        anneeScolaire: { etablissementId: user.etablissementId },
        dateDebut: { lte: new Date() },
      },
      include: { anneeScolaire: { select: { libelle: true } } },
      orderBy: [{ anneeScolaire: { libelle: "desc" } }, { ordre: "asc" }],
    }),
  ]);

  const existants = await db.bulletin.groupBy({
    by: ["classeId", "trimestreId"],
    _count: { _all: true },
  });
  const mapExistants: Record<string, number> = {};
  for (const b of existants) {
    mapExistants[b.classeId + ":" + b.trimestreId] = b._count._all;
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <Link href="/bulletins" className="text-xs text-[var(--color-ink-muted)] hover:underline">
        ← Retour aux bulletins
      </Link>

      <div>
        <h1 className="text-2xl font-semibold mt-1">Générer les bulletins</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-1">
          Calcule les moyennes, les rangs et produit les bulletins PDF pour une classe et un trimestre.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
        </div>
        <div className="min-w-0 text-sm text-amber-900">
          <p className="font-medium">Action irréversible</p>
          <p className="text-xs mt-0.5">
            La génération écrase les bulletins existants pour la classe et le trimestre sélectionnés. Les versions précédentes sont perdues.
          </p>
        </div>
      </div>

      <GenererForm
        classes={classes.map((c) => ({
          id: c.id,
          label: (c.nom || (c.niveau + (c.section ? " " + c.section : ""))) + " · " + c.anneeScolaire.libelle,
          effectif: c._count.eleves,
        }))}
        trimestres={trimestres.map((t) => ({
          id: t.id,
          label: t.nom + " · " + t.anneeScolaire.libelle,
        }))}
        existants={mapExistants}
      />

      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 space-y-3">
        <h2 className="font-medium">Comment ça marche</h2>
        <ul className="space-y-2 text-sm text-[var(--color-ink-muted)]">
          <li className="flex gap-2">
            <span className="text-[var(--color-brand)] font-medium">1.</span>
            <span>Le système regroupe les notes par matière pour chaque élève.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--color-brand)] font-medium">2.</span>
            <span>Calcul de la moyenne par matière : <strong className="text-[var(--color-ink)]">(Composition x 2 + Moyenne des devoirs) / 3</strong>.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--color-brand)] font-medium">3.</span>
            <span>Moyenne générale pondérée par les coefficients, rang par matière et rang général.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--color-brand)] font-medium">4.</span>
            <span>Chaque bulletin est figé (moyenne de classe, plus forte / plus faible) et généré en PDF.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}