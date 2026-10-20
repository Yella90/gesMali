"use client";

import { useState } from "react";
import { MailCheck } from "lucide-react";
import { demanderLien as demanderLienAction } from "../actions";
import { relever } from "@/lib/actions/resultat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const demanderLien = relever(demanderLienAction);

export function DemandeLien() {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoyeA, setEnvoyeA] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    try {
      const r = await demanderLien(String(new FormData(e.currentTarget).get("email") ?? ""));
      setEnvoyeA(r.email);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Demande impossible");
    } finally {
      setEnCours(false);
    }
  }

  if (envoyeA) {
    return (
      <div role="status" className="space-y-2 rounded-xl bg-[var(--color-surface)] p-4">
        <MailCheck className="h-6 w-6 text-[var(--color-accent)]" aria-hidden />
        <p>
          Si un compte existe pour <strong>{envoyeA}</strong>, un lien vient d&apos;y être envoyé. Il est valable 1 heure.
        </p>
        <p className="text-[var(--color-ink-muted)]">
          L&apos;e-mail peut mettre quelques minutes à arriver ; pensez à regarder dans les courriers indésirables.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="oubli-email">Adresse e-mail</Label>
        <Input
          id="oubli-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
      </div>
      {erreur && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800">
          {erreur}
        </p>
      )}
      <Button type="submit" disabled={enCours} className="h-11 w-full">
        {enCours ? "Envoi…" : "Recevoir le lien"}
      </Button>
    </form>
  );
}
