"use client";

import { useEffect } from "react";

export type ConfirmVariant = "danger" | "warning" | "info" | "success";

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
};

const ICONES: Record<ConfirmVariant, string> = {
  danger: "M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
  warning: "M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
  info: "M12 16v-4M12 8h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z",
  success: "m9 12 2 2 4-4M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z",
};

const STYLES: Record<ConfirmVariant, { iconeBg: string; iconeFg: string; bouton: string }> = {
  danger: {
    iconeBg: "bg-red-50",
    iconeFg: "text-red-700",
    bouton: "bg-red-600 hover:bg-red-700 text-white",
  },
  warning: {
    iconeBg: "bg-amber-50",
    iconeFg: "text-amber-800",
    bouton: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  info: {
    iconeBg: "bg-[var(--color-brand-soft)]",
    iconeFg: "text-[var(--color-brand)]",
    bouton: "bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white",
  },
  success: {
    iconeBg: "bg-[var(--color-accent-soft)]",
    iconeFg: "text-[var(--color-accent)]",
    bouton: "bg-[var(--color-accent)] hover:bg-[var(--color-accent)] text-white",
  },
};

export function ConfirmDialog({
  open,
  options,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const variant = options.variant || "danger";
  const style = STYLES[variant];

  // Fermer avec Echap
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel, onConfirm]);

  // Bloquer le scroll du body quand la modale est ouverte
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modale */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{
          animation: "confirmEnter 200ms cubic-bezier(0.165, 0.84, 0.44, 1)",
        }}
      >
        <style>{`
          @keyframes confirmEnter {
            from { opacity: 0; transform: scale(0.95) translateY(10px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={"w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 " + style.iconeBg + " " + style.iconeFg}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={ICONES[variant]} />
              </svg>
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <h3 className="text-lg font-semibold text-[var(--color-ink)]">
                {options.title}
              </h3>
              {options.message && (
                <p className="text-sm text-[var(--color-ink-muted)] mt-2 leading-relaxed">
                  {options.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-5 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm font-medium text-[var(--color-ink)] hover:bg-neutral-50"
          >
            {options.cancelLabel || "Annuler"}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className={"h-10 px-5 rounded-lg text-sm font-medium " + style.bouton}
          >
            {options.confirmLabel || "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}