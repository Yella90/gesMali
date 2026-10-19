import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { libelleClasse, ORDRE_CLASSES } from "@/lib/classes/annees";
import { calculerSituationDepuisTotaux } from "@/lib/frais/calculs";
import { elevesAvecFrais } from "@/lib/frais/requetes";
import { ListeFrais } from "./ListeFrais";

export default async function FraisPage() {
  const user = await requirePermission("frais.read");

  const [anneeActive, eleves, classes] = await Promise.all([
    prisma.anneeScolaire.findFirst({
      where: { etablissementId: user.etablissementId, active: true },
      select: { libelle: true },
    }),
    elevesAvecFrais(user.etablissementId),
    prisma.classe.findMany({
      where: { etablissementId: user.etablissementId },
      select: { id: true, nom: true, niveau: true, section: true, anneeScolaire: { select: { libelle: true, active: true } } },
      orderBy: ORDRE_CLASSES,
    }),
  ]);

  const stats = {
    attenduMaintenant: 0,
    encaisse: 0,
    enRetard: 0,
    nonConfigure: 0,
    enRetardCount: 0,
    inscriptionImpayee: 0,
    inscriptionImpayeeCount: 0,
  };

  const enrichis = eleves.map((e) => {
    const f = e.frais;
    if (!f) {
      stats.nonConfigure++;
      return {
        id: e.id,
        matricule: e.matricule,
        nom: e.nom,
        prenom: e.prenom,
        classe: e.classe,
        situation: null,
      };
    }
    const situation = calculerSituationDepuisTotaux(
      f.fraisInscription,
      f.fraisScolariteMensuel,
      f.dateDebut,
      f.totaux
    );

    stats.attenduMaintenant += situation.attenduJusquMaintenant;
    stats.encaisse += situation.totalPaye;
    stats.enRetard += situation.retard;
    if (situation.statut === "EN_RETARD") stats.enRetardCount++;
    if (situation.inscriptionStatut === "IMPAYEE" || situation.inscriptionStatut === "PARTIELLE") {
      stats.inscriptionImpayee += situation.inscriptionReste;
      stats.inscriptionImpayeeCount++;
    }

    return {
      id: e.id,
      matricule: e.matricule,
      nom: e.nom,
      prenom: e.prenom,
      classe: e.classe,
      situation: {
        totalPaye: situation.totalPaye,
        attenduJusquMaintenant: situation.attenduJusquMaintenant,
        retard: situation.retard,
        moisPayes: situation.moisPayes,
        moisEcoules: situation.moisEcoules,
        statut: situation.statut,
        inscriptionStatut: situation.inscriptionStatut,
        inscriptionReste: situation.inscriptionReste,
      },
    };
  });

  const taux = stats.attenduMaintenant > 0 ? (stats.encaisse / stats.attenduMaintenant) * 100 : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Frais de scolarité</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-1">
            {anneeActive ? "Année active : " + anneeActive.libelle : "Aucune année active"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/frais/impaies" className="inline-flex items-center h-10 px-4 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm hover:bg-neutral-50">
            Impayés
          </Link>
          <Link href="/frais/rappels" className="inline-flex items-center h-10 px-4 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm hover:bg-neutral-50">
            Rappels
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Stat label="Attendu (mois écoulés)" value={stats.attenduMaintenant.toLocaleString("fr-FR") + " F"} accent="brand" />
        <Stat label="Encaissé" value={stats.encaisse.toLocaleString("fr-FR") + " F"} accent="accent" />
        <Stat label="Retard réel" value={stats.enRetard.toLocaleString("fr-FR") + " F"} accent={stats.enRetard > 0 ? "danger" : undefined} />
        <Stat
          label="Taux (sur mois écoulés)"
          value={taux.toFixed(1) + " %"}
          accent={taux >= 80 ? "accent" : taux >= 50 ? "gold" : "danger"}
        />
      </div>

      {stats.inscriptionImpayeeCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-amber-900">
              {stats.inscriptionImpayeeCount} inscription(s) non payée(s) · {stats.inscriptionImpayee.toLocaleString("fr-FR")} F CFA
            </p>
            <p className="text-xs text-amber-800 mt-0.5">
              Utilisez le filtre "Inscription non payée" ci-dessous pour les voir.
            </p>
          </div>
        </div>
      )}

      {stats.enRetardCount > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0">!</div>
          <div className="min-w-0">
            <p className="font-medium text-red-900">
              {stats.enRetardCount} élève(s) en retard · {stats.enRetard.toLocaleString("fr-FR")} F CFA
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
        <h2 className="font-semibold mb-3">Élèves ({eleves.length})</h2>
        <p className="text-xs text-[var(--color-ink-muted)] mb-3">
          {stats.nonConfigure} sans frais configurés
        </p>
      </div>

      <ListeFrais
        eleves={enrichis}
        classes={classes.map((c) => ({
          id: c.id,
          label: libelleClasse(c),
        }))}
      />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "brand" | "accent" | "gold" | "danger" }) {
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
    </div>
  );
}