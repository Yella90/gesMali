"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creerMatiere } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MatiereForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    try {
      const fd = new FormData(e.currentTarget);
      await creerMatiere(fd);
      router.push("/matieres");
    } catch (err: any) {
      setErreur(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-xl border border-[var(--color-border)] p-5 md:p-6 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="nom">Nom de la matiére</Label>
        <Input id="nom" name="nom" required placeholder="Ex : Mathématiques" />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="code">Code</Label>
          <Input id="code" name="code" maxLength={10} placeholder="MATH" />
          <p className="text-xs text-[var(--color-ink-muted)]">Optionnel, 10 caractéres max.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="coefficient">Coefficient</Label>
          <Input id="coefficient" name="coefficient" type="number" min={1} max={10} defaultValue={1} className="tnum" />
          <p className="text-xs text-[var(--color-ink-muted)]">1 = poids normal, jusqu'à 10.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cycle">Cycle</Label>
          <select
            id="cycle" name="cycle" required
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
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "Enregistrement..." : "Créer la matiére"}
        </Button>
        <button
          type="button"
          onClick={() => router.back()}
          className="h-11 px-5 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm hover:bg-neutral-50"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}