"use client";

import { useEffect, useState } from "react";

// Nombre qui se calcule sous les yeux (moyenne du bulletin). Le rendu serveur
// affiche directement la valeur finale ; sans animation si l'utilisateur
// prefere reduire les mouvements.
export function Compteur({
  valeur,
  decimales = 2,
  duree = 1400,
  delai = 0,
}: {
  valeur: number;
  decimales?: number;
  duree?: number;
  delai?: number;
}) {
  const [affiche, setAffiche] = useState(valeur);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let image = 0;
    let debut = 0;
    const etape = (t: number) => {
      if (!debut) debut = t;
      const p = Math.min(1, (t - debut) / duree);
      setAffiche(valeur * (1 - Math.pow(1 - p, 3)));
      if (p < 1) image = requestAnimationFrame(etape);
    };
    const minuterie = setTimeout(() => {
      image = requestAnimationFrame(etape);
    }, delai);
    // La carte est encore invisible a ce moment-la (entree retardee)
    image = requestAnimationFrame(() => setAffiche(0));
    return () => {
      clearTimeout(minuterie);
      cancelAnimationFrame(image);
    };
  }, [valeur, duree, delai]);

  return (
    <span className="tnum">
      {affiche.toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}
    </span>
  );
}
