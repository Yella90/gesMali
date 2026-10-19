import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { peut } from "@/lib/auth/permissions";
import { filtreClasses } from "@/lib/data/guard";
import { fmtPeriode } from "@/lib/frais/periode";
import { aujourdhui, jourUtc, jourValide, LIB_STATUT, moisDuJour, syntheseClasse } from "@/lib/presences/presences";
import { FeuillePresence } from "./FeuillePresence";

export default async function PresencesPage({ searchParams }: { searchParams: Promise<{ classe?: string; date?: string }> }) {
  const user = await requirePermission("presence.read");
  const q = await searchParams;
  const jour = jourValide(q.date);

  const classes = await prisma.classe.findMany({
    where: { etablissementId: user.etablissementId, anneeScolaire: { active: true }, ...(await filtreClasses(user)) },
    select: { id: true, nom: true, niveau: true, section: true },
    orderBy: [{ niveau: "asc" }, { section: "asc" }],
  });
  const libelle = (c: (typeof classes)[number]) => c.nom || c.niveau + (c.section ? " " + c.section : "");
  const classe = classes.find((c) => c.id === q.classe) ?? classes[0];

  if (!classe) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-semibold">Présences</h1>
        <p className="rounded-xl border border-[var(--color-border)] bg-white p-8 text-center text-sm text-[var(--color-ink-muted)]">
          Aucune classe disponible pour l&apos;année en cours.
        </p>
      </div>
    );
  }

  const { mois, debut, fin } = moisDuJour(jour);
  const [eleves, saisies, synthese] = await Promise.all([
    prisma.eleve.findMany({
      where: { classeId: classe.id, statut: "INSCRIT" },
      select: { id: true, nom: true, prenom: true, matricule: true, sexe: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    }),
    prisma.presence.findMany({ where: { classeId: classe.id, date: jourUtc(jour) } }),
    syntheseClasse(classe.id, debut, fin),
  ]);
  const initial = Object.fromEntries(
    saisies.map((p) => [p.eleveId, { statut: p.statut, justifie: p.justifie, motif: p.motif ?? "", dureeMinutes: p.dureeMinutes }])
  );
  const concernes = synthese.lignes.filter((l) => l.absences > 0 || l.retards > 0).sort((a, b) => b.absences - a.absences || b.retards - a.retards);

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Présences</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">Appel du jour par classe : présents, absents, retards et justificatifs.</p>
        </div>
        <a
          href={"/api/presences/pdf?classe=" + classe.id + "&mois=" + mois}
          target="_blank"
          className="inline-flex h-10 items-center rounded-lg border border-[var(--color-border-strong)] bg-white px-4 text-sm font-medium hover:bg-neutral-50"
        >
          Exporter {fmtPeriode(mois).toLowerCase()} (PDF)
        </a>
      </div>

      <form className="flex flex-wrap items-end gap-2 rounded-xl border border-[var(--color-border)] bg-white p-4">
        <label className="text-xs text-[var(--color-ink-muted)]">
          Classe
          <select name="classe" defaultValue={classe.id} className="mt-1 block h-9 min-w-[10rem] rounded-lg border border-[var(--color-border-strong)] bg-white px-2.5 text-sm text-[var(--color-ink)]">
            {classes.map((c) => <option key={c.id} value={c.id}>{libelle(c)}</option>)}
          </select>
        </label>
        <label className="text-xs text-[var(--color-ink-muted)]">
          Date
          <input type="date" name="date" defaultValue={jour} max={aujourdhui()} className="mt-1 block h-9 rounded-lg border border-[var(--color-border-strong)] bg-white px-2.5 text-sm text-[var(--color-ink)]" />
        </label>
        <button type="submit" className="h-9 rounded-lg bg-[var(--color-brand)] px-3 text-sm text-white">Afficher</button>
      </form>

      <div>
        <h2 className="mb-2 font-semibold">
          {libelle(classe)} · {jourUtc(jour).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
        </h2>
        <FeuillePresence
          key={classe.id + jour}
          classeId={classe.id}
          jour={jour}
          eleves={eleves.map((e) => ({ id: e.id, nom: e.nom + " " + e.prenom, matricule: e.matricule, sexe: e.sexe }))}
          initial={initial}
          peutSaisir={peut(user.roles, "presence.manage")}
        />
      </div>

      <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
        <h2 className="font-semibold">Bilan de {fmtPeriode(mois).toLowerCase()}</h2>
        <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
          {synthese.joursAppel} jour(s) d&apos;appel · {synthese.incidents.filter((i) => i.statut === "ABSENT").length} absence(s) ·{" "}
          {synthese.incidents.filter((i) => i.statut === "RETARD").length} retard(s)
        </p>
        {concernes.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">Aucune absence ni aucun retard ce mois-ci.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm tnum">
              <thead>
                <tr className="text-left text-xs text-[var(--color-ink-muted)]">
                  <th className="pb-2 font-medium">Élève</th>
                  <th className="pb-2 text-right font-medium">Absences</th>
                  <th className="pb-2 text-right font-medium">dont justifiées</th>
                  <th className="pb-2 text-right font-medium">Retards</th>
                  <th className="pb-2 text-right font-medium">Minutes</th>
                </tr>
              </thead>
              <tbody>
                {concernes.map((l) => (
                  <tr key={l.eleveId} className="border-t border-[var(--color-border)]">
                    <td className="py-2">{l.nom}</td>
                    <td className={"py-2 text-right " + (l.absences - l.absencesJustifiees >= 3 ? "font-semibold text-red-700" : "")}>{l.absences}</td>
                    <td className="py-2 text-right">{l.absencesJustifiees}</td>
                    <td className="py-2 text-right">{l.retards}</td>
                    <td className="py-2 text-right">{l.minutesRetard}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {synthese.incidents.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-[var(--color-brand)]">Détail des absences et retards</summary>
            <ul className="mt-2 divide-y divide-[var(--color-border)] text-sm">
              {synthese.incidents.slice().reverse().map((i) => (
                <li key={i.eleveId + i.date.toISOString()} className="flex flex-wrap gap-x-3 py-2">
                  <span className="w-20 text-xs text-[var(--color-ink-muted)] tnum">{i.date.toLocaleDateString("fr-FR", { timeZone: "UTC" })}</span>
                  <span className="flex-1">{i.nom}</span>
                  <span className={i.statut === "ABSENT" ? "text-red-700" : "text-amber-700"}>
                    {LIB_STATUT[i.statut]}
                    {i.dureeMinutes ? " (" + i.dureeMinutes + " min)" : ""}
                  </span>
                  <span className="text-xs text-[var(--color-ink-muted)]">
                    {i.justifie ? "Justifié" : "Non justifié"}
                    {i.motif ? " · " + i.motif : ""}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </div>
  );
}
