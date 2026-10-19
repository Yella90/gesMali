import Link from "next/link";
import { notFound } from "next/navigation";
import { compteConnecte } from "@/lib/auth/session";
import { anneeParDefaut } from "@/lib/plateforme/creation";
import { FormulaireNouvelleEcole } from "./FormulaireNouvelleEcole";

export default async function NouvelleEcolePage() {
  if (!(await compteConnecte())?.administrateurPlateforme) notFound();
  const annee = anneeParDefaut();
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <Link href="/plateforme" className="text-xs text-[var(--color-ink-muted)] hover:underline">
          ← Écoles
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Nouvelle école</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          L&apos;école est créée avec son année scolaire, ses trimestres, ses matières et le compte de son directeur.
        </p>
      </div>
      <FormulaireNouvelleEcole defauts={{ anneeDebut: annee.debut, anneeFin: annee.fin }} />
    </div>
  );
}
