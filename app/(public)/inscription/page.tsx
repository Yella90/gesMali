import Link from "next/link";
import { compteConnecte } from "@/lib/auth/session";
import { anneeParDefaut } from "@/lib/plateforme/creation";
import { DUREE_ESSAI_JOURS } from "@/lib/plateforme/etat";
import { LiensLegaux } from "@/components/legal/PageLegale";
import { FormulaireInscription } from "./FormulaireInscription";

export const metadata = {
  title: "Créer mon école · GES Mali",
  description: "Inscrivez votre école sur GES Mali : " + DUREE_ESSAI_JOURS + " jours d'essai.",
};

export default async function InscriptionPage() {
  const compte = await compteConnecte();
  const annee = anneeParDefaut();
  const fiche = compte?.acces[0]?.employe;

  return (
    <div className="min-h-screen bg-[var(--color-brand)] text-white">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <header className="flex items-center justify-between gap-3">
          <Link href={compte ? "/ecoles" : "/login"} className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 font-serif text-lg font-semibold text-[#E2C17E]">
              G
            </span>
            <span className="text-lg font-semibold">GES Mali</span>
          </Link>
          {!compte && (
            <Link href="/login?connexion" className="text-sm text-white/80 hover:underline">
              Déjà inscrit ? Se connecter
            </Link>
          )}
        </header>

        <div className="mt-8 mb-6">
          <h1 className="font-serif text-3xl font-semibold sm:text-4xl">Créer mon école</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-white/75">
            {DUREE_ESSAI_JOURS} jours d&apos;essai, sans engagement. Votre école est prête à l&apos;emploi : année scolaire,
            trimestres et matières sont créés, il ne reste qu&apos;à ajouter vos classes, vos élèves et votre personnel.
            {compte && " L'école sera ajoutée à votre compte " + compte.email + "."}
          </p>
        </div>

        <FormulaireInscription
          connecte={!!compte}
          defauts={{
            anneeDebut: annee.debut,
            anneeFin: annee.fin,
            directeurNom: fiche?.nom,
            directeurPrenom: fiche?.prenom,
            directeurEmail: compte?.email,
          }}
        />

        <footer className="mt-8 text-xs text-white/60">
          <LiensLegaux className="text-white/60" />
        </footer>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
