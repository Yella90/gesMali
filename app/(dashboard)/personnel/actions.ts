"use server";

import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { enregistrerAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

const ROLES_VALIDES = ["DIRECTEUR", "SECRETAIRE", "COMPTABLE", "ENSEIGNANT"];
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
export async function creerEmploye(formData: FormData) {
  const admin = await requirePermission("personnel.manage");

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

  if (creerCompte) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Email invalide");
    }
    if (!motDePasse || motDePasse.length < 6) {
      throw new Error("Mot de passe : 6 caracteres minimum");
    }
    if (!ROLES_VALIDES.includes(role)) throw new Error("Role invalide");

    const existant = await prisma.user.findUnique({ where: { email } });
    if (existant) throw new Error("Cet email est deja utilise");
  }

  const salaireReference = salaireRefRaw ? Number(salaireRefRaw) : null;

  const resultat = await prisma.$transaction(async (tx) => {
    const employe = await tx.employe.create({
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

    let user: any = null;
    if (creerCompte && email && motDePasse) {
      const passwordHash = await bcrypt.hash(motDePasse, 10);
      user = await tx.user.create({
        data: {
          email,
          passwordHash,
          roles: [role as any],
          actif: true,
          employeId: employe.id,
          etablissementId: admin.etablissementId,
        },
      });
    }

    return { employe, user };
  });

  await enregistrerAudit({
    userId: admin.id,
    action: "CREATE_EMPLOYE",
    entite: "Employe",
    entiteId: resultat.employe.id,
    details: {
      nom,
      prenom,
      poste,
      compte: resultat.user ? email : null,
      role: resultat.user ? role : null,
    },
  });

  revalidatePath("/personnel");
  return { success: true, id: resultat.employe.id };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MODIFIER UN EMPLOYE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export async function modifierEmploye(employeId: string, formData: FormData) {
  const admin = await requirePermission("personnel.manage");

  const cible = await prisma.employe.findUnique({
    where: { id: employeId },
    include: { user: true },
  });
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

  await prisma.$transaction(async (tx) => {
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

    // Desactivation en cascade du compte
    if (!actif && cible.user) {
      await tx.user.update({
        where: { id: cible.user.id },
        data: { actif: false },
      });
    } else if (actif && cible.user) {
      await tx.user.update({
        where: { id: cible.user.id },
        data: { actif: true },
      });
    }
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

  const cible = await prisma.employe.findUnique({
    where: { id: employeId },
    include: { user: true },
  });
  if (!cible || cible.etablissementId !== admin.etablissementId) {
    throw new Error("Acces refuse");
  }
  if (cible.id === admin.employeId) {
    throw new Error("Vous ne pouvez pas vous desactiver vous-meme");
  }

  await prisma.$transaction(async (tx) => {
    await tx.employe.update({
      where: { id: employeId },
      data: { actif: false, dateSortie: new Date() },
    });
    if (cible.user) {
      await tx.user.update({
        where: { id: cible.user.id },
        data: { actif: false },
      });
    }
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
export async function creerCompte(employeId: string, formData: FormData) {
  const admin = await requirePermission("personnel.manage");

  const employe = await prisma.employe.findUnique({
    where: { id: employeId },
    include: { user: true },
  });
  if (!employe || employe.etablissementId !== admin.etablissementId) {
    throw new Error("Acces refuse");
  }
  if (employe.user) throw new Error("Cet employe a deja un compte");

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const motDePasse = formData.get("motDePasse") as string;
  const role = formData.get("role") as string;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Email invalide");
  }
  if (!motDePasse || motDePasse.length < 6) {
    throw new Error("Mot de passe : 6 caracteres minimum");
  }
  if (!ROLES_VALIDES.includes(role)) throw new Error("Role invalide");

  const existant = await prisma.user.findUnique({ where: { email } });
  if (existant) throw new Error("Cet email est deja utilise");

  const passwordHash = await bcrypt.hash(motDePasse, 10);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      roles: [role as any],
      actif: true,
      employeId,
      etablissementId: admin.etablissementId,
    },
  });

  await enregistrerAudit({
    userId: admin.id,
    action: "CREATE_COMPTE",
    entite: "User",
    entiteId: employeId,
    details: { email, role, employe: employe.nom + " " + employe.prenom },
  });

  revalidatePath("/personnel");
  revalidatePath("/personnel/" + employeId);
  return { success: true };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SUPPRIMER LE COMPTE (garde la fiche Employe)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export async function supprimerCompte(employeId: string) {
  const admin = await requirePermission("personnel.manage");

  const employe = await prisma.employe.findUnique({
    where: { id: employeId },
    include: { user: true },
  });
  if (!employe || employe.etablissementId !== admin.etablissementId) {
    throw new Error("Acces refuse");
  }
  if (!employe.user) throw new Error("Aucun compte a supprimer");
  if (employe.id === admin.employeId) {
    throw new Error("Vous ne pouvez pas supprimer votre propre compte");
  }

  // Compter les references pour eviter les erreurs
  const [notes, bulletins, paiements, frais, rappels, audits] = await Promise.all([
    prisma.note.count({ where: { saisieParId: employe.user.id } }),
    prisma.bulletin.count({ where: { genereParId: employe.user.id } }),
    prisma.paiement.count({
      where: {
        OR: [
          { saisieParId: employe.user.id },
          { annuleParId: employe.user.id },
        ],
      },
    }),
    prisma.paiementFrais.count({ where: { saisieParId: employe.user.id } }),
    prisma.rappel.count({ where: { saisieParId: employe.user.id } }),
    prisma.auditLog.count({ where: { userId: employe.user.id } }),
  ]);

  const total = notes + bulletins + paiements + frais + rappels + audits;
  if (total > 0) {
    throw new Error(
      "Impossible de supprimer : ce compte a " + total +
      " reference(s) dans l'historique. Desactivez-le a la place."
    );
  }

  await prisma.user.delete({ where: { id: employe.user.id } });

  await enregistrerAudit({
    userId: admin.id,
    action: "DELETE_COMPTE",
    entite: "User",
    entiteId: employeId,
    details: { email: employe.user.email },
  });

  revalidatePath("/personnel");
  revalidatePath("/personnel/" + employeId);
  return { success: true };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CHANGER MOT DE PASSE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export async function changerMotDePasse(employeId: string, nouveauMotDePasse: string) {
  const admin = await requirePermission("personnel.manage");

  const employe = await prisma.employe.findUnique({
    where: { id: employeId },
    include: { user: true },
  });
  if (!employe || employe.etablissementId !== admin.etablissementId) {
    throw new Error("Acces refuse");
  }
  if (!employe.user) throw new Error("Aucun compte pour cet employe");
  if (!nouveauMotDePasse || nouveauMotDePasse.length < 6) {
    throw new Error("Mot de passe : 6 caracteres minimum");
  }

  const passwordHash = await bcrypt.hash(nouveauMotDePasse, 10);
  await prisma.user.update({
    where: { id: employe.user.id },
    data: { passwordHash },
  });

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
export async function creerAffectation(formData: FormData) {
  const admin = await requirePermission("personnel.manage");

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
    prisma.employe.findUnique({ where: { id: enseignantId } }),
    prisma.classe.findUnique({ where: { id: classeId } }),
  ]);

  if (!employe || employe.etablissementId !== admin.etablissementId) {
    throw new Error("Employe introuvable");
  }
  if (!classe || classe.etablissementId !== admin.etablissementId) {
    throw new Error("Classe introuvable");
  }

  // Verifier les doublons (meme prof + classe + matiere + jour + heure)
  if (jour && heureDebut && heureFin) {
    const existante = await prisma.affectation.findFirst({
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
    const conflit = await prisma.affectation.findFirst({
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

  await prisma.affectation.create({
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

export async function supprimerAffectation(id: string) {
  const admin = await requirePermission("personnel.manage");

  const aff = await prisma.affectation.findUnique({
    where: { id },
    include: { enseignant: true },
  });
  if (!aff || aff.enseignant.etablissementId !== admin.etablissementId) {
    throw new Error("Acces refuse");
  }

  await prisma.affectation.delete({ where: { id } });

  await enregistrerAudit({
    userId: admin.id,
    action: "DELETE_AFFECTATION",
    entite: "Affectation",
    entiteId: id,
  });

  revalidatePath("/personnel/" + aff.enseignantId);
  return { success: true };
}