import { Squelette } from "@/components/chargement/Chargement";

export default function ChargementEspaceParent() {
  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div role="status" aria-live="polite">
        <div className="barre-chargement" />
        <p className="sr-only">Chargement de l&apos;espace parent…</p>
      </div>
      <header className="bg-[var(--color-brand)]">
        <div className="mx-auto max-w-3xl space-y-2 px-4 py-5">
          <div className="h-3 w-24 rounded bg-white/20" />
          <div className="h-4 w-56 rounded bg-white/25" />
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        {[0, 1, 2].map((i) => (
          <section key={i} className="rounded-xl border border-[var(--color-border)] bg-white p-5">
            <Squelette className="h-6 w-48" />
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Squelette className="h-14" />
              <Squelette className="h-14" />
              <Squelette className="h-14" />
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
