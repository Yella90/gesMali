"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Search, X } from "lucide-react";
import { executer } from "@/lib/actions/resultat";
import { enregistrerPresences, type LignePresence } from "./actions";

type Eleve = { id: string; nom: string; matricule: string; sexe: string };
type Statut = LignePresence["statut"];

const BOUTONS: { statut: Statut; libelle: string; court: string; actif: string; icone: typeof Check }[] = [
  { statut: "PRESENT", libelle: "Présent", court: "P", actif: "bg-[var(--color-accent)] text-white border-[var(--color-accent)]", icone: Check },
  { statut: "ABSENT", libelle: "Absent", court: "A", actif: "bg-red-600 text-white border-red-600", icone: X },
  { statut: "RETARD", libelle: "Retard", court: "R", actif: "bg-amber-500 text-white border-amber-500", icone: Clock },
];

export function FeuillePresence({
  classeId,
  jour,
  eleves,
  initial,
  peutSaisir,
}: {
  classeId: string;
  jour: string;
  eleves: Eleve[];
  initial: Record<string, Omit<LignePresence, "eleveId">>;
  peutSaisir: boolean;
}) {
  const router = useRouter();
  const [lignes, setLignes] = useState<Record<string, Omit<LignePresence, "eleveId">>>(() =>
    Object.fromEntries(
      eleves.map((e) => [e.id, initial[e.id] ?? { statut: "PRESENT" as Statut, justifie: false, motif: "", dureeMinutes: null }])
    )
  );
  const [recherche, setRecherche] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const dejaFait = Object.keys(initial).length > 0;

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return q ? eleves.filter((e) => e.nom.toLowerCase().includes(q) || e.matricule.toLowerCase().includes(q)) : eleves;
  }, [eleves, recherche]);

  const compte = useMemo(() => {
    const c = { PRESENT: 0, ABSENT: 0, RETARD: 0 };
    for (const l of Object.values(lignes)) c[l.statut]++;
    return c;
  }, [lignes]);

  function changer(id: string, champ: Partial<Omit<LignePresence, "eleveId">>) {
    setLignes((p) => ({ ...p, [id]: { ...p[id], ...champ } }));
    setMessage(null);
  }

  function tousPresents() {
    setLignes(Object.fromEntries(eleves.map((e) => [e.id, { statut: "PRESENT" as Statut, justifie: false, motif: "", dureeMinutes: null }])));
    setMessage(null);
  }

  async function enregistrer() {
    setEnCours(true);
    setMessage(null);
    try {
      const r = await executer(
        enregistrerPresences(classeId, jour, eleves.map((e) => ({ eleveId: e.id, ...lignes[e.id] })))
      );
      setMessage({ ok: true, texte: "Appel enregistré : " + r.enregistres + " élève(s), " + r.absents + " absent(s), " + r.retards + " retard(s)." });
      router.refresh();
    } catch (e) {
      setMessage({ ok: false, texte: e instanceof Error ? e.message : "Enregistrement impossible" });
    } finally {
      setEnCours(false);
    }
  }

  if (eleves.length === 0) {
    return <p className="rounded-xl border border-[var(--color-border)] bg-white p-8 text-center text-sm text-[var(--color-ink-muted)]">Aucun élève inscrit dans cette classe.</p>;
  }

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] p-4">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-ink-faint)]" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un élève ou un matricule"
            aria-label="Rechercher un élève"
            className="h-9 w-full rounded-lg border border-[var(--color-border-strong)] bg-white pl-9 pr-3 text-sm"
          />
        </div>
        <p className="text-xs text-[var(--color-ink-muted)] tnum">
          <span className="font-semibold text-[var(--color-accent)]">{compte.PRESENT}</span> présent(s) ·{" "}
          <span className="font-semibold text-red-700">{compte.ABSENT}</span> absent(s) ·{" "}
          <span className="font-semibold text-amber-700">{compte.RETARD}</span> retard(s)
        </p>
        {peutSaisir && (
          <button type="button" onClick={tousPresents} className="h-9 rounded-lg border border-[var(--color-border-strong)] px-3 text-sm hover:bg-neutral-50">
            Tous présents
          </button>
        )}
      </div>

      {dejaFait && (
        <p className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs text-[var(--color-ink-muted)]">
          L&apos;appel de ce jour a déjà été fait : vous pouvez le corriger puis l&apos;enregistrer à nouveau.
        </p>
      )}

      <ul className="divide-y divide-[var(--color-border)]">
        {visibles.map((e) => {
          const l = lignes[e.id];
          return (
            <li key={e.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.nom}</p>
                  <p className="text-[11px] text-[var(--color-ink-faint)]">{e.matricule}</p>
                </div>
                <div className="flex gap-1.5" role="radiogroup" aria-label={"Statut de " + e.nom}>
                  {BOUTONS.map((b) => {
                    const actif = l.statut === b.statut;
                    const Icone = b.icone;
                    return (
                      <button
                        key={b.statut}
                        type="button"
                        role="radio"
                        aria-checked={actif}
                        disabled={!peutSaisir}
                        onClick={() =>
                          changer(e.id, b.statut === "PRESENT" ? { statut: b.statut, justifie: false, motif: "", dureeMinutes: null } : { statut: b.statut })
                        }
                        className={
                          "inline-flex h-9 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition disabled:cursor-not-allowed " +
                          (actif ? b.actif : "border-[var(--color-border-strong)] bg-white text-[var(--color-ink-muted)] hover:bg-neutral-50")
                        }
                      >
                        <Icone className="h-3.5 w-3.5" aria-hidden />
                        <span className="hidden sm:inline">{b.libelle}</span>
                        <span className="sm:hidden">{b.court}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {l.statut !== "PRESENT" && (
                <div className="mt-2 flex flex-wrap items-center gap-2 pl-0 sm:pl-2">
                  {l.statut === "RETARD" && (
                    <label className="flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)]">
                      Durée
                      <input
                        type="number"
                        min={1}
                        max={600}
                        value={l.dureeMinutes ?? ""}
                        disabled={!peutSaisir}
                        onChange={(ev) => changer(e.id, { dureeMinutes: ev.target.value ? Number(ev.target.value) : null })}
                        className="h-8 w-20 rounded-lg border border-[var(--color-border-strong)] px-2 text-sm"
                      />
                      min
                    </label>
                  )}
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={l.justifie} disabled={!peutSaisir} onChange={(ev) => changer(e.id, { justifie: ev.target.checked })} />
                    Justifié
                  </label>
                  <input
                    value={l.motif}
                    disabled={!peutSaisir}
                    onChange={(ev) => changer(e.id, { motif: ev.target.value })}
                    placeholder="Motif (maladie, transport…)"
                    aria-label={"Motif pour " + e.nom}
                    maxLength={200}
                    className="h-8 min-w-[12rem] flex-1 rounded-lg border border-[var(--color-border-strong)] px-2.5 text-sm"
                  />
                </div>
              )}
            </li>
          );
        })}
        {visibles.length === 0 && <li className="p-6 text-center text-sm text-[var(--color-ink-muted)]">Aucun élève ne correspond à la recherche.</li>}
      </ul>

      {peutSaisir && (
        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-[var(--color-border)] bg-white p-4">
          {message && <p className={"mr-auto text-sm " + (message.ok ? "text-[var(--color-accent)]" : "text-red-700")}>{message.texte}</p>}
          <button
            type="button"
            onClick={enregistrer}
            disabled={enCours}
            className="h-10 rounded-lg bg-[var(--color-brand)] px-5 text-sm font-medium text-white hover:bg-[var(--color-brand-dark)] disabled:opacity-60"
          >
            {enCours ? "Enregistrement…" : "Enregistrer l'appel"}
          </button>
        </div>
      )}
    </section>
  );
}
