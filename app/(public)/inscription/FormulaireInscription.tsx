"use client";

import { useState } from "react";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { inscrireEcole as inscrireEcoleAction } from "./actions";
import { estRedirection, relever } from "@/lib/actions/resultat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChampsEcole, type DefautsEcole } from "@/components/plateforme/ChampsEcole";

const inscrireEcole = relever(inscrireEcoleAction);

// connecte : l'ecole est ajoutee au compte connecte (pas de mot de passe a choisir)
export function FormulaireInscription({ defauts, connecte }: { defauts: DefautsEcole; connecte: boolean }) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // Lien de confirmation envoye a cette adresse (inscription hors connexion)
  const [envoyeA, setEnvoyeA] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    try {
      // Connecte : l'action redirige vers le tableau de bord de la nouvelle ecole
      const r = await inscrireEcole(new FormData(e.currentTarget));
      if (r?.email) {
        setEnvoyeA(r.email);
        setEnCours(false);
        window.scrollTo({ top: 0 });
      }
    } catch (err) {
      if (estRedirection(err)) return;
      setErreur(err instanceof Error ? err.message : "Création impossible");
      setEnCours(false);
    }
  }

  // Le formulaire reste en place (cache) : « Corriger » le retrouve rempli
  const envoye = envoyeA && (
    <div
      role="status"
      className="space-y-3 rounded-2xl bg-white p-5 text-sm leading-relaxed text-[var(--color-ink)] shadow-xl sm:p-7"
    >
      <MailCheck className="h-8 w-8 text-[var(--color-accent)]" aria-hidden />
      <p className="text-base font-semibold">Vérifiez votre boîte de réception</p>
      <p>
        Un lien vient d&apos;être envoyé à <strong>{envoyeA}</strong>. Ouvrez-le pour créer votre école : il est valable 48
        heures. L&apos;e-mail peut mettre quelques minutes à arriver ; pensez à regarder dans les courriers indésirables.
      </p>
      <p className="text-[var(--color-ink-muted)]">
        Adresse erronée ?{" "}
        <button type="button" onClick={() => setEnvoyeA(null)} className="font-medium text-[var(--color-brand)] hover:underline">
          Corriger le formulaire
        </button>
      </p>
    </div>
  );

  return (
    <>
      {envoye}
      <form
        onSubmit={onSubmit}
        hidden={!!envoyeA}
        className="space-y-6 rounded-2xl bg-white p-5 text-[var(--color-ink)] shadow-xl sm:p-7"
      >
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
          <input
            type="checkbox"
            name="conditions"
            required
            className="mt-0.5 h-4 w-4 rounded border-[var(--color-border-strong)]"
          />
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
    </>
  );
}
