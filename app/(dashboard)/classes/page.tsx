import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";

export default async function ClassesPage() {
  const user = await requirePermission("classe.read");

  const classes = await prisma.classe.findMany({
    where: { etablissementId: user.etablissementId },
    include: {
      anneeScolaire: true,
      eleves: {
        where: { statut: "INSCRIT" },
        select: { sexe: true },
      },
    },
    orderBy: [
      { anneeScolaire: { libelle: "desc" } },
      { niveau: "asc" },
      { section: "asc" },
    ],
  });

  function lib(c: any) {
    return c.nom || (c.niveau + (c.section ? " " + c.section : ""));
  }
  function cycleCourt(cycle: string) {
    if (cycle === "PRESCOLAIRE") return "Préscolaire";
    if (cycle === "PREMIER_CYCLE") return "1er cycle";
    return "2nd cycle";
  }

  // Stats globales
  const totalEleves = classes.reduce((s, c) => s + c.eleves.length, 0);
  const totalFilles = classes.reduce(
    (s, c) => s + c.eleves.filter((e) => e.sexe === "F").length,
    0
  );
  const totalGarcons = totalEleves - totalFilles;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Classes</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">
            {classes.length} classe(s) · {totalEleves} élève(s) inscrit(s)
          </p>
        </div>
        <Link
          href="/classes/nouveau"
          className="inline-flex items-center h-10 px-4 rounded-lg bg-[var(--color-brand)] text-white text-sm font-medium hover:bg-[var(--color-brand-dark)]"
        >
          + Nouvelle classe
        </Link>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <StatGlobal
          label="Total élèves"
          value={totalEleves}
          color="brand"
        />
        <StatGlobal
          label="Filles"
          value={totalFilles}
          color="pink"
          pourcentage={totalEleves > 0 ? Math.round((totalFilles / totalEleves) * 100) : 0}
        />
        <StatGlobal
          label="Garçons"
          value={totalGarcons}
          color="blue"
          pourcentage={totalEleves > 0 ? Math.round((totalGarcons / totalEleves) * 100) : 0}
        />
      </div>

      {/* Desktop : tableau */}
      <div className="hidden md:block bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
            <tr>
              <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Classe</th>
              <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Cycle</th>
              <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Année</th>
              <th className="text-right p-3 font-medium text-[var(--color-ink-muted)]">Inscription</th>
              <th className="text-right p-3 font-medium text-[var(--color-ink-muted)]">Mensuel</th>
              <th className="text-right p-3 font-medium text-[var(--color-ink-muted)]">Effectif</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => {
              const filles = c.eleves.filter((e) => e.sexe === "F").length;
              const garcons = c.eleves.length - filles;
              const plein = c.eleves.length >= c.capaciteMax;
              const taux = c.capaciteMax > 0 ? (c.eleves.length / c.capaciteMax) * 100 : 0;

              return (
                <tr key={c.id} className="border-t border-[var(--color-border)] hover:bg-neutral-50/60">
                  <td className="p-3 font-medium">{lib(c)}</td>
                  <td className="p-3 text-[var(--color-ink-muted)]">{cycleCourt(c.cycle)}</td>
                  <td className="p-3 text-[var(--color-ink-muted)] text-xs">{c.anneeScolaire.libelle}</td>
                  <td className="p-3 text-right tnum">{c.fraisInscription.toLocaleString("fr-FR")} F</td>
                  <td className="p-3 text-right tnum">{c.fraisScolariteMensuel.toLocaleString("fr-FR")} F</td>
                  <td className="p-3">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <span className="tnum text-sm font-semibold">
                          {c.eleves.length}
                          <span className="text-xs text-[var(--color-ink-muted)] font-normal">
                            {" / "}{c.capaciteMax}
                          </span>
                        </span>
                        <span className="w-16 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                          <span
                            className={"block h-full " + (plein ? "bg-red-500" : taux > 80 ? "bg-amber-500" : "bg-[var(--color-accent)]")}
                            style={{ width: Math.min(taux, 100) + "%" }}
                          />
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-pink-50 text-pink-700">
                          <span className="font-medium">{filles}</span>
                          <span>F</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                          <span className="font-medium">{garcons}</span>
                          <span>G</span>
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <Link href={"/classes/" + c.id} className="text-[var(--color-brand)] text-sm hover:underline">
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              );
            })}
            {classes.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-[var(--color-ink-muted)]">
                  Aucune classe. Créez-en une pour commencer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile : cartes */}
      <div className="md:hidden space-y-3">
        {classes.map((c) => {
          const filles = c.eleves.filter((e) => e.sexe === "F").length;
          const garcons = c.eleves.length - filles;
          const plein = c.eleves.length >= c.capaciteMax;
          const taux = c.capaciteMax > 0 ? (c.eleves.length / c.capaciteMax) * 100 : 0;

          return (
            <Link
              key={c.id}
              href={"/classes/" + c.id}
              className="block bg-white rounded-xl border border-[var(--color-border)] p-4 hover:border-[var(--color-border-strong)]"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold">{lib(c)}</p>
                  <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                    {cycleCourt(c.cycle)} · {c.anneeScolaire.libelle}
                  </p>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-[var(--color-brand-soft)] text-[var(--color-brand)] tnum">
                  {c.eleves.length}/{c.capaciteMax}
                </span>
              </div>

              {/* Repartition F/G */}
              <div className="grid grid-cols-2 gap-2 text-sm pt-3 border-t border-[var(--color-border)] mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-pink-50 text-pink-700 flex items-center justify-center text-[10px] font-bold">
                    F
                  </span>
                  <div>
                    <p className="text-[10px] text-[var(--color-ink-muted)]">Filles</p>
                    <p className="font-medium tnum text-sm">{filles}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                    G
                  </span>
                  <div>
                    <p className="text-[10px] text-[var(--color-ink-muted)]">Garçons</p>
                    <p className="font-medium tnum text-sm">{garcons}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm pb-3 border-b border-[var(--color-border)]">
                <div>
                  <p className="text-xs text-[var(--color-ink-muted)]">Inscription</p>
                  <p className="font-medium tnum mt-0.5">{c.fraisInscription.toLocaleString("fr-FR")} F</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-ink-muted)]">Mensuel</p>
                  <p className="font-medium tnum mt-0.5">{c.fraisScolariteMensuel.toLocaleString("fr-FR")} F</p>
                </div>
              </div>

              <div className="mt-3 h-1 rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className={"h-full " + (plein ? "bg-red-500" : taux > 80 ? "bg-amber-500" : "bg-[var(--color-accent)]")}
                  style={{ width: Math.min(taux, 100) + "%" }}
                />
              </div>
            </Link>
          );
        })}
        {classes.length === 0 && (
          <p className="text-center text-[var(--color-ink-muted)] py-12">Aucune classe.</p>
        )}
      </div>
    </div>
  );
}

function StatGlobal({
  label,
  value,
  color,
  pourcentage,
}: {
  label: string;
  value: number;
  color: "brand" | "pink" | "blue";
  pourcentage?: number;
}) {
  const styles = {
    brand: "bg-[var(--color-brand-soft)] text-[var(--color-brand)]",
    pink: "bg-pink-50 text-pink-700",
    blue: "bg-blue-50 text-blue-700",
  };
  const valueColor = {
    brand: "",
    pink: "text-pink-700",
    blue: "text-blue-700",
  };

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
      <span
        className={
          "inline-block px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wide " +
          styles[color]
        }
      >
        {label}
      </span>
      <div className="flex items-baseline gap-2 mt-2">
        <p className={"text-2xl font-semibold tnum " + valueColor[color]}>
          {value}
        </p>
        {pourcentage !== undefined && (
          <span className="text-xs text-[var(--color-ink-muted)] tnum">
            ({pourcentage} %)
          </span>
        )}
      </div>
    </div>
  );
}