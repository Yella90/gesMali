import { redirect } from "next/navigation";
import { compteConnecte, getUtilisateurCourant } from "@/lib/auth/session";
import { allPermissionsFor } from "@/lib/auth/permissions";
import { Sidebar } from "@/components/layout/Sidebar";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";
import { identiteEtablissement } from "@/lib/etablissement/logo";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUtilisateurCourant();
  // Connecte sans ecole utilisable (a choisir, suspendue, essai termine) : page de ses ecoles
  if (!user) redirect((await compteConnecte()) ? "/ecoles" : "/login?connexion");
  const permissions = Array.from(allPermissionsFor(user.roles));
  const etablissement = await identiteEtablissement(user.etablissementId);

  return (
    <ConfirmProvider>
      <div className="flex min-h-screen bg-[var(--color-surface)]">
        <Sidebar
          permissions={permissions}
          nom={user.prenom + " " + user.nom}
          roles={user.roles}
          etablissement={etablissement}
          compte={{ nbEcoles: user.nbEcoles, administrateur: user.administrateurPlateforme }}
        />
        <main className="flex-1 min-w-0 pt-14 lg:pt-0 pb-20 lg:pb-0">
          {user.joursEssai !== null && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
              Période d&apos;essai : {user.joursEssai} jour{user.joursEssai > 1 ? "s" : ""} restant{user.joursEssai > 1 ? "s" : ""}.
              Pour continuer ensuite, contactez l&apos;équipe GES Mali.
            </div>
          )}
          <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </ConfirmProvider>
  );
}

export const dynamic = "force-dynamic";
