"use server";

import { revalidatePath } from "next/cache";
import { ecole } from "@/lib/data/ecole";
import { requirePermission } from "@/lib/auth/session";
import { verifierClasse } from "@/lib/data/guard";
import { enregistrerAudit } from "@/lib/audit";
import { capter } from "@/lib/actions/serveur";
import { aujourdhui, jourUtc, STATUTS, type StatutPresenceT } from "@/lib/presences/presences";

export type LignePresence = {
  eleveId: string;
  statut: StatutPresenceT;
  justifie: boolean;
  motif: string;
  dureeMinutes: number | null;
};

// Appel d'une classe pour un jour : remplace la saisie existante de chaque eleve
export async function enregistrerPresences(classeId: string, jour: string, lignes: LignePresence[]) {
  return capter(async () => {
    const user = await requirePermission("presence.manage");
    const db = ecole(user);
    await verifierClasse(user, classeId);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(jour) || Number.isNaN(Date.parse(jour + "T00:00:00Z"))) throw new Error("Date invalide");
    if (jour > aujourdhui()) throw new Error("Impossible de faire l'appel d'un jour à venir");
    if (lignes.length === 0) throw new Error("Aucun élève à enregistrer");

    // Seuls les eleves inscrits dans cette classe
    const inscrits = await db.eleve.findMany({
      where: { classeId, etablissementId: user.etablissementId, statut: "INSCRIT", id: { in: lignes.map((l) => l.eleveId) } },
      select: { id: true },
    });
    const valides = new Set(inscrits.map((e) => e.id));
    const date = jourUtc(jour);

    const ops = lignes
      .filter((l) => valides.has(l.eleveId))
      .map((l) => {
        if (!STATUTS.includes(l.statut)) throw new Error("Statut invalide");
        const present = l.statut === "PRESENT";
        const duree = l.statut === "RETARD" && l.dureeMinutes && l.dureeMinutes > 0 ? Math.min(Math.round(l.dureeMinutes), 600) : null;
        const data = {
          classeId,
          statut: l.statut,
          justifie: present ? false : !!l.justifie,
          motif: present ? null : String(l.motif ?? "").trim().slice(0, 200) || null,
          dureeMinutes: duree,
          saisieParId: user.id,
        };
        return db.presence.upsert({
          where: { eleveId_date: { eleveId: l.eleveId, date } },
          create: { eleveId: l.eleveId, date, ...data },
          update: data,
        });
      });
    await db.$transaction(ops);

    const absents = lignes.filter((l) => l.statut === "ABSENT").length;
    const retards = lignes.filter((l) => l.statut === "RETARD").length;
    await enregistrerAudit({
      userId: user.id,
      action: "APPEL_PRESENCES",
      entite: "Classe",
      entiteId: classeId,
      details: { jour, eleves: ops.length, absents, retards },
    });
    revalidatePath("/presences");
    return { enregistres: ops.length, absents, retards };
  });
}
