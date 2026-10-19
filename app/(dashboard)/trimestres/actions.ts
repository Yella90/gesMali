"use server";

import { ecole } from "@/lib/data/ecole";
import { requirePermission } from "@/lib/auth/session";
import { enregistrerAudit } from "@/lib/audit";
import { trimestreSchema, anneeScolaireSchema } from "@/lib/validators/trimestre";
import { revalidatePath } from "next/cache";
import { capter } from "@/lib/actions/serveur";

async function creerAnneeCorps(formData: FormData) {
  const user = await requirePermission("trimestre.manage");
  const db = ecole(user);
  const raw = {
    libelle: formData.get("libelle"),
    dateDebut: formData.get("dateDebut"),
    dateFin: formData.get("dateFin"),
  };
  const data = anneeScolaireSchema.parse(raw);
  if (data.dateFin <= data.dateDebut) throw new Error("Date de fin doit etre apres la date de debut");

  const annee = await db.anneeScolaire.create({
    data: { ...data, etablissementId: user.etablissementId },
  });
  await enregistrerAudit({ userId: user.id, action: "CREATE_ANNEE", entite: "AnneeScolaire", entiteId: annee.id });
  revalidatePath("/trimestres");
  return { success: true };
}

async function creerTrimestreCorps(formData: FormData) {
  const user = await requirePermission("trimestre.manage");
  const db = ecole(user);
  const raw = {
    anneeScolaireId: formData.get("anneeScolaireId"),
    nom: formData.get("nom"),
    ordre: formData.get("ordre"),
    dateDebut: formData.get("dateDebut"),
    dateFin: formData.get("dateFin") || null,
  };
  const data = trimestreSchema.parse(raw);

  const annee = await db.anneeScolaire.findUnique({ where: { id: data.anneeScolaireId } });
  if (!annee || annee.etablissementId !== user.etablissementId) throw new Error("Annee invalide");

  const trimestre = await db.trimestre.create({ data });
  await enregistrerAudit({ userId: user.id, action: "CREATE_TRIMESTRE", entite: "Trimestre", entiteId: trimestre.id });
  revalidatePath("/trimestres");
  return { success: true };
}

async function cloturerTrimestreCorps(id: string) {
  const user = await requirePermission("note.lock");
  const db = ecole(user);
  const t = await db.trimestre.findUnique({
    where: { id },
    include: { anneeScolaire: true },
  });
  if (!t || t.anneeScolaire.etablissementId !== user.etablissementId) throw new Error("Acces refuse");

  await db.$transaction(async (tx) => {
    await tx.note.updateMany({
      where: { trimestreId: id, statut: { in: ["BROUILLON", "SOUMISE", "VALIDEE"] } },
      data: { statut: "VERROUILLEE" },
    });
    await tx.trimestre.update({ where: { id }, data: { cloture: true } });
  });

  await enregistrerAudit({ userId: user.id, action: "CLOTURER_TRIMESTRE", entite: "Trimestre", entiteId: id });
  revalidatePath("/trimestres");
}
async function modifierTrimestreCorps(
  id: string,
  data: {
    nom: string;
    ordre: number;
    dateDebut: string;
    dateFin: string | null;
  }
) {
  const user = await requirePermission("trimestre.manage");
  const db = ecole(user);

  const trimestre = await db.trimestre.findUnique({
    where: { id },
    include: { anneeScolaire: true },
  });
  if (!trimestre || trimestre.anneeScolaire.etablissementId !== user.etablissementId) {
    throw new Error("Acces refuse");
  }
  if (trimestre.cloture) throw new Error("Trimestre cloture. Deverrouillez avant de modifier.");

  if (!data.nom || data.nom.trim().length < 2) throw new Error("Nom trop court");
  if (data.ordre < 1 || data.ordre > 3) throw new Error("Ordre invalide (1-3)");

  const debut = new Date(data.dateDebut);
  if (isNaN(debut.getTime())) throw new Error("Date de debut invalide");

  let fin: Date | null = null;
  if (data.dateFin) {
    fin = new Date(data.dateFin);
    if (isNaN(fin.getTime())) throw new Error("Date de fin invalide");
    if (fin <= debut) throw new Error("La date de fin doit etre apres la date de debut");
  }

  // Verifier chevauchement avec les autres trimestres de la meme annee
  const autres = await db.trimestre.findMany({
    where: {
      anneeScolaireId: trimestre.anneeScolaireId,
      id: { not: id },
    },
  });

  for (const t of autres) {
    const tDebut = new Date(t.dateDebut);
    const tFin = t.dateFin ? new Date(t.dateFin) : null;

    // Chevauchement si (debutA <= finB) ET (finA >= debutB)
    if (fin) {
      if (tFin) {
        if (debut <= tFin && fin >= tDebut) {
          throw new Error(
            "Chevauchement avec " + t.nom + " (" +
            tDebut.toLocaleDateString("fr-FR") + " - " + tFin.toLocaleDateString("fr-FR") + ")"
          );
        }
      } else {
        if (debut <= tDebut && fin >= tDebut) {
          throw new Error("Chevauchement avec " + t.nom);
        }
      }
    } else {
      if (tFin && debut <= tFin) {
        throw new Error("Chevauchement avec " + t.nom);
      }
    }
  }

  await db.trimestre.update({
    where: { id },
    data: {
      nom: data.nom.trim(),
      ordre: data.ordre,
      dateDebut: debut,
      dateFin: fin,
    },
  });

  await enregistrerAudit({
    userId: user.id,
    action: "UPDATE_TRIMESTRE",
    entite: "Trimestre",
    entiteId: id,
    details: { nom: data.nom, dateDebut: data.dateDebut, dateFin: data.dateFin },
  });

  revalidatePath("/trimestres");
  revalidatePath("/trimestres/" + id);
  return { success: true };
}

// Actions appelees par le client : l'erreur metier est renvoyee au lieu d'etre levee,
// sinon Next la remplace par un message generique en production (voir lib/actions/serveur.ts)
export async function creerAnnee(...a: Parameters<typeof creerAnneeCorps>) {
  return capter(() => creerAnneeCorps(...a));
}
export async function creerTrimestre(...a: Parameters<typeof creerTrimestreCorps>) {
  return capter(() => creerTrimestreCorps(...a));
}
export async function cloturerTrimestre(...a: Parameters<typeof cloturerTrimestreCorps>) {
  return capter(() => cloturerTrimestreCorps(...a));
}
export async function modifierTrimestre(...a: Parameters<typeof modifierTrimestreCorps>) {
  return capter(() => modifierTrimestreCorps(...a));
}
