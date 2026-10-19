import Link from "next/link";

type Annee = { id: string; libelle: string; active: boolean };

// Onglets d'annee scolaire (liens ?annee=) et rappel quand l'annee est archivee
export function ChoixAnnee({ annees, annee, base }: { annees: Annee[]; annee: Annee | null; base: string }) {
  if (annees.length < 2 && annee?.active !== false) return null;
  return (
    <div className="space-y-3">
      {annees.length > 1 && (
        <nav aria-label="Année scolaire" className="flex flex-wrap gap-2">
          {annees.map((a) => {
            const courante = a.id === annee?.id;
            return (
              <Link
                key={a.id}
                href={base + "?annee=" + a.id}
                aria-current={courante ? "page" : undefined}
                className={
                  "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm " +
                  (courante
                    ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-white"
                    : "border-[var(--color-border-strong)] bg-white hover:bg-neutral-50")
                }
              >
                {a.libelle}
                <span className={"text-[11px] " + (courante ? "text-white/70" : "text-[var(--color-ink-muted)]")}>
                  {a.active ? "active" : "archivée"}
                </span>
              </Link>
            );
          })}
        </nav>
      )}
      {annee && !annee.active && (
        <p className="rounded-lg border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-ink-muted)]">
          Année archivée : ses classes sont conservées pour l&apos;historique (notes, bulletins, scolarité).
        </p>
      )}
    </div>
  );
}
