"use server";

import { capter } from "@/lib/actions/serveur";
import { verifierAdresse } from "@/lib/email/parcours";

// Clic sur « Confirmer mon adresse » depuis le lien recu (pas besoin d'etre connecte)
async function confirmerAdresseCorps(jeton: string) {
  return verifierAdresse(String(jeton ?? ""));
}

export async function confirmerAdresse(...a: Parameters<typeof confirmerAdresseCorps>) {
  return capter(() => confirmerAdresseCorps(...a));
}
