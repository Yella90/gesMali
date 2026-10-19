"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { modifierEtablissement as modifierEtablissementAction } from "../actions";
import { relever } from "@/lib/actions/resultat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const modifierEtablissement = relever(modifierEtablissementAction);

export function EtablissementForm({
  etablissement,
}: {
  etablissement: { nom: string; type: string; adresse: string; telephone: string; email: string };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    try {
      await modifierEtablissement(fd);
      setMessage("Informations enregistrées.");
      router.refresh();
    } catch (e: any) {
      setErreur(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-xl border border-[var(--color-border)] p-5 md:p-6 space-y-4">
      <h2 className="font-medium">Informations de l'établissement</h2>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="nom">Nom de l'établissement</Label>
          <Input id="nom" name="nom" defaultValue={etablissement.nom} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="type">Type</Label>
          <select
            id="type" name="type" defaultValue={etablissement.type} required
            className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
          >
            <option value="PRIVE">Privé</option>
            <option value="PUBLIC">Public</option>
            <option value="COMMUNAUTAIRE">Communautaire</option>
            <option value="MEDERSA">Medersa</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="adresse">Adresse</Label>
        <Input id="adresse" name="adresse" defaultValue={etablissement.adresse} placeholder="Bamako, Mali" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="telephone">Téléphone</Label>
          <Input id="telephone" name="telephone" type="tel" defaultValue={etablissement.telephone} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={etablissement.email} />
        </div>
      </div>

      {erreur && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erreur}</div>
      )}
      {message && (
        <div className="rounded-lg border border-[var(--color-accent-soft)] bg-[var(--color-accent-soft)] px-3 py-2 text-sm text-[var(--color-accent)]">{message}</div>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  );
}