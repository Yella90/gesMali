import Link from "next/link";
import { LiensLegaux } from "@/components/legal/PageLegale";

// Petite page publique (liens recus par e-mail, mot de passe oublie) : en-tete GES Mali,
// carte blanche au centre
export function PagePublique({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-brand)] text-white">
      <div className="mx-auto max-w-md px-4 py-8 sm:px-6">
        <header>
          <Link href="/login" className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 font-serif text-lg font-semibold text-[#E2C17E]">
              G
            </span>
            <span className="text-lg font-semibold">GES Mali</span>
          </Link>
        </header>
        <main className="mt-10 rounded-2xl bg-white p-6 text-[var(--color-ink)] shadow-xl sm:p-8">
          <h1 className="font-serif text-2xl font-semibold leading-tight">{titre}</h1>
          <div className="mt-4 space-y-4 text-sm leading-relaxed">{children}</div>
        </main>
        <footer className="mt-8 text-xs text-white/60">
          <LiensLegaux className="text-white/60" />
        </footer>
      </div>
    </div>
  );
}

// Lien vers une autre page, dans la carte
export function LienPublic({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-[var(--color-brand)] hover:underline">
      {children}
    </Link>
  );
}
