"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creerAnnee, creerTrimestre } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TrimestreForm({
  annees,
}: {
  annees: { id: string; label: string; nbTrimestres: number }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmitAnnee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    setMessage(null);
    try {
      const fd = new FormData(e.currentTarget);
      await creerAnnee(fd);
      setMessage("Année créée. Vous pouvez maintenant ajouter des trimestres.");
      router.refresh();
    } catch (err: any) {
      setErreur(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitTrimestre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    setMessage(null);
    try {
      const fd = new FormData(e.currentTarget);
      await creerTrimestre(fd);
      setMessage("Trimestre créé.");
      router.refresh();
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setErreur(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Section 1 : Annee */}
      <form onSubmit={onSubmitAnnee} className="bg-white rounded-xl border border-[var(--color-border)] p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[var(--color-brand)] text-white text-xs flex items-center justify-center font-medium">1</span>
          <h2 className="font-medium">Créer une année scolaire</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="libelle">Libellé</Label>
            <Input id="libelle" name="libelle" placeholder="2026-2027" required pattern="\d{4}-\d{4}" />
            <p className="text-xs text-[var(--color-ink-muted)]">Format : AAAA-AAAA</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dateDebut">Début</Label>
            <Input id="dateDebut" name="dateDebut" type="date" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dateFin">Fin</Label>
            <Input id="dateFin" name="dateFin" type="date" required />
          </div>
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? "Création..." : "Créer l'année"}
        </Button>
      </form>

      {/* Section 2 : Trimestre */}
      <form onSubmit={onSubmitTrimestre} className="bg-white rounded-xl border border-[var(--color-border)] p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[var(--color-brand)] text-white text-xs flex items-center justify-center font-medium">2</span>
          <h2 className="font-medium">Ajouter un trimestre</h2>
        </div>

        {annees.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">
            Créez d'abord une année scolaire.
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="anneeScolaireId">Année scolaire</Label>
              <select
                id="anneeScolaireId" name="anneeScolaireId" required
                className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
              >
                <option value="">-- Choisir --</option>
                {annees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} ({a.nbTrimestres} trimestre{a.nbTrimestres > 1 ? "s" : ""})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="nom">Nom</Label>
                <Input id="nom" name="nom" placeholder="Trimestre 1" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ordre">Ordre</Label>
                <select
                  id="ordre" name="ordre" required defaultValue="1"
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
                <Label htmlFor="dateDebutT">Début</Label>
                <Input id="dateDebutT" name="dateDebut" type="date" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dateFinT">Fin (optionnel)</Label>
                <Input id="dateFinT" name="dateFin" type="date" />
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Création..." : "Créer le trimestre"}
            </Button>
          </>
        )}
      </form>

      {erreur && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erreur}</div>
      )}

      {message && (
        <div className="rounded-lg border border-[var(--color-accent-soft)] bg-[var(--color-accent-soft)] px-3 py-2 text-sm text-[var(--color-accent)]">
          {message}
        </div>
      )}
    </div>
  );
}