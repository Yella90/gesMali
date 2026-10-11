import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { exporterNotesCSV } from "@/lib/transition/actions";

export async function GET(_: NextRequest, { params }: { params: Promise<{ anneeId: string }> }) {
  const { anneeId } = await params;

  let session = null;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Non authentifie" }, { status: 401 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { etablissementId: true, roles: true },
  });
  if (!user || !user.roles.includes("DIRECTEUR" as any)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  try {
    const csv = await exporterNotesCSV(anneeId);
    const annee = await prisma.anneeScolaire.findUnique({ where: { id: anneeId } });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="notes-' + (annee?.libelle || "annee") + '.csv"',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}