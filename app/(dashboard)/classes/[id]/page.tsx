import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { EditerClasse } from "./EditerClasse";

const JOURS_ORDRE = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"];

export default async function ClasseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("classe.read");

  const classe = await prisma.classe.findUnique({
    where: { id },
    include: {
      anneeScolaire: true,
      titulaire: { select: { nom: true, prenom: true, id: true } },
      eleves: { where: { statut: "INSCRIT" }, orderBy: [{ nom: "asc" }] },
      affectations: {
        include: {
          enseignant: { select: { id: true, nom: true, prenom: true, poste: true } },
          matiere: { select: { id: true, nom: true, coefficient: true } },
        },
      },
    },
  });
  if (!classe || classe.etablissementId !== user.etablissementId) notFound();

  // Matieres du cycle
  const toutesMatieres = await prisma.matiere.findMany({
    where: {
      etablissementId: user.etablissementId,
      cycle: classe.cycle,
    },
    orderBy: { nom: "asc" },
  });

  // Enseignants disponibles pour les affectations
  const enseignants = await prisma.employe.findMany({
    where: {
      etablissementId: user.etablissementId,
      poste: "Enseignant",
      actif: true,
    },
    select: { id: true, nom: true, prenom: true },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });

  // Analyser la couverture
  const matieresCouvertes = new Set<string>();
  const titulaires = classe.affectations.filter((a) => a.type === "TITULAIRE");
  const creneauxMatiere = classe.affectations.filter((a) => a.type === "PROFESSEUR_MATIERE" && a.matiere);

  for (const a of creneauxMatiere) {
    if (a.matiereId) matieresCouvertes.add(a.matiereId);
  }

  // Si un titulaire est assigne, on considere que les matieres sont couvertes par lui
  const aTitulaire = titulaires.length > 0;
  const matieresNonCouvertes = aTitulaire
    ? []
    : toutesMatieres.filter((m) => !matieresCouvertes.has(m.id));

  // Regrouper les creneaux par jour
  const creneauxParJour: Record<string, typeof creneauxMatiere> = {};
  for (const j of JOURS_ORDRE) creneauxParJour[j] = [];
  const sansCreneau: typeof creneauxMatiere = [];

  for (const a of creneauxMatiere) {
    if (a.jour && JOURS_ORDRE.includes(a.jour)) {
      creneauxParJour[a.jour].push(a);
    } else {
      sansCreneau.push(a);
    }
  }
  for (const j of JOURS_ORDRE) {
    creneauxParJour[j].sort((a, b) => (a.heureDebut || "").localeCompare(b.heureDebut || ""));
  }

  const lib = classe.nom || (classe.niveau + (classe.section ? " " + classe.section : ""));
  const peutEditer = user.roles.includes("DIRECTEUR") || user.roles.includes("SECRETAIRE");
  const taux = classe.capaciteMax > 0 ? (classe.eleves.length / classe.capaciteMax) * 100 : 0;
  const plein = classe.eleves.length >= classe.capaciteMax;

  function libJour(j: string): string {
    const map: Record<string, string> = {
      LUNDI: "Lundi", MARDI: "Mardi", MERCREDI: "Mercredi",
      JEUDI: "Jeudi", VENDREDI: "Vendredi", SAMEDI: "Samedi",
    };
    return map[j] || j;
  }

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/classes" className="text-xs text-[var(--color-ink-muted)] hover:underline">
            ← Retour aux classes
          </Link>
          <h1 className="text-2xl font-semibold mt-1">Classe {lib}</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">
            {classe.anneeScolaire.libelle} · {classe.cycle}
          </p>
        </div>
        {peutEditer && (
          <EditerClasse
            classe={{
              id: classe.id,
              nom: classe.nom ?? "",
              niveau: classe.niveau,
              cycle: classe.cycle,
              section: classe.section ?? "",
              salle: classe.salle ?? "",
              titulaireId: classe.titulaire?.id ?? "",
              fraisInscription: classe.fraisInscription,
              fraisScolariteMensuel: classe.fraisScolariteMensuel,
              capaciteMax: classe.capaciteMax,
            }}
            enseignants={enseignants.map((e) => ({ id: e.id, label: e.nom + " " + e.prenom }))}
          />
        )}
      </div>

      {/* 4 stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Stat label="Frais d'inscription" value={classe.fraisInscription.toLocaleString("fr-FR") + " F"} accent="brand" />
        <Stat label="Scolarité mensuelle" value={classe.fraisScolariteMensuel.toLocaleString("fr-FR") + " F"} accent="accent" />
        <Stat label="Effectif" value={classe.eleves.length + " / " + classe.capaciteMax} accent={plein ? "danger" : "brand"} />
        <Stat
          label="Titulaire"
          value={classe.titulaire ? classe.titulaire.nom + " " + classe.titulaire.prenom : "Non assigné"}
          accent="gold"
        />
      </div>

      {/* Progression */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">Taux de remplissage</p>
          <p className="text-sm tnum text-[var(--color-ink-muted)]">{taux.toFixed(0)}%</p>
        </div>
        <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
          <div
            className={"h-full " + (plein ? "bg-red-500" : taux > 80 ? "bg-amber-500" : "bg-[var(--color-accent)]")}
            style={{ width: Math.min(taux, 100) + "%" }}
          />
        </div>
        {classe.salle && (
          <p className="text-xs text-[var(--color-ink-muted)] mt-3">Salle : {classe.salle}</p>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ENSEIGNANTS DE LA CLASSE                              */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Enseignants de la classe</h2>
            <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
              {aTitulaire
                ? "Classe tenue par un titulaire"
                : creneauxMatiere.length + " affectation(s) de matiére"}
            </p>
          </div>
          {peutEditer && (
            <Link
              href={"/personnel"}
              className="text-xs text-[var(--color-brand)] hover:underline"
            >
              Gérer les affectations →
            </Link>
          )}
        </div>

        {/* Cas 1 : titulaire */}
        {aTitulaire ? (
          <div className="p-5 space-y-4">
            <div className="rounded-lg border border-[var(--color-gold-soft)] bg-[var(--color-gold-soft)]/40 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-gold)] text-white flex items-center justify-center font-bold">
                  {titulaires[0].enseignant.nom.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">
                    {titulaires[0].enseignant.nom} {titulaires[0].enseignant.prenom}
                  </p>
                  <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                    Titulaire — en charge de toutes les matiéres du programme
                  </p>
                </div>
              </div>
            </div>

            {titulaires[0].jour && (
              <div className="text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)] mb-2">
                  Créneau principal
                </p>
                <p>
                  {libJour(titulaires[0].jour)} · {titulaires[0].heureDebut} - {titulaires[0].heureFin}
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Cas 2 : matieres couvertes */}
            <div className="p-5 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
                Matiéres assignées
              </p>

              {matieresNonCouvertes.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
                  <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                    !
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-amber-900">
                      {matieresNonCouvertes.length} matiére(s) sans enseignant
                    </p>
                    <p className="text-xs text-amber-800 mt-0.5">
                      {matieresNonCouvertes.map((m) => m.nom).join(", ")}
                    </p>
                  </div>
                </div>
              )}

              <table className="w-full text-sm">
                <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                  <tr>
                    <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Matiére</th>
                    <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Enseignant</th>
                    <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Créneau</th>
                  </tr>
                </thead>
                <tbody>
                  {toutesMatieres.map((m) => {
                    const creneaux = creneauxMatiere.filter((a) => a.matiereId === m.id);
                    const couverte = creneaux.length > 0;
                    return (
                      <tr key={m.id} className={"border-t border-[var(--color-border)] " + (!couverte ? "bg-amber-50/40" : "")}>
                        <td className="p-3 font-medium">{m.nom}</td>
                        <td className="p-3">
                          {couverte ? (
                            <span className="text-[var(--color-ink)]">
                              {creneaux[0].enseignant.nom} {creneaux[0].enseignant.prenom}
                              {creneaux.length > 1 && (
                                <span className="text-xs text-[var(--color-ink-muted)] ml-2">
                                  (+{creneaux.length - 1} créneau{creneaux.length > 2 ? "x" : ""})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-red-50 text-red-700">
                              Aucun enseignant
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-xs text-[var(--color-ink-muted)]">
                          {couverte && creneaux[0].jour
                            ? libJour(creneaux[0].jour) + " " + creneaux[0].heureDebut + "-" + creneaux[0].heureFin
                            : "Non planifié"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Creneaux par jour */}
            {creneauxMatiere.length > 0 && (
              <div className="border-t border-[var(--color-border)] p-5 space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
                  Emploi du temps hebdomadaire
                </p>
                <div className="space-y-2">
                  {JOURS_ORDRE.filter((j) => creneauxParJour[j].length > 0).map((j) => (
                    <div key={j} className="flex items-start gap-3">
                      <div className="w-20 flex-shrink-0 text-xs font-medium text-[var(--color-ink-muted)] pt-1">
                        {libJour(j)}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {creneauxParJour[j].map((a) => (
                          <span
                            key={a.id}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[var(--color-brand-soft)] text-sm"
                          >
                            <span className="font-mono text-xs text-[var(--color-brand)]">
                              {a.heureDebut}-{a.heureFin}
                            </span>
                            <span>{a.matiere?.nom}</span>
                            <span className="text-xs text-[var(--color-ink-muted)]">
                              {a.enseignant.nom}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {sansCreneau.length > 0 && (
                  <div className="text-xs text-[var(--color-ink-muted)] pt-2 border-t border-[var(--color-border)]">
                    {sansCreneau.length} affectation(s) sans créneau défini (horaire non planifié).
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ELEVES                                                  */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="text-sm font-medium text-[var(--color-ink-muted)] uppercase tracking-wide">
            éléves inscrits ({classe.eleves.length})
          </h2>
          <Link
            href={"/eleves/nouveau?classeId=" + classe.id}
            className="text-xs text-[var(--color-brand)] hover:underline"
          >
            + Inscrire un éléve
          </Link>
        </div>

        {classe.eleves.length === 0 ? (
          <p className="p-8 text-center text-sm text-[var(--color-ink-muted)]">
            Aucun éléve dans cette classe pour l'instant.
          </p>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                  <tr>
                    <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Matricule</th>
                    <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Nom</th>
                    <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Prénom</th>
                    <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Sexe</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {classe.eleves.map((e) => (
                    <tr key={e.id} className="border-t border-[var(--color-border)] hover:bg-neutral-50/60">
                      <td className="p-3 font-mono text-xs text-[var(--color-ink-muted)]">{e.matricule}</td>
                      <td className="p-3">{e.nom}</td>
                      <td className="p-3">{e.prenom}</td>
                      <td className="p-3 text-[var(--color-ink-muted)]">{e.sexe === "M" ? "M" : "F"}</td>
                      <td className="p-3 text-right">
                        <Link href={"/eleves/" + e.id} className="text-[var(--color-brand)] text-sm hover:underline">
                          Profil
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-[var(--color-border)]">
              {classe.eleves.map((e) => (
                <Link
                  key={e.id}
                  href={"/eleves/" + e.id}
                  className="flex items-center justify-between p-4 hover:bg-neutral-50"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{e.nom} {e.prenom}</p>
                    <p className="text-xs text-[var(--color-ink-muted)] mt-0.5 font-mono">{e.matricule}</p>
                  </div>
                  <span className="text-[var(--color-ink-muted)] text-lg">›</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({
  label, value, accent,
}: { label: string; value: string; accent: "brand" | "accent" | "gold" | "danger" }) {
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
      <p className="text-lg md:text-xl font-semibold mt-2 tnum">{value}</p>
    </div>
  );
}