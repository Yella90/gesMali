import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./LoginForm";
import { LiensLegaux } from "@/components/legal/PageLegale";
import { Bogolan, Cycles, DocumentsDefilants, Fonctionnalites, Personnes, Scene } from "./vitrine/Vitrine";

function Logo({ clair = false }: { clair?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={
          "flex h-10 w-10 items-center justify-center rounded-xl font-serif text-lg font-semibold " +
          (clair ? "bg-white/10 text-[#E2C17E]" : "bg-[var(--color-brand)] text-white")
        }
      >
        G
      </div>
      <span className="text-lg font-semibold">GES Mali</span>
    </div>
  );
}

export default async function LoginPage() {
  let session = null;
  try { session = await auth(); } catch { session = null; }
  if (session?.user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[var(--color-surface)] lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      {/* Connexion : en premier sur mobile, fixe a droite sur grand ecran */}
      <section className="flex items-center justify-center px-6 py-12 lg:sticky lg:top-0 lg:order-2 lg:h-screen">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>

          <h1 className="font-serif text-[28px] font-semibold leading-tight text-[var(--color-ink)]">Connexion</h1>
          <p className="mb-8 mt-1.5 text-sm text-[var(--color-ink-muted)]">
            Utilisez l&apos;adresse e-mail fournie par votre établissement.
          </p>

          <LoginForm />

          <p className="mt-6 text-xs text-[var(--color-ink-muted)]">
            En vous connectant, vous acceptez les conditions d&apos;utilisation et la politique de confidentialité.
          </p>
          <LiensLegaux className="mt-2 text-[var(--color-ink-muted)]" />
        </div>
      </section>

      {/* Vitrine : ce que GES Mali gere */}
      <section className="relative overflow-hidden bg-[var(--color-brand)] text-white lg:order-1">
        <Bogolan />
        <div className="relative mx-auto max-w-[760px] px-6 py-12 sm:px-10 lg:px-14 lg:py-12">
          <div className="hidden lg:block">
            <Logo clair />
          </div>

          <h2 className="max-w-[21ch] font-serif text-[34px] font-semibold leading-[1.08] tracking-[-0.01em] sm:text-[44px] lg:mt-14">
            Toute la vie de l&apos;école, de l&apos;inscription au bulletin.
          </h2>
          <p className="mt-5 max-w-[58ch] text-[15px] leading-relaxed text-white/75">
            Inscriptions, notes, bulletins, frais de scolarité, emploi du temps et personnel : la direction, le
            secrétariat, les enseignants et les parents travaillent sur les mêmes informations.
          </p>

          <div className="mt-8 md:hidden">
            <Personnes />
            <DocumentsDefilants className="mt-6" />
          </div>
          <Scene className="mt-12 hidden md:block" />

          <div className="mt-14 space-y-12">
            <Cycles />
            <Fonctionnalites />
          </div>

          <p className="mt-14 text-xs text-white/45">© {new Date().getFullYear()} GES Mali</p>
        </div>
      </section>
    </div>
  );
}
