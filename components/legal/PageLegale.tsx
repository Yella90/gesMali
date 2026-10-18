import Link from "next/link";
import { LEGAL } from "@/lib/legal";

export const PAGES_LEGALES = [
  { href: "/conditions-utilisation", label: "Conditions d'utilisation" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/cookies", label: "Cookies" },
] as const;

// Liens discrets vers les pages legales (pied de page, sidebar...)
export function LiensLegaux({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Informations légales" className={"flex flex-wrap gap-x-3 gap-y-1 text-xs " + className}>
      {PAGES_LEGALES.map((p) => (
        <Link key={p.href} href={p.href} className="hover:underline">
          {p.label}
        </Link>
      ))}
    </nav>
  );
}

export function PageLegale({
  titre,
  actif,
  children,
}: {
  titre: string;
  actif: (typeof PAGES_LEGALES)[number]["href"];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <header className="bg-[var(--color-brand)] text-white">
        <div className="mx-auto max-w-3xl px-4 py-5 flex items-center gap-3">
          <Link href="/" className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center font-bold">
            G
          </Link>
          <span className="font-semibold">GES Mali</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <nav aria-label="Pages légales" className="flex flex-wrap gap-2 mb-5">
          {PAGES_LEGALES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              aria-current={p.href === actif ? "page" : undefined}
              className={
                "h-9 inline-flex items-center px-3 rounded-lg text-sm border " +
                (p.href === actif
                  ? "bg-[var(--color-brand)] text-white border-[var(--color-brand)]"
                  : "bg-white border-[var(--color-border-strong)] hover:bg-neutral-50")
              }
            >
              {p.label}
            </Link>
          ))}
        </nav>

        <article className="bg-white rounded-xl border border-[var(--color-border)] p-5 md:p-8 text-sm leading-relaxed text-[var(--color-ink)] [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-7 [&_h2]:mb-2 [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1 [&_table]:mt-3 [&_table]:w-full [&_th]:text-left [&_th]:p-2 [&_th]:bg-[var(--color-surface)] [&_td]:p-2 [&_td]:align-top [&_tr]:border-b [&_tr]:border-[var(--color-border)]">
          <h1 className="text-2xl font-semibold">{titre}</h1>
          <p className="text-xs text-[var(--color-ink-muted)]">Dernière mise à jour : {LEGAL.miseAJour}</p>
          {children}
        </article>

        <p className="text-center text-xs text-[var(--color-ink-faint)] mt-6">
          Contact : {LEGAL.email}
        </p>
      </main>
    </div>
  );
}
