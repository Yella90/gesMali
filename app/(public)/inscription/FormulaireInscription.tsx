"use client";

import { useState } from "react";
import Link from "next/link";
import { inscrireEcole as inscrireEcoleAction } from "./actions";
import { relever } from "@/lib/actions/resultat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChampsEcole, type DefautsEcole } from "@/components/plateforme/ChampsEcole";

const inscrireEcole = relever(inscrireEcoleAction);

// connecte : l'ecole est ajoutee au compte connecte (pas de mot de passe a choisir)
export function FormulaireInscription({ defauts, connecte }: { defauts: DefautsEcole; connecte: boolean }) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    try {
      await inscrireEcole(new FormData(e.currentTarget));
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Création impossible");
      setEnCours(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-2xl bg-white p-5 text-[var(--color-ink)] shadow-xl sm:p-7">
      <ChampsEcole defauts={defauts} emailFixe={connecte} />

      {!connecte && (
        <fieldset className="space-y-4">
          <legend className="mb-3 text-sm font-semibold">Mot de passe du directeur</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="i-mdp">Mot de passe</Label>
              <Input id="i-mdp" name="motDePasse" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="i-conf">Confirmation</Label>
              <Input id="i-conf" name="confirmation" type="password" autoComplete="new-password" minLength={8} required />
            </div>
          </div>
          <p className="text-xs text-[var(--color-ink-muted)]">8 caractères minimum.</p>
        </fieldset>
      )}

      {/* Champ invisible : seuls les robots le remplissent */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="i-site">Site web</label>
        <input id="i-site" name="site" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="conditions" required className="mt-0.5 h-4 w-4 rounded border-[var(--color-border-strong)]" />
        <span>
          J&apos;accepte les{" "}
          <Link href="/conditions-utilisation" target="_blank" className="text-[var(--color-brand)] underline">
            conditions d&apos;utilisation
          </Link>{" "}
          et la{" "}
          <Link href="/confidentialite" target="_blank" className="text-[var(--color-brand)] underline">
            politique de confidentialité
          </Link>
          .
        </span>
      </label>

      {erreur && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {erreur}
        </p>
      )}

      <Button type="submit" disabled={enCours} className="w-full sm:w-auto">
        {enCours ? "Création de l'école…" : "Créer mon école"}
      </Button>
    </form>
  );
}
