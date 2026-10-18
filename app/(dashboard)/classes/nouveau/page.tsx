import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { ClasseForm } from "./ClasseForm";

export default async function NouvelleClassePage() {
  const user = await requirePermission("classe.manage");

  const [annees, enseignants] = await Promise.all([
    prisma.anneeScolaire.findMany({
      where: { etablissementId: user.etablissementId },
      orderBy: { libelle: "desc" },
    }),
    // Enseignants = Employes avec poste "Enseignant" et actifs
    prisma.employe.findMany({
      where: {
        etablissementId: user.etablissementId,
        poste: "Enseignant",
        actif: true,
      },
      select: { id: true, nom: true, prenom: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    }),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/classes" className="text-xs text-[var(--color-ink-muted)] hover:underline">
        ← Retour aux classes
      </Link>
      <div>
        <h1 className="text-2xl font-semibold mt-1">Nouvelle classe</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-1">
          Définissez les frais et la capacité : ils s'appliqueront automatiquement aux élèves inscrits.
        </p>
      </div>
      <ClasseForm
        annees={annees.map((a) => ({ id: a.id, label: a.libelle }))}
        enseignants={enseignants.map((e) => ({ id: e.id, label: e.nom + " " + e.prenom }))}
      />
    </div>
  );
}