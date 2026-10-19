import Link from "next/link";
import { ecole } from "@/lib/data/ecole";
import { requirePermission } from "@/lib/auth/session";
import { TransitionWizard } from "./TransitionWizard";

export default async function NouvelleTransitionPage() {
  const user = await requirePermission("parametres.manage");
  const db = ecole(user);

  const annees = await db.anneeScolaire.findMany({
    where: {
      etablissementId: user.etablissementId,
      archivee: false,
    },
    include: {
      trimestres: { orderBy: { ordre: "asc" } },
    },
    orderBy: { libelle: "desc" },
  });

  const paramsEtab = await db.parametresEtablissement.findUnique({
    where: { etablissementId: user.etablissementId },
  });

  // Suggestion de libelle pour la nouvelle annee
  const anneeActive = annees.find((a) => a.active);
  let suggestionLibelle = "";
  if (anneeActive) {
    const [debut, fin] = anneeActive.libelle.split("-");
    suggestionLibelle = (parseInt(debut) + 1) + "-" + (parseInt(fin) + 1);
  } else {
    const y = new Date().getFullYear();
    suggestionLibelle = y + "-" + (y + 1);
  }

  // Suggestion des dates
  const suggestionDateDebut = anneeActive
    ? new Date(anneeActive.dateFin.getTime() + 86400000)
    : new Date();
  const suggestionDateFin = new Date(suggestionDateDebut);
  suggestionDateFin.setMonth(suggestionDateFin.getMonth() + 9);
  suggestionDateFin.setDate(suggestionDateFin.getDate() - 1);

  return (
    <div className="space-y-5 max-w-5xl">
      <Link href="/transition" className="text-xs text-[var(--color-ink-muted)] hover:underline">
        ← Retour
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">Nouvelle transition</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-1">
          Passage des élèves vers la nouvelle année scolaire
        </p>
      </div>

      <TransitionWizard
        annees={annees.map((a) => ({
          id: a.id,
          libelle: a.libelle,
          active: a.active,
          trimestresClotures: a.trimestres.filter((t) => t.cloture).length,
          trimestresTotal: a.trimestres.length,
        }))}
        suggestion={{
          libelle: suggestionLibelle,
          dateDebut: suggestionDateDebut.toISOString().slice(0, 10),
          dateFin: suggestionDateFin.toISOString().slice(0, 10),
        }}
        parametres={{
          reinscriptionRequise: paramsEtab?.reinscriptionRequise ?? false,
          fraisReinscription: paramsEtab?.fraisReinscription ?? 0,
          copierAffectations: paramsEtab?.copierAffectations ?? true,
        }}
      />
    </div>
  );
}