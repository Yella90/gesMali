"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { modifierMatiere, supprimerMatiere } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ModifierMatiere({
  matiere,
  aNotes,
}: {
  matiere: { id: string; nom: string; code: string; cycle: string; coefficient: number };
  aNotes: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [loading, setLoading] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    try {
      const fd = new FormData(e.currentTarget);
      await modifierMatiere(matiere.id, fd);
      setMode("view");
      router.refresh();
    } catch (e: any) {
      setErreur(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSupprimer() {
    if (!confirm("Supprimer cette matière ? Cette action est irréversible.")) return;
    setSuppression(true);
    setErreur(null);
    try {
      await supprimerMatiere(matiere.id);
      router.push("/matieres");
    } catch (e: any) {
      setErreur(e.message);
      setSuppression(false);
    }
  }

  if (mode === "view") {
    return (
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => setMode("edit")}>
          Modifier
        </Button>
        {!aNotes && (
          <button
            onClick={handleSupprimer}
            disabled={suppression}
            className="h-10 px-4 rounded-lg border border-red-200 bg-white text-red-700 text-sm hover:bg-red-50 disabled:opacity-50"
          >
            {suppression ? "Suppression..." : "Supprimer"}
          </button>
        )}
        {erreur && <p className="text-sm text-red-600 w-full">{erreur}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-xl border border-[var(--color-border)] p-5 md:p-6 space-y-4">
      <h2 className="font-medium">Modifier la matière</h2>

      <div className="space-y-1.5">
        <Label htmlFor="nom">Nom</Label>
        <Input id="nom" name="nom" defaultValue={matiere.nom} required />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="code">Code</Label>
          <Input id="code" name="code" maxLength={10} defaultValue={matiere.code} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="coefficient">Coefficient</Label>
          <Input id="coefficient" name="coefficient" type="number" min={1} max={10} defaultValue={matiere.coefficient} className="tnum" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cycle">Cycle</Label>
          <select
            id="cycle" name="cycle" required defaultValue={matiere.cycle}
            className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
          >
            <option value="PRESCOLAIRE">Préscolaire</option>
            <option value="PREMIER_CYCLE">Premier cycle</option>
            <option value="SECOND_CYCLE">Second cycle</option>
          </select>
        </div>
      </div>

      {erreur && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erreur}</div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Enregistrement..." : "Enregistrer"}
        </Button>
        <button
          type="button"
          onClick={() => setMode("view")}
          className="h-10 px-4 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm hover:bg-neutral-50"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}