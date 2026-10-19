"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { modifierClasse as modifierClasseAction } from "../actions";
import { relever } from "@/lib/actions/resultat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const modifierClasse = relever(modifierClasseAction);

export function EditerClasse({
  classe,
  enseignants,
}: {
  classe: {
    id: string;
    nom: string;
    niveau: number;
    cycle: string;
    section: string;
    salle: string;
    titulaireId: string;
    fraisInscription: number;
    fraisScolariteMensuel: number;
    capaciteMax: number;
  };
  enseignants: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    try {
      const fd = new FormData(e.currentTarget);
      await modifierClasse(classe.id, fd);
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
      <Button variant="outline" onClick={() => setOuvert(true)}>
        Modifier la classe
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-xl max-w-3xl w-full my-8 p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Modifier la classe</h2>
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

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" name="nom" defaultValue={classe.nom} maxLength={50} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cycle">Cycle</Label>
            <select
              id="cycle" name="cycle" defaultValue={classe.cycle} required
              className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
            >
              <option value="PRESCOLAIRE">Préscolaire</option>
              <option value="PREMIER_CYCLE">Premier cycle</option>
              <option value="SECOND_CYCLE">Second cycle</option>
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="niveau">Niveau</Label>
            <Input id="niveau" name="niveau" type="number" min={0} max={9} defaultValue={classe.niveau} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="section">Section</Label>
            <Input id="section" name="section" defaultValue={classe.section} maxLength={5} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="salle">Salle</Label>
            <Input id="salle" name="salle" defaultValue={classe.salle} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="titulaireId">Titulaire</Label>
          <select
            id="titulaireId" name="titulaireId" defaultValue={classe.titulaireId}
            className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
          >
            <option value="">-- Aucun --</option>
            {enseignants.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </div>

        <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-[var(--color-border)]">
          <div className="space-y-1.5">
            <Label htmlFor="fraisInscription">Frais d'inscription</Label>
            <Input id="fraisInscription" name="fraisInscription" type="number" min={0} step={500} defaultValue={classe.fraisInscription} className="tnum" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fraisScolariteMensuel">Scolarité mensuelle</Label>
            <Input id="fraisScolariteMensuel" name="fraisScolariteMensuel" type="number" min={0} step={500} defaultValue={classe.fraisScolariteMensuel} className="tnum" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="capaciteMax">Capacité max</Label>
            <Input id="capaciteMax" name="capaciteMax" type="number" min={1} max={200} defaultValue={classe.capaciteMax} className="tnum" />
          </div>
        </div>

        {erreur && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {erreur}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => setOuvert(false)}
            className="h-10 px-4 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm hover:bg-neutral-50"
          >
            Annuler
          </button>
          <Button type="submit" disabled={loading}>
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </form>
    </div>
  );
}