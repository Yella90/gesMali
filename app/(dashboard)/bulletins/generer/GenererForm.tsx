"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { genererBulletinsClasse } from "../actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function GenererForm({
  classes,
  trimestres,
  existants,
}: {
  classes: { id: string; label: string; effectif: number }[];
  trimestres: { id: string; label: string }[];
  existants: Record<string, number>;
}) {
  const router = useRouter();
  const [classeId, setClasseId] = useState("");
  const [trimestreId, setTrimestreId] = useState("");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false);

  const classeSelectionnee = classes.find((c) => c.id === classeId);
  const cle = classeId && trimestreId ? classeId + ":" + trimestreId : "";
  const existantCount = cle ? existants[cle] ?? 0 : 0;
  const pret = classeId && trimestreId;

  async function generer() {
    if (!pret) return;
    setLoading(true);
    setErreur(null);
    try {
      const res = await genererBulletinsClasse(classeId, trimestreId);
      router.push("/bulletins/classe/" + classeId + "/trimestre/" + trimestreId);
    } catch (e: any) {
      setErreur(e.message);
      setLoading(false);
      setConfirmation(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pret) return;
    if (existantCount > 0) {
      setConfirmation(true);
    } else {
      generer();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[var(--color-border)] p-5 md:p-6 space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="classeId">Classe</Label>
          <select
            id="classeId"
            value={classeId}
            onChange={(e) => { setClasseId(e.target.value); setConfirmation(false); }}
            required
            className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
          >
            <option value="">-- Choisir une classe --</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id} disabled={c.effectif === 0}>
                {c.label} ({c.effectif} éléve{c.effectif > 1 ? "s" : ""}){c.effectif === 0 ? " - vide" : ""}
              </option>
            ))}
          </select>
          {classeSelectionnee && classeSelectionnee.effectif === 0 && (
            <p className="text-xs text-red-600">Cette classe n'a aucun éléve inscrit.</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="trimestreId">Trimestre</Label>
          <select
            id="trimestreId"
            value={trimestreId}
            onChange={(e) => { setTrimestreId(e.target.value); setConfirmation(false); }}
            required
            className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
          >
            <option value="">-- Choisir un trimestre --</option>
            {trimestres.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Apercu de ce qui va se passer */}
      {pret && (
        <div className="rounded-lg bg-[var(--color-surface)] p-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
            Résumé
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-[var(--color-ink-muted)]">Classe</p>
              <p className="font-medium mt-0.5 truncate">{classeSelectionnee?.label.split(" · ")[0]}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-ink-muted)]">éléves</p>
              <p className="font-medium mt-0.5 tnum">{classeSelectionnee?.effectif ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-ink-muted)]">Bulletins existants</p>
              <p className={"font-medium mt-0.5 tnum " + (existantCount > 0 ? "text-amber-700" : "text-[var(--color-accent)]")}>
                {existantCount > 0 ? existantCount + " (seront écrasés)" : "Aucun"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation suppression */}
      {confirmation && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3">
          <p className="text-sm font-medium text-amber-900">
            écraser les {existantCount} bulletins existants ?
          </p>
          <p className="text-xs text-amber-800">
            Les bulletins actuels pour cette classe et ce trimestre seront supprimés et remplacés par une nouvelle version.
          </p>
          <div className="flex gap-2">
            <Button type="button" onClick={generer} disabled={loading}>
              {loading ? "Génération..." : "Confirmer et générer"}
            </Button>
            <button
              type="button"
              onClick={() => setConfirmation(false)}
              className="h-10 px-4 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm hover:bg-neutral-50"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {erreur && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erreur}</div>
      )}

      {!confirmation && (
        <div className="flex gap-3">
          <Button type="submit" size="lg" disabled={loading || !pret}>
            {loading ? "Génération..." : "Générer les bulletins"}
          </Button>
          <button
            type="button"
            onClick={() => router.push("/bulletins")}
            className="h-11 px-5 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm hover:bg-neutral-50"
          >
            Annuler
          </button>
        </div>
      )}
    </form>
  );
}