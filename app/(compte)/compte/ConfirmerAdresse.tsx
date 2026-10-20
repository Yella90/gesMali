"use client";

import { useState } from "react";
import { BadgeCheck, MailWarning } from "lucide-react";
import { envoyerConfirmation as envoyerConfirmationAction } from "./actions";
import { relever } from "@/lib/actions/resultat";
import { Button } from "@/components/ui/button";

const envoyerConfirmation = relever(envoyerConfirmationAction);

// Adresse e-mail du compte : confirmee (date), ou bouton pour recevoir le lien de confirmation
export function ConfirmerAdresse({ email, verifieLe, envoiPossible }: { email: string; verifieLe: string | null; envoiPossible: boolean }) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);

  async function envoyer() {
    setEnCours(true);
    setErreur(null);
    try {
      await envoyerConfirmation();
      setEnvoye(true);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Envoi impossible");
    } finally {
      setEnCours(false);
    }
  }

  if (verifieLe) {
    return (
      <section className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-white p-5">
        <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-accent)]" aria-hidden />
        <div>
          <h2 className="font-semibold">Adresse e-mail confirmée</h2>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            {email}, confirmée le {verifieLe}. D&apos;autres écoles peuvent vous donner accès à leur espace avec ce compte.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-white p-5">
      <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-gold)]" aria-hidden />
      <div className="min-w-0 space-y-3">
        <div>
          <h2 className="font-semibold">Adresse e-mail à confirmer</h2>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Une adresse confirmée est nécessaire pour qu&apos;une autre école vous donne accès à son espace avec ce compte.
          </p>
        </div>
        {envoye ? (
          <p role="status" className="text-sm">
            Lien envoyé à <strong>{email}</strong>, valable 48 heures. Pensez à regarder dans les courriers indésirables.
          </p>
        ) : envoiPossible ? (
          <Button type="button" variant="outline" onClick={envoyer} disabled={enCours}>
            {enCours ? "Envoi…" : "M'envoyer le lien de confirmation"}
          </Button>
        ) : (
          <p className="text-sm text-[var(--color-ink-muted)]">La confirmation par e-mail sera bientôt disponible.</p>
        )}
        {erreur && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {erreur}
          </p>
        )}
      </div>
    </section>
  );
}
