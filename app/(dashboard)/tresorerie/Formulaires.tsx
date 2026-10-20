"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import {
  annulerMouvement as annulerMouvementAction,
  basculerDepenseRecurrente as basculerDepenseRecurrenteAction,
  creerDepenseRecurrente as creerDepenseRecurrenteAction,
  creerMouvement as creerMouvementAction,
  creerTransfert as creerTransfertAction,
} from "./actions";
import { relever } from "@/lib/actions/resultat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const annulerMouvement = relever(annulerMouvementAction);
const basculerDepenseRecurrente = relever(basculerDepenseRecurrenteAction);
const creerDepenseRecurrente = relever(creerDepenseRecurrenteAction);
const creerMouvement = relever(creerMouvementAction);
const creerTransfert = relever(creerTransfertAction);

const champ = "w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm";
const CAISSES = [
  { valeur: "ESPECES", libelle: "Espèces" },
  { valeur: "BANQUE", libelle: "Banque" },
  { valeur: "MOBILE_MONEY", libelle: "Mobile Money" },
];

const TITRES = {
  DEPENSE: { bouton: "Nouvelle dépense", titre: "Nouvelle dépense", aide: "Sortie d'argent pour le fonctionnement de l'école." },
  APPORT_CAPITAL: { bouton: "Apport de capital", titre: "Apport de capital", aide: "Argent injecté par le promoteur : au démarrage ou pour renflouer la trésorerie." },
  RETRAIT_PROMOTEUR: { bouton: "Retrait du promoteur", titre: "Retrait du promoteur", aide: "Argent retiré de la trésorerie par le promoteur." },
} as const;

export function FormulaireMouvement({
  type,
  categories,
  estDirecteur,
  principal = false,
}: {
  type: keyof typeof TITRES;
  categories: string[];
  estDirecteur: boolean;
  principal?: boolean;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const t = TITRES[type];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    try {
      await creerMouvement(new FormData(e.currentTarget));
      ref.current?.close();
      e.currentTarget.reset();
      router.refresh();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErreur(null);
          ref.current?.showModal();
        }}
        className={
          "inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium " +
          (principal
            ? "bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)]"
            : "border border-[var(--color-border-strong)] bg-white hover:bg-neutral-50")
        }
      >
        {t.bouton}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={"titre-" + type}
        className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 text-[var(--color-ink)] shadow-[0_30px_80px_-20px_rgba(4,14,30,0.5)] backdrop:bg-[#0B1D33]/60"
      >
        <form onSubmit={onSubmit} className="space-y-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={"titre-" + type} className="text-lg font-semibold">{t.titre}</h2>
              <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{t.aide}</p>
            </div>
            <button type="button" aria-label="Fermer" onClick={() => ref.current?.close()} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <input type="hidden" name="type" value={type} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={type + "-montant"}>Montant (F CFA)</Label>
              <Input id={type + "-montant"} name="montant" type="number" min={1} step={1} required inputMode="numeric" className="tnum" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={type + "-caisse"}>Caisse</Label>
              <select id={type + "-caisse"} name="caisse" className={champ} defaultValue="ESPECES">
                {CAISSES.map((c) => <option key={c.valeur} value={c.valeur}>{c.libelle}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={type + "-date"}>Date</Label>
              <Input id={type + "-date"} name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
            </div>
            {type === "DEPENSE" && (
              <div className="space-y-1.5">
                <Label htmlFor={type + "-categorie"}>Catégorie</Label>
                <select id={type + "-categorie"} name="categorie" className={champ}>
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={type + "-libelle"}>Libellé</Label>
            <Input id={type + "-libelle"} name="libelle" required minLength={3} placeholder={type === "DEPENSE" ? "Ex : facture EDM d'octobre" : "Ex : renflouement avant la paie"} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={type + "-ref"}>Référence (facultatif)</Label>
            <Input id={type + "-ref"} name="reference" placeholder="N° de facture, bordereau, transaction…" />
          </div>
          {erreur && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erreur}</p>}
          {estDirecteur && erreur?.startsWith("Solde insuffisant") && (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <label className="flex items-start gap-2">
                <input type="checkbox" name="derogation" className="mt-0.5 h-4 w-4" />
                <span>Enregistrer malgré le solde insuffisant (dérogation tracée)</span>
              </label>
              <Input name="motifDerogation" placeholder="Motif de la dérogation" />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => ref.current?.close()} className="h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-4 text-sm hover:bg-neutral-50">
              Annuler
            </button>
            <Button type="submit" disabled={enCours}>{enCours ? "Enregistrement…" : "Enregistrer"}</Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

// Transfert d'une caisse a une autre (depot a la banque, retrait au guichet, Mobile Money...)
export function FormulaireTransfert({ soldes, estDirecteur }: { soldes: Record<string, number>; estDirecteur: boolean }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [de, setDe] = useState("ESPECES");
  const [vers, setVers] = useState("BANQUE");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setEnCours(true);
    setErreur(null);
    try {
      await creerTransfert(new FormData(form));
      ref.current?.close();
      form.reset();
      router.refresh();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setEnCours(false);
    }
  }

  const option = (c: (typeof CAISSES)[number]) => (
    <option key={c.valeur} value={c.valeur}>
      {c.libelle} · {(soldes[c.valeur] ?? 0).toLocaleString("fr-FR")} F
    </option>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErreur(null);
          ref.current?.showModal();
        }}
        className="inline-flex h-10 items-center rounded-lg border border-[var(--color-border-strong)] bg-white px-4 text-sm font-medium hover:bg-neutral-50"
      >
        Transfert entre caisses
      </button>
      <dialog
        ref={ref}
        aria-labelledby="titre-transfert"
        className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 text-[var(--color-ink)] shadow-[0_30px_80px_-20px_rgba(4,14,30,0.5)] backdrop:bg-[#0B1D33]/60"
      >
        <form onSubmit={onSubmit} className="space-y-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="titre-transfert" className="text-lg font-semibold">Transfert entre caisses</h2>
              <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                Dépôt des espèces à la banque, retrait au guichet, recharge ou retrait Mobile Money : l&apos;argent change de caisse,
                ce n&apos;est ni une recette ni une dépense.
              </p>
            </div>
            <button type="button" aria-label="Fermer" onClick={() => ref.current?.close()} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="transfert-de">De la caisse</Label>
              <select id="transfert-de" name="de" className={champ} value={de} onChange={(e) => setDe(e.target.value)}>
                {CAISSES.map(option)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="transfert-vers">Vers la caisse</Label>
              <select id="transfert-vers" name="vers" className={champ} value={vers} onChange={(e) => setVers(e.target.value)}>
                {CAISSES.map(option)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="transfert-montant">Montant (F CFA)</Label>
              <Input id="transfert-montant" name="montant" type="number" min={1} step={1} required inputMode="numeric" className="tnum" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="transfert-date">Date</Label>
              <Input id="transfert-date" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
            </div>
          </div>
          {de === vers && <p className="text-xs text-red-700">Choisissez deux caisses différentes.</p>}
          <div className="space-y-1.5">
            <Label htmlFor="transfert-libelle">Libellé (facultatif)</Label>
            <Input id="transfert-libelle" name="libelle" placeholder="Ex : dépôt de la recette de la semaine" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="transfert-ref">Référence (facultatif)</Label>
            <Input id="transfert-ref" name="reference" placeholder="N° de bordereau, de transaction…" />
          </div>
          {erreur && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erreur}</p>}
          {estDirecteur && erreur?.startsWith("Solde insuffisant") && (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <label className="flex items-start gap-2">
                <input type="checkbox" name="derogation" className="mt-0.5 h-4 w-4" />
                <span>Enregistrer malgré le solde insuffisant (dérogation tracée)</span>
              </label>
              <Input name="motifDerogation" placeholder="Motif de la dérogation" />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => ref.current?.close()} className="h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-4 text-sm hover:bg-neutral-50">
              Annuler
            </button>
            <Button type="submit" disabled={enCours || de === vers}>{enCours ? "Enregistrement…" : "Transférer"}</Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function BoutonAnnulerMouvement({ id }: { id: string }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  async function annuler() {
    const motif = window.prompt("Motif de l'annulation :");
    if (!motif) return;
    setEnCours(true);
    try {
      await annulerMouvement(id, motif);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Annulation impossible");
    } finally {
      setEnCours(false);
    }
  }
  return (
    <button type="button" onClick={annuler} disabled={enCours} className="text-xs text-red-700 hover:underline disabled:opacity-50">
      {enCours ? "…" : "Annuler"}
    </button>
  );
}

export function NouvelleDepenseRecurrente({ categories }: { categories: string[] }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setEnCours(true);
    setErreur(null);
    try {
      await creerDepenseRecurrente(new FormData(form));
      form.reset();
      router.refresh();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setEnCours(false);
    }
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-[1.4fr_1fr_0.8fr_0.6fr_0.9fr_auto] sm:items-end">
      <div className="space-y-1">
        <Label htmlFor="rec-libelle">Libellé</Label>
        <Input id="rec-libelle" name="libelle" required placeholder="Loyer du bâtiment" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="rec-cat">Catégorie</Label>
        <select id="rec-cat" name="categorie" className={champ}>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="rec-montant">Montant</Label>
        <Input id="rec-montant" name="montant" type="number" min={1} required className="tnum" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="rec-jour">Jour</Label>
        <Input id="rec-jour" name="jourEcheance" type="number" min={1} max={28} defaultValue={5} required className="tnum" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="rec-caisse">Caisse</Label>
        <select id="rec-caisse" name="caisse" className={champ}>
          {CAISSES.map((c) => <option key={c.valeur} value={c.valeur}>{c.libelle}</option>)}
        </select>
      </div>
      <Button type="submit" disabled={enCours}>{enCours ? "…" : "Ajouter"}</Button>
      {erreur && <p role="alert" className="text-xs text-red-700 sm:col-span-6">{erreur}</p>}
    </form>
  );
}

export function BoutonBasculerRecurrente({ id, actif }: { id: string; actif: boolean }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  return (
    <button
      type="button"
      disabled={enCours}
      onClick={async () => {
        setEnCours(true);
        try {
          await basculerDepenseRecurrente(id);
          router.refresh();
        } finally {
          setEnCours(false);
        }
      }}
      className="text-xs text-[var(--color-brand)] hover:underline disabled:opacity-50"
    >
      {actif ? "Désactiver" : "Réactiver"}
    </button>
  );
}
