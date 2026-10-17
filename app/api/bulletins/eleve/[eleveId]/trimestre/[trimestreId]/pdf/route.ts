import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { rendreBulletinEleve } from "@/lib/pdf/bulletinEleve";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ eleveId: string; trimestreId: string }> }
) {
  const { eleveId, trimestreId } = await params;

  let session = null;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Non authentifie" }, { status: 401 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { etablissementId: true },
  });
  if (!user) return NextResponse.json({ error: "Utilisateur inconnu" }, { status: 401 });

  const pdf = await rendreBulletinEleve(eleveId, trimestreId);
  if (!pdf) return NextResponse.json({ error: "Bulletin introuvable" }, { status: 404 });
  if (pdf.etablissementId !== user.etablissementId) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  return new NextResponse(new Uint8Array(pdf.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=\"" + pdf.nomFichier + "\"",
    },
  });
}
