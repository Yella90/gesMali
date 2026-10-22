// Reprise des donnees : modeles Excel (.xlsx) et lecture des fichiers Excel, cote navigateur.
// Les librairies sont chargees a la demande : elles ne pesent que sur la page de reprise.

import { MODELES, type ColonneModele, type TypeImport } from "@/lib/reprise/modeles";

type Cellule = string | number | boolean | Date | null | undefined;

const deux = (n: number) => String(n).padStart(2, "0");

// Valeur de cellule -> texte, au format attendu par les verifications du serveur.
// Excel range les dates a minuit UTC : on lit donc le jour en UTC.
function enTexte(v: Cellule): string {
  if (v == null) return "";
  if (v instanceof Date) return deux(v.getUTCDate()) + "/" + deux(v.getUTCMonth() + 1) + "/" + v.getUTCFullYear();
  if (typeof v === "boolean") return v ? "oui" : "non";
  return String(v).trim();
}

// Premiere feuille du classeur, en tableau de textes (en-tete compris)
export async function lireExcel(fichier: File): Promise<string[][]> {
  const { readSheet } = await import("read-excel-file/browser");
  const lignes = (await readSheet(fichier)) as Cellule[][];
  return lignes.map((l) => l.map(enTexte)).filter((l) => l.some((c) => c !== ""));
}

export function estFichierExcel(fichier: File): boolean {
  return /\.xlsx$/i.test(fichier.name) || fichier.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

// Valeur d'exemple typee selon la colonne : nombre ou vraie date Excel
function celluleExemple(v: string, c: ColonneModele) {
  if (v === "") return null;
  if (c.format === "nombre") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? { value: n, type: Number } : { value: v, type: String };
  }
  if (c.format === "date") {
    const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/) ?? v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) {
      const [a, mo, j] = m[1].length === 4 ? [m[1], m[2], m[3]] : [m[3], m[2], m[1]];
      return { value: new Date(Date.UTC(Number(a), Number(mo) - 1, Number(j))), type: Date, format: "dd/mm/yyyy" };
    }
  }
  return { value: v, type: String };
}

// Modele a remplir : feuille « Donnees » (en-tete + exemples), puis feuille « Aide »
export async function telechargerModeleExcel(type: TypeImport) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const m = MODELES[type];
  const gras = { fontWeight: "bold" as const, backgroundColor: "#E8EEF5" };

  const donnees = [
    m.colonnes.map((c) => ({ value: c.titre, type: String, ...gras })),
    ...m.exemple.map((l) => m.colonnes.map((c, i) => celluleExemple(l[i] ?? "", c))),
  ];
  const aide = [
    [
      { value: "Colonne", type: String, ...gras },
      { value: "Obligatoire", type: String, ...gras },
      { value: "Contenu attendu", type: String, ...gras },
    ],
    ...m.colonnes.map((c) => [
      { value: c.titre, type: String },
      { value: c.obligatoire ? "oui" : "non", type: String },
      { value: c.aide, type: String },
    ]),
    [null, null, null],
    [{ value: "Remplacez les lignes d'exemple de la feuille « Donnees » par vos données, sans modifier la première ligne.", type: String }, null, null],
  ];

  await writeXlsxFile(
    [
      { data: donnees, sheet: "Donnees", columns: m.colonnes.map((c) => ({ width: Math.max(14, c.titre.length + 4) })), stickyRowsCount: 1 },
      { data: aide, sheet: "Aide", columns: [{ width: 22 }, { width: 12 }, { width: 70 }], stickyRowsCount: 1 },
    ],
    { fontFamily: "Calibri", fontSize: 11 }
  ).toFile("modele-" + type + ".xlsx");
}
