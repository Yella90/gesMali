"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creerEleve } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ClasseOption = {
  id: string;
  label: string;
  effectif: number;
  capacite: number;
  fraisInscription: number;
  fraisMensuel: number;
};

export function EleveForm({ classes }: { classes: ClasseOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [classeId, setClasseId] = useState("");
  const [fraisInscriptionPaye, setFraisInscriptionPaye] = useState(false);
  const [exonereInscription, setExonereInscription] = useState(false);

  const classeSelectionnee = classes.find((c) => c.id === classeId);
  const plein = classeSelectionnee ? classeSelectionnee.effectif >= classeSelectionnee.capacite : false;
  const aFraisInscription = classeSelectionnee ? classeSelectionnee.fraisInscription > 0 : false;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await creerEleve(fd);
      if (res.paiementInscriptionId) {
        window.open("/api/frais/recu/" + res.paiementInscriptionId + "/pdf", "_blank");
      }
      router.push("/eleves/" + res.id + "?inscrit=1");
    } catch (err: any) {
      setErreur(err.message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Eleve */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 md:p-6 space-y-4">
        <h2 className="font-medium">élève</h2>
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
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="dateNaissance">Date de naissance</Label>
            <Input id="dateNaissance" name="dateNaissance" type="date" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sexe">Sexe</Label>
            <select id="sexe" name="sexe" required className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm">
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>
          </div>
        </div>
      </div>

      {/* Parent */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 md:p-6 space-y-4">
        <h2 className="font-medium">Parent / Tuteur</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="tuteurNom">Nom du parent / tuteur</Label>
            <Input id="tuteurNom" name="tuteurNom" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tuteurTelephone">Téléphone</Label>
            <Input id="tuteurTelephone" name="tuteurTelephone" type="tel" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="emailParent">Adresse e-mail du parent</Label>
          <Input id="emailParent" name="emailParent" type="email" placeholder="parent@exemple.com" />
        </div>
      </div>

      {/* Classe */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 md:p-6 space-y-4">
        <h2 className="font-medium">Classe</h2>

        <div className="space-y-1.5">
          <Label htmlFor="classeId">Classe d'inscription</Label>
          <select
            id="classeId" name="classeId"
            value={classeId}
            onChange={(e) => { setClasseId(e.target.value); setFraisInscriptionPaye(false); setExonereInscription(false); }}
            required
            className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
          >
            <option value="">-- Choisir --</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id} disabled={c.effectif >= c.capacite}>
                {c.label} ({c.effectif}/{c.capacite}){c.effectif >= c.capacite ? " - PLEIN" : ""}
              </option>
            ))}
          </select>
        </div>

        {plein && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            Cette classe est pleine. Choisissez-en une autre.
          </div>
        )}

        {classeSelectionnee && !plein && (
          <>
            <div className="rounded-lg bg-[var(--color-surface)] p-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
                Frais de la classe {classeSelectionnee.label}
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-[var(--color-ink-muted)]">Frais d'inscription</p>
                  <p className="font-semibold tnum mt-0.5">
                    {classeSelectionnee.fraisInscription.toLocaleString("fr-FR")} F
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-ink-muted)]">Scolarité mensuelle</p>
                  <p className="font-semibold tnum mt-0.5">
                    {classeSelectionnee.fraisMensuel.toLocaleString("fr-FR")} F
                  </p>
                </div>
              </div>
              <p className="text-xs text-[var(--color-ink-muted)] pt-2 border-t border-[var(--color-border)]">
                Les échéances mensuelles seront générées automatiquement selon la durée de l'année scolaire.
              </p>
            </div>

            {aFraisInscription && (
              <label htmlFor="exonereInscription" className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] p-4 cursor-pointer">
                <input
                  type="checkbox"
                  id="exonereInscription"
                  name="exonereInscription"
                  checked={exonereInscription}
                  onChange={(e) => { setExonereInscription(e.target.checked); if (e.target.checked) setFraisInscriptionPaye(false); }}
                  className="w-4 h-4 mt-0.5 rounded border-[var(--color-border-strong)]"
                />
                <span className="text-sm flex-1">
                  <span className="font-medium">Inscrire sans frais d&apos;inscription</span>
                  <span className="block text-xs text-[var(--color-ink-muted)] mt-0.5">
                    L&apos;élève est exonéré des {classeSelectionnee.fraisInscription.toLocaleString("fr-FR")} F d&apos;inscription. Seule la scolarité mensuelle sera due.
                  </span>
                </span>
              </label>
            )}

            {aFraisInscription && !exonereInscription && (
              <div className="rounded-lg border border-[var(--color-brand-soft)] bg-[var(--color-brand-soft)]/40 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="fraisInscriptionPaye"
                    name="fraisInscriptionPaye"
                    checked={fraisInscriptionPaye}
                    onChange={(e) => setFraisInscriptionPaye(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-[var(--color-border-strong)]"
                  />
                  <label htmlFor="fraisInscriptionPaye" className="text-sm cursor-pointer flex-1">
                    <span className="font-medium">
                      Les frais d'inscription ont été payés ({classeSelectionnee.fraisInscription.toLocaleString("fr-FR")} F)
                    </span>
                    <span className="block text-xs text-[var(--color-ink-muted)] mt-0.5">
                      Un reçu sera généré automatiquement après l'inscription.
                    </span>
                  </label>
                </div>

                {fraisInscriptionPaye && (
                  <div className="grid md:grid-cols-2 gap-3 pt-3 border-t border-[var(--color-border)]">
                    <div className="space-y-1.5">
                      <Label htmlFor="modePaiementInscription">Mode de paiement</Label>
                      <select
                        id="modePaiementInscription"
                        name="modePaiementInscription"
                        defaultValue="ESPECES"
                        className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
                      >
                        <option value="ESPECES">Espéces</option>
                        <option value="VIREMENT">Virement</option>
                        <option value="MOBILE_MONEY">Mobile Money</option>
                        <option value="CHEQUE">Chéque</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="referenceInscription">Référence (optionnel)</Label>
                      <Input id="referenceInscription" name="referenceInscription" placeholder="Ex : N bordereau" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {erreur && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erreur}</div>
      )}

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={loading || plein}>
          {loading ? "Inscription en cours..." : "Inscrire l'élève"}
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