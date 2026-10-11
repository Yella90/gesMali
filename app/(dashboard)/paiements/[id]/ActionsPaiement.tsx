"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { annulerPaiement } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ActionsPaiement({ paiementId }: { paiementId: string }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    const fd = new FormData(e.currentTarget);
    try {
      await annulerPaiement(paiementId, fd.get("motif") as string);
      setOuvert(false);
      router.refresh();
    } catch (e: any) {
      setErreur(e.message);
      setLoading(false);
    }
  }

  if (!ouvert) {
    return (
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <h2 className="font-semibold mb-3">Actions</h2>
        <button
          onClick={() => setOuvert(true)}
          className="h-10 px-4 rounded-lg border border-red-200 bg-white text-red-700 text-sm hover:bg-red-50"
        >
          Annuler ce paiement
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-xl border border-red-200 p-5 space-y-4">
      <h2 className="font-semibold text-red-900">Annuler le paiement</h2>
      <p className="text-sm text-red-800">
        Cette action marque le paiement comme annulé. Il restera visible dans l'historique avec le motif.
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="motif">Motif d'annulation</Label>
        <Input id="motif" name="motif" placeholder="Ex : Erreur de saisie, doublon..." required minLength={3} />
      </div>

      {erreur && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erreur}</div>
      )}

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => { setOuvert(false); setErreur(null); }}
          className="h-10 px-4 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm hover:bg-neutral-50"
        >
          Retour
        </button>
        <Button type="submit" variant="danger" disabled={loading}>
          {loading ? "Annulation..." : "Confirmer l'annulation"}
        </Button>
      </div>
    </form>
  );
}