"use client";

import Link from "next/link";
import { useEffect } from "react";

// En production, le message des erreurs serveur est masque (seul le digest est transmis) :
// on affiche un texte generique et le digest pour retrouver l'erreur dans les logs.
export default function ErreurDashboard({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const permission = /permission refusee/i.test(error.message);

  return (
    <div className="max-w-lg mx-auto mt-10 bg-white rounded-xl border border-[var(--color-border)] p-6 text-center">
      <div className="w-12 h-12 mx-auto rounded-xl bg-red-50 text-red-700 flex items-center justify-center font-bold">!</div>
      <h1 className="text-lg font-semibold mt-4">
        {permission ? "Accès non autorisé" : "Une erreur est survenue"}
      </h1>
      <p className="text-sm text-[var(--color-ink-muted)] mt-2">
        {permission
          ? "Votre rôle ne permet pas d'accéder à cette page. Contactez la direction si besoin."
          : "La page n'a pas pu être chargée. Réessayez ; si le problème persiste, contactez l'administrateur."}
      </p>
      {error.digest && (
        <p className="text-xs text-[var(--color-ink-faint)] mt-3 font-mono">Réf. {error.digest}</p>
      )}
      <div className="flex justify-center gap-2 mt-5">
        {!permission && (
          <button
            type="button"
            onClick={() => retry()}
            className="h-10 px-4 rounded-lg bg-[var(--color-brand)] text-white text-sm hover:bg-[var(--color-brand-dark)]"
          >
            Réessayer
          </button>
        )}
        <Link
          href="/dashboard"
          className="inline-flex items-center h-10 px-4 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm hover:bg-neutral-50"
        >
          Tableau de bord
        </Link>
      </div>
    </div>
  );
}
