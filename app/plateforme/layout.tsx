import Link from "next/link";
import { notFound } from "next/navigation";
import { compteConnecte } from "@/lib/auth/session";
import { BoutonDeconnexion } from "@/components/layout/BoutonDeconnexion";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";

export const metadata = { title: "Plateforme · GES Mali" };

// Administration de la plateforme : invisible (404) pour les autres comptes
export default async function PlateformeLayout({ children }: { children: React.ReactNode }) {
  const compte = await compteConnecte();
  if (!compte?.administrateurPlateforme) notFound();

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <header className="border-b border-[var(--color-border)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <Link href="/plateforme" className="flex items-center gap-2 font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand)] text-sm text-white">G</span>
              GES Mali · Plateforme
            </Link>
            <div className="w-36 shrink-0">
              <BoutonDeconnexion />
            </div>
          </div>
          <nav className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <Link href="/plateforme" className="whitespace-nowrap hover:underline">Écoles</Link>
            <Link href="/plateforme/nouvelle" className="whitespace-nowrap hover:underline">Nouvelle école</Link>
            <Link href="/ecoles" className="whitespace-nowrap hover:underline">Mes écoles</Link>
            <Link href="/compte" className="whitespace-nowrap hover:underline">Mon compte</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <ConfirmProvider>{children}</ConfirmProvider>
      </main>
    </div>
  );
}

export const dynamic = "force-dynamic";
