"use client";

import { useState } from "react";
import { changerMonMotDePasse as changerMonMotDePasseAction } from "./actions";
import { relever } from "@/lib/actions/resultat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const changerMonMotDePasse = relever(changerMonMotDePasseAction);

export function MotDePasse() {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setEnCours(true);
    setErreur(null);
    setFait(false);
    try {
      await changerMonMotDePasse(String(fd.get("actuel")), String(fd.get("nouveau")), String(fd.get("confirmation")));
      form.reset();
      setFait(true);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Modification impossible");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-[var(--color-border)] bg-white p-5">
      <h2 className="font-semibold">Changer mon mot de passe</h2>
      <p className="text-sm text-[var(--color-ink-muted)]">Le nouveau mot de passe vaut pour toutes vos écoles.</p>
      <div className="space-y-1.5">
        <Label htmlFor="mdp-actuel">Mot de passe actuel</Label>
        <Input id="mdp-actuel" name="actuel" type="password" autoComplete="current-password" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="mdp-nouveau">Nouveau mot de passe</Label>
          <Input id="mdp-nouveau" name="nouveau" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mdp-confirmation">Confirmation</Label>
          <Input id="mdp-confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={8} required />
        </div>
      </div>
      {erreur && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {erreur}
        </p>
      )}
      {fait && <p className="text-sm text-[var(--color-accent)]">Mot de passe modifié.</p>}
      <Button type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
