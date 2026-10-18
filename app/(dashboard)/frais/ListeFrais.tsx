"use client";

import Link from "next/link";
import { useState, useMemo } from "react";

type EleveFrais = {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  classe: { nom: string | null; niveau: number; section: string | null } | null;
  situation: {
    totalPaye: number;
    attenduJusquMaintenant: number;
    retard: number;
    moisPayes: number;
    moisEcoules: number;
    statut: "A_JOUR" | "EN_RETARD" | "EN_AVANCE" | "SOLDE";
    inscriptionStatut: "PAYEE" | "PARTIELLE" | "IMPAYEE" | "AUCUNE";
    inscriptionReste: number;
  } | null;
};

type ClasseOption = { id: string; label: string };
type FiltreStatut = "TOUS" | "EN_RETARD" | "A_JOUR" | "INSCRIPTION_IMPAYEE";

function normaliser(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function libClasse(c: EleveFrais["classe"]) {
  if (!c) return "-";
  return c.nom || c.niveau + (c.section ? " " + c.section : "");
}

function libelleStatut(statut: string): string {
  if (statut === "SOLDE") return "Soldé";
  if (statut === "EN_RETARD") return "En retard";
  if (statut === "EN_AVANCE") return "En avance";
  return "à jour";
}

function badgeStatut(statut: string): string {
  if (statut === "SOLDE") return "bg-[var(--color-accent-soft)] text-[var(--color-accent)]";
  if (statut === "EN_RETARD") return "bg-red-50 text-red-700";
  if (statut === "EN_AVANCE") return "bg-blue-50 text-blue-700";
  return "bg-[var(--color-brand-soft)] text-[var(--color-brand)]";
}

export function ListeFrais({
  eleves,
  classes,
}: {
  eleves: EleveFrais[];
  classes: ClasseOption[];
}) {
  const [recherche, setRecherche] = useState("");
  const [classeLabel, setClasseLabel] = useState("");
  const [filtreStatut, setFiltreStatut] = useState<FiltreStatut>("TOUS");

  const elevesFiltres = useMemo(() => {
    const q = normaliser(recherche.trim());

    return eleves.filter((e) => {
      // Filtre par classe
      if (classeLabel && libClasse(e.classe) !== classeLabel) return false;

      // Filtre par statut
      if (filtreStatut === "EN_RETARD") {
        if (!e.situation || e.situation.statut !== "EN_RETARD") return false;
      }
      if (filtreStatut === "A_JOUR") {
        if (!e.situation || e.situation.statut === "EN_RETARD") return false;
      }
      if (filtreStatut === "INSCRIPTION_IMPAYEE") {
        if (!e.situation) return false;
        if (e.situation.inscriptionStatut !== "IMPAYEE" && e.situation.inscriptionStatut !== "PARTIELLE") return false;
      }

      // Filtre par recherche
      if (q) {
        const cible = normaliser(e.nom + " " + e.prenom + " " + e.matricule);
        if (!cible.includes(q)) return false;
      }

      return true;
    });
  }, [eleves, recherche, classeLabel, filtreStatut]);

  const filtresActifs = recherche.trim() !== "" || classeLabel !== "" || filtreStatut !== "TOUS";

  function resetFiltres() {
    setRecherche("");
    setClasseLabel("");
    setFiltreStatut("TOUS");
  }

  return (
    <>
      {/* Filtres */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-3 space-y-2">
        <div className="flex flex-col md:flex-row gap-2">
          {/* Recherche */}
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
              placeholder="Rechercher un élève (nom, prénom ou matricule)..."
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

          {/* Filtre classe */}
          <select
            value={classeLabel}
            onChange={(e) => setClasseLabel(e.target.value)}
            className="h-10 md:w-48 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
          >
            <option value="">Toutes les classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.label}>{c.label}</option>
            ))}
          </select>

          {/* Filtre statut */}
          <select
            value={filtreStatut}
            onChange={(e) => setFiltreStatut(e.target.value as FiltreStatut)}
            className="h-10 md:w-56 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
          >
            <option value="TOUS">Tous les statuts</option>
            <option value="EN_RETARD">En retard uniquement</option>
            <option value="A_JOUR">à jour / soldés</option>
            <option value="INSCRIPTION_IMPAYEE">Inscription non payée</option>
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
      </div>

      {/* Compteur */}
      <div className="flex items-center justify-between text-sm text-[var(--color-ink-muted)]">
        <span>
          {elevesFiltres.length} élève{elevesFiltres.length > 1 ? "s" : ""}
          {filtresActifs && " (filtré" + (elevesFiltres.length > 1 ? "s" : "") + ")"}
          {filtresActifs && " · " + eleves.length + " au total"}
        </span>
      </div>

      {/* Desktop : tableau */}
      <div className="hidden md:block bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
            <tr>
              <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Matricule</th>
              <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Élève</th>
              <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Classe</th>
              <th className="text-center p-3 font-medium text-[var(--color-ink-muted)]">Inscription</th>
              <th className="text-center p-3 font-medium text-[var(--color-ink-muted)]">Mois</th>
              <th className="text-right p-3 font-medium text-[var(--color-ink-muted)]">Payé</th>
              <th className="text-right p-3 font-medium text-[var(--color-ink-muted)]">Retard</th>
              <th className="text-center p-3 font-medium text-[var(--color-ink-muted)]">Statut</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {elevesFiltres.map((e) => (
              <tr key={e.id} className={"border-t border-[var(--color-border)] hover:bg-neutral-50/60 " + (e.situation?.inscriptionStatut === "IMPAYEE" ? "bg-amber-50/40" : "")}>
                <td className="p-3 font-mono text-xs text-[var(--color-ink-muted)]">{e.matricule}</td>
                <td className="p-3">
                  <Link href={"/eleves/" + e.id} className="font-medium hover:underline">
                    {e.nom} {e.prenom}
                  </Link>
                </td>
                <td className="p-3 text-[var(--color-ink-muted)]">{libClasse(e.classe)}</td>
                <td className="p-3 text-center">
                  {e.situation ? (
                    <span className={
                      "inline-flex px-2 py-0.5 rounded-md text-xs whitespace-nowrap " +
                      (e.situation.inscriptionStatut === "PAYEE" ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                      : e.situation.inscriptionStatut === "PARTIELLE" ? "bg-amber-50 text-amber-800"
                      : e.situation.inscriptionStatut === "IMPAYEE" ? "bg-red-50 text-red-700 font-medium"
                      : "bg-neutral-100 text-neutral-500")
                    }>
                      {e.situation.inscriptionStatut === "PAYEE" ? "Payée"
                      : e.situation.inscriptionStatut === "PARTIELLE" ? "Partielle"
                      : e.situation.inscriptionStatut === "IMPAYEE" ? "Impayée"
                      : "—"}
                    </span>
                  ) : <span className="text-xs text-neutral-400">—</span>}
                </td>
                <td className="p-3 text-center text-xs text-[var(--color-ink-muted)] tnum">
                  {e.situation ? e.situation.moisPayes + "/" + e.situation.moisEcoules : "—"}
                </td>
                <td className="p-3 text-right tnum text-[var(--color-accent)]">
                  {e.situation ? e.situation.totalPaye.toLocaleString("fr-FR") : "—"}
                </td>
                <td className="p-3 text-right">
                  {e.situation && e.situation.retard > 0 ? (
                    <span className="text-red-700 font-medium tnum">{e.situation.retard.toLocaleString("fr-FR")}</span>
                  ) : (
                    <span className="text-[var(--color-ink-faint)]">—</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  {e.situation ? (
                    <span className={"inline-flex px-2 py-0.5 rounded-md text-xs whitespace-nowrap " + badgeStatut(e.situation.statut)}>
                      {libelleStatut(e.situation.statut)}
                    </span>
                  ) : <span className="text-xs text-neutral-400">—</span>}
                </td>
                <td className="p-3 text-right">
                  <Link href={"/frais/eleve/" + e.id} className="text-[var(--color-brand)] text-sm hover:underline">
                    Détail
                  </Link>
                </td>
              </tr>
            ))}
            {elevesFiltres.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-[var(--color-ink-muted)]">
                  Aucun élève ne correspond aux filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile : cartes */}
      <div className="md:hidden space-y-2">
        {elevesFiltres.map((e) => (
          <Link
            key={e.id}
            href={"/frais/eleve/" + e.id}
            className={"block bg-white rounded-xl border border-[var(--color-border)] p-4 hover:bg-neutral-50 " + (e.situation?.inscriptionStatut === "IMPAYEE" ? "bg-amber-50/40" : "")}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{e.nom} {e.prenom}</p>
                <p className="text-xs text-[var(--color-ink-muted)] mt-0.5 font-mono">{e.matricule} · {libClasse(e.classe)}</p>
              </div>
              {e.situation && (
                <span className={"inline-flex px-2 py-0.5 rounded-md text-xs whitespace-nowrap " + badgeStatut(e.situation.statut)}>
                  {libelleStatut(e.situation.statut)}
                </span>
              )}
            </div>

            {e.situation && e.situation.inscriptionStatut === "IMPAYEE" && (
              <div className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-800 mb-2">
                Inscription non payée : {e.situation.inscriptionReste.toLocaleString("fr-FR")} F
              </div>
            )}

            {e.situation && (
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-[var(--color-ink-muted)]">Mois</p>
                  <p className="font-medium tnum mt-0.5">{e.situation.moisPayes}/{e.situation.moisEcoules}</p>
                </div>
                <div>
                  <p className="text-[var(--color-ink-muted)]">Payé</p>
                  <p className="font-medium tnum text-[var(--color-accent)] mt-0.5">{e.situation.totalPaye.toLocaleString("fr-FR")}</p>
                </div>
                <div>
                  <p className="text-[var(--color-ink-muted)]">Retard</p>
                  <p className={"font-medium tnum mt-0.5 " + (e.situation.retard > 0 ? "text-red-700" : "text-[var(--color-ink-faint)]")}>
                    {e.situation.retard > 0 ? e.situation.retard.toLocaleString("fr-FR") : "—"}
                  </p>
                </div>
              </div>
            )}
          </Link>
        ))}
        {elevesFiltres.length === 0 && (
          <p className="text-center text-[var(--color-ink-muted)] py-12">Aucun élève ne correspond aux filtres.</p>
        )}
      </div>
    </>
  );
}