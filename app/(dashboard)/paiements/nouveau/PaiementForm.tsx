"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { creerPaiement } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EmployeOption = {
  id: string;
  label: string;
  poste: string;
  salaireReference: number | null;
  typeRemuneration: string | null;
};

export function PaiementForm({ employes }: { employes: EmployeOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const [employeId, setEmployeId] = useState("");
  const [type, setType] = useState("MENSUEL");
  const [montant, setMontant] = useState("");
  const [nbHeures, setNbHeures] = useState("");
  const [tauxHoraire, setTauxHoraire] = useState("");
  const [infoPreRemplissage, setInfoPreRemplissage] = useState<string | null>(null);

  const moisCourant = new Date().toISOString().slice(0, 7);
  const montantNum = Number(montant) || 0;
  const nbHeuresNum = Number(nbHeures) || 0;
  const tauxHoraireNum = Number(tauxHoraire) || 0;
  const calculHoraire = nbHeuresNum * tauxHoraireNum;

  const employeSel = employes.find((e) => e.id === employeId);
  // Le salaire se paie selon le mode de remuneration de l'employe : au mois OU a l'heure
  const typeSalaire = employeSel?.typeRemuneration === "HORAIRE" ? "HORAIRE" : "MENSUEL";

  // ═════════════════════════════════════════════
  // Pre-remplir quand on change d'employe
  // ═════════════════════════════════════════════
  function onEmployeChange(id: string) {
    setEmployeId(id);
    setInfoPreRemplissage(null);

    const e = employes.find((x) => x.id === id);
    // Toujours repartir du type de salaire de l'employe choisi
    setType(e?.typeRemuneration === "HORAIRE" ? "HORAIRE" : "MENSUEL");
    if (!e || !e.salaireReference) return;

    // Type de remuneration determine le mode par defaut
    if (e.typeRemuneration === "HORAIRE") {
      setType("HORAIRE");
      setTauxHoraire(String(e.salaireReference));
      setMontant("");
      setNbHeures("");
      setInfoPreRemplissage("Taux horaire pré-rempli : " + e.salaireReference.toLocaleString("fr-FR") + " F / h");
    } else {
      // MENSUEL ou null = traite comme mensuel par defaut
      setType("MENSUEL");
      setMontant(String(e.salaireReference));
      setTauxHoraire("");
      setNbHeures("");
      setInfoPreRemplissage("Salaire mensuel pré-rempli : " + e.salaireReference.toLocaleString("fr-FR") + " F");
    }
  }

  // ═════════════════════════════════════════════
  // Re-appliquer le salaire de reference quand on change de type
  // ═════════════════════════════════════════════
  function onTypeChange(newType: string) {
    setType(newType);
    setInfoPreRemplissage(null);

    if (!employeSel?.salaireReference) return;

    if (newType === "HORAIRE") {
      // Ne pas ecraser si deja rempli
      if (!tauxHoraire) setTauxHoraire(String(employeSel.salaireReference));
    } else if (newType === "MENSUEL") {
      // Ne pas ecraser si deja rempli
      if (!montant) setMontant(String(employeSel.salaireReference));
    }
  }

  // ═════════════════════════════════════════════
  // Bouton "Utiliser le salaire de reference"
  // ═════════════════════════════════════════════
  function appliquerSalaireReference() {
    if (!employeSel?.salaireReference) return;
    if (type === "HORAIRE") {
      setTauxHoraire(String(employeSel.salaireReference));
      if (nbHeuresNum > 0) {
        setMontant(String(nbHeuresNum * employeSel.salaireReference));
      }
    } else {
      setMontant(String(employeSel.salaireReference));
    }
    setInfoPreRemplissage("Salaire de référence appliqué");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await creerPaiement(fd);
      router.push("/paiements/" + res.id);
    } catch (e: any) {
      setErreur(e.message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[var(--color-brand)] text-white text-xs flex items-center justify-center font-medium">1</span>
          <h2 className="font-medium">Bénéficiaire et période</h2>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="employeId">Employé</Label>
          <select
            id="employeId" name="employeId" required
            value={employeId}
            onChange={(e) => onEmployeChange(e.target.value)}
            className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
          >
            <option value="">-- Choisir --</option>
            {employes.map((e) => (
              <option key={e.id} value={e.id}>{e.label} ({e.poste})</option>
            ))}
          </select>
          {employeSel?.salaireReference && (
            <p className="text-xs text-[var(--color-ink-muted)]">
              Salaire de référence : <strong>{employeSel.salaireReference.toLocaleString("fr-FR")} F</strong>
              {" "}
              {employeSel.typeRemuneration === "HORAIRE" ? "(horaire)" : "(mensuel)"}
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="periode">Période</Label>
            <Input
              id="periode" name="periode" type="month"
              defaultValue={moisCourant}
              max={moisCourant}
              required
            />
            <p className="text-xs text-[var(--color-ink-muted)]">
              Mois concerné (uniquement les mois écoulés)
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="datePaiement">Date de paiement</Label>
            <Input id="datePaiement" name="datePaiement" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[var(--color-brand)] text-white text-xs flex items-center justify-center font-medium">2</span>
          <h2 className="font-medium">Type et montant</h2>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="type">Type de paiement</Label>
          <select
            id="type" name="type" required
            value={employeSel ? type : ""}
            onChange={(e) => onTypeChange(e.target.value)}
            disabled={!employeSel}
            className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm disabled:bg-[var(--color-surface)] disabled:text-[var(--color-ink-muted)]"
          >
            {!employeSel && <option value="">Choisissez d'abord l'employé</option>}
            {typeSalaire === "HORAIRE" ? (
              <option value="HORAIRE">Heures travaillées (heures × taux)</option>
            ) : (
              <option value="MENSUEL">Salaire mensuel</option>
            )}
            <option value="PRIME">Prime</option>
            <option value="AVANCE">Avance sur salaire</option>
            <option value="REMBOURSEMENT">Remboursement</option>
          </select>
          {employeSel && (
            <p className="text-xs text-[var(--color-ink-muted)]">
              {typeSalaire === "HORAIRE"
                ? "Cet employé est payé à l'heure : le salaire se calcule à partir des heures travaillées."
                : "Cet employé est payé au mois : un seul salaire mensuel par mois."}{" "}
              Le mode de rémunération se change dans sa fiche du personnel.
            </p>
          )}
        </div>

        {infoPreRemplissage && (
          <div className="rounded-lg border border-[var(--color-accent-soft)] bg-[var(--color-accent-soft)] px-3 py-2 text-xs text-[var(--color-accent)]">
            ✓ {infoPreRemplissage}
          </div>
        )}

        {type === "HORAIRE" && (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="nombreHeures">Nombre d'heures</Label>
              <Input
                id="nombreHeures" name="nombreHeures" type="number" min={0} step={0.5}
                value={nbHeures}
                onChange={(e) => setNbHeures(e.target.value)}
                className="tnum"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tauxHoraire">Taux horaire (F CFA)</Label>
              <Input
                id="tauxHoraire" name="tauxHoraire" type="number" min={0} step={100}
                value={tauxHoraire}
                onChange={(e) => setTauxHoraire(e.target.value)}
                className="tnum"
              />
            </div>
            {calculHoraire > 0 && (
              <div className="space-y-1.5">
                <Label>Montant calculé</Label>
                <div className="h-10 rounded-lg bg-[var(--color-brand-soft)] flex items-center px-3 text-sm font-semibold text-[var(--color-brand)] tnum">
                  {calculHoraire.toLocaleString("fr-FR")} F
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="montant">Montant total (F CFA)</Label>
            {employeSel?.salaireReference && (
              <button
                type="button"
                onClick={appliquerSalaireReference}
                className="text-xs text-[var(--color-brand)] hover:underline"
              >
                Utiliser le salaire de référence ({employeSel.salaireReference.toLocaleString("fr-FR")} F)
              </button>
            )}
          </div>
          <Input
            id="montant" name="montant" type="number" min={0} step={100}
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            required
            inputMode="decimal"
            className="tnum text-lg"
            placeholder="Ex : 75 000"
          />
          {type === "HORAIRE" && calculHoraire > 0 && (
            <button
              type="button"
              onClick={() => setMontant(String(calculHoraire))}
              className="text-xs text-[var(--color-brand)] hover:underline"
            >
              Utiliser le montant calculé ({calculHoraire.toLocaleString("fr-FR")} F)
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[var(--color-brand)] text-white text-xs flex items-center justify-center font-medium">3</span>
          <h2 className="font-medium">Mode de paiement</h2>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="modePaiement">Mode</Label>
          <select
            id="modePaiement" name="modePaiement" required
            className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
          >
            <option value="ESPECES">Espèces</option>
            <option value="VIREMENT">Virement bancaire</option>
            <option value="MOBILE_MONEY">Mobile Money</option>
            <option value="CHEQUE">Chèque</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reference">Référence</Label>
          <Input id="reference" name="reference" placeholder="Numéro de bordereau, transaction, etc." />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="note">Note interne</Label>
          <textarea
            id="note" name="note" rows={3}
            placeholder="Remarque, motif spécial, etc."
            className="w-full rounded-lg border border-[var(--color-border-strong)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
          />
        </div>
      </div>

      {montantNum > 0 && (
        <div className="rounded-xl bg-[var(--color-brand-soft)] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brand)]">Récapitulatif</p>
          <p className="text-2xl font-semibold text-[var(--color-brand)] mt-2 tnum">
            {montantNum.toLocaleString("fr-FR")} F CFA
          </p>
          <p className="text-xs text-[var(--color-ink-muted)] mt-1">à enregistrer</p>
        </div>
      )}

      {erreur && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erreur}</div>
      )}

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={loading || !montantNum}>
          {loading ? "Enregistrement..." : "Enregistrer le paiement"}
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