"use client";

import { useState } from "react";
import { nouveauMotDePasse } from "../actions";
import { estRedirection } from "@/lib/actions/resultat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NouveauMotDePasse({ jeton, email }: { jeton: string; email: string }) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setEnCours(true);
    setErreur(null);
    try {
      // Succes : l'action redirige vers la connexion (pas de resultat)
      const r = await nouveauMotDePasse(jeton, String(fd.get("nouveau")), String(fd.get("confirmation")));
      if (r && !r.ok) throw new Error(r.erreur);
    } catch (err) {
      if (estRedirection(err)) return;
      setErreur(err instanceof Error ? err.message : "Modification impossible");
      setEnCours(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Pour les gestionnaires de mots de passe */}
      <input type="email" name="email" value={email} autoComplete="username" readOnly hidden />
      <div className="space-y-1.5">
        <Label htmlFor="nmdp-nouveau">Nouveau mot de passe</Label>
        <Input id="nmdp-nouveau" name="nouveau" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="nmdp-confirmation">Confirmation</Label>
        <Input id="nmdp-confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <p className="text-xs text-[var(--color-ink-muted)]">8 caractères minimum.</p>
      {erreur && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800">
          {erreur}
        </p>
      )}
      <Button type="submit" disabled={enCours} className="h-11 w-full">
        {enCours ? "Enregistrement…" : "Enregistrer le mot de passe"}
      </Button>
    </form>
  );
}
