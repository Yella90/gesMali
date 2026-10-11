"use server";

import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { enregistrerAudit } from "@/lib/audit";
import { eleveSchema } from "@/lib/validators/eleve";
import { revalidatePath } from "next/cache";

async function genererMatricule(etablissementId: string): Promise<string> {
  const annee = new Date().getFullYear();
  const count = await prisma.eleve.count({ where: { etablissementId } });
  const num = String(count + 1).padStart(4, "0");
  return annee + "-" + num;
}

const MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Aoùt", "Septembre", "Octobre", "Novembre", "Décembre",
];

function libelleMois(annee: number, mois: number) {
  return MOIS_FR[mois - 1] + " " + annee;
}
function periodeStr(annee: number, mois: number) {
  return annee + "-" + String(mois).padStart(2, "0");
}

function formToRaw(formData: FormData) {
  return {
    nom: formData.get("nom"),
    prenom: formData.get("prenom"),
    dateNaissance: formData.get("dateNaissance"),
    sexe: formData.get("sexe"),
    tuteurNom: formData.get("tuteurNom") || null,
    tuteurTelephone: formData.get("tuteurTelephone") || null,
    emailParent: formData.get("emailParent") || null,
    classeId: formData.get("classeId") || null,
  };
}

export async function creerEleve(formData: FormData) {
  const user = await requirePermission("eleve.create");
  const data = eleveSchema.parse(formToRaw(formData));

  const fraisInscriptionPaye = formData.get("fraisInscriptionPaye") === "on";
  const modePaiementInscription = (formData.get("modePaiementInscription") as string) || "ESPECES";
  const referenceInscription = (formData.get("referenceInscription") as string) || null;

  if (data.classeId) {
    const classe = await prisma.classe.findUnique({
      where: { id: data.classeId },
      include: { _count: { select: { eleves: { where: { statut: "INSCRIT" } } } } },
    });
    if (!classe || classe.etablissementId !== user.etablissementId) {
      throw new Error("Classe invalide");
    }
    if (classe._count.eleves >= classe.capaciteMax) {
      throw new Error("Classe pleine (" + classe.capaciteMax + " eleves max)");
    }
  }

  const matricule = await genererMatricule(user.etablissementId);

  const eleve = await prisma.eleve.create({
    data: { ...data, matricule, etablissementId: user.etablissementId },
  });

  let paiementInscription: any = null;

  // Generer les frais si la classe a des frais definis
  if (data.classeId) {
    const classe = await prisma.classe.findUnique({
      where: { id: data.classeId },
      include: { anneeScolaire: true },
    });

    if (classe && (classe.fraisInscription > 0 || classe.fraisScolariteMensuel > 0)) {
      const { trancheInscriptionId, fraisId } = await genererFraisPourEleve(
        eleve.id,
        classe.anneeScolaireId,
        classe.fraisInscription,
        classe.fraisScolariteMensuel,
        classe.anneeScolaire.dateDebut,
        classe.anneeScolaire.dateFin,
        user.etablissementId
      );

      // Si l'inscription est marquee payee ET qu'une tranche inscription existe
      if (fraisInscriptionPaye && trancheInscriptionId) {
        const nb = await prisma.paiementFrais.count();
        const recuNumero = "REC-" + new Date().getFullYear() + "-" + String(nb + 1).padStart(5, "0");

        paiementInscription = await prisma.paiementFrais.create({
          data: {
            trancheId: trancheInscriptionId,
            montant: classe.fraisInscription,
            datePaiement: new Date(),
            mode: modePaiementInscription as any,
            reference: referenceInscription,
            recuNumero,
            saisieParId: user.id,
          },
        });

        await enregistrerAudit({
          userId: user.id,
          action: "PAIEMENT_INSCRIPTION_AUTO",
          entite: "PaiementFrais",
          entiteId: paiementInscription.id,
          details: { eleveId: eleve.id, montant: classe.fraisInscription, recuNumero },
        });
      }
    }
  }

  await enregistrerAudit({
    userId: user.id,
    action: "CREATE_ELEVE",
    entite: "Eleve",
    entiteId: eleve.id,
    details: { matricule, emailParent: data.emailParent, inscriptionPayee: fraisInscriptionPaye },
  });

  revalidatePath("/eleves");
  revalidatePath("/frais");
  return {
    success: true,
    id: eleve.id,
    paiementInscriptionId: paiementInscription?.id ?? null,
    recuNumero: paiementInscription?.recuNumero ?? null,
  };
}

// Cree FraisScolarite + toutes les TrancheFrais en une seule operation imbriquee.
// Retourne l'id de la tranche "Inscription" (si elle existe) et l'id des frais.
async function genererFraisPourEleve(
  eleveId: string,
  anneeScolaireId: string,
  fraisInscription: number,
  fraisMensuel: number,
  dateDebutAnnee: Date,
  dateFinAnnee: Date,
  etablissementId: string
): Promise<{ trancheInscriptionId: string | null; fraisId: string }> {
  const debut = new Date(dateDebutAnnee);
  const fin = new Date(dateFinAnnee);
  const nombreMois =
    (fin.getFullYear() - debut.getFullYear()) * 12 + (fin.getMonth() - debut.getMonth()) + 1;

  // Construire le tableau de tranches a creer en imbrique
  const tranchesData: any[] = [];

  if (fraisInscription > 0) {
    tranchesData.push({
      libelle: "Inscription",
      periode: periodeStr(debut.getFullYear(), debut.getMonth() + 1),
      ordre: 0,
      montant: fraisInscription,
      dateEcheance: new Date(debut.getFullYear(), debut.getMonth(), debut.getDate()),
    });
  }

  let anneeCur = debut.getFullYear();
  let moisCur = debut.getMonth() + 1;
  for (let i = 0; i < nombreMois; i++) {
    tranchesData.push({
      libelle: libelleMois(anneeCur, moisCur),
      periode: periodeStr(anneeCur, moisCur),
      ordre: i + 1,
      montant: fraisMensuel,
      dateEcheance: new Date(anneeCur, moisCur - 1, 5),
    });
    moisCur++;
    if (moisCur > 12) { moisCur = 1; anneeCur++; }
  }

  // UNE SEULE creation : FraisScolarite avec ses tranches imbriquees
  const frais = await prisma.fraisScolarite.create({
    data: {
      etablissementId,
      eleveId,
      anneeScolaireId,
      fraisInscription,
      fraisScolariteMensuel: fraisMensuel,
      reduction: 0,
      dateDebut: debut,
      tranches: { create: tranchesData },
    },
    include: { tranches: true },
  });

  const tInscription = frais.tranches.find((t) => t.ordre === 0);
  return { trancheInscriptionId: tInscription?.id ?? null, fraisId: frais.id };
}

export async function modifierEleve(id: string, formData: FormData) {
  const user = await requirePermission("eleve.update");
  const data = eleveSchema.parse(formToRaw(formData));

  const eleve = await prisma.eleve.findUnique({ where: { id } });
  if (!eleve || eleve.etablissementId !== user.etablissementId) {
    throw new Error("Acces refuse");
  }

  await prisma.eleve.update({ where: { id }, data });
  await enregistrerAudit({ userId: user.id, action: "UPDATE_ELEVE", entite: "Eleve", entiteId: id });
  revalidatePath("/eleves");
  revalidatePath("/eleves/" + id);
}

export async function radierEleve(id: string) {
  const user = await requirePermission("eleve.delete");
  const eleve = await prisma.eleve.findUnique({ where: { id } });
  if (!eleve || eleve.etablissementId !== user.etablissementId) {
    throw new Error("Acces refuse");
  }
  await prisma.eleve.update({ where: { id }, data: { statut: "RADIE" } });
  await enregistrerAudit({ userId: user.id, action: "RADIER_ELEVE", entite: "Eleve", entiteId: id });
  revalidatePath("/eleves");
}