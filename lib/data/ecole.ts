// Acces a la base limite a une ecole. Chaque requete est filtree sur l'etablissement,
// chaque ecriture verifie que ses references (classe, eleve, matiere...) sont de la
// meme ecole : un oubli dans une page ou une action ne peut plus exposer les donnees
// d'une autre ecole. Hors de ce filtre : les requetes SQL brutes ($queryRaw), qui
// filtrent elles-memes, et les objets lies charges par include/select, qui viennent
// d'une ligne deja filtree.
//
//   const db = ecole(user);              // ou ecole(etablissementId)
//   await db.classe.findMany();          // classes de cette ecole seulement

import { cache } from "react";
import { prisma } from "@/lib/db";

type Filtre = (e: string) => Record<string, unknown>;
const direct: Filtre = (e) => ({ etablissementId: e });
const parClasse: Filtre = (e) => ({ classe: { etablissementId: e } });
const parFrais: Filtre = (e) => ({ tranche: { frais: { etablissementId: e } } });

// Rattachement de chaque table a son ecole
export const PORTEE: Record<string, Filtre> = {
  Etablissement: (e) => ({ id: e }),
  ParametresEtablissement: direct,
  Employe: direct,
  User: direct,
  AnneeScolaire: direct,
  Matiere: direct,
  Classe: direct,
  Eleve: direct,
  Paiement: direct,
  FraisScolarite: direct,
  MouvementTresorerie: direct,
  DepenseRecurrente: direct,
  Trimestre: (e) => ({ anneeScolaire: { etablissementId: e } }),
  InscriptionAnnuelle: (e) => ({ anneeScolaire: { etablissementId: e } }),
  Affectation: parClasse,
  Note: parClasse,
  Bulletin: parClasse,
  Presence: parClasse,
  BulletinLigne: (e) => ({ bulletin: { classe: { etablissementId: e } } }),
  TrancheFrais: (e) => ({ frais: { etablissementId: e } }),
  PaiementFrais: parFrais,
  Rappel: parFrais,
  AuditLog: (e) => ({ user: { etablissementId: e } }),
};

// Tables de la plateforme, communes a toutes les ecoles (jamais filtrees)
export const HORS_ECOLE: string[] = [];

// Tables portant directement la colonne etablissementId
const DIRECTES = new Set(Object.entries(PORTEE).filter(([, f]) => f === direct).map(([m]) => m));

type Relation = { modele: string; cle?: string }; // cle : cle etrangere (absente cote liste)
const r = (modele: string, cle?: string): Relation => (cle ? { modele, cle } : { modele });
const E = (cle?: string): Relation => r("Etablissement", cle);

// Relations de chaque table (verifiees contre prisma/schema.prisma par les tests)
export const RELATIONS: Record<string, Record<string, Relation>> = {
  Employe: {
    etablissement: E("etablissementId"), user: r("User"), affectations: r("Affectation"), paiements: r("Paiement"),
    classesTitulaire: r("Classe"), classesPrincipal: r("Classe"), lignesBulletin: r("BulletinLigne"),
  },
  User: {
    employe: r("Employe", "employeId"), etablissement: E("etablissementId"), notesSaisies: r("Note"), notesModifiees: r("Note"),
    bulletinsGeneres: r("Bulletin"), paiementsSaisis: r("Paiement"), paiementsAnnules: r("Paiement"), fraisSaisis: r("PaiementFrais"),
    rappelsSaisis: r("Rappel"), auditLogs: r("AuditLog"), mouvementsSaisis: r("MouvementTresorerie"), presencesSaisies: r("Presence"),
  },
  Etablissement: {
    users: r("User"), employes: r("Employe"), anneesScolaires: r("AnneeScolaire"), matieres: r("Matiere"), classes: r("Classe"),
    eleves: r("Eleve"), paiements: r("Paiement"), fraisScolarite: r("FraisScolarite"), mouvements: r("MouvementTresorerie"),
    depensesRecurrentes: r("DepenseRecurrente"), parametres: r("ParametresEtablissement"),
  },
  ParametresEtablissement: { etablissement: E("etablissementId") },
  AnneeScolaire: {
    etablissement: E("etablissementId"), trimestres: r("Trimestre"), classes: r("Classe"), frais: r("FraisScolarite"),
    inscriptions: r("InscriptionAnnuelle"),
  },
  Trimestre: { anneeScolaire: r("AnneeScolaire", "anneeScolaireId"), notes: r("Note"), bulletins: r("Bulletin") },
  Matiere: { etablissement: E("etablissementId"), affectations: r("Affectation"), notes: r("Note"), bulletinLignes: r("BulletinLigne") },
  Classe: {
    etablissement: E("etablissementId"), anneeScolaire: r("AnneeScolaire", "anneeScolaireId"), titulaire: r("Employe", "titulaireId"),
    professeurPrincipal: r("Employe", "professeurPrincipalId"), eleves: r("Eleve"), inscriptions: r("InscriptionAnnuelle"),
    affectations: r("Affectation"), notes: r("Note"), presences: r("Presence"), bulletins: r("Bulletin"),
  },
  Eleve: {
    etablissement: E("etablissementId"), classe: r("Classe", "classeId"), notes: r("Note"), inscriptions: r("InscriptionAnnuelle"),
    bulletins: r("Bulletin"), presences: r("Presence"), fraisScolarite: r("FraisScolarite"),
  },
  Affectation: { enseignant: r("Employe", "enseignantId"), classe: r("Classe", "classeId"), matiere: r("Matiere", "matiereId") },
  Note: {
    eleve: r("Eleve", "eleveId"), matiere: r("Matiere", "matiereId"), classe: r("Classe", "classeId"), trimestre: r("Trimestre", "trimestreId"),
    saisiePar: r("User", "saisieParId"), modifieePar: r("User", "modifieeParId"),
  },
  Bulletin: {
    eleve: r("Eleve", "eleveId"), trimestre: r("Trimestre", "trimestreId"), classe: r("Classe", "classeId"),
    generePar: r("User", "genereParId"), lignes: r("BulletinLigne"),
  },
  BulletinLigne: { bulletin: r("Bulletin", "bulletinId"), matiere: r("Matiere", "matiereId"), professeur: r("Employe", "professeurId") },
  Paiement: {
    etablissement: E("etablissementId"), employe: r("Employe", "employeId"), saisiePar: r("User", "saisieParId"),
    annulePar: r("User", "annuleParId"),
  },
  FraisScolarite: {
    etablissement: E("etablissementId"), eleve: r("Eleve", "eleveId"), anneeScolaire: r("AnneeScolaire", "anneeScolaireId"),
    tranches: r("TrancheFrais"),
  },
  TrancheFrais: { frais: r("FraisScolarite", "fraisId"), paiements: r("PaiementFrais"), rappels: r("Rappel") },
  PaiementFrais: { tranche: r("TrancheFrais", "trancheId"), saisiePar: r("User", "saisieParId") },
  Rappel: { tranche: r("TrancheFrais", "trancheId"), saisiePar: r("User", "saisieParId") },
  AuditLog: { user: r("User", "userId") },
  InscriptionAnnuelle: { eleve: r("Eleve", "eleveId"), classe: r("Classe", "classeId"), anneeScolaire: r("AnneeScolaire", "anneeScolaireId") },
  MouvementTresorerie: { etablissement: E("etablissementId"), saisiePar: r("User", "saisieParId") },
  DepenseRecurrente: { etablissement: E("etablissementId") },
  Presence: { eleve: r("Eleve", "eleveId"), classe: r("Classe", "classeId"), saisiePar: r("User", "saisieParId") },
};

const REFUS = "Accès refusé : donnée d'une autre école";

const FILTREES = new Set([
  "findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "findMany", "count", "aggregate", "groupBy",
  "update", "updateMany", "updateManyAndReturn", "delete", "deleteMany", "upsert",
]);
const CREATIONS = new Set(["create", "createMany", "createManyAndReturn", "upsert"]);
const MISES_A_JOUR = new Set(["update", "updateMany", "updateManyAndReturn", "upsert"]);

type Donnees = Record<string, unknown>;
const estObjet = (v: unknown): v is Donnees => typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof Date);
const enListe = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

// Ajoute le filtre de l'ecole aux conditions existantes (les champs uniques restent en tete)
function avecEcole(where: unknown, filtre: Donnees): Donnees {
  if (!estObjet(where)) return filtre;
  return { ...where, AND: [...enListe(where.AND as Donnees | Donnees[] | undefined), filtre] };
}

function creer(etablissementId: string) {
  // Lignes deja verifiees pour cette ecole (une requete par identifiant au plus)
  const verifiees = new Map<string, Promise<boolean>>();

  // Les references d'une ecriture doivent appartenir a l'ecole
  async function verifierReferences(refs: { modele: string; id: string }[]) {
    const parModele = new Map<string, string[]>();
    const attentes: Promise<boolean>[] = [];
    for (const { modele, id } of refs) {
      if (modele === "Etablissement") {
        if (id !== etablissementId) throw new Error(REFUS);
        continue;
      }
      const cle = modele + ":" + id;
      const deja = verifiees.get(cle);
      if (deja) attentes.push(deja);
      else parModele.set(modele, [...(parModele.get(modele) ?? []), id]);
    }
    for (const [modele, ids] of parModele) {
      const uniques = [...new Set(ids)];
      const delegue = (prisma as unknown as Record<string, { findMany: (a: object) => Promise<{ id: string }[]> }>)[
        modele.charAt(0).toLowerCase() + modele.slice(1)
      ];
      const requete = delegue
        .findMany({ where: { id: { in: uniques }, ...PORTEE[modele](etablissementId) }, select: { id: true } })
        .then((rows) => new Set(rows.map((x) => x.id)));
      for (const id of uniques) {
        const p = requete.then((trouves) => trouves.has(id));
        verifiees.set(modele + ":" + id, p);
        attentes.push(p);
      }
    }
    const resultats = await Promise.all(attentes);
    if (resultats.some((ok) => !ok)) throw new Error(REFUS);
  }

  // Parcourt les donnees d'une ecriture (et ses creations imbriquees) : references a verifier.
  // creation : la ligne est creee ici (etablissementId impose pour les tables directes).
  function references(modele: string, data: Donnees, creation: boolean, refs: { modele: string; id: string }[]): Donnees {
    const relations = RELATIONS[modele] ?? {};
    const sortie: Donnees = { ...data };

    for (const [champ, valeur] of Object.entries(data)) {
      const relation = relations[champ];
      if (relation && estObjet(valeur)) {
        // Relation sous forme d'objet : connect / create / connectOrCreate / upsert imbriques
        for (const c of enListe(valeur.connect as Donnees | Donnees[] | undefined)) {
          if (typeof c.id !== "string") throw new Error(REFUS);
          refs.push({ modele: relation.modele, id: c.id });
        }
        const imbrique: Donnees = { ...valeur };
        if (valeur.create !== undefined) {
          const liste = enListe(valeur.create as Donnees | Donnees[]).map((d) => references(relation.modele, d, true, refs));
          imbrique.create = Array.isArray(valeur.create) ? liste : liste[0];
        }
        if (estObjet(valeur.createMany)) {
          imbrique.createMany = {
            ...valeur.createMany,
            data: enListe(valeur.createMany.data as Donnees | Donnees[]).map((d) => references(relation.modele, d, true, refs)),
          };
        }
        if (valeur.connectOrCreate !== undefined || valeur.upsert !== undefined) {
          throw new Error("Écriture imbriquée non prise en charge par le filtre d'école (" + modele + "." + champ + ")");
        }
        sortie[champ] = imbrique;
        continue;
      }
      // Cle etrangere en clair : classeId, eleveId...
      const cle = Object.values(relations).find((x) => x.cle === champ);
      if (cle) {
        const id = estObjet(valeur) ? valeur.set : valeur;
        if (typeof id === "string") refs.push({ modele: cle.modele, id });
      }
    }

    // Tables directes : l'ecole d'une ligne creee est imposee, jamais changee ensuite
    if (DIRECTES.has(modele)) {
      const relationEcole = estObjet(data.etablissement);
      if (creation && !relationEcole && data.etablissementId === undefined) {
        // Parents relies par objet (classe: { connect }) : l'ecole se relie de la meme facon.
        // Les creations imbriquees d'enfants (tranches: { create }) restent compatibles avec etablissementId.
        const avecRelations = Object.keys(data).some((k) => relations[k]?.cle && estObjet(data[k]));
        if (avecRelations) sortie.etablissement = { connect: { id: etablissementId } };
        else sortie.etablissementId = etablissementId;
      }
    }
    return sortie;
  }

  return prisma.$extends({
    name: "ecole",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (HORS_ECOLE.includes(model)) return query(args);
          const filtre = PORTEE[model];
          if (!filtre) throw new Error("Table sans rattachement à une école : " + model);
          if (model === "Etablissement" && CREATIONS.has(operation)) throw new Error("Création d'établissement interdite ici");

          const a = { ...(args as Donnees) };
          if (FILTREES.has(operation)) a.where = avecEcole(a.where, filtre(etablissementId));

          const refs: { modele: string; id: string }[] = [];
          if (operation === "create") a.data = references(model, a.data as Donnees, true, refs);
          if (operation === "createMany" || operation === "createManyAndReturn") {
            a.data = enListe(a.data as Donnees | Donnees[]).map((d) => references(model, d, true, refs));
          }
          if (operation === "upsert") {
            a.create = references(model, a.create as Donnees, true, refs);
            a.update = references(model, a.update as Donnees, false, refs);
          }
          if (MISES_A_JOUR.has(operation) && operation !== "upsert") a.data = references(model, a.data as Donnees, false, refs);
          if (refs.length) await verifierReferences(refs);

          return query(a as typeof args);
        },
      },
    },
  });
}

export type ClientEcole = ReturnType<typeof creer>;

// Un client par ecole et par requete (React cache), pour partager les verifications
const clientPour = cache((etablissementId: string) => creer(etablissementId));

export function ecole(u: string | { etablissementId: string }): ClientEcole {
  const etablissementId = typeof u === "string" ? u : u.etablissementId;
  if (!etablissementId) throw new Error("École inconnue");
  return clientPour(etablissementId);
}
