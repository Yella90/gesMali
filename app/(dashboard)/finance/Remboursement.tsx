"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { rembourserPret as rembourserPretAction } from "../tresorerie/actions";
import { relever } from "@/lib/actions/resultat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const rembourserPret = relever(rembourserPretAction);

const champ = "w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm";
const CAISSES = [
  { valeur: "ESPECES", libelle: "Espèces" },
  { valeur: "BANQUE", libelle: "Banque" },
  { valeur: "MOBILE_MONEY", libelle: "Mobile Money" },
];

// Remboursement d'un pret : montant propose = ce qui est du a ce jour (ou la prochaine echeance)
export function FormulaireRemboursement({
  pretId,
  preteur,
  montantPropose,
  resteDu,
  estDirecteur,
}: {
  pretId: string;
  preteur: string;
  montantPropose: number;
  resteDu: number;
  estDirecteur: boolean;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setEnCours(true);
    setErreur(null);
    try {
      await rembourserPret(new FormData(form));
      ref.current?.close();
      form.reset();
      router.refresh();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErreur(null);
          ref.current?.showModal();
        }}
        className="inline-flex h-9 items-center rounded-lg bg-[var(--color-brand)] px-3 text-sm font-medium text-white hover:bg-[var(--color-brand-dark)]"
      >
        Rembourser
      </button>
      <dialog
        ref={ref}
        aria-labelledby={"titre-remb-" + pretId}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 text-[var(--color-ink)] shadow-[0_30px_80px_-20px_rgba(4,14,30,0.5)] backdrop:bg-[#0B1D33]/60"
      >
        <form onSubmit={onSubmit} className="space-y-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={"titre-remb-" + pretId} className="text-lg font-semibold">Remboursement</h2>
              <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                Prêt de {preteur} · reste dû {resteDu.toLocaleString("fr-FR")} F. L&apos;argent sort de la caisse choisie.
              </p>
            </div>
            <button type="button" aria-label="Fermer" onClick={() => ref.current?.close()} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <input type="hidden" name="pretId" value={pretId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={"remb-montant-" + pretId}>Montant (F CFA)</Label>
              <Input
                id={"remb-montant-" + pretId} name="montant" type="number" min={1} max={Math.ceil(resteDu)} step={1} required
                inputMode="numeric" className="tnum" defaultValue={Math.round(montantPropose) || undefined}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={"remb-caisse-" + pretId}>Caisse</Label>
              <select id={"remb-caisse-" + pretId} name="caisse" className={champ} defaultValue="BANQUE">
                {CAISSES.map((c) => <option key={c.valeur} value={c.valeur}>{c.libelle}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={"remb-date-" + pretId}>Date</Label>
              <Input id={"remb-date-" + pretId} name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={"remb-ref-" + pretId}>Référence (facultatif)</Label>
              <Input id={"remb-ref-" + pretId} name="reference" placeholder="N° de reçu, de virement…" />
            </div>
          </div>
          {erreur && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erreur}</p>}
          {estDirecteur && erreur?.startsWith("Solde insuffisant") && (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <label className="flex items-start gap-2">
                <input type="checkbox" name="derogation" className="mt-0.5 h-4 w-4" />
                <span>Enregistrer malgré le solde insuffisant (dérogation tracée)</span>
              </label>
              <Input name="motifDerogation" placeholder="Motif de la dérogation" />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => ref.current?.close()} className="h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-4 text-sm hover:bg-neutral-50">
              Annuler
            </button>
            <Button type="submit" disabled={enCours}>{enCours ? "Enregistrement…" : "Enregistrer"}</Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
