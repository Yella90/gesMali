import Link from "next/link";
import { ecole } from "@/lib/data/ecole";
import { requirePermission } from "@/lib/auth/session";
import { EleveForm } from "./EleveForm";

export default async function NouvelElevePage() {
  const user = await requirePermission("eleve.create");
  const db = ecole(user);

  const classes = await db.classe.findMany({
    // Uniquement l'annee scolaire en cours : on n'inscrit pas dans une annee archivee
    where: { etablissementId: user.etablissementId, anneeScolaire: { active: true } },
    include: { _count: { select: { eleves: { where: { statut: "INSCRIT" } } } } },
    orderBy: [{ niveau: "asc" }, { section: "asc" }],
  });

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/eleves" className="text-xs text-[var(--color-ink-muted)] hover:underline">
        ← Retour aux élèves
      </Link>
      <div>
        <h1 className="text-2xl font-semibold mt-1">Nouvel élève</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-1">
          Inscription et génération automatique des frais.
        </p>
      </div>
      <EleveForm
        classes={classes.map((c) => ({
          id: c.id,
          label: c.nom || (c.niveau + (c.section ? " " + c.section : "")),
          effectif: c._count.eleves,
          capacite: c.capaciteMax,
          fraisInscription: c.fraisInscription,
          fraisMensuel: c.fraisScolariteMensuel,
        }))}
      />
    </div>
  );
}