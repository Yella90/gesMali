import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { TrimestreForm } from "./TrimestreForm";

export default async function NouveauTrimestrePage() {
  const user = await requirePermission("trimestre.manage");
  const annees = await prisma.anneeScolaire.findMany({
    where: { etablissementId: user.etablissementId },
    include: { _count: { select: { trimestres: true } } },
    orderBy: { libelle: "desc" },
  });

  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/trimestres" className="text-xs text-[var(--color-ink-muted)] hover:underline">
        ← Retour aux trimestres
      </Link>
      <div>
        <h1 className="text-2xl font-semibold mt-1">Nouvelle année / trimestre</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-1">
          Créez une année scolaire puis ajoutez-y des trimestres.
        </p>
      </div>
      <TrimestreForm
        annees={annees.map((a) => ({
          id: a.id,
          label: a.libelle,
          nbTrimestres: a._count.trimestres,
        }))}
      />
    </div>
  );
}