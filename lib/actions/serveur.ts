import { unstable_rethrow } from "next/navigation";
import { Prisma } from "@/lib/generated/prisma/client";
import type { Resultat } from "@/lib/actions/resultat";

// Erreur de la base ou du reseau qui n'est pas une classe Prisma ci-dessous : erreur du pilote
// remontee par l'adaptateur (connexion coupee pendant une transaction...), erreur PostgreSQL
// (severity) ou systeme (ECONNREFUSED...). Son message n'est pas fait pour l'utilisateur.
function erreurTechnique(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const x = e as Error & { clientVersion?: unknown; severity?: unknown; code?: unknown };
  return (
    typeof x.clientVersion === "string" ||
    typeof x.severity === "string" ||
    (typeof x.code === "string" && /^E[A-Z]{3,}$/.test(x.code)) ||
    /connection terminated|connection error|terminating connection|timeout exceeded when trying to connect/i.test(x.message)
  );
}

// Execute le corps d'une action et renvoie son erreur metier au client.
// Les redirections de Next passent, les erreurs techniques restent dans les logs.
export async function capter<T>(corps: () => Promise<T>): Promise<Resultat<T>> {
  try {
    return { ok: true, data: await corps() };
  } catch (e) {
    unstable_rethrow(e);
    // Erreur de validation zod : ses messages, pas le JSON brut
    if (e instanceof Error && e.name === "ZodError" && Array.isArray((e as { issues?: unknown }).issues)) {
      const issues = (e as unknown as { issues: { message: string }[] }).issues;
      return { ok: false, erreur: issues.map((i) => i.message).join(" ; ") || "Données invalides" };
    }
    if (
      e instanceof Prisma.PrismaClientKnownRequestError ||
      e instanceof Prisma.PrismaClientUnknownRequestError ||
      e instanceof Prisma.PrismaClientValidationError ||
      e instanceof Prisma.PrismaClientInitializationError ||
      e instanceof Prisma.PrismaClientRustPanicError ||
      erreurTechnique(e)
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
