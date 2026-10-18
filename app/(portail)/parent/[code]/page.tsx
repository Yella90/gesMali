import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { eleveParCodeParent } from "@/lib/portail/eleve";
import { calculerSituation, libelleStatut } from "@/lib/frais/calculs";
import { LiensLegaux } from "@/components/legal/PageLegale";

// Espace parent : page publique, accessible uniquement avec le code secret de l'eleve.
// Lecture seule. Seules les notes validees ou verrouillees sont montrees.

export const metadata: Metadata = {
  title: "Espace parent - GES Mali",
  robots: { index: false, follow: false },
};

const STATUTS_NOTES_VISIBLES = ["VALIDEE", "VERROUILLEE"] as const;

const DECISIONS: Record<string, string> = {
  ADMIS: "Admis(e)",
  REDOUBLE: "Redouble",
  ADMIS_AVEC_RESERVE: "Admis(e) avec réserve",
  EN_ATTENTE: "En attente",
};

function fmt(n: number, dec = 2) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export default async function EspaceParentPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const eleve = await eleveParCodeParent(code);
  if (!eleve) notFound();

  const anneeId = eleve.classe?.anneeScolaireId ?? null;

  const [bulletins, notes, frais] = await Promise.all([
    prisma.bulletin.findMany({
      where: { eleveId: eleve.id },
      select: {
        trimestreId: true,
        moyenneGenerale: true,
        moyenneClasse: true,
        rang: true,
        effectifClasse: true,
        appreciation: true,
        decision: true,
        trimestre: { select: { nom: true, ordre: true, anneeScolaire: { select: { libelle: true, dateDebut: true } } } },
      },
    }),
    anneeId
      ? prisma.note.findMany({
          where: {
            eleveId: eleve.id,
            statut: { in: [...STATUTS_NOTES_VISIBLES] },
            trimestre: { anneeScolaireId: anneeId },
          },
          select: {
            id: true,
            type: true,
            numero: true,
            valeur: true,
            sur: true,
            matiere: { select: { nom: true, coefficient: true } },
            trimestre: { select: { id: true, nom: true, ordre: true } },
          },
        })
      : Promise.resolve([]),
    anneeId
      ? prisma.fraisScolarite.findUnique({
          where: { eleveId_anneeScolaireId: { eleveId: eleve.id, anneeScolaireId: anneeId } },
          include: { tranches: { include: { paiements: { select: { montant: true, annule: true } } } } },
        })
      : Promise.resolve(null),
  ]);

  // Bulletins : plus recents d'abord
  bulletins.sort(
    (a, b) =>
      b.trimestre.anneeScolaire.dateDebut.getTime() - a.trimestre.anneeScolaire.dateDebut.getTime() ||
      b.trimestre.ordre - a.trimestre.ordre
  );

  // Notes : trimestre -> matiere -> notes
  const parTrimestre = new Map<string, { nom: string; ordre: number; matieres: Map<string, typeof notes> }>();
  for (const n of notes) {
    let t = parTrimestre.get(n.trimestre.id);
    if (!t) {
      t = { nom: n.trimestre.nom, ordre: n.trimestre.ordre, matieres: new Map() };
      parTrimestre.set(n.trimestre.id, t);
    }
    const liste = t.matieres.get(n.matiere.nom) ?? [];
    liste.push(n);
    t.matieres.set(n.matiere.nom, liste);
  }
  const trimestres = Array.from(parTrimestre.values()).sort((a, b) => b.ordre - a.ordre);

  const situation = frais
    ? calculerSituation(frais.fraisInscription, frais.fraisScolariteMensuel, frais.dateDebut, frais.tranches)
    : null;

  const classeLib = eleve.classe
    ? eleve.classe.nom || eleve.classe.niveau + (eleve.classe.section ? " " + eleve.classe.section : "")
    : null;

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <header className="bg-[var(--color-brand)] text-white">
        <div className="mx-auto max-w-3xl px-4 py-5">
          <p className="text-xs uppercase tracking-wide text-white/60">Espace parent</p>
          <p className="font-semibold mt-0.5">{eleve.etablissement.nom}</p>
          {(eleve.etablissement.adresse || eleve.etablissement.telephone) && (
            <p className="text-xs text-white/60 mt-0.5">
              {eleve.etablissement.adresse}
              {eleve.etablissement.adresse && eleve.etablissement.telephone ? " · " : ""}
              {eleve.etablissement.telephone}
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 space-y-4">
        {/* Profil */}
        <section className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <h1 className="text-xl font-semibold">
            {eleve.prenom} {eleve.nom}
          </h1>
          <p className="text-sm text-[var(--color-ink-muted)] font-mono mt-0.5">{eleve.matricule}</p>
          <dl className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <Info label="Classe" value={classeLib ?? "-"} />
            <Info label="Année scolaire" value={eleve.classe?.anneeScolaire.libelle ?? "-"} />
            <Info label="Date de naissance" value={eleve.dateNaissance.toLocaleDateString("fr-FR")} />
            <Info label="Statut" value={eleve.statut === "DIPLOME" ? "Diplômé(e)" : "Inscrit(e)"} />
          </dl>
        </section>

        {/* Bulletins */}
        <section className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
          <h2 className="px-5 pt-5 pb-3 text-sm font-medium text-[var(--color-ink-muted)] uppercase tracking-wide">
            Bulletins
          </h2>
          {bulletins.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-[var(--color-ink-muted)]">Aucun bulletin publié pour le moment.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
              {bulletins.map((b) => (
                <li key={b.trimestreId} className="p-4 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{b.trimestre.nom}</p>
                      <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{b.trimestre.anneeScolaire.libelle}</p>
                    </div>
                    <a
                      href={"/api/parent/" + code + "/bulletins/" + b.trimestreId + "/pdf"}
                      target="_blank"
                      className="shrink-0 inline-flex items-center h-9 px-3 rounded-lg bg-[var(--color-brand)] text-white text-xs font-medium"
                    >
                      Télécharger (PDF)
                    </a>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <Chiffre label="Moyenne" value={fmt(b.moyenneGenerale) + " / 20"} fort />
                    <Chiffre label="Rang" value={b.rang ? b.rang + " / " + b.effectifClasse : "-"} />
                    <Chiffre label="Moy. classe" value={b.moyenneClasse !== null ? fmt(b.moyenneClasse) : "-"} />
                  </div>
                  {(b.decision || b.appreciation) && (
                    <p className="text-sm mt-3">
                      {b.decision && <span className="font-medium">{DECISIONS[b.decision] ?? b.decision}</span>}
                      {b.decision && b.appreciation ? " · " : ""}
                      {b.appreciation && <span className="text-[var(--color-ink-muted)]">{b.appreciation}</span>}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Notes */}
        <section className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
          <h2 className="px-5 pt-5 pb-1 text-sm font-medium text-[var(--color-ink-muted)] uppercase tracking-wide">
            Notes de l&apos;année
          </h2>
          <p className="px-5 pb-3 text-xs text-[var(--color-ink-faint)]">Seules les notes validées par l&apos;établissement apparaissent.</p>
          {trimestres.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-[var(--color-ink-muted)]">Aucune note disponible pour le moment.</p>
          ) : (
            trimestres.map((t) => (
              <div key={t.nom} className="border-t border-[var(--color-border)]">
                <p className="px-5 py-2.5 text-sm font-semibold bg-[var(--color-surface)]">{t.nom}</p>
                <ul className="divide-y divide-[var(--color-border)]">
                  {Array.from(t.matieres.entries())
                    .sort(([a], [b]) => a.localeCompare(b, "fr"))
                    .map(([matiere, liste]) => (
                      <li key={matiere} className="px-5 py-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {matiere}
                          <span className="text-xs font-normal text-[var(--color-ink-faint)]"> · coef. {liste[0].matiere.coefficient}</span>
                        </span>
                        <span className="flex flex-wrap gap-1.5">
                          {liste
                            .sort((a, b) => (a.type === b.type ? a.numero - b.numero : a.type === "DEVOIR" ? -1 : 1))
                            .map((n) => (
                              <span
                                key={n.id}
                                className={
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs tnum " +
                                  (n.type === "COMPOSITION"
                                    ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                                    : "bg-neutral-100 text-neutral-700")
                                }
                                title={(n.type === "COMPOSITION" ? "Composition " : "Devoir ") + n.numero}
                              >
                                <span className="opacity-60">{n.type === "COMPOSITION" ? "C" : "D"}{n.numero}</span>
                                <span className="font-medium">{n.valeur !== null ? fmt(n.valeur, n.valeur % 1 ? 2 : 0) : "abs"}</span>
                                <span className="opacity-60">/{n.sur}</span>
                              </span>
                            ))}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            ))
          )}
        </section>

        {/* Frais */}
        {situation && (
          <section className="bg-white rounded-xl border border-[var(--color-border)] p-5">
            <h2 className="text-sm font-medium text-[var(--color-ink-muted)] uppercase tracking-wide mb-3">
              Frais de scolarité
            </h2>
            <div className="grid grid-cols-3 gap-2">
              <Chiffre label="Payé" value={situation.totalPaye.toLocaleString("fr-FR") + " F"} />
              <Chiffre
                label="En retard"
                value={situation.retard.toLocaleString("fr-FR") + " F"}
                alerte={situation.retard > 0.01}
              />
              <Chiffre label="Reste (année)" value={situation.resteTotal.toLocaleString("fr-FR") + " F"} />
            </div>
            <p className="text-sm mt-3">
              Situation : <span className="font-medium">{libelleStatut(situation.statut)}</span>
              {frais && frais.fraisInscription === 0 && eleve.classe && eleve.classe.fraisInscription > 0 && (
                <span className="text-[var(--color-ink-muted)]"> · exonéré(e) des frais d&apos;inscription</span>
              )}
            </p>
          </section>
        )}

        <p className="text-center text-xs text-[var(--color-ink-faint)] py-4">
          Lien personnel : ne le partagez pas. Pour toute question, contactez l&apos;établissement
          {eleve.etablissement.telephone ? " au " + eleve.etablissement.telephone : ""}.
        </p>
        <LiensLegaux className="justify-center pb-6 text-[var(--color-ink-muted)]" />
      </main>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--color-ink-muted)]">{label}</dt>
      <dd className="font-medium mt-0.5">{value}</dd>
    </div>
  );
}

function Chiffre({ label, value, fort, alerte }: { label: string; value: string; fort?: boolean; alerte?: boolean }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] p-2.5">
      <p className="text-[11px] text-[var(--color-ink-muted)]">{label}</p>
      <p
        className={
          "text-sm mt-0.5 tnum " +
          (fort ? "font-semibold text-[var(--color-brand)] " : "font-medium ") +
          (alerte ? "text-red-700" : "")
        }
      >
        {value}
      </p>
    </div>
  );
}
