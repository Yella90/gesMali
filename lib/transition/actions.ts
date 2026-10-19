"use server";

import { ecole } from "@/lib/data/ecole";
import { requirePermission } from "@/lib/auth/session";
import { enregistrerAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { capter } from "@/lib/actions/serveur";

// ═════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════

export type DecisionType = "ADMIS" | "REDOUBLE" | "DIPLOME" | "TRANSFERE";

export type EleveTransition = {
  eleveId: string;
  matricule: string;
  nom: string;
  prenom: string;
  sexe: string;
  classeSourceId: string;
  classeSourceLabel: string;
  niveauSource: number;
  cycleSource: string;
  sectionSource: string | null;
  moyenneT1: number | null;
  moyenneT2: number | null;
  moyenneT3: number | null;
  moyenneAnnuelle: number | null;
  decision: DecisionType;
  niveauCible: number | null;
  sectionCible: string | null;
};

export type ApercuTransition = {
  anneeSourceId: string;
  anneeSourceLibelle: string;
  anneeCibleLibelle: string;
  eleves: EleveTransition[];
  stats: {
    total: number;
    admis: number;
    redoublants: number;
    diplomes: number;
  };
  reinscriptionRequise: boolean;
  fraisReinscription: number;
  copierAffectations: boolean;
  classesCibles: {
    niveau: number;
    cycle: string;
    section: string | null;
    effectifPrevu: number;
  }[];
};

// ═════════════════════════════════════════════
// UTILITAIRE : label classe
// ═════════════════════════════════════════════

function libClasse(c: { nom: string | null; niveau: number; section: string | null }): string {
  return c.nom || (c.niveau + (c.section ? " " + c.section : ""));
}

function libelleMois(annee: number, mois: number): string {
  const MOIS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];
  return MOIS[mois - 1] + " " + annee;
}

function periodeStr(annee: number, mois: number): string {
  return annee + "-" + String(mois).padStart(2, "0");
}

// ═════════════════════════════════════════════
// PREPARER LA TRANSITION (aucune ecriture)
// ═════════════════════════════════════════════

async function preparerTransitionCorps(params: {
  anneeSourceId: string;
  nouveauLibelle: string;
}): Promise<ApercuTransition> {
  const user = await requirePermission("parametres.manage");
  const db = ecole(user);

  const anneeSource = await db.anneeScolaire.findUnique({
    where: { id: params.anneeSourceId },
    include: {
      trimestres: { orderBy: { ordre: "asc" } },
    },
  });
  if (!anneeSource || anneeSource.etablissementId !== user.etablissementId) {
    throw new Error("Année scolaire introuvable");
  }
  if (anneeSource.archivee) {
    throw new Error("Cette année est déjà archivée");
  }
  if (anneeSource.trimestres.length !== 3) {
    throw new Error("L'année doit avoir 3 trimestres");
  }

  const trimestresNonClotures = anneeSource.trimestres.filter((t) => !t.cloture);
  if (trimestresNonClotures.length > 0) {
    throw new Error(
      "Tous les trimestres doivent être clôturés avant la transition. Manquants : " +
      trimestresNonClotures.map((t) => t.nom).join(", ")
    );
  }

  const paramsEtab = await db.parametresEtablissement.findUnique({
    where: { etablissementId: user.etablissementId },
  });
  if (!paramsEtab) throw new Error("Paramètres établissement manquants");

  // Charger tous les eleves actifs avec leurs bulletins
  const eleves = await db.eleve.findMany({
    where: {
      etablissementId: user.etablissementId,
      statut: "INSCRIT",
    },
    include: {
      classe: true,
      bulletins: {
        where: { trimestreId: { in: anneeSource.trimestres.map((t) => t.id) } },
      },
    },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });

  const trimestreIds = anneeSource.trimestres.map((t) => t.id);

  // Calculer les decisions
  const elevesTransition: EleveTransition[] = [];

  for (const e of eleves) {
    const bullT1 = e.bulletins.find((b) => b.trimestreId === trimestreIds[0]);
    const bullT2 = e.bulletins.find((b) => b.trimestreId === trimestreIds[1]);
    const bullT3 = e.bulletins.find((b) => b.trimestreId === trimestreIds[2]);

    const moyT1 = bullT1?.moyenneGenerale ?? null;
    const moyT2 = bullT2?.moyenneGenerale ?? null;
    const moyT3 = bullT3?.moyenneGenerale ?? null;

    // Moyenne annuelle = moyenne simple des trimestres disponibles
    const moyennes = [moyT1, moyT2, moyT3].filter((m) => m !== null) as number[];
    const moyenneAnnuelle =
      moyennes.length > 0 ? moyennes.reduce((s, m) => s + m, 0) / moyennes.length : null;

    // Decision
    let decision: DecisionType;
    if (moyenneAnnuelle === null) {
      decision = "REDOUBLE"; // Pas de notes = on redouble par defaut
    } else if (moyenneAnnuelle >= 10) {
      decision = "ADMIS";
    } else {
      decision = "REDOUBLE";
    }

    // Cas particulier : 9eme annee
    if (e.classe && e.classe.niveau === 9) {
      if (decision === "ADMIS") decision = "DIPLOME";
      // Si REDOUBLE reste REDOUBLE
    }

    // Cas particulier : prescolaire (jardin niveau 0)
    if (e.classe && e.classe.niveau === 0) {
      decision = "ADMIS"; // Toujours admis en 1ere annee
    }

    // Niveau cible
    let niveauCible: number | null = null;
    let sectionCible: string | null = null;

    if (decision === "DIPLOME") {
      niveauCible = null;
      sectionCible = null;
    } else if (decision === "ADMIS" && e.classe) {
      niveauCible = e.classe.niveau + 1;
      sectionCible = e.classe.section;
    } else if (decision === "REDOUBLE" && e.classe) {
      niveauCible = e.classe.niveau;
      sectionCible = e.classe.section;
    }

    elevesTransition.push({
      eleveId: e.id,
      matricule: e.matricule,
      nom: e.nom,
      prenom: e.prenom,
      sexe: e.sexe,
      classeSourceId: e.classeId || "",
      classeSourceLabel: e.classe ? libClasse(e.classe) : "Sans classe",
      niveauSource: e.classe?.niveau ?? 0,
      cycleSource: e.classe?.cycle ?? "PRESCOLAIRE",
      sectionSource: e.classe?.section ?? null,
      moyenneT1: moyT1,
      moyenneT2: moyT2,
      moyenneT3: moyT3,
      moyenneAnnuelle: moyenneAnnuelle !== null ? Number(moyenneAnnuelle.toFixed(2)) : null,
      decision,
      niveauCible,
      sectionCible,
    });
  }

  // Stats
  const stats = {
    total: elevesTransition.length,
    admis: elevesTransition.filter((e) => e.decision === "ADMIS").length,
    redoublants: elevesTransition.filter((e) => e.decision === "REDOUBLE").length,
    diplomes: elevesTransition.filter((e) => e.decision === "DIPLOME").length,
  };

  // Classes cibles necessaires (uniquement les niveaux qui recoivent des eleves)
  const classesCiblesMap = new Map<string, { niveau: number; cycle: string; section: string | null; effectifPrevu: number }>();
  for (const e of elevesTransition) {
    if (e.niveauCible === null) continue;
    const key = e.niveauCible + "|" + (e.sectionCible || "") + "|" + e.cycleSource;
    if (!classesCiblesMap.has(key)) {
      // Determiner le cycle cible
      let cycleCible = e.cycleSource;
      if (e.niveauCible === 1 && e.cycleSource === "PRESCOLAIRE") cycleCible = "PREMIER_CYCLE";
      if (e.niveauCible >= 7) cycleCible = "SECOND_CYCLE";
      if (e.niveauCible >= 1 && e.niveauCible <= 6) cycleCible = "PREMIER_CYCLE";

      classesCiblesMap.set(key, {
        niveau: e.niveauCible,
        cycle: cycleCible,
        section: e.sectionCible,
        effectifPrevu: 0,
      });
    }
    classesCiblesMap.get(key)!.effectifPrevu++;
  }

  return {
    anneeSourceId: anneeSource.id,
    anneeSourceLibelle: anneeSource.libelle,
    anneeCibleLibelle: params.nouveauLibelle,
    eleves: elevesTransition,
    stats,
    reinscriptionRequise: paramsEtab.reinscriptionRequise,
    fraisReinscription: paramsEtab.fraisReinscription,
    copierAffectations: paramsEtab.copierAffectations,
    classesCibles: Array.from(classesCiblesMap.values()),
  };
}

// ═════════════════════════════════════════════
// APPLIQUER LA TRANSITION
// ═════════════════════════════════════════════

async function appliquerTransitionCorps(params: {
  anneeSourceId: string;
  nouveauLibelle: string;
  dateDebut: string;
  dateFin: string;
  decisions: { eleveId: string; decision: DecisionType; niveauCible: number | null }[];
}): Promise<{ success: true; anneeCibleId: string }> {
  const user = await requirePermission("parametres.manage");
  const db = ecole(user);

  const anneeSource = await db.anneeScolaire.findUnique({
    where: { id: params.anneeSourceId },
    include: { trimestres: { orderBy: { ordre: "asc" } } },
  });
  if (!anneeSource || anneeSource.etablissementId !== user.etablissementId) {
    throw new Error("Année source introuvable");
  }
  if (anneeSource.archivee) throw new Error("Année déjà archivée");
  if (anneeSource.trimestres.some((t) => !t.cloture)) {
    throw new Error("Tous les trimestres doivent être clôturés");
  }

  const paramsEtab = await db.parametresEtablissement.findUnique({
    where: { etablissementId: user.etablissementId },
  });
  if (!paramsEtab) throw new Error("Paramètres manquants");

  const dateDebut = new Date(params.dateDebut);
  const dateFin = new Date(params.dateFin);
  if (dateFin <= dateDebut) throw new Error("Date de fin après la date de début");

  // Verifier que le libelle n'existe pas
  const existant = await db.anneeScolaire.findFirst({
    where: { etablissementId: user.etablissementId, libelle: params.nouveauLibelle },
  });
  if (existant) throw new Error("Une année avec ce libellé existe déjà");

  // Charger les eleves + leurs classes
  const eleves = await db.eleve.findMany({
    where: {
      etablissementId: user.etablissementId,
      statut: "INSCRIT",
      id: { in: params.decisions.map((d) => d.eleveId) },
    },
    include: { classe: true },
  });
  const elevesMap = new Map(eleves.map((e) => [e.id, e]));

  // Charger les classes source avec leurs frais
  const classesSource = await db.classe.findMany({
    where: { anneeScolaireId: anneeSource.id },
  });
  const classesSourceMap = new Map(classesSource.map((c) => [c.id, c]));

  // Calculer le nb de mois de la nouvelle annee
  const nbMois =
    (dateFin.getFullYear() - dateDebut.getFullYear()) * 12 +
    (dateFin.getMonth() - dateDebut.getMonth()) + 1;

  // ─────────────────────────────────────────────
  // 1. Creer la nouvelle annee + 3 trimestres
  // ─────────────────────────────────────────────
  const anneeCible = await db.anneeScolaire.create({
    data: {
      etablissementId: user.etablissementId,
      libelle: params.nouveauLibelle,
      dateDebut,
      dateFin,
      active: false,
    },
  });

  // Creer 3 trimestres proportionnels
  const debutMs = dateDebut.getTime();
  const finMs = dateFin.getTime();
  const duree = finMs - debutMs;
  const tiers = Math.floor(duree / 3);

  const trimestresData = [
    { ordre: 1, debut: dateDebut, fin: new Date(debutMs + tiers) },
    { ordre: 2, debut: new Date(debutMs + tiers + 86400000), fin: new Date(debutMs + 2 * tiers) },
    { ordre: 3, debut: new Date(debutMs + 2 * tiers + 86400000), fin: dateFin },
  ];

  for (const t of trimestresData) {
    await db.trimestre.create({
      data: {
        anneeScolaireId: anneeCible.id,
        nom: "Trimestre " + t.ordre,
        ordre: t.ordre,
        dateDebut: t.debut,
        dateFin: t.fin,
      },
    });
  }

  // ─────────────────────────────────────────────
  // 2. Creer les classes cibles
  // ─────────────────────────────────────────────

  // Grouper les decisions par (niveauCible, section)
  type GroupeCible = { niveau: number; section: string | null; cycle: string; eleves: any[] };
  const groupes = new Map<string, GroupeCible>();

  for (const d of params.decisions) {
    if (d.niveauCible === null) continue; // DIPLOME
    const eleve = elevesMap.get(d.eleveId);
    if (!eleve || !eleve.classe) continue;

    const section = eleve.classe.section;
    let cycle = eleve.classe.cycle;
    // Adapter le cycle au niveau cible
    if (d.niveauCible === 0) cycle = "PRESCOLAIRE" as any;
    else if (d.niveauCible >= 1 && d.niveauCible <= 6) cycle = "PREMIER_CYCLE" as any;
    else cycle = "SECOND_CYCLE" as any;

    const key = d.niveauCible + "|" + (section || "") + "|" + cycle;
    if (!groupes.has(key)) {
      groupes.set(key, { niveau: d.niveauCible, section, cycle, eleves: [] });
    }
    groupes.get(key)!.eleves.push({ ...eleve, decision: d.decision });
  }

  // Pour chaque groupe, creer une classe cible et calculer les frais
  const classesCibles: Record<string, any> = {}; // key -> classe

  for (const [key, g] of groupes) {
    // Frais : on reprend le frais mensuel des classes source du meme niveau
    const classeSourceRef = classesSource.find((c) => c.niveau === g.niveau && c.section === g.section);
    const fraisMensuel = classeSourceRef?.fraisScolariteMensuel ?? 0;
    const capaciteMax = classeSourceRef?.capaciteMax ?? 50;

    // Frais d'inscription : 0 ou fraisReinscription selon parametre
    const fraisInscription = paramsEtab.reinscriptionRequise ? paramsEtab.fraisReinscription : 0;

    const nouvelleClasse = await db.classe.create({
      data: {
        etablissementId: user.etablissementId,
        anneeScolaireId: anneeCible.id,
        nom: g.niveau === 0 ? "Jardin" : (g.niveau + (g.section ? " " + g.section : "")),
        niveau: g.niveau,
        cycle: g.cycle as any,
        section: g.section,
        salle: classeSourceRef?.salle ?? null,
        fraisInscription,
        fraisScolariteMensuel: fraisMensuel,
        capaciteMax,
      },
    });
    classesCibles[key] = nouvelleClasse;
  }

  // ─────────────────────────────────────────────
  // 3. Creer InscriptionAnnuelle + FraisScolarite
  // ─────────────────────────────────────────────

  const paiementsRecus = []; // Pour compter les recus (pas utilise ici)

  for (const d of params.decisions) {
    const eleve = elevesMap.get(d.eleveId);
    if (!eleve) continue;

    // Cas DIPLOME : mettre a jour le statut de l'eleve
    if (d.decision === "DIPLOME" || d.niveauCible === null) {
      await db.eleve.update({
        where: { id: eleve.id },
        data: { statut: "DIPLOME" },
      });
      await db.inscriptionAnnuelle.create({
        data: {
          eleveId: eleve.id,
          classeId: eleve.classeId!,
          anneeScolaireId: anneeSource.id,
          decision: "DIPLOME",
        },
      });
      continue;
    }

    // Trouver la classe cible
    let cycle = eleve.classe!.cycle;
    if (d.niveauCible === 0) cycle = "PRESCOLAIRE" as any;
    else if (d.niveauCible >= 1 && d.niveauCible <= 6) cycle = "PREMIER_CYCLE" as any;
    else cycle = "SECOND_CYCLE" as any;

    const section = eleve.classe!.section;
    const key = d.niveauCible + "|" + (section || "") + "|" + cycle;
    const classeCible = classesCibles[key];
    if (!classeCible) continue;

    // Verifier capacite
    const effectifActuel = await db.eleve.count({
      where: { classeId: classeCible.id, statut: "INSCRIT" },
    });
    if (effectifActuel >= classeCible.capaciteMax) {
      // Augmenter la capacite de 1
      await db.classe.update({
        where: { id: classeCible.id },
        data: { capaciteMax: classeCible.capaciteMax + 1 },
      });
      classeCible.capaciteMax += 1;
    }

    // Mettre a jour l'eleve
    await db.eleve.update({
      where: { id: eleve.id },
      data: { classeId: classeCible.id },
    });

    // Creer InscriptionAnnuelle (trace historique)
    await db.inscriptionAnnuelle.create({
      data: {
        eleveId: eleve.id,
        classeId: classeCible.id,
        anneeScolaireId: anneeCible.id,
        decision: d.decision,
        moyenneAnnuelle: null,
      },
    });

    // Creer FraisScolarite + tranches
    const tranchesData: any[] = [];

    if (classeCible.fraisInscription > 0) {
      tranchesData.push({
        libelle: "Ré-inscription",
        periode: periodeStr(dateDebut.getFullYear(), dateDebut.getMonth() + 1),
        ordre: 0,
        montant: classeCible.fraisInscription,
        dateEcheance: new Date(dateDebut.getFullYear(), dateDebut.getMonth(), 5),
      });
    }

    let anneeCur = dateDebut.getFullYear();
    let moisCur = dateDebut.getMonth() + 1;
    for (let k = 0; k < nbMois; k++) {
      tranchesData.push({
        libelle: libelleMois(anneeCur, moisCur),
        periode: periodeStr(anneeCur, moisCur),
        ordre: k + 1,
        montant: classeCible.fraisScolariteMensuel,
        dateEcheance: new Date(anneeCur, moisCur - 1, 5),
      });
      moisCur++;
      if (moisCur > 12) { moisCur = 1; anneeCur++; }
    }

    await db.fraisScolarite.create({
      data: {
        etablissementId: user.etablissementId,
        eleveId: eleve.id,
        anneeScolaireId: anneeCible.id,
        fraisInscription: classeCible.fraisInscription,
        fraisScolariteMensuel: classeCible.fraisScolariteMensuel,
        reduction: 0,
        dateDebut,
        tranches: { create: tranchesData },
      },
    });
  }

  // ─────────────────────────────────────────────
  // 4. Copier les affectations (option)
  // ─────────────────────────────────────────────
  if (paramsEtab.copierAffectations) {
    for (const [key, classeCible] of Object.entries(classesCibles)) {
      // Chercher la classe source de meme (niveau, section)
      const sourceRef = classesSource.find(
        (c) => c.niveau === (classeCible as any).niveau && c.section === (classeCible as any).section
      );
      if (!sourceRef) continue;

      const affectationsSource = await db.affectation.findMany({
        where: { classeId: sourceRef.id },
      });

      for (const aff of affectationsSource) {
        try {
          await db.affectation.create({
            data: {
              enseignantId: aff.enseignantId,
              classeId: (classeCible as any).id,
              matiereId: aff.matiereId,
              type: aff.type,
              // Ne pas copier les creneaux horaires (a redefinir)
              jour: null,
              heureDebut: null,
              heureFin: null,
            },
          });
        } catch {
          // Ignorer les doublons
        }
      }
    }
  }

  // ─────────────────────────────────────────────
  // 5. Archiver l'ancienne annee, activer la nouvelle
  // ─────────────────────────────────────────────
  await db.anneeScolaire.update({
    where: { id: anneeSource.id },
    data: { archivee: true, archiveeLe: new Date(), active: false },
  });

  await db.anneeScolaire.update({
    where: { id: anneeCible.id },
    data: { active: true },
  });

  await enregistrerAudit({
    userId: user.id,
    action: "APPLIQUER_TRANSITION",
    entite: "AnneeScolaire",
    entiteId: anneeCible.id,
    details: {
      source: anneeSource.libelle,
      cible: anneeCible.libelle,
      admis: params.decisions.filter((d) => d.decision === "ADMIS").length,
      redoublants: params.decisions.filter((d) => d.decision === "REDOUBLE").length,
      diplomes: params.decisions.filter((d) => d.decision === "DIPLOME").length,
    },
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/classes");
  revalidatePath("/parametres");

  return { success: true, anneeCibleId: anneeCible.id };
}

// ═════════════════════════════════════════════
// EXPORT CSV DES NOTES + BULLETINS
// ═════════════════════════════════════════════

export async function exporterNotesCSV(anneeId: string): Promise<string> {
  const user = await requirePermission("parametres.manage");
  const db = ecole(user);

  const annee = await db.anneeScolaire.findUnique({
    where: { id: anneeId },
    include: { trimestres: { orderBy: { ordre: "asc" } } },
  });
  if (!annee || annee.etablissementId !== user.etablissementId) {
    throw new Error("Année introuvable");
  }

  const bulletins = await db.bulletin.findMany({
    where: {
      trimestre: { anneeScolaireId: anneeId },
    },
    include: {
      eleve: true,
      classe: true,
      trimestre: true,
      lignes: { include: { matiere: true } },
    },
    orderBy: [{ classe: { niveau: "asc" } }, { eleve: { nom: "asc" } }, { trimestre: { ordre: "asc" } }],
  });

  // CSV : separateur ; et echappement des guillemets
  const esc = (s: string) => '"' + s.replace(/"/g, '""') + '"';

  const lignes: string[] = [];
  lignes.push([
    "Annee", "Classe", "Matricule", "Nom", "Prenom", "Sexe",
    "Trimestre", "Matiere", "MoyenneMatiere", "Coefficient", "Points",
    "RangMatiere", "MoyenneGenerale", "Rang", "EffectifClasse",
  ].map(esc).join(";"));

  for (const b of bulletins) {
    for (const l of b.lignes) {
      lignes.push([
        annee.libelle,
        b.classe.nom || (b.classe.niveau + (b.classe.section ? " " + b.classe.section : "")),
        b.eleve.matricule,
        b.eleve.nom,
        b.eleve.prenom,
        b.eleve.sexe,
        b.trimestre.nom,
        l.nomMatiere,
        l.moyenneMatiere.toFixed(2),
        String(l.coefficient),
        l.points.toFixed(2),
        l.rangMatiere !== null ? String(l.rangMatiere) : "",
        b.moyenneGenerale.toFixed(2),
        b.rang !== null ? String(b.rang) : "",
        String(b.effectifClasse),
      ].map(esc).join(";"));
    }
  }

  await enregistrerAudit({
    userId: user.id,
    action: "EXPORT_NOTES",
    entite: "AnneeScolaire",
    entiteId: anneeId,
    details: { lignes: lignes.length - 1 },
  });

  return "\uFEFF" + lignes.join("\n"); // BOM UTF-8 pour Excel
}

// ═════════════════════════════════════════════
// SUPPRESSION DEFINITIVE DES NOTES
// ═════════════════════════════════════════════

export async function supprimerNotesAnnee(anneeId: string) {
  const user = await requirePermission("parametres.manage");
  const db = ecole(user);

  const annee = await db.anneeScolaire.findUnique({
    where: { id: anneeId },
  });
  if (!annee || annee.etablissementId !== user.etablissementId) {
    throw new Error("Année introuvable");
  }
  if (!annee.archivee) throw new Error("L'année doit être archivée avant suppression");
  if (annee.notesSupprimees) throw new Error("Notes déjà supprimées");

  // Verifier delai de 1 an
  if (annee.archiveeLe) {
    const unAnApres = new Date(annee.archiveeLe);
    unAnApres.setFullYear(unAnApres.getFullYear() + 1);
    if (new Date() < unAnApres) {
      throw new Error(
        "Suppression impossible avant " + unAnApres.toLocaleDateString("fr-FR") +
        " (1 an de conservation obligatoire)"
      );
    }
  }

  // Supprimer les bulletins (cascade supprime BulletinLigne)
  const bulletinsSupprimes = await db.bulletin.deleteMany({
    where: { trimestre: { anneeScolaireId: anneeId } },
  });

  // Supprimer les notes
  const notesSupprimees = await db.note.deleteMany({
    where: { trimestre: { anneeScolaireId: anneeId } },
  });

  await db.anneeScolaire.update({
    where: { id: anneeId },
    data: { notesSupprimees: true },
  });

  await enregistrerAudit({
    userId: user.id,
    action: "SUPPRIMER_NOTES_ANNEE",
    entite: "AnneeScolaire",
    entiteId: anneeId,
    details: { notes: notesSupprimees.count, bulletins: bulletinsSupprimes.count },
  });

  revalidatePath("/parametres");
  return {
    success: true,
    notes: notesSupprimees.count,
    bulletins: bulletinsSupprimes.count,
  };
}

// ═════════════════════════════════════════════
// LISTE DES ANNEES ARCHIVABLES / ARCHIVEES
// ═════════════════════════════════════════════

export async function getAnneesArchivables() {
  const user = await requirePermission("parametres.manage");
  const db = ecole(user);
  return db.anneeScolaire.findMany({
    where: { etablissementId: user.etablissementId },
    orderBy: { libelle: "desc" },
    include: {
      trimestres: { orderBy: { ordre: "asc" } },
      _count: { select: { classes: true } },
    },
  });
}

// Actions appelees par le client : l'erreur metier est renvoyee au lieu d'etre levee,
// sinon Next la remplace par un message generique en production (voir lib/actions/serveur.ts)
export async function preparerTransition(...a: Parameters<typeof preparerTransitionCorps>) {
  return capter(() => preparerTransitionCorps(...a));
}
export async function appliquerTransition(...a: Parameters<typeof appliquerTransitionCorps>) {
  return capter(() => appliquerTransitionCorps(...a));
}
