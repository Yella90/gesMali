import { lireJeton } from "@/lib/email/jetons";
import { ecoleDuJeton } from "@/lib/email/parcours";
import { LienPublic, PagePublique } from "@/components/plateforme/PagePublique";
import { BoutonLien } from "@/components/plateforme/BoutonLien";
import { confirmerInscription } from "../../actions";

export const metadata = { title: "Confirmer l'inscription · GES Mali", robots: { index: false } };

export default async function ConfirmerInscriptionPage({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const lien = await lireJeton("INSCRIPTION", jeton);
  const ecole = lien ? ecoleDuJeton(lien.donnees) : null;

  if (!lien || !ecole) {
    return (
      <PagePublique titre="Lien expiré">
        <p>Ce lien d&apos;inscription n&apos;est plus valable : il a déjà servi, ou il date de plus de 48 heures.</p>
        <p>
          Votre école a peut-être déjà été créée : <LienPublic href="/login?connexion">connectez-vous</LienPublic>. Sinon,{" "}
          <LienPublic href="/inscription">recommencez l&apos;inscription</LienPublic>.
        </p>
      </PagePublique>
    );
  }

  return (
    <PagePublique titre="Créer mon école">
      <p>
        Dernière étape pour l&apos;adresse <strong>{lien.email}</strong> : créer l&apos;école <strong>« {ecole.nom} »</strong>, en
        période d&apos;essai.
      </p>
      <BoutonLien action={confirmerInscription} jeton={jeton} libelle="Créer mon école" enCours="Création de l'école…" />
      <p className="text-xs text-[var(--color-ink-muted)]">
        Vous vous connecterez ensuite avec cette adresse et le mot de passe choisi lors de l&apos;inscription.
      </p>
    </PagePublique>
  );
}

export const dynamic = "force-dynamic";
