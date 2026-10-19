import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { libCycle } from "@/lib/libelles";
import { filtreClasses } from "@/lib/data/guard";
import { anneeAffichee } from "@/lib/classes/annees";
import { ChoixAnnee } from "@/components/annees/ChoixAnnee";

export default async function BulletinsPage({ searchParams }: { searchParams: Promise<{ annee?: string }> }) {
  const user = await requirePermission("bulletin.read");
  const { annee: anneeId } = await searchParams;
  const { annees, annee } = await anneeAffichee(user.etablissementId, anneeId);

  // Une classe n'appartient qu'a une annee : seuls les trimestres de cette annee
  const [classes, trimestres] = annee
    ? await Promise.all([
        prisma.classe.findMany({
          where: { etablissementId: user.etablissementId, anneeScolaireId: annee.id, ...(await filtreClasses(user)) },
          orderBy: [{ niveau: "asc" }, { section: "asc" }],
        }),
        prisma.trimestre.findMany({
          where: { anneeScolaireId: annee.id },
          include: { anneeScolaire: { select: { libelle: true } } },
          orderBy: { ordre: "asc" },
        }),
      ])
    : [[], []];

  const bulletinsExistants = await prisma.bulletin.groupBy({
    by: ["classeId", "trimestreId"],
    where: { classeId: { in: classes.map((c) => c.id) } },
    _count: { _all: true },
  });
  const mapExistants = new Map<string, number>();
  for (const b of bulletinsExistants) {
    mapExistants.set(b.classeId + "-" + b.trimestreId, b._count._all);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Bulletins</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-1">
            Génération, classements et impressions des bulletins de notes.
          </p>
        </div>
        <Link
          href="/bulletins/generer"
          className="inline-flex items-center h-10 px-4 rounded-lg bg-[var(--color-brand)] text-white text-sm font-medium hover:bg-[var(--color-brand-dark)]"
        >
          + Générer
        </Link>
      </div>

      <ChoixAnnee annees={annees} annee={annee} base="/bulletins" />

      {trimestres.length === 0 || classes.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-[var(--color-border-strong)] py-16 text-center">
          <p className="text-sm text-[var(--color-ink-muted)]">
            {annee ? "Aucune classe ou aucun trimestre pour l'année " + annee.libelle + "." : "Créez d'abord une année scolaire, ses classes et ses trimestres."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map((c) => {
            const lib = c.nom || (c.niveau + (c.section ? " " + c.section : ""));
            return (
              <div key={c.id} className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
                <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{lib}</p>
                    <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{libCycle(c.cycle)}</p>
                  </div>
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                  {trimestres.map((t) => {
                    const nb = mapExistants.get(c.id + "-" + t.id) ?? 0;
                    return (
                      <div key={t.id} className="p-3 md:px-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {t.nom}{" "}
                            <span className="text-[var(--color-ink-muted)] font-normal">
                              · {t.anneeScolaire.libelle}
                            </span>
                          </p>
                          <p className="text-xs mt-0.5">
                            {nb > 0 ? (
                              <span className="text-[var(--color-accent)]">{nb} bulletin(s) généré(s)</span>
                            ) : (
                              <span className="text-[var(--color-ink-faint)]">Aucun bulletin</span>
                            )}
                          </p>
                        </div>
                        {nb > 0 && (
                          <Link
                            href={"/bulletins/classe/" + c.id + "/trimestre/" + t.id}
                            className="text-sm text-[var(--color-brand)] hover:underline whitespace-nowrap"
                          >
                            Voir le classement →
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}