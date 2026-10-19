import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { EncaisserPaiement, GenererFrais } from "./FraisClient";
import { calculerSituation, libelleStatut, libelleStatutInscription } from "@/lib/frais/calculs";

export default async function FraisElevePage({ params }: { params: Promise<{ eleveId: string }> }) {
  const { eleveId } = await params;
  const user = await requirePermission("frais.read");

  const eleve = await prisma.eleve.findUnique({
    where: { id: eleveId },
    include: {
      classe: true,
      fraisScolarite: {
        include: {
          anneeScolaire: true,
          tranches: {
            orderBy: { ordre: "asc" },
            include: { paiements: { orderBy: { datePaiement: "desc" } } },
          },
        },
      },
    },
  });

  if (!eleve || eleve.etablissementId !== user.etablissementId) notFound();

  const frais = eleve.fraisScolarite[0];
  const libClasse = eleve.classe
    ? (eleve.classe.nom || (eleve.classe.niveau + (eleve.classe.section ? " " + eleve.classe.section : "")))
    : "Sans classe";

  // Cas : pas de frais configures
  if (!frais) {
    const classeAPasDeFrais =
      !eleve.classe ||
      (eleve.classe.fraisInscription === 0 && eleve.classe.fraisScolariteMensuel === 0);

    return (
      <div className="space-y-5 max-w-3xl">
        <Link href="/frais" className="text-xs text-[var(--color-ink-muted)] hover:underline">← Retour aux frais</Link>
        <div>
          <h1 className="text-2xl font-semibold mt-1">{eleve.nom} {eleve.prenom}</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">{eleve.matricule} · {libClasse}</p>
        </div>

        {classeAPasDeFrais ? (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-6 space-y-3">
            <h2 className="font-semibold text-amber-900">Impossible de générer les frais</h2>
            <p className="text-sm text-amber-800">
              {!eleve.classe
                ? "Cet élève n'a pas de classe assignée."
                : "La classe " + libClasse + " n'a aucun frais défini."}
            </p>
            <Link
              href={eleve.classe ? "/classes/" + eleve.classe.id : "/eleves/" + eleve.id}
              className="inline-flex items-center h-10 px-4 rounded-lg bg-[var(--color-brand)] text-white text-sm font-medium"
            >
              {eleve.classe ? "Modifier la classe" : "Assigner une classe"}
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-6 space-y-4">
            <h2 className="font-semibold">Aucun frais configuré</h2>
            <p className="text-sm text-[var(--color-ink-muted)]">Générez les frais depuis la classe {libClasse}.</p>
            <div className="rounded-lg bg-[var(--color-surface)] p-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[var(--color-ink-muted)]">Inscription</p>
                <p className="font-semibold tnum mt-0.5">{eleve.classe!.fraisInscription.toLocaleString("fr-FR")} F</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-ink-muted)]">Scolarité mensuelle</p>
                <p className="font-semibold tnum mt-0.5">{eleve.classe!.fraisScolariteMensuel.toLocaleString("fr-FR")} F</p>
              </div>
            </div>
            <GenererFrais eleveId={eleve.id} />
          </div>
        )}
      </div>
    );
  }

  // Calcul de la situation complete
  const situation = calculerSituation(
    frais.fraisInscription,
    frais.fraisScolariteMensuel,
    frais.dateDebut,
    frais.tranches.map((t) => ({
      id: t.id,
      ordre: t.ordre,
      libelle: t.libelle,
      montant: t.montant,
      dateEcheance: t.dateEcheance,
      paiements: t.paiements.map((p) => ({ montant: p.montant, annule: p.annule })),
    }))
  );

  const now = new Date();

  const statutBadge =
    situation.statut === "SOLDE" ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
    : situation.statut === "EN_RETARD" ? "bg-red-50 text-red-700"
    : situation.statut === "EN_AVANCE" ? "bg-blue-50 text-blue-700"
    : "bg-[var(--color-brand-soft)] text-[var(--color-brand)]";

  const ratioMois = situation.moisEcoules > 0
    ? Math.min(100, (situation.moisPayes / situation.moisEcoules) * 100)
    : 100;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/frais" className="text-xs text-[var(--color-ink-muted)] hover:underline">← Retour aux frais</Link>
          <h1 className="text-2xl font-semibold mt-1">{eleve.nom} {eleve.prenom}</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">
            {eleve.matricule} · {libClasse} · {frais.anneeScolaire.libelle}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {situation.inscriptionStatut !== "AUCUNE" && (
              <span className={
                "inline-flex px-3 py-1 rounded-md text-xs font-medium " +
                (situation.inscriptionStatut === "PAYEE" ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                : situation.inscriptionStatut === "PARTIELLE" ? "bg-amber-50 text-amber-800"
                : "bg-red-50 text-red-700")
              }>
                Inscription {libelleStatutInscription(situation.inscriptionStatut).toLowerCase()}
              </span>
            )}
            <span className={"inline-flex px-3 py-1 rounded-md text-sm font-medium " + statutBadge}>
              {libelleStatut(situation.statut)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a href={"/api/eleves/" + eleve.id + "/scolarite/pdf"} target="_blank" className="inline-flex items-center h-10 px-4 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm font-medium hover:bg-neutral-50">
              Fiche de scolarité (PDF)
            </a>
            <Link href={"/eleves/" + eleve.id} className="text-xs text-[var(--color-ink-muted)] hover:underline">
              Voir le profil
            </Link>
          </div>
        </div>
      </div>

      {/* Alerte inscription non payee */}
      {situation.inscriptionStatut === "IMPAYEE" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-amber-900">Frais d'inscription non payés</p>
            <p className="text-xs text-amber-800 mt-0.5">
              L'inscription de {situation.inscriptionReste.toLocaleString("fr-FR")} F CFA n'a pas été réglée.
              Utilisez le bouton "Encaisser" sur la ligne "Inscription" ci-dessous.
            </p>
          </div>
        </div>
      )}

      {situation.inscriptionStatut === "PARTIELLE" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">!</div>
          <div className="min-w-0">
            <p className="font-medium text-amber-900">Inscription partiellement payée</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Reste {situation.inscriptionReste.toLocaleString("fr-FR")} F CFA sur {situation.fraisInscription.toLocaleString("fr-FR")} F.
            </p>
          </div>
        </div>
      )}

      {/* Alerte retard global */}
      {situation.statut === "EN_RETARD" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0 font-bold">!</div>
          <div className="min-w-0">
            <p className="font-medium text-red-900">
              Retard total de {situation.retard.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} F CFA
            </p>
            <p className="text-xs text-red-800 mt-0.5">
              {situation.moisPayes} mois payés sur {situation.moisEcoules} mois écoulés.
              {situation.inscriptionStatut === "IMPAYEE" && " L'inscription est incluse dans ce retard."}
            </p>
          </div>
        </div>
      )}

      {situation.statut === "EN_AVANCE" && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 font-bold">✓</div>
          <div>
            <p className="font-medium text-blue-900">Paiement en avance</p>
            <p className="text-xs text-blue-800 mt-0.5">
              {situation.moisPayes} mois payés pour {situation.moisEcoules} mois écoulés.
            </p>
          </div>
        </div>
      )}

      {/* Stats principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Stat label="Inscription" value={
          situation.inscriptionStatut === "AUCUNE" ? "—" :
          situation.inscriptionStatut === "PAYEE" ? "Payée" :
          situation.inscriptionReste.toLocaleString("fr-FR") + " F"
        } accent={
          situation.inscriptionStatut === "IMPAYEE" ? "danger" :
          situation.inscriptionStatut === "PAYEE" ? "accent" :
          situation.inscriptionStatut === "PARTIELLE" ? "gold" : undefined
        } />
        <Stat label="Payé" value={situation.totalPaye.toLocaleString("fr-FR") + " F"} accent="accent" />
        <Stat
          label="Attendu jusqu'à maintenant"
          value={situation.attenduJusquMaintenant.toLocaleString("fr-FR") + " F"}
          accent="brand"
        />
        <Stat
          label="Retard"
          value={(situation.retard > 0 ? situation.retard : 0).toLocaleString("fr-FR") + " F"}
          accent={situation.retard > 0 ? "danger" : undefined}
        />
      </div>

      {/* Progression */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium">Progression depuis le début de l'année</p>
            <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
              Début : {new Date(frais.dateDebut).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
              {" · "}
              Mois {situation.moisEcoules} sur {situation.moisTotal}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-[var(--color-ink-muted)]">
            <span>{situation.moisPayes} mois payés</span>
            <span>{situation.moisEcoules} mois écoulés / {situation.moisTotal} au total</span>
          </div>
          <div className="h-3 rounded-full bg-neutral-100 overflow-hidden relative">
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-ink-faint)] z-10"
              style={{ left: ((situation.moisEcoules / situation.moisTotal) * 100) + "%" }}
            />
            <div
              className={"h-full transition-all " + (situation.statut === "EN_RETARD" ? "bg-red-500" : "bg-[var(--color-accent)]")}
              style={{ width: ((situation.moisPayes / situation.moisTotal) * 100) + "%" }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className={"font-medium " + (situation.statut === "EN_RETARD" ? "text-red-700" : "text-[var(--color-accent)]")}>
              {ratioMois.toFixed(0)} % des mois écoulés payés
            </span>
            <span className="text-[var(--color-ink-muted)]">
              Reste {situation.resteTotal.toLocaleString("fr-FR")} F sur l'année
            </span>
          </div>
        </div>
      </div>

      {/* Detail des echeances */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="p-4 md:p-5 border-b border-[var(--color-border)]">
          <h2 className="font-semibold">Échéances</h2>
          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
            Inscription {frais.fraisInscription.toLocaleString("fr-FR")} F + {situation.moisTotal} mensualités de {frais.fraisScolariteMensuel.toLocaleString("fr-FR")} F
          </p>
        </div>

        {/* Desktop */}
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
              <tr>
                <th className="text-left p-3 font-medium text-[var(--color-ink-muted)] w-12">#</th>
                <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Libellé</th>
                <th className="text-left p-3 font-medium text-[var(--color-ink-muted)]">Échéance</th>
                <th className="text-right p-3 font-medium text-[var(--color-ink-muted)]">Montant</th>
                <th className="text-right p-3 font-medium text-[var(--color-ink-muted)]">Payé</th>
                <th className="text-right p-3 font-medium text-[var(--color-ink-muted)]">Reste</th>
                <th className="text-center p-3 font-medium text-[var(--color-ink-muted)] w-32">Statut</th>
                <th className="p-3 w-40"></th>
              </tr>
            </thead>
            <tbody>
              {frais.tranches.map((t, i) => {
                const tp = t.paiements.filter((p) => !p.annule).reduce((s, p) => s + p.montant, 0);
                const tr = t.montant - tp;
                const estDue = new Date(t.dateEcheance) <= now;
                const enRetard = tr > 0.01 && estDue;
                const estInscription = t.ordre === 0;

                return (
                  <tr key={t.id} className={"border-t border-[var(--color-border)] " + (estInscription ? "bg-amber-50/40" : "")}>
                    <td className="p-3 text-[var(--color-ink-faint)] tnum">{i + 1}</td>
                    <td className="p-3">
                      <span className="font-medium">{t.libelle}</span>
                      {estInscription && <span className="ml-2 inline-flex px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-900 font-medium">UNIQUE</span>}
                    </td>
                    <td className="p-3 text-xs text-[var(--color-ink-muted)] tnum">
                      {new Date(t.dateEcheance).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="p-3 text-right tnum font-medium">{t.montant.toLocaleString("fr-FR")}</td>
                    <td className="p-3 text-right tnum text-[var(--color-accent)]">{tp > 0 ? tp.toLocaleString("fr-FR") : "—"}</td>
                    <td className="p-3 text-right tnum">
                      {tr <= 0.01 ? (
                        <span className="text-[var(--color-ink-faint)]">—</span>
                      ) : (
                        <span className={enRetard ? "text-red-700 font-medium" : ""}>{tr.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {tr <= 0.01 ? (
                        <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-[var(--color-accent-soft)] text-[var(--color-accent)]">Payé</span>
                      ) : enRetard ? (
                        <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-red-50 text-red-700">En retard</span>
                      ) : tp > 0 ? (
                        <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-amber-50 text-amber-800">Partiel</span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-neutral-100 text-neutral-600">À venir</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col items-end gap-1.5">
                        {tr > 0.01 && <EncaisserPaiement trancheId={t.id} trancheLibelle={t.libelle} reste={tr} />}
                        {t.paiements.length > 0 && (
                          <div className="flex flex-wrap justify-end gap-1">
                            {t.paiements.map((p) => (
                              <Link key={p.id} href={"/api/frais/recu/" + p.id + "/pdf"} target="_blank" className={"text-xs underline " + (p.annule ? "text-neutral-400 line-through" : "text-[var(--color-brand)]")}>
                                {p.recuNumero.replace("REC-", "")}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-[var(--color-border)]">
          {frais.tranches.map((t, i) => {
            const tp = t.paiements.filter((p) => !p.annule).reduce((s, p) => s + p.montant, 0);
            const tr = t.montant - tp;
            const estDue = new Date(t.dateEcheance) <= now;
            const enRetard = tr > 0.01 && estDue;
            const estInscription = t.ordre === 0;

            return (
              <div key={t.id} className={"p-4 " + (estInscription ? "bg-amber-50/40" : "")}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      <span className="text-[var(--color-ink-faint)] mr-1">{i + 1}.</span>
                      {t.libelle}
                      {estInscription && <span className="ml-2 inline-flex px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-900 font-medium">UNIQUE</span>}
                    </p>
                    <p className="text-xs text-[var(--color-ink-muted)] mt-0.5 tnum">
                      échéance : {new Date(t.dateEcheance).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  {tr <= 0.01 ? (
                    <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-[var(--color-accent-soft)] text-[var(--color-accent)] whitespace-nowrap">Payé</span>
                  ) : enRetard ? (
                    <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-red-50 text-red-700 whitespace-nowrap">En retard</span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-neutral-100 text-neutral-600 whitespace-nowrap">À venir</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div>
                    <p className="text-[var(--color-ink-muted)]">Montant</p>
                    <p className="font-medium tnum mt-0.5">{t.montant.toLocaleString("fr-FR")}</p>
                  </div>
                  <div>
                    <p className="text-[var(--color-ink-muted)]">Payé</p>
                    <p className="font-medium tnum text-[var(--color-accent)] mt-0.5">{tp > 0 ? tp.toLocaleString("fr-FR") : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[var(--color-ink-muted)]">Reste</p>
                    <p className={"font-medium tnum mt-0.5 " + (tr > 0.01 ? (enRetard ? "text-red-700" : "") : "text-[var(--color-ink-faint)]")}>
                      {tr <= 0.01 ? "—" : tr.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
                {tr > 0.01 && <EncaisserPaiement trancheId={t.id} trancheLibelle={t.libelle} reste={tr} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "brand" | "accent" | "gold" | "danger" }) {
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