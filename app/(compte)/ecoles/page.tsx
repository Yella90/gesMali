import Link from "next/link";
import { redirect } from "next/navigation";
import { compteConnecte, ecoleChoisie } from "@/lib/auth/session";
import { accesUtilisable, choisirAcces } from "@/lib/auth/comptes";
import { etatEcole } from "@/lib/plateforme/etat";
import { libRole } from "@/lib/libelles";
import { choisirEcole } from "./actions";

export const metadata = { title: "Mes écoles · GES Mali" };

// Ecoles du compte : ouvrir l'une d'elles, ou comprendre pourquoi elle est fermee
export default async function MesEcolesPage() {
  const compte = await compteConnecte();
  if (!compte) redirect("/login?connexion");
  const courante = choisirAcces(compte.acces, await ecoleChoisie());

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Mes écoles</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Compte {compte.email} · choisissez l&apos;école dans laquelle vous travaillez.
        </p>
      </div>

      {compte.acces.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--color-border-strong)] bg-white px-4 py-10 text-center text-sm text-[var(--color-ink-muted)]">
          Ce compte n&apos;a accès à aucune école.
        </p>
      ) : (
        <ul className="space-y-3">
          {compte.acces.map((a) => {
            const etat = etatEcole(a.etablissement);
            const utilisable = accesUtilisable(a);
            const actuelle = courante?.id === a.id;
            const raison = !a.actif || !a.employe.actif
              ? "Votre accès à cette école est désactivé : voyez avec sa direction."
              : etat.libelle === "Suspendue"
                ? "Cette école est suspendue. Sa direction peut contacter l'équipe GES Mali pour la réactiver."
                : etat.libelle === "Essai terminé"
                  ? "La période d'essai de cette école est terminée. Sa direction peut contacter l'équipe GES Mali pour continuer."
                  : null;
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--color-border)] bg-white p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{a.etablissement.nom}</p>
                  <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                    {a.roles.map(libRole).join(", ")} · {etat.libelle}
                    {actuelle && " · école actuelle"}
                  </p>
                  {raison && <p className="mt-2 text-sm text-amber-800">{raison}</p>}
                </div>
                {utilisable && (
                  <form action={choisirEcole.bind(null, a.etablissementId)}>
                    <button
                      type="submit"
                      className="inline-flex h-10 items-center rounded-lg bg-[var(--color-brand)] px-4 text-sm font-medium text-white hover:bg-[var(--color-brand-dark)]"
                    >
                      Ouvrir
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/inscription" className="font-medium text-[var(--color-brand)] hover:underline">
          Créer une nouvelle école
        </Link>
        <Link href="/compte" className="font-medium text-[var(--color-brand)] hover:underline">
          Mon compte
        </Link>
        {compte.administrateurPlateforme && (
          <Link href="/plateforme" className="font-medium text-[var(--color-brand)] hover:underline">
            Administration de la plateforme
          </Link>
        )}
      </div>
    </div>
  );
}
