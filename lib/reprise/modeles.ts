// Reprise des donnees : modeles de fichiers CSV et lecture du texte colle ou importe.
// Module sans dependance serveur : utilise par la page (client) et par les actions.

export type TypeImport = "classes" | "eleves" | "notes";

export type ColonneModele = { cle: string; titre: string; obligatoire?: boolean; aide: string; alias?: string[] };

export const MODELES: Record<TypeImport, { titre: string; description: string; colonnes: ColonneModele[]; exemple: string[][] }> = {
  classes: {
    titre: "Classes",
    description: "Classes de l'année scolaire active, avec leurs frais. Une classe déjà existante (même niveau et section) est ignorée.",
    colonnes: [
      { cle: "niveau", titre: "niveau", obligatoire: true, aide: "0 à 9 (0 pour le préscolaire)" },
      { cle: "section", titre: "section", aide: "A, B… (facultatif)" },
      { cle: "nom", titre: "nom", aide: "Nom affiché, ex. 6e année A (facultatif)" },
      { cle: "cycle", titre: "cycle", aide: "préscolaire, premier ou second (déduit du niveau si vide)" },
      { cle: "salle", titre: "salle", aide: "Facultatif" },
      { cle: "fraisinscription", titre: "frais_inscription", aide: "Montant en F CFA", alias: ["inscription"] },
      { cle: "fraismensuel", titre: "frais_mensuel", aide: "Mensualité en F CFA", alias: ["mensualite", "scolarite", "fraisscolarite", "fraisscolaritemensuel"] },
      { cle: "capacite", titre: "capacite", aide: "Nombre d'élèves maximum (50 par défaut)", alias: ["capacitemax", "effectifmax"] },
    ],
    exemple: [
      ["1", "A", "1re année A", "premier", "Salle 1", "5000", "7500", "45"],
      ["7", "", "7e année", "second", "", "10000", "12500", "50"],
    ],
  },
  eleves: {
    titre: "Élèves",
    description: "Élèves avec leur classe : l'échéancier des frais est créé comme à l'inscription. Un élève déjà enregistré (même nom, prénom et date de naissance) est ignoré.",
    colonnes: [
      { cle: "nom", titre: "nom", obligatoire: true, aide: "Nom de famille" },
      { cle: "prenom", titre: "prenom", obligatoire: true, aide: "Prénom(s)", alias: ["prenoms"] },
      { cle: "datenaissance", titre: "date_naissance", obligatoire: true, aide: "JJ/MM/AAAA ou AAAA-MM-JJ", alias: ["naissance", "nele", "datedenaissance"] },
      { cle: "sexe", titre: "sexe", obligatoire: true, aide: "M ou F (G pour garçon accepté)", alias: ["genre"] },
      { cle: "classe", titre: "classe", aide: "Nom de la classe tel qu'affiché dans GES Mali, ex. 2 A" },
      { cle: "matricule", titre: "matricule", aide: "Ancien matricule à conserver (sinon attribué automatiquement)" },
      { cle: "tuteurnom", titre: "tuteur_nom", aide: "Parent ou tuteur", alias: ["tuteur", "parent", "nomtuteur", "nomparent"] },
      { cle: "tuteurtelephone", titre: "tuteur_telephone", aide: "Téléphone du tuteur", alias: ["telephone", "tel", "contact"] },
      { cle: "emailparent", titre: "email_parent", aide: "Facultatif", alias: ["email", "mail"] },
      { cle: "exonereinscription", titre: "exonere_inscription", aide: "oui pour inscrire sans frais d'inscription", alias: ["exonere", "sansinscription"] },
    ],
    exemple: [
      ["Traoré", "Aminata", "14/03/2016", "F", "2 A", "", "Moussa Traoré", "+223 76 00 00 00", "", "non"],
      ["Coulibaly", "Seydou", "2015-09-02", "M", "3 A", "ANC-0042", "Awa Coulibaly", "66000000", "", "oui"],
    ],
  },
  notes: {
    titre: "Notes",
    description: "Notes des élèves déjà enregistrés, reprises en brouillon dans la classe actuelle de l'élève. Une note déjà soumise ou validée n'est jamais remplacée.",
    colonnes: [
      { cle: "matricule", titre: "matricule", obligatoire: true, aide: "Matricule GES Mali de l'élève" },
      { cle: "matiere", titre: "matiere", obligatoire: true, aide: "Nom ou code de la matière", alias: ["discipline"] },
      { cle: "trimestre", titre: "trimestre", obligatoire: true, aide: "1, 2, 3 ou nom du trimestre de l'année active" },
      { cle: "type", titre: "type", aide: "devoir ou composition (devoir par défaut)" },
      { cle: "numero", titre: "numero", aide: "1 pour le premier devoir… (1 par défaut)", alias: ["n", "no"] },
      { cle: "note", titre: "note", obligatoire: true, aide: "Valeur, virgule ou point accepté", alias: ["valeur"] },
      { cle: "sur", titre: "sur", aide: "Barème (20 par défaut) : la note est ramenée sur 20", alias: ["bareme"] },
    ],
    exemple: [
      ["2026-0001", "Mathématiques", "1", "devoir", "1", "14,5", "20"],
      ["2026-0001", "Français", "1", "composition", "1", "7", "10"],
    ],
  },
};

// Minuscules, sans accents ni separateurs : "Date de naissance" -> "datedenaissance"
export function normaliser(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// CSV (separateur ; , ou tabulation detecte sur la premiere ligne), guillemets geres
export function analyserCsv(texte: string): string[][] {
  const t = texte.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const premiere = t.split("\n", 1)[0] ?? "";
  const sep = [";", "\t", ","].map((c) => [c, premiere.split(c).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const lignes: string[][] = [];
  let ligne: string[] = [];
  let champ = "";
  let guillemets = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (guillemets) {
      if (c === '"' && t[i + 1] === '"') { champ += '"'; i++; }
      else if (c === '"') guillemets = false;
      else champ += c;
    } else if (c === '"' && champ === "") guillemets = true;
    else if (c === sep) { ligne.push(champ.trim()); champ = ""; }
    else if (c === "\n") { ligne.push(champ.trim()); lignes.push(ligne); ligne = []; champ = ""; }
    else champ += c;
  }
  if (champ !== "" || ligne.length > 0) { ligne.push(champ.trim()); lignes.push(ligne); }
  return lignes.filter((l) => l.some((c) => c !== ""));
}

// Associe les en-tetes du fichier aux colonnes du modele
export function versLignes(type: TypeImport, tableau: string[][]) {
  const modele = MODELES[type];
  const [entete = [], ...corps] = tableau;
  const index = entete.map((h) => {
    const n = normaliser(h);
    return modele.colonnes.find((c) => c.cle === n || normaliser(c.titre) === n || c.alias?.includes(n))?.cle ?? null;
  });
  const inconnues = entete.filter((_, i) => !index[i]);
  const manquantes = modele.colonnes.filter((c) => c.obligatoire && !index.includes(c.cle)).map((c) => c.titre);
  const lignes = corps.map((l) => {
    const o: Record<string, string> = {};
    for (const c of modele.colonnes) o[c.cle] = "";
    index.forEach((cle, i) => { if (cle) o[cle] = l[i] ?? ""; });
    return o;
  });
  return { lignes, inconnues, manquantes };
}

export function modeleCsv(type: TypeImport): string {
  const m = MODELES[type];
  const echapper = (v: string) => (/[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);
  return "﻿" + [m.colonnes.map((c) => c.titre), ...m.exemple].map((l) => l.map(echapper).join(";")).join("\r\n") + "\r\n";
}
