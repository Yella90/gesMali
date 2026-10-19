import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { fmtPeriode } from "@/lib/frais/periode";
import { moisValide, optionsMois } from "@/lib/tableau-de-bord/finances";
import { LIB_CAISSE } from "@/lib/tresorerie/tresorerie";
import { periodeRapport, rapportFinancier } from "@/lib/tresorerie/rapport";

const f = (n: number) => n.toLocaleString("fr-FR") + " F";

export default async function RapportFinancierPage({
  searchParams,
}: {
  searchParams: Promise<{ debut?: string; fin?: string }>;
}) {
  const user = await requirePermission("tresorerie.read");
  const q = await searchParams;
  const finMois = moisValide(q.fin);
  const debutMois = q.debut && moisValide(q.debut) <= finMois ? moisValide(q.debut) : finMois;
  const { debut, fin } = periodeRapport(debutMois, finMois);
  const r = await rapportFinancier(user.etablissementId, debut, fin);
  const options = optionsMois();
  const periode = debutMois === finMois ? fmtPeriode(debutMois) : fmtPeriode(debutMois) + " à " + fmtPeriode(finMois);
  const totalDebut = r.soldesDebut.reduce((s, c) => s + c.solde, 0);
  const totalFin = r.soldesFin.reduce((s, c) => s + c.solde, 0);

  return (
    <div className="max-w-5xl space-y-5">
      <Link href="/tresorerie" className="text-xs text-[var(--color-ink-muted)] hover:underline">← Retour à la trésorerie</Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Rapport financier</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{periode}</p>
        </div>
        <a
          href={"/api/tresorerie/rapport/pdf?debut=" + debutMois + "&fin=" + finMois}
          target="_blank"
          className="inline-flex h-10 items-center rounded-lg bg-[var(--color-brand)] px-4 text-sm font-medium text-white hover:bg-[var(--color-brand-dark)]"
        >
          Exporter en PDF
        </a>
      </div>

      <form className="flex flex-wrap items-end gap-2 rounded-xl border border-[var(--color-border)] bg-white p-4">
        <label className="text-xs text-[var(--color-ink-muted)]">
          Du
          <select name="debut" defaultValue={debutMois} className="mt-1 block h-9 rounded-lg border border-[var(--color-border-strong)] bg-white px-2.5 text-sm">
            {options.map((o) => <option key={o.valeur} value={o.valeur}>{o.libelle}</option>)}
          </select>
        </label>
        <label className="text-xs text-[var(--color-ink-muted)]">
          Au
          <select name="fin" defaultValue={finMois} className="mt-1 block h-9 rounded-lg border border-[var(--color-border-strong)] bg-white px-2.5 text-sm">
            {options.map((o) => <option key={o.valeur} value={o.valeur}>{o.libelle}</option>)}
          </select>
        </label>
        <button type="submit" className="h-9 rounded-lg bg-[var(--color-brand)] px-3 text-sm text-white">Afficher</button>
      </form>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Chiffre label="Recettes" valeur={f(r.totalRecettes)} />
        <Chiffre label="Charges" valeur={f(r.totalCharges)} />
        <Chiffre label="Résultat" valeur={f(r.resultat)} ton={r.resultat < 0 ? "danger" : "succes"} />
        <Chiffre label="Impayés à fin de période" valeur={f(r.impayes)} ton={r.impayes > 0 ? "danger" : undefined} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Tableau titre="Recettes de l'école" lignes={r.recettes} total={r.totalRecettes} />
        <Tableau titre="Charges de l'école" lignes={r.charges} total={r.totalCharges} vide="Aucune charge sur la période." />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
          <h2 className="font-semibold">Promoteur</h2>
          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">Hors recettes et charges de l&apos;école.</p>
          <dl className="mt-3 space-y-2 text-sm">
            <Ligne libelle="Apports de capital" montant={r.apports} />
            <Ligne libelle="Retraits du promoteur" montant={r.retraits} />
            <Ligne libelle="Apport net" montant={r.apports - r.retraits} fort />
          </dl>
        </section>
        <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
          <h2 className="font-semibold">Soldes des caisses</h2>
          <table className="mt-3 w-full text-sm tnum">
            <thead>
              <tr className="text-left text-xs text-[var(--color-ink-muted)]">
                <th className="pb-2 font-medium">Caisse</th>
                <th className="pb-2 text-right font-medium">Début</th>
                <th className="pb-2 text-right font-medium">Fin</th>
              </tr>
            </thead>
            <tbody>
              {r.soldesFin.map((c, i) => (
                <tr key={c.caisse} className="border-t border-[var(--color-border)]">
                  <td className="py-2">{LIB_CAISSE[c.caisse]}</td>
                  <td className="py-2 text-right">{f(r.soldesDebut[i].solde)}</td>
                  <td className="py-2 text-right">{f(c.solde)}</td>
                </tr>
              ))}
              <tr className="border-t border-[var(--color-border)] font-semibold">
                <td className="py-2">Total</td>
                <td className="py-2 text-right">{f(totalDebut)}</td>
                <td className="py-2 text-right">{f(totalFin)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      <p className="text-xs text-[var(--color-ink-muted)]">
        Outil de gestion interne : ce rapport ne remplace pas une comptabilité conforme au référentiel SYSCOHADA.
      </p>
    </div>
  );
}

function Chiffre({ label, valeur, ton }: { label: string; valeur: string; ton?: "danger" | "succes" }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-4">
      <p className="text-xs text-[var(--color-ink-muted)]">{label}</p>
      <p className={"mt-1 text-xl font-semibold " + (ton === "danger" ? "text-red-700" : ton === "succes" ? "text-[var(--color-accent)]" : "")}>{valeur}</p>
    </div>
  );
}

function Tableau({ titre, lignes, total, vide }: { titre: string; lignes: { libelle: string; montant: number }[]; total: number; vide?: string }) {
  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
      <h2 className="font-semibold">{titre}</h2>
      {lignes.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--color-ink-muted)]">{vide}</p>
      ) : (
        <dl className="mt-3 space-y-2 text-sm">
          {lignes.map((l) => <Ligne key={l.libelle} libelle={l.libelle} montant={l.montant} />)}
          <Ligne libelle="Total" montant={total} fort />
        </dl>
      )}
    </section>
  );
}

function Ligne({ libelle, montant, fort }: { libelle: string; montant: number; fort?: boolean }) {
  return (
    <div className={"flex justify-between gap-3 " + (fort ? "border-t border-[var(--color-border)] pt-2 font-semibold" : "")}>
      <dt>{libelle}</dt>
      <dd className="tnum">{f(montant)}</dd>
    </div>
  );
}
