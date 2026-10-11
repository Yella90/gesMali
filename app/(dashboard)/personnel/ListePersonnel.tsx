"use client";

import Link from "next/link";
import { useState, useMemo } from "react";

type Employe = {
  id: string;
  nom: string;
  prenom: string;
  telephone: string | null;
  poste: string;
  posteLibre: string | null;
  actif: boolean;
  dateEmbauche: string;
  salaireReference: number | null;
  nbAffectations: number;
  nbPaiements: number;
  user: {
    id: string;
    email: string;
    roles: string[];
    actif: boolean;
  } | null;
};

type FiltrePoste = "TOUS" | "Enseignant" | "Administratif" | "Support" | "SansCompte" | "AvecCompte";
type FiltreActif = "TOUS" | "ACTIF" | "INACTIF";

function normaliser(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function libPoste(e: Employe): string {
  if (e.poste === "Autre" && e.posteLibre) return e.posteLibre;
  return e.poste;
}

function badgePoste(poste: string): string {
  if (poste === "Directeur") return "bg-[var(--color-gold-soft)] text-[var(--color-gold)]";
  if (poste === "Enseignant") return "bg-[var(--color-brand-soft)] text-[var(--color-brand)]";
  if (poste === "Secretaire" || poste === "Comptable") return "bg-[var(--color-accent-soft)] text-[var(--color-accent)]";
  if (poste === "Surveillant" || poste === "Gardien") return "bg-neutral-100 text-neutral-700";
  return "bg-amber-50 text-amber-800";
}

function roleLabel(r: string): string {
  if (r === "DIRECTEUR") return "Directeur";
  if (r === "SECRETAIRE") return "Secrétaire";
  if (r === "COMPTABLE") return "Comptable";
  if (r === "ENSEIGNANT") return "Enseignant";
  return r;
}

function matchPoste(poste: string, filtre: FiltrePoste): boolean {
  if (filtre === "TOUS") return true;
  if (filtre === "Enseignant") return poste === "Enseignant";
  if (filtre === "Administratif") return poste === "Directeur" || poste === "Secretaire" || poste === "Comptable";
  if (filtre === "Support") return poste === "Surveillant" || poste === "Gardien" || poste === "Autre";
  return true;
}

export function ListePersonnel({ employes }: { employes: Employe[] }) {
  const [recherche, setRecherche] = useState("");
  const [filtrePoste, setFiltrePoste] = useState<FiltrePoste>("TOUS");
  const [filtreActif, setFiltreActif] = useState<FiltreActif>("TOUS");

  const filtres = useMemo(() => {
    const q = normaliser(recherche.trim());

    return employes.filter((e) => {
      if (filtreActif === "ACTIF" && !e.actif) return false;
      if (filtreActif === "INACTIF" && e.actif) return false;

      if (filtrePoste === "AvecCompte" && !e.user) return false;
      if (filtrePoste === "SansCompte" && e.user) return false;
      if (filtrePoste !== "AvecCompte" && filtrePoste !== "SansCompte" && !matchPoste(e.poste, filtrePoste)) return false;

      if (q) {
        const cible = normaliser(
          e.nom + " " + e.prenom + " " + (e.telephone ?? "") + " " + (e.user?.email ?? "") + " " + libPoste(e)
        );
        if (!cible.includes(q)) return false;
      }

      return true;
    });
  }, [employes, recherche, filtrePoste, filtreActif]);

  const filtresActifs = recherche.trim() !== "" || filtrePoste !== "TOUS" || filtreActif !== "TOUS";

  function reset() {
    setRecherche("");
    setFiltrePoste("TOUS");
    setFiltreActif("TOUS");
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
            placeholder="Rechercher (nom, email, téléphone)..."
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
          value={filtrePoste}
          onChange={(e) => setFiltrePoste(e.target.value as FiltrePoste)}
          className="h-10 md:w-52 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
        >
          <option value="TOUS">Tous les postes</option>
          <option value="Enseignant">Enseignants</option>
          <option value="Administratif">Administratifs</option>
          <option value="Support">Support / Gardiennage</option>
          <option value="AvecCompte">Avec compte</option>
          <option value="SansCompte">Sans compte</option>
        </select>

        <select
          value={filtreActif}
          onChange={(e) => setFiltreActif(e.target.value as FiltreActif)}
          className="h-10 md:w-40 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
        >
          <option value="TOUS">Tous statuts</option>
          <option value="ACTIF">Actifs</option>
          <option value="INACTIF">Inactifs</option>
        </select>

        {filtresActifs && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center h-10 px-4 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm hover:bg-neutral-50 whitespace-nowrap"
          >
            Réinitialiser
          </button>
        )}
      </div>

      <p className="text-sm text-[var(--color-ink-muted)]">
        {filtres.length} employé{filtres.length > 1 ? "s" : ""}
        {filtresActifs && " (filtré" + (filtres.length > 1 ? "s" : "") + ")"}
        {filtresActifs && " · " + employes.length + " au total"}
      </p>

      {/* Desktop */}
      <div className="hidden md:block bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
            <tr>
              <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Nom</th>
              <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Poste</th>
              <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Téléphone</th>
              <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Compte</th>
              <th className="text-center p-3 font-medium text-[var(--color-ink-muted)]">Affectations</th>
              <th className="text-center p-3 font-medium text-[var(--color-ink-muted)]">Statut</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtres.map((e) => (
              <tr key={e.id} className={"border-t border-[var(--color-border)] hover:bg-neutral-50/60 " + (!e.actif ? "opacity-50" : "")}>
                <td className="p-3 font-medium">{e.nom} {e.prenom}</td>
                <td className="p-3">
                  <span className={"inline-flex px-2 py-0.5 rounded-md text-xs font-medium " + badgePoste(e.poste)}>
                    {libPoste(e)}
                  </span>
                </td>
                <td className="p-3 text-xs text-[var(--color-ink-muted)]">{e.telephone || "—"}</td>
                <td className="p-3">
                  {e.user ? (
                    <div>
                      <p className="text-xs text-[var(--color-ink-muted)] truncate">{e.user.email}</p>
                      <p className="text-[10px] text-[var(--color-ink-faint)] mt-0.5">
                        {e.user.roles.map(roleLabel).join(", ")}
                      </p>
                    </div>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-neutral-100 text-neutral-600">
                      Aucun compte
                    </span>
                  )}
                </td>
                <td className="p-3 text-center tnum text-[var(--color-ink-muted)]">{e.nbAffectations}</td>
                <td className="p-3 text-center">
                  {e.actif ? (
                    <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-[var(--color-accent-soft)] text-[var(--color-accent)]">Actif</span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-neutral-100 text-neutral-600">Inactif</span>
                  )}
                </td>
                <td className="p-3 text-right">
                  <Link href={"/personnel/" + e.id} className="text-[var(--color-brand)] text-sm hover:underline">
                    Détail
                  </Link>
                </td>
              </tr>
            ))}
            {filtres.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-[var(--color-ink-muted)]">
                  Aucun employé ne correspond aux filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-2">
        {filtres.map((e) => (
          <Link
            key={e.id}
            href={"/personnel/" + e.id}
            className={"block bg-white rounded-xl border border-[var(--color-border)] p-4 " + (!e.actif ? "opacity-60" : "")}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{e.nom} {e.prenom}</p>
                {e.user ? (
                  <p className="text-xs text-[var(--color-ink-muted)] mt-0.5 truncate">{e.user.email}</p>
                ) : (
                  <p className="text-xs text-[var(--color-ink-faint)] mt-0.5 italic">Pas de compte</p>
                )}
              </div>
              <span className={"inline-flex px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap " + badgePoste(e.poste)}>
                {libPoste(e)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--color-ink-muted)]">
                {e.telephone || "Pas de téléphone"} · {e.nbAffectations} affectation(s)
              </span>
              {!e.actif && <span className="text-neutral-500">Inactif</span>}
            </div>
          </Link>
        ))}
        {filtres.length === 0 && (
          <p className="text-center text-[var(--color-ink-muted)] py-12">Aucun employé ne correspond aux filtres.</p>
        )}
      </div>
    </>
  );
}