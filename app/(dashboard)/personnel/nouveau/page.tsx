import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { PersonnelForm } from "./PersonnelForm";

export default async function NouveauPersonnelPage() {
  await requirePermission("personnel.manage");
  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/personnel" className="text-xs text-[var(--color-ink-muted)] hover:underline">
        ← Retour au personnel
      </Link>
      <div>
        <h1 className="text-2xl font-semibold mt-1">Nouvel employé</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-1">
          Créez la fiche d'un membre du personnel. Un compte de connexion est optionnel.
        </p>
      </div>
      <PersonnelForm />
    </div>
  );
}