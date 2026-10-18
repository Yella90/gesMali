"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { modifierEleve } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EleveModifiable = {
  id: string;
  nom: string;
  prenom: string;
  dateNaissance: string; // AAAA-MM-JJ
  sexe: "M" | "F";
  tuteurNom: string;
  tuteurTelephone: string;
  emailParent: string;
  classeId: string;
};

const champSelect = "w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm";

// Bouton "Modifier" + fenetre modale native avec le formulaire de l'eleve
export function EditerEleve({
  eleve,
  classes,
}: {
  eleve: EleveModifiable;
  classes: { id: string; label: string; complet: boolean }[];
}) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [classeId, setClasseId] = useState(eleve.classeId);

  function ouvrir() {
    setErreur(null);
    setClasseId(eleve.classeId);
    ref.current?.showModal();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    try {
      await modifierEleve(eleve.id, new FormData(e.currentTarget));
      ref.current?.close();
      router.refresh();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setEnCours(false);
    }
  }

  const changeDeClasse = classeId !== eleve.classeId;

  return (
    <>
      <button
        type="button"
        onClick={ouvrir}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--color-border-strong)] bg-white px-4 text-sm font-medium hover:bg-neutral-50"
      >
        <Pencil className="h-4 w-4" aria-hidden />
        Modifier
      </button>

      <dialog
        ref={ref}
        aria-labelledby="titre-modifier-eleve"
        className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 text-[var(--color-ink)] shadow-[0_30px_80px_-20px_rgba(4,14,30,0.5)] backdrop:bg-[#0B1D33]/60 backdrop:backdrop-blur-[2px]"
      >
        <form onSubmit={onSubmit} className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border)] bg-white px-5 py-4 sm:px-6">
            <h2 id="titre-modifier-eleve" className="text-lg font-semibold">
              Modifier l&apos;élève
            </h2>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label="Fermer"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="space-y-5 px-5 py-5 sm:px-6">
            <fieldset className="space-y-4">
              <legend className="mb-3 text-sm font-medium">Élève</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="m-nom">Nom</Label>
                  <Input id="m-nom" name="nom" defaultValue={eleve.nom} required minLength={2} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-prenom">Prénom</Label>
                  <Input id="m-prenom" name="prenom" defaultValue={eleve.prenom} required minLength={2} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-naissance">Date de naissance</Label>
                  <Input id="m-naissance" name="dateNaissance" type="date" defaultValue={eleve.dateNaissance} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-sexe">Sexe</Label>
                  <select id="m-sexe" name="sexe" defaultValue={eleve.sexe} className={champSelect}>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="mb-3 text-sm font-medium">Parent ou tuteur</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="m-tuteur">Nom</Label>
                  <Input id="m-tuteur" name="tuteurNom" defaultValue={eleve.tuteurNom} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-tel">Téléphone</Label>
                  <Input id="m-tel" name="tuteurTelephone" type="tel" defaultValue={eleve.tuteurTelephone} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-email">Adresse e-mail</Label>
                <Input id="m-email" name="emailParent" type="email" defaultValue={eleve.emailParent} placeholder="parent@exemple.com" />
              </div>
            </fieldset>

            <fieldset className="space-y-1.5">
              <legend className="mb-3 text-sm font-medium">Classe</legend>
              <select
                id="m-classe"
                name="classeId"
                value={classeId}
                onChange={(e) => setClasseId(e.target.value)}
                aria-label="Classe"
                className={champSelect}
              >
                <option value="">Sans classe</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.complet && c.id !== eleve.classeId}>
                    {c.label}
                    {c.complet && c.id !== eleve.classeId ? " (complète)" : ""}
                  </option>
                ))}
              </select>
              {changeDeClasse && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Les frais de scolarité déjà générés pour cette année ne changent pas avec la classe. Ajustez-les si
                  besoin dans la page Frais de l&apos;élève.
                </p>
              )}
            </fieldset>

            {erreur && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {erreur}
              </p>
            )}
          </div>

          <div className="sticky bottom-0 flex justify-end gap-2 border-t border-[var(--color-border)] bg-white px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-4 text-sm hover:bg-neutral-50"
            >
              Annuler
            </button>
            <Button type="submit" disabled={enCours}>
              {enCours ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
