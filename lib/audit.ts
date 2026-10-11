import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";

export async function enregistrerAudit(params: {
  userId: string;
  action: string;
  entite: string;
  entiteId: string;
  details?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entite: params.entite,
      entiteId: params.entiteId,
      details: params.details ?? {},
    },
  });
}