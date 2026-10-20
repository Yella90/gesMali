"use client";

import { useState } from "react";
import { estRedirection, type Resultat } from "@/lib/actions/resultat";
import { Button } from "@/components/ui/button";

// Bouton d'une page ouverte depuis un lien recu par e-mail : l'operation n'a lieu qu'au clic
// (les messageries qui ouvrent les liens pour les verifier ne la declenchent pas)
export function BoutonLien({
  action,
  jeton,
  libelle,
  enCours,
  succes,
}: {
  action: (jeton: string) => Promise<Resultat<unknown>>;
  jeton: string;
  libelle: string;
  enCours: string;
  succes?: React.ReactNode;
}) {
  const [etat, setEtat] = useState<"attente" | "envoi" | "fait">("attente");
  const [erreur, setErreur] = useState<string | null>(null);

  async function cliquer() {
    setEtat("envoi");
    setErreur(null);
    try {
      // Action qui redirige (succes sans contenu) : pas de resultat, la page change
      const r = await action(jeton);
      if (r && !r.ok) throw new Error(r.erreur);
      setEtat(succes ? "fait" : "envoi");
    } catch (e) {
      if (estRedirection(e)) return;
      setErreur(e instanceof Error ? e.message : "Opération impossible");
      setEtat("attente");
    }
  }

  if (etat === "fait" && succes) return <>{succes}</>;
  return (
    <div className="space-y-3">
      {erreur && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800">
          {erreur}
        </p>
      )}
      <Button type="button" onClick={cliquer} disabled={etat !== "attente"} className="h-11 w-full">
        {etat === "attente" ? libelle : enCours}
      </Button>
    </div>
  );
}
