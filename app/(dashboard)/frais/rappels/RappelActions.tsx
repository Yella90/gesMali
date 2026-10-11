"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { genererRappels } from "../actions";

export function RappelActions({
  periodesImpayees,
  nbEnAttente,
  statutFiltre,
}: {
  periodesImpayees: { periode: string; libelle: string }[];
  nbEnAttente: number;
  statutFiltre?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [periode, setPeriode] = useState("");

  async function handleGenerer(p?: string) {
    setLoading(true);
    setMessage(null);
    setErreur(null);
    try {
      const res = await genererRappels(p);
      setMessage(res.crees + " rappel(s) créé(s), " + res.ignores + " ignoré(s)");
      router.refresh();
    } catch (e: any) {
      setErreur(e.message);
    } finally {
      setLoading(false);
    }
  }

  const urlExport = "/api/frais/rappels/pdf" + (statutFiltre ? "?statut=" + statutFiltre : "");

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 space-y-4">
      <div>
        <h2 className="font-semibold">Générer les rappels</h2>
        <p className="text-sm text-[var(--color-ink-muted)] mt-1">
          Créé un rappel pour chaque échéance impayée (sans doublon).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleGenerer()}
          disabled={loading}
          className="inline-flex items-center h-10 px-5 rounded-lg bg-[var(--color-brand)] text-white text-sm font-medium hover:bg-[var(--color-brand-dark)] disabled:opacity-50"
        >
          {loading ? "Génération..." : "Générer TOUS les rappels impayés"}
        </button>

        <a
          href={urlExport}
          target="_blank"
          className="inline-flex items-center h-10 px-5 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm font-medium hover:bg-neutral-50"
        >
          Exporter la liste en PDF
        </a>
      </div>

      {periodesImpayees.length > 0 && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--color-border)]" />
            <span className="text-xs text-[var(--color-ink-muted)]">OU par mois</span>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              className="h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
            >
              <option value="">Choisir un mois...</option>
              {periodesImpayees.map((p) => (
                <option key={p.periode} value={p.periode}>{p.libelle}</option>
              ))}
            </select>
            <button
              onClick={() => handleGenerer(periode)}
              disabled={loading || !periode}
              className="h-10 px-4 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm hover:bg-neutral-50 disabled:opacity-50"
            >
              Générer pour ce mois
            </button>
          </div>
        </>
      )}

      {message && (
        <div className="rounded-lg border border-[var(--color-accent-soft)] bg-[var(--color-accent-soft)] px-3 py-2 text-sm text-[var(--color-accent)]">
          {message}
        </div>
      )}
      {erreur && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erreur}</div>
      )}
    </div>
  );
}