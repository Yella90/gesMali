import Link from "next/link";
import { ecole } from "@/lib/data/ecole";
import { requirePermission } from "@/lib/auth/session";
import { peut } from "@/lib/auth/permissions";
import { LIB_CAISSE, type CaisseT } from "@/lib/tresorerie/tresorerie";
import { listerPrets, type StatutEcheance } from "@/lib/tresorerie/prets";
import { BoutonAnnulerMouvement, FormulaireMouvement } from "../tresorerie/Formulaires";
import { FormulaireRemboursement } from "./Remboursement";

const f = (n: number) => Math.round(n).toLocaleString("fr-FR") + " F";
const jour = (d: Date) => d.toLocaleDateString("fr-FR");

const STATUTS: Record<StatutEcheance, { libelle: string; classe: string }> = {
  payee: { libelle: "Payée", classe: "bg-[var(--color-accent-soft)] text-[var(--color-accent)]" },
  partielle: { libelle: "Partielle", classe: "bg-amber-50 text-amber-800" },
  en_retard: { libelle: "En retard", classe: "bg-red-50 text-red-700" },
  a_venir: { libelle: "À venir", classe: "bg-neutral-100 text-neutral-600" },
};

// Finance : d'ou vient l'argent de l'ecole (fonds propres du promoteur ou prets) et ce qui reste a rembourser
export default async function FinancePage() {
  const user = await requirePermission("tresorerie.read");
  const db = ecole(user);
  const [capital, prets] = await Promise.all([
    db.mouvementTresorerie.groupBy({
      by: ["type", "origineApport"],
      where: { etablissementId: user.etablissementId, type: { in: ["APPORT_CAPITAL", "RETRAIT_PROMOTEUR"] }, annule: false },
      _sum: { montant: true },
    }),
    listerPrets(user.etablissementId),
  ]);

  const somme = (filtre: (c: (typeof capital)[number]) => boolean) => capital.filter(filtre).reduce((s, c) => s + (c._sum.montant ?? 0), 0);
  // Apport saisi avant le choix fonds propres / pret : fonds propres
  const fondsPropres = somme((c) => c.type === "APPORT_CAPITAL" && c.origineApport !== "PRET");
  const retraits = somme((c) => c.type === "RETRAIT_PROMOTEUR");
  const emprunte = prets.reduce((s, p) => s + p.montant, 0);
  const resteDu = prets.reduce((s, p) => s + p.resteDu, 0);
  const rembourse = prets.reduce((s, p) => s + p.rembourse, 0);
  const enRetard = prets.reduce((s, p) => s + p.enRetard, 0);
  const peutCapital = peut(user.roles, "tresorerie.capital");
  const estDirecteur = user.roles.includes("DIRECTEUR");
  const enCours = prets.filter((p) => !p.solde);
  const soldes = prets.filter((p) => p.solde);

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Finance</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-ink-muted)]">
            Origine de l&apos;argent de l&apos;école : fonds propres du promoteur, ou prêts à rembourser selon leur échéancier.
          </p>
        </div>
        {peutCapital && (
          <div className="flex flex-wrap gap-2">
            <FormulaireMouvement type="APPORT_CAPITAL" categories={[]} estDirecteur={estDirecteur} origineInitiale="PRET" libelleBouton="Nouveau prêt" principal />
            <FormulaireMouvement type="APPORT_CAPITAL" categories={[]} estDirecteur={estDirecteur} libelleBouton="Apport en fonds propres" />
            <FormulaireMouvement type="RETRAIT_PROMOTEUR" categories={[]} estDirecteur={estDirecteur} />
          </div>
        )}
      </div>

      <section className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-5">
          <h2 className="font-semibold">Fonds propres</h2>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs text-[var(--color-ink-muted)]">Apportés</dt>
              <dd className="mt-0.5 font-semibold tnum">{f(fondsPropres)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-ink-muted)]">Retirés</dt>
              <dd className="mt-0.5 font-semibold tnum">{f(retraits)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-ink-muted)]">Apport net</dt>
              <dd className="mt-0.5 font-semibold tnum text-[var(--color-brand)]">{f(fondsPropres - retraits)}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-5">
          <h2 className="font-semibold">Prêts</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-[var(--color-ink-muted)]">Empruntés</dt>
              <dd className="mt-0.5 font-semibold tnum">{f(emprunte)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-ink-muted)]">Remboursés</dt>
              <dd className="mt-0.5 font-semibold tnum">{f(rembourse)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-ink-muted)]">Reste dû</dt>
              <dd className="mt-0.5 font-semibold tnum text-[var(--color-brand)]">{f(resteDu)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-ink-muted)]">En retard</dt>
              <dd className={"mt-0.5 font-semibold tnum " + (enRetard > 0 ? "text-red-700" : "")}>{f(enRetard)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Prêts en cours</h2>
        {enCours.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--color-border-strong)] bg-white p-8 text-center text-sm text-[var(--color-ink-muted)]">
            Aucun prêt en cours.{peutCapital && " Enregistrez un prêt avec « Nouveau prêt » : l'argent reçu entre dans la caisse choisie."}
          </p>
        ) : (
          enCours.map((p) => <CartePret key={p.id} p={p} peutCapital={peutCapital} estDirecteur={estDirecteur} />)
        )}
      </section>

      {soldes.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Prêts remboursés</h2>
          {soldes.map((p) => <CartePret key={p.id} p={p} peutCapital={peutCapital} estDirecteur={estDirecteur} />)}
        </section>
      )}

      <p className="text-xs text-[var(--color-ink-muted)]">
        Les entrées et sorties d&apos;argent apparaissent aussi dans la <Link href="/tresorerie" className="underline">trésorerie</Link>. Un prêt
        s&apos;annule en annulant son entrée d&apos;argent dans la trésorerie, tant qu&apos;aucun remboursement n&apos;est enregistré.
      </p>
    </div>
  );
}

function CartePret({
  p,
  peutCapital,
  estDirecteur,
}: {
  p: Awaited<ReturnType<typeof listerPrets>>[number];
  peutCapital: boolean;
  estDirecteur: boolean;
}) {
  const progression = p.totalDu > 0 ? Math.min(100, (p.rembourse / p.totalDu) * 100) : 100;
  const propose = p.enRetard > 0 ? p.enRetard : (p.prochaine?.montant ?? p.resteDu);
  return (
    <article className="rounded-xl border border-[var(--color-border)] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{p.preteur}</h3>
          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
            {f(p.montant)} empruntés le {jour(p.dateObtention)} · {p.dureeMois} mois · {p.tauxAnnuel > 0 ? p.tauxAnnuel.toLocaleString("fr-FR") + " % par an" : "sans intérêts"}
            {p.notes && " · " + p.notes}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {p.enRetard > 0 && <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700">{f(p.enRetard)} en retard</span>}
          {p.solde && <span className="rounded-md bg-[var(--color-accent-soft)] px-2 py-1 text-xs font-medium text-[var(--color-accent)]">Remboursé</span>}
          {peutCapital && !p.solde && (
            <FormulaireRemboursement pretId={p.id} preteur={p.preteur} montantPropose={propose} resteDu={p.resteDu} estDirecteur={estDirecteur} />
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2 overflow-hidden rounded-full bg-neutral-100" role="progressbar" aria-valuenow={Math.round(progression)} aria-valuemin={0} aria-valuemax={100} aria-label="Part remboursée">
          <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: progression + "%" }} />
        </div>
        <p className="mt-1.5 flex flex-wrap justify-between gap-2 text-xs text-[var(--color-ink-muted)]">
          <span>Remboursé {f(p.rembourse)} sur {f(p.totalDu)}{p.totalDu > p.montant && " (dont " + f(p.totalDu - p.montant) + " d'intérêts)"}</span>
          <span>
            Reste dû <span className="font-semibold text-[var(--color-ink)]">{f(p.resteDu)}</span>
            {p.prochaine && " · prochaine échéance " + f(p.prochaine.montant) + " le " + jour(p.prochaine.date)}
          </span>
        </p>
      </div>

      <details className="mt-3 rounded-lg border border-[var(--color-border)] text-sm">
        <summary className="cursor-pointer px-3 py-2 font-medium">Échéancier ({p.echeances.length} échéances)</summary>
        <div className="overflow-x-auto border-t border-[var(--color-border)]">
          <table className="w-full whitespace-nowrap text-xs">
            <thead className="bg-[var(--color-surface)] text-left text-[var(--color-ink-muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">N°</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 text-right font-medium">Capital</th>
                <th className="px-3 py-2 text-right font-medium">Intérêts</th>
                <th className="px-3 py-2 text-right font-medium">Échéance</th>
                <th className="px-3 py-2 text-right font-medium">Payé</th>
                <th className="px-3 py-2 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {p.echeances.map((e) => (
                <tr key={e.ordre}>
                  <td className="px-3 py-1.5 tnum">{e.ordre}</td>
                  <td className="px-3 py-1.5 tnum">{jour(e.dateEcheance)}</td>
                  <td className="px-3 py-1.5 text-right tnum">{f(e.capital)}</td>
                  <td className="px-3 py-1.5 text-right tnum">{f(e.interet)}</td>
                  <td className="px-3 py-1.5 text-right font-medium tnum">{f(e.montant)}</td>
                  <td className="px-3 py-1.5 text-right tnum">{f(e.paye)}</td>
                  <td className="px-3 py-1.5">
                    <span className={"rounded px-1.5 py-0.5 " + STATUTS[e.statut].classe}>{STATUTS[e.statut].libelle}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {p.remboursements.length > 0 && (
        <details className="mt-2 rounded-lg border border-[var(--color-border)] text-sm">
          <summary className="cursor-pointer px-3 py-2 font-medium">Remboursements ({p.remboursements.length})</summary>
          <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
            {p.remboursements.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-xs">
                <span className="w-20 tnum text-[var(--color-ink-muted)]">{jour(r.date)}</span>
                <span className="min-w-0 flex-1">
                  {LIB_CAISSE[r.caisse as CaisseT] ?? r.caisse}
                  {r.reference && <span className="text-[var(--color-ink-muted)]"> · {r.reference}</span>}
                </span>
                <span className="font-semibold tnum">{f(r.montant)}</span>
                {peutCapital && <BoutonAnnulerMouvement id={r.id} />}
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
