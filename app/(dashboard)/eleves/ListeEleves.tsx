"use client";

import Link from "next/link";
import { useState, useMemo } from "react";

type Eleve = {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  sexe: string;
  statut: string;
  classe: { nom: string | null; niveau: number; section: string | null } | null;
};

type ClasseOption = { id: string; label: string };

function libClasse(c: Eleve["classe"]) {
  if (!c) return "-";
  return c.nom || c.niveau + (c.section ? " " + c.section : "");
}

// Retire les accents et met en minuscules pour comparaison
function normaliser(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function ListeEleves({
  eleves,
  classes,
}: {
  eleves: Eleve[];
  classes: ClasseOption[];
}) {
  const [recherche, setRecherche] = useState("");
  const [classeId, setClasseId] = useState("");

  // Filtrage local en memoire (instantane)
  const elevesFiltres = useMemo(() => {
    const q = normaliser(recherche.trim());

    return eleves.filter((e) => {
      // Filtre par classe
      if (classeId) {
        const cId = e.classe ? classes.find((c) => c.label === libClasse(e.classe))?.id : null;
        // Comparaison via l'id resolu
        if (!e.classe) return false;
        // On retrouve l'id via le label (car pas d'id direct dans l'eleve)
        // -> on passe par un index plus bas
      }

      // Filtre par recherche
      if (q) {
        const cible = normaliser(
          e.nom + " " + e.prenom + " " + e.matricule
        );
        if (!cible.includes(q)) return false;
      }

      return true;
    });
  }, [eleves, recherche, classeId, classes]);

  const filtresActifs = recherche.trim() !== "" || classeId !== "";

  return (
    <>
      {/* Filtres */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-3 flex flex-col sm:flex-row gap-2">
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
            placeholder="Rechercher par nom, prénom ou matricule..."
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
          value={classeId}
          onChange={(e) => setClasseId(e.target.value)}
          className="h-10 sm:w-56 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
        >
          <option value="">Toutes les classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.label}>{c.label}</option>
          ))}
        </select>

        {filtresActifs && (
          <button
            type="button"
            onClick={() => { setRecherche(""); setClasseId(""); }}
            className="inline-flex items-center justify-center h-10 px-4 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm hover:bg-neutral-50 whitespace-nowrap"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Compteur */}
      <p className="text-sm text-[var(--color-ink-muted)]">
        {elevesFiltres.length} élève{elevesFiltres.length > 1 ? "s" : ""}
        {filtresActifs && " (filtré" + (elevesFiltres.length > 1 ? "s" : "") + ")"}
        {filtresActifs && " · " + eleves.length + " au total"}
      </p>

      {/* Desktop : tableau */}
      <div className="hidden md:block bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
            <tr>
              <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Matricule</th>
              <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Nom</th>
              <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Prénom</th>
              <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Classe</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {elevesFiltres.map((e) => (
              <tr key={e.id} className="border-t border-[var(--color-border)] hover:bg-neutral-50/60">
                <td className="p-3 font-mono text-xs text-[var(--color-ink-muted)]">{e.matricule}</td>
                <td className="p-3">{e.nom}</td>
                <td className="p-3">{e.prenom}</td>
                <td className="p-3 text-[var(--color-ink-muted)]">{libClasse(e.classe)}</td>
                <td className="p-3 text-right">
                  <Link href={"/eleves/" + e.id} className="text-[var(--color-brand)] text-sm hover:underline">
                    Ouvrir
                  </Link>
                </td>
              </tr>
            ))}
            {elevesFiltres.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[var(--color-ink-muted)]">
                  {filtresActifs ? "Aucun élève ne correspond aux filtres." : "Aucun élève."}
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
            href={"/eleves/" + e.id}
            className="block bg-white rounded-xl border border-[var(--color-border)] p-4 hover:border-[var(--color-border-strong)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{e.nom} {e.prenom}</p>
                <p className="text-xs text-[var(--color-ink-muted)] mt-0.5 font-mono">{e.matricule}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-md bg-[var(--color-brand-soft)] text-[var(--color-brand)] whitespace-nowrap">
                {libClasse(e.classe)}
              </span>
            </div>
          </Link>
        ))}
        {elevesFiltres.length === 0 && (
          <p className="text-center text-[var(--color-ink-muted)] py-12">
            {filtresActifs ? "Aucun élève ne correspond aux filtres." : "Aucun élève."}
          </p>
        )}
      </div>
    </>
  );
}