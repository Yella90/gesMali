// Ecrans de chargement : affiches instantanement (loading.tsx) pendant que la
// page se prepare sur le serveur. Annonce aux lecteurs d'ecran via role=status.

export function Squelette({ className = "" }: { className?: string }) {
  return <div aria-hidden className={"squelette " + className} />;
}

export function BarreChargement({ libelle = "Chargement…" }: { libelle?: string }) {
  return (
    <div role="status" aria-live="polite" className="sticky top-14 z-30 -mx-4 -mt-4 mb-6 bg-[var(--color-surface)] pb-1 md:-mx-6 md:-mt-6 lg:top-0 lg:-mx-8 lg:-mt-8">
      <div className="barre-chargement" />
      <p className="px-4 pt-2 text-xs text-[var(--color-ink-muted)] md:px-6 lg:px-8">{libelle}</p>
    </div>
  );
}

// Squelette generique d'une page de l'espace de gestion
export function SquelettePage() {
  return (
    <div className="max-w-7xl">
      <BarreChargement />
      <div className="space-y-5">
        <div className="space-y-2">
          <Squelette className="h-4 w-28" />
          <Squelette className="h-8 w-64" />
          <Squelette className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-[var(--color-border)] bg-white p-4">
              <Squelette className="h-4 w-20" />
              <Squelette className="mt-3 h-7 w-16" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-5">
          <Squelette className="h-5 w-40" />
          <div className="mt-5 space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Squelette className="h-9 w-9 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Squelette className="h-3.5" />
                  <Squelette className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
