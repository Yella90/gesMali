import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";

export default async function TableauDeBordPaiementsPage() {
  const user = await requirePermission("paiement.read");

  const paiements = await prisma.paiement.findMany({
    where: { etablissementId: user.etablissementId, statut: "PAYE" },
    include: { employe: { select: { id: true, nom: true, prenom: true, poste: true } } },
    orderBy: { datePaiement: "desc" },
  });

  const parMois: Record<string, number> = {};
  const parType: Record<string, number> = {};
  const parEmploye: Record<string, { nom: string; poste: string; total: number; count: number }> = {};

  for (const p of paiements) {
    parMois[p.periode] = (parMois[p.periode] ?? 0) + p.montant;
    parType[p.type] = (parType[p.type] ?? 0) + p.montant;

    const k = p.employeId;
    if (!parEmploye[k]) {
      parEmploye[k] = {
        nom: p.employe.nom + " " + p.employe.prenom,
        poste: p.employe.poste,
        total: 0,
        count: 0,
      };
    }
    parEmploye[k].total += p.montant;
    parEmploye[k].count += 1;
  }

  const moisTries = Object.entries(parMois).sort(([a], [b]) => b.localeCompare(a));
  const typesTries = Object.entries(parType).sort(([, a], [, b]) => b - a);
  const employesTries = Object.values(parEmploye).sort((a, b) => b.total - a.total);
  const totalGeneral = paiements.reduce((s, p) => s + p.montant, 0);

  const moisActuel = new Date().toISOString().slice(0, 7);
  const totalMoisActuel = parMois[moisActuel] ?? 0;
  const maxMois = Math.max(...Object.values(parMois), 1);

  function fmtPeriode(p: string) {
    const [an, mois] = p.split("-");
    const noms = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Aoùt","Sep","Oct","Nov","Déc"];
    return noms[parseInt(mois) - 1] + " " + an;
  }

  function labelType(t: string) {
    const map: Record<string, string> = {
      MENSUEL: "Mensuel",
      HORAIRE: "Horaire",
      PRIME: "Prime",
      AVANCE: "Avance",
      REMBOURSEMENT: "Remboursement",
    };
    return map[t] ?? t;
  }

  return (
    <div className="space-y-5">
      <Link href="/paiements" className="text-xs text-[var(--color-ink-muted)] hover:underline">
        ← Retour aux paiements
      </Link>

      <div>
        <h1 className="text-2xl font-semibold mt-1">Tableau de bord financier</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-1">
          Masse salariale et répartition des paiements
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Stat label="Total payé" value={totalGeneral.toLocaleString("fr-FR") + " F"} accent="brand" />
        <Stat label="Ce mois" value={totalMoisActuel.toLocaleString("fr-FR") + " F"} accent="accent" />
        <Stat label="Employés payés" value={String(Object.keys(parEmploye).length)} />
        <Stat label="Paiements" value={String(paiements.length)} />
      </div>

      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <h2 className="font-semibold mb-4">Masse salariale par mois</h2>
        {moisTries.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">Aucun paiement enregistré.</p>
        ) : (
          <div className="space-y-3">
            {moisTries.slice(0, 12).map(([mois, total]) => (
              <div key={mois}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{fmtPeriode(mois)}</span>
                  <span className="tnum font-semibold">{total.toLocaleString("fr-FR")} F</span>
                </div>
                <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                  <div
                    className="h-full bg-[var(--color-brand)] rounded-full"
                    style={{ width: (total / maxMois) * 100 + "%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {typesTries.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <h2 className="font-semibold mb-4">Répartition par type</h2>
          <div className="space-y-3">
            {typesTries.map(([type, total]) => {
              const pourcentage = totalGeneral > 0 ? (total / totalGeneral) * 100 : 0;
              return (
                <div key={type}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{labelType(type)}</span>
                    <span className="tnum">
                      {total.toLocaleString("fr-FR")} F
                      <span className="text-[var(--color-ink-muted)] ml-2">({pourcentage.toFixed(0)} %)</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                    <div className="h-full bg-[var(--color-accent)] rounded-full" style={{ width: pourcentage + "%" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="p-5 border-b border-[var(--color-border)]">
          <h2 className="font-semibold">Total par employé</h2>
        </div>
        {employesTries.length === 0 ? (
          <p className="p-6 text-center text-sm text-[var(--color-ink-muted)]">Aucun bénéficiaire.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
              <tr>
                <th className="text-left p-3 font-medium text-[var(--color-ink-muted)] w-12">#</th>
                <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Employé</th>
                <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Poste</th>
                <th className="text-right p-3 font-medium text-[var(--color-ink-muted)]">Paiements</th>
                <th className="text-right p-3 font-medium text-[var(--color-ink-muted)]">Total</th>
                <th className="text-right p-3 font-medium text-[var(--color-ink-muted)]">Moyenne</th>
              </tr>
            </thead>
            <tbody>
              {employesTries.map((e, i) => (
                <tr key={i} className="border-t border-[var(--color-border)] hover:bg-neutral-50/60">
                  <td className="p-3 text-[var(--color-ink-faint)] tnum">{i + 1}</td>
                  <td className="p-3 font-medium">{e.nom}</td>
                  <td className="p-3 text-xs text-[var(--color-ink-muted)]">{e.poste}</td>
                  <td className="p-3 text-right tnum text-[var(--color-ink-muted)]">{e.count}</td>
                  <td className="p-3 text-right tnum font-semibold">{e.total.toLocaleString("fr-FR")} F</td>
                  <td className="p-3 text-right tnum text-[var(--color-ink-muted)]">
                    {Math.round(e.total / e.count).toLocaleString("fr-FR")} F
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "brand" | "accent" }) {
  const bg =
    accent === "accent" ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
    : "bg-[var(--color-brand-soft)] text-[var(--color-brand)]";
  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
      <span className={"inline-block px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wide " + bg}>
        {label}
      </span>
      <p className="text-lg md:text-xl font-semibold mt-2 tnum">{value}</p>
    </div>
  );
}