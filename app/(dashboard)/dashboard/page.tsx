import Link from "next/link";
import { peut } from "@/lib/auth/permissions";
import { CalendarClock, CalendarDays, PencilLine, Receipt, School, Users, Wallet, type LucideIcon } from "lucide-react";
import { ecole } from "@/lib/data/ecole";
import { getUtilisateurCourant } from "@/lib/auth/session";
import { calculerSituationDepuisTotaux } from "@/lib/frais/calculs";
import { elevesAvecFrais } from "@/lib/frais/requetes";
import { financesMensuelles, moisValide, optionsMois, salairesPrevus } from "@/lib/tableau-de-bord/finances";
import { Finances, type SituationEleves } from "./Finances";
import { previsionMois } from "@/lib/tresorerie/tresorerie";
import { AlertePrevision } from "@/components/tresorerie/AlertePrevision";

const JOURS = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"];

function libJour(j: string): string {
  const map: Record<string, string> = {
    LUNDI: "Lundi", MARDI: "Mardi", MERCREDI: "Mercredi",
    JEUDI: "Jeudi", VENDREDI: "Vendredi", SAMEDI: "Samedi",
  };
  return map[j] || j;
}

function jourActuel(): string {
  const d = new Date().getDay();
  if (d === 0) return "DIMANCHE";
  return JOURS[d - 1];
}

function ilYA(date: Date): string {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return "il y a " + sec + "s";
  if (sec < 3600) return "il y a " + Math.floor(sec / 60) + " min";
  if (sec < 86400) return "il y a " + Math.floor(sec / 3600) + " h";
  if (sec < 604800) return "il y a " + Math.floor(sec / 86400) + " j";
  return date.toLocaleDateString("fr-FR");
}

function labelAction(action: string): string {
  const labels: Record<string, string> = {
    CREATE_ELEVE: "Création élève",
    UPDATE_ELEVE: "Modification élève",
    CREATE_CLASSE: "Création classe",
    UPDATE_CLASSE: "Modification classe",
    CREATE_NOTE: "Saisie note",
    UPDATE_NOTE: "Modification note",
    SOUMETTRE_NOTES: "Soumission notes",
    VALIDER_NOTES: "Validation notes",
    GENERER_BULLETINS: "Génération bulletins",
    ENCAISSER_PAIEMENT: "Encaissement",
    ANNULER_PAIEMENT: "Annulation paiement",
    CONFIGURER_FRAIS: "Configuration frais",
    GENERER_FRAIS_ELEVE: "Génération frais",
    CREATE_PAIEMENT: "Paiement créé",
    CREATE_EMPLOYE: "Création employé",
    UPDATE_EMPLOYE: "Modification employé",
    CREATE_COMPTE: "Création compte",
    CREATE_AFFECTATION: "Affectation",
    UPDATE_AFFECTATION: "Modification affectation",
    DELETE_AFFECTATION: "Suppression affectation",
    GENERER_RAPPELS: "Génération rappels",
    CLOTURER_TRIMESTRE: "Clôture trimestre",
    UPDATE_ETABLISSEMENT: "Modification établissement",
    UPDATE_PARAMETRES_NOTES: "Modification paramètres",
  };
  return labels[action] || action.replace(/_/g, " ");
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  const user = await getUtilisateurCourant();
  if (!user) return null;
  const db = ecole(user);

  const isDirecteur = user.roles.includes("DIRECTEUR");
  const isSecretaire = user.roles.includes("SECRETAIRE");
  const isComptable = user.roles.includes("COMPTABLE");
  const isEnseignant = user.roles.includes("ENSEIGNANT");
  const estAdmin = isDirecteur || isSecretaire;

  const anneeActive = await db.anneeScolaire.findFirst({
    where: { etablissementId: user.etablissementId, active: true },
  });

  const debutMois = new Date();
  debutMois.setDate(1);
  debutMois.setHours(0, 0, 0, 0);
  const debutMoisPrec = new Date(debutMois);
  debutMoisPrec.setMonth(debutMoisPrec.getMonth() - 1);

  // ─────────────────────────────────────────────
  // STATS ELEVES (total + F/G)
  // ─────────────────────────────────────────────
  const [nbElevesTotal, nbFilles, nbGarcons, nbClasses, nbEmployes] = await Promise.all([
    db.eleve.count({
      where: { etablissementId: user.etablissementId, statut: "INSCRIT" },
    }),
    db.eleve.count({
      where: { etablissementId: user.etablissementId, statut: "INSCRIT", sexe: "F" },
    }),
    db.eleve.count({
      where: { etablissementId: user.etablissementId, statut: "INSCRIT", sexe: "M" },
    }),
    db.classe.count({ where: { etablissementId: user.etablissementId, anneeScolaire: { active: true } } }),
    db.employe.count({
      where: { etablissementId: user.etablissementId, actif: true },
    }),
  ]);

  // Situation des eleves (alertes + graphique), une seule requete
  // Promesse memorisee : la requete n'est lancee qu'une fois, a la premiere demande
  const memo: { situations?: Promise<(ReturnType<typeof calculerSituationDepuisTotaux> | null)[]> } = {};
  const chargerSituations = () =>
    (memo.situations ??= elevesAvecFrais(user.etablissementId).then((eleves) =>
      eleves.map((e) =>
        e.frais
          ? calculerSituationDepuisTotaux(e.frais.fraisInscription, e.frais.fraisScolariteMensuel, e.frais.dateDebut, e.frais.totaux)
          : null
      )
    ));

  // Graphiques financiers (direction, secretariat, comptabilite)
  const { mois: moisParam } = await searchParams;
  const mois = moisValide(moisParam);
  let finances: { flux: Awaited<ReturnType<typeof financesMensuelles>>; prevus: number; situation: SituationEleves } | null = null;
  if (estAdmin || isComptable) {
    const [flux, prevus, sit] = await Promise.all([
      financesMensuelles(user.etablissementId, mois),
      salairesPrevus(user.etablissementId),
      chargerSituations(),
    ]);
    finances = {
      flux,
      prevus,
      situation: {
        aJour: sit.filter((x) => x && x.statut !== "EN_RETARD").length,
        enRetard: sit.filter((x) => x && x.statut === "EN_RETARD").length,
        sansFrais: sit.filter((x) => !x).length,
      },
    };
  }

  // Alerte de tresorerie (direction et comptabilite)
  const prevision = peut(user.roles, "tresorerie.read") ? await previsionMois(user.etablissementId) : null;

  const pourcentFilles = nbElevesTotal > 0 ? Math.round((nbFilles / nbElevesTotal) * 100) : 0;
  const pourcentGarcons = nbElevesTotal > 0 ? Math.round((nbGarcons / nbElevesTotal) * 100) : 0;

  // ─────────────────────────────────────────────
  // STATS ADMIN
  // ─────────────────────────────────────────────
  let statsAdmin: any = null;
  const alertes: any[] = [];
  let dernieresActions: any[] = [];

  if (estAdmin) {
    const paiementsMois = await db.paiementFrais.findMany({
      where: {
        annule: false,
        datePaiement: { gte: debutMois },
        tranche: { frais: { etablissementId: user.etablissementId } },
      },
      select: { montant: true },
    });
    const recettesMois = paiementsMois.reduce((s, p) => s + p.montant, 0);

    const paiementsMoisPrec = await db.paiementFrais.findMany({
      where: {
        annule: false,
        datePaiement: { gte: debutMoisPrec, lt: debutMois },
        tranche: { frais: { etablissementId: user.etablissementId } },
      },
      select: { montant: true },
    });
    const recettesMoisPrec = paiementsMoisPrec.reduce((s, p) => s + p.montant, 0);

    const trimestreActif = anneeActive
      ? await db.trimestre.findFirst({
          where: {
            anneeScolaireId: anneeActive.id,
            dateDebut: { lte: new Date() },
            cloture: false,
          },
          orderBy: { ordre: "asc" },
        })
      : null;

    const nbNotes = trimestreActif
      ? await db.note.count({ where: { trimestreId: trimestreActif.id } })
      : 0;

    const nbNotesValidees = trimestreActif
      ? await db.note.count({
          where: { trimestreId: trimestreActif.id, statut: { in: ["VALIDEE", "VERROUILLEE"] } },
        })
      : 0;

    statsAdmin = { recettesMois, recettesMoisPrec, nbNotes, nbNotesValidees, trimestreActif };

    // Alertes (totaux agreges en base, cf. lib/frais/requetes.ts)
    let nbInscriptionsImpayees = 0;
    let nbEnRetard = 0;
    let totalImpaye = 0;

    for (const e of await chargerSituations()) {
      if (!e) continue;
      if (e.inscriptionStatut === "IMPAYEE") nbInscriptionsImpayees++;
      if (e.statut === "EN_RETARD") nbEnRetard++;
      totalImpaye += e.retard;
    }

    if (nbInscriptionsImpayees > 0) {
      alertes.push({
        type: "warning",
        titre: nbInscriptionsImpayees + " inscription(s) non payée(s)",
        description: "Voir la liste dans Frais → Impayés",
        href: "/frais/impaies",
      });
    }

    if (nbEnRetard > 0) {
      alertes.push({
        type: "danger",
        titre: nbEnRetard + " élève(s) en retard",
        description: totalImpaye.toLocaleString("fr-FR") + " F CFA à recouvrer",
        href: "/frais/impaies",
      });
    }

    if (anneeActive) {
      const classes = await db.classe.findMany({
        where: { etablissementId: user.etablissementId, anneeScolaireId: anneeActive.id },
        include: { affectations: { where: { type: "PROFESSEUR_MATIERE" } } },
      });

      const matieresParCycle = await db.matiere.findMany({
        where: { etablissementId: user.etablissementId },
      });

      let classesIncompletes = 0;
      for (const c of classes) {
        const aTitulaire = c.titulaireId !== null;
        if (aTitulaire) continue;
        const matieresCycle = matieresParCycle.filter((m) => m.cycle === c.cycle);
        const couvertes = new Set(c.affectations.map((a) => a.matiereId).filter(Boolean));
        const nonCouvertes = matieresCycle.filter((m) => !couvertes.has(m.id));
        if (nonCouvertes.length > 0) classesIncompletes++;
      }

      if (classesIncompletes > 0) {
        alertes.push({
          type: "warning",
          titre: classesIncompletes + " classe(s) avec matières non couvertes",
          description: "Vérifiez les affectations des enseignants",
          href: "/emploi-du-temps",
        });
      }
    }

    dernieresActions = await db.auditLog.findMany({
      where: { user: { etablissementId: user.etablissementId } },
      include: { user: { include: { employe: { select: { nom: true, prenom: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
  }

  // ─────────────────────────────────────────────
  // STATS COMPTABLE
  // ─────────────────────────────────────────────
  let statsComptable: any = null;
  if (isComptable && !estAdmin) {
    const paiementsMois = await db.paiementFrais.findMany({
      where: {
        annule: false,
        datePaiement: { gte: debutMois },
        tranche: { frais: { etablissementId: user.etablissementId } },
      },
      select: { montant: true },
    });
    statsComptable = {
      recettesMois: paiementsMois.reduce((s, p) => s + p.montant, 0),
      nbPaiements: paiementsMois.length,
    };
  }

  // ─────────────────────────────────────────────
  // STATS ENSEIGNANT
  // ─────────────────────────────────────────────
  let mesCreneauxAujourdHui: any[] = [];
  let mesCreneauxSemaine: any[] = [];
  let mesClasses: any[] = [];
  let mesStatsNotes: any = null;

  if (isEnseignant) {
    const jour = jourActuel();

    mesCreneauxSemaine = await db.affectation.findMany({
      where: { enseignantId: user.employeId, jour: { not: null } },
      include: {
        classe: { select: { id: true, nom: true, niveau: true, section: true } },
        matiere: { select: { nom: true } },
      },
      orderBy: [{ jour: "asc" }, { heureDebut: "asc" }],
    });

    mesCreneauxAujourdHui = mesCreneauxSemaine.filter((c) => c.jour === jour);

    const classesSet = new Map<string, any>();
    for (const c of mesCreneauxSemaine) {
      if (!classesSet.has(c.classeId)) classesSet.set(c.classeId, c.classe);
    }
    mesClasses = Array.from(classesSet.values());

    const trimestreActif = anneeActive
      ? await db.trimestre.findFirst({
          where: { anneeScolaireId: anneeActive.id, dateDebut: { lte: new Date() }, cloture: false },
        })
      : null;

    if (trimestreActif) {
      const nbNotesSaisies = await db.note.count({
        where: { saisieParId: user.id, trimestreId: trimestreActif.id },
      });
      mesStatsNotes = { nbNotesSaisies, trimestre: trimestreActif };
    }
  }

  const heure = new Date().getHours();
  const salutation = heure < 12 ? "Bonjour" : heure < 18 ? "Bon après-midi" : "Bonsoir";

  return (
    <div className="space-y-5 max-w-7xl">
      {/* En-tete */}
      <div>
        <p className="text-sm text-[var(--color-ink-muted)]">{salutation},</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-[var(--color-ink)] mt-0.5">
          {user.prenom} {user.nom}
        </h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-1">
          {user.poste}
          {anneeActive && " · Année scolaire " + anneeActive.libelle}
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* VUE ADMIN                                              */}
      {/* ══════════════════════════════════════════════════════ */}
      {estAdmin && statsAdmin && (
        <>
          {/* Eleves + repartition F/G */}
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="font-semibold">Effectif des élèves</h2>
                <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                  Répartition actuelle de l'établissement
                </p>
              </div>
              <Link
                href="/eleves"
                className="text-xs text-[var(--color-brand)] hover:underline whitespace-nowrap"
              >
                Voir tous les élèves →
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-3 md:gap-4">
              <div className="rounded-lg border border-[var(--color-border)] p-3 md:p-4">
                <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
                  Total
                </p>
                <p className="text-2xl md:text-3xl font-semibold tnum mt-1">
                  {nbElevesTotal}
                </p>
                <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                  {nbClasses} classe{nbClasses > 1 ? "s" : ""}
                </p>
              </div>

              <div className="rounded-lg border border-pink-200 bg-pink-50/40 p-3 md:p-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-pink-100 text-pink-700 flex items-center justify-center text-[10px] font-bold">
                    F
                  </span>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-pink-700">
                    Filles
                  </p>
                </div>
                <p className="text-2xl md:text-3xl font-semibold tnum mt-1 text-pink-700">
                  {nbFilles}
                </p>
                <p className="text-xs text-pink-600 mt-0.5 tnum">
                  {pourcentFilles} % de l'effectif
                </p>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 md:p-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                    G
                  </span>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-blue-700">
                    Garçons
                  </p>
                </div>
                <p className="text-2xl md:text-3xl font-semibold tnum mt-1 text-blue-700">
                  {nbGarcons}
                </p>
                <p className="text-xs text-blue-600 mt-0.5 tnum">
                  {pourcentGarcons} % de l'effectif
                </p>
              </div>
            </div>

            {/* Barre de progression F/G */}
            {nbElevesTotal > 0 && (
              <div className="mt-4">
                <div className="h-3 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-pink-400"
                    style={{ width: pourcentFilles + "%" }}
                    title={"Filles : " + pourcentFilles + "%"}
                  />
                  <div
                    className="h-full bg-blue-400"
                    style={{ width: pourcentGarcons + "%" }}
                    title={"Garçons : " + pourcentGarcons + "%"}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[var(--color-ink-muted)] mt-1">
                  <span>Filles {pourcentFilles} %</span>
                  <span>Garçons {pourcentGarcons} %</span>
                </div>
              </div>
            )}
          </div>

          {/* Stats generales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <StatCard
              href="/classes"
              label="Classes"
              value={String(nbClasses)}
              icon={School}
              accent="brand"
            />
            <StatCard
              href="/personnel"
              label="Personnel actif"
              value={String(nbEmployes)}
              icon={Users}
              accent="brand"
            />
            <StatCard
              href="/emploi-du-temps"
              label="Emploi du temps"
              value="Voir"
              icon={CalendarClock}
              accent="brand"
            />
            <StatCard
              href="/frais"
              label="Recettes du mois"
              value={statsAdmin.recettesMois.toLocaleString("fr-FR") + " F"}
              icon={Wallet}
              accent="accent"
              trend={statsAdmin.recettesMoisPrec > 0 ? statsAdmin.recettesMois - statsAdmin.recettesMoisPrec : null}
            />
          </div>

          {/* Alertes */}
          {alertes.length > 0 && (
            <div className="space-y-2">
              {alertes.map((a, i) => (
                <Link
                  key={i}
                  href={a.href}
                  className={
                    "block rounded-xl border p-4 flex items-start gap-3 hover:shadow-sm transition " +
                    (a.type === "danger" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50")
                  }
                >
                  <div
                    className={
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold " +
                      (a.type === "danger" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800")
                    }
                  >
                    !
                  </div>
                  <div className="min-w-0">
                    <p className={"font-medium " + (a.type === "danger" ? "text-red-900" : "text-amber-900")}>
                      {a.titre}
                    </p>
                    <p className={"text-xs mt-0.5 " + (a.type === "danger" ? "text-red-800" : "text-amber-800")}>
                      {a.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {prevision && <AlertePrevision prevision={prevision} peutCapital={peut(user.roles, "tresorerie.capital")} compacte />}

          {finances && (
            <Finances mois={mois} options={optionsMois()} flux={finances.flux} salairesPrevus={finances.prevus} situation={finances.situation} avecSalaires={peut(user.roles, "paiement.read")} />
          )}

          {/* Trimestre en cours */}
          {statsAdmin.trimestreActif && (
            <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold">{statsAdmin.trimestreActif.nom}</h2>
                  <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">Trimestre en cours</p>
                </div>
                <Link href="/notes" className="text-xs text-[var(--color-brand)] hover:underline">
                  Saisir des notes →
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[var(--color-ink-muted)]">Notes saisies</p>
                  <p className="text-2xl font-semibold mt-1 tnum">{statsAdmin.nbNotes}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-ink-muted)]">Validées</p>
                  <p className="text-2xl font-semibold mt-1 tnum text-[var(--color-accent)]">
                    {statsAdmin.nbNotesValidees}
                    <span className="text-sm text-[var(--color-ink-muted)] ml-1 font-normal">
                      / {statsAdmin.nbNotes}
                    </span>
                  </p>
                </div>
              </div>

              {statsAdmin.nbNotes > 0 && (
                <div className="mt-4">
                  <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-accent)]"
                      style={{ width: (statsAdmin.nbNotesValidees / statsAdmin.nbNotes) * 100 + "%" }}
                    />
                  </div>
                  <p className="text-xs text-[var(--color-ink-muted)] mt-1 tnum">
                    {Math.round((statsAdmin.nbNotesValidees / statsAdmin.nbNotes) * 100)} % validées
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions rapides */}
          <div className="grid md:grid-cols-2 gap-4">
            <ActionCard href="/notes" title="Saisir des notes" description="Enregistrer les notes d'une classe en une seule fois" primary />
            <ActionCard href="/bulletins" title="Générer les bulletins" description="Calculer les moyennes et produire les PDF" />
            <ActionCard href="/frais" title="Gérer les frais" description="Encaisser, imprimer les reçus, lancer les rappels" />
            <ActionCard href="/personnel" title="Gérer le personnel" description="Fiches, affectations, comptes de connexion" />
          </div>

          {/* Dernieres actions */}
          {dernieresActions.length > 0 && (
            <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
              <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between">
                <h2 className="font-semibold">Dernières actions</h2>
                <Link href="/audit" className="text-xs text-[var(--color-brand)] hover:underline">
                  Voir tout le journal →
                </Link>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {dernieresActions.map((a) => (
                  <div key={a.id} className="p-3 md:px-5 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {a.user.employe.nom.charAt(0)}
                      {a.user.employe.prenom.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{labelAction(a.action)}</p>
                      <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                        {a.user.employe.prenom} {a.user.employe.nom}
                        <span className="mx-1">·</span>
                        {ilYA(a.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* VUE COMPTABLE */}
      {isComptable && !estAdmin && statsComptable && (
        <>
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
            <h2 className="font-semibold mb-3">Effectif</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-[var(--color-border)] p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">Total</p>
                <p className="text-2xl font-semibold tnum mt-1">{nbElevesTotal}</p>
              </div>
              <div className="rounded-lg border border-pink-200 bg-pink-50/40 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-pink-700">Filles</p>
                <p className="text-2xl font-semibold tnum mt-1 text-pink-700">{nbFilles}</p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-blue-700">Garçons</p>
                <p className="text-2xl font-semibold tnum mt-1 text-blue-700">{nbGarcons}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <StatCard href="/frais" label="Recettes du mois" value={statsComptable.recettesMois.toLocaleString("fr-FR") + " F"} icon={Wallet} accent="accent" />
            <StatCard href="/frais" label="Paiements reçus" value={String(statsComptable.nbPaiements)} icon={Receipt} accent="brand" />
          </div>

          {prevision && <AlertePrevision prevision={prevision} peutCapital={peut(user.roles, "tresorerie.capital")} compacte />}

          {finances && (
            <Finances mois={mois} options={optionsMois()} flux={finances.flux} salairesPrevus={finances.prevus} situation={finances.situation} avecSalaires={peut(user.roles, "paiement.read")} />
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <ActionCard href="/frais" title="Frais de scolarité" description="Encaisser les paiements et imprimer les reçus" primary />
            <ActionCard href="/paiements" title="Paiements du personnel" description="Enregistrer les salaires et primes" />
          </div>
        </>
      )}

      {/* VUE ENSEIGNANT */}
      {isEnseignant && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <StatCard href="/emploi-du-temps" label="Cours aujourd'hui" value={String(mesCreneauxAujourdHui.length)} icon={CalendarClock} accent="brand" />
            <StatCard href="/emploi-du-temps" label="Cours cette semaine" value={String(mesCreneauxSemaine.length)} icon={CalendarDays} accent="brand" />
            <StatCard href="/eleves" label="Classes suivies" value={String(mesClasses.length)} icon={School} accent="brand" />
            <StatCard
              href="/notes"
              label="Notes saisies"
              value={mesStatsNotes ? String(mesStatsNotes.nbNotesSaisies) : "—"}
              icon={PencilLine}
              accent="accent"
              subtitle={mesStatsNotes ? mesStatsNotes.trimestre.nom : "Aucun trimestre actif"}
            />
          </div>

          <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
            <div className="p-5 border-b border-[var(--color-border)]">
              <h2 className="font-semibold">
                Cours d'aujourd'hui
                <span className="text-sm font-normal text-[var(--color-ink-muted)] ml-2">
                  ({libJour(jourActuel())})
                </span>
              </h2>
            </div>
            {mesCreneauxAujourdHui.length === 0 ? (
              <p className="p-6 text-center text-sm text-[var(--color-ink-muted)]">Aucun cours prévu aujourd'hui.</p>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {mesCreneauxAujourdHui.map((c) => (
                  <div key={c.id} className="p-4 flex items-center gap-4">
                    <div className="text-center w-16 flex-shrink-0">
                      <p className="font-mono text-sm font-medium">{c.heureDebut}</p>
                      <p className="text-[10px] text-[var(--color-ink-muted)]">{c.heureFin}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{c.matiere?.nom || "Titulariat"}</p>
                      <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                        {c.classe.nom || c.classe.niveau + (c.classe.section ? " " + c.classe.section : "")}
                      </p>
                    </div>
                    <Link href="/notes" className="inline-flex items-center h-8 px-3 rounded-lg bg-[var(--color-brand)] text-white text-xs font-medium hover:bg-[var(--color-brand-dark)] whitespace-nowrap">
                      Notes
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <ActionCard href="/notes" title="Saisir des notes" description="Enregistrer les notes de mes classes" primary />
            <ActionCard href="/emploi-du-temps" title="Voir mon emploi du temps" description="Grille hebdomadaire de mes cours" />
          </div>

          {mesClasses.length > 0 && (
            <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
              <div className="p-5 border-b border-[var(--color-border)]">
                <h2 className="font-semibold">Mes classes</h2>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {mesClasses.map((c) => {
                  const lib = c.nom || (c.niveau + (c.section ? " " + c.section : ""));
                  const nbMatiere = mesCreneauxSemaine.filter((x) => x.classeId === c.id).length;
                  return (
                    <Link key={c.id} href={"/classes/" + c.id} className="flex items-center justify-between p-4 hover:bg-neutral-50">
                      <div>
                        <p className="font-medium">{lib}</p>
                        <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                          {nbMatiere} créneau{nbMatiere > 1 ? "x" : ""} par semaine
                        </p>
                      </div>
                      <span className="text-[var(--color-ink-muted)] text-lg">›</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  href,
  label,
  value,
  icon: Icone,
  accent,
  trend,
  subtitle,
}: {
  href: string;
  label: string;
  value: string;
  icon: LucideIcon;
  accent: "brand" | "accent" | "gold" | "danger";
  trend?: number | null;
  subtitle?: string;
}) {
  const bg =
    accent === "accent" ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
    : accent === "gold" ? "bg-[var(--color-gold-soft)] text-[var(--color-gold)]"
    : accent === "danger" ? "bg-red-50 text-red-700"
    : "bg-[var(--color-brand-soft)] text-[var(--color-brand)]";

  return (
    <Link href={href} className="block bg-white rounded-xl border border-[var(--color-border)] p-4 hover:border-[var(--color-border-strong)] transition">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={"inline-block px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wide " + bg}>
          {label}
        </span>
        <Icone aria-hidden className="h-4 w-4 shrink-0 text-[var(--color-ink-faint)]" strokeWidth={1.8} />
      </div>
      <p className="text-xl md:text-2xl font-semibold tnum">{value}</p>
      {subtitle && <p className="text-[10px] text-[var(--color-ink-muted)] mt-1">{subtitle}</p>}
      {trend != null && trend !== 0 && (
        <p className={"text-xs mt-1 " + (trend > 0 ? "text-[var(--color-accent)]" : "text-red-700")}>
          {trend > 0 ? "↑" : "↓"} {Math.abs(trend).toLocaleString("fr-FR")} F vs mois dernier
        </p>
      )}
    </Link>
  );
}

function ActionCard({
  href,
  title,
  description,
  primary,
}: {
  href: string;
  title: string;
  description: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        "block rounded-xl border p-5 transition hover:shadow-sm " +
        (primary
          ? "bg-[var(--color-brand)] text-white border-[var(--color-brand)]"
          : "bg-white border-[var(--color-border)] hover:border-[var(--color-border-strong)]")
      }
    >
      <p className={"font-medium " + (primary ? "text-white" : "text-[var(--color-ink)]")}>{title}</p>
      <p className={"text-sm mt-1 " + (primary ? "text-white/70" : "text-[var(--color-ink-muted)]")}>
        {description}
      </p>
    </Link>
  );
}