import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  let session = null;
  try { session = await auth(); } catch { session = null; }
  if (session?.user) redirect("/dashboard");

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[var(--color-surface)]">
      {/* Cote marque (desktop uniquement) */}
      <div className="hidden lg:flex flex-col justify-between bg-[var(--color-brand)] text-white p-12">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center font-bold text-xl">G</div>
          <span className="text-lg font-semibold">GES Mali</span>
        </div>
        <div>
          <h1 className="text-3xl font-semibold leading-tight">
            La gestion scolaire,<br />
            <span className="text-[var(--color-gold)]">simple et fiable.</span>
          </h1>
          <p className="mt-4 text-white/70 text-sm max-w-sm">
            éléves, notes, bulletins, présences, frais de scolarité -
            tout au méme endroit.
          </p>
        </div>
        <p className="text-xs text-white/50">
          © {new Date().getFullYear()} GES Mali · Tous droits réservés
        </p>
      </div>

      {/* Formulaire */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-brand)] text-white flex items-center justify-center font-bold">G</div>
            <span className="text-lg font-semibold">GES Mali</span>
          </div>

          <h2 className="text-2xl font-semibold text-[var(--color-ink)]">Connexion</h2>
          <p className="text-sm text-[var(--color-ink-muted)] mt-1 mb-8">
            Entrez vos identifiants pour continuer.
          </p>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}