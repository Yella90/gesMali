import { lireJeton } from "@/lib/email/jetons";
import { LienPublic, PagePublique } from "@/components/plateforme/PagePublique";
import { NouveauMotDePasse } from "./NouveauMotDePasse";

export const metadata = { title: "Nouveau mot de passe · GES Mali", robots: { index: false } };

export default async function NouveauMotDePassePage({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const lien = await lireJeton("REINITIALISATION", jeton);

  if (!lien) {
    return (
      <PagePublique titre="Lien expiré">
        <p>Ce lien n&apos;est plus valable : il a déjà servi, ou il date de plus d&apos;une heure.</p>
        <p>
          <LienPublic href="/mot-de-passe/oublie">Demander un nouveau lien</LienPublic>
        </p>
      </PagePublique>
    );
  }

  return (
    <PagePublique titre="Nouveau mot de passe">
      <p>
        Choisissez le nouveau mot de passe du compte <strong>{lien.email}</strong>. Il vaut pour toutes vos écoles ; les
        sessions ouvertes ailleurs seront fermées.
      </p>
      <NouveauMotDePasse jeton={jeton} email={lien.email} />
    </PagePublique>
  );
}

export const dynamic = "force-dynamic";
