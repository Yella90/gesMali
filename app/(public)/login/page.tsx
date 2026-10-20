import Link from "next/link";
import { redirect } from "next/navigation";
import { compteConnecte } from "@/lib/auth/session";
import { envoiDisponible } from "@/lib/email/file";
import { LiensLegaux } from "@/components/legal/PageLegale";
import { BoutonConnexion, FenetreConnexion } from "./Connexion";
import { Bogolan, Cycles, DocumentsDefilants, Fonctionnalites, Personnes, Scene } from "./vitrine/Vitrine";

// Messages de retour (?connexion=...) apres un parcours par e-mail
const MESSAGES: Record<string, string> = {
  "ecole-creee": "Votre école est créée et votre adresse confirmée : connectez-vous avec le mot de passe choisi à l'inscription.",
  "mot-de-passe": "Mot de passe modifié : connectez-vous avec le nouveau mot de passe.",
};

const boutonPrincipal =
  "inline-flex h-11 items-center justify-center rounded-lg bg-[#E2C17E] px-5 text-sm font-semibold text-[#152A47] hover:bg-[#EBCF95]";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ connexion?: string; callbackUrl?: string }>;
}) {
  // Arrivee depuis une page protegee (ou un lien d'e-mail) : le formulaire s'ouvre directement
  const { connexion, callbackUrl } = await searchParams;
  const ouverte = connexion !== undefined || callbackUrl !== undefined;
  // Retour vers la page demandee : chemin interne seulement
  const retour = callbackUrl && /^\/(?!\/)/.test(callbackUrl) && !callbackUrl.startsWith("/login") ? callbackUrl : "/dashboard";

  // Compte connecte et toujours valable (une session dont le compte a ete supprime ou
  // desactive ne doit pas renvoyer vers le tableau de bord, qui renverrait ici) : page demandee
  if (await compteConnecte()) redirect(retour);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-brand)] text-white">
      <Bogolan />

      <div className="relative mx-auto max-w-6xl px-6 sm:px-10">
        <header className="flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 font-serif text-lg font-semibold text-[#E2C17E]">
              G
            </div>
            <span className="text-lg font-semibold">GES Mali</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/inscription" className="hidden h-10 items-center rounded-lg px-3 text-sm font-medium text-white/85 hover:bg-white/10 sm:inline-flex">
              Créer mon école
            </Link>
            <BoutonConnexion className="inline-flex h-10 items-center rounded-lg border border-white/25 px-4 text-sm font-medium hover:bg-white/10" />
          </div>
        </header>

        <main>
          <div className="grid grid-cols-1 items-center gap-10 pb-6 pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14 lg:pt-16">
            {/* min-w-0 : la bande de documents defilante ne doit pas elargir la colonne */}
            <div className="min-w-0">
              <h1 className="max-w-[21ch] font-serif text-[34px] font-semibold leading-[1.08] tracking-[-0.01em] sm:text-[48px]">
                Toute la vie de l&apos;école, de l&apos;inscription au bulletin.
              </h1>
              <p className="mt-5 max-w-[56ch] text-[15px] leading-relaxed text-white/75">
                Inscriptions, notes et bulletins, présences, frais de scolarité, trésorerie, emploi du temps et personnel :
                la direction, le secrétariat, les enseignants et les parents travaillent sur les mêmes informations.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <BoutonConnexion className={boutonPrincipal} />
                <Link
                  href="/inscription"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-white/30 px-5 text-sm font-semibold hover:bg-white/10"
                >
                  Créer mon école · 30 jours d&apos;essai
                </Link>
              </div>

              <div className="mt-10 md:hidden">
                <Personnes />
                <DocumentsDefilants className="mt-6" />
              </div>
            </div>

            <Scene className="hidden md:block" />
          </div>

          <div className="grid grid-cols-1 gap-12 border-t border-white/10 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
            <Cycles />
            <Fonctionnalites />
          </div>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-6 text-xs text-white/50">
          <p>© {new Date().getFullYear()} GES Mali</p>
          <LiensLegaux className="text-white/60" />
        </footer>
      </div>

      <FenetreConnexion
        ouverte={ouverte}
        retour={retour}
        message={connexion && Object.hasOwn(MESSAGES, connexion) ? MESSAGES[connexion] : undefined}
        motDePasseOublie={envoiDisponible()}
      />
    </div>
  );
}
