"use client";

import { useState } from "react";
import Link from "next/link";
import { creerEcoleAdmin as creerEcoleAdminAction } from "../actions";
import { relever } from "@/lib/actions/resultat";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChampsEcole, type DefautsEcole } from "@/components/plateforme/ChampsEcole";

const creerEcoleAdmin = relever(creerEcoleAdminAction);

export function FormulaireNouvelleEcole({ defauts }: { defauts: DefautsEcole }) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [cree, setCree] = useState<{ email: string; motDePasse: string | null } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    try {
      const r = await creerEcoleAdmin(new FormData(e.currentTarget));
      setCree({ email: r.email, motDePasse: r.motDePasse });
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Création impossible");
    } finally {
      setEnCours(false);
    }
  }

  if (cree) {
    return (
      <div className="space-y-4 rounded-xl border border-[var(--color-border)] bg-white p-5">
        <h2 className="font-semibold">École créée</h2>
        {cree.motDePasse ? (
          <div className="space-y-1 text-sm">
            <p>Remettez ces identifiants au directeur ; il pourra changer son mot de passe dans « Mon compte ».</p>
            <p>Identifiant : <strong>{cree.email}</strong></p>
            <p>
              Mot de passe provisoire : <strong className="font-mono">{cree.motDePasse}</strong>
            </p>
            <p className="text-xs text-amber-800">Ce mot de passe ne sera plus affiché.</p>
          </div>
        ) : (
          <p className="text-sm">
            {cree.email} avait déjà un compte : il retrouve la nouvelle école dans « Mes écoles », avec son mot de passe habituel.
          </p>
        )}
        <Link href="/plateforme" className="text-sm font-medium text-[var(--color-brand)] hover:underline">
          Retour aux écoles
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-xl border border-[var(--color-border)] bg-white p-5">
      <ChampsEcole defauts={defauts} />
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold">Statut</legend>
        <Label className="flex items-center gap-2 font-normal">
          <input type="radio" name="statut" value="ESSAI" defaultChecked className="h-4 w-4" />
          Période d&apos;essai de 30 jours
        </Label>
        <Label className="flex items-center gap-2 font-normal">
          <input type="radio" name="statut" value="ACTIF" className="h-4 w-4" />
          Active (contrat conclu)
        </Label>
      </fieldset>
      {erreur && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {erreur}
        </p>
      )}
      <Button type="submit" disabled={enCours}>
        {enCours ? "Création…" : "Créer l'école"}
      </Button>
    </form>
  );
}
