import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { ActionsPaiement } from "./ActionsPaiement";

export default async function PaiementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("paiement.read");

  const p = await prisma.paiement.findUnique({
    where: { id },
    include: {
      employe: true,
      saisiePar: { select: { email: true } },
      annulePar: { select: { email: true } },
      etablissement: true,
    },
  });

  if (!p || p.etablissementId !== user.etablissementId) notFound();

  const peutAnnuler = user.roles.includes("DIRECTEUR") && p.statut !== "ANNULE";

  function fmtPeriode(periode: string) {
    const [an, mois] = periode.split("-");
    const noms = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
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
    <div className="space-y-5 max-w-3xl">
      <Link href="/paiements" className="text-xs text-[var(--color-ink-muted)] hover:underline">
        ← Retour aux paiements
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold mt-1">Paiement {fmtPeriode(p.periode)}</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">
            {p.employe.nom} {p.employe.prenom} · {p.employe.poste}
          </p>
        </div>
        {p.statut === "PAYE" && <span className="inline-flex px-3 py-1 rounded-md text-xs bg-[var(--color-accent-soft)] text-[var(--color-accent)]">Payé</span>}
        {p.statut === "ANNULE" && <span className="inline-flex px-3 py-1 rounded-md text-xs bg-red-50 text-red-700">Annulé</span>}
        {p.statut === "EN_ATTENTE" && <span className="inline-flex px-3 py-1 rounded-md text-xs bg-amber-50 text-amber-800">En attente</span>}
      </div>

      <div className="bg-white rounded-xl border border-[var(--color-border)] p-6 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
          Montant
        </p>
        <p className={"text-4xl font-semibold mt-2 tnum " + (p.statut === "ANNULE" ? "line-through text-neutral-400" : "text-[var(--color-brand)]")}>
          {p.montant.toLocaleString("fr-FR")} F
        </p>
        <p className="text-xs text-[var(--color-ink-muted)] mt-2">
          CFA · {labelType(p.type)}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 space-y-4">
        <h2 className="font-semibold">Détails</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Info label="Bénéficiaire" value={p.employe.nom + " " + p.employe.prenom} />
          <Info label="Poste" value={p.employe.poste} />
          <Info label="Période" value={fmtPeriode(p.periode)} />
          <Info label="Type" value={labelType(p.type)} />
          <Info label="Date de paiement" value={new Date(p.datePaiement).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })} />
          <Info label="Mode" value={p.modePaiement} />
          {p.nombreHeures != null && <Info label="Nombre d'heures" value={String(p.nombreHeures)} />}
          {p.tauxHoraire != null && <Info label="Taux horaire" value={p.tauxHoraire.toLocaleString("fr-FR") + " F"} />}
          {p.reference && <Info label="Référence" value={p.reference} />}
        </div>
        {p.note && (
          <div className="pt-3 border-t border-[var(--color-border)]">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)] mb-2">Note</p>
            <p className="text-sm">{p.note}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <h2 className="font-semibold mb-3">Traçabilité</h2>
        <div className="space-y-2 text-xs text-[var(--color-ink-muted)]">
          <p>
            Enregistré par <strong className="text-[var(--color-ink)]">{p.saisiePar.email}</strong>
            {" "}le {new Date(p.createdAt).toLocaleString("fr-FR")}
          </p>
          {p.statut === "ANNULE" && p.annulePar && (
            <p className="text-red-700">
              Annulé par {p.annulePar.email}
              {" "}· Motif : {p.motifAnnulation}
            </p>
          )}
        </div>
      </div>

      {peutAnnuler && <ActionsPaiement paiementId={p.id} />}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">{label}</p>
      <p className="font-medium mt-1">{value}</p>
    </div>
  );
}