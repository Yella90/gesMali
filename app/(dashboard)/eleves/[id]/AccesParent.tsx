"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { regenererCodeParent as regenererCodeParentAction } from "../actions";
import { relever } from "@/lib/actions/resultat";

const regenererCodeParent = relever(regenererCodeParentAction);

export function AccesParent({
  eleveId,
  url,
  qrSvg,
  peutModifier,
}: {
  eleveId: string;
  url: string;
  qrSvg: string;
  peutModifier: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [copie, setCopie] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function copier() {
    try {
      await navigator.clipboard.writeText(url);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      setErreur("Copie impossible : sélectionnez le lien manuellement.");
    }
  }

  async function regenerer() {
    const ok = await confirm({
      title: "Générer un nouveau lien parent ?",
      message:
        "L'ancien lien et l'ancien QR code ne fonctionneront plus. Il faudra réimprimer la fiche d'inscription pour le parent.",
      confirmLabel: "Générer",
      variant: "warning",
    });
    if (!ok) return;
    setEnCours(true);
    setErreur(null);
    try {
      await regenererCodeParent(eleveId);
      router.refresh();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
      <h2 className="text-sm font-medium text-[var(--color-ink-muted)] uppercase tracking-wide mb-3">
        Espace parent
      </h2>
      <div className="flex flex-col sm:flex-row gap-5 items-start">
        <div
          className="w-32 h-32 shrink-0 rounded-lg border border-[var(--color-border)] p-1.5 bg-white [&>svg]:w-full [&>svg]:h-full"
          aria-label="QR code d'accès parent"
          role="img"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm text-[var(--color-ink-muted)]">
            Le parent scanne ce QR code (imprimé sur la fiche d&apos;inscription) pour consulter le profil, les notes
            validées et les bulletins de l&apos;élève, sans compte ni mot de passe.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 h-9 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-xs font-mono"
            />
            <button
              type="button"
              onClick={copier}
              className="h-9 px-3 rounded-lg border border-[var(--color-border-strong)] bg-white text-xs hover:bg-neutral-50 whitespace-nowrap"
            >
              {copie ? "Copié ✓" : "Copier"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={"/api/eleves/" + eleveId + "/fiche-inscription/pdf"}
              target="_blank"
              className="inline-flex items-center h-9 px-3 rounded-lg bg-[var(--color-brand)] text-white text-xs font-medium hover:bg-[var(--color-brand-dark)]"
            >
              Imprimer la fiche d&apos;inscription
            </a>
            <a
              href={url}
              target="_blank"
              className="inline-flex items-center h-9 px-3 rounded-lg border border-[var(--color-border-strong)] bg-white text-xs hover:bg-neutral-50"
            >
              Voir l&apos;espace parent
            </a>
            {peutModifier && (
              <button
                type="button"
                onClick={regenerer}
                disabled={enCours}
                className="inline-flex items-center h-9 px-3 rounded-lg border border-[var(--color-border-strong)] bg-white text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {enCours ? "Génération..." : "Nouveau lien"}
              </button>
            )}
          </div>
          {erreur && <p className="text-xs text-red-700">{erreur}</p>}
        </div>
      </div>
    </div>
  );
}
