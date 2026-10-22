"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileUp, Plus, Trash2 } from "lucide-react";
import { executer } from "@/lib/actions/resultat";
import { analyserCsv, MODELES, versLignes, type TypeImport } from "@/lib/reprise/modeles";
import { estFichierExcel, lireExcel, telechargerModeleExcel } from "@/lib/reprise/excel";
import { importerDonnees, type BilanImport } from "./actions";

const ETAPES: TypeImport[] = ["classes", "eleves", "notes"];
const champ = "h-8 w-full min-w-[7rem] rounded-md border border-[var(--color-border-strong)] bg-white px-2 text-xs";

export function Reprise({ effectifs }: { effectifs: Record<TypeImport, number> }) {
  const [type, setType] = useState<TypeImport>("classes");
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3" role="tablist">
        {ETAPES.map((t, i) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={type === t}
            onClick={() => setType(t)}
            className={
              "rounded-xl border p-3 text-left transition " +
              (type === t ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]" : "border-[var(--color-border)] bg-white hover:bg-neutral-50")
            }
          >
            <span className="text-xs text-[var(--color-ink-muted)]">Étape {i + 1}</span>
            <span className="block font-semibold">{MODELES[t].titre}</span>
            <span className="block text-xs text-[var(--color-ink-muted)]">{effectifs[t].toLocaleString("fr-FR")} déjà enregistré(e)s</span>
          </button>
        ))}
      </div>
      <Import key={type} type={type} />
    </div>
  );
}

function Import({ type }: { type: TypeImport }) {
  const router = useRouter();
  const modele = MODELES[type];
  const fichier = useRef<HTMLInputElement>(null);
  const [texte, setTexte] = useState("");
  const [lignes, setLignes] = useState<Record<string, string>[] | null>(null);
  const [alertes, setAlertes] = useState<string[]>([]);
  const [bilan, setBilan] = useState<BilanImport | null>(null);
  const [enCours, setEnCours] = useState<"verifier" | "importer" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  const statuts = useMemo(() => new Map(bilan?.resultats.map((r) => [r.ligne, r]) ?? []), [bilan]);
  const ligneVide = () => Object.fromEntries(modele.colonnes.map((c) => [c.cle, ""]));

  async function telechargerModele() {
    try {
      await telechargerModeleExcel(type);
    } catch {
      setMessage({ ok: false, texte: "Impossible de créer le modèle Excel, réessayez." });
    }
  }

  function lire(contenu: string) {
    lireTableau(analyserCsv(contenu));
  }

  function lireTableau(tableau: string[][]) {
    if (tableau.length < 2) {
      setMessage({ ok: false, texte: "Il faut une ligne d'en-tête puis au moins une ligne de données." });
      return;
    }
    const r = versLignes(type, tableau);
    const a: string[] = [];
    if (r.manquantes.length) a.push("Colonnes obligatoires absentes : " + r.manquantes.join(", ") + ".");
    if (r.inconnues.length) a.push("Colonnes non reconnues, ignorées : " + r.inconnues.join(", ") + ".");
    setAlertes(a);
    setLignes(r.lignes);
    setBilan(null);
    setMessage(null);
  }

  async function lireFichier(f: File | undefined) {
    if (!f) return;
    if (f.size > 5_000_000) {
      setMessage({ ok: false, texte: "Fichier trop volumineux (5 Mo maximum)." });
      return;
    }
    try {
      if (estFichierExcel(f)) lireTableau(await lireExcel(f));
      else if (/\.xls$/i.test(f.name)) {
        setMessage({ ok: false, texte: "Ancien format Excel (.xls) : enregistrez le fichier au format .xlsx (Fichier > Enregistrer sous) puis réessayez." });
      } else lire(await f.text());
    } catch {
      setMessage({ ok: false, texte: "Fichier illisible : utilisez le modèle Excel (.xlsx) ou un fichier CSV." });
    }
    if (fichier.current) fichier.current.value = "";
  }

  function modifier(i: number, cle: string, v: string) {
    setLignes((p) => p && p.map((l, j) => (j === i ? { ...l, [cle]: v } : l)));
    setBilan(null);
  }

  async function lancer(ecrire: boolean) {
    if (!lignes?.length) return;
    setEnCours(ecrire ? "importer" : "verifier");
    setMessage(null);
    try {
      const b = await executer(importerDonnees(type, lignes, ecrire));
      setBilan(b);
      if (b.ecrit) {
        setMessage({ ok: true, texte: b.aCreer + " ligne(s) enregistrée(s)" + (b.ignores ? ", " + b.ignores + " ignorée(s) car déjà présentes" : "") + "." });
        setLignes(null);
        setTexte("");
        setBilan(null);
        router.refresh();
      } else if (b.erreurs > 0) {
        setMessage({ ok: false, texte: b.erreurs + " ligne(s) en erreur : corrigez-les dans le tableau puis vérifiez à nouveau. Rien n'a été enregistré." });
      } else if (b.aCreer === 0) {
        setMessage({ ok: true, texte: "Tout est déjà enregistré : aucune ligne nouvelle." });
      } else {
        setMessage({ ok: true, texte: "Vérification réussie : " + b.aCreer + " ligne(s) prête(s) à être enregistrée(s)" + (b.ignores ? ", " + b.ignores + " déjà présente(s)" : "") + "." });
      }
    } catch (e) {
      setMessage({ ok: false, texte: e instanceof Error ? e.message : "Opération impossible" });
    } finally {
      setEnCours(null);
    }
  }

  const pret = !!bilan && !bilan.ecrit && bilan.erreurs === 0 && bilan.aCreer > 0;

  return (
    <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="font-semibold">{modele.titre}</h2>
          <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">{modele.description}</p>
        </div>
        <button type="button" onClick={telechargerModele} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border-strong)] px-3 text-sm hover:bg-neutral-50">
          <Download className="h-4 w-4" aria-hidden /> Modèle Excel
        </button>
      </div>

      <details className="rounded-lg border border-[var(--color-border)] text-sm">
        <summary className="cursor-pointer px-3 py-2 font-medium">Colonnes attendues</summary>
        <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
          {modele.colonnes.map((c) => (
            <li key={c.cle} className="flex flex-wrap gap-x-3 px-3 py-1.5">
              <code className="w-40 shrink-0 text-xs font-semibold">{c.titre}{c.obligatoire ? " *" : ""}</code>
              <span className="text-xs text-[var(--color-ink-muted)]">{c.aide}</span>
            </li>
          ))}
        </ul>
      </details>

      {!lignes && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-lg border border-dashed border-[var(--color-border-strong)] p-4">
            <p className="text-sm font-medium">Depuis un fichier Excel</p>
            <p className="text-xs text-[var(--color-ink-muted)]">Fichier .xlsx rempli à partir du modèle (la première feuille est lue). Un fichier CSV est aussi accepté.</p>
            <label className="mt-auto inline-flex h-9 w-fit cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--color-brand)] px-3 text-sm text-white hover:bg-[var(--color-brand-dark)]">
              <FileUp className="h-4 w-4" aria-hidden /> Choisir un fichier
              <input ref={fichier} type="file" accept=".xlsx,.xls,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain" className="sr-only" onChange={(e) => lireFichier(e.target.files?.[0])} />
            </label>
          </div>
          <div className="flex flex-col gap-2 rounded-lg border border-dashed border-[var(--color-border-strong)] p-4">
            <p className="text-sm font-medium">Coller ou saisir</p>
            <textarea
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              rows={4}
              placeholder={"Collez ici les cellules copiées depuis Excel, en-tête compris :\n" + modele.colonnes.map((c) => c.titre).join("  ")}
              className="w-full rounded-lg border border-[var(--color-border-strong)] p-2 font-mono text-xs"
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!texte.trim()} onClick={() => lire(texte)} className="h-9 rounded-lg bg-[var(--color-brand)] px-3 text-sm text-white disabled:opacity-50">
                Lire les lignes
              </button>
              <button type="button" onClick={() => { setLignes([ligneVide()]); setAlertes([]); setMessage(null); }} className="h-9 rounded-lg border border-[var(--color-border-strong)] px-3 text-sm hover:bg-neutral-50">
                Saisie manuelle
              </button>
            </div>
          </div>
        </div>
      )}

      {alertes.map((a) => (
        <p key={a} className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{a}</p>
      ))}

      {lignes && (
        <>
          <div className="relative overflow-x-auto rounded-lg border border-[var(--color-border)]">
            <table className="w-full text-xs">
              <thead className="bg-[var(--color-surface)] text-left text-[var(--color-ink-muted)]">
                <tr>
                  <th className="px-2 py-2 font-medium">#</th>
                  {modele.colonnes.map((c) => (
                    <th key={c.cle} className="whitespace-nowrap px-2 py-2 font-medium">{c.titre}{c.obligatoire ? " *" : ""}</th>
                  ))}
                  <th className="min-w-[14rem] px-2 py-2 font-medium">Vérification</th>
                  <th className="px-2 py-2"><span className="sr-only">Supprimer</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {lignes.map((l, i) => {
                  const r = statuts.get(i + 1);
                  return (
                    <tr key={i} className={r?.statut === "erreur" ? "bg-red-50" : r?.statut === "ignore" ? "bg-neutral-50" : ""}>
                      <td className="px-2 py-1 text-[var(--color-ink-faint)] tnum">{i + 1}</td>
                      {modele.colonnes.map((c) => (
                        <td key={c.cle} className="px-1 py-1">
                          <input value={l[c.cle] ?? ""} onChange={(e) => modifier(i, c.cle, e.target.value)} aria-label={c.titre + " ligne " + (i + 1)} className={champ} />
                        </td>
                      ))}
                      <td className={"px-2 py-1 " + (r?.statut === "erreur" ? "text-red-700" : r?.statut === "ignore" ? "text-[var(--color-ink-muted)]" : "text-[var(--color-accent)]")}>
                        {r ? (r.statut === "ignore" ? "Ignorée : " : r.statut === "ok" ? "✓ " : "") + r.message : ""}
                      </td>
                      <td className="px-1 py-1">
                        <button
                          type="button"
                          onClick={() => { setLignes((p) => p && p.filter((_, j) => j !== i)); setBilan(null); }}
                          className="rounded p-1.5 text-[var(--color-ink-muted)] hover:bg-red-50 hover:text-red-700"
                          aria-label={"Supprimer la ligne " + (i + 1)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => { setLignes((p) => [...(p ?? []), ligneVide()]); setBilan(null); }} className="inline-flex h-9 items-center gap-1 rounded-lg border border-[var(--color-border-strong)] px-3 text-sm hover:bg-neutral-50">
              <Plus className="h-4 w-4" aria-hidden /> Ajouter une ligne
            </button>
            <button type="button" onClick={() => { setLignes(null); setBilan(null); setAlertes([]); setMessage(null); }} className="h-9 rounded-lg px-3 text-sm text-[var(--color-ink-muted)] hover:bg-neutral-50">
              Tout effacer
            </button>
            <span className="ml-auto text-xs text-[var(--color-ink-muted)]">{lignes.length} ligne(s)</span>
            <button type="button" disabled={!!enCours || lignes.length === 0} onClick={() => lancer(false)} className="h-10 rounded-lg border border-[var(--color-brand)] px-4 text-sm font-medium text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] disabled:opacity-50">
              {enCours === "verifier" ? "Vérification…" : "Vérifier"}
            </button>
            <button type="button" disabled={!pret || !!enCours} onClick={() => lancer(true)} className="h-10 rounded-lg bg-[var(--color-brand)] px-4 text-sm font-medium text-white hover:bg-[var(--color-brand-dark)] disabled:opacity-50">
              {enCours === "importer" ? "Enregistrement…" : "Enregistrer" + (pret ? " " + bilan!.aCreer + " ligne(s)" : "")}
            </button>
          </div>
        </>
      )}

      {message && (
        <p className={"rounded-lg px-3 py-2 text-sm " + (message.ok ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]" : "bg-red-50 text-red-700")}>{message.texte}</p>
      )}
    </section>
  );
}
