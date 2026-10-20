import { envoiDisponible } from "@/lib/email/file";
import { LienPublic, PagePublique } from "@/components/plateforme/PagePublique";
import { DemandeLien } from "./DemandeLien";

export const metadata = { title: "Mot de passe oublié · GES Mali" };

export default function MotDePasseOubliePage() {
  return (
    <PagePublique titre="Mot de passe oublié">
      {envoiDisponible() ? (
        <>
          <p>Indiquez l&apos;adresse e-mail de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
          <DemandeLien />
        </>
      ) : (
        <p>
          La direction de votre établissement peut réinitialiser votre mot de passe depuis votre fiche du personnel.
        </p>
      )}
      <p>
        <LienPublic href="/login?connexion">Retour à la connexion</LienPublic>
      </p>
    </PagePublique>
  );
}

export const dynamic = "force-dynamic";
