import Link from "next/link";

export default function PageIntrouvable() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-surface)]">
      <div className="max-w-sm w-full bg-white rounded-xl border border-[var(--color-border)] p-6 text-center">
        <p className="text-4xl font-semibold text-[var(--color-brand)]">404</p>
        <h1 className="text-lg font-semibold mt-3">Page introuvable</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-2">
          Cette page n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/"
          className="inline-flex items-center h-10 px-4 mt-5 rounded-lg bg-[var(--color-brand)] text-white text-sm"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
