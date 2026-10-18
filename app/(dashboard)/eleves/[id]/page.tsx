import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { peut } from "@/lib/auth/permissions";
import { assurerCodeParent, qrCodeSvg, urlPortailParent } from "@/lib/portail/acces";
import { AccesParent } from "./AccesParent";
import { EditerEleve } from "./EditerEleve";
import { libStatutEleve, libTypeNote } from "@/lib/libelles";

export default async function EleveDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ inscrit?: string }>;
}) {
  const { id } = await params;
  const { inscrit } = await searchParams;
  const user = await requirePermission("eleve.read");

  const eleve = await prisma.eleve.findUnique({
    where: { id },
    include: {
      classe: { include: { anneeScolaire: true } },
      notes: { include: { matiere: true, trimestre: true }, take: 10, orderBy: { createdAt: "desc" } },
      fraisScolarite: {
        include: {
          anneeScolaire: true,
          tranches: { orderBy: { ordre: "asc" }, include: { paiements: true } },
        },
      },
    },
  });
  if (!eleve || eleve.etablissementId !== user.etablissementId) notFound();

  const peutModifier = peut(user.roles, "eleve.update");
  const classesActives = peutModifier
    ? await prisma.classe.findMany({
        where: { etablissementId: user.etablissementId, anneeScolaire: { active: true } },
        select: {
          id: true, nom: true, niveau: true, section: true, capaciteMax: true,
          _count: { select: { eleves: { where: { statut: "INSCRIT" } } } },
        },
        orderBy: [{ niveau: "asc" }, { section: "asc" }],
      })
    : [];
  const urlParent = await urlPortailParent(await assurerCodeParent(eleve.id));
  const qrSvg = await qrCodeSvg(urlParent);

  const frais = eleve.fraisScolarite[0];
  const total = frais
    ? frais.fraisInscription + frais.fraisScolariteMensuel * frais.tranches.filter((t) => t.ordre > 0).length
    : 0;
  const paye = frais
    ? frais.tranches.reduce((s, t) => s + t.paiements.filter((p) => !p.annule).reduce((ss, p) => ss + p.montant, 0), 0)
    : 0;
  const reste = total - paye;

  let moisEcoules = 0;
  let moisEnRetard = 0;
  if (frais) {
    const now = new Date();
    const debut = new Date(frais.dateDebut);
    moisEcoules = (now.getFullYear() - debut.getFullYear()) * 12 + (now.getMonth() - debut.getMonth()) + 1;
    if (moisEcoules < 0) moisEcoules = 0;
    const mensuelles = frais.tranches.filter((t) => t.ordre > 0);
    for (const t of mensuelles) {
      const tp = t.paiements.filter((p) => !p.annule).reduce((s, p) => s + p.montant, 0);
      if (tp < t.montant - 0.01 && new Date(t.dateEcheance) < now) moisEnRetard++;
    }
  }

  const classeLib = eleve.classe
    ? (eleve.classe.nom || (eleve.classe.niveau + (eleve.classe.section ? " " + eleve.classe.section : "")))
    : null;

  return (
    <div className="space-y-5 max-w-5xl">
      {/* En-tete */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/eleves" className="text-xs text-[var(--color-ink-muted)] hover:underline">
            ← Retour aux élèves
          </Link>
          <h1 className="text-2xl font-semibold mt-1">{eleve.nom} {eleve.prenom}</h1>
          <p className="text-sm text-[var(--color-ink-muted)] font-mono mt-0.5">{eleve.matricule}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {peutModifier && (
            <EditerEleve
              eleve={{
                id: eleve.id,
                nom: eleve.nom,
                prenom: eleve.prenom,
                dateNaissance: eleve.dateNaissance.toISOString().slice(0, 10),
                sexe: eleve.sexe,
                tuteurNom: eleve.tuteurNom ?? "",
                tuteurTelephone: eleve.tuteurTelephone ?? "",
                emailParent: eleve.emailParent ?? "",
                classeId: eleve.classeId ?? "",
              }}
              classes={classesActives.map((c) => ({
                id: c.id,
                label: c.nom || c.niveau + (c.section ? " " + c.section : ""),
                complet: c._count.eleves >= c.capaciteMax,
              }))}
            />
          )}
          {frais && (
            <Link
              href={"/frais/eleve/" + eleve.id}
              className="inline-flex items-center h-10 px-4 rounded-lg bg-[var(--color-brand)] text-white text-sm font-medium"
            >
              Gérer les paiements
            </Link>
          )}
        </div>
      </div>

      {inscrit && (
        <div className="rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium text-[var(--color-accent)]">Élève inscrit avec succès</p>
            <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
              Imprimez la fiche d&apos;inscription : elle contient le QR code d&apos;accès à l&apos;espace parent.
            </p>
          </div>
          <a
            href={"/api/eleves/" + eleve.id + "/fiche-inscription/pdf"}
            target="_blank"
            className="inline-flex items-center h-10 px-4 rounded-lg bg-[var(--color-brand)] text-white text-sm font-medium"
          >
            Imprimer la fiche d&apos;inscription
          </a>
        </div>
      )}

      {/* Infos personnelles */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <h2 className="text-sm font-medium text-[var(--color-ink-muted)] uppercase tracking-wide mb-3">
          Informations personnelles
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <Info label="Date de naissance" value={new Date(eleve.dateNaissance).toLocaleDateString("fr-FR")} />
          <Info label="Sexe" value={eleve.sexe === "M" ? "Masculin" : "Féminin"} />
          <Info label="Statut" value={libStatutEleve(eleve.statut)} />
          <Info label="Classe" value={classeLib ?? "-"} />
        </div>
      </div>

      {/* Parent / Tuteur */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <h2 className="text-sm font-medium text-[var(--color-ink-muted)] uppercase tracking-wide mb-3">
          Parent / Tuteur
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <Info label="Nom" value={eleve.tuteurNom ?? "-"} />
          <Info
            label="Téléphone"
            value={eleve.tuteurTelephone ?? "-"}
            href={eleve.tuteurTelephone ? "tel:" + eleve.tuteurTelephone : undefined}
          />
          <Info
            label="Email"
            value={eleve.emailParent ?? "Non renseigné"}
            href={eleve.emailParent ? "mailto:" + eleve.emailParent : undefined}
            muted={!eleve.emailParent}
          />
        </div>
      </div>

      <AccesParent
        eleveId={eleve.id}
        url={urlParent}
        qrSvg={qrSvg}
        peutModifier={peutModifier}
      />

      {/* Classe + frais */}
      {eleve.classe && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-[var(--color-ink-muted)] uppercase tracking-wide">
              Classe
            </h2>
            <Link href={"/classes/" + eleve.classe.id} className="text-xs text-[var(--color-brand)] hover:underline">
              Voir la classe
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <Info label="Classe" value={classeLib ?? "-"} />
            <Info label="Année scolaire" value={eleve.classe.anneeScolaire.libelle} />
            <Info
              label="Frais d'inscription"
              value={
                frais && frais.fraisInscription === 0 && eleve.classe.fraisInscription > 0
                  ? "Exonéré"
                  : eleve.classe.fraisInscription.toLocaleString("fr-FR") + " F"
              }
            />
            <Info label="Scolarité mensuelle" value={eleve.classe.fraisScolariteMensuel.toLocaleString("fr-FR") + " F"} />
          </div>
        </div>
      )}

      {/* Situation frais */}
      {frais && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <h2 className="text-sm font-medium text-[var(--color-ink-muted)] uppercase tracking-wide mb-3">
            Situation des paiements
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <MiniStat label="Total dû" value={total.toLocaleString("fr-FR") + " F"} />
            <MiniStat label="Payé" value={paye.toLocaleString("fr-FR") + " F"} tone="success" />
            <MiniStat
              label="Reste"
              value={reste.toLocaleString("fr-FR") + " F"}
              tone={reste > 0 ? "danger" : undefined}
            />
            <MiniStat
              label="Mois en retard"
              value={moisEnRetard + " / " + moisEcoules}
              tone={moisEnRetard > 0 ? "danger" : "success"}
            />
          </div>

          {/* Tableau desktop */}
          <div className="hidden md:block overflow-hidden rounded-lg border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left p-2.5 font-medium text-[var(--color-ink-muted)]">Libellé</th>
                  <th className="text-left p-2.5 font-medium text-[var(--color-ink-muted)]">Échéance</th>
                  <th className="text-right p-2.5 font-medium text-[var(--color-ink-muted)]">Montant</th>
                  <th className="text-right p-2.5 font-medium text-[var(--color-ink-muted)]">Payé</th>
                  <th className="p-2.5 font-medium text-[var(--color-ink-muted)]">Statut</th>
                </tr>
              </thead>
              <tbody>
                {frais.tranches.map((t) => {
                  const tp = t.paiements.filter((p) => !p.annule).reduce((s, p) => s + p.montant, 0);
                  const tr = t.montant - tp;
                  const enRetard = tr > 0.01 && new Date(t.dateEcheance) < new Date();
                  return (
                    <tr key={t.id} className={"border-t border-[var(--color-border)] " + (t.ordre === 0 ? "bg-neutral-50/60" : "")}>
                      <td className="p-2.5">{t.libelle}</td>
                      <td className="p-2.5 text-xs text-[var(--color-ink-muted)] tnum">
                        {new Date(t.dateEcheance).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="p-2.5 text-right tnum">{t.montant.toLocaleString("fr-FR")}</td>
                      <td className="p-2.5 text-right tnum text-[var(--color-accent)]">{tp.toLocaleString("fr-FR")}</td>
                      <td className="p-2.5">
                        <StatutBadge tr={tr} tp={tp} enRetard={enRetard} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cartes mobile */}
          <div className="md:hidden space-y-2">
            {frais.tranches.map((t) => {
              const tp = t.paiements.filter((p) => !p.annule).reduce((s, p) => s + p.montant, 0);
              const tr = t.montant - tp;
              const enRetard = tr > 0.01 && new Date(t.dateEcheance) < new Date();
              return (
                <div key={t.id} className="rounded-lg border border-[var(--color-border)] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{t.libelle}</p>
                      <p className="text-xs text-[var(--color-ink-muted)] mt-0.5 tnum">
                        {new Date(t.dateEcheance).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <StatutBadge tr={tr} tp={tp} enRetard={enRetard} />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-sm tnum">
                    <span className="text-[var(--color-ink-muted)]">{tp.toLocaleString("fr-FR")} / {t.montant.toLocaleString("fr-FR")} F</span>
                    {tr > 0.01 && <span className="text-red-700 font-medium">Reste {tr.toLocaleString("fr-FR")} F</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="p-5 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-medium text-[var(--color-ink-muted)] uppercase tracking-wide">
            Notes récentes
          </h2>
        </div>
        {eleve.notes.length === 0 ? (
          <p className="p-6 text-center text-sm text-[var(--color-ink-muted)]">Aucune note enregistrée.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
              <tr>
                <th className="text-left p-2.5 font-medium text-[var(--color-ink-muted)]">Matière</th>
                <th className="text-left p-2.5 font-medium text-[var(--color-ink-muted)]">Trimestre</th>
                <th className="text-left p-2.5 font-medium text-[var(--color-ink-muted)]">Type</th>
                <th className="text-right p-2.5 font-medium text-[var(--color-ink-muted)]">Note</th>
              </tr>
            </thead>
            <tbody>
              {eleve.notes.map((n) => (
                <tr key={n.id} className="border-t border-[var(--color-border)]">
                  <td className="p-2.5">{n.matiere.nom}</td>
                  <td className="p-2.5 text-[var(--color-ink-muted)]">{n.trimestre.nom}</td>
                  <td className="p-2.5 text-[var(--color-ink-muted)]">{libTypeNote(n.type)} {n.numero}</td>
                  <td className="p-2.5 text-right tnum font-medium">{n.valeur ?? "-"} / {n.sur}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Info({
  label, value, href, muted,
}: { label: string; value: string; href?: string; muted?: boolean }) {
  return (
    <div>
      <p className="text-xs text-[var(--color-ink-muted)]">{label}</p>
      {href ? (
        <a href={href} className="font-medium mt-0.5 text-[var(--color-brand)] hover:underline break-all">
          {value}
        </a>
      ) : (
        <p className={"font-medium mt-0.5 " + (muted ? "text-[var(--color-ink-muted)]" : "")}>{value}</p>
      )}
    </div>
  );
}

function MiniStat({
  label, value, tone,
}: { label: string; value: string; tone?: "success" | "danger" }) {
  const c = tone === "success" ? "text-[var(--color-accent)]" : tone === "danger" ? "text-red-700" : "";
  return (
    <div className="rounded-lg border border-[var(--color-border)] p-3">
      <p className="text-xs text-[var(--color-ink-muted)]">{label}</p>
      <p className={"text-base font-semibold mt-0.5 tnum " + c}>{value}</p>
    </div>
  );
}

function StatutBadge({ tr, tp, enRetard }: { tr: number; tp: number; enRetard: boolean }) {
  if (tr <= 0.01) {
    return <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-[var(--color-accent-soft)] text-[var(--color-accent)]">Payé</span>;
  }
  if (enRetard) {
    return <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-red-50 text-red-700">En retard</span>;
  }
  if (tp > 0) {
    return <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-amber-50 text-amber-800">Partiel</span>;
  }
  return <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-neutral-100 text-neutral-600">À venir</span>;
}