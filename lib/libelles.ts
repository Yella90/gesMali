// Libelles lisibles des valeurs techniques (enums Prisma) affichees a l'ecran.
// Ne jamais afficher la valeur brute (PRESCOLAIRE, DECENTRALISEE...) a l'utilisateur.

const lib = (table: Record<string, string>) => (valeur: string | null | undefined) =>
  valeur ? (table[valeur] ?? valeur) : "-";

export const libCycle = lib({
  PRESCOLAIRE: "Préscolaire",
  PREMIER_CYCLE: "Premier cycle",
  SECOND_CYCLE: "Second cycle",
});

export const libStatutEleve = lib({
  INSCRIT: "Inscrit(e)",
  TRANSFERE: "Transféré(e)",
  RADIE: "Radié(e)",
  DIPLOME: "Diplômé(e)",
});

export const libModeSaisie = lib({
  DECENTRALISEE: "Décentralisée",
  CENTRALISEE: "Centralisée",
  MIXTE: "Mixte",
});

export const libTypeEtablissement = lib({
  PUBLIC: "Public",
  PRIVE: "Privé",
  COMMUNAUTAIRE: "Communautaire",
  MEDERSA: "Medersa",
});

export const libRole = lib({
  DIRECTEUR: "Directeur",
  SECRETAIRE: "Secrétaire",
  COMPTABLE: "Comptable",
  ENSEIGNANT: "Enseignant",
});

export const libTypeNote = lib({
  DEVOIR: "Devoir",
  COMPOSITION: "Composition",
});
