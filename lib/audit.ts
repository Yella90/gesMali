import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getUtilisateurCourant } from "@/lib/auth/session";

// Entree du journal, rattachee a l'ecole concernee (par defaut, l'ecole courante de l'utilisateur)
export async function enregistrerAudit(params: {
  userId: string;
  action: string;
  entite: string;
  entiteId: string;
  details?: Prisma.InputJsonValue;
  etablissementId?: string;
}) {
  const etablissementId = params.etablissementId ?? (await getUtilisateurCourant())?.etablissementId;
  if (!etablissementId) throw new Error("Journal : école inconnue");
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      etablissementId,
      action: params.action,
      entite: params.entite,
      entiteId: params.entiteId,
      details: params.details ?? {},
    },
  });
}
