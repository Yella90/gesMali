import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { RappelsPDF } from "@/lib/pdf/RappelsPDF";

export async function GET(req: NextRequest) {
  let session = null;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Non authentifie" }, { status: 401 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { etablissementId: true },
  });
  if (!user) return NextResponse.json({ error: "Utilisateur inconnu" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const statut = searchParams.get("statut");

  const where: any = { tranche: { frais: { etablissementId: user.etablissementId } } };
  if (statut === "en_attente") where.envoye = false;
  if (statut === "envoye") where.envoye = true;

  const [etablissement, rappels] = await Promise.all([
    prisma.etablissement.findUnique({ where: { id: user.etablissementId } }),
    prisma.rappel.findMany({
      where,
      include: {
        tranche: {
          include: {
            frais: { include: { eleve: { include: { classe: true } } } },
            paiements: true,
          },
        },
      },
      orderBy: [{ tranche: { dateEcheance: "asc" } }],
    }),
  ]);

  if (!etablissement) return NextResponse.json({ error: "Etablissement introuvable" }, { status: 404 });
  if (rappels.length === 0) return NextResponse.json({ error: "Aucun rappel a exporter" }, { status: 404 });

  const buffer = await renderToBuffer(
    RappelsPDF({
      etablissement,
      rappels,
      filtre: statut || undefined,
    })
  );

  const nom = "rappels-" + new Date().toISOString().slice(0, 10) + ".pdf";

  return new NextResponse(buffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=\"" + nom + "\"",
    },
  });
}