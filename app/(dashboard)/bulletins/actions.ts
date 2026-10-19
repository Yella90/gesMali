"use server";

import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { enregistrerAudit } from "@/lib/audit";
import { calculerMoyennesEleve } from "@/lib/notes/calculs";
import { revalidatePath } from "next/cache";
import { capter } from "@/lib/actions/serveur";

async function genererBulletinsClasseCorps(classeId: string, trimestreId: string) {
  const user = await requirePermission("bulletin.generate");

  const trimestre = await prisma.trimestre.findUnique({
    where: { id: trimestreId },
    include: { anneeScolaire: true },
  });
  if (!trimestre) throw new Error("Trimestre introuvable");
  if (trimestre.anneeScolaire.etablissementId !== user.etablissementId) {
    throw new Error("Acces refuse");
  }

  const classe = await prisma.classe.findUnique({ where: { id: classeId } });
  if (!classe || classe.etablissementId !== user.etablissementId) {
    throw new Error("Classe introuvable");
  }

  // Lire les parametres de l'etablissement
  const params = await prisma.parametresEtablissement.findUnique({
    where: { etablissementId: user.etablissementId },
  });
  const pondDevoirs = params?.ponderationDevoirs ?? 0.333;
  const pondCompo = params?.ponderationCompo ?? 0.667;
  const validationObligatoire = params?.validationObligatoire ?? false;

  const eleves = await prisma.eleve.findMany({
    where: { classeId, statut: "INSCRIT" },
    include: {
      notes: {
        where: { trimestreId },
        select: { matiereId: true, type: true, numero: true, valeur: true, statut: true },
      },
    },
  });
  if (eleves.length === 0) throw new Error("Aucun eleve inscrit");

  // Verifier validation obligatoire
  if (validationObligatoire) {
    const notesNonValidees: { eleve: string; matiere: string; statut: string }[] = [];
    for (const e of eleves) {
      for (const n of e.notes) {
        if (n.valeur != null && n.statut !== "VALIDEE" && n.statut !== "VERROUILLEE") {
          notesNonValidees.push({ eleve: e.nom + " " + e.prenom, matiere: n.matiereId, statut: n.statut });
        }
      }
    }
    if (notesNonValidees.length > 0) {
      throw new Error(
        "La validation obligatoire est activee. " + notesNonValidees.length +
        " note(s) ne sont pas encore validées. Validez-les avant de generer les bulletins."
      );
    }
  }

  const matieres = await prisma.matiere.findMany({
    where: { etablissementId: user.etablissementId, cycle: classe.cycle },
    select: { id: true, nom: true, coefficient: true },
  });
  if (matieres.length === 0) throw new Error("Aucune matiere pour ce cycle");

  // 1. Calcul par eleve avec la ponderation configuree
  const resultats = eleves.map((e) => {
    const notesPourCalcul = e.notes.map((n) => ({
      matiereId: n.matiereId,
      type: n.type,
      numero: n.numero,
      valeur: n.valeur,
    }));
    const calc = calculerMoyennesEleve(notesPourCalcul, matieres, pondDevoirs, pondCompo);
    return { eleve: e, ...calc };
  });

  const classement = [...resultats].sort((a, b) => b.moyenneGenerale - a.moyenneGenerale);
  const effectif = classement.length;

  const moyennesGeneralClasse = classement.map((r) => r.moyenneGenerale);
  const moyenneClasse = moyennesGeneralClasse.reduce((s, v) => s + v, 0) / effectif;
  const moyennePlusForte = Math.max(...moyennesGeneralClasse);
  const moyennePlusFaible = Math.min(...moyennesGeneralClasse);

  const moyennesClasseParMatiere = new Map<string, number>();
  for (const m of matieres) {
    const moyennes = classement
      .map((r) => r.lignes.find((l) => l.matiereId === m.id)?.moyenne)
      .filter((v): v is number => v != null);
    if (moyennes.length > 0) {
      moyennesClasseParMatiere.set(
        m.id,
        Number((moyennes.reduce((s, v) => s + v, 0) / moyennes.length).toFixed(2))
      );
    }
  }

  const rangsParMatiere = new Map<string, Map<string, number>>();
  for (const m of matieres) {
    const avecNote = classement
      .map((r) => ({
        eleveId: r.eleve.id,
        moyenne: r.lignes.find((l) => l.matiereId === m.id)?.moyenne ?? null,
      }))
      .filter((x) => x.moyenne != null)
      .sort((a, b) => (b.moyenne ?? 0) - (a.moyenne ?? 0));
    const map = new Map<string, number>();
    avecNote.forEach((x, i) => map.set(x.eleveId, i + 1));
    rangsParMatiere.set(m.id, map);
  }

  await prisma.bulletin.deleteMany({ where: { classeId, trimestreId } });

  const bulletinsData = classement.map((r, i) => ({
    eleveId: r.eleve.id,
    trimestreId,
    classeId,
    moyenneGenerale: r.moyenneGenerale,
    moyenneClasse: Number(moyenneClasse.toFixed(2)),
    moyennePlusForte: Number(moyennePlusForte.toFixed(2)),
    moyennePlusFaible: Number(moyennePlusFaible.toFixed(2)),
    totalPoints: r.totalPoints,
    totalCoeffs: r.totalCoeffs,
    rang: i + 1,
    effectifClasse: effectif,
    genereParId: user.id,
    lignes: r.lignes.map((l) => ({
      matiereId: l.matiereId,
      nomMatiere: l.nomMatiere,
      moyenneDevoirs: l.moyenneDevoirs,
      moyenneCompo: l.moyenneCompo,
      moyenneMatiere: l.moyenne,
      moyenneClasseMatiere: moyennesClasseParMatiere.get(l.matiereId) ?? null,
      coefficient: l.coefficient,
      points: l.points,
      rangMatiere: rangsParMatiere.get(l.matiereId)?.get(r.eleve.id) ?? null,
    })),
  }));

  await prisma.$transaction(
    async (tx) => {
      for (const data of bulletinsData) {
        await tx.bulletin.create({
          data: { ...data, lignes: { create: data.lignes } },
        });
      }
    },
    { timeout: 60000, maxWait: 15000 }
  );

  await enregistrerAudit({
    userId: user.id,
    action: "GENERER_BULLETINS",
    entite: "Bulletin",
    entiteId: classeId + "-" + trimestreId,
    details: {
      effectif,
      moyenneClasse: Number(moyenneClasse.toFixed(2)),
      pondDevoirs,
      pondCompo,
    },
  });

  revalidatePath("/bulletins");
  revalidatePath("/bulletins/classe/" + classeId + "/trimestre/" + trimestreId);
  return {
    success: true,
    effectif,
    moyenneClasse: Number(moyenneClasse.toFixed(2)),
    pondDevoirs,
    pondCompo,
  };
}

export async function supprimerBulletins(classeId: string, trimestreId: string) {
  const user = await requirePermission("bulletin.generate");
  const trimestre = await prisma.trimestre.findUnique({
    where: { id: trimestreId },
    include: { anneeScolaire: true },
  });
  if (!trimestre || trimestre.anneeScolaire.etablissementId !== user.etablissementId) {
    throw new Error("Acces refuse");
  }
  await prisma.bulletin.deleteMany({ where: { classeId, trimestreId } });
  await enregistrerAudit({
    userId: user.id,
    action: "SUPPRIMER_BULLETINS",
    entite: "Bulletin",
    entiteId: classeId + "-" + trimestreId,
  });
  revalidatePath("/bulletins");
}

// Actions appelees par le client : l'erreur metier est renvoyee au lieu d'etre levee,
// sinon Next la remplace par un message generique en production (voir lib/actions/serveur.ts)
export async function genererBulletinsClasse(...a: Parameters<typeof genererBulletinsClasseCorps>) {
  return capter(() => genererBulletinsClasseCorps(...a));
}
