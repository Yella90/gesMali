import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { fmtPeriode, estPeriodeEcoulee } from "@/lib/frais/periode";

export default async function ImpayesPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; type?: string }>;
}) {
  const { periode, type } = await searchParams;
  const user = await requirePermission("frais.read");

  const where: any = { frais: { etablissementId: user.etablissementId } };
  if (periode) where.periode = periode;

  const tranches = await prisma.trancheFrais.findMany({
    where,
    include: {
      paiements: true,
      frais: { include: { eleve: { include: { classe: true } } } },
    },
    orderBy: [{ dateEcheance: "asc" }],
  });

  const impayes = tranches
    .map((t) => {
      const paye = t.paiements.filter((p) => !p.annule).reduce((s, p) => s + p.montant, 0);
      const reste = t.montant - paye;
      const enRetard = new Date(t.dateEcheance) < new Date();
      const estInscription = t.ordre === 0;
      return { t, reste, paye, enRetard, estInscription };
    })
    .filter((x) => {
      if (x.reste <= 0.01) return false;
      if (type === "inscription" && !x.estInscription) return false;
      if (type === "mensuel" && x.estInscription) return false;
      return true;
    });

  // Filtre : uniquement les periodes ecoulees
  const toutesPeriodes = await prisma.trancheFrais.findMany({
    where: { frais: { etablissementId: user.etablissementId } },
    distinct: ["periode"],
    select: { periode: true },
    orderBy: { periode: "desc" },
  });

  const periodesDispo = toutesPeriodes
    .filter((p) => estPeriodeEcoulee(p.periode))
    .map((p) => ({ periode: p.periode, libelle: fmtPeriode(p.periode) }));

  const totalReste = impayes.reduce((s, x) => s + x.reste, 0);
  const totalInscriptions = impayes.filter((x) => x.estInscription).reduce((s, x) => s + x.reste, 0);
  const totalMensuel = impayes.filter((x) => !x.estInscription).reduce((s, x) => s + x.reste, 0);
  const nbInscriptions = impayes.filter((x) => x.estInscription).length;
  const nbMensuel = impayes.filter((x) => !x.estInscription).length;

  function libClasse(c: any) {
    if (!c) return "-";
    return c.nom || (c.niveau + (c.section ? " " + c.section : ""));
  }

  return (
    <div className="space-y-5 max-w-6xl">
      <Link href="/frais" className="text-xs text-[var(--color-ink-muted)] hover:underline">
        ← Retour aux frais
      </Link>

      <div>
        <h1 className="text-2xl font-semibold mt-1">Impayés</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">
          {impayes.length} échéance(s) non payée(s) · Uniquement les mois écoulés
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Stat label="Total impayé" value={totalReste.toLocaleString("fr-FR") + " F"} accent="danger" />
        <Stat label="Inscriptions" value={totalInscriptions.toLocaleString("fr-FR") + " F"} accent="gold" sub={nbInscriptions + " éléve(s)"} />
        <Stat label="Mensualités" value={totalMensuel.toLocaleString("fr-FR") + " F"} accent="brand" sub={nbMensuel + " échéance(s)"} />
        <Stat label="échéances" value={String(impayes.length)} accent="brand" />
      </div>

      <form className="bg-white rounded-xl border border-[var(--color-border)] p-3 grid grid-cols-2 md:grid-cols-3 gap-2">
        <select name="periode" defaultValue={periode ?? ""} className="h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm">
          <option value="">Tous les mois écoulés</option>
          {periodesDispo.map((p) => <option key={p.periode} value={p.periode}>{p.libelle}</option>)}
        </select>
        <select name="type" defaultValue={type ?? ""} className="h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm">
          <option value="">Tous les types</option>
          <option value="inscription">Inscriptions uniquement</option>
          <option value="mensuel">Mensualités uniquement</option>
        </select>
        <button type="submit" className="h-10 px-4 rounded-lg bg-[var(--color-brand)] text-white text-sm hover:bg-[var(--color-brand-dark)]">
          Filtrer
        </button>
      </form>

      {impayes.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-[var(--color-border-strong)] py-16 text-center">
          <p className="text-sm text-[var(--color-ink-muted)]">Aucun impayé. 🎉</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Type</th>
                  <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Période</th>
                  <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Matricule</th>
                  <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">éléve</th>
                  <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Classe</th>
                  <th className="text-right p-3 font-medium text-[var(--color-ink-muted)]">Montant</th>
                  <th className="text-right p-3 font-medium text-[var(--color-ink-muted)]">Payé</th>
                  <th className="text-right p-3 font-medium text-[var(--color-ink-muted)]">Reste</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {impayes.map(({ t, reste, paye, enRetard, estInscription }) => (
                  <tr key={t.id} className={"border-t border-[var(--color-border)] " + (enRetard ? "bg-red-50/40" : estInscription ? "bg-amber-50/40" : "")}>
                    <td className="p-3">
                      {estInscription ? (
                        <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-amber-100 text-amber-900 font-medium">Inscription</span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-neutral-100 text-neutral-700">Mensuel</span>
                      )}
                    </td>
                    <td className="p-3 text-xs">{t.libelle}</td>
                    <td className="p-3 font-mono text-xs text-[var(--color-ink-muted)]">{t.frais.eleve.matricule}</td>
                    <td className="p-3 font-medium">{t.frais.eleve.nom} {t.frais.eleve.prenom}</td>
                    <td className="p-3 text-[var(--color-ink-muted)] text-xs">{libClasse(t.frais.eleve.classe)}</td>
                    <td className="p-3 text-right tnum">{t.montant.toLocaleString("fr-FR")}</td>
                    <td className="p-3 text-right tnum text-[var(--color-accent)]">{paye.toLocaleString("fr-FR")}</td>
                    <td className="p-3 text-right tnum font-medium text-red-700">{reste.toLocaleString("fr-FR")}</td>
                    <td className="p-3 text-right">
                      <Link href={"/frais/eleve/" + t.frais.eleveId} className="text-[var(--color-brand)] text-sm hover:underline">
                        Encaisser
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-[var(--color-border)]">
            {impayes.map(({ t, reste, paye, enRetard, estInscription }) => (
              <Link
                key={t.id}
                href={"/frais/eleve/" + t.frais.eleveId}
                className={"block p-4 hover:bg-neutral-50 " + (enRetard ? "bg-red-50/30" : estInscription ? "bg-amber-50/30" : "")}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{t.frais.eleve.nom} {t.frais.eleve.prenom}</p>
                    <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{t.libelle} · {libClasse(t.frais.eleve.classe)}</p>
                  </div>
                  {estInscription ? (
                    <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-amber-100 text-amber-900 whitespace-nowrap">Inscription</span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-neutral-100 text-neutral-700 whitespace-nowrap">Mensuel</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-ink-muted)]">{paye.toLocaleString("fr-FR")} / {t.montant.toLocaleString("fr-FR")} F</span>
                  <span className="font-medium text-red-700 tnum">Reste {reste.toLocaleString("fr-FR")} F</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent, sub }: { label: string; value: string; accent?: "brand" | "accent" | "gold" | "danger"; sub?: string }) {
  const bg =
    accent === "accent" ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
    : accent === "gold" ? "bg-[var(--color-gold-soft)] text-[var(--color-gold)]"
    : accent === "danger" ? "bg-red-50 text-red-700"
    : "bg-[var(--color-brand-soft)] text-[var(--color-brand)]";
  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
      <span className={"inline-block px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wide " + bg}>
        {label}
      </span>
      <p className="text-lg md:text-xl font-semibold mt-2 tnum">{value}</p>
      {sub && <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{sub}</p>}
    </div>
  );
}