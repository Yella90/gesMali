import { requirePermission } from "@/lib/auth/session";
import { MatiereForm } from "./MatiereForm";

export default async function NouvelleMatierePage() {
  await requirePermission("matiere.manage");
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Nouvelle matiére</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-1">
          Définissez le cycle et le coefficient : le coefficient détermine le poids de la matiére dans la moyenne.
        </p>
      </div>
      <MatiereForm />
    </div>
  );
}