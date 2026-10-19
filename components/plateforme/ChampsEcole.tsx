"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Champs communs a la creation d'une ecole (inscription en ligne, espace plateforme)
export type DefautsEcole = {
  anneeDebut: string;
  anneeFin: string;
  directeurNom?: string;
  directeurPrenom?: string;
  directeurEmail?: string;
};

const champSelect = "w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm";

const CYCLES = [
  { valeur: "PRESCOLAIRE", libelle: "Préscolaire (jardin)" },
  { valeur: "PREMIER_CYCLE", libelle: "Premier cycle (1re à 6e année)" },
  { valeur: "SECOND_CYCLE", libelle: "Second cycle (7e à 9e année)" },
];

export function ChampsEcole({ defauts, emailFixe = false }: { defauts: DefautsEcole; emailFixe?: boolean }) {
  return (
    <>
      <fieldset className="space-y-4">
        <legend className="mb-3 text-sm font-semibold">L&apos;école</legend>
        <div className="space-y-1.5">
          <Label htmlFor="e-nom">Nom de l&apos;école</Label>
          <Input id="e-nom" name="nom" required minLength={3} maxLength={120} placeholder="École fondamentale Les Pionniers" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="e-type">Type</Label>
            <select id="e-type" name="type" defaultValue="PRIVE" className={champSelect}>
              <option value="PRIVE">Privée</option>
              <option value="PUBLIC">Publique</option>
              <option value="COMMUNAUTAIRE">Communautaire</option>
              <option value="MEDERSA">Medersa</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-tel">Téléphone</Label>
            <Input id="e-tel" name="telephone" type="tel" maxLength={40} placeholder="+223 ..." />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="e-adresse">Adresse</Label>
          <Input id="e-adresse" name="adresse" maxLength={120} placeholder="Quartier, ville" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Cycles enseignés</p>
          {CYCLES.map((c) => (
            <label key={c.valeur} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="cycles"
                value={c.valeur}
                defaultChecked={c.valeur === "PREMIER_CYCLE"}
                className="h-4 w-4 rounded border-[var(--color-border-strong)]"
              />
              {c.libelle}
            </label>
          ))}
          <p className="text-xs text-[var(--color-ink-muted)]">Les matières habituelles de chaque cycle sont créées ; vous pourrez les modifier.</p>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-3 text-sm font-semibold">Année scolaire en cours</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="e-debut">Rentrée</Label>
            <Input id="e-debut" name="anneeDebut" type="date" required defaultValue={defauts.anneeDebut} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-fin">Fin de l&apos;année</Label>
            <Input id="e-fin" name="anneeFin" type="date" required defaultValue={defauts.anneeFin} />
          </div>
        </div>
        <p className="text-xs text-[var(--color-ink-muted)]">Trois trimestres sont créés sur cette période.</p>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-3 text-sm font-semibold">Directeur ou directrice</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="e-dnom">Nom</Label>
            <Input id="e-dnom" name="directeurNom" required minLength={2} maxLength={80} defaultValue={defauts.directeurNom} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-dprenom">Prénom</Label>
            <Input id="e-dprenom" name="directeurPrenom" required minLength={2} maxLength={80} defaultValue={defauts.directeurPrenom} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="e-demail">Adresse e-mail (identifiant de connexion)</Label>
          <Input
            id="e-demail"
            name="directeurEmail"
            type="email"
            required
            autoComplete="email"
            defaultValue={defauts.directeurEmail}
            readOnly={emailFixe}
            className={emailFixe ? "bg-neutral-50" : undefined}
          />
        </div>
      </fieldset>
    </>
  );
}
