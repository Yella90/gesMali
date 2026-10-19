"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileDown, Plus, Trash2, X } from "lucide-react";
import {
  creerCreneau as creerCreneauAction,
  modifierCreneau as modifierCreneauAction,
  supprimerCreneau as supprimerCreneauAction,
} from "../actions";
import { relever } from "@/lib/actions/resultat";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  FORMAT_HEURE,
  JOURS,
  chevauche,
  decaler,
  disposer,
  enHeures,
  indiceCouleur,
  libJour,
  plageHeures,
} from "@/lib/emploi-du-temps/creneaux";

const creerCreneau = relever(creerCreneauAction);
const modifierCreneau = relever(modifierCreneauAction);
const supprimerCreneau = relever(supprimerCreneauAction);

// Affectation de la classe, avec ou sans horaire
export type AffectationGrille = {
  id: string;
  type: "TITULAIRE" | "PROFESSEUR_MATIERE";
  jour: string | null;
  heureDebut: string | null;
  heureFin: string | null;
  matiereId: string | null;
  matiere: string | null;
  enseignantId: string;
  enseignant: string;
};
type Creneau = AffectationGrille & { jour: string; heureDebut: string; heureFin: string };

// Cours des enseignants dans les autres classes de l'annee
export type Occupation = { enseignantId: string; jour: string; heureDebut: string; heureFin: string; classe: string };

type Option = { id: string; nom: string };

type Edition =
  | { mode: "nouveau"; jour: string; heureDebut: string; heureFin: string }
  | { mode: "modifier"; creneau: Creneau }
  | { mode: "planifier"; affectation: AffectationGrille };

const HAUTEUR_HEURE = 56; // px

const champSelect = "w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm disabled:bg-neutral-50";

// Couleurs par matiere, dans l'ordre de la palette du PDF (indiceCouleur)
const COULEURS = [
  "bg-blue-50 text-blue-800 border-blue-200",
  "bg-emerald-50 text-emerald-800 border-emerald-200",
  "bg-amber-50 text-amber-800 border-amber-200",
  "bg-violet-50 text-violet-800 border-violet-200",
  "bg-pink-50 text-pink-800 border-pink-200",
  "bg-cyan-50 text-cyan-800 border-cyan-200",
  "bg-orange-50 text-orange-800 border-orange-200",
  "bg-lime-50 text-lime-800 border-lime-200",
];
const couleurMatiere = (nom: string) => COULEURS[indiceCouleur(nom)];

const nomMatiere = (a: AffectationGrille) => a.matiere ?? "Titulariat";
const hh = (h: number) => String(h).padStart(2, "0") + ":00";
const planifie = (a: AffectationGrille): a is Creneau => !!(a.jour && a.heureDebut && a.heureFin);

export function GrilleEmploiDuTemps({
  classeId,
  titre,
  annee,
  modifiable,
  affectations,
  matieres,
  enseignants,
  occupations,
}: {
  classeId: string;
  titre: string;
  annee: { id: string; libelle: string; active: boolean };
  modifiable: boolean;
  affectations: AffectationGrille[];
  matieres: Option[];
  enseignants: Option[];
  occupations: Occupation[];
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [edition, setEdition] = useState<Edition | null>(null);

  const creneaux = affectations.filter(planifie);

  // Affectations sans horaire, regroupees par enseignant et matiere (une ligne par cours a planifier)
  const sansHoraire: { premiere: AffectationGrille; nombre: number }[] = [];
  for (const a of affectations) {
    if (planifie(a)) continue;
    const groupe = sansHoraire.find(
      (g) => g.premiere.type === a.type && g.premiere.matiereId === a.matiereId && g.premiere.enseignantId === a.enseignantId
    );
    if (groupe) groupe.nombre++;
    else sansHoraire.push({ premiere: a, nombre: 1 });
  }
  const nbSansHoraire = affectations.length - creneaux.length;

  const heures = plageHeures(creneaux);
  const min = heures[0];
  const duJour = (j: string) => creneaux.filter((c) => c.jour === j);

  // La fenetre s'ouvre une fois le formulaire rendu, le focus sur son premier champ utile
  useEffect(() => {
    const d = dialogRef.current;
    if (!edition || !d || d.open) return;
    d.showModal();
    d.querySelector<HTMLElement>("[data-premier-champ]")?.focus();
  }, [edition]);

  function fermer() {
    dialogRef.current?.close();
  }
  function ouvrirNouveau(jour: string, h?: number) {
    const debut = h === undefined ? "08:00" : hh(h);
    setEdition({ mode: "nouveau", jour, heureDebut: debut, heureFin: decaler(debut, 60) ?? "23:59" });
  }

  const vide = creneaux.length === 0;

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={"/emploi-du-temps" + (annee.active ? "" : "?annee=" + annee.id)}
            className="text-xs text-[var(--color-ink-muted)] hover:underline"
          >
            ← Retour
          </Link>
          <h1 className="text-2xl font-semibold mt-1">Emploi du temps · {titre}</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">
            {annee.libelle} · {creneaux.length} créneau{creneaux.length > 1 ? "x" : ""} planifié{creneaux.length > 1 ? "s" : ""}
          </p>
          {modifiable && (
            <p className="text-xs text-[var(--color-ink-muted)] mt-1">
              <span className="hidden md:inline">Cliquez sur une case libre pour ajouter un créneau, sur un cours pour le modifier ou le supprimer.</span>
              <span className="md:hidden">Touchez un cours pour le modifier ou le supprimer.</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={"/classes/" + classeId}
            className="inline-flex items-center h-10 px-4 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm hover:bg-neutral-50"
          >
            Voir la classe
          </Link>
          <a
            href={"/api/emploi-du-temps/classe/" + classeId + "/pdf"}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm hover:bg-neutral-50"
          >
            <FileDown className="h-4 w-4" aria-hidden />
            Exporter en PDF
          </a>
          {modifiable && (
            <Button type="button" onClick={() => ouvrirNouveau("")} className="gap-2">
              <Plus className="h-4 w-4" aria-hidden />
              Ajouter un créneau
            </Button>
          )}
        </div>
      </div>

      {!annee.active && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-ink-muted)]">
          L&apos;année {annee.libelle} est archivée : son emploi du temps reste consultable, en lecture seule.
        </div>
      )}

      {vide && !modifiable ? (
        <div className="bg-white rounded-xl border border-dashed border-[var(--color-border-strong)] py-16 text-center">
          <p className="text-sm text-[var(--color-ink-muted)]">Aucun créneau horaire défini pour cette classe.</p>
          {annee.active && (
            <p className="text-xs text-[var(--color-ink-faint)] mt-2">La direction planifie les cours depuis cette page.</p>
          )}
        </div>
      ) : (
        <>
          {/* Grille desktop : une colonne par jour, les cours places selon leurs heures */}
          <div className="hidden md:block bg-white rounded-xl border border-[var(--color-border)] overflow-x-auto">
            <div className="grid min-w-[720px] grid-cols-[4rem_repeat(6,minmax(0,1fr))] text-xs">
              <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] text-center font-medium text-[var(--color-ink-muted)]">
                Heure
              </div>
              {JOURS.map((j) => (
                <div
                  key={j}
                  className="p-2 border-b border-l border-[var(--color-border)] bg-[var(--color-surface)] text-center font-medium text-[var(--color-ink-muted)]"
                >
                  {libJour(j)}
                </div>
              ))}

              <div aria-hidden>
                {heures.map((h) => (
                  <div
                    key={h}
                    className="border-b border-[var(--color-border)] px-2 pt-1 text-center font-mono text-[var(--color-ink-muted)]"
                    style={{ height: HAUTEUR_HEURE }}
                  >
                    {hh(h)}
                  </div>
                ))}
              </div>

              {JOURS.map((j) => (
                <div key={j} className="relative border-l border-[var(--color-border)]" style={{ height: heures.length * HAUTEUR_HEURE }}>
                  {heures.map((h, i) =>
                    modifiable ? (
                      <button
                        key={h}
                        type="button"
                        onClick={() => ouvrirNouveau(j, h)}
                        aria-label={"Ajouter un créneau le " + libJour(j).toLowerCase() + " à " + hh(h)}
                        className="group absolute inset-x-0 flex items-start justify-end border-b border-[var(--color-border)] p-1 text-[11px] font-medium text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-brand)]"
                        style={{ top: i * HAUTEUR_HEURE, height: HAUTEUR_HEURE }}
                      >
                        <span aria-hidden className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
                          + Ajouter
                        </span>
                      </button>
                    ) : (
                      <div
                        key={h}
                        aria-hidden
                        className="absolute inset-x-0 border-b border-[var(--color-border)] bg-neutral-50/50"
                        style={{ top: i * HAUTEUR_HEURE, height: HAUTEUR_HEURE }}
                      />
                    )
                  )}

                  {disposer(duJour(j)).map(({ c, voie, voies }) => {
                    const debut = enHeures(c.heureDebut);
                    const hauteur = (enHeures(c.heureFin) - debut) * HAUTEUR_HEURE;
                    const matiere = nomMatiere(c);
                    const resume = matiere + ", " + c.enseignant + ", " + libJour(c.jour).toLowerCase() + " " + c.heureDebut + "–" + c.heureFin;
                    const style = {
                      top: (debut - min) * HAUTEUR_HEURE + 2,
                      height: Math.max(hauteur - 4, 18),
                      left: "calc(" + (voie / voies) * 100 + "% + 3px)",
                      width: "calc(" + 100 / voies + "% - 6px)",
                    };
                    const classes =
                      "absolute z-[1] overflow-hidden rounded-md border px-2 py-1 text-left " + couleurMatiere(matiere);
                    const contenu = (
                      <>
                        <span className="block truncate font-semibold leading-tight">{matiere}</span>
                        {hauteur >= 50 && <span className="block truncate text-[11px] leading-tight opacity-80">{c.enseignant}</span>}
                        {hauteur >= 34 && (
                          <span className="block truncate font-mono text-[10px] leading-tight opacity-70">
                            {c.heureDebut}–{c.heureFin}
                          </span>
                        )}
                      </>
                    );
                    return modifiable ? (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setEdition({ mode: "modifier", creneau: c })}
                        aria-label={"Modifier le cours : " + resume}
                        title={resume}
                        style={style}
                        className={classes + " hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-brand)]"}
                      >
                        {contenu}
                      </button>
                    ) : (
                      <div key={c.id} title={resume} style={style} className={classes}>
                        {contenu}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Vue mobile : liste par jour */}
          <div className="md:hidden space-y-4">
            {vide && (
              <p className="rounded-xl border border-dashed border-[var(--color-border-strong)] bg-white px-4 py-10 text-center text-sm text-[var(--color-ink-muted)]">
                Aucun créneau planifié. Utilisez « Ajouter un créneau » pour construire l&apos;emploi du temps.
              </p>
            )}
            {JOURS.filter((j) => duJour(j).length > 0).map((j) => (
              <section key={j} className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
                <h2 className="px-4 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)] font-medium text-sm">
                  {libJour(j)}
                </h2>
                <ul className="divide-y divide-[var(--color-border)]">
                  {duJour(j)
                    .sort((a, b) => a.heureDebut.localeCompare(b.heureDebut))
                    .map((c) => {
                      const contenu = (
                        <>
                          <span className="w-14 flex-shrink-0 text-xs font-mono text-[var(--color-ink-muted)] pt-0.5">
                            {c.heureDebut}
                            <br />
                            {c.heureFin}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block font-medium text-sm">{nomMatiere(c)}</span>
                            <span className="block text-xs text-[var(--color-ink-muted)] mt-0.5">{c.enseignant}</span>
                          </span>
                        </>
                      );
                      return (
                        <li key={c.id}>
                          {modifiable ? (
                            <button
                              type="button"
                              onClick={() => setEdition({ mode: "modifier", creneau: c })}
                              className="flex w-full items-start gap-3 p-3 text-left hover:bg-neutral-50"
                            >
                              {contenu}
                              <span className="text-xs text-[var(--color-brand)]">Modifier</span>
                            </button>
                          ) : (
                            <div className="flex items-start gap-3 p-3">{contenu}</div>
                          )}
                        </li>
                      );
                    })}
                </ul>
              </section>
            ))}
          </div>

          {/* Affectations sans horaire */}
          {sansHoraire.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
              <p className="text-sm font-medium text-amber-900">
                {nbSansHoraire} affectation(s) sans créneau horaire
              </p>
              {modifiable && (
                <p className="mt-0.5 text-xs text-amber-800">
                  Ces enseignants sont affectés à la classe sans horaire : planifiez leurs cours pour les placer sur la grille.
                </p>
              )}
              <ul className="mt-2 space-y-1.5 text-xs text-amber-900">
                {sansHoraire.map(({ premiere: a, nombre }) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                      • {nomMatiere(a)} — {a.enseignant}
                      {nombre > 1 && <span className="text-amber-700"> · {nombre} cours à planifier</span>}
                    </span>
                    {modifiable && a.type === "PROFESSEUR_MATIERE" && a.matiereId && (
                      <button
                        type="button"
                        onClick={() => setEdition({ mode: "planifier", affectation: a })}
                        aria-label={"Planifier " + nomMatiere(a) + " avec " + a.enseignant}
                        className="font-medium text-[var(--color-brand)] hover:underline"
                      >
                        Planifier
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Legende */}
          {!vide && (
            <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)] mb-3">Légende</p>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(creneaux.map(nomMatiere))).map((nom) => (
                  <span key={nom} className={"inline-flex px-3 py-1 rounded-md text-xs border " + couleurMatiere(nom)}>
                    {nom}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {modifiable && (
        <dialog
          ref={dialogRef}
          onClose={() => setEdition(null)}
          aria-labelledby="titre-creneau"
          className="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 text-[var(--color-ink)] shadow-[0_30px_80px_-20px_rgba(4,14,30,0.5)] backdrop:bg-[#0B1D33]/60 backdrop:backdrop-blur-[2px]"
        >
          {edition && (
            <FormulaireCreneau
              classeId={classeId}
              edition={edition}
              affectations={affectations}
              creneaux={creneaux}
              matieres={matieres}
              enseignants={enseignants}
              occupations={occupations}
              onFermer={fermer}
              onEnregistre={() => {
                fermer();
                router.refresh();
              }}
            />
          )}
        </dialog>
      )}
    </div>
  );
}

function FormulaireCreneau({
  classeId,
  edition,
  affectations,
  creneaux,
  matieres,
  enseignants,
  occupations,
  onFermer,
  onEnregistre,
}: {
  classeId: string;
  edition: Edition;
  affectations: AffectationGrille[];
  creneaux: Creneau[];
  matieres: Option[];
  enseignants: Option[];
  occupations: Occupation[];
  onFermer: () => void;
  onEnregistre: () => void;
}) {
  const existante = edition.mode === "modifier" ? edition.creneau : edition.mode === "planifier" ? edition.affectation : null;
  const titulariat = existante?.type === "TITULAIRE";

  const [jour, setJour] = useState(edition.mode === "nouveau" ? edition.jour : existante?.jour ?? "");
  const [heureDebut, setHeureDebut] = useState(edition.mode === "nouveau" ? edition.heureDebut : existante?.heureDebut ?? "08:00");
  const [heureFin, setHeureFin] = useState(edition.mode === "nouveau" ? edition.heureFin : existante?.heureFin ?? "09:00");
  const [matiereId, setMatiereId] = useState(existante?.matiereId ?? "");
  const [enseignantId, setEnseignantId] = useState(existante?.enseignantId ?? "");
  const [enseignantSuggere, setEnseignantSuggere] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmerSuppression, setConfirmerSuppression] = useState(false);

  // L'enseignant actuel reste proposable meme s'il n'est plus dans la liste des enseignants actifs
  const optionsEnseignants =
    existante && !enseignants.some((e) => e.id === existante.enseignantId)
      ? [...enseignants, { id: existante.enseignantId, nom: existante.enseignant + " (n'est plus enseignant actif)" }]
      : enseignants;

  // Conflits visibles avant l'envoi (le serveur reste seul juge)
  const horaireSaisi = FORMAT_HEURE.test(heureDebut) && FORMAT_HEURE.test(heureFin);
  const finAvantDebut = horaireSaisi && heureFin <= heureDebut;
  const plage = { heureDebut, heureFin };
  const verifiable = !!jour && horaireSaisi && !finAvantDebut;
  const coursClasse = verifiable ? creneaux.find((c) => c.id !== existante?.id && c.jour === jour && chevauche(c, plage)) : undefined;
  const coursEnseignant =
    verifiable && enseignantId
      ? occupations.find((o) => o.enseignantId === enseignantId && o.jour === jour && chevauche(o, plage))
      : undefined;
  const nomEnseignant = optionsEnseignants.find((e) => e.id === enseignantId)?.nom ?? "Cet enseignant";

  function changerDebut(v: string) {
    // Deplacer le debut garde la duree du cours
    const duree = horaireSaisi && !finAvantDebut ? Math.round((enHeures(heureFin) - enHeures(heureDebut)) * 60) : 60;
    setHeureDebut(v);
    if (FORMAT_HEURE.test(v)) setHeureFin(decaler(v, duree) ?? heureFin);
  }

  function changerMatiere(id: string) {
    setMatiereId(id);
    if (edition.mode !== "nouveau" || (enseignantId && !enseignantSuggere)) return;
    // Nouveau cours : proposer l'enseignant qui assure deja cette matiere dans la classe
    const profs = [
      ...new Set(
        affectations
          .filter((a) => a.type === "PROFESSEUR_MATIERE" && a.matiereId === id && enseignants.some((e) => e.id === a.enseignantId))
          .map((a) => a.enseignantId)
      ),
    ];
    const suggere = profs.length === 1 ? profs[0] : "";
    setEnseignantId(suggere);
    setEnseignantSuggere(suggere !== "");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    const donnees = { jour, heureDebut, heureFin, matiereId, enseignantId };
    try {
      if (existante) await modifierCreneau(existante.id, donnees);
      else await creerCreneau(classeId, donnees);
      onEnregistre();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setEnCours(false);
    }
  }

  async function supprimer() {
    if (!existante) return;
    setEnCours(true);
    setErreur(null);
    try {
      await supprimerCreneau(existante.id);
      onEnregistre();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Suppression impossible");
      setConfirmerSuppression(false);
    } finally {
      setEnCours(false);
    }
  }

  // Supprimer le dernier cours d'un enseignant pour une matiere retire son affectation a la classe
  const dernierCours =
    edition.mode === "modifier" &&
    !affectations.some(
      (a) =>
        a.id !== edition.creneau.id &&
        a.enseignantId === edition.creneau.enseignantId &&
        a.matiereId === edition.creneau.matiereId &&
        a.type === edition.creneau.type
    );

  const titre = edition.mode === "nouveau" ? "Nouveau créneau" : edition.mode === "planifier" ? "Planifier un créneau" : "Modifier le créneau";

  return (
    <form onSubmit={onSubmit} className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border)] bg-white px-5 py-4 sm:px-6">
        <h2 id="titre-creneau" className="text-lg font-semibold">
          {titre}
        </h2>
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="space-y-4 px-5 py-5 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="c-jour">Jour</Label>
            <select
              id="c-jour"
              required
              value={jour}
              onChange={(e) => setJour(e.target.value)}
              className={champSelect}
              {...(!jour ? { "data-premier-champ": "" } : {})}
            >
              <option value="">Choisir…</option>
              {JOURS.map((j) => (
                <option key={j} value={j}>
                  {libJour(j)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-debut">Début</Label>
            <Input id="c-debut" type="time" required value={heureDebut} onChange={(e) => changerDebut(e.target.value)} className="tnum" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-fin">Fin</Label>
            <Input
              id="c-fin"
              type="time"
              required
              value={heureFin}
              onChange={(e) => setHeureFin(e.target.value)}
              aria-invalid={finAvantDebut || undefined}
              aria-describedby={finAvantDebut ? "c-fin-erreur" : undefined}
              className="tnum"
            />
          </div>
        </div>
        {finAvantDebut && (
          <p id="c-fin-erreur" className="text-xs text-red-700">
            L&apos;heure de fin doit être après l&apos;heure de début.
          </p>
        )}

        {titulariat ? (
          <div className="rounded-lg bg-[var(--color-surface)] px-3 py-2.5 text-sm">
            <p>
              <span className="font-medium">{existante?.matiere ?? "Titulariat"}</span> · {existante?.enseignant}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
              Cours du titulaire : seul l&apos;horaire se modifie ici. Le titulaire se change depuis sa fiche, dans Personnel.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-matiere">Matière</Label>
              <select
                id="c-matiere"
                required
                value={matiereId}
                onChange={(e) => changerMatiere(e.target.value)}
                className={champSelect}
                {...(jour ? { "data-premier-champ": "" } : {})}
              >
                <option value="">Choisir…</option>
                {matieres.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nom}
                  </option>
                ))}
              </select>
              {matieres.length === 0 && (
                <p className="text-xs text-red-700">Aucune matière pour le cycle de cette classe : ajoutez-en dans Matières.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-enseignant">Enseignant</Label>
              <select
                id="c-enseignant"
                required
                value={enseignantId}
                onChange={(e) => {
                  setEnseignantId(e.target.value);
                  setEnseignantSuggere(false);
                }}
                className={champSelect}
              >
                <option value="">Choisir…</option>
                {optionsEnseignants.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nom}
                  </option>
                ))}
              </select>
              {enseignantSuggere && (
                <p className="text-xs text-[var(--color-ink-muted)]">Enseignant qui assure déjà cette matière dans la classe.</p>
              )}
              {enseignants.length === 0 && (
                <p className="text-xs text-red-700">Aucun enseignant actif : ajoutez-en dans Personnel.</p>
              )}
            </div>
          </div>
        )}

        {(coursClasse || coursEnseignant) && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 space-y-1">
            {coursClasse && (
              <p>
                La classe a déjà cours de {coursClasse.heureDebut} à {coursClasse.heureFin} : {nomMatiere(coursClasse)} avec{" "}
                {coursClasse.enseignant}.
              </p>
            )}
            {coursEnseignant && (
              <p>
                {nomEnseignant} est déjà en {coursEnseignant.classe} de {coursEnseignant.heureDebut} à {coursEnseignant.heureFin}.
              </p>
            )}
          </div>
        )}

        {erreur && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {erreur}
          </div>
        )}

        {confirmerSuppression && edition.mode === "modifier" && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-900">
            <p className="font-medium">Supprimer ce créneau ?</p>
            <p className="mt-0.5 text-xs">
              {nomMatiere(edition.creneau)}, {libJour(edition.creneau.jour).toLowerCase()} de {edition.creneau.heureDebut} à{" "}
              {edition.creneau.heureFin}, avec {edition.creneau.enseignant}.
              {dernierCours &&
                (titulariat
                  ? " C'est sa seule affectation de titulaire dans la classe : elle sera retirée."
                  : " C'est son dernier cours de cette matière dans la classe : son affectation à cette matière sera retirée.")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="danger" size="sm" onClick={supprimer} disabled={enCours}>
                {enCours ? "Suppression…" : "Oui, supprimer"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirmerSuppression(false)} disabled={enCours}>
                Garder le créneau
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] bg-white px-5 py-4 sm:px-6">
        {edition.mode === "modifier" && !confirmerSuppression ? (
          <button
            type="button"
            onClick={() => setConfirmerSuppression(true)}
            disabled={enCours}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Supprimer
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onFermer}>
            Annuler
          </Button>
          <Button type="submit" disabled={enCours}>
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </form>
  );
}
