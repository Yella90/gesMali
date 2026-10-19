import Link from "next/link";
import { notFound } from "next/navigation";
import { ecole } from "@/lib/data/ecole";
import { requirePermission } from "@/lib/auth/session";
import { peut } from "@/lib/auth/permissions";
import { EditerEmploye, GererAffectations, GererCompte, SupprimerAffectation } from "./PersonnelClient";

const JOURS: Record<string, { libelle: string; ordre: number }> = {
  LUNDI: { libelle: "Lundi", ordre: 1 },
  MARDI: { libelle: "Mardi", ordre: 2 },
  MERCREDI: { libelle: "Mercredi", ordre: 3 },
  JEUDI: { libelle: "Jeudi", ordre: 4 },
  VENDREDI: { libelle: "Vendredi", ordre: 5 },
  SAMEDI: { libelle: "Samedi", ordre: 6 },
};

const TYPES_PAIEMENT: Record<string, string> = {
  MENSUEL: "Salaire mensuel",
  HORAIRE: "Heures",
  PRIME: "Prime",
  AVANCE: "Avance",
  REMBOURSEMENT: "Remboursement",
};

const ROLES: Record<string, string> = {
  DIRECTEUR: "Directeur",
  SECRETAIRE: "Secrétaire",
  COMPTABLE: "Comptable",
  ENSEIGNANT: "Enseignant",
};

function libClasse(c: { nom: string | null; niveau: number; section: string | null }) {
  return c.nom || c.niveau + (c.section ? " " + c.section : "");
}

export default async function PersonnelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("personnel.read");
  const db = ecole(user);
  const peutGerer = peut(user.roles, "personnel.manage");
  // Salaires et versements : direction et comptabilite seulement
  const voitPaiements = peut(user.roles, "paiement.read");

  const employe = await db.employe.findUnique({
    where: { id },
    include: {
      acces: { select: { roles: true, actif: true, user: { select: { email: true } } } },
      affectations: {
        include: {
          classe: { select: { nom: true, niveau: true, section: true } },
          matiere: { select: { nom: true } },
        },
      },
      paiements: voitPaiements ? { orderBy: { datePaiement: "desc" }, take: 6 } : { take: 0 },
    },
  });
  if (!employe || employe.etablissementId !== user.etablissementId) notFound();
  // Compte de l'employe dans cette ecole (un compte peut servir dans plusieurs ecoles)
  const compte = employe.acces
    ? { email: employe.acces.user.email, roles: employe.acces.roles, actif: employe.acces.actif }
    : null;

  const [classes, matieres, totalAnnee] = await Promise.all([
    peutGerer
      ? db.classe.findMany({
          where: { etablissementId: user.etablissementId, anneeScolaire: { active: true } },
          select: { id: true, nom: true, niveau: true, section: true, cycle: true },
          orderBy: [{ niveau: "asc" }, { section: "asc" }],
        })
      : Promise.resolve([]),
    peutGerer
      ? db.matiere.findMany({
          where: { etablissementId: user.etablissementId },
          select: { id: true, nom: true, cycle: true },
          orderBy: { nom: "asc" },
        })
      : Promise.resolve([]),
    db.paiement.aggregate({
      where: {
        employeId: employe.id,
        statut: { not: "ANNULE" },
        datePaiement: { gte: new Date(new Date().getFullYear(), 0, 1) },
      },
      _sum: { montant: true },
    }),
  ]);

  const estMoiMeme = user.employeId === employe.id;
  const affectations = [...employe.affectations].sort(
    (a, b) =>
      (JOURS[a.jour ?? ""]?.ordre ?? 9) - (JOURS[b.jour ?? ""]?.ordre ?? 9) ||
      (a.heureDebut ?? "").localeCompare(b.heureDebut ?? "")
  );
  const posteAffiche = employe.poste === "Autre" && employe.posteLibre ? employe.posteLibre : employe.poste;

  return (
    <div className="max-w-6xl space-y-5">
      <Link href="/personnel" className="text-xs text-[var(--color-ink-muted)] hover:underline">
        ← Retour au personnel
      </Link>

      {/* En-tete */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-brand)] text-lg font-semibold text-white">
          {employe.prenom.charAt(0)}
          {employe.nom.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">
            {employe.prenom} {employe.nom}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
            {posteAffiche}
            {estMoiMeme && " (vous)"}
          </p>
        </div>
        <span
          className={
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium " +
            (employe.actif ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]" : "bg-neutral-100 text-neutral-600")
          }
        >
          <span aria-hidden className={"h-1.5 w-1.5 rounded-full " + (employe.actif ? "bg-[var(--color-accent)]" : "bg-neutral-400")} />
          {employe.actif ? "Actif" : "Inactif"}
        </span>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          {/* Informations */}
          <section className="rounded-xl border border-[var(--color-border)] bg-white p-5">
            <h2 className="mb-4 font-semibold">Informations</h2>
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 md:grid-cols-3">
              <Info
                label="Téléphone"
                value={employe.telephone ?? "Non renseigné"}
                href={employe.telephone ? "tel:" + employe.telephone : undefined}
                discret={!employe.telephone}
              />
              <Info label="Date d'embauche" value={employe.dateEmbauche.toLocaleDateString("fr-FR")} />
              {employe.dateSortie && <Info label="Date de sortie" value={employe.dateSortie.toLocaleDateString("fr-FR")} />}
              <Info
                label="Rémunération de référence"
                value={
                  employe.salaireReference
                    ? employe.salaireReference.toLocaleString("fr-FR") +
                      " F" +
                      (employe.typeRemuneration === "HORAIRE" ? " de l'heure" : " par mois")
                    : "Non définie"
                }
                discret={!employe.salaireReference}
              />
              <Info
                label="Compte de connexion"
                value={compte ? compte.email : "Aucun compte"}
                discret={!compte}
              />
              {compte && (
                <Info label="Rôle" value={compte.roles.map((r) => ROLES[r] ?? r).join(", ")} />
              )}
            </dl>
          </section>

          {/* Affectations */}
          <section className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] p-5">
              <div>
                <h2 className="font-semibold">Affectations</h2>
                <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">Classes, matières et créneaux de la semaine</p>
              </div>
              <Link href="/emploi-du-temps" className="whitespace-nowrap text-xs text-[var(--color-brand)] hover:underline">
                Emploi du temps
              </Link>
            </div>
            {affectations.length === 0 ? (
              <p className="p-6 text-center text-sm text-[var(--color-ink-muted)]">
                Aucune affectation.{peutGerer && " Ajoutez-en une avec le formulaire ci-dessous."}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {affectations.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                    <span className="w-28 shrink-0 text-xs text-[var(--color-ink-muted)] tnum">
                      {a.jour ? (JOURS[a.jour]?.libelle ?? a.jour) + (a.heureDebut ? " " + a.heureDebut : "") : "Sans créneau"}
                      {a.heureFin && "–" + a.heureFin}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{libClasse(a.classe)}</span>
                      <span className="text-[var(--color-ink-muted)]">
                        {a.type === "TITULAIRE" ? ", titulaire de la classe" : a.matiere ? ", " + a.matiere.nom : ""}
                      </span>
                    </span>
                    {peutGerer && <SupprimerAffectation affectationId={a.id} />}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {peutGerer && (
            <GererAffectations
              employeId={employe.id}
              classes={classes.map((c) => ({ id: c.id, label: libClasse(c), cycle: c.cycle }))}
              matieres={matieres}
            />
          )}

          {/* Paiements */}
          {voitPaiements && (
          <section className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] p-5">
              <div>
                <h2 className="font-semibold">Paiements récents</h2>
                <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                  {(totalAnnee._sum.montant ?? 0).toLocaleString("fr-FR")} F versés depuis le 1er janvier
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
                <a href={"/api/personnel/" + employe.id + "/paiements/pdf"} target="_blank" className="whitespace-nowrap text-xs text-[var(--color-brand)] hover:underline">
                  Fiche des paiements (PDF)
                </a>
                <Link href="/paiements/nouveau" className="whitespace-nowrap text-xs text-[var(--color-brand)] hover:underline">
                  Enregistrer un paiement
                </Link>
              </div>
            </div>
            {employe.paiements.length === 0 ? (
              <p className="p-6 text-center text-sm text-[var(--color-ink-muted)]">Aucun paiement enregistré.</p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {employe.paiements.map((p) => (
                  <li key={p.id}>
                    <Link href={"/paiements/" + p.id} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-neutral-50">
                      <span className="min-w-0 flex-1">
                        <span className="font-medium">{TYPES_PAIEMENT[p.type] ?? p.type}</span>
                        <span className="text-[var(--color-ink-muted)]">, {p.periode}</span>
                        <span className="block text-xs text-[var(--color-ink-muted)]">
                          {p.datePaiement.toLocaleDateString("fr-FR")}
                        </span>
                      </span>
                      <span className={"font-semibold tnum " + (p.statut === "ANNULE" ? "text-[var(--color-ink-faint)] line-through" : "")}>
                        {p.montant.toLocaleString("fr-FR")} F
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          )}
        </div>

        {/* Gestion (droits personnel.manage) */}
        {peutGerer && (
          <aside className="space-y-5 lg:sticky lg:top-6">
            <EditerEmploye
              estMoiMeme={estMoiMeme}
              employe={{
                id: employe.id,
                nom: employe.nom,
                prenom: employe.prenom,
                telephone: employe.telephone ?? "",
                poste: employe.poste,
                posteLibre: employe.posteLibre ?? "",
                salaireReference: employe.salaireReference,
                typeRemuneration: employe.typeRemuneration ?? "",
                actif: employe.actif,
              }}
            />
            <GererCompte employeId={employe.id} user={compte} estMoiMeme={estMoiMeme} />
          </aside>
        )}
      </div>
    </div>
  );
}

function Info({ label, value, href, discret }: { label: string; value: string; href?: string; discret?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-[var(--color-ink-muted)]">{label}</dt>
      {href ? (
        <dd className="mt-0.5">
          <a href={href} className="break-all font-medium text-[var(--color-brand)] hover:underline">
            {value}
          </a>
        </dd>
      ) : (
        <dd className={"mt-0.5 break-words font-medium " + (discret ? "text-[var(--color-ink-muted)]" : "")}>{value}</dd>
      )}
    </div>
  );
}
