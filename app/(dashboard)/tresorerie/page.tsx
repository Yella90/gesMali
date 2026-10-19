import Link from "next/link";
import { ecole } from "@/lib/data/ecole";
import { requirePermission } from "@/lib/auth/session";
import { peut } from "@/lib/auth/permissions";
import { fmtPeriode, periodeActuelle } from "@/lib/frais/periode";
import { moisValide, optionsMois } from "@/lib/tableau-de-bord/finances";
import { CATEGORIES_DEPENSE, journal, LIB_CAISSE, previsionMois, soldesCaisses } from "@/lib/tresorerie/tresorerie";
import { AlertePrevision } from "@/components/tresorerie/AlertePrevision";
import { BoutonAnnulerMouvement, BoutonBasculerRecurrente, FormulaireMouvement, NouvelleDepenseRecurrente } from "./Formulaires";

const f = (n: number) => n.toLocaleString("fr-FR") + " F";

export default async function TresoreriePage({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  const user = await requirePermission("tresorerie.read");
  const db = ecole(user);
  const { mois: m } = await searchParams;
  const mois = moisValide(m);
  const [a, mm] = mois.split("-").map(Number);
  const debut = new Date(a, mm - 1, 1);
  const fin = new Date(a, mm, 1);

  const [soldes, prevision, lignes, recurrentes] = await Promise.all([
    soldesCaisses(user.etablissementId),
    previsionMois(user.etablissementId),
    journal(user.etablissementId, debut, fin),
    db.depenseRecurrente.findMany({ where: { etablissementId: user.etablissementId }, orderBy: [{ actif: "desc" }, { jourEcheance: "asc" }] }),
  ]);

  const total = soldes.reduce((s, c) => s + c.solde, 0);
  const estDirecteur = user.roles.includes("DIRECTEUR");
  const peutDepenser = peut(user.roles, "tresorerie.depense");
  const peutCapital = peut(user.roles, "tresorerie.capital");
  const entrees = lignes.reduce((s, l) => s + l.entree, 0);
  const sorties = lignes.reduce((s, l) => s + l.sortie, 0);
  const moisCourant = mois === periodeActuelle();

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Trésorerie</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">Soldes par caisse, mouvements et prévision des sorties du mois.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {peutDepenser && <FormulaireMouvement type="DEPENSE" categories={CATEGORIES_DEPENSE} estDirecteur={estDirecteur} principal />}
          {peutCapital && <FormulaireMouvement type="APPORT_CAPITAL" categories={[]} estDirecteur={estDirecteur} />}
          {peutCapital && <FormulaireMouvement type="RETRAIT_PROMOTEUR" categories={[]} estDirecteur={estDirecteur} />}
          <Link href="/tresorerie/rapport" className="inline-flex h-10 items-center rounded-lg border border-[var(--color-border-strong)] bg-white px-4 text-sm font-medium hover:bg-neutral-50">
            Rapport financier
          </Link>
        </div>
      </div>

      {/* Prevision : le solde couvre-t-il les sorties prevues du mois ? */}
      <AlertePrevision prevision={prevision} peutCapital={peutCapital} />

      {/* Soldes */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl bg-[var(--color-brand)] p-4 text-white">
          <p className="text-xs text-white/70">Solde total</p>
          <p className={"mt-1 text-2xl font-semibold " + (total < 0 ? "text-red-200" : "")}>{f(total)}</p>
        </div>
        {soldes.map((s) => (
          <div key={s.caisse} className="rounded-xl border border-[var(--color-border)] bg-white p-4">
            <p className="text-xs text-[var(--color-ink-muted)]">{LIB_CAISSE[s.caisse]}</p>
            <p className={"mt-1 text-xl font-semibold " + (s.solde < 0 ? "text-red-700" : "")}>{f(s.solde)}</p>
            <p className="mt-1 text-[11px] text-[var(--color-ink-muted)]">
              +{f(s.frais + s.apports)} / −{f(s.salaires + s.depenses + s.retraits)}
            </p>
          </div>
        ))}
      </div>

      {/* Journal du mois */}
      <section className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
        <form className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--color-border)] p-5">
          <div>
            <h2 className="font-semibold">Mouvements de {fmtPeriode(mois).toLowerCase()}</h2>
            <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
              Entrées {f(entrees)} · sorties {f(sorties)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select name="mois" defaultValue={mois} aria-label="Mois" className="h-9 rounded-lg border border-[var(--color-border-strong)] bg-white px-2.5 text-sm">
              {optionsMois().map((o) => <option key={o.valeur} value={o.valeur}>{o.libelle}</option>)}
            </select>
            <button type="submit" className="h-9 rounded-lg bg-[var(--color-brand)] px-3 text-sm text-white">Afficher</button>
          </div>
        </form>
        {lignes.length === 0 ? (
          <p className="p-8 text-center text-sm text-[var(--color-ink-muted)]">Aucun mouvement ce mois-ci.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {lignes.map((l) => (
              <li key={l.cle} className={"flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm " + (l.annule ? "opacity-50" : "")}>
                <span className="w-20 shrink-0 text-xs text-[var(--color-ink-muted)] tnum">{l.date.toLocaleDateString("fr-FR")}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{l.nature}</span>
                  <span className="text-[var(--color-ink-muted)]"> · {l.libelle}</span>
                  {l.derogation && <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-800">dérogation</span>}
                  <span className="block text-[11px] text-[var(--color-ink-faint)]">{LIB_CAISSE[l.caisse]}</span>
                </span>
                <span className={"font-semibold tnum " + (l.entree ? "text-[var(--color-accent)]" : "text-[var(--color-ink)]") + (l.annule ? " line-through" : "")}>
                  {l.entree ? "+" + f(l.entree) : l.sortie ? "−" + f(l.sortie) : "0 F"}
                </span>
                {l.mouvementId && !l.annule && peutCapital && <BoutonAnnulerMouvement id={l.mouvementId} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Depenses recurrentes */}
      <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
        <h2 className="font-semibold">Dépenses récurrentes</h2>
        <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
          Charges qui reviennent chaque mois : elles sont comptées dans la prévision tant que leur jour d&apos;échéance n&apos;est pas passé.
        </p>
        {recurrentes.length > 0 && (
          <ul className="mt-4 divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)]">
            {recurrentes.map((d) => (
              <li key={d.id} className={"flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm " + (d.actif ? "" : "opacity-50")}>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{d.libelle}</span>
                  <span className="text-[var(--color-ink-muted)]"> · {d.categorie} · le {d.jourEcheance} du mois · {LIB_CAISSE[d.caisse]}</span>
                </span>
                <span className="font-semibold tnum">{f(d.montant)}</span>
                {peutDepenser && <BoutonBasculerRecurrente id={d.id} actif={d.actif} />}
              </li>
            ))}
          </ul>
        )}
        {peutDepenser && (
          <div className="mt-4">
            <NouvelleDepenseRecurrente categories={CATEGORIES_DEPENSE} />
          </div>
        )}
      </section>

      {!moisCourant && (
        <p className="text-xs text-[var(--color-ink-muted)]">Les soldes et la prévision sont toujours calculés à ce jour.</p>
      )}
    </div>
  );
}
