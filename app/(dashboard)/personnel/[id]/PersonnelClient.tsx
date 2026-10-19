"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  modifierEmploye as modifierEmployeAction,
  changerMotDePasse as changerMotDePasseAction,
  creerAffectation as creerAffectationAction,
  supprimerAffectation as supprimerAffectationAction,
  creerCompte as creerCompteAction,
  supprimerCompte as supprimerCompteAction,
} from "../actions";
import { relever } from "@/lib/actions/resultat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { libCycle, libRole } from "@/lib/libelles";

const modifierEmploye = relever(modifierEmployeAction);
const changerMotDePasse = relever(changerMotDePasseAction);
const creerAffectation = relever(creerAffectationAction);
const supprimerAffectation = relever(supprimerAffectationAction);
const creerCompte = relever(creerCompteAction);
const supprimerCompte = relever(supprimerCompteAction);

const POSTES = ["Enseignant", "Directeur", "Secretaire", "Comptable", "Surveillant", "Gardien", "Autre"];

const JOURS = [
  { value: "", label: "-- Aucun creneau --" },
  { value: "LUNDI", label: "Lundi" },
  { value: "MARDI", label: "Mardi" },
  { value: "MERCREDI", label: "Mercredi" },
  { value: "JEUDI", label: "Jeudi" },
  { value: "VENDREDI", label: "Vendredi" },
  { value: "SAMEDI", label: "Samedi" },
];

// ═════════════════════════════════════════════
// Editer employe (inchange)
// ═════════════════════════════════════════════
export function EditerEmploye({
  employe,
  estMoiMeme,
}: {
  employe: {
    id: string;
    nom: string;
    prenom: string;
    telephone: string;
    poste: string;
    posteLibre: string;
    salaireReference: number | null;
    typeRemuneration: string;
    actif: boolean;
  };
  estMoiMeme: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [poste, setPoste] = useState(employe.poste);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    const fd = new FormData(e.currentTarget);
    try {
      await modifierEmploye(employe.id, fd);
      setMode("view");
      router.refresh();
    } catch (e: any) {
      setErreur(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (mode === "view") {
    return (
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <h2 className="font-semibold mb-3">Actions</h2>
        <Button variant="outline" onClick={() => setMode("edit")}>
          Modifier la fiche
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-xl border border-[var(--color-border)] p-5 space-y-4">
      <h2 className="font-semibold">Modifier la fiche</h2>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="nom">Nom</Label>
          <Input id="nom" name="nom" defaultValue={employe.nom} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prenom">Prénom</Label>
          <Input id="prenom" name="prenom" defaultValue={employe.prenom} required />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="telephone">Téléphone</Label>
          <Input id="telephone" name="telephone" type="tel" defaultValue={employe.telephone} />
        </div>
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
      </div>

      {poste === "Autre" && (
        <div className="space-y-1.5">
          <Label htmlFor="posteLibre">Précisez le poste</Label>
          <Input id="posteLibre" name="posteLibre" defaultValue={employe.posteLibre} required />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="salaireReference">Salaire / taux (F CFA)</Label>
          <Input
            id="salaireReference" name="salaireReference" type="number" min={0} step={500}
            defaultValue={employe.salaireReference ?? ""}
            className="tnum"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="typeRemuneration">Type</Label>
          <select
            id="typeRemuneration" name="typeRemuneration" defaultValue={employe.typeRemuneration}
            className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
          >
            <option value="">-- Non précisé --</option>
            <option value="MENSUEL">Mensuel</option>
            <option value="HORAIRE">Horaire</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <input
          type="checkbox"
          id="actif"
          name="actif"
          defaultChecked={employe.actif}
          disabled={estMoiMeme}
          className="w-4 h-4 rounded border-[var(--color-border-strong)]"
        />
        <label htmlFor="actif" className="text-sm">
          Employé actif {estMoiMeme && <span className="text-[var(--color-ink-muted)]">(vous ne pouvez pas vous désactiver)</span>}
        </label>
      </div>

      {erreur && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erreur}</div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Enregistrement..." : "Enregistrer"}
        </Button>
        <button type="button" onClick={() => { setMode("view"); setErreur(null); }} className="h-10 px-4 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm hover:bg-neutral-50">
          Annuler
        </button>
      </div>
    </form>
  );
}

// ═════════════════════════════════════════════
// Gerer compte (inchange)
// ═════════════════════════════════════════════
export function GererCompte({
  employeId,
  user,
  estMoiMeme,
}: {
  employeId: string;
  user: { email: string; roles: string[]; actif: boolean } | null;
  estMoiMeme: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "create" | "password">("view");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await creerCompte(employeId, fd);
      setMode("view");
      setMessage(res.compteExistant ? "Compte existant : la personne a maintenant accès à votre école, avec son mot de passe habituel." : null);
      router.refresh();
    } catch (e: any) {
      setErreur(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function onPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    try {
      await changerMotDePasse(employeId, fd.get("motDePasse") as string);
      setMessage("Mot de passe modifié.");
      setMode("view");
    } catch (e: any) {
      setErreur(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function onDelete() {
    if (!confirm("Supprimer le compte de connexion ? La fiche employé sera conservée.")) return;
    setLoading(true);
    setErreur(null);
    try {
      await supprimerCompte(employeId);
      router.refresh();
    } catch (e: any) {
      setErreur(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (mode === "create") {
    return (
      <form onSubmit={onCreate} className="bg-white rounded-xl border border-[var(--color-border)] p-5 space-y-4">
        <h2 className="font-semibold">Créer un compte de connexion</h2>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role">Rôle</Label>
          <select id="role" name="role" required className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm">
            <option value="ENSEIGNANT">Enseignant</option>
            <option value="SECRETAIRE">Secrétaire</option>
            <option value="COMPTABLE">Comptable</option>
            <option value="DIRECTEUR">Directeur</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="motDePasse">Mot de passe</Label>
          <Input id="motDePasse" name="motDePasse" type="text" minLength={6} className="font-mono" />
          <p className="text-xs text-[var(--color-ink-muted)]">6 caractères minimum. Si cette adresse a déjà un compte GES Mali dans une autre école, laissez le mot de passe vide : la personne recevra l'accès à votre école avec son mot de passe habituel.</p>
        </div>
        {erreur && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erreur}</div>}
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>{loading ? "..." : "Créer"}</Button>
          <button type="button" onClick={() => { setMode("view"); setErreur(null); }} className="h-10 px-4 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm">
            Annuler
          </button>
        </div>
      </form>
    );
  }

  if (mode === "password") {
    return (
      <form onSubmit={onPassword} className="bg-white rounded-xl border border-[var(--color-border)] p-5 space-y-4">
        <h2 className="font-semibold">Changer le mot de passe</h2>
        <div className="space-y-1.5">
          <Label htmlFor="motDePasse">Nouveau mot de passe</Label>
          <Input id="motDePasse" name="motDePasse" type="text" required minLength={6} className="font-mono" />
        </div>
        {erreur && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erreur}</div>}
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>{loading ? "..." : "Modifier"}</Button>
          <button type="button" onClick={() => { setMode("view"); setErreur(null); }} className="h-10 px-4 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm">
            Annuler
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
      <h2 className="text-sm font-medium text-[var(--color-ink-muted)] uppercase tracking-wide mb-3">
        Compte de connexion
      </h2>

      {user ? (
        <>
          <div className="space-y-2 mb-4 text-sm">
            <p><strong>Email :</strong> {user.email}</p>
            <p><strong>Rôles :</strong> {user.roles.map(libRole).join(", ")}</p>
            <p><strong>Statut :</strong> {user.actif ? "Actif" : "Inactif"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setMode("password")}>Changer le mot de passe</Button>
            {!estMoiMeme && (
              <button onClick={onDelete} disabled={loading} className="h-10 px-4 rounded-lg border border-red-200 bg-white text-red-700 text-sm hover:bg-red-50 disabled:opacity-50">
                Supprimer le compte
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-[var(--color-ink-muted)] mb-4">
            Cet employé n'a pas de compte de connexion. Créez-en un si cette personne doit utiliser l'application.
          </p>
          <Button onClick={() => setMode("create")}>Créer un compte</Button>
        </>
      )}

      {erreur && <p className="text-sm text-red-600 mt-3">{erreur}</p>}
      {message && <p className="text-sm text-[var(--color-accent)] mt-3">{message}</p>}
    </div>
  );
}

// ═════════════════════════════════════════════
// Supprimer affectation
// ═════════════════════════════════════════════
export function SupprimerAffectation({ affectationId }: { affectationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handle() {
    if (!confirm("Supprimer cette affectation ?")) return;
    setLoading(true);
    try {
      await supprimerAffectation(affectationId);
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handle} disabled={loading} className="text-xs text-red-600 hover:underline disabled:opacity-50">
      {loading ? "..." : "Supprimer"}
    </button>
  );
}

// ═════════════════════════════════════════════
// Gerer affectations (avec jour + heure)
// ═════════════════════════════════════════════
export function GererAffectations({
  employeId,
  classes,
  matieres,
}: {
  employeId: string;
  classes: { id: string; label: string; cycle: string }[];
  matieres: { id: string; nom: string; cycle: string }[];
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [type, setType] = useState<"TITULAIRE" | "PROFESSEUR_MATIERE">("PROFESSEUR_MATIERE");
  const [classeId, setClasseId] = useState("");
  const [matiereId, setMatiereId] = useState("");
  const [jour, setJour] = useState("");

  const classeSel = classes.find((c) => c.id === classeId);
  const matieresFiltrees = classeSel ? matieres.filter((m) => m.cycle === classeSel.cycle) : matieres;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    const fd = new FormData(e.currentTarget);
    try {
      await creerAffectation(fd);
      setOuvert(false);
      setClasseId("");
      setMatiereId("");
      setJour("");
      router.refresh();
    } catch (e: any) {
      setErreur(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} className="h-9 px-4 rounded-lg bg-[var(--color-brand)] text-white text-sm font-medium hover:bg-[var(--color-brand-dark)]">
        + Ajouter une affectation
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="enseignantId" value={employeId} />
      <p className="text-sm font-medium">Nouvelle affectation</p>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="type">Type</Label>
          <select
            id="type" name="type" required
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
          >
            <option value="PROFESSEUR_MATIERE">Professeur de matière</option>
            <option value="TITULAIRE">Titulaire de classe</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="classeId">Classe</Label>
          <select
            id="classeId" name="classeId" required
            value={classeId}
            onChange={(e) => { setClasseId(e.target.value); setMatiereId(""); }}
            className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
          >
            <option value="">-- Choisir --</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="matiereId">
            Matière {type === "TITULAIRE" && <span className="text-[var(--color-ink-muted)]">(optionnel)</span>}
          </Label>
          <select
            id="matiereId" name="matiereId"
            required={type === "PROFESSEUR_MATIERE"}
            value={matiereId}
            onChange={(e) => setMatiereId(e.target.value)}
            disabled={type === "TITULAIRE"}
            className={"w-full h-10 rounded-lg border border-[var(--color-border-strong)] px-3 text-sm " + (type === "TITULAIRE" ? "bg-neutral-50" : "bg-white")}
          >
            <option value="">-- Choisir --</option>
            {matieresFiltrees.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
          </select>
          {classeSel && matieresFiltrees.length === 0 && (
            <p className="text-xs text-red-600">
              Aucune matière pour le cycle {libCycle(classeSel.cycle).toLowerCase()}.
            </p>
          )}
        </div>
      </div>

      {/* Creneau horaire */}
      <div className="rounded-lg bg-[var(--color-surface)] p-3 space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
          Créneau horaire (optionnel)
        </p>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="jour">Jour</Label>
            <select
              id="jour" name="jour"
              value={jour}
              onChange={(e) => setJour(e.target.value)}
              className="w-full h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
            >
              {JOURS.map((j) => <option key={j.value} value={j.value}>{j.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="heureDebut">Heure début</Label>
            <Input id="heureDebut" name="heureDebut" type="time" disabled={!jour} className="tnum" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="heureFin">Heure fin</Label>
            <Input id="heureFin" name="heureFin" type="time" disabled={!jour} className="tnum" />
          </div>
        </div>
        {!jour && (
          <p className="text-xs text-[var(--color-ink-muted)]">
            Laissez vide si l'horaire n'est pas encore défini.
          </p>
        )}
      </div>

      {erreur && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erreur}</div>}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>{loading ? "Ajout..." : "Ajouter"}</Button>
        <button type="button" onClick={() => { setOuvert(false); setErreur(null); }} className="h-10 px-4 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm">
          Annuler
        </button>
      </div>
    </form>
  );
}