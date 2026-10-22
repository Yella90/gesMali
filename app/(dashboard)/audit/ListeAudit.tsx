"use client";

import { useState, useMemo } from "react";

type Log = {
  id: string;
  action: string;
  entite: string;
  entiteId: string;
  details: any;
  createdAt: string; // ISO string pour serialisation
  user: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    roles: string[];
  };
};

type FiltreCategorie = "TOUS" | "CREATION" | "MODIFICATION" | "SUPPRESSION" | "VALIDATION" | "PAIEMENT";

function normaliser(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Categorise une action pour le filtrage
function categorieAction(action: string): FiltreCategorie {
  if (action.startsWith("CREATE_") || action.startsWith("GENERER_") || action === "PAIEMENT_INSCRIPTION_AUTO") return "CREATION";
  if (action.startsWith("UPDATE_") || action.startsWith("SOUMETTRE_") || action.startsWith("MARQUER_")) return "MODIFICATION";
  if (action.startsWith("DELETE_") || action.startsWith("RADIER_") || action.startsWith("ANNULER_") || action.startsWith("SUPPRIMER_")) return "SUPPRESSION";
  if (action.startsWith("VALIDER_") || action.startsWith("CLOTURER_") || action.startsWith("ACTIVER_")) return "VALIDATION";
  if (action.startsWith("ENCAISSER_") || action.includes("PAIEMENT") || action.includes("FRAIS") || action.startsWith("TRESORERIE_")) return "PAIEMENT";
  return "TOUS";
}

// Badge color selon action
function badgeAction(action: string): { bg: string; label: string } {
  const cat = categorieAction(action);
  if (cat === "CREATION") return { bg: "bg-[var(--color-accent-soft)] text-[var(--color-accent)]", label: "Création" };
  if (cat === "SUPPRESSION") return { bg: "bg-red-50 text-red-700", label: "Suppression" };
  if (cat === "MODIFICATION") return { bg: "bg-blue-50 text-blue-700", label: "Modification" };
  if (cat === "VALIDATION") return { bg: "bg-[var(--color-brand-soft)] text-[var(--color-brand)]", label: "Validation" };
  if (cat === "PAIEMENT") return { bg: "bg-[var(--color-gold-soft)] text-[var(--color-gold)]", label: "Paiement" };
  return { bg: "bg-neutral-100 text-neutral-700", label: "Action" };
}

// Label lisible pour les actions
function labelAction(action: string): string {
  const labels: Record<string, string> = {
    CREATE_ELEVE: "Création élève",
    UPDATE_ELEVE: "Modification élève",
    RADIER_ELEVE: "Radiation élève",
    CREATE_CLASSE: "Création classe",
    UPDATE_CLASSE: "Modification classe",
    DELETE_CLASSE: "Suppression classe",
    CREATE_MATIERE: "Création matière",
    UPDATE_MATIERE: "Modification matière",
    DELETE_MATIERE: "Suppression matière",
    CREATE_TRIMESTRE: "Création trimestre",
    UPDATE_TRIMESTRE: "Modification trimestre",
    CREATE_ANNEE: "Création année",
    ACTIVER_ANNEE: "Activation année",
    CLOTURER_TRIMESTRE: "Clôture trimestre",
    CREATE_NOTE: "Saisie note",
    UPDATE_NOTE: "Modification note",
    SOUMETTRE_NOTES: "Soumission notes",
    VALIDER_NOTES: "Validation notes",
    GENERER_BULLETINS: "Génération bulletins",
    SUPPRIMER_BULLETINS: "Suppression bulletins",
    CONFIGURER_FRAIS: "Configuration frais",
    GENERER_FRAIS_ELEVE: "Génération frais",
    ENCAISSER_PAIEMENT: "Encaissement",
    ANNULER_PAIEMENT: "Annulation paiement",
    PAIEMENT_INSCRIPTION_AUTO: "Paiement inscription auto",
    GENERER_RAPPELS: "Génération rappels",
    MARQUER_RAPPEL_ENVOYE: "Rappel envoyé",
    CREATE_PAIEMENT: "Paiement créé",
    CREATE_PERSONNEL: "Création personnel",
    UPDATE_PERSONNEL: "Modification personnel",
    CHANGER_MOT_DE_PASSE: "Changement mot de passe",
    CREATE_AFFECTATION: "Affectation créée",
    UPDATE_AFFECTATION: "Affectation modifiée",
    DELETE_AFFECTATION: "Affectation supprimée",
    UPDATE_ETABLISSEMENT: "Modification établissement",
    UPDATE_PARAMETRES_NOTES: "Modification paramètres notes",
    TRESORERIE_DEPENSE: "Dépense",
    TRESORERIE_APPORT_CAPITAL: "Apport de capital",
    TRESORERIE_RETRAIT_PROMOTEUR: "Retrait du promoteur",
    TRESORERIE_TRANSFERT: "Transfert entre caisses",
    TRESORERIE_ANNULATION: "Annulation mouvement de trésorerie",
    DEPENSE_RECURRENTE_CREEE: "Dépense récurrente créée",
  };
  return labels[action] || action.replace(/_/g, " ");
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtHeure(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function ilYA(iso: string): string {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.floor((now - d) / 1000);
  if (sec < 60) return "il y a " + sec + "s";
  if (sec < 3600) return "il y a " + Math.floor(sec / 60) + " min";
  if (sec < 86400) return "il y a " + Math.floor(sec / 3600) + " h";
  if (sec < 604800) return "il y a " + Math.floor(sec / 86400) + " j";
  return fmtDate(iso);
}

// Filtre par plage temporelle
type FiltreTemps = "TOUS" | "AUJOURD_HUI" | "7J" | "30J";

function dansPlage(iso: string, plage: FiltreTemps): boolean {
  if (plage === "TOUS") return true;
  const d = new Date(iso).getTime();
  const now = Date.now();
  if (plage === "AUJOURD_HUI") {
    const debut = new Date();
    debut.setHours(0, 0, 0, 0);
    return d >= debut.getTime();
  }
  if (plage === "7J") return d >= now - 7 * 86400 * 1000;
  if (plage === "30J") return d >= now - 30 * 86400 * 1000;
  return true;
}

export function ListeAudit({ logs }: { logs: Log[] }) {
  const [recherche, setRecherche] = useState("");
  const [filtreCat, setFiltreCat] = useState<FiltreCategorie>("TOUS");
  const [filtreTemps, setFiltreTemps] = useState<FiltreTemps>("TOUS");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const logsFiltres = useMemo(() => {
    const q = normaliser(recherche.trim());

    return logs.filter((l) => {
      if (filtreCat !== "TOUS" && categorieAction(l.action) !== filtreCat) return false;
      if (!dansPlage(l.createdAt, filtreTemps)) return false;

      if (q) {
        const cible = normaliser(
          labelAction(l.action) + " " +
          l.action + " " +
          l.entite + " " +
          l.user.nom + " " +
          l.user.prenom + " " +
          l.user.email
        );
        if (!cible.includes(q)) return false;
      }

      return true;
    });
  }, [logs, recherche, filtreCat, filtreTemps]);

  const filtresActifs = recherche.trim() !== "" || filtreCat !== "TOUS" || filtreTemps !== "TOUS";

  function resetFiltres() {
    setRecherche("");
    setFiltreCat("TOUS");
    setFiltreTemps("TOUS");
  }

  function toggleExpanded(id: string) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  }

  return (
    <>
      {/* Filtres */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-3 flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)] pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </span>
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher (utilisateur, action, entité)..."
            className="w-full h-10 pl-9 pr-9 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
          />
          {recherche && (
            <button
              type="button"
              onClick={() => setRecherche("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-[var(--color-ink-muted)] hover:bg-neutral-100"
              aria-label="Effacer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <select
          value={filtreCat}
          onChange={(e) => setFiltreCat(e.target.value as FiltreCategorie)}
          className="h-10 md:w-48 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
        >
          <option value="TOUS">Toutes catégories</option>
          <option value="CREATION">Créations</option>
          <option value="MODIFICATION">Modifications</option>
          <option value="SUPPRESSION">Suppressions</option>
          <option value="VALIDATION">Validations</option>
          <option value="PAIEMENT">Paiements</option>
        </select>

        <select
          value={filtreTemps}
          onChange={(e) => setFiltreTemps(e.target.value as FiltreTemps)}
          className="h-10 md:w-44 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
        >
          <option value="TOUS">Toute période</option>
          <option value="AUJOURD_HUI">Aujourd'hui</option>
          <option value="7J">7 derniers jours</option>
          <option value="30J">30 derniers jours</option>
        </select>

        {filtresActifs && (
          <button
            type="button"
            onClick={resetFiltres}
            className="inline-flex items-center justify-center h-10 px-4 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm hover:bg-neutral-50 whitespace-nowrap"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Compteur */}
      <p className="text-sm text-[var(--color-ink-muted)]">
        {logsFiltres.length} événement{logsFiltres.length > 1 ? "s" : ""}
        {filtresActifs && " (filtré" + (logsFiltres.length > 1 ? "s" : "") + ")"}
        {filtresActifs && " · " + logs.length + " au total"}
      </p>

      {/* Liste */}
      {logsFiltres.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-[var(--color-border-strong)] py-16 text-center">
          <p className="text-sm text-[var(--color-ink-muted)]">
            {filtresActifs ? "Aucun événement ne correspond aux filtres." : "Aucun événement enregistré."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden divide-y divide-[var(--color-border)]">
          {logsFiltres.map((l) => {
            const badge = badgeAction(l.action);
            const isExpanded = expanded[l.id];
            const hasDetails = l.details && Object.keys(l.details).length > 0;

            return (
              <div key={l.id} className="p-4 hover:bg-neutral-50/60">
                <div className="flex items-start gap-3 md:gap-4">
                  {/* Avatar utilisateur */}
                  <div className="w-9 h-9 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {l.user.nom.charAt(0)}{l.user.prenom.charAt(0)}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={"inline-flex px-2 py-0.5 rounded-md text-xs font-medium " + badge.bg}>
                        {badge.label}
                      </span>
                      <span className="text-sm font-medium text-[var(--color-ink)]">
                        {labelAction(l.action)}
                      </span>
                    </div>

                    <div className="text-xs text-[var(--color-ink-muted)] flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span>
                        <strong className="text-[var(--color-ink)]">{l.user.prenom} {l.user.nom}</strong>
                      </span>
                      <span>·</span>
                      <span>{l.user.email}</span>
                      <span>·</span>
                      <span className="font-mono">{l.entite}</span>
                    </div>

                    {/* Details extensibles */}
                    {hasDetails && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(l.id)}
                          className="text-xs text-[var(--color-brand)] hover:underline flex items-center gap-1"
                        >
                          <svg
                            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                            style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0)", transition: "transform 150ms" }}
                          >
                            <path d="m9 18 6-6-6-6" />
                          </svg>
                          {isExpanded ? "Masquer les détails" : "Voir les détails"}
                        </button>

                        {isExpanded && (
                          <pre className="mt-2 p-3 rounded-lg bg-[var(--color-surface)] text-xs overflow-x-auto">
                            {JSON.stringify(l.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Date */}
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-xs font-medium text-[var(--color-ink)] tnum" title={fmtDate(l.createdAt) + " " + fmtHeure(l.createdAt)}>
                      {ilYA(l.createdAt)}
                    </p>
                    <p className="text-[10px] text-[var(--color-ink-faint)] tnum mt-0.5 hidden md:block">
                      {fmtHeure(l.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}