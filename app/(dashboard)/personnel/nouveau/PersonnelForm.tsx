"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creerEmploye as creerEmployeAction } from "../actions";
import { relever } from "@/lib/actions/resultat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const creerEmploye = relever(creerEmployeAction);

const POSTES = [
  "Enseignant",
  "Directeur",
  "Secretaire",
  "Comptable",
  "Surveillant",
  "Gardien",
  "Autre",
];

export function PersonnelForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [poste, setPoste] = useState("Enseignant");
  const [creerCompte, setCreerCompte] = useState(false);
  const [motDePasse, setMotDePasse] = useState("");

  function generer() {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let pwd = "";
    for (let i = 0; i < 10; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    setMotDePasse(pwd);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await creerEmploye(fd);
      router.push("/personnel/" + res.id);
    } catch (e: any) {
      setErreur(e.message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Section 1 : Identite */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[var(--color-brand)] text-white text-xs flex items-center justify-center font-medium">1</span>
          <h2 className="font-medium">Identité</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" name="nom" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prenom">Prénom</Label>
            <Input id="prenom" name="prenom" required />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="telephone">Téléphone</Label>
          <Input id="telephone" name="telephone" type="tel" placeholder="+223 00 00 00 00" />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="poste">Poste</Label>
            <select
              id="poste" name="poste" required
              value={poste}
              onChange={(e) => setPoste(e.target.value)}
              className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
            >
              {POSTES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {poste === "Autre" && (
            <div className="space-y-1.5">
              <Label htmlFor="posteLibre">Précisez le poste</Label>
              <Input id="posteLibre" name="posteLibre" required placeholder="Ex : Cuisinier" />
            </div>
          )}
        </div>
      </div>

      {/* Section 2 : Remuneration (optionnel) */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[var(--color-brand)] text-white text-xs flex items-center justify-center font-medium">2</span>
          <h2 className="font-medium">Rémunération (optionnel)</h2>
        </div>
        <p className="text-xs text-[var(--color-ink-muted)]">
          Ces informations ne sont pas obligatoires. Elles servent uniquement de référence pour pré-remplir les paiements.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="salaireReference">Salaire / taux de référence (F CFA)</Label>
            <Input id="salaireReference" name="salaireReference" type="number" min={0} step={500} className="tnum" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="typeRemuneration">Type de rémunération</Label>
            <select
              id="typeRemuneration" name="typeRemuneration"
              className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
            >
              <option value="">-- Non précisé --</option>
              <option value="MENSUEL">Mensuel</option>
              <option value="HORAIRE">Horaire</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 3 : Compte de connexion (optionnel) */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[var(--color-brand)] text-white text-xs flex items-center justify-center font-medium">3</span>
          <h2 className="font-medium">Compte de connexion</h2>
        </div>

        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-border-strong)] has-[:checked]:border-[var(--color-brand)] has-[:checked]:bg-[var(--color-brand-soft)]">
          <input
            type="checkbox"
            name="creerCompte"
            checked={creerCompte}
            onChange={(e) => setCreerCompte(e.target.checked)}
            className="mt-0.5 w-4 h-4"
          />
          <div>
            <p className="text-sm font-medium">Créer un compte pour cet employé</p>
            <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
              Nécessaire uniquement si la personne utilise l'application (directeur, secrétaire, comptable, enseignants qui saisissent).
            </p>
          </div>
        </label>

        {creerCompte && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="email">Adresse e-mail</Label>
              <Input id="email" name="email" type="email" required placeholder="employe@ecole.ml" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role">Rôle dans l'application</Label>
              <select
                id="role" name="role" required
                className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
              >
                <option value="ENSEIGNANT">Enseignant</option>
                <option value="SECRETAIRE">Secrétaire</option>
                <option value="COMPTABLE">Comptable</option>
                <option value="DIRECTEUR">Directeur</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="motDePasse">Mot de passe</Label>
              <div className="flex gap-2">
                <Input
                  id="motDePasse"
                  name="motDePasse"
                  type="text"
                  minLength={6}
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  className="flex-1 font-mono"
                />
                <button
                  type="button"
                  onClick={generer}
                  className="h-10 px-4 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm hover:bg-neutral-50 whitespace-nowrap"
                >
                  Générer
                </button>
              </div>
              <p className="text-xs text-[var(--color-ink-muted)]">6 caractères minimum. Si cette adresse a déjà un compte GES Mali dans une autre école, laissez le mot de passe vide : la personne recevra l'accès à votre école avec son mot de passe habituel.</p>
            </div>
          </>
        )}
      </div>

      {erreur && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erreur}</div>
      )}

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "Création..." : "Créer l'employé"}
        </Button>
        <button
          type="button"
          onClick={() => router.back()}
          className="h-11 px-5 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm hover:bg-neutral-50"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}