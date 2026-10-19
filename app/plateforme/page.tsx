import Link from "next/link";
import { notFound } from "next/navigation";
import { compteConnecte } from "@/lib/auth/session";
import { listeEcoles } from "@/lib/plateforme/admin";
import { ActionsEcole } from "./ActionsEcole";

const TYPES: Record<string, string> = { PRIVE: "Privée", PUBLIC: "Publique", COMMUNAUTAIRE: "Communautaire", MEDERSA: "Medersa" };
const date = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR") : "—");

export default async function PlateformePage() {
  if (!(await compteConnecte())?.administrateurPlateforme) notFound();
  const ecoles = await listeEcoles();
  const enEssai = ecoles.filter((e) => e.statut === "ESSAI" && e.etat.ouverte).length;
  const fermees = ecoles.filter((e) => !e.etat.ouverte).length;
  const eleves = ecoles.reduce((t, e) => t + e.eleves, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Écoles de la plateforme</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Inscriptions, périodes d&apos;essai et suspensions.
          </p>
        </div>
        <Link
          href="/plateforme/nouvelle"
          className="inline-flex h-10 items-center rounded-lg bg-[var(--color-brand)] px-4 text-sm font-medium text-white hover:bg-[var(--color-brand-dark)]"
        >
          + Nouvelle école
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Écoles", ecoles.length],
          ["En essai", enEssai],
          ["Fermées (suspendues ou essai terminé)", fermees],
          ["Élèves inscrits", eleves],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-[var(--color-border)] bg-white p-4">
            <p className="text-xs text-[var(--color-ink-muted)]">{l}</p>
            <p className="mt-1 text-2xl font-semibold tnum">{v}</p>
          </div>
        ))}
      </div>

      {ecoles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--color-border-strong)] bg-white px-4 py-10 text-center text-sm text-[var(--color-ink-muted)]">
          Aucune école pour l&apos;instant.
        </p>
      ) : (
        <ul className="space-y-3">
          {ecoles.map((e) => (
            <li key={e.id} className="rounded-xl border border-[var(--color-border)] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{e.nom}</p>
                  <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                    {TYPES[e.type] ?? e.type}
                    {e.adresse ? " · " + e.adresse : ""}
                    {e.telephone ? " · " + e.telephone : ""}
                  </p>
                </div>
                <span
                  className={
                    "rounded-md px-2.5 py-1 text-xs font-medium " +
                    (!e.etat.ouverte
                      ? "bg-red-50 text-red-700"
                      : e.statut === "ESSAI"
                        ? "bg-amber-50 text-amber-800"
                        : "bg-[var(--color-accent-soft)] text-[var(--color-accent)]")
                  }
                >
                  {e.etat.libelle}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                <div><dt className="text-[var(--color-ink-muted)]">Créée le</dt><dd>{date(e.creeLe)}</dd></div>
                <div><dt className="text-[var(--color-ink-muted)]">Fin d&apos;essai</dt><dd>{e.statut === "ESSAI" ? date(e.finEssai) : "—"}</dd></div>
                <div><dt className="text-[var(--color-ink-muted)]">Élèves · classes · comptes</dt><dd className="tnum">{e.eleves} · {e.classes} · {e.comptes}</dd></div>
                <div><dt className="text-[var(--color-ink-muted)]">Dernière activité</dt><dd>{date(e.derniereActivite)}</dd></div>
              </dl>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[var(--color-ink-muted)]">Direction : {e.directeurs.join(", ") || "aucun compte"}</p>
                <ActionsEcole id={e.id} nom={e.nom} statut={e.statut} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
