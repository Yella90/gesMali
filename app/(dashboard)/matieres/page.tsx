import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";

export default async function MatieresPage() {
  const user = await requirePermission("matiere.read");

  const matieres = await prisma.matiere.findMany({
    where: { etablissementId: user.etablissementId },
    include: { _count: { select: { notes: true } } },
    orderBy: [{ cycle: "asc" }, { nom: "asc" }],
  });

  const parCycle: Record<string, typeof matieres> = {
    PRESCOLAIRE: [],
    PREMIER_CYCLE: [],
    SECOND_CYCLE: [],
  };
  for (const m of matieres) parCycle[m.cycle].push(m);

  function labelCycle(c: string) {
    if (c === "PRESCOLAIRE") return "Préscolaire";
    if (c === "PREMIER_CYCLE") return "Premier cycle";
    return "Second cycle";
  }

  const totalCoeff = (items: any[]) => items.reduce((s, m) => s + m.coefficient, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Matiéres</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-1">
            {matieres.length} matiére(s) répartie(s) sur {Object.values(parCycle).filter((v) => v.length > 0).length} cycle(s)
          </p>
        </div>
        <Link
          href="/matieres/nouveau"
          className="inline-flex items-center h-10 px-4 rounded-lg bg-[var(--color-brand)] text-white text-sm font-medium hover:bg-[var(--color-brand-dark)]"
        >
          + Nouvelle matiére
        </Link>
      </div>

      {(["PRESCOLAIRE", "PREMIER_CYCLE", "SECOND_CYCLE"] as const).map((cycle) => {
        const items = parCycle[cycle];
        if (items.length === 0) return null;

        return (
          <div key={cycle} className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
            <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <div>
                <h2 className="font-semibold">{labelCycle(cycle)}</h2>
                <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                  {items.length} matiére(s) · coefficient total : {totalCoeff(items)}
                </p>
              </div>
            </div>

            {/* Desktop : tableau */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                  <tr>
                    <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Matiére</th>
                    <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Code</th>
                    <th className="text-right p-3 font-medium text-[var(--color-ink-muted)]">Coefficient</th>
                    <th className="text-right p-3 font-medium text-[var(--color-ink-muted)]">Notes</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((m) => (
                    <tr key={m.id} className="border-t border-[var(--color-border)] hover:bg-neutral-50/60">
                      <td className="p-3 font-medium">{m.nom}</td>
                      <td className="p-3 font-mono text-xs text-[var(--color-ink-muted)]">{m.code || "—"}</td>
                      <td className="p-3 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-[var(--color-brand-soft)] text-[var(--color-brand)] tnum">
                          {m.coefficient}
                        </span>
                      </td>
                      <td className="p-3 text-right tnum text-[var(--color-ink-muted)]">{m._count.notes}</td>
                      <td className="p-3 text-right">
                        <Link href={"/matieres/" + m.id} className="text-[var(--color-brand)] text-sm hover:underline">
                          Modifier
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile : cartes */}
            <div className="md:hidden divide-y divide-[var(--color-border)]">
              {items.map((m) => (
                <Link
                  key={m.id}
                  href={"/matieres/" + m.id}
                  className="flex items-center justify-between p-4 hover:bg-neutral-50"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{m.nom}</p>
                    <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                      {m.code ? m.code + " · " : ""}Coef. {m.coefficient} · {m._count.notes} note(s)
                    </p>
                  </div>
                  <span className="text-[var(--color-ink-muted)] text-lg">›</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })}

      {matieres.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-[var(--color-border-strong)] py-16 text-center">
          <p className="text-sm text-[var(--color-ink-muted)]">
            Aucune matiére. Créez-en une pour commencer.
          </p>
        </div>
      )}
    </div>
  );
}