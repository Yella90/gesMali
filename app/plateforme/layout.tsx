import Link from "next/link";
import { notFound } from "next/navigation";
import { compteConnecte } from "@/lib/auth/session";
import { BoutonDeconnexion } from "@/components/layout/BoutonDeconnexion";

export const metadata = { title: "Plateforme · GES Mali" };

// Administration de la plateforme : invisible (404) pour les autres comptes
export default async function PlateformeLayout({ children }: { children: React.ReactNode }) {
  const compte = await compteConnecte();
  if (!compte?.administrateurPlateforme) notFound();

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <header className="border-b border-[var(--color-border)] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/plateforme" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand)] text-sm text-white">G</span>
            GES Mali · Plateforme
          </Link>
          <nav className="flex flex-1 flex-wrap gap-4 text-sm">
            <Link href="/plateforme" className="hover:underline">Écoles</Link>
            <Link href="/plateforme/nouvelle" className="hover:underline">Nouvelle école</Link>
            <Link href="/ecoles" className="hover:underline">Mes écoles</Link>
          </nav>
          <div className="w-36">
            <BoutonDeconnexion />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

export const dynamic = "force-dynamic";
