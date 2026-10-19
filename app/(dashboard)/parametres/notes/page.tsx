import Link from "next/link";
import { ecole } from "@/lib/data/ecole";
import { requirePermission } from "@/lib/auth/session";
import { NotesForm } from "./NotesForm";
import { libModeSaisie } from "@/lib/libelles";

export default async function ParametresNotesPage() {
  const user = await requirePermission("parametres.read");
  const db = ecole(user);

  const parametres = await db.parametresEtablissement.findUnique({
    where: { etablissementId: user.etablissementId },
  });

  const peutEditer = user.roles.includes("DIRECTEUR");

  const valeur = parametres ?? {
    modeSaisieNotes: "DECENTRALISEE" as const,
    validationObligatoire: true,
    ponderationDevoirs: 0.333,
    ponderationCompo: 0.667,
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <Link href="/parametres" className="text-xs text-[var(--color-ink-muted)] hover:underline">
        ← Retour aux paramètres
      </Link>

      <div>
        <h1 className="text-2xl font-semibold mt-1">Notes et bulletins</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-1">
          Mode de saisie, validation et règle de pondération
        </p>
      </div>

      {peutEditer ? (
        <NotesForm
          parametres={{
            modeSaisieNotes: valeur.modeSaisieNotes,
            validationObligatoire: valeur.validationObligatoire,
            ponderationDevoirs: valeur.ponderationDevoirs,
            ponderationCompo: valeur.ponderationCompo,
          }}
        />
      ) : (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 space-y-3 text-sm">
          <p><strong>Mode de saisie :</strong> {libModeSaisie(valeur.modeSaisieNotes)}</p>
          <p><strong>Validation obligatoire :</strong> {valeur.validationObligatoire ? "Oui" : "Non"}</p>
          <p><strong>Pondération devoirs :</strong> {(valeur.ponderationDevoirs * 100).toFixed(0)} %</p>
          <p><strong>Pondération composition :</strong> {(valeur.ponderationCompo * 100).toFixed(0)} %</p>
        </div>
      )}

      <div className="rounded-xl border border-[var(--color-brand-soft)] bg-[var(--color-brand-soft)] p-4 text-sm text-[var(--color-brand)]">
        <p className="font-medium">Règle officielle Mali</p>
        <p className="text-xs mt-1">
          Article 20 du Journal Officiel (2013) : la moyenne par discipline est calculée ainsi :<br />
          <strong>(Composition x 2 + Moyenne des devoirs) / 3</strong>
        </p>
      </div>
    </div>
  );
}