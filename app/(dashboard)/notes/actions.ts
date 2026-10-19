"use server";

import { prisma } from "@/lib/db";
import { requireUtilisateur } from "@/lib/auth/session";
import { peut } from "@/lib/auth/permissions";
import { verifierClasse, verifierMatiere, verifierTrimestre } from "@/lib/data/guard";
import { enregistrerAudit } from "@/lib/audit";
import { peutSaisirSelonMode } from "@/lib/notes/peutSaisir";
import { revalidatePath } from "next/cache";
import { capter } from "@/lib/actions/serveur";

type TypeNote = "DEVOIR" | "COMPOSITION";

async function chargerElevesEtNotesCorps(params: {
  classeId: string;
  matiereId: string;
  trimestreId: string;
  type: TypeNote;
  numero: number;
}) {
  const user = await requireUtilisateur();
  await verifierClasse(user, params.classeId);
  await verifierMatiere(user, params.matiereId);
  await verifierTrimestre(user, params.trimestreId);

  const eleves = await prisma.eleve.findMany({
    where: { classeId: params.classeId, statut: "INSCRIT" },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });

  const notes = await prisma.note.findMany({
    where: {
      classeId: params.classeId,
      matiereId: params.matiereId,
      trimestreId: params.trimestreId,
      type: params.type,
      numero: params.numero,
    },
  });

  const noteMap = new Map(notes.map((n) => [n.eleveId, n]));

  return eleves.map((e) => {
    const note = noteMap.get(e.id);
    return {
      id: e.id,
      matricule: e.matricule,
      nom: e.nom,
      prenom: e.prenom,
      note: note
        ? {
            id: note.id,
            valeur: note.valeur,
            statut: note.statut,
            saisieParId: note.saisieParId,
          }
        : null,
    };
  });
}

async function enregistrerNotesCorps(data: {
  classeId: string;
  matiereId: string;
  trimestreId: string;
  type: TypeNote;
  numero: number;
  notes: { eleveId: string; valeur: number }[];
}) {
  const user = await requireUtilisateur();

  await verifierClasse(user, data.classeId);
  await verifierMatiere(user, data.matiereId);
  const trimestre = await verifierTrimestre(user, data.trimestreId);

  if (trimestre.cloture) throw new Error("Trimestre cloture");

  const paramsEtab = await prisma.parametresEtablissement.findUnique({
    where: { etablissementId: user.etablissementId },
  });
  if (!paramsEtab) throw new Error("Parametres etablissement manquants");
  if (!peutSaisirSelonMode(user.roles, paramsEtab.modeSaisieNotes)) {
    throw new Error("Le mode de saisie ne vous autorise pas");
  }

  const estDirecteur = user.roles.includes("DIRECTEUR");
  const estSecretaire = user.roles.includes("SECRETAIRE");
  const estEnseignant = user.roles.includes("ENSEIGNANT");

  let crees = 0;
  let modifies = 0;
  let ignores = 0;

  for (const n of data.notes) {
    const existante = await prisma.note.findUnique({
      where: {
        eleveId_matiereId_trimestreId_type_numero: {
          eleveId: n.eleveId,
          matiereId: data.matiereId,
          trimestreId: data.trimestreId,
          type: data.type,
          numero: data.numero,
        },
      },
    });

    if (existante) {
      if (estDirecteur) {
        await prisma.note.update({
          where: { id: existante.id },
          data: { valeur: n.valeur, modifieeParId: user.id, modifieeLe: new Date() },
        });
        modifies++;
        continue;
      }

      if (estSecretaire && ["BROUILLON", "SOUMISE"].includes(existante.statut)) {
        await prisma.note.update({
          where: { id: existante.id },
          data: { valeur: n.valeur, modifieeParId: user.id, modifieeLe: new Date() },
        });
        modifies++;
        continue;
      }

      if (
        estEnseignant &&
        existante.saisieParId === user.id &&
        existante.statut === "BROUILLON"
      ) {
        await prisma.note.update({
          where: { id: existante.id },
          data: { valeur: n.valeur, modifieeParId: user.id, modifieeLe: new Date() },
        });
        modifies++;
        continue;
      }

      ignores++;
      continue;
    }

    await prisma.note.create({
      data: {
        eleveId: n.eleveId,
        matiereId: data.matiereId,
        classeId: data.classeId,
        trimestreId: data.trimestreId,
        type: data.type,
        numero: data.numero,
        valeur: n.valeur,
        saisieParId: user.id,
        statut: "BROUILLON",
      },
    });
    crees++;
  }

  await enregistrerAudit({
    userId: user.id,
    action: "ENREGISTRER_NOTES",
    entite: "Note",
    entiteId: data.classeId + "-" + data.matiereId + "-" + data.type + "-" + data.numero,
    details: { crees, modifies, ignores },
  });

  revalidatePath("/notes");
  return { success: true, crees, modifies, ignores };
}

export async function soumettreNotes(params: {
  classeId: string;
  matiereId: string;
  trimestreId: string;
  type: TypeNote;
  numero: number;
}) {
  const user = await requireUtilisateur();
  await verifierClasse(user, params.classeId);
  await verifierTrimestre(user, params.trimestreId);

  const resultat = await prisma.note.updateMany({
    where: {
      classeId: params.classeId,
      matiereId: params.matiereId,
      trimestreId: params.trimestreId,
      type: params.type,
      numero: params.numero,
      statut: "BROUILLON",
    },
    data: { statut: "SOUMISE" },
  });

  await enregistrerAudit({
    userId: user.id,
    action: "SOUMETTRE_NOTES",
    entite: "Note",
    entiteId: params.classeId + "-" + params.matiereId,
    details: { nombre: resultat.count },
  });

  revalidatePath("/notes");
  return { success: true, nombre: resultat.count };
}

export async function validerNotes(params: {
  classeId: string;
  matiereId: string;
  trimestreId: string;
  type: TypeNote;
  numero: number;
}) {
  const user = await requireUtilisateur();
  if (!peut(user.roles, "note.validate")) throw new Error("Permission refusee");
  await verifierClasse(user, params.classeId);
  await verifierTrimestre(user, params.trimestreId);

  const resultat = await prisma.note.updateMany({
    where: {
      classeId: params.classeId,
      matiereId: params.matiereId,
      trimestreId: params.trimestreId,
      type: params.type,
      numero: params.numero,
      statut: "SOUMISE",
    },
    data: { statut: "VALIDEE" },
  });

  await enregistrerAudit({
    userId: user.id,
    action: "VALIDER_NOTES",
    entite: "Note",
    entiteId: params.classeId + "-" + params.matiereId,
    details: { nombre: resultat.count },
  });

  revalidatePath("/notes");
  return { success: true, nombre: resultat.count };
}

// Actions appelees par le client : l'erreur metier est renvoyee au lieu d'etre levee,
// sinon Next la remplace par un message generique en production (voir lib/actions/serveur.ts)
export async function chargerElevesEtNotes(...a: Parameters<typeof chargerElevesEtNotesCorps>) {
  return capter(() => chargerElevesEtNotesCorps(...a));
}
export async function enregistrerNotes(...a: Parameters<typeof enregistrerNotesCorps>) {
  return capter(() => enregistrerNotesCorps(...a));
}
