// Creation d'une ecole sur la plateforme : inscription en ligne ou espace administrateur.
// Une ecole nait prete a l'emploi : parametres, annee scolaire active et ses trois
// trimestres, matieres des cycles choisis, fiche et compte du directeur.

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifierRattachement } from "@/lib/auth/comptes";
import { DUREE_ESSAI_JOURS, finEssaiDans } from "./etat";

type Cycle = "PRESCOLAIRE" | "PREMIER_CYCLE" | "SECOND_CYCLE";

// Matieres proposees a la creation, modifiables ensuite dans « Matieres »
export const MATIERES_PAR_CYCLE: Record<Cycle, { nom: string; coefficient: number }[]> = {
  PRESCOLAIRE: [
    { nom: "Langage et communication", coefficient: 1 },
    { nom: "Éveil mathématique", coefficient: 1 },
    { nom: "Éveil scientifique", coefficient: 1 },
    { nom: "Dessin et coloriage", coefficient: 1 },
    { nom: "Chant et récitation", coefficient: 1 },
  ],
  PREMIER_CYCLE: [
    { nom: "Français", coefficient: 3 },
    { nom: "Mathématiques", coefficient: 3 },
    { nom: "Sciences", coefficient: 2 },
    { nom: "Histoire-Géographie", coefficient: 2 },
    { nom: "Anglais", coefficient: 1 },
    { nom: "Éducation civique", coefficient: 1 },
  ],
  SECOND_CYCLE: [
    { nom: "Français", coefficient: 4 },
    { nom: "Mathématiques", coefficient: 4 },
    { nom: "Anglais", coefficient: 2 },
    { nom: "Histoire-Géographie", coefficient: 2 },
    { nom: "Sciences", coefficient: 2 },
    { nom: "Physique-Chimie", coefficient: 2 },
    { nom: "Éducation civique", coefficient: 1 },
    { nom: "Éducation physique", coefficient: 1 },
  ],
};

const texte = (min: number, message: string) => z.string().trim().min(min, message).max(120, "Texte trop long");
const facultatif = z
  .string()
  .trim()
  .max(120, "Texte trop long")
  .optional()
  .nullable()
  .transform((v) => v || null);

export const ecoleSchema = z
  .object({
    nom: texte(3, "Nom de l'école : 3 caractères minimum"),
    type: z.enum(["PRIVE", "PUBLIC", "COMMUNAUTAIRE", "MEDERSA"], { message: "Type d'école invalide" }),
    adresse: facultatif,
    telephone: facultatif,
    cycles: z.array(z.enum(["PRESCOLAIRE", "PREMIER_CYCLE", "SECOND_CYCLE"])).min(1, "Choisissez au moins un cycle"),
    anneeDebut: z.coerce.date({ message: "Date de rentrée invalide" }),
    anneeFin: z.coerce.date({ message: "Date de fin d'année invalide" }),
    directeurNom: texte(2, "Nom du directeur trop court"),
    directeurPrenom: texte(2, "Prénom du directeur trop court"),
    directeurEmail: z.string().trim().toLowerCase().email("E-mail du directeur invalide"),
  })
  .refine((d) => d.anneeFin > d.anneeDebut, { message: "La fin de l'année doit être après la rentrée", path: ["anneeFin"] })
  .refine((d) => d.anneeFin.getTime() - d.anneeDebut.getTime() < 400 * 24 * 3600 * 1000, {
    message: "Une année scolaire dure moins de 13 mois",
    path: ["anneeFin"],
  });

export type DonneesEcole = z.infer<typeof ecoleSchema>;

// Lecture d'un formulaire de creation (cycles : cases a cocher "cycles")
export function lireEcole(fd: FormData): DonneesEcole {
  return ecoleSchema.parse({
    nom: fd.get("nom"),
    type: fd.get("type"),
    adresse: fd.get("adresse"),
    telephone: fd.get("telephone"),
    cycles: fd.getAll("cycles"),
    anneeDebut: fd.get("anneeDebut"),
    anneeFin: fd.get("anneeFin"),
    directeurNom: fd.get("directeurNom"),
    directeurPrenom: fd.get("directeurPrenom"),
    directeurEmail: fd.get("directeurEmail"),
  });
}

// Annee scolaire par defaut : rentree en octobre (si on est avant juillet, celle de cette annee)
export function anneeParDefaut(maintenant = new Date()) {
  const an = maintenant.getMonth() >= 6 ? maintenant.getFullYear() : maintenant.getFullYear() - 1;
  return { debut: an + "-10-01", fin: an + 1 + "-06-30" };
}

const jour = (d: Date) => d.toISOString().slice(0, 10);

// Trois trimestres : calendrier malien (octobre-decembre, janvier-mars, avril-juin) quand la
// rentree a lieu en fin d'annee civile, sinon l'annee coupee en trois parts egales
export function trimestresDe(debut: Date, fin: Date) {
  const an = debut.getUTCFullYear();
  if (debut.getUTCMonth() >= 7 && fin.getUTCFullYear() === an + 1 && fin.getUTCMonth() >= 4) {
    return [
      { nom: "Trimestre 1", ordre: 1, dateDebut: debut, dateFin: new Date(an + "-12-20") },
      { nom: "Trimestre 2", ordre: 2, dateDebut: new Date(an + 1 + "-01-05"), dateFin: new Date(an + 1 + "-03-28") },
      { nom: "Trimestre 3", ordre: 3, dateDebut: new Date(an + 1 + "-04-06"), dateFin: fin },
    ];
  }
  const tiers = (fin.getTime() - debut.getTime()) / 3;
  return [1, 2, 3].map((ordre) => ({
    nom: "Trimestre " + ordre,
    ordre,
    dateDebut: new Date(debut.getTime() + (ordre - 1) * tiers),
    dateFin: ordre === 3 ? fin : new Date(debut.getTime() + ordre * tiers - 24 * 3600 * 1000),
  }));
}

// Cree l'ecole et l'acces de son directeur. Compte du directeur : celui qui existe deja pour cet
// e-mail (il garde son mot de passe), sinon un nouveau compte avec motDePasse (ou son empreinte
// motDePasseHash, choisie lors d'une inscription confirmee par e-mail : emailVerifie).
// Un compte existant n'est rattache que si son adresse est confirmee, ou si c'est le compte
// qui cree l'ecole (parUserId).
export async function creerEcole(
  d: DonneesEcole,
  options: {
    statut: "ESSAI" | "ACTIF";
    motDePasse?: string | null;
    motDePasseHash?: string;
    emailVerifie?: boolean;
    parUserId?: string;
  }
): Promise<{ etablissementId: string; userId: string; compteExistant: boolean }> {
  const debut = new Date(jour(d.anneeDebut));
  const fin = new Date(jour(d.anneeFin));
  const passwordHash =
    options.motDePasseHash ?? (options.motDePasse && options.motDePasse.length >= 8 ? await bcrypt.hash(options.motDePasse, 10) : null);

  return prisma.$transaction(async (tx) => {
    const existant = await tx.user.findUnique({ where: { email: d.directeurEmail } });
    if (existant && existant.id !== options.parUserId) verifierRattachement(existant);
    if (!existant && !passwordHash) throw new Error("Mot de passe du directeur : 8 caractères minimum");

    const etablissement = await tx.etablissement.create({
      data: {
        nom: d.nom,
        type: d.type,
        adresse: d.adresse,
        telephone: d.telephone,
        email: d.directeurEmail,
        statut: options.statut,
        finEssai: options.statut === "ESSAI" ? finEssaiDans(DUREE_ESSAI_JOURS) : null,
      },
    });
    const etablissementId = etablissement.id;
    await tx.parametresEtablissement.create({ data: { etablissementId } });

    const annee = await tx.anneeScolaire.create({
      data: { etablissementId, libelle: debut.getUTCFullYear() + "-" + fin.getUTCFullYear(), dateDebut: debut, dateFin: fin, active: true },
    });
    await tx.trimestre.createMany({ data: trimestresDe(debut, fin).map((t) => ({ ...t, anneeScolaireId: annee.id })) });
    await tx.matiere.createMany({
      data: d.cycles.flatMap((cycle) => MATIERES_PAR_CYCLE[cycle].map((m) => ({ etablissementId, cycle, ...m }))),
    });

    const employe = await tx.employe.create({
      data: { etablissementId, nom: d.directeurNom, prenom: d.directeurPrenom, telephone: d.telephone, poste: "Directeur" },
    });
    const user =
      existant ??
      (await tx.user.create({
        data: {
          email: d.directeurEmail,
          passwordHash: passwordHash!,
          emailVerifieLe: options.emailVerifie ? new Date() : null,
          roles: ["DIRECTEUR"],
          employeId: employe.id,
          etablissementId,
        },
      }));
    await tx.acces.create({ data: { userId: user.id, etablissementId, employeId: employe.id, roles: ["DIRECTEUR"] } });

    await tx.auditLog.create({
      data: {
        userId: options.parUserId ?? user.id,
        etablissementId,
        action: "CREATE_ETABLISSEMENT",
        entite: "Etablissement",
        entiteId: etablissementId,
        details: { nom: d.nom, statut: options.statut, directeur: d.directeurEmail, cycles: d.cycles },
      },
    });

    return { etablissementId, userId: user.id, compteExistant: !!existant };
  });
}
