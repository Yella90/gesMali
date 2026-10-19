"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ retour = "/dashboard" }: { retour?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      const res = await signIn("credentials", { email: email.trim(), password, redirect: false });
      if (!res || res.error) {
        setErreur("Identifiants incorrects, compte inactif ou trop de tentatives (réessayez dans 15 minutes).");
        setChargement(false);
        return;
      }
      // Le bouton reste en chargement jusqu'a l'arrivee sur le tableau de bord
      router.push(retour);
      router.refresh();
    } catch {
      setErreur("Connexion impossible pour le moment. Vérifiez votre connexion internet et réessayez.");
      setChargement(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="email">Adresse e-mail</Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="nom@ecole.ml"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Mot de passe</Label>
        <div className="relative">
          <Input
            id="password"
            type={visible ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            aria-pressed={visible}
            className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
          >
            {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>

      {erreur && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {erreur}
        </div>
      )}

      <Button type="submit" className="w-full h-11" disabled={chargement}>
        {chargement ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Connexion…
          </>
        ) : (
          "Se connecter"
        )}
      </Button>
    </form>
  );
}
