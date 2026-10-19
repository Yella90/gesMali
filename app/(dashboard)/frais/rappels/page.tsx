import Link from "next/link";
import { ecole } from "@/lib/data/ecole";
import { requirePermission } from "@/lib/auth/session";
import { RappelActions } from "./RappelActions";
import { fmtPeriode } from "@/lib/frais/periode";
import { listeRappels, periodesImpayeesEcoulees } from "@/lib/frais/requetes";
import type { ClasseLib } from "@/lib/frais/requetes";

export default async function RappelsPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const { statut } = await searchParams;
  const user = await requirePermission("frais.read");
  const db = ecole(user);

  const envoye = statut === "en_attente" ? false : statut === "envoye" ? true : undefined;

  const [rappels, statsRappels, periodesImpayees] = await Promise.all([
    listeRappels(user.etablissementId, envoye, 200),
    db.rappel.groupBy({
      by: ["envoye"],
      where: { tranche: { frais: { etablissementId: user.etablissementId } } },
      _count: { _all: true },
    }),
    // Periodes avec impayes ET deja ecoulees
    periodesImpayeesEcoulees(user.etablissementId),
  ]);

  const periodesTriees = periodesImpayees.map((p) => ({ periode: p, libelle: fmtPeriode(p) }));

  const nbEnAttente = statsRappels.find((s) => !s.envoye)?._count._all ?? 0;
  const nbEnvoyes = statsRappels.find((s) => s.envoye)?._count._all ?? 0;
  const totalRappels = nbEnAttente + nbEnvoyes;

  function libClasse(c: ClasseLib | null) {
    if (!c) return "-";
    return c.nom || (c.niveau + (c.section ? " " + c.section : ""));
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <Link href="/frais" className="text-xs text-[var(--color-ink-muted)] hover:underline">
        ← Retour aux frais
      </Link>

      <div>
        <h1 className="text-2xl font-semibold mt-1">Rappels</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">
          {totalRappels} rappel(s) · {nbEnAttente} en attente · {nbEnvoyes} envoyé(s)
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <Stat label="Total" value={String(totalRappels)} accent="brand" />
        <Stat label="En attente" value={String(nbEnAttente)} accent={nbEnAttente > 0 ? "gold" : undefined} />
        <Stat label="Envoyés" value={String(nbEnvoyes)} accent="accent" />
      </div>

      <RappelActions
        periodesImpayees={periodesTriees}
        nbEnAttente={nbEnAttente}
        statutFiltre={statut}
      />

      <form className="bg-white rounded-xl border border-[var(--color-border)] p-3 flex gap-2">
        <select name="statut" defaultValue={statut ?? ""} className="flex-1 h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm">
          <option value="">Tous les rappels</option>
          <option value="en_attente">En attente</option>
          <option value="envoye">Envoyés</option>
        </select>
        <button type="submit" className="h-10 px-4 rounded-lg bg-[var(--color-brand)] text-white text-sm hover:bg-[var(--color-brand-dark)]">
          Filtrer
        </button>
      </form>

      {rappels.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-[var(--color-border-strong)] py-16 text-center">
          <p className="text-sm text-[var(--color-ink-muted)]">Aucun rappel.</p>
          <p className="text-xs text-[var(--color-ink-faint)] mt-2">
            Utilisez le bouton ci-dessus pour en générer.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Date</th>
                  <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Élève</th>
                  <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Classe</th>
                  <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Période</th>
                  <th className="text-right p-3 font-medium text-[var(--color-ink-muted)]">Reste</th>
                  <th className="text-center p-3 font-medium text-[var(--color-ink-muted)]">Statut</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {rappels.map((r) => {
                  const reste = r.reste;
                  return (
                    <tr key={r.id} className="border-t border-[var(--color-border)] hover:bg-neutral-50/60">
                      <td className="p-3 text-xs text-[var(--color-ink-muted)] tnum">
                        {new Date(r.dateRappel).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="p-3 font-medium">
                        {r.eleve.nom} {r.eleve.prenom}
                      </td>
                      <td className="p-3 text-xs text-[var(--color-ink-muted)]">{libClasse(r.eleve.classe)}</td>
                      <td className="p-3 text-xs">{r.trancheLibelle}</td>
                      <td className="p-3 text-right tnum font-medium text-red-700">
                        {reste.toLocaleString("fr-FR")}
                      </td>
                      <td className="p-3 text-center">
                        {r.envoye ? (
                          <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-[var(--color-accent-soft)] text-[var(--color-accent)]">Envoyé</span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-amber-50 text-amber-800">En attente</span>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <a
                          href={"/api/frais/rappels/eleve/" + r.eleve.id + "/pdf"}
                          target="_blank"
                          className="text-xs text-[var(--color-accent)] hover:underline"
                        >
                          PDF
                        </a>
                        <Link
                          href={"/frais/eleve/" + r.eleve.id}
                          className="text-[var(--color-brand)] text-xs hover:underline"
                        >
                          Voir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-[var(--color-border)]">
            {rappels.map((r) => {
                  const reste = r.reste;
              return (
                <div key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {r.eleve.nom} {r.eleve.prenom}
                      </p>
                      <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                        {r.trancheLibelle} · {libClasse(r.eleve.classe)}
                      </p>
                    </div>
                    {r.envoye ? (
                      <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-[var(--color-accent-soft)] text-[var(--color-accent)] whitespace-nowrap">Envoyé</span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-amber-50 text-amber-800 whitespace-nowrap">En attente</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--color-ink-muted)] tnum">
                      {new Date(r.dateRappel).toLocaleDateString("fr-FR")}
                    </span>
                    <span className="font-medium text-red-700 tnum">Reste {reste.toLocaleString("fr-FR")} F</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "brand" | "accent" | "gold" }) {
  const bg =
    accent === "accent" ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
    : accent === "gold" ? "bg-[var(--color-gold-soft)] text-[var(--color-gold)]"
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