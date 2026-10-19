import Link from "next/link";
import { redirect } from "next/navigation";
import { compteConnecte, getUtilisateurCourant } from "@/lib/auth/session";
import { MotDePasse } from "./MotDePasse";

export const metadata = { title: "Mon compte · GES Mali" };

export default async function MonComptePage() {
  const compte = await compteConnecte();
  if (!compte) redirect("/login?connexion");
  const courant = await getUtilisateurCourant();

  return (
    <div className="space-y-5">
      <div>
        {courant ? (
          <Link href="/dashboard" className="text-xs text-[var(--color-ink-muted)] hover:underline">
            ← Retour au tableau de bord
          </Link>
        ) : (
          compte.administrateurPlateforme && (
            <Link href="/plateforme" className="text-xs text-[var(--color-ink-muted)] hover:underline">
              ← Retour à la plateforme
            </Link>
          )
        )}
        <h1 className="mt-1 text-2xl font-semibold">Mon compte</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          {compte.email} · {compte.acces.length} école{compte.acces.length > 1 ? "s" : ""} ·{" "}
          <Link href="/ecoles" className="text-[var(--color-brand)] hover:underline">
            voir mes écoles
          </Link>
        </p>
      </div>
      <MotDePasse />
    </div>
  );
}
