"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { modifierParametresNotes as modifierParametresNotesAction } from "../actions";
import { relever } from "@/lib/actions/resultat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const modifierParametresNotes = relever(modifierParametresNotesAction);

export function NotesForm({
  parametres,
}: {
  parametres: {
    modeSaisieNotes: string;
    validationObligatoire: boolean;
    ponderationDevoirs: number;
    ponderationCompo: number;
  };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pondDevoirs, setPondDevoirs] = useState(String(Math.round(parametres.ponderationDevoirs * 100)));
  const [pondCompo, setPondCompo] = useState(String(Math.round(parametres.ponderationCompo * 100)));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    try {
      await modifierParametresNotes(fd);
      setMessage("Paramètres enregistrés.");
      router.refresh();
    } catch (e: any) {
      setErreur(e.message);
    } finally {
      setLoading(false);
    }
  }

  const somme = (Number(pondDevoirs) || 0) + (Number(pondCompo) || 0);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Mode de saisie */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 md:p-6 space-y-4">
        <h2 className="font-medium">Mode de saisie des notes</h2>

        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-border-strong)] has-[:checked]:border-[var(--color-brand)] has-[:checked]:bg-[var(--color-brand-soft)]">
            <input type="radio" name="modeSaisieNotes" value="DECENTRALISEE" defaultChecked={parametres.modeSaisieNotes === "DECENTRALISEE"} className="mt-1" />
            <div>
              <p className="font-medium text-sm">Décentralisée</p>
              <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">Chaque enseignant saisit ses propres notes.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-border-strong)] has-[:checked]:border-[var(--color-brand)] has-[:checked]:bg-[var(--color-brand-soft)]">
            <input type="radio" name="modeSaisieNotes" value="CENTRALISEE" defaultChecked={parametres.modeSaisieNotes === "CENTRALISEE"} className="mt-1" />
            <div>
              <p className="font-medium text-sm">Centralisée</p>
              <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">Seul le secrétaire saisit les notes.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-border-strong)] has-[:checked]:border-[var(--color-brand)] has-[:checked]:bg-[var(--color-brand-soft)]">
            <input type="radio" name="modeSaisieNotes" value="MIXTE" defaultChecked={parametres.modeSaisieNotes === "MIXTE"} className="mt-1" />
            <div>
              <p className="font-medium text-sm">Mixte</p>
              <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">Les enseignants et le secrétaire peuvent saisir.</p>
            </div>
          </label>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input type="checkbox" id="validationObligatoire" name="validationObligatoire" defaultChecked={parametres.validationObligatoire} className="w-4 h-4" />
          <label htmlFor="validationObligatoire" className="text-sm">
            Le directeur doit valider les notes avant verrouillage
          </label>
        </div>
      </div>

      {/* Ponderation */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 md:p-6 space-y-4">
        <h2 className="font-medium">Pondération des notes</h2>
        <p className="text-xs text-[var(--color-ink-muted)]">
          Détermine le poids des devoirs et des compositions dans la moyenne. La somme doit être égale à 100.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ponderationDevoirs">Devoirs (%)</Label>
            <Input
              id="ponderationDevoirs" name="ponderationDevoirs" type="number" min={0} max={100}
              value={pondDevoirs}
              onChange={(e) => setPondDevoirs(e.target.value)}
              className="tnum"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ponderationCompo">Compositions (%)</Label>
            <Input
              id="ponderationCompo" name="ponderationCompo" type="number" min={0} max={100}
              value={pondCompo}
              onChange={(e) => setPondCompo(e.target.value)}
              className="tnum"
            />
          </div>
        </div>

        {somme !== 100 && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
            La somme est actuellement de {somme} %. Ajustez à 100 %.
          </div>
        )}

        <div className="rounded-lg bg-[var(--color-brand-soft)] p-3 text-sm">
          <p className="text-[var(--color-brand)] font-medium">Formule actuelle</p>
          <p className="text-xs text-[var(--color-brand)] mt-1 tnum">
            Moyenne = (Composition x {pondCompo} % + Devoirs x {pondDevoirs} %)
          </p>
        </div>
      </div>

      {erreur && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erreur}</div>
      )}
      {message && (
        <div className="rounded-lg border border-[var(--color-accent-soft)] bg-[var(--color-accent-soft)] px-3 py-2 text-sm text-[var(--color-accent)]">{message}</div>
      )}

      <Button type="submit" disabled={loading || somme !== 100}>
        {loading ? "Enregistrement..." : "Enregistrer les paramètres"}
      </Button>
    </form>
  );
}