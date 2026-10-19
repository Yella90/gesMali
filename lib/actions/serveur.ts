import { unstable_rethrow } from "next/navigation";
import { Prisma } from "@/lib/generated/prisma/client";
import type { Resultat } from "@/lib/actions/resultat";

// Execute le corps d'une action et renvoie son erreur metier au client.
// Les redirections de Next passent, les erreurs techniques restent dans les logs.
export async function capter<T>(corps: () => Promise<T>): Promise<Resultat<T>> {
  try {
    return { ok: true, data: await corps() };
  } catch (e) {
    unstable_rethrow(e);
    if (
      e instanceof Prisma.PrismaClientKnownRequestError ||
      e instanceof Prisma.PrismaClientUnknownRequestError ||
      e instanceof Prisma.PrismaClientValidationError ||
      e instanceof Prisma.PrismaClientInitializationError ||
      e instanceof Prisma.PrismaClientRustPanicError
    ) {
      console.error("[action]", e);
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return { ok: false, erreur: "Cet enregistrement existe déjà" };
      }
      return { ok: false, erreur: "Opération impossible pour le moment, réessayez" };
    }
    return { ok: false, erreur: e instanceof Error ? e.message : "Opération impossible" };
  }
}
