"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { modifierTrimestre as modifierTrimestreAction } from "../actions";
import { relever } from "@/lib/actions/resultat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const modifierTrimestre = relever(modifierTrimestreAction);

export function ModifierTrimestre({
  trimestre,
}: {
  trimestre: {
    id: string;
    nom: string;
    ordre: number;
    dateDebut: string;
    dateFin: string;
  };
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [dateDebut, setDateDebut] = useState(trimestre.dateDebut);
  const [dateFin, setDateFin] = useState(trimestre.dateFin);

  // Calculer la duree en temps reel
  const dureeJours = (() => {
    if (!dateDebut || !dateFin) return null;
    const d1 = new Date(dateDebut);
    const d2 = new Date(dateFin);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
    const jours = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return jours > 0 ? jours : null;
  })();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    const fd = new FormData(e.currentTarget);
    try {
      await modifierTrimestre(trimestre.id, {
        nom: fd.get("nom") as string,
        ordre: Number(fd.get("ordre")),
        dateDebut: fd.get("dateDebut") as string,
        dateFin: (fd.get("dateFin") as string) || null,
      });
      setOuvert(false);
      router.refresh();
    } catch (e: any) {
      setErreur(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!ouvert) {
    return (
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => setOuvert(true)}>
          Modifier la durée du trimestre
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-xl border border-[var(--color-border)] p-5 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Modifier le trimestre</h2>
        <button
          type="button"
          onClick={() => { setOuvert(false); setErreur(null); }}
          className="p-2 -mr-2 rounded-lg hover:bg-neutral-100"
          aria-label="Fermer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="nom">Nom</Label>
          <Input id="nom" name="nom" defaultValue={trimestre.nom} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ordre">Numéro</Label>
          <select
            id="ordre" name="ordre" required defaultValue={String(trimestre.ordre)}
            className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
          >
            <option value="1">1er trimestre</option>
            <option value="2">2ème trimestre</option>
            <option value="3">3ème trimestre</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="dateDebut">Date de début</Label>
          <Input
            id="dateDebut"
            name="dateDebut"
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dateFin">Date de fin</Label>
          <Input
            id="dateFin"
            name="dateFin"
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
          />
          <p className="text-xs text-[var(--color-ink-muted)]">
            Optionnel. Laissez vide si non définie.
          </p>
        </div>
      </div>

      {dureeJours != null && (
        <div className="rounded-lg bg-[var(--color-brand-soft)] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brand)]">
            Durée calculée
          </p>
          <p className="text-lg font-semibold text-[var(--color-brand)] mt-1 tnum">
            {dureeJours} jour{dureeJours > 1 ? "s" : ""}
            <span className="text-sm font-normal text-[var(--color-ink-muted)] ml-2">
              ({Math.round(dureeJours / 7)} semaine{dureeJours >= 14 ? "s" : ""})
            </span>
          </p>
          <p className="text-xs text-[var(--color-ink-muted)] mt-1 tnum">
            Du {new Date(dateDebut).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
            {" "}au {new Date(dateFin).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
      )}

      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
        <strong>Attention :</strong> la modification des dates affecte les calculs de présence et les échéances de frais liées à ce trimestre.
      </div>

      {erreur && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {erreur}
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => { setOuvert(false); setErreur(null); }}
          className="h-10 px-4 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm hover:bg-neutral-50"
        >
          Annuler
        </button>
        <Button type="submit" disabled={loading}>
          {loading ? "Enregistrement..." : "Enregistrer les modifications"}
        </Button>
      </div>
    </form>
  );
}