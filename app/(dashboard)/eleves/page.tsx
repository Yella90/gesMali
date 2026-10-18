import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { ListeEleves } from "./ListeEleves";

export default async function ElevesPage() {
  const user = await requirePermission("eleve.read");

  // Charge TOUS les eleves une seule fois
  const [eleves, classes] = await Promise.all([
    prisma.eleve.findMany({
      where: {
        etablissementId: user.etablissementId,
        statut: { not: "RADIE" },
      },
      include: {
        classe: { select: { nom: true, niveau: true, section: true } },
      },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    }),
    prisma.classe.findMany({
      where: { etablissementId: user.etablissementId },
      orderBy: [{ niveau: "asc" }, { section: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Élèves</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">
            {eleves.length} élève(s) inscrit(s)
          </p>
        </div>
        <Link
          href="/eleves/nouveau"
          className="inline-flex items-center h-10 px-4 rounded-lg bg-[var(--color-brand)] text-white text-sm font-medium hover:bg-[var(--color-brand-dark)]"
        >
          + Nouvel élève
        </Link>
      </div>

      <ListeEleves
        eleves={eleves.map((e) => ({
          id: e.id,
          matricule: e.matricule,
          nom: e.nom,
          prenom: e.prenom,
          sexe: e.sexe,
          statut: e.statut,
          classe: e.classe
            ? { nom: e.classe.nom, niveau: e.classe.niveau, section: e.classe.section }
            : null,
        }))}
        classes={classes.map((c) => ({
          id: c.id,
          label: c.nom || (c.niveau + (c.section ? " " + c.section : "")),
        }))}
      />
    </div>
  );
}