import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { estPeriodeEcoulee, fmtPeriode } from "@/lib/frais/periode";

export default async function PaiementsPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; type?: string; employeId?: string; statut?: string }>;
}) {
  const { periode, type, employeId, statut } = await searchParams;
  const user = await requirePermission("paiement.read");

  const where: any = { etablissementId: user.etablissementId };
  if (periode) where.periode = periode;
  if (type) where.type = type;
  if (employeId) where.employeId = employeId;
  if (statut) where.statut = statut;

  const [paiements, toutesPeriodes, employes] = await Promise.all([
    prisma.paiement.findMany({
      where,
      include: {
        employe: { select: { nom: true, prenom: true, poste: true } },
        saisiePar: { select: { email: true } },
      },
      orderBy: [{ datePaiement: "desc" }, { createdAt: "desc" }],
      take: 300,
    }),
    prisma.paiement.findMany({
      where: { etablissementId: user.etablissementId },
      distinct: ["periode"],
      select: { periode: true },
      orderBy: { periode: "desc" },
      take: 24,
    }),
    // Tous les employes actifs (enseignants, secretaires, comptables, gardiens...)
    prisma.employe.findMany({
      where: {
        etablissementId: user.etablissementId,
        actif: true,
      },
      select: { id: true, nom: true, prenom: true, poste: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    }),
  ]);

  const periodesDispo = toutesPeriodes
    .filter((p) => estPeriodeEcoulee(p.periode))
    .map((p) => ({ periode: p.periode, libelle: fmtPeriode(p.periode) }));

  const totalPaye = paiements.filter((p) => p.statut === "PAYE").reduce((s, p) => s + p.montant, 0);
  const totalAnnule = paiements.filter((p) => p.statut === "ANNULE").reduce((s, p) => s + p.montant, 0);
  const nbEmployesPayes = new Set(paiements.filter((p) => p.statut === "PAYE").map((p) => p.employeId)).size;

  function labelType(t: string) {
    if (t === "MENSUEL") return "Mensuel";
    if (t === "HORAIRE") return "Horaire";
    if (t === "PRIME") return "Prime";
    if (t === "AVANCE") return "Avance";
    if (t === "REMBOURSEMENT") return "Remboursement";
    return t;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Registre des paiements</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-1">
            Suivi des salaires et primes versés au personnel
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/paiements/tableau-de-bord" className="inline-flex items-center h-10 px-4 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm hover:bg-neutral-50">
            Tableau de bord
          </Link>
          <Link href="/paiements/nouveau" className="inline-flex items-center h-10 px-4 rounded-lg bg-[var(--color-brand)] text-white text-sm font-medium hover:bg-[var(--color-brand-dark)]">
            + Nouveau paiement
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Stat label="Total payé" value={totalPaye.toLocaleString("fr-FR") + " F"} accent="accent" />
        <Stat label="Paiements" value={String(paiements.filter((p) => p.statut === "PAYE").length)} accent="brand" />
        <Stat label="Bénéficiaires" value={String(nbEmployesPayes)} />
        <Stat label="Annulés" value={totalAnnule.toLocaleString("fr-FR") + " F"} accent={totalAnnule > 0 ? "danger" : undefined} />
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <strong>Registre interne.</strong> Ce module enregistre les paiements effectués mais ne remplace pas un bulletin de paie légal. Il ne calcule ni ITS ni cotisations INPS/AMO.
      </div>

      <form className="bg-white rounded-xl border border-[var(--color-border)] p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
        <select name="periode" defaultValue={periode ?? ""} className="h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm">
          <option value="">Tous les mois écoulés</option>
          {periodesDispo.map((p) => <option key={p.periode} value={p.periode}>{p.libelle}</option>)}
        </select>
        <select name="type" defaultValue={type ?? ""} className="h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm">
          <option value="">Tous les types</option>
          <option value="MENSUEL">Mensuel</option>
          <option value="HORAIRE">Horaire</option>
          <option value="PRIME">Prime</option>
          <option value="AVANCE">Avance</option>
          <option value="REMBOURSEMENT">Remboursement</option>
        </select>
        <select name="employeId" defaultValue={employeId ?? ""} className="h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm">
          <option value="">Tous les employés</option>
          {employes.map((e) => <option key={e.id} value={e.id}>{e.nom} {e.prenom} ({e.poste})</option>)}
        </select>
        <button type="submit" className="h-10 px-4 rounded-lg bg-[var(--color-brand)] text-white text-sm hover:bg-[var(--color-brand-dark)]">
          Filtrer
        </button>
      </form>

      {paiements.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-[var(--color-border-strong)] py-16 text-center">
          <p className="text-sm text-[var(--color-ink-muted)]">Aucun paiement trouvé.</p>
          <Link href="/paiements/nouveau" className="inline-flex items-center h-10 px-4 rounded-lg bg-[var(--color-brand)] text-white text-sm font-medium mt-4">
            + Enregistrer le premier
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Date</th>
                  <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Bénéficiaire</th>
                  <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Période</th>
                  <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Type</th>
                  <th className="text-right p-3 font-medium text-[var(--color-ink-muted)]">Montant</th>
                  <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Mode</th>
                  <th className="text-center p-3 font-medium text-[var(--color-ink-muted)]">Statut</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {paiements.map((p) => (
                  <tr key={p.id} className={"border-t border-[var(--color-border)] hover:bg-neutral-50/60 " + (p.statut === "ANNULE" ? "opacity-60" : "")}>
                    <td className="p-3 text-xs text-[var(--color-ink-muted)] tnum">
                      {new Date(p.datePaiement).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{p.employe.nom} {p.employe.prenom}</p>
                      <p className="text-[10px] text-[var(--color-ink-muted)] mt-0.5">{p.employe.poste}</p>
                    </td>
                    <td className="p-3 text-xs">{fmtPeriode(p.periode)}</td>
                    <td className="p-3">
                      <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-[var(--color-surface)]">
                        {labelType(p.type)}
                      </span>
                    </td>
                    <td className={"p-3 text-right tnum font-semibold " + (p.statut === "ANNULE" ? "line-through text-neutral-400" : "")}>
                      {p.montant.toLocaleString("fr-FR")}
                    </td>
                    <td className="p-3 text-xs text-[var(--color-ink-muted)]">{p.modePaiement}</td>
                    <td className="p-3 text-center">
                      {p.statut === "PAYE" && <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-[var(--color-accent-soft)] text-[var(--color-accent)]">Payé</span>}
                      {p.statut === "ANNULE" && <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-red-50 text-red-700">Annulé</span>}
                      {p.statut === "EN_ATTENTE" && <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-amber-50 text-amber-800">En attente</span>}
                    </td>
                    <td className="p-3 text-right">
                      <Link href={"/paiements/" + p.id} className="text-[var(--color-brand)] text-sm hover:underline">
                        Détail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2">
            {paiements.map((p) => (
              <Link
                key={p.id}
                href={"/paiements/" + p.id}
                className={"block bg-white rounded-xl border border-[var(--color-border)] p-4 " + (p.statut === "ANNULE" ? "opacity-60" : "")}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.employe.nom} {p.employe.prenom}</p>
                    <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                      {fmtPeriode(p.periode)} · {labelType(p.type)}
                    </p>
                  </div>
                  {p.statut === "PAYE" && <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-[var(--color-accent-soft)] text-[var(--color-accent)] whitespace-nowrap">Payé</span>}
                  {p.statut === "ANNULE" && <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-red-50 text-red-700 whitespace-nowrap">Annulé</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-ink-muted)]">
                    {new Date(p.datePaiement).toLocaleDateString("fr-FR")} · {p.modePaiement}
                  </span>
                  <span className={"text-lg font-semibold tnum " + (p.statut === "ANNULE" ? "line-through text-neutral-400" : "")}>
                    {p.montant.toLocaleString("fr-FR")} F
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "brand" | "accent" | "danger" }) {
  const bg =
    accent === "accent" ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
    : accent === "danger" ? "bg-red-50 text-red-700"
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