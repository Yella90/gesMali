"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { enregistrerAudit } from "@/lib/audit";
import { capter } from "@/lib/actions/serveur";
import { genererCodeParent } from "@/lib/portail/acces";
import { formatMatricule, prochainNumeroMatricule, tranchesAnnee } from "@/lib/eleves/inscription";
import { normaliser, type TypeImport } from "@/lib/reprise/modeles";

export type ResultatLigne = { ligne: number; statut: "ok" | "ignore" | "erreur"; message: string };
export type BilanImport = { resultats: ResultatLigne[]; aCreer: number; ignores: number; erreurs: number; ecrit: boolean };

type Ligne = Record<string, string>;
const MAX_LIGNES: Record<TypeImport, number> = { classes: 200, eleves: 1500, notes: 10000 };

// Verifie toutes les lignes ; avec `ecrire`, enregistre seulement si aucune ligne n'est en erreur
export async function importerDonnees(type: TypeImport, lignes: Ligne[], ecrire: boolean) {
  return capter(async (): Promise<BilanImport> => {
    const user = await requirePermission("reprise.manage");
    if (!MAX_LIGNES[type]) throw new Error("Type d'import inconnu");
    if (lignes.length === 0) throw new Error("Aucune ligne à importer");
    if (lignes.length > MAX_LIGNES[type]) throw new Error("Import limité à " + MAX_LIGNES[type] + " lignes à la fois : découpez le fichier");

    const annee = await prisma.anneeScolaire.findFirst({ where: { etablissementId: user.etablissementId, active: true } });
    if (!annee) throw new Error("Aucune année scolaire active : créez-la dans Paramètres avant la reprise");

    const ctx = { etablissementId: user.etablissementId, userId: user.id, annee };
    const preparation =
      type === "classes" ? await preparerClasses(ctx, lignes) : type === "eleves" ? await preparerEleves(ctx, lignes) : await preparerNotes(ctx, lignes);

    const erreurs = preparation.resultats.filter((r) => r.statut === "erreur").length;
    const ignores = preparation.resultats.filter((r) => r.statut === "ignore").length;
    const aCreer = preparation.resultats.filter((r) => r.statut === "ok").length;
    let ecrit = false;
    if (ecrire && erreurs === 0 && aCreer > 0) {
      await preparation.ecrire();
      ecrit = true;
      await enregistrerAudit({
        userId: user.id,
        action: "REPRISE_" + type.toUpperCase(),
        entite: "Etablissement",
        entiteId: user.etablissementId,
        details: { lignes: lignes.length, enregistrees: aCreer, ignorees: ignores },
      });
      revalidatePath("/", "layout");
    }
    return { resultats: preparation.resultats, aCreer, ignores, erreurs, ecrit };
  });
}

type Ctx = { etablissementId: string; userId: string; annee: { id: string; dateDebut: Date; dateFin: Date } };
type Preparation = { resultats: ResultatLigne[]; ecrire: () => Promise<void> };

const texte = (v: string | undefined) => (v ?? "").trim();
function nombre(v: string | undefined): number | null {
  const t = texte(v).replace(/\s|F|CFA|fcfa/gi, "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}
function oui(v: string | undefined) {
  return ["oui", "o", "yes", "y", "1", "x", "vrai", "true"].includes(normaliser(texte(v)));
}
function libClasse(c: { nom: string | null; niveau: number; section: string | null }) {
  return c.nom || c.niveau + (c.section ? " " + c.section : "");
}

// ── Classes ──────────────────────────────────────────────────────────────
function cycleDe(v: string, niveau: number): "PRESCOLAIRE" | "PREMIER_CYCLE" | "SECOND_CYCLE" | null {
  const n = normaliser(v);
  if (!n) return niveau === 0 ? "PRESCOLAIRE" : niveau <= 6 ? "PREMIER_CYCLE" : "SECOND_CYCLE";
  if (n.startsWith("presco") || n.includes("maternel") || n === "0") return "PRESCOLAIRE";
  if (n === "1" || n.startsWith("prem") || n.startsWith("1er") || n.endsWith("1") || n === "premiercycle") return "PREMIER_CYCLE";
  if (n === "2" || n.startsWith("sec") || n.startsWith("2e") || n.startsWith("deux") || n.endsWith("2")) return "SECOND_CYCLE";
  return null;
}

async function preparerClasses(ctx: Ctx, lignes: Ligne[]): Promise<Preparation> {
  const existantes = await prisma.classe.findMany({
    where: { etablissementId: ctx.etablissementId, anneeScolaireId: ctx.annee.id },
    select: { niveau: true, section: true },
  });
  const cles = new Set(existantes.map((c) => c.niveau + "|" + (c.section ?? "").toUpperCase()));
  const vues = new Set<string>();
  const resultats: ResultatLigne[] = [];
  const aCreer: {
    niveau: number; section: string | null; nom: string | null; cycle: "PRESCOLAIRE" | "PREMIER_CYCLE" | "SECOND_CYCLE";
    salle: string | null; fraisInscription: number; fraisScolariteMensuel: number; capaciteMax: number;
  }[] = [];

  lignes.forEach((l, i) => {
    const ligne = i + 1;
    const niveau = nombre(l.niveau);
    const section = texte(l.section).toUpperCase() || null;
    const fi = nombre(l.fraisinscription) ?? 0;
    const fm = nombre(l.fraismensuel) ?? 0;
    const cap = nombre(l.capacite) ?? 50;
    const erreur = (message: string) => resultats.push({ ligne, statut: "erreur", message });
    if (niveau === null || !Number.isInteger(niveau) || niveau < 0 || niveau > 9) return erreur("Niveau invalide (0 à 9)");
    if (section && section.length > 5) return erreur("Section trop longue (5 caractères maximum)");
    const cycle = cycleDe(texte(l.cycle), niveau);
    if (!cycle) return erreur("Cycle inconnu : « " + l.cycle + " »");
    if (Number.isNaN(fi) || fi < 0 || Number.isNaN(fm) || fm < 0) return erreur("Montant de frais invalide");
    if (Number.isNaN(cap) || !Number.isInteger(cap) || cap < 1 || cap > 200) return erreur("Capacité invalide (1 à 200)");
    const cle = niveau + "|" + (section ?? "");
    const lib = libClasse({ nom: texte(l.nom) || null, niveau, section });
    if (vues.has(cle)) return erreur("Classe en double dans le fichier");
    vues.add(cle);
    if (cles.has(cle)) return resultats.push({ ligne, statut: "ignore", message: lib + " existe déjà" });
    aCreer.push({ niveau, section, nom: texte(l.nom).slice(0, 50) || null, cycle, salle: texte(l.salle).slice(0, 50) || null, fraisInscription: fi, fraisScolariteMensuel: fm, capaciteMax: cap });
    resultats.push({ ligne, statut: "ok", message: lib + " sera créée" });
  });

  return {
    resultats,
    ecrire: async () => {
      await prisma.classe.createMany({
        data: aCreer.map((c) => ({ ...c, etablissementId: ctx.etablissementId, anneeScolaireId: ctx.annee.id })),
      });
    },
  };
}

// ── Eleves ───────────────────────────────────────────────────────────────
function dateDe(v: string): Date | null {
  const t = texte(v);
  let m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return valide(Number(m[3]), Number(m[2]), Number(m[1]));
  m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return valide(Number(m[1]), Number(m[2]), Number(m[3]));
  return null;
}
function valide(a: number, mo: number, j: number): Date | null {
  const d = new Date(Date.UTC(a, mo - 1, j));
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== j) return null;
  if (a < 1950 || d > new Date()) return null;
  return d;
}
function sexeDe(v: string): "M" | "F" | null {
  const n = normaliser(v);
  if (["m", "g", "garcon", "masculin", "h", "homme"].includes(n)) return "M";
  if (["f", "fille", "feminin", "femme"].includes(n)) return "F";
  return null;
}

async function preparerEleves(ctx: Ctx, lignes: Ligne[]): Promise<Preparation> {
  const [classes, existants] = await Promise.all([
    prisma.classe.findMany({
      where: { etablissementId: ctx.etablissementId, anneeScolaireId: ctx.annee.id },
      select: {
        id: true, nom: true, niveau: true, section: true, capaciteMax: true, fraisInscription: true, fraisScolariteMensuel: true,
        _count: { select: { eleves: { where: { statut: "INSCRIT" } } } },
      },
    }),
    prisma.eleve.findMany({
      where: { etablissementId: ctx.etablissementId },
      select: { nom: true, prenom: true, dateNaissance: true, matricule: true },
    }),
  ]);
  const parLibelle = new Map<string, (typeof classes)[number]>();
  for (const c of classes) {
    parLibelle.set(normaliser(libClasse(c)), c);
    parLibelle.set(normaliser(c.niveau + (c.section ?? "")), c);
  }
  const personne = (nom: string, prenom: string, d: Date) => normaliser(nom) + "|" + normaliser(prenom) + "|" + d.toISOString().slice(0, 10);
  const personnes = new Set(existants.map((e) => personne(e.nom, e.prenom, e.dateNaissance)));
  const matricules = new Set(existants.map((e) => e.matricule.toUpperCase()));
  const effectif = new Map(classes.map((c) => [c.id, c._count.eleves]));
  const vuesPersonnes = new Set<string>();
  const vuesMatricules = new Set<string>();
  const resultats: ResultatLigne[] = [];
  const aCreer: {
    nom: string; prenom: string; dateNaissance: Date; sexe: "M" | "F"; matricule: string | null;
    tuteurNom: string | null; tuteurTelephone: string | null; emailParent: string | null;
    classe: (typeof classes)[number] | null; exonere: boolean;
  }[] = [];

  lignes.forEach((l, i) => {
    const ligne = i + 1;
    const erreur = (message: string) => resultats.push({ ligne, statut: "erreur", message });
    const nom = texte(l.nom);
    const prenom = texte(l.prenom);
    if (nom.length < 2) return erreur("Nom manquant ou trop court");
    if (prenom.length < 2) return erreur("Prénom manquant ou trop court");
    const dateNaissance = dateDe(l.datenaissance);
    if (!dateNaissance) return erreur("Date de naissance invalide : « " + l.datenaissance + " » (JJ/MM/AAAA)");
    const sexe = sexeDe(l.sexe);
    if (!sexe) return erreur("Sexe invalide : « " + l.sexe + " » (M ou F)");
    const email = texte(l.emailparent) || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return erreur("Email invalide");
    let classe: (typeof classes)[number] | null = null;
    if (texte(l.classe)) {
      classe = parLibelle.get(normaliser(l.classe)) ?? null;
      if (!classe) return erreur("Classe introuvable dans l'année active : « " + l.classe + " »");
    }
    const matricule = texte(l.matricule).toUpperCase() || null;
    const cle = personne(nom, prenom, dateNaissance);
    if (vuesPersonnes.has(cle)) return erreur("Élève en double dans le fichier");
    vuesPersonnes.add(cle);
    if (personnes.has(cle)) return resultats.push({ ligne, statut: "ignore", message: prenom + " " + nom + " est déjà enregistré(e)" });
    if (matricule) {
      if (matricule.length > 30) return erreur("Matricule trop long");
      if (matricules.has(matricule)) return erreur("Matricule " + matricule + " déjà attribué à un autre élève");
      if (vuesMatricules.has(matricule)) return erreur("Matricule en double dans le fichier");
      vuesMatricules.add(matricule);
    }
    if (classe) {
      const n = (effectif.get(classe.id) ?? 0) + 1;
      if (n > classe.capaciteMax) return erreur("Classe " + libClasse(classe) + " pleine (" + classe.capaciteMax + " élèves maximum)");
      effectif.set(classe.id, n);
    }
    aCreer.push({
      nom, prenom, dateNaissance, sexe, matricule,
      tuteurNom: texte(l.tuteurnom) || null, tuteurTelephone: texte(l.tuteurtelephone) || null, emailParent: email,
      classe, exonere: oui(l.exonereinscription),
    });
    resultats.push({ ligne, statut: "ok", message: prenom + " " + nom + (classe ? " · " + libClasse(classe) : " · sans classe") });
  });

  return {
    resultats,
    ecrire: async () => {
      let numero = await prochainNumeroMatricule(ctx.etablissementId);
      const crees = await prisma.eleve.createManyAndReturn({
        data: aCreer.map((e) => {
          let matricule = e.matricule;
          while (!matricule || matricules.has(matricule)) {
            matricule = formatMatricule(numero++);
          }
          matricules.add(matricule);
          return {
            etablissementId: ctx.etablissementId,
            matricule,
            nom: e.nom,
            prenom: e.prenom,
            dateNaissance: e.dateNaissance,
            sexe: e.sexe,
            tuteurNom: e.tuteurNom,
            tuteurTelephone: e.tuteurTelephone,
            emailParent: e.emailParent,
            classeId: e.classe?.id ?? null,
            codeParent: genererCodeParent(),
          };
        }),
        select: { id: true },
      });

      // Echeancier des frais, comme a l'inscription
      const avecFrais = aCreer
        .map((e, i) => ({ e, id: crees[i].id, fi: e.exonere ? 0 : (e.classe?.fraisInscription ?? 0), fm: e.classe?.fraisScolariteMensuel ?? 0 }))
        .filter((x) => x.e.classe && (x.fi > 0 || x.fm > 0));
      if (avecFrais.length === 0) return;
      const frais = await prisma.fraisScolarite.createManyAndReturn({
        data: avecFrais.map((x) => ({
          etablissementId: ctx.etablissementId,
          eleveId: x.id,
          anneeScolaireId: ctx.annee.id,
          fraisInscription: x.fi,
          fraisScolariteMensuel: x.fm,
          reduction: 0,
          dateDebut: ctx.annee.dateDebut,
        })),
        select: { id: true, eleveId: true },
      });
      const fraisDe = new Map(frais.map((f) => [f.eleveId, f.id]));
      await prisma.trancheFrais.createMany({
        data: avecFrais.flatMap((x) =>
          tranchesAnnee(x.fi, x.fm, ctx.annee.dateDebut, ctx.annee.dateFin).map((t) => ({ ...t, fraisId: fraisDe.get(x.id)! }))
        ),
      });
    },
  };
}

// ── Notes ────────────────────────────────────────────────────────────────
async function preparerNotes(ctx: Ctx, lignes: Ligne[]): Promise<Preparation> {
  const matriculesFichier = [...new Set(lignes.map((l) => texte(l.matricule).toUpperCase()).filter(Boolean))];
  const [eleves, matieres, trimestres] = await Promise.all([
    prisma.eleve.findMany({
      where: { etablissementId: ctx.etablissementId, matricule: { in: matriculesFichier, mode: "insensitive" } },
      select: { id: true, matricule: true, nom: true, prenom: true, classeId: true, classe: { select: { cycle: true, anneeScolaireId: true } } },
    }),
    prisma.matiere.findMany({ where: { etablissementId: ctx.etablissementId }, select: { id: true, nom: true, code: true, cycle: true } }),
    prisma.trimestre.findMany({ where: { anneeScolaireId: ctx.annee.id }, select: { id: true, nom: true, ordre: true, cloture: true } }),
  ]);
  const eleveDe = new Map(eleves.map((e) => [e.matricule.toUpperCase(), e]));
  const matiereDe = new Map<string, (typeof matieres)[number]>();
  for (const m of matieres) {
    matiereDe.set(normaliser(m.nom) + "|" + m.cycle, m);
    if (m.code) matiereDe.set(normaliser(m.code) + "|" + m.cycle, m);
  }
  const trimestreDe = new Map<string, (typeof trimestres)[number]>();
  for (const t of trimestres) {
    trimestreDe.set(String(t.ordre), t);
    trimestreDe.set(normaliser(t.nom), t);
    trimestreDe.set("t" + t.ordre, t);
    trimestreDe.set("trimestre" + t.ordre, t);
  }
  const existantes = await prisma.note.findMany({
    where: { eleveId: { in: eleves.map((e) => e.id) }, trimestreId: { in: trimestres.map((t) => t.id) } },
    select: { id: true, eleveId: true, matiereId: true, trimestreId: true, type: true, numero: true, statut: true },
  });
  const cleNote = (e: string, m: string, t: string, ty: string, n: number) => e + "|" + m + "|" + t + "|" + ty + "|" + n;
  const parCle = new Map(existantes.map((n) => [cleNote(n.eleveId, n.matiereId, n.trimestreId, n.type, n.numero), n]));
  const vues = new Set<string>();
  const resultats: ResultatLigne[] = [];
  const nouvelles: { eleveId: string; matiereId: string; classeId: string; trimestreId: string; type: "DEVOIR" | "COMPOSITION"; numero: number; valeur: number }[] = [];
  const majs: { id: string; valeur: number }[] = [];

  lignes.forEach((l, i) => {
    const ligne = i + 1;
    const erreur = (message: string) => resultats.push({ ligne, statut: "erreur", message });
    const eleve = eleveDe.get(texte(l.matricule).toUpperCase());
    if (!eleve) return erreur("Matricule inconnu : « " + l.matricule + " »");
    if (!eleve.classeId || !eleve.classe || eleve.classe.anneeScolaireId !== ctx.annee.id) return erreur(eleve.prenom + " " + eleve.nom + " n'est dans aucune classe de l'année active");
    const matiere = matiereDe.get(normaliser(l.matiere) + "|" + eleve.classe.cycle);
    if (!matiere) return erreur("Matière « " + l.matiere + " » inconnue pour ce cycle");
    const nt = normaliser(l.trimestre);
    const trimestre = trimestreDe.get(nt) ?? trimestreDe.get(nt.match(/\d/)?.[0] ?? "");
    if (!trimestre) return erreur("Trimestre introuvable : « " + l.trimestre + " »");
    if (trimestre.cloture) return erreur(trimestre.nom + " est clôturé");
    const ty = normaliser(l.type);
    const type = !ty || ty.startsWith("dev") || ty === "d" ? "DEVOIR" : ty.startsWith("comp") || ty === "c" || ty.startsWith("exam") ? "COMPOSITION" : null;
    if (!type) return erreur("Type invalide : « " + l.type + " » (devoir ou composition)");
    const numero = nombre(l.numero) ?? 1;
    if (Number.isNaN(numero) || !Number.isInteger(numero) || numero < 1 || numero > 20) return erreur("Numéro invalide");
    const sur = nombre(l.sur) ?? 20;
    if (Number.isNaN(sur) || sur <= 0 || sur > 100) return erreur("Barème invalide");
    const brute = nombre(l.note);
    if (brute === null || Number.isNaN(brute)) return erreur("Note manquante ou invalide");
    if (brute < 0 || brute > sur) return erreur("Note hors barème (0 à " + sur + ")");
    const valeur = Math.round((brute * 20) / sur * 100) / 100;
    const cle = cleNote(eleve.id, matiere.id, trimestre.id, type, numero);
    if (vues.has(cle)) return erreur("Note en double dans le fichier");
    vues.add(cle);
    const lib = eleve.prenom + " " + eleve.nom + " · " + matiere.nom + " · " + valeur + "/20";
    const existante = parCle.get(cle);
    if (existante) {
      if (existante.statut !== "BROUILLON") return erreur("Note déjà soumise ou validée : elle n'est pas remplacée");
      majs.push({ id: existante.id, valeur });
      return resultats.push({ ligne, statut: "ok", message: lib + " (brouillon mis à jour)" });
    }
    nouvelles.push({ eleveId: eleve.id, matiereId: matiere.id, classeId: eleve.classeId, trimestreId: trimestre.id, type, numero, valeur });
    resultats.push({ ligne, statut: "ok", message: lib });
  });

  return {
    resultats,
    ecrire: async () => {
      if (nouvelles.length > 0) {
        await prisma.note.createMany({ data: nouvelles.map((n) => ({ ...n, sur: 20, statut: "BROUILLON" as const, saisieParId: ctx.userId })) });
      }
      for (let i = 0; i < majs.length; i += 200) {
        await prisma.$transaction(
          majs.slice(i, i + 200).map((m) => prisma.note.update({ where: { id: m.id }, data: { valeur: m.valeur, modifieeParId: ctx.userId, modifieeLe: new Date() } }))
        );
      }
    },
  };
}
