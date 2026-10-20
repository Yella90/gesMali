"use client";

import { useState } from "react";
import { changerMonMotDePasse } from "./actions";
import { estRedirection } from "@/lib/actions/resultat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// modifie : retour apres un changement reussi (l'action redirige vers /compte?mot-de-passe=modifie)
export function MotDePasse({ modifie = false }: { modifie?: boolean }) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setEnCours(true);
    setErreur(null);
    try {
      // Succes : l'action redirige (pas de resultat)
      const r = await changerMonMotDePasse(String(fd.get("actuel")), String(fd.get("nouveau")), String(fd.get("confirmation")));
      if (r && !r.ok) throw new Error(r.erreur);
      form.reset();
    } catch (err) {
      if (estRedirection(err)) {
        form.reset();
        return;
      }
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
      {modifie && !erreur && !enCours && (
        <p role="status" className="text-sm text-[var(--color-accent)]">
          Mot de passe modifié. Les sessions ouvertes sur d&apos;autres appareils ont été fermées.
        </p>
      )}
      <Button type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
