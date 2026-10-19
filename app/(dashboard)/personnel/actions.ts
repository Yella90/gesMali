"use server";

import { ecole } from "@/lib/data/ecole";
import { emailDejaUtilise, requirePermission } from "@/lib/auth/session";
import { ouvrirAcces, reinitialiserMotDePasse, retirerAcces, roleValide } from "@/lib/auth/comptes";
import { enregistrerAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { capter } from "@/lib/actions/serveur";

const POSTES_VALIDES = [
  "Directeur",
  "Enseignant",
  "Secretaire",
  "Comptable",
  "Surveillant",
  "Gardien",
  "Autre",
];

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CREER UN EMPLOYE (+ compte optionnel)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function creerEmployeCorps(formData: FormData) {
  const admin = await requirePermission("personnel.manage");
  const db = ecole(admin);

  const nom = (formData.get("nom") as string)?.trim();
  const prenom = (formData.get("prenom") as string)?.trim();
  const telephone = (formData.get("telephone") as string)?.trim() || null;
  const poste = formData.get("poste") as string;
  const posteLibre = (formData.get("posteLibre") as string)?.trim() || null;
  const salaireRefRaw = formData.get("salaireReference") as string;
  const typeRemu = (formData.get("typeRemuneration") as string) || null;

  const creerCompte = formData.get("creerCompte") === "on";
  const email = (formData.get("email") as string)?.trim().toLowerCase() || null;
  const motDePasse = (formData.get("motDePasse") as string) || "";
  const role = (formData.get("role") as string) || "ENSEIGNANT";

  if (!nom || nom.length < 2) throw new Error("Nom trop court");
  if (!prenom || prenom.length < 2) throw new Error("Prenom trop court");
  if (!POSTES_VALIDES.includes(poste)) throw new Error("Poste invalide");
  if (poste === "Autre" && (!posteLibre || posteLibre.length < 2)) {
    throw new Error("Precisez le poste libre");
  }

  // Compte : verifie avant de creer la fiche. Un e-mail deja utilise (la meme personne
  // dans une autre ecole) recoit l'acces a cette ecole et garde son mot de passe.
  if (creerCompte) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email invalide");
    if (!roleValide(role)) throw new Error("Role invalide");
    if (!(await emailDejaUtilise(email)) && motDePasse.length < 6) throw new Error("Mot de passe : 6 caracteres minimum");
  }

  const salaireReference = salaireRefRaw ? Number(salaireRefRaw) : null;

  const employe = await db.employe.create({
    data: {
      etablissementId: admin.etablissementId,
      nom,
      prenom,
      telephone,
      poste,
      posteLibre: poste === "Autre" ? posteLibre : null,
      salaireReference,
      typeRemuneration: typeRemu,
    },
  });

  const compte = creerCompte && email
    ? await ouvrirAcces({ etablissementId: admin.etablissementId, employeId: employe.id, email, motDePasse, role })
    : null;

  await enregistrerAudit({
    userId: admin.id,
    action: "CREATE_EMPLOYE",
    entite: "Employe",
    entiteId: employe.id,
    details: {
      nom,
      prenom,
      poste,
      compte: compte ? email : null,
      compteExistant: compte?.compteExistant ?? null,
      role: compte ? role : null,
    },
  });

  revalidatePath("/personnel");
  return { success: true, id: employe.id, compteExistant: compte?.compteExistant ?? false };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MODIFIER UN EMPLOYE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function modifierEmployeCorps(employeId: string, formData: FormData) {
  const admin = await requirePermission("personnel.manage");
  const db = ecole(admin);

  const cible = await db.employe.findUnique({ where: { id: employeId } });
  if (!cible || cible.etablissementId !== admin.etablissementId) {
    throw new Error("Acces refuse");
  }

  const nom = (formData.get("nom") as string)?.trim();
  const prenom = (formData.get("prenom") as string)?.trim();
  const telephone = (formData.get("telephone") as string)?.trim() || null;
  const poste = formData.get("poste") as string;
  const posteLibre = (formData.get("posteLibre") as string)?.trim() || null;
  const salaireRefRaw = formData.get("salaireReference") as string;
  const typeRemu = (formData.get("typeRemuneration") as string) || null;
  const actif = formData.get("actif") === "on";

  if (!nom || nom.length < 2) throw new Error("Nom trop court");
  if (!prenom || prenom.length < 2) throw new Error("Prenom trop court");
  if (!POSTES_VALIDES.includes(poste)) throw new Error("Poste invalide");

  // Garde-fou : ne pas se desactiver soi-meme
  if (cible.id === admin.employeId && !actif) {
    throw new Error("Vous ne pouvez pas desactiver votre propre fiche");
  }

  const salaireReference = salaireRefRaw ? Number(salaireRefRaw) : null;

  await db.$transaction(async (tx) => {
    await tx.employe.update({
      where: { id: employeId },
      data: {
        nom,
        prenom,
        telephone,
        poste,
        posteLibre: poste === "Autre" ? posteLibre : null,
        salaireReference,
        typeRemuneration: typeRemu,
        actif,
        dateSortie: actif ? null : new Date(),
      },
    });

    // Acces a l'application dans cette ecole : suit l'activite de la fiche
    await tx.acces.updateMany({ where: { employeId }, data: { actif } });
  });

  await enregistrerAudit({
    userId: admin.id,
    action: "UPDATE_EMPLOYE",
    entite: "Employe",
    entiteId: employeId,
    details: { nom, prenom, poste, actif },
  });

  revalidatePath("/personnel");
  revalidatePath("/personnel/" + employeId);
  return { success: true };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// DESACTIVER UN EMPLOYE (soft delete)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export async function desactiverEmploye(employeId: string) {
  const admin = await requirePermission("personnel.manage");
  const db = ecole(admin);

  const cible = await db.employe.findUnique({ where: { id: employeId } });
  if (!cible || cible.etablissementId !== admin.etablissementId) {
    throw new Error("Acces refuse");
  }
  if (cible.id === admin.employeId) {
    throw new Error("Vous ne pouvez pas vous desactiver vous-meme");
  }

  await db.$transaction(async (tx) => {
    await tx.employe.update({
      where: { id: employeId },
      data: { actif: false, dateSortie: new Date() },
    });
    await tx.acces.updateMany({ where: { employeId }, data: { actif: false } });
  });

  await enregistrerAudit({
    userId: admin.id,
    action: "DESACTIVER_EMPLOYE",
    entite: "Employe",
    entiteId: employeId,
  });

  revalidatePath("/personnel");
  revalidatePath("/personnel/" + employeId);
  return { success: true };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CREER UN COMPTE POUR UN EMPLOYE EXISTANT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function creerCompteCorps(employeId: string, formData: FormData) {
  const admin = await requirePermission("personnel.manage");
  const db = ecole(admin);

  const employe = await db.employe.findUnique({ where: { id: employeId } });
  if (!employe || employe.etablissementId !== admin.etablissementId) {
    throw new Error("Acces refuse");
  }

  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();
  const motDePasse = (formData.get("motDePasse") as string) || "";
  const role = formData.get("role") as string;

  const compte = await ouvrirAcces({ etablissementId: admin.etablissementId, employeId, email, motDePasse, role });

  await enregistrerAudit({
    userId: admin.id,
    action: "CREATE_COMPTE",
    entite: "User",
    entiteId: employeId,
    details: { email, role, employe: employe.nom + " " + employe.prenom, compteExistant: compte.compteExistant },
  });

  revalidatePath("/personnel");
  revalidatePath("/personnel/" + employeId);
  return { success: true, compteExistant: compte.compteExistant };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SUPPRIMER LE COMPTE (garde la fiche Employe)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function supprimerCompteCorps(employeId: string) {
  const admin = await requirePermission("personnel.manage");
  if (employeId === admin.employeId) {
    throw new Error("Vous ne pouvez pas supprimer votre propre compte");
  }

  // L'acces a cette ecole est retire ; le compte reste s'il sert ailleurs ou a un historique
  const r = await retirerAcces(admin.etablissementId, employeId);

  await enregistrerAudit({
    userId: admin.id,
    action: "DELETE_COMPTE",
    entite: "User",
    entiteId: employeId,
    details: { email: r.email, compteSupprime: r.compteSupprime },
  });

  revalidatePath("/personnel");
  revalidatePath("/personnel/" + employeId);
  return { success: true };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CHANGER MOT DE PASSE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function changerMotDePasseCorps(employeId: string, nouveauMotDePasse: string) {
  const admin = await requirePermission("personnel.manage");
  await reinitialiserMotDePasse(admin.etablissementId, employeId, nouveauMotDePasse);

  await enregistrerAudit({
    userId: admin.id,
    action: "CHANGER_MOT_DE_PASSE",
    entite: "User",
    entiteId: employeId,
  });

  return { success: true };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// AFFECTATIONS (inchangees dans le principe, mais pointent vers Employe)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function creerAffectationCorps(formData: FormData) {
  const admin = await requirePermission("personnel.manage");
  const db = ecole(admin);

  const enseignantId = formData.get("enseignantId") as string;
  const classeId = formData.get("classeId") as string;
  const matiereId = (formData.get("matiereId") as string) || null;
  const type = formData.get("type") as "TITULAIRE" | "PROFESSEUR_MATIERE";
  const jour = (formData.get("jour") as string) || null;
  const heureDebut = (formData.get("heureDebut") as string) || null;
  const heureFin = (formData.get("heureFin") as string) || null;

  if (!enseignantId || !classeId) throw new Error("Enseignant et classe obligatoires");
  if (type === "PROFESSEUR_MATIERE" && !matiereId) {
    throw new Error("Matiere obligatoire pour un professeur de matiere");
  }

  // Validation du creneau horaire
  if (jour && (!heureDebut || !heureFin)) {
    throw new Error("Heure debut et fin obligatoires si un jour est choisi");
  }
  if (heureDebut && heureFin && heureDebut >= heureFin) {
    throw new Error("L'heure de fin doit etre apres l'heure de debut");
  }

  const [employe, classe] = await Promise.all([
    db.employe.findUnique({ where: { id: enseignantId } }),
    db.classe.findUnique({ where: { id: classeId } }),
  ]);

  if (!employe || employe.etablissementId !== admin.etablissementId) {
    throw new Error("Employe introuvable");
  }
  if (!classe || classe.etablissementId !== admin.etablissementId) {
    throw new Error("Classe introuvable");
  }

  // Verifier les doublons (meme prof + classe + matiere + jour + heure)
  if (jour && heureDebut && heureFin) {
    const existante = await db.affectation.findFirst({
      where: {
        enseignantId,
        classeId,
        matiereId: matiereId || null,
        jour,
        heureDebut,
        heureFin,
      },
    });
    if (existante) throw new Error("Ce creneau existe deja pour cet enseignant");
  }

  // Verifier les conflits horaires pour cet enseignant
  if (jour && heureDebut && heureFin) {
    const conflit = await db.affectation.findFirst({
      where: {
        enseignantId,
        jour,
        heureDebut: { lt: heureFin },
        heureFin: { gt: heureDebut },
      },
      include: { classe: true, matiere: true },
    });
    if (conflit) {
      const c = conflit.classe.nom || (conflit.classe.niveau + (conflit.classe.section ? " " + conflit.classe.section : ""));
      const m = conflit.matiere?.nom || "Titulariat";
      throw new Error(
        "Conflit horaire avec " + c + " (" + m + ") le " + jour + " de " + conflit.heureDebut + " a " + conflit.heureFin
      );
    }
  }

  await db.affectation.create({
    data: {
      enseignantId,
      classeId,
      matiereId: matiereId || null,
      type,
      jour,
      heureDebut,
      heureFin,
    },
  });

  await enregistrerAudit({
    userId: admin.id,
    action: "CREATE_AFFECTATION",
    entite: "Affectation",
    entiteId: enseignantId + "-" + classeId,
    details: { enseignantId, classeId, matiereId, type, jour, heureDebut, heureFin },
  });

  revalidatePath("/personnel/" + enseignantId);
  revalidatePath("/classes/" + classeId);
  return { success: true };
}

async function supprimerAffectationCorps(id: string) {
  const admin = await requirePermission("personnel.manage");
  const db = ecole(admin);

  const aff = await db.affectation.findUnique({
    where: { id },
    include: { enseignant: true },
  });
  if (!aff || aff.enseignant.etablissementId !== admin.etablissementId) {
    throw new Error("Acces refuse");
  }

  await db.affectation.delete({ where: { id } });

  await enregistrerAudit({
    userId: admin.id,
    action: "DELETE_AFFECTATION",
    entite: "Affectation",
    entiteId: id,
  });

  revalidatePath("/personnel/" + aff.enseignantId);
  return { success: true };
}

// Actions appelees par le client : l'erreur metier est renvoyee au lieu d'etre levee,
// sinon Next la remplace par un message generique en production (voir lib/actions/serveur.ts)
export async function creerEmploye(...a: Parameters<typeof creerEmployeCorps>) {
  return capter(() => creerEmployeCorps(...a));
}
export async function modifierEmploye(...a: Parameters<typeof modifierEmployeCorps>) {
  return capter(() => modifierEmployeCorps(...a));
}
export async function creerCompte(...a: Parameters<typeof creerCompteCorps>) {
  return capter(() => creerCompteCorps(...a));
}
export async function supprimerCompte(...a: Parameters<typeof supprimerCompteCorps>) {
  return capter(() => supprimerCompteCorps(...a));
}
export async function changerMotDePasse(...a: Parameters<typeof changerMotDePasseCorps>) {
  return capter(() => changerMotDePasseCorps(...a));
}
export async function creerAffectation(...a: Parameters<typeof creerAffectationCorps>) {
  return capter(() => creerAffectationCorps(...a));
}
export async function supprimerAffectation(...a: Parameters<typeof supprimerAffectationCorps>) {
  return capter(() => supprimerAffectationCorps(...a));
}
