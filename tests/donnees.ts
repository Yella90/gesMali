// Donnees de test : deux ecoles fictives completes, sur la base LOCALE de test.
// Chaque table de l'application y a au moins une ligne par ecole.

import { prisma } from "@/lib/db";

// Garde-fou : jamais d'ecriture ailleurs que sur une base locale
function verifierBaseLocale() {
  const hote = new URL(process.env.DATABASE_URL ?? "").hostname;
  if (!["localhost", "127.0.0.1", "[::1]"].includes(hote)) {
    throw new Error("Tests refuses : la base " + hote + " n'est pas locale (lancer avec npm test)");
  }
}

// Vide toutes les tables de l'application (base de test locale uniquement)
export async function viderBase() {
  verifierBaseLocale();
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length) {
    await prisma.$executeRawUnsafe("TRUNCATE TABLE " + tables.map((t) => '"' + t.tablename + '"').join(", ") + " CASCADE");
  }
}

export type Ecole = Awaited<ReturnType<typeof creerEcole>>;

export async function creerEcole(nom: string) {
  verifierBaseLocale();
  const s = nom.replace(/\W+/g, "").toLowerCase();

  const etablissement = await prisma.etablissement.create({ data: { nom, type: "PRIVE" } });
  const etablissementId = etablissement.id;
  const parametres = await prisma.parametresEtablissement.create({ data: { etablissementId } });

  const employe = await prisma.employe.create({ data: { etablissementId, nom: "Directeur", prenom: nom, poste: "Directeur" } });
  const user = await prisma.user.create({
    data: { email: "directeur@" + s + ".test", passwordHash: "x", roles: ["DIRECTEUR"], employeId: employe.id, etablissementId },
  });

  const annee = await prisma.anneeScolaire.create({
    data: { etablissementId, libelle: "2026-2027", dateDebut: new Date("2026-10-01"), dateFin: new Date("2027-06-30"), active: true },
  });
  const trimestre = await prisma.trimestre.create({
    data: { anneeScolaireId: annee.id, nom: "Trimestre 1", ordre: 1, dateDebut: new Date("2026-10-01") },
  });
  const matiere = await prisma.matiere.create({ data: { etablissementId, nom: "Mathematiques", cycle: "SECOND_CYCLE", coefficient: 2 } });
  const classe = await prisma.classe.create({
    data: { etablissementId, anneeScolaireId: annee.id, niveau: 7, section: "A", cycle: "SECOND_CYCLE", titulaireId: employe.id },
  });
  const eleve = await prisma.eleve.create({
    data: {
      etablissementId, matricule: "M-" + s, nom: "Eleve", prenom: nom, dateNaissance: new Date("2014-01-01"), sexe: "F",
      classeId: classe.id, codeParent: "code-" + s,
    },
  });
  const affectation = await prisma.affectation.create({
    data: { enseignantId: employe.id, classeId: classe.id, matiereId: matiere.id, type: "PROFESSEUR_MATIERE", jour: "LUNDI", heureDebut: "08:00", heureFin: "10:00" },
  });
  const note = await prisma.note.create({
    data: { eleveId: eleve.id, matiereId: matiere.id, classeId: classe.id, trimestreId: trimestre.id, type: "DEVOIR", numero: 1, valeur: 12, saisieParId: user.id },
  });
  const bulletin = await prisma.bulletin.create({
    data: {
      eleveId: eleve.id, trimestreId: trimestre.id, classeId: classe.id, moyenneGenerale: 12, totalPoints: 24, totalCoeffs: 2,
      effectifClasse: 1, genereParId: user.id,
      lignes: { create: [{ matiereId: matiere.id, nomMatiere: "Mathematiques", moyenneMatiere: 12, coefficient: 2, points: 24 }] },
    },
    include: { lignes: true },
  });
  const frais = await prisma.fraisScolarite.create({
    data: {
      etablissementId, eleveId: eleve.id, anneeScolaireId: annee.id, fraisScolariteMensuel: 10000, dateDebut: new Date("2026-10-01"),
      tranches: { create: [{ libelle: "Octobre 2026", periode: "2026-10", ordre: 1, montant: 10000, dateEcheance: new Date("2026-10-05") }] },
    },
    include: { tranches: true },
  });
  const tranche = frais.tranches[0];
  const paiementFrais = await prisma.paiementFrais.create({
    data: { trancheId: tranche.id, montant: 5000, datePaiement: new Date("2026-10-03"), mode: "ESPECES", recuNumero: "R-" + s, saisieParId: user.id },
  });
  const rappel = await prisma.rappel.create({ data: { trancheId: tranche.id, saisieParId: user.id } });
  const paiement = await prisma.paiement.create({
    data: {
      etablissementId, employeId: employe.id, periode: "2026-10", type: "MENSUEL", montant: 150000, datePaiement: new Date("2026-10-31"),
      modePaiement: "VIREMENT", saisieParId: user.id,
    },
  });
  const inscription = await prisma.inscriptionAnnuelle.create({
    data: { eleveId: eleve.id, classeId: classe.id, anneeScolaireId: annee.id, decision: "INSCRIT" },
  });
  const presence = await prisma.presence.create({
    data: { eleveId: eleve.id, classeId: classe.id, date: new Date("2026-10-06"), statut: "ABSENT", saisieParId: user.id },
  });
  const mouvement = await prisma.mouvementTresorerie.create({
    data: { etablissementId, type: "DEPENSE", caisse: "ESPECES", date: new Date("2026-10-10"), montant: 20000, libelle: "Craies", saisieParId: user.id },
  });
  const depense = await prisma.depenseRecurrente.create({
    data: { etablissementId, libelle: "Loyer", categorie: "Loyer", montant: 100000, jourEcheance: 5, caisse: "BANQUE" },
  });
  const audit = await prisma.auditLog.create({ data: { userId: user.id, action: "TEST", entite: "Test", entiteId: s } });

  // Un identifiant par table : la base des tests d'isolation
  return {
    etablissementId,
    user: { id: user.id, etablissementId, roles: user.roles, employeId: employe.id },
    ids: {
      Etablissement: etablissementId,
      ParametresEtablissement: parametres.id,
      Employe: employe.id,
      User: user.id,
      AnneeScolaire: annee.id,
      Trimestre: trimestre.id,
      Matiere: matiere.id,
      Classe: classe.id,
      Eleve: eleve.id,
      Affectation: affectation.id,
      Note: note.id,
      Bulletin: bulletin.id,
      BulletinLigne: bulletin.lignes[0].id,
      FraisScolarite: frais.id,
      TrancheFrais: tranche.id,
      PaiementFrais: paiementFrais.id,
      Rappel: rappel.id,
      Paiement: paiement.id,
      InscriptionAnnuelle: inscription.id,
      Presence: presence.id,
      MouvementTresorerie: mouvement.id,
      DepenseRecurrente: depense.id,
      AuditLog: audit.id,
    } as Record<string, string>,
  };
}
