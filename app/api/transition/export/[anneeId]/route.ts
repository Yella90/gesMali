import { NextRequest, NextResponse } from "next/server";
import { ecole } from "@/lib/data/ecole";
import { getUtilisateurCourant } from "@/lib/auth/session";
import { exporterNotesCSV } from "@/lib/transition/actions";

export async function GET(_: NextRequest, { params }: { params: Promise<{ anneeId: string }> }) {
  const { anneeId } = await params;

  const user = await getUtilisateurCourant();
  if (!user || !user.roles.includes("DIRECTEUR")) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }
  const db = ecole(user);

  try {
    const csv = await exporterNotesCSV(anneeId);
    const annee = await db.anneeScolaire.findUnique({ where: { id: anneeId } });

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