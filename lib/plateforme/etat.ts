// Etat d'une ecole sur la plateforme : ouverte (active, ou en essai non termine) ou fermee
// (suspendue, essai termine). Une ecole fermee reste en base ; son personnel ne peut plus
// y travailler tant qu'elle n'est pas reactivee.

export const DUREE_ESSAI_JOURS = 30;

export type StatutEcole = "ESSAI" | "ACTIF" | "SUSPENDU";
export type EtatEcole = { ouverte: boolean; libelle: string; joursEssai: number | null };

const JOUR_MS = 24 * 3600 * 1000;

export function etatEcole(e: { statut: StatutEcole; finEssai: Date | null }, maintenant = new Date()): EtatEcole {
  if (e.statut === "SUSPENDU") return { ouverte: false, libelle: "Suspendue", joursEssai: null };
  if (e.statut === "ESSAI" && e.finEssai) {
    const jours = Math.ceil((e.finEssai.getTime() - maintenant.getTime()) / JOUR_MS);
    if (jours <= 0) return { ouverte: false, libelle: "Essai terminé", joursEssai: 0 };
    return { ouverte: true, libelle: "Essai, " + jours + " jour" + (jours > 1 ? "s" : "") + " restant" + (jours > 1 ? "s" : ""), joursEssai: jours };
  }
  if (e.statut === "ESSAI") return { ouverte: true, libelle: "Essai", joursEssai: null };
  return { ouverte: true, libelle: "Active", joursEssai: null };
}

export function finEssaiDans(jours: number, depuis = new Date()): Date {
  return new Date(depuis.getTime() + jours * JOUR_MS);
}

// Administrateurs de la plateforme : e-mails de ADMINS_PLATEFORME, separes par des virgules
export function estAdministrateurPlateforme(email: string | null | undefined): boolean {
  if (!email) return false;
  const liste = (process.env.ADMINS_PLATEFORME ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  return liste.includes(email.trim().toLowerCase());
}
