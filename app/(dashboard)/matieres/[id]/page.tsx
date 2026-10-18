import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { ModifierMatiere } from "./ModifierMatiere";

export default async function MatiereDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("matiere.read");

  const matiere = await prisma.matiere.findUnique({
    where: { id },
    include: { _count: { select: { notes: true, bulletinLignes: true, affectations: true } } },
  });

  if (!matiere || matiere.etablissementId !== user.etablissementId) notFound();

  const peutEditer = user.roles.includes("DIRECTEUR");

  function labelCycle(c: string) {
    if (c === "PRESCOLAIRE") return "Préscolaire";
    if (c === "PREMIER_CYCLE") return "Premier cycle";
    return "Second cycle";
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <Link href="/matieres" className="text-xs text-[var(--color-ink-muted)] hover:underline">
        ← Retour aux matières
      </Link>

      <div>
        <h1 className="text-2xl font-semibold mt-1">{matiere.nom}</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">
          {labelCycle(matiere.cycle)} · Coefficient {matiere.coefficient}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Code" value={matiere.code || "—"} />
        <Stat label="Coefficient" value={String(matiere.coefficient)} accent="brand" />
        <Stat label="Notes" value={String(matiere._count.notes)} />
        <Stat label="Affectations" value={String(matiere._count.affectations)} />
      </div>

      {peutEditer && (
        <ModifierMatiere
          matiere={{
            id: matiere.id,
            nom: matiere.nom,
            code: matiere.code || "",
            cycle: matiere.cycle,
            coefficient: matiere.coefficient,
          }}
          aNotes={matiere._count.notes > 0 || matiere._count.bulletinLignes > 0}
        />
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "brand" }) {
  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">{label}</p>
      <p className={"text-lg font-semibold mt-1 tnum " + (accent === "brand" ? "text-[var(--color-brand)]" : "")}>
        {value}
      </p>
    </div>
  );
}