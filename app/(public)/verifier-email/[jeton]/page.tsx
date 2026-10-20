import { lireJeton } from "@/lib/email/jetons";
import { LienPublic, PagePublique } from "@/components/plateforme/PagePublique";
import { BoutonLien } from "@/components/plateforme/BoutonLien";
import { confirmerAdresse } from "../actions";

export const metadata = { title: "Confirmer mon adresse · GES Mali", robots: { index: false } };

export default async function VerifierEmailPage({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const lien = await lireJeton("VERIFICATION", jeton);

  if (!lien) {
    return (
      <PagePublique titre="Lien expiré">
        <p>Ce lien n&apos;est plus valable : il a déjà servi, ou il date de plus de 48 heures.</p>
        <p>
          Demandez-en un nouveau depuis <LienPublic href="/compte">Mon compte</LienPublic>.
        </p>
      </PagePublique>
    );
  }

  return (
    <PagePublique titre="Confirmer mon adresse">
      <p>
        Confirmez que l&apos;adresse <strong>{lien.email}</strong> est bien la vôtre.
      </p>
      <BoutonLien
        action={confirmerAdresse}
        jeton={jeton}
        libelle="Confirmer mon adresse"
        enCours="Confirmation…"
        succes={
          <div role="status" className="space-y-3 rounded-xl bg-[var(--color-surface)] p-4">
            <p className="font-semibold">Adresse confirmée.</p>
            <p>D&apos;autres écoles peuvent désormais vous donner accès à leur espace avec ce compte.</p>
            <p>
              <LienPublic href="/compte">Aller à mon compte</LienPublic>
            </p>
          </div>
        }
      />
    </PagePublique>
  );
}

export const dynamic = "force-dynamic";
