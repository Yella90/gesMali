import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { ActionsTrimestre } from "./ActionsTrimestre";
import { ModifierTrimestre } from "./ModifierTrimestre";

export default async function TrimestreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("trimestre.read");

  const trimestre = await prisma.trimestre.findUnique({
    where: { id },
    include: {
      anneeScolaire: true,
      _count: { select: { notes: true, bulletins: true } },
    },
  });

  if (!trimestre || trimestre.anneeScolaire.etablissementId !== user.etablissementId) {
    notFound();
  }

  const peutGerer = user.roles.includes("DIRECTEUR");
  const now = new Date();
  const debut = new Date(trimestre.dateDebut);
  const fin = trimestre.dateFin ? new Date(trimestre.dateFin) : null;
  const enCours = now >= debut && (!fin || now <= fin);
  const aVenir = now < debut;
  const termine = fin && now > fin;

  function fmtDate(d: Date | string) {
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  }

  const dureeJours = fin
    ? Math.ceil((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-5 max-w-4xl">
      <Link href="/trimestres" className="text-xs text-[var(--color-ink-muted)] hover:underline">
        ← Retour aux trimestres
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold mt-1">{trimestre.nom}</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">
            Année {trimestre.anneeScolaire.libelle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {aVenir && (
            <span className="inline-flex px-3 py-1 rounded-md text-xs bg-neutral-100 text-neutral-600">
              À venir
            </span>
          )}
          {enCours && !trimestre.cloture && (
            <span className="inline-flex px-3 py-1 rounded-md text-xs bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              En cours
            </span>
          )}
          {termine && !trimestre.cloture && (
            <span className="inline-flex px-3 py-1 rounded-md text-xs bg-amber-50 text-amber-800">
              Terminé non cloturé
            </span>
          )}
          {trimestre.cloture && (
            <span className="inline-flex px-3 py-1 rounded-md text-xs bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
              Cloturé
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Stat label="Début" value={fmtDate(trimestre.dateDebut)} accent="brand" />
        <Stat label="Fin" value={trimestre.dateFin ? fmtDate(trimestre.dateFin) : "Non définie"} />
        <Stat label="Notes saisies" value={String(trimestre._count.notes)} accent="accent" />
        <Stat label="Bulletins" value={String(trimestre._count.bulletins)} />
      </div>

      {peutGerer && !trimestre.cloture && (
        <ModifierTrimestre
          trimestre={{
            id: trimestre.id,
            nom: trimestre.nom,
            ordre: trimestre.ordre,
            dateDebut: trimestre.dateDebut.toISOString().slice(0, 10),
            dateFin: trimestre.dateFin ? trimestre.dateFin.toISOString().slice(0, 10) : "",
          }}
        />
      )}

      {peutGerer && (
        <ActionsTrimestre
          trimestreId={trimestre.id}
          cloture={trimestre.cloture}
          nbNotes={trimestre._count.notes}
          nbBulletins={trimestre._count.bulletins}
        />
      )}

      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <h2 className="font-semibold mb-3">Résumé</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-[var(--color-border)]">
            <span className="text-[var(--color-ink-muted)]">Numéro</span>
            <span className="font-medium tnum">{trimestre.ordre}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[var(--color-border)]">
            <span className="text-[var(--color-ink-muted)]">Durée</span>
            <span className="font-medium tnum">
              {dureeJours != null ? dureeJours + " jours" : "—"}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-[var(--color-border)]">
            <span className="text-[var(--color-ink-muted)]">Statut</span>
            <span className="font-medium">
              {trimestre.cloture ? "Cloturé" : "Ouvert"}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-[var(--color-ink-muted)]">Année scolaire</span>
            <Link href="/trimestres" className="font-medium text-[var(--color-brand)] hover:underline">
              {trimestre.anneeScolaire.libelle}
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href={"/notes?trimestreId=" + trimestre.id}
          className="inline-flex items-center h-10 px-4 rounded-lg bg-[var(--color-brand)] text-white text-sm font-medium hover:bg-[var(--color-brand-dark)]"
        >
          Saisir des notes
        </Link>
        <Link
          href="/bulletins"
          className="inline-flex items-center h-10 px-4 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm hover:bg-neutral-50"
        >
          Gérer les bulletins
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "brand" | "accent" }) {
  const bg =
    accent === "accent" ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
    : "bg-[var(--color-brand-soft)] text-[var(--color-brand)]";
  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
      <span className={"inline-block px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wide " + bg}>
        {label}
      </span>
      <p className="text-base md:text-lg font-semibold mt-2 tnum">{value}</p>
    </div>
  );
}