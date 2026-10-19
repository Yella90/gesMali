"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changerStatut as changerStatutAction } from "./actions";
import { relever } from "@/lib/actions/resultat";

const changerStatut = relever(changerStatutAction);

type Action = "activer" | "suspendre" | "reactiver" | "prolonger";

const LIBELLES: Record<Action, string> = {
  activer: "Activer",
  suspendre: "Suspendre",
  reactiver: "Réactiver",
  prolonger: "Prolonger l'essai de 30 jours",
};

// Actions possibles selon le statut de l'ecole
export function ActionsEcole({ id, nom, statut }: { id: string; nom: string; statut: "ESSAI" | "ACTIF" | "SUSPENDU" }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState<Action | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const actions: Action[] =
    statut === "SUSPENDU" ? ["reactiver"] : statut === "ESSAI" ? ["activer", "prolonger", "suspendre"] : ["suspendre"];

  async function lancer(action: Action) {
    if (action === "suspendre" && !window.confirm("Suspendre « " + nom + " » ? Son personnel ne pourra plus s'y connecter.")) return;
    setEnCours(action);
    setErreur(null);
    try {
      await changerStatut(id, action);
      router.refresh();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible");
    } finally {
      setEnCours(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => lancer(a)}
          disabled={enCours !== null}
          className={
            "inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium disabled:opacity-50 " +
            (a === "suspendre"
              ? "border-red-200 bg-white text-red-700 hover:bg-red-50"
              : "border-[var(--color-border-strong)] bg-white hover:bg-neutral-50")
          }
        >
          {enCours === a ? "…" : LIBELLES[a]}
        </button>
      ))}
      {erreur && <span className="text-xs text-red-700">{erreur}</span>}
    </div>
  );
}
