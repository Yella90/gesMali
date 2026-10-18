"use client";

import { useState, useEffect, useMemo } from "react";
import { chargerElevesEtNotes, enregistrerNotes } from "./actions";

type ClasseOption = { id: string; label: string; cycle: string };
type MatiereOption = { id: string; nom: string; cycle: string };
type TrimestreOption = { id: string; label: string; cloture: boolean };

type Ligne = {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  note: {
    id: string;
    valeur: number | null;
    statut: string;
    saisieParId: string;
  } | null;
};

function normaliser(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function statutBadge(statut: string) {
  switch (statut) {
    case "BROUILLON": return { bg: "bg-neutral-100", fg: "text-neutral-700", label: "Brouillon" };
    case "SOUMISE": return { bg: "bg-amber-50", fg: "text-amber-800", label: "Soumise" };
    case "VALIDEE": return { bg: "bg-[var(--color-accent-soft)]", fg: "text-[var(--color-accent)]", label: "Validée" };
    case "VERROUILLEE": return { bg: "bg-[var(--color-brand-soft)]", fg: "text-[var(--color-brand)]", label: "Verrouillée" };
    default: return { bg: "bg-neutral-100", fg: "text-neutral-500", label: "—" };
  }
}

export function SaisieNotes({
  classes,
  matieres,
  trimestres,
  modeSaisie,
}: {
  classes: ClasseOption[];
  matieres: MatiereOption[];
  trimestres: TrimestreOption[];
  modeSaisie: string;
}) {
  const [classeId, setClasseId] = useState("");
  const [matiereId, setMatiereId] = useState("");
  const [trimestreId, setTrimestreId] = useState("");
  const [type, setType] = useState<"DEVOIR" | "COMPOSITION">("DEVOIR");
  const [numero, setNumero] = useState(1);

  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [chargement, setChargement] = useState(false);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  // Recherche eleve (locale)
  const [recherche, setRecherche] = useState("");

  const classeSelectionnee = classes.find((c) => c.id === classeId);
  const matieresFiltrees = classeSelectionnee
    ? matieres.filter((m) => m.cycle === classeSelectionnee.cycle)
    : matieres;
  const trimestreSelectionne = trimestres.find((t) => t.id === trimestreId);
  const trimestreFerme = trimestreSelectionne?.cloture ?? false;
  const pret = !!(classeId && matiereId && trimestreId);

  // Changer de classe : la matiere choisie doit rester du meme cycle
  function choisirClasse(id: string) {
    setClasseId(id);
    setRecherche("");
    const nouvelle = classes.find((c) => c.id === id);
    const m = matieres.find((x) => x.id === matiereId);
    if (nouvelle && m && m.cycle !== nouvelle.cycle) setMatiereId("");
  }

  useEffect(() => {
    if (!pret) return;
    // Une reponse arrivee apres un changement de selection est ignoree
    let annule = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- indicateur de chargement de la requete lancee ici
    setChargement(true);
    setErreur(null);
    setMessage(null);

    chargerElevesEtNotes({ classeId, matiereId, trimestreId, type, numero })
      .then((data) => {
        if (annule) return;
        setLignes(data);
        const v: Record<string, string> = {};
        for (const e of data) v[e.id] = e.note?.valeur != null ? String(e.note.valeur) : "";
        setValeurs(v);
      })
      .catch((err: unknown) => { if (!annule) setErreur(err instanceof Error ? err.message : "Erreur"); })
      .finally(() => { if (!annule) setChargement(false); });
    return () => { annule = true; };
  }, [pret, classeId, matiereId, trimestreId, type, numero]);

  // Filtrage local des eleves (instantane)
  const lignesFiltrees = useMemo(() => {
    const q = normaliser(recherche.trim());
    if (!q) return lignes;
    return lignes.filter((l) =>
      normaliser(l.nom + " " + l.prenom + " " + l.matricule).includes(q)
    );
  }, [lignes, recherche]);

  async function handleEnregistrer() {
    if (!pret) return;
    setSauvegarde(true);
    setErreur(null);
    setMessage(null);

    // On enregistre TOUS les eleves (meme ceux non affiches par le filtre)
    const notes = Object.entries(valeurs)
      .filter(([, v]) => v !== "")
      .map(([eleveId, v]) => ({ eleveId, valeur: parseFloat(v) }))
      .filter((n) => !isNaN(n.valeur) && n.valeur >= 0 && n.valeur <= 20);

    if (notes.length === 0) {
      setErreur("Aucune note à enregistrer");
      setSauvegarde(false);
      return;
    }

    try {
      const res = await enregistrerNotes({ classeId, matiereId, trimestreId, type, numero, notes });
      setMessage(
        res.crees + " créé(s), " + res.modifies + " modifié(s), " + res.ignores + " ignoré(s)"
      );
      const data = await chargerElevesEtNotes({ classeId, matiereId, trimestreId, type, numero });
      setLignes(data);
      const v: Record<string, string> = {};
      for (const e of data) v[e.id] = e.note?.valeur != null ? String(e.note.valeur) : "";
      setValeurs(v);
    } catch (err: any) {
      setErreur(err.message);
    } finally {
      setSauvegarde(false);
    }
  }

  const totalSaisies = lignes.filter((l) => valeurs[l.id] !== "").length;

  return (
    <div className="space-y-4">
      {/* Filtres principaux */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 md:p-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--color-ink-muted)]">Classe</label>
            <select
              value={classeId}
              onChange={(e) => choisirClasse(e.target.value)}
              className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
            >
              <option value="">-- Choisir --</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--color-ink-muted)]">Matière</label>
            <select
              value={matiereId}
              onChange={(e) => setMatiereId(e.target.value)}
              className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
            >
              <option value="">-- Choisir --</option>
              {matieresFiltrees.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--color-ink-muted)]">Trimestre</label>
            <select
              value={trimestreId}
              onChange={(e) => setTrimestreId(e.target.value)}
              className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
            >
              <option value="">-- Choisir --</option>
              {trimestres.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}{t.cloture ? " · cloturé" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--color-ink-muted)]">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
            >
              <option value="DEVOIR">Devoir</option>
              <option value="COMPOSITION">Composition</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--color-ink-muted)]">Numéro</label>
            <input
              type="number"
              min={1}
              max={5}
              value={numero}
              onChange={(e) => setNumero(parseInt(e.target.value) || 1)}
              className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm tnum"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--color-ink-muted)]">
          <span>Mode : <strong className="text-[var(--color-ink)]">{modeSaisie}</strong></span>
          {pret && !chargement && (
            <span>
              · {lignes.length} élève(s) · {totalSaisies} note(s) saisie(s)
            </span>
          )}
        </div>
      </div>

      {trimestreFerme && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Ce trimestre est cloturé. Seul le directeur peut le déverrouiller.
        </div>
      )}

      {erreur && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {erreur}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-[var(--color-accent-soft)] bg-[var(--color-accent-soft)] px-3 py-2 text-sm text-[var(--color-accent)]">
          {message}
        </div>
      )}

      {/* Recherche eleve */}
      {pret && !chargement && lignes.length > 5 && (
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
          {recherche && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2 text-xs text-[var(--color-ink-muted)] pointer-events-none">
              {lignesFiltrees.length} / {lignes.length}
            </div>
          )}
        </div>
      )}

      {/* Tableau desktop */}
      {pret && !chargement && lignes.length > 0 && (
        <>
          <div className="hidden md:block bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left p-3 font-medium text-[var(--color-ink-muted)] w-12">#</th>
                  <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Matricule</th>
                  <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Nom</th>
                  <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Prénom</th>
                  <th className="text-left p-3 font-medium text-[var(--color-ink-muted)] w-32">Note / 20</th>
                  <th className="text-left p-3 font-medium text-[var(--color-ink-muted)] w-32">Statut</th>
                </tr>
              </thead>
              <tbody>
                {lignesFiltrees.map((l, i) => {
                  const verrouille = l.note?.statut === "VERROUILLEE";
                  const disabled = trimestreFerme || verrouille;
                  const badge = statutBadge(l.note?.statut ?? "");
                  return (
                    <tr key={l.id} className="border-t border-[var(--color-border)] hover:bg-neutral-50/60">
                      <td className="p-3 text-[var(--color-ink-faint)] tnum">{i + 1}</td>
                      <td className="p-3 font-mono text-xs text-[var(--color-ink-muted)]">{l.matricule}</td>
                      <td className="p-3">{l.nom}</td>
                      <td className="p-3">{l.prenom}</td>
                      <td className="p-3">
                        <input
                          type="number"
                          min={0}
                          max={20}
                          step={0.25}
                          inputMode="decimal"
                          value={valeurs[l.id] ?? ""}
                          onChange={(e) => setValeurs({ ...valeurs, [l.id]: e.target.value })}
                          disabled={disabled}
                          className={
                            "w-full h-9 rounded-lg border border-[var(--color-border-strong)] px-2 text-sm tnum text-center " +
                            (disabled ? "bg-neutral-100" : "bg-white focus:ring-2 focus:ring-[var(--color-brand)] focus:outline-none")
                          }
                        />
                      </td>
                      <td className="p-3">
                        {l.note ? (
                          <span className={"inline-flex items-center px-2 py-0.5 rounded-md text-xs " + badge.bg + " " + badge.fg}>
                            {badge.label}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--color-ink-faint)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {lignesFiltrees.length === 0 && (
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
            {lignesFiltrees.map((l, i) => {
              const verrouille = l.note?.statut === "VERROUILLEE";
              const disabled = trimestreFerme || verrouille;
              const badge = statutBadge(l.note?.statut ?? "");
              return (
                <div key={l.id} className="bg-white rounded-xl border border-[var(--color-border)] p-3">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        <span className="text-[var(--color-ink-faint)] mr-1">{i + 1}.</span>
                        {l.nom} {l.prenom}
                      </p>
                      <p className="text-xs text-[var(--color-ink-muted)] font-mono mt-0.5">{l.matricule}</p>
                    </div>
                    {l.note && (
                      <span className={"inline-flex items-center px-2 py-0.5 rounded-md text-xs whitespace-nowrap " + badge.bg + " " + badge.fg}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.25}
                    inputMode="decimal"
                    value={valeurs[l.id] ?? ""}
                    onChange={(e) => setValeurs({ ...valeurs, [l.id]: e.target.value })}
                    disabled={disabled}
                    placeholder="Note / 20"
                    className={
                      "w-full h-11 rounded-lg border border-[var(--color-border-strong)] px-3 text-base tnum text-center " +
                      (disabled ? "bg-neutral-100" : "bg-white focus:ring-2 focus:ring-[var(--color-brand)] focus:outline-none")
                    }
                  />
                </div>
              );
            })}
            {lignesFiltrees.length === 0 && (
              <p className="text-center text-[var(--color-ink-muted)] py-12">
                Aucun élève ne correspond à la recherche.
              </p>
            )}
          </div>

          {/* Barre d'enregistrement */}
          <div className="sticky bottom-20 md:bottom-0 z-20 bg-white/95 backdrop-blur rounded-xl border border-[var(--color-border)] p-3 md:p-4 flex items-center justify-between gap-3">
            <div className="text-sm text-[var(--color-ink-muted)]">
              <span className="hidden md:inline">
                {totalSaisies} note(s) préte(s) à enregistrer
                {recherche && " · " + lignesFiltrees.length + " affiché(s)"}
              </span>
              <span className="md:hidden">{totalSaisies} note(s)</span>
            </div>
            <button
              onClick={handleEnregistrer}
              disabled={sauvegarde || trimestreFerme || totalSaisies === 0}
              className="inline-flex items-center h-10 px-5 rounded-lg bg-[var(--color-brand)] text-white text-sm font-medium hover:bg-[var(--color-brand-dark)] disabled:opacity-50"
            >
              {sauvegarde ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </>
      )}

      {pret && chargement && (
        <p className="text-center py-12 text-[var(--color-ink-muted)]">Chargement...</p>
      )}

      {!pret && (
        <div className="bg-white rounded-xl border border-dashed border-[var(--color-border-strong)] py-16 text-center">
          <p className="text-sm text-[var(--color-ink-muted)]">
            Sélectionnez une classe, une matière et un trimestre.
          </p>
        </div>
      )}
    </div>
  );
}