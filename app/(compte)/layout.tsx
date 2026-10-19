import Link from "next/link";
import { redirect } from "next/navigation";
import { compteConnecte } from "@/lib/auth/session";
import { BoutonDeconnexion } from "@/components/layout/BoutonDeconnexion";
import { LiensLegaux } from "@/components/legal/PageLegale";

// Pages du compte, hors d'une ecole : choix de l'ecole, mot de passe
export default async function CompteLayout({ children }: { children: React.ReactNode }) {
  if (!(await compteConnecte())) redirect("/login?connexion");

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-surface)]">
      <header className="border-b border-[var(--color-border)] bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/ecoles" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand)] text-sm text-white">G</span>
            GES Mali
          </Link>
          <div className="w-36">
            <BoutonDeconnexion />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
      <footer className="mx-auto w-full max-w-3xl px-4 pb-6">
        <LiensLegaux className="text-[var(--color-ink-faint)]" />
      </footer>
    </div>
  );
}

export const dynamic = "force-dynamic";
