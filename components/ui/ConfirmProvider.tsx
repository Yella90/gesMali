"use client";

import { createContext, useCallback, useContext, useState, useRef } from "react";
import { ConfirmDialog, ConfirmOptions } from "./ConfirmDialog";

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: "",
    message: "",
  });
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  // Nouvelle cle a chaque demande : la fenetre repart de zero (champ de saisie vide)
  const [ouverture, setOuverture] = useState(0);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    setOuverture((n) => n + 1);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  function handleConfirm() {
    setOpen(false);
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  }

  function handleCancel() {
    setOpen(false);
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        key={ouverture}
        open={open}
        options={options}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error(
      "useConfirm doit etre utilise dans un ConfirmProvider. Verifiez que <ConfirmProvider> entoure votre composant."
    );
  }
  return ctx;
}