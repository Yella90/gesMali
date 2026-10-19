"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creerClasse as creerClasseAction } from "../actions";
import { relever } from "@/lib/actions/resultat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const creerClasse = relever(creerClasseAction);

export function ClasseForm({
  annees,
  enseignants,
}: {
  annees: { id: string; label: string }[];
  enseignants: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [inscription, setInscription] = useState("0");
  const [mensuel, setMensuel] = useState("0");
  const [capacite, setCapacite] = useState("50");
  const [cycle, setCycle] = useState("PREMIER_CYCLE");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await creerClasse(fd);
      router.push("/classes/" + res.id);
    } catch (err: any) {
      setErreur(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inscNum = Number(inscription) || 0;
  const mensNum = Number(mensuel) || 0;
  const capNum = Number(capacite) || 50;
  const annuel = mensNum * 9;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Section 1 : Identification */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[var(--color-brand)] text-white text-xs flex items-center justify-center font-medium">1</span>
          <h2 className="font-medium">Identification</h2>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="anneeScolaireId">Année scolaire</Label>
          <select
            id="anneeScolaireId"
            name="anneeScolaireId"
            required
            className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
          >
            <option value="">-- Choisir --</option>
            {annees.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="nom">Nom de la classe</Label>
            <Input id="nom" name="nom" placeholder="Ex : 6ème A" maxLength={50} />
            <p className="text-xs text-[var(--color-ink-muted)]">
              Optionnel. Sinon généré automatiquement depuis niveau + section.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="niveau">Niveau (0-9)</Label>
            <Input id="niveau" name="niveau" type="number" min={0} max={9} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="section">Section</Label>
            <Input id="section" name="section" maxLength={5} placeholder="A" />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="cycle">Cycle</Label>
            <select
              id="cycle" name="cycle" required
              value={cycle}
              onChange={(e) => setCycle(e.target.value)}
              className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
            >
              <option value="PRESCOLAIRE">Préscolaire</option>
              <option value="PREMIER_CYCLE">Premier cycle (1ère - 6ème)</option>
              <option value="SECOND_CYCLE">Second cycle (7ème - 9ème)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="salle">Salle</Label>
            <Input id="salle" name="salle" placeholder="Salle 6A" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="titulaireId">Titulaire</Label>
            <select
              id="titulaireId" name="titulaireId"
              className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
            >
              <option value="">-- Aucun --</option>
              {enseignants.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Section 2 : Frais */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[var(--color-brand)] text-white text-xs flex items-center justify-center font-medium">2</span>
          <h2 className="font-medium">Frais et capacité</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="fraisInscription">Frais d'inscription (F CFA)</Label>
            <Input
              id="fraisInscription" name="fraisInscription"
              type="number" min={0} step={500}
              value={inscription}
              onChange={(e) => setInscription(e.target.value)}
              className="tnum"
            />
            <p className="text-xs text-[var(--color-ink-muted)]">Payé une fois à l'inscription.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fraisScolariteMensuel">Scolarité mensuelle (F CFA)</Label>
            <Input
              id="fraisScolariteMensuel" name="fraisScolariteMensuel"
              type="number" min={0} step={500}
              value={mensuel}
              onChange={(e) => setMensuel(e.target.value)}
              className="tnum"
            />
            <p className="text-xs text-[var(--color-ink-muted)]">Payé chaque mois (échéance le 5).</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="capaciteMax">Capacité maximale</Label>
            <Input
              id="capaciteMax" name="capaciteMax"
              type="number" min={1} max={200}
              value={capacite}
              onChange={(e) => setCapacite(e.target.value)}
              className="tnum"
            />
            <p className="text-xs text-[var(--color-ink-muted)]">Défaut 50 élèves.</p>
          </div>
        </div>

        {/* Apercu */}
        {(inscNum > 0 || mensNum > 0) && (
          <div className="rounded-lg bg-[var(--color-brand-soft)] p-4 space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brand)]">
              Aperçu (base 9 mensualités)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-2">
              <div>
                <p className="text-xs text-[var(--color-ink-muted)]">Inscription</p>
                <p className="font-semibold tnum">{inscNum.toLocaleString("fr-FR")} F</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-ink-muted)]">Mensuel</p>
                <p className="font-semibold tnum">{mensNum.toLocaleString("fr-FR")} F</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-ink-muted)]">Scolarité/an</p>
                <p className="font-semibold tnum">{annuel.toLocaleString("fr-FR")} F</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-ink-muted)]">Total élève</p>
                <p className="font-semibold tnum text-[var(--color-brand)]">
                  {(inscNum + annuel).toLocaleString("fr-FR")} F
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {erreur && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {erreur}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "Enregistrement..." : "Créer la classe"}
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