"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { CheckCircle2, QrCode, X } from "lucide-react";
import { LoginForm } from "./LoginForm";
import { LiensLegaux } from "@/components/legal/PageLegale";

// Bouton "Se connecter" qui ouvre le formulaire dans une fenetre modale native
// (<dialog> + showModal : focus garde dans la fenetre, Echap pour fermer).
// La fenetre s'ouvre d'elle-meme quand l'URL contient ?connexion (arrivee
// depuis une page protegee).

const ID = "fenetre-connexion";

function ouvrir() {
  const d = document.getElementById(ID) as HTMLDialogElement | null;
  if (!d || d.open) return;
  d.showModal();
  document.getElementById("email")?.focus();
}

export function BoutonConnexion({ className = "", children = "Se connecter" }: { className?: string; children?: React.ReactNode }) {
  return (
    <button type="button" onClick={ouvrir} aria-haspopup="dialog" aria-controls={ID} className={className}>
      {children}
    </button>
  );
}

// message : retour d'un parcours (ecole creee, mot de passe modifie) ; motDePasseOublie : lien
// vers la demande par e-mail (si l'envoi d'e-mails est configure)
export function FenetreConnexion({
  ouverte,
  retour,
  message,
  motDePasseOublie,
}: {
  ouverte: boolean;
  retour: string;
  message?: string;
  motDePasseOublie: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  const fermer = useCallback(() => ref.current?.close(), []);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    // Clic sur le fond pour fermer ; repli pour les navigateurs sans closedby (Safari)
    d.setAttribute("closedby", "any");
    const horsCadre = (e: MouseEvent) => {
      if (e.target !== d) return;
      const r = d.getBoundingClientRect();
      const dedans = r.top <= e.clientY && e.clientY <= r.bottom && r.left <= e.clientX && e.clientX <= r.right;
      if (!dedans) d.close();
    };
    if (!("closedBy" in HTMLDialogElement.prototype)) d.addEventListener("click", horsCadre);
    if (ouverte) ouvrir();
    return () => d.removeEventListener("click", horsCadre);
  }, [ouverte]);

  return (
    <dialog
      id={ID}
      ref={ref}
      aria-labelledby="titre-connexion"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(26rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-2xl bg-white p-0 text-[var(--color-ink)] shadow-[0_30px_80px_-20px_rgba(4,14,30,0.6)] backdrop:bg-[#0B1D33]/70 backdrop:backdrop-blur-[3px]"
    >
      <div className="relative px-6 pb-6 pt-7 sm:px-8 sm:pb-8">
        <button
          type="button"
          onClick={fermer}
          aria-label="Fermer"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        <h2 id="titre-connexion" className="font-serif text-[26px] font-semibold leading-tight">
          Connexion
        </h2>
        <p className="mb-7 mt-1.5 text-sm text-[var(--color-ink-muted)]">
          Utilisez l&apos;adresse e-mail fournie par votre établissement.
        </p>
        {message && (
          <p role="status" className="-mt-3 mb-5 flex gap-2 rounded-lg bg-[var(--color-accent-soft)] px-3 py-2.5 text-sm text-[var(--color-accent)]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{message}</span>
          </p>
        )}
        <LoginForm retour={retour} />
        {motDePasseOublie ? (
          <p className="mt-4 text-sm">
            <Link href="/mot-de-passe/oublie" className="font-medium text-[var(--color-brand)] hover:underline">
              Mot de passe oublié ?
            </Link>
          </p>
        ) : (
          <p className="mt-4 text-xs text-[var(--color-ink-muted)]">
            Mot de passe oublié ? La direction de votre établissement peut le réinitialiser depuis votre fiche du personnel.
          </p>
        )}
        <div className="mt-5 flex gap-3 rounded-xl bg-[var(--color-gold-soft)] px-3.5 py-3 text-xs leading-relaxed text-[#5C4416]">
          <QrCode className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            <span className="font-semibold">Vous êtes parent ?</span> Aucun compte n&apos;est nécessaire : scannez le QR code de la
            fiche d&apos;inscription de votre enfant pour consulter ses notes, ses bulletins et sa scolarité.
          </p>
        </div>
        <p className="mt-5 text-xs text-[var(--color-ink-muted)]">
          En vous connectant, vous acceptez les conditions d&apos;utilisation et la politique de confidentialité.
        </p>
        <LiensLegaux className="mt-2 text-[var(--color-ink-muted)]" />
      </div>
    </dialog>
  );
}
