import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { Prevision } from "@/lib/tresorerie/tresorerie";

const f = (n: number) => n.toLocaleString("fr-FR") + " F";

// Le solde couvre-t-il les sorties prevues du mois ? (page Tresorerie et tableau de bord)
export function AlertePrevision({
  prevision: p,
  peutCapital,
  compacte = false,
}: {
  prevision: Prevision;
  peutCapital: boolean;
  compacte?: boolean;
}) {
  if (p.niveau === "ok" && compacte) return null;
  const styles = {
    ok: { boite: "border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)]", texte: "text-[var(--color-accent)]", Icone: CheckCircle2 },
    juste: { boite: "border-amber-200 bg-amber-50", texte: "text-amber-900", Icone: Info },
    insuffisant: { boite: "border-red-200 bg-red-50", texte: "text-red-900", Icone: AlertTriangle },
  }[p.niveau];
  const titre =
    p.niveau === "insuffisant"
      ? "Il manque " + f(p.manque) + " pour couvrir les sorties prévues du mois"
      : p.niveau === "juste"
        ? "Trésorerie juste ce mois-ci"
        : "Le solde couvre les sorties prévues du mois";
  return (
    <div role={p.niveau === "insuffisant" ? "alert" : "status"} className={"flex flex-wrap items-start gap-3 rounded-xl border p-4 " + styles.boite}>
      <styles.Icone aria-hidden className={"mt-0.5 h-5 w-5 shrink-0 " + styles.texte} />
      <div className="min-w-0 flex-1">
        <p className={"font-medium " + styles.texte}>{titre}</p>
        <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
          Solde {f(p.soldeTotal)} · salaires restants {f(p.salairesRestants)} · dépenses récurrentes {f(p.depensesRestantes)}
          {p.pretsRestants > 0 && " · prêts à rembourser " + f(p.pretsRestants)}
          {p.fraisAttendus > 0 && " · " + f(p.fraisAttendus) + " de frais encore attendus ce mois"}
          {p.employesHoraires > 0 && " · " + p.employesHoraires + " employé(s) payé(s) à l'heure non compté(s)"}
        </p>
      </div>
      {compacte ? (
        <Link href="/tresorerie" className={"whitespace-nowrap text-xs font-medium hover:underline " + styles.texte}>Voir la trésorerie</Link>
      ) : (
        p.niveau === "insuffisant" && peutCapital && <span className="text-xs text-red-900">Utilisez « Apport de capital » pour renflouer.</span>
      )}
    </div>
  );
}
