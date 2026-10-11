"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cloturerTrimestre } from "../actions";
import { Button } from "@/components/ui/button";

export function ActionsTrimestre({
  trimestreId,
  cloture,
  nbNotes,
  nbBulletins,
}: {
  trimestreId: string;
  cloture: boolean;
  nbNotes: number;
  nbBulletins: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false);

  async function handleCloturer() {
    setLoading(true);
    setErreur(null);
    try {
      await cloturerTrimestre(trimestreId);
      router.refresh();
    } catch (e: any) {
      setErreur(e.message);
    } finally {
      setLoading(false);
      setConfirmation(false);
    }
  }

  if (cloture) {
    return (
      <div className="bg-[var(--color-brand-soft)] rounded-xl border border-[var(--color-brand)]/30 p-5">
        <p className="text-sm text-[var(--color-brand)]">
          <strong>Trimestre cloturé.</strong> Les notes sont verrouillées. Seul le directeur peut déverrouiller.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 space-y-4">
      <div>
        <h2 className="font-semibold">Cloturer le trimestre</h2>
        <p className="text-sm text-[var(--color-ink-muted)] mt-1">
          Verrouille définitivement toutes les notes du trimestre. Les bulletins devront étre régénérés si nécessaire.
        </p>
      </div>

      {!confirmation ? (
        <Button onClick={() => setConfirmation(true)} variant="danger">
          Cloturer le trimestre
        </Button>
      ) : (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
          <p className="text-sm font-medium text-red-900">Confirmer la clôture ?</p>
          <p className="text-xs text-red-800">
            {nbNotes} note(s) seront verrouillées. Cette action est irréversible sans intervention manuelle.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleCloturer} disabled={loading} variant="danger">
              {loading ? "Clôture..." : "Confirmer"}
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
    </div>
  );
}