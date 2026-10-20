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
  Acces: direct,
  // Un compte appartient aux ecoles ou il a un acces (il peut en avoir plusieurs)
  User: (e) => ({ acces: { some: { etablissementId: e } } }),
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
  PaiementFrais: direct,
  CompteurRecu: direct,
  Rappel: parFrais,
  AuditLog: direct,
};

// Tables de la plateforme, communes a toutes les ecoles (jamais filtrees)
export const HORS_ECOLE: string[] = ["EchecConnexion", "JetonEmail"];

// Tables portant directement la colonne etablissementId
const DIRECTES = new Set(Object.entries(PORTEE).filter(([, f]) => f === direct).map(([m]) => m));

type Relation = { modele: string; cle?: string }; // cle : cle etrangere (absente cote liste)
const r = (modele: string, cle?: string): Relation => (cle ? { modele, cle } : { modele });
const E = (cle?: string): Relation => r("Etablissement", cle);

// Relations de chaque table (verifiees contre prisma/schema.prisma par les tests)
export const RELATIONS: Record<string, Record<string, Relation>> = {
  Employe: {
    etablissement: E("etablissementId"), user: r("User"), affectations: r("Affectation"), paiements: r("Paiement"),
    classesTitulaire: r("Classe"), classesPrincipal: r("Classe"), lignesBulletin: r("BulletinLigne"), acces: r("Acces"),
  },
  User: {
    employe: r("Employe", "employeId"), etablissement: E("etablissementId"), notesSaisies: r("Note"), notesModifiees: r("Note"),
    bulletinsGeneres: r("Bulletin"), paiementsSaisis: r("Paiement"), paiementsAnnules: r("Paiement"), fraisSaisis: r("PaiementFrais"),
    rappelsSaisis: r("Rappel"), auditLogs: r("AuditLog"), mouvementsSaisis: r("MouvementTresorerie"), presencesSaisies: r("Presence"),
    acces: r("Acces"), jetons: r("JetonEmail"),
  },
  Acces: { user: r("User", "userId"), etablissement: E("etablissementId"), employe: r("Employe", "employeId") },
  Etablissement: {
    users: r("User"), employes: r("Employe"), anneesScolaires: r("AnneeScolaire"), matieres: r("Matiere"), classes: r("Classe"),
    eleves: r("Eleve"), paiements: r("Paiement"), fraisScolarite: r("FraisScolarite"), mouvements: r("MouvementTresorerie"),
    depensesRecurrentes: r("DepenseRecurrente"), parametres: r("ParametresEtablissement"), acces: r("Acces"),
    auditLogs: r("AuditLog"), paiementsFrais: r("PaiementFrais"), compteursRecus: r("CompteurRecu"),
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
  PaiementFrais: { etablissement: E("etablissementId"), tranche: r("TrancheFrais", "trancheId"), saisiePar: r("User", "saisieParId") },
  CompteurRecu: { etablissement: E("etablissementId") },
  Rappel: { tranche: r("TrancheFrais", "trancheId"), saisiePar: r("User", "saisieParId") },
  AuditLog: { user: r("User", "userId"), etablissement: E("etablissementId") },
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
const LOTS = new Set(["createMany", "createManyAndReturn", "updateMany", "updateManyAndReturn"]);

type Donnees = Record<string, unknown>;
const estObjet = (v: unknown): v is Donnees => typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof Date);
const enListe = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

// Ajoute le filtre de l'ecole aux conditions existantes (les champs uniques restent en tete)
function avecEcole(where: unknown, filtre: Donnees): Donnees {
  if (!estObjet(where)) return filtre;
  return { ...where, AND: [...enListe(where.AND as Donnees | Donnees[] | undefined), filtre] };
}

function creer(etablissementId: string) {
  // Lignes connues pour appartenir a l'ecole pendant cette requete : verifiees,
  // ou creees par ce filtre. Une ecriture qui ne reference que celles-ci part telle quelle.
  const sures = new Set<string>(["Etablissement:" + etablissementId]);
  const portee = (modele: string) => PORTEE[modele](etablissementId);

  // Ecritures en lot (createMany, updateMany) : les references sont controlees par une
  // requete a part. On y cherche les lignes d'une AUTRE ecole : une ligne creee plus tot
  // dans la meme transaction n'y est pas encore visible et passe (creee par ce filtre),
  // une reference inexistante est rejetee par la base elle-meme.
  async function controlerEnLot(refs: { modele: string; id: string }[]) {
    const parModele = new Map<string, Set<string>>();
    for (const { modele, id } of refs) {
      if (sures.has(modele + ":" + id)) continue;
      if (modele === "Etablissement") throw new Error(REFUS);
      parModele.set(modele, (parModele.get(modele) ?? new Set<string>()).add(id));
    }
    await Promise.all(
      [...parModele].map(async ([modele, ids]) => {
        const delegue = (prisma as unknown as Record<string, { findMany: (a: object) => Promise<{ id: string }[]> }>)[
          modele.charAt(0).toLowerCase() + modele.slice(1)
        ];
        const etrangeres = await delegue.findMany({ where: { id: { in: [...ids] }, NOT: portee(modele) }, select: { id: true } });
        if (etrangeres.length) throw new Error(REFUS);
        for (const id of ids) sures.add(modele + ":" + id);
      })
    );
  }

  // Prepare les donnees d'une ecriture unitaire (create, update, upsert) et de ses creations
  // imbriquees. Si une reference n'est pas encore sure, toutes les cles etrangeres deviennent
  // des liaisons limitees a l'ecole (classe: { connect: { id, AND: [ecole] } }) : la base les
  // controle dans la meme requete et la meme transaction. aConfirmer : references a marquer
  // sures apres succes.
  function preparer(modele: string, data: Donnees, creation: boolean, aConfirmer: string[]): Donnees {
    const relations = RELATIONS[modele] ?? {};
    const cles = Object.entries(relations).filter(([, x]) => x.cle) as [string, Required<Relation>][];
    const idDe = (v: unknown) => (estObjet(v) && "set" in v ? v.set : v);

    // Parents deja relies par objet (classe: { connect }) : forme "liaisons" obligatoire
    const parObjet = cles.some(([nom]) => estObjet(data[nom]));
    const nonSures = cles.filter(([, x]) => {
      const id = idDe(data[x.cle]);
      return typeof id === "string" && !sures.has(x.modele + ":" + id);
    });
    const parLiaisons = parObjet || nonSures.length > 0;

    const sortie: Donnees = {};
    for (const [champ, valeur] of Object.entries(data)) {
      const relation = relations[champ];
      if (relation && estObjet(valeur)) {
        if (valeur.connectOrCreate !== undefined || valeur.upsert !== undefined || valeur.set !== undefined || valeur.createMany !== undefined) {
          throw new Error("Écriture imbriquée non prise en charge par le filtre d'école (" + modele + "." + champ + ")");
        }
        const imbrique: Donnees = { ...valeur };
        if (valeur.connect !== undefined) {
          const liste = enListe(valeur.connect as Donnees | Donnees[]).map((c) => ({
            ...c,
            AND: [...enListe(c.AND as Donnees | Donnees[] | undefined), portee(relation.modele)],
          }));
          imbrique.connect = Array.isArray(valeur.connect) ? liste : liste[0];
        }
        if (valeur.create !== undefined) {
          const liste = enListe(valeur.create as Donnees | Donnees[]).map((d) => preparer(relation.modele, d, true, aConfirmer));
          imbrique.create = Array.isArray(valeur.create) ? liste : liste[0];
        }
        sortie[champ] = imbrique;
        continue;
      }

      const cle = cles.find(([, x]) => x.cle === champ);
      if (!cle) {
        sortie[champ] = valeur;
        continue;
      }
      const [nom, x] = cle;
      const id = idDe(valeur);
      if (x.modele === "Etablissement" && id !== etablissementId) throw new Error(REFUS);
      if (!parLiaisons) {
        sortie[champ] = valeur;
      } else if (id === null) {
        if (!creation) sortie[nom] = { disconnect: true };
      } else if (typeof id === "string") {
        sortie[nom] = { connect: { id, AND: [portee(x.modele)] } };
        aConfirmer.push(x.modele + ":" + id);
      }
    }

    // Tables directes : l'ecole d'une ligne creee est imposee
    if (creation && DIRECTES.has(modele) && data.etablissementId === undefined && !estObjet(data.etablissement)) {
      if (parLiaisons) sortie.etablissement = { connect: { id: etablissementId } };
      else sortie.etablissementId = etablissementId;
    }
    return sortie;
  }

  // Ecritures en lot : etablissementId impose, references controlees a part
  function preparerLot(modele: string, data: Donnees, creation: boolean, refs: { modele: string; id: string }[]): Donnees {
    const sortie: Donnees = { ...data };
    for (const x of Object.values(RELATIONS[modele] ?? {})) {
      if (!x.cle) continue;
      const v = data[x.cle];
      const id = estObjet(v) && "set" in v ? v.set : v;
      if (typeof id === "string") refs.push({ modele: x.modele, id });
    }
    if (creation && DIRECTES.has(modele) && data.etablissementId === undefined) sortie.etablissementId = etablissementId;
    return sortie;
  }

  return prisma.$extends({
    name: "ecole",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (HORS_ECOLE.includes(model)) return query(args);
          if (!PORTEE[model]) throw new Error("Table sans rattachement à une école : " + model);
          if (model === "Etablissement" && CREATIONS.has(operation)) throw new Error("Création d'établissement interdite ici");

          const a = { ...(args as Donnees) };
          if (FILTREES.has(operation)) a.where = avecEcole(a.where, portee(model));

          const aConfirmer: string[] = [];
          if (operation === "create") a.data = preparer(model, a.data as Donnees, true, aConfirmer);
          if (operation === "update") a.data = preparer(model, a.data as Donnees, false, aConfirmer);
          if (operation === "upsert") {
            a.create = preparer(model, a.create as Donnees, true, aConfirmer);
            a.update = preparer(model, a.update as Donnees, false, aConfirmer);
          }
          if (LOTS.has(operation)) {
            const refs: { modele: string; id: string }[] = [];
            const creation = operation.startsWith("create");
            a.data = Array.isArray(a.data)
              ? a.data.map((d: Donnees) => preparerLot(model, d, creation, refs))
              : preparerLot(model, a.data as Donnees, creation, refs);
            await controlerEnLot(refs);
          }

          let resultat: unknown;
          try {
            resultat = await query(a as typeof args);
          } catch (e) {
            // Liaison refusee par la base : reference d'une autre ecole (ou inexistante)
            if (aConfirmer.length && (e as { code?: string }).code === "P2025") throw new Error(REFUS);
            throw e;
          }
          for (const cle of aConfirmer) sures.add(cle);
          if (CREATIONS.has(operation)) {
            for (const ligne of enListe(resultat as Donnees | Donnees[])) {
              if (estObjet(ligne) && typeof ligne.id === "string") sures.add(model + ":" + ligne.id);
            }
          }
          return resultat;
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
