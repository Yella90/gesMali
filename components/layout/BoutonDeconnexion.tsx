"use client";

import { useState } from "react";
import { deconnexion } from "@/app/(dashboard)/_actions/deconnexion";

export function BoutonDeconnexion() {
  const [enCours, setEnCours] = useState(false);

  async function handleClick() {
    setEnCours(true);
    try {
      await deconnexion();
    } catch {
      setEnCours(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={enCours}
      className="w-full text-left px-3 py-2 rounded text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {enCours ? "Déconnexion…" : "Se déconnecter"}
    </button>
  );
}