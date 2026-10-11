import { redirect } from "next/navigation";
import { getUtilisateurCourant } from "@/lib/auth/session";
import { allPermissionsFor } from "@/lib/auth/permissions";
import { Sidebar } from "@/components/layout/Sidebar";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUtilisateurCourant();
  if (!user) redirect("/login");
  const permissions = Array.from(allPermissionsFor(user.roles));

  return (
    <ConfirmProvider>
      <div className="flex min-h-screen bg-[var(--color-surface)]">
        <Sidebar permissions={permissions} nom={user.prenom + " " + user.nom} roles={user.roles} />
        <main className="flex-1 min-w-0 pt-14 lg:pt-0 pb-20 lg:pb-0">
          <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </ConfirmProvider>
  );
}

export const dynamic = "force-dynamic";
