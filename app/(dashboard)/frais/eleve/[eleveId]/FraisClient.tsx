"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { encaisserPaiement as encaisserPaiementAction, genererFraisEleve as genererFraisEleveAction } from "../../actions";
import { relever } from "@/lib/actions/resultat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const encaisserPaiement = relever(encaisserPaiementAction);
const genererFraisEleve = relever(genererFraisEleveAction);

export function GenererFrais({ eleveId }: { eleveId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function handleGenerer() {
    setLoading(true);
    setErreur(null);
    try {
      await genererFraisEleve(eleveId);
      router.refresh();
    } catch (e: any) {
      setErreur(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button onClick={handleGenerer} disabled={loading} size="lg">
        {loading ? "Génération..." : "Générer les frais depuis la classe"}
      </Button>
      {erreur && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {erreur}
        </div>
      )}
    </div>
  );
}

export function EncaisserPaiement({
  trancheId,
  trancheLibelle,
  reste,
}: {
  trancheId: string;
  trancheLibelle: string;
  reste: number;
}) {
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
      const res = await encaisserPaiement({
        trancheId,
        montant: Number(fd.get("montant")),
        mode: fd.get("mode") as any,
        reference: (fd.get("reference") as string) || undefined,
        datePaiement: (fd.get("datePaiement") as string) || undefined,
      });
      setOuvert(false);
      router.refresh();
      if (res.id) window.open("/api/frais/recu/" + res.id + "/pdf", "_blank");
    } catch (e: any) {
      setErreur(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="inline-flex items-center h-8 px-3 rounded-lg bg-[var(--color-brand)] text-white text-xs font-medium hover:bg-[var(--color-brand-dark)]"
      >
        Encaisser
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <form onSubmit={onSubmit} className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Encaisser</h3>
            <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{trancheLibelle}</p>
          </div>
          <button
            type="button"
            onClick={() => setOuvert(false)}
            className="p-2 -mr-2 rounded-lg hover:bg-neutral-100"
            aria-label="Fermer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="rounded-lg bg-[var(--color-brand-soft)] p-3">
          <p className="text-xs text-[var(--color-brand)] uppercase tracking-wide font-medium">Reste à payer</p>
          <p className="text-xl font-semibold tnum text-[var(--color-brand)] mt-1">
            {reste.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} F CFA
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="montant">Montant reçu (F CFA)</Label>
          <Input id="montant" name="montant" type="number" min={0} step={100} defaultValue={reste} required inputMode="decimal" className="tnum" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mode">Mode de paiement</Label>
          <select
            id="mode" name="mode" required
            className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
          >
            <option value="ESPECES">Espèces</option>
            <option value="VIREMENT">Virement</option>
            <option value="MOBILE_MONEY">Mobile Money</option>
            <option value="CHEQUE">Chèque</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="reference">Référence</Label>
            <Input id="reference" name="reference" placeholder="Optionnel" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="datePaiement">Date</Label>
            <Input id="datePaiement" name="datePaiement" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
        </div>

        {erreur && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erreur}</div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={() => setOuvert(false)}
            className="h-10 px-4 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm hover:bg-neutral-50"
          >
            Annuler
          </button>
          <Button type="submit" disabled={loading}>
            {loading ? "Encaissement..." : "Valider et imprimer le reçu"}
          </Button>
        </div>
      </form>
    </div>
  );
}