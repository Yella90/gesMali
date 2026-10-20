"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changerStatut as changerStatutAction, supprimerEcoleAdmin as supprimerEcoleAction } from "./actions";
import { relever } from "@/lib/actions/resultat";
import { useConfirm } from "@/components/ui/ConfirmProvider";

const changerStatut = relever(changerStatutAction);
const supprimerEcole = relever(supprimerEcoleAction);

type Action = "activer" | "suspendre" | "reactiver" | "prolonger";

const LIBELLES: Record<Action, string> = {
  activer: "Activer",
  suspendre: "Suspendre",
  reactiver: "Réactiver",
  prolonger: "Prolonger l'essai de 30 jours",
};

// Actions possibles selon le statut de l'ecole ; vide (ni eleves ni classes) : suppression possible
export function ActionsEcole({
  id,
  nom,
  statut,
  vide,
}: {
  id: string;
  nom: string;
  statut: "ESSAI" | "ACTIF" | "SUSPENDU";
  vide: boolean;
}) {
  const router = useRouter();
  const confirmer = useConfirm();
  const [enCours, setEnCours] = useState<Action | "supprimer" | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const actions: Action[] =
    statut === "SUSPENDU" ? ["reactiver"] : statut === "ESSAI" ? ["activer", "prolonger", "suspendre"] : ["suspendre"];

  async function lancer(action: Action) {
    if (
      action === "suspendre" &&
      !(await confirmer({
        title: "Suspendre « " + nom + " » ?",
        message: "Son personnel ne pourra plus s'y connecter. Les données sont conservées : vous pourrez réactiver l'école à tout moment.",
        confirmLabel: "Suspendre",
        variant: "warning",
      }))
    ) {
      return;
    }
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

  // Le nom de l'ecole est retape : pas de suppression par erreur d'une ecole homonyme
  async function supprimer() {
    const ok = await confirmer({
      title: "Supprimer « " + nom + " » ?",
      message:
        "Suppression définitive : ses paramètres, ses matières, ses fiches du personnel et leurs accès seront effacés. " +
        "Les comptes qui ne servent dans aucune autre école seront supprimés.",
      confirmLabel: "Supprimer définitivement",
      variant: "danger",
      saisieLibelle: "Pour confirmer, tapez le nom de l'école :",
      saisieAttendue: nom,
    });
    if (!ok) return;
    setEnCours("supprimer");
    setErreur(null);
    try {
      // Le serveur verifie de nouveau le nom
      await supprimerEcole(id, nom);
      router.refresh();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Suppression impossible");
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
      {vide && (
        <button
          type="button"
          onClick={supprimer}
          disabled={enCours !== null}
          className="inline-flex h-8 items-center rounded-md border border-red-200 bg-white px-3 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {enCours === "supprimer" ? "…" : "Supprimer"}
        </button>
      )}
      {erreur && <span className="text-xs text-red-700">{erreur}</span>}
    </div>
  );
}
