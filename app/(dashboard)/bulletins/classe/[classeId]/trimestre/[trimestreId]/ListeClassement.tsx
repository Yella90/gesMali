"use client";

import Link from "next/link";
import { useState, useMemo } from "react";

type Bulletin = {
  id: string;
  rang: number | null;
  moyenneGenerale: number;
  totalPoints: number;
  totalCoeffs: number;
  eleve: {
    id: string;
    nom: string;
    prenom: string;
    matricule: string;
  };
};

function normaliser(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function ListeClassement({
  bulletins,
  trimestreId,
}: {
  bulletins: Bulletin[];
  trimestreId: string;
}) {
  const [recherche, setRecherche] = useState("");

  const bulletinsFiltres = useMemo(() => {
    const q = normaliser(recherche.trim());
    if (!q) return bulletins;
    return bulletins.filter((b) =>
      normaliser(b.eleve.nom + " " + b.eleve.prenom + " " + b.eleve.matricule).includes(q)
    );
  }, [bulletins, recherche]);

  const filtresActifs = recherche.trim() !== "";

  return (
    <>
      {/* Recherche eleve */}
      <div className="relative">
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
          className="w-full h-10 pl-9 pr-24 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
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
        {filtresActifs && (
          <span className="absolute right-10 top-1/2 -translate-y-1/2 text-xs text-[var(--color-ink-muted)] pointer-events-none">
            {bulletinsFiltres.length} / {bulletins.length}
          </span>
        )}
      </div>

      {/* Desktop : tableau */}
      <div className="hidden md:block bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
            <tr>
              <th className="text-left p-3 font-medium text-[var(--color-ink-muted)] w-16">Rang</th>
              <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Élève</th>
              <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Matricule</th>
              <th className="text-right p-3 font-medium text-[var(--color-ink-muted)]">Moyenne</th>
              <th className="text-right p-3 font-medium text-[var(--color-ink-muted)]">Points</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {bulletinsFiltres.map((b) => {
              const top3 = b.rang != null && b.rang <= 3;
              return (
                <tr key={b.id} className="border-t border-[var(--color-border)] hover:bg-neutral-50/60">
                  <td className="p-3">
                    <span
                      className={
                        "inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-semibold tnum " +
                        (top3
                          ? "bg-[var(--color-gold-soft)] text-[var(--color-gold)]"
                          : "bg-[var(--color-surface)] text-[var(--color-ink-muted)]")
                      }
                    >
                      {b.rang}
                    </span>
                  </td>
                  <td className="p-3 font-medium">{b.eleve.nom} {b.eleve.prenom}</td>
                  <td className="p-3 font-mono text-xs text-[var(--color-ink-muted)]">{b.eleve.matricule}</td>
                  <td className="p-3 text-right tnum font-semibold">
                    {b.moyenneGenerale.toFixed(2)}
                  </td>
                  <td className="p-3 text-right tnum text-[var(--color-ink-muted)]">
                    {b.totalPoints.toFixed(2)} / {b.totalCoeffs}
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={"/api/bulletins/eleve/" + b.eleve.id + "/trimestre/" + trimestreId + "/pdf"}
                      target="_blank"
                      className="text-[var(--color-brand)] text-sm hover:underline"
                    >
                      Bulletin PDF
                    </Link>
                  </td>
                </tr>
              );
            })}
            {bulletinsFiltres.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[var(--color-ink-muted)]">
                  Aucun élève ne correspond à la recherche.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile : cartes */}
      <div className="md:hidden space-y-2">
        {bulletinsFiltres.map((b) => {
          const top3 = b.rang != null && b.rang <= 3;
          return (
            <Link
              key={b.id}
              href={"/api/bulletins/eleve/" + b.eleve.id + "/trimestre/" + trimestreId + "/pdf"}
              target="_blank"
              className="block bg-white rounded-xl border border-[var(--color-border)] p-4 hover:border-[var(--color-border-strong)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    <span className={"inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-semibold mr-2 tnum " + (top3 ? "bg-[var(--color-gold-soft)] text-[var(--color-gold)]" : "bg-[var(--color-surface)] text-[var(--color-ink-muted)]")}>
                      {b.rang}
                    </span>
                    {b.eleve.nom} {b.eleve.prenom}
                  </p>
                  <p className="text-xs text-[var(--color-ink-muted)] mt-1 font-mono">{b.eleve.matricule}</p>
                </div>
                <p className="text-lg font-semibold tnum whitespace-nowrap">{b.moyenneGenerale.toFixed(2)}</p>
              </div>
            </Link>
          );
        })}
        {bulletinsFiltres.length === 0 && (
          <p className="text-center text-[var(--color-ink-muted)] py-12">
            Aucun élève ne correspond à la recherche.
          </p>
        )}
      </div>
    </>
  );
}