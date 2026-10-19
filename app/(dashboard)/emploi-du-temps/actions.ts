"use server";

import { revalidatePath } from "next/cache";
import { ecole } from "@/lib/data/ecole";
import { requirePermission, type UtilisateurCourant } from "@/lib/auth/session";
import { enregistrerAudit } from "@/lib/audit";
import { capter } from "@/lib/actions/serveur";
import { FORMAT_HEURE, estEnseignant, estJour, type DonneesCreneau } from "@/lib/emploi-du-temps/creneaux";
import { conflitCreneau } from "@/lib/emploi-du-temps/conflits";

// Planification depuis la grille d'une classe : un creneau est une Affectation
// avec jour et heures. Seules les classes de l'annee active sont modifiables.

async function classeModifiable(user: UtilisateurCourant, classeId: string) {
  const db = ecole(user);
  const classe = await db.classe.findUnique({
    where: { id: classeId },
    select: { id: true, etablissementId: true, cycle: true, anneeScolaireId: true, anneeScolaire: { select: { active: true } } },
  });
  if (!classe || classe.etablissementId !== user.etablissementId) throw new Error("Classe introuvable");
  if (!classe.anneeScolaire.active) {
    throw new Error("Cette classe appartient à une année scolaire archivée : son emploi du temps n'est plus modifiable");
  }
  return classe;
}

function lireCreneau(d: DonneesCreneau) {
  const texte = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const c = {
    jour: texte(d?.jour),
    heureDebut: texte(d?.heureDebut),
    heureFin: texte(d?.heureFin),
    matiereId: texte(d?.matiereId),
    enseignantId: texte(d?.enseignantId),
  };
  if (!estJour(c.jour)) throw new Error("Choisissez le jour du cours");
  if (!FORMAT_HEURE.test(c.heureDebut) || !FORMAT_HEURE.test(c.heureFin)) {
    throw new Error("Indiquez l'heure de début et l'heure de fin");
  }
  if (c.heureFin <= c.heureDebut) throw new Error("L'heure de fin doit être après l'heure de début");
  return c;
}

async function verifierMatiere(user: UtilisateurCourant, classe: { cycle: string }, matiereId: string) {
  const db = ecole(user);
  if (!matiereId) throw new Error("Choisissez la matière");
  const m = await db.matiere.findUnique({ where: { id: matiereId }, select: { etablissementId: true, cycle: true } });
  if (!m || m.etablissementId !== user.etablissementId) throw new Error("Matière introuvable");
  if (m.cycle !== classe.cycle) throw new Error("Cette matière n'est pas au programme du cycle de la classe");
}

// nouveau : l'enseignant est choisi pour ce cours, il doit etre un enseignant actif
async function chargerEnseignant(user: UtilisateurCourant, enseignantId: string, nouveau: boolean) {
  const db = ecole(user);
  if (!enseignantId) throw new Error("Choisissez l'enseignant");
  const e = await db.employe.findUnique({
    where: { id: enseignantId },
    select: { etablissementId: true, nom: true, prenom: true, actif: true, poste: true, user: { select: { roles: true } } },
  });
  if (!e || e.etablissementId !== user.etablissementId) throw new Error("Enseignant introuvable");
  const nom = e.nom + " " + e.prenom;
  if (nouveau && !e.actif) throw new Error(nom + " n'est plus en activité");
  if (nouveau && !estEnseignant(e)) throw new Error(nom + " n'est pas enseignant");
  return nom;
}

function revalider(classeId: string, enseignantIds: string[]) {
  revalidatePath("/emploi-du-temps");
  revalidatePath("/emploi-du-temps/" + classeId);
  revalidatePath("/classes/" + classeId);
  for (const id of new Set(enseignantIds)) revalidatePath("/personnel/" + id);
}

async function creerCreneauCorps(classeId: string, donnees: DonneesCreneau) {
  const admin = await requirePermission("personnel.manage");
  const db = ecole(admin);
  const classe = await classeModifiable(admin, classeId);
  const c = lireCreneau(donnees);
  await verifierMatiere(admin, classe, c.matiereId);
  const nom = await chargerEnseignant(admin, c.enseignantId, true);

  const conflit = await conflitCreneau(classe, c, nom);
  if (conflit) throw new Error(conflit);

  // L'affectation sans horaire de cet enseignant pour cette matiere recoit le creneau
  const sansHoraire = await db.affectation.findFirst({
    where: {
      classeId,
      enseignantId: c.enseignantId,
      matiereId: c.matiereId,
      type: "PROFESSEUR_MATIERE",
      OR: [{ jour: null }, { heureDebut: null }, { heureFin: null }],
    },
    select: { id: true },
  });
  const horaire = { jour: c.jour, heureDebut: c.heureDebut, heureFin: c.heureFin };
  const aff = sansHoraire
    ? await db.affectation.update({ where: { id: sansHoraire.id }, data: horaire })
    : await db.affectation.create({
        data: { classeId, enseignantId: c.enseignantId, matiereId: c.matiereId, type: "PROFESSEUR_MATIERE", ...horaire },
      });

  await enregistrerAudit({
    userId: admin.id,
    action: "CREATE_AFFECTATION",
    entite: "Affectation",
    entiteId: aff.id,
    details: { classeId, ...c, depuis: "emploi-du-temps" },
  });

  revalider(classeId, [c.enseignantId]);
  return { id: aff.id };
}

async function modifierCreneauCorps(affectationId: string, donnees: DonneesCreneau) {
  const admin = await requirePermission("personnel.manage");
  const db = ecole(admin);
  const aff = await db.affectation.findUnique({
    where: { id: affectationId },
    select: { id: true, classeId: true, enseignantId: true, matiereId: true, type: true, jour: true, heureDebut: true, heureFin: true },
  });
  if (!aff) throw new Error("Créneau introuvable");
  const classe = await classeModifiable(admin, aff.classeId);
  const c = lireCreneau(donnees);

  // Titulariat : seul l'horaire change ici, le titulaire se gere depuis la fiche de l'enseignant
  const titulariat = aff.type === "TITULAIRE";
  if (titulariat) {
    c.enseignantId = aff.enseignantId;
    c.matiereId = aff.matiereId ?? "";
  } else {
    await verifierMatiere(admin, classe, c.matiereId);
  }
  const nom = await chargerEnseignant(admin, c.enseignantId, c.enseignantId !== aff.enseignantId);

  const conflit = await conflitCreneau(classe, c, nom, aff.id);
  if (conflit) throw new Error(conflit);

  await db.affectation.update({
    where: { id: aff.id },
    data: {
      jour: c.jour,
      heureDebut: c.heureDebut,
      heureFin: c.heureFin,
      ...(titulariat ? {} : { enseignantId: c.enseignantId, matiereId: c.matiereId }),
    },
  });

  await enregistrerAudit({
    userId: admin.id,
    action: "UPDATE_AFFECTATION",
    entite: "Affectation",
    entiteId: aff.id,
    details: {
      avant: { enseignantId: aff.enseignantId, matiereId: aff.matiereId, jour: aff.jour, heureDebut: aff.heureDebut, heureFin: aff.heureFin },
      apres: c,
      depuis: "emploi-du-temps",
    },
  });

  revalider(aff.classeId, [aff.enseignantId, c.enseignantId]);
  return { id: aff.id };
}

async function supprimerCreneauCorps(affectationId: string) {
  const admin = await requirePermission("personnel.manage");
  const db = ecole(admin);
  const aff = await db.affectation.findUnique({
    where: { id: affectationId },
    select: { id: true, classeId: true, enseignantId: true, matiereId: true, type: true, jour: true, heureDebut: true, heureFin: true },
  });
  if (!aff) throw new Error("Créneau introuvable");
  await classeModifiable(admin, aff.classeId);

  await db.affectation.delete({ where: { id: aff.id } });

  await enregistrerAudit({
    userId: admin.id,
    action: "DELETE_AFFECTATION",
    entite: "Affectation",
    entiteId: aff.id,
    details: { ...aff, depuis: "emploi-du-temps" },
  });

  revalider(aff.classeId, [aff.enseignantId]);
  return { id: aff.id };
}

// Actions appelees par le client : l'erreur metier est renvoyee au lieu d'etre levee,
// sinon Next la remplace par un message generique en production (voir lib/actions/serveur.ts)
export async function creerCreneau(...a: Parameters<typeof creerCreneauCorps>) {
  return capter(() => creerCreneauCorps(...a));
}
export async function modifierCreneau(...a: Parameters<typeof modifierCreneauCorps>) {
  return capter(() => modifierCreneauCorps(...a));
}
export async function supprimerCreneau(...a: Parameters<typeof supprimerCreneauCorps>) {
  return capter(() => supprimerCreneauCorps(...a));
}
