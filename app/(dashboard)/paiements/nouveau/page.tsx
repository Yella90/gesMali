import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { PaiementForm } from "./PaiementForm";

export default async function NouveauPaiementPage() {
  const user = await requirePermission("paiement.create");

  const employes = await prisma.employe.findMany({
    where: {
      etablissementId: user.etablissementId,
      actif: true,
    },
    select: { id: true, nom: true, prenom: true, poste: true, salaireReference: true, typeRemuneration: true },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });

  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/paiements" className="text-xs text-[var(--color-ink-muted)] hover:underline">
        ← Retour aux paiements
      </Link>

      <div>
        <h1 className="text-2xl font-semibold mt-1">Nouveau paiement</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-1">
          Enregistrer un salaire, une prime ou une avance versé à un membre du personnel.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <strong>Registre interne.</strong> Ce formulaire ne produit pas de bulletin de paie légal. Vérifiez que la paie respecte le Code du travail malien (ITS, INPS, AMO).
      </div>

      <PaiementForm
        estDirecteur={user.roles.includes("DIRECTEUR")}
        employes={employes.map((e) => ({
          id: e.id,
          label: e.nom + " " + e.prenom,
          poste: e.poste,
          salaireReference: e.salaireReference,
          typeRemuneration: e.typeRemuneration,
        }))}
      />
    </div>
  );
}