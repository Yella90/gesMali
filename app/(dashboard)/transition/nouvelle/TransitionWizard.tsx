"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { preparerTransition as preparerTransitionAction, appliquerTransition as appliquerTransitionAction, ApercuTransition, DecisionType, EleveTransition } from "@/lib/transition/actions";
import { relever } from "@/lib/actions/resultat";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const preparerTransition = relever(preparerTransitionAction);
const appliquerTransition = relever(appliquerTransitionAction);

type Annee = {
  id: string;
  libelle: string;
  active: boolean;
  trimestresClotures: number;
  trimestresTotal: number;
};

type Suggestion = {
  libelle: string;
  dateDebut: string;
  dateFin: string;
};

type Parametres = {
  reinscriptionRequise: boolean;
  fraisReinscription: number;
  copierAffectations: boolean;
};

const ETAPES = [
  { num: 1, label: "Configuration" },
  { num: 2, label: "Aperçu" },
  { num: 3, label: "Confirmation" },
];

export function TransitionWizard({
  annees,
  suggestion,
  parametres,
}: {
  annees: Annee[];
  suggestion: Suggestion;
  parametres: Parametres;
}) {
  const router = useRouter();
  const confirm = useConfirm();

  const [etape, setEtape] = useState(1);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Etape 1
  const [anneeSourceId, setAnneeSourceId] = useState(annees[0]?.id || "");
  const [nouveauLibelle, setNouveauLibelle] = useState(suggestion.libelle);
  const [dateDebut, setDateDebut] = useState(suggestion.dateDebut);
  const [dateFin, setDateFin] = useState(suggestion.dateFin);

  // Etape 2
  const [apercu, setApercu] = useState<ApercuTransition | null>(null);
  const [decisions, setDecisions] = useState<Record<string, DecisionType>>({});
  const [niveauxCibles, setNiveauxCibles] = useState<Record<string, number | null>>({});

  const anneeSource = annees.find((a) => a.id === anneeSourceId);

  function estPret(a: Annee): boolean {
    return a.trimestresTotal === 3 && a.trimestresClotures === 3;
  }

  async function chargerApercu() {
    setLoading(true);
    setErreur(null);
    try {
      const res = await preparerTransition({
        anneeSourceId,
        nouveauLibelle,
      });
      setApercu(res);
      const dec: Record<string, DecisionType> = {};
      const niv: Record<string, number | null> = {};
      for (const e of res.eleves) {
        dec[e.eleveId] = e.decision;
        niv[e.eleveId] = e.niveauCible;
      }
      setDecisions(dec);
      setNiveauxCibles(niv);
      setEtape(2);
    } catch (e: any) {
      setErreur(e.message);
    } finally {
      setLoading(false);
    }
  }

  function changerDecision(eleve: EleveTransition, nouvelle: DecisionType) {
    setDecisions((d) => ({ ...d, [eleve.eleveId]: nouvelle }));

    // Recalculer le niveau cible
    if (nouvelle === "DIPLOME") {
      setNiveauxCibles((n) => ({ ...n, [eleve.eleveId]: null }));
    } else if (nouvelle === "ADMIS") {
      setNiveauxCibles((n) => ({ ...n, [eleve.eleveId]: eleve.niveauSource + 1 }));
    } else if (nouvelle === "REDOUBLE") {
      setNiveauxCibles((n) => ({ ...n, [eleve.eleveId]: eleve.niveauSource }));
    }
  }

  async function confirmer() {
    if (!apercu) return;

    const ok = await confirm({
      title: "Confirmer la transition ?",
      message:
        "Cette action va : créer la nouvelle année " +
        nouveauLibelle +
        ", archiver " +
        apercu.anneeSourceLibelle +
        ", inscrire " +
        apercu.eleves.length +
        " élève(s) et générer les frais. Irréversible.",
      confirmLabel: "Lancer la transition",
      variant: "warning",
    });
    if (!ok) return;

    setLoading(true);
    setErreur(null);
    try {
      const decisionsPayload = apercu.eleves.map((e) => ({
        eleveId: e.eleveId,
        decision: decisions[e.eleveId] || e.decision,
        niveauCible: niveauxCibles[e.eleveId] ?? null,
      }));

      const res = await appliquerTransition({
        anneeSourceId,
        nouveauLibelle,
        dateDebut,
        dateFin,
        decisions: decisionsPayload,
      });

      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      setErreur(e.message);
      setLoading(false);
    }
  }

  // Stats recalculees
  const stats = apercu
    ? {
        total: apercu.eleves.length,
        admis: Object.values(decisions).filter((d) => d === "ADMIS").length,
        redoublants: Object.values(decisions).filter((d) => d === "REDOUBLE").length,
        diplomes: Object.values(decisions).filter((d) => d === "DIPLOME").length,
      }
    : null;

  return (
    <div className="space-y-5">
      {/* Barre d'etapes */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
        <div className="flex items-center justify-between gap-2">
          {ETAPES.map((e, i) => (
            <div key={e.num} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div
                  className={
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold " +
                    (etape >= e.num
                      ? "bg-[var(--color-brand)] text-white"
                      : "bg-neutral-100 text-neutral-500")
                  }
                >
                  {etape > e.num ? "✓" : e.num}
                </div>
                <span
                  className={
                    "text-sm font-medium " +
                    (etape >= e.num ? "text-[var(--color-ink)]" : "text-[var(--color-ink-muted)]")
                  }
                >
                  {e.label}
                </span>
              </div>
              {i < ETAPES.length - 1 && (
                <div
                  className={
                    "flex-1 h-0.5 mx-3 " +
                    (etape > e.num ? "bg-[var(--color-brand)]" : "bg-neutral-200")
                  }
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {erreur && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {erreur}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* ETAPE 1 : Configuration                                */}
      {/* ══════════════════════════════════════════════════════ */}
      {etape === 1 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 md:p-6 space-y-5">
          <div>
            <h2 className="font-semibold">Configuration</h2>
            <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
              Choisissez l'année source et définissez la nouvelle année
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="anneeSourceId">Année scolaire source</Label>
            <select
              id="anneeSourceId"
              value={anneeSourceId}
              onChange={(e) => setAnneeSourceId(e.target.value)}
              className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
            >
              {annees.map((a) => (
                <option key={a.id} value={a.id} disabled={!estPret(a)}>
                  {a.libelle}
                  {a.active ? " (active)" : ""}
                  {!estPret(a) && " — " + a.trimestresClotures + "/3 trimestres clôturés"}
                </option>
              ))}
            </select>
            {anneeSource && !estPret(anneeSource) && (
              <p className="text-xs text-amber-700">
                Cette année a {anneeSource.trimestresClotures} / 3 trimestres clôturés. Clôturez tous les trimestres avant la transition.
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="libelle">Libellé nouvelle année</Label>
              <Input
                id="libelle"
                value={nouveauLibelle}
                onChange={(e) => setNouveauLibelle(e.target.value)}
                placeholder="2026-2027"
                pattern="\d{4}-\d{4}"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateDebut">Date de début</Label>
              <Input
                id="dateDebut"
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateFin">Date de fin</Label>
              <Input
                id="dateFin"
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
              />
            </div>
          </div>

          {/* Rappel des parametres */}
          <div className="rounded-lg bg-[var(--color-surface)] p-4 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
              Paramètres appliqués
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-[var(--color-ink-muted)]">Ré-inscription</p>
                <p className="font-medium mt-0.5">
                  {parametres.reinscriptionRequise
                    ? "Oui — " + parametres.fraisReinscription.toLocaleString("fr-FR") + " F"
                    : "Non — 0 F"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-ink-muted)]">Copier les affectations</p>
                <p className="font-medium mt-0.5">
                  {parametres.copierAffectations ? "Oui" : "Non"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-ink-muted)]">Où modifier ?</p>
                <a href="/parametres/etablissement" className="text-[var(--color-brand)] underline">
                  Paramètres établissement
                </a>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              onClick={chargerApercu}
              disabled={loading || !anneeSourceId || !nouveauLibelle || !estPret(anneeSource!)}
              size="lg"
            >
              {loading ? "Analyse en cours..." : "Analyser la transition"}
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* ETAPE 2 : Apercu                                       */}
      {/* ══════════════════════════════════════════════════════ */}
      {etape === 2 && apercu && stats && (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Stat label="Total" value={String(stats.total)} accent="brand" />
            <Stat label="Admis" value={String(stats.admis)} accent="accent" />
            <Stat label="Redoublants" value={String(stats.redoublants)} accent="gold" />
            <Stat label="Diplômés" value={String(stats.diplomes)} accent="danger" />
          </div>

          {/* Classes cibles prevues */}
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
            <h2 className="font-semibold mb-3">Classes cibles</h2>
            <p className="text-xs text-[var(--color-ink-muted)] mb-3">
              {apercu.classesCibles.length} classe(s) seront créées automatiquement
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {apercu.classesCibles.map((c, i) => (
                <div key={i} className="rounded-lg border border-[var(--color-border)] p-3">
                  <p className="font-medium text-sm">
                    {c.niveau === 0 ? "Jardin" : c.niveau + (c.section ? " " + c.section : "")}
                  </p>
                  <p className="text-[10px] text-[var(--color-ink-muted)] mt-0.5">
                    {c.cycle === "PRESCOLAIRE" ? "Préscolaire" : c.cycle === "PREMIER_CYCLE" ? "1er cycle" : "2nd cycle"}
                  </p>
                  <p className="text-xs tnum mt-1">{c.effectifPrevu} élève(s)</p>
                </div>
              ))}
            </div>
          </div>

          {/* Liste des eleves avec decisions editables */}
          <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
            <div className="p-5 border-b border-[var(--color-border)]">
              <h2 className="font-semibold">Décisions proposées</h2>
              <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                Vous pouvez modifier chaque décision avant de valider
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                  <tr>
                    <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Élève</th>
                    <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Classe source</th>
                    <th className="text-right p-3 font-medium text-[var(--color-ink-muted)]">T1</th>
                    <th className="text-right p-3 font-medium text-[var(--color-ink-muted)]">T2</th>
                    <th className="text-right p-3 font-medium text-[var(--color-ink-muted)]">T3</th>
                    <th className="text-right p-3 font-medium text-[var(--color-ink-muted)]">Annuelle</th>
                    <th className="text-center p-3 font-medium text-[var(--color-ink-muted)]">Décision</th>
                    <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Destination</th>
                  </tr>
                </thead>
                <tbody>
                  {apercu.eleves.map((e) => {
                    const decision = decisions[e.eleveId] || e.decision;
                    const niveauCible = niveauxCibles[e.eleveId];
                    const labelDest =
                      decision === "DIPLOME"
                        ? "Diplômé (sortie)"
                        : niveauCible !== null && niveauCible !== undefined
                        ? "Niveau " + niveauCible
                        : "-";

                    return (
                      <tr key={e.eleveId} className="border-t border-[var(--color-border)] hover:bg-neutral-50/40">
                        <td className="p-3">
                          <p className="font-medium">{e.nom} {e.prenom}</p>
                          <p className="text-[10px] font-mono text-[var(--color-ink-muted)] mt-0.5">
                            {e.matricule}
                          </p>
                        </td>
                        <td className="p-3 text-xs text-[var(--color-ink-muted)]">
                          {e.classeSourceLabel}
                        </td>
                        <td className="p-3 text-right tnum">{e.moyenneT1?.toFixed(2) ?? "-"}</td>
                        <td className="p-3 text-right tnum">{e.moyenneT2?.toFixed(2) ?? "-"}</td>
                        <td className="p-3 text-right tnum">{e.moyenneT3?.toFixed(2) ?? "-"}</td>
                        <td className="p-3 text-right tnum font-semibold">
                          {e.moyenneAnnuelle?.toFixed(2) ?? "-"}
                        </td>
                        <td className="p-3 text-center">
                          <select
                            value={decision}
                            onChange={(ev) => changerDecision(e, ev.target.value as DecisionType)}
                            className="h-8 rounded-md border border-[var(--color-border-strong)] bg-white px-2 text-xs"
                          >
                            <option value="ADMIS">Admis</option>
                            <option value="REDOUBLE">Redouble</option>
                            <option value="DIPLOME">Diplômé</option>
                            <option value="TRANSFERE">Transféré</option>
                          </select>
                        </td>
                        <td className="p-3 text-xs">{labelDest}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap justify-between gap-3">
            <button
              onClick={() => { setEtape(1); setApercu(null); setErreur(null); }}
              className="h-10 px-5 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm hover:bg-neutral-50"
            >
              ← Retour
            </button>
            <Button onClick={() => setEtape(3)} size="lg">
              Continuer →
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* ETAPE 3 : Confirmation                                 */}
      {/* ══════════════════════════════════════════════════════ */}
      {etape === 3 && apercu && stats && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 md:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 font-bold">
                !
              </div>
              <div>
                <h2 className="font-semibold">Confirmation finale</h2>
                <p className="text-sm text-[var(--color-ink-muted)] mt-1">
                  Vérifiez les informations ci-dessous. Cette action est irréversible.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-[var(--color-surface)] p-4 space-y-3">
              <Ligne label="Année source" value={apercu.anneeSourceLibelle + " (sera archivée)"} />
              <Ligne label="Nouvelle année" value={nouveauLibelle} />
              <Ligne label="Début" value={new Date(dateDebut).toLocaleDateString("fr-FR")} />
              <Ligne label="Fin" value={new Date(dateFin).toLocaleDateString("fr-FR")} />
              <Ligne label="Élèves inscrits" value={String(stats.total)} />
              <Ligne label="Dont admis" value={String(stats.admis)} />
              <Ligne label="Dont redoublants" value={String(stats.redoublants)} />
              <Ligne label="Dont diplômés" value={String(stats.diplomes)} />
              <Ligne
                label="Frais de ré-inscription"
                value={
                  parametres.reinscriptionRequise
                    ? parametres.fraisReinscription.toLocaleString("fr-FR") + " F / élève"
                    : "Aucun"
                }
              />
              <Ligne
                label="Copie des affectations"
                value={parametres.copierAffectations ? "Oui" : "Non"}
              />
            </div>

            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <strong>Attention :</strong> après la transition, l'année {apercu.anneeSourceLibelle} sera
              archivée et l'année {nouveauLibelle} deviendra active. Les notes de l'année source
              restent consultables mais les notes de la nouvelle année seront vides.
            </div>
          </div>

          <div className="flex flex-wrap justify-between gap-3">
            <button
              onClick={() => setEtape(2)}
              disabled={loading}
              className="h-10 px-5 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm hover:bg-neutral-50 disabled:opacity-50"
            >
              ← Retour
            </button>
            <Button onClick={confirmer} disabled={loading} size="lg">
              {loading ? "Transition en cours..." : "Confirmer la transition"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: "brand" | "accent" | "gold" | "danger" }) {
  const bg =
    accent === "accent" ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
    : accent === "gold" ? "bg-[var(--color-gold-soft)] text-[var(--color-gold)]"
    : accent === "danger" ? "bg-red-50 text-red-700"
    : "bg-[var(--color-brand-soft)] text-[var(--color-brand)]";
  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
      <span className={"inline-block px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wide " + bg}>
        {label}
      </span>
      <p className="text-2xl font-semibold mt-2 tnum">{value}</p>
    </div>
  );
}

function Ligne({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-[var(--color-border)] last:border-0">
      <span className="text-sm text-[var(--color-ink-muted)]">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}