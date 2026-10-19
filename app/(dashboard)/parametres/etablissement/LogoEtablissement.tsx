"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Trash2 } from "lucide-react";
import { executer } from "@/lib/actions/resultat";
import { modifierLogo } from "../actions";

const COTE_MAX = 320;

// Reduit l'image dans le navigateur (320 px de cote au plus) : PNG pour garder la transparence
async function reduire(fichier: File): Promise<string> {
  const url = URL.createObjectURL(fichier);
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => ko(new Error("Image illisible"));
      i.src = url;
    });
    const echelle = Math.min(1, COTE_MAX / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * echelle));
    canvas.height = Math.max(1, Math.round(img.height * echelle));
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const png = canvas.toDataURL("image/png");
    // Une photo se compresse mieux en JPEG
    return png.length > 300_000 ? canvas.toDataURL("image/jpeg", 0.85) : png;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function LogoEtablissement({ logo, nom }: { logo: string | null; nom: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [apercu, setApercu] = useState<string | null>(logo);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  async function envoyer(valeur: string | null) {
    setEnCours(true);
    setMessage(null);
    try {
      await executer(modifierLogo(valeur));
      setApercu(valeur);
      setMessage({ ok: true, texte: valeur ? "Logo enregistré : il apparaît sur les documents PDF." : "Logo retiré." });
      router.refresh();
    } catch (e) {
      setMessage({ ok: false, texte: e instanceof Error ? e.message : "Enregistrement impossible" });
    } finally {
      setEnCours(false);
    }
  }

  async function choisir(f: File | undefined) {
    if (input.current) input.current.value = "";
    if (!f) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(f.type)) {
      setMessage({ ok: false, texte: "Choisissez une image PNG ou JPEG." });
      return;
    }
    if (f.size > 8_000_000) {
      setMessage({ ok: false, texte: "Image trop lourde (8 Mo maximum)." });
      return;
    }
    try {
      await envoyer(await reduire(f));
    } catch (e) {
      setMessage({ ok: false, texte: e instanceof Error ? e.message : "Image illisible" });
    }
  }

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-white p-5 md:p-6">
      <h2 className="font-medium">Logo</h2>
      <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
        Affiché sur les bulletins, reçus, fiches et rapports PDF, dans la barre latérale et dans l&apos;espace parent. PNG ou JPEG, de préférence carré.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          {apercu ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL ou image servie par l'API
            <img src={apercu} alt={"Logo de " + nom} className="h-full w-full object-contain" />
          ) : (
            <span className="text-2xl font-bold text-[var(--color-brand)]">{nom.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className={"inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--color-brand)] px-3 text-sm text-white hover:bg-[var(--color-brand-dark)] " + (enCours ? "pointer-events-none opacity-60" : "")}>
            <ImageUp className="h-4 w-4" aria-hidden />
            {enCours ? "Enregistrement…" : apercu ? "Changer le logo" : "Ajouter un logo"}
            <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => choisir(e.target.files?.[0])} />
          </label>
          {apercu && (
            <button type="button" disabled={enCours} onClick={() => envoyer(null)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border-strong)] px-3 text-sm hover:bg-neutral-50 disabled:opacity-60">
              <Trash2 className="h-4 w-4" aria-hidden /> Retirer
            </button>
          )}
        </div>
      </div>
      {message && <p className={"mt-3 text-sm " + (message.ok ? "text-[var(--color-accent)]" : "text-red-700")}>{message.texte}</p>}
    </section>
  );
}
