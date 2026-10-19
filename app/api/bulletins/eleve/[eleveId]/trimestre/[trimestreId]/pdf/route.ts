import { NextRequest, NextResponse } from "next/server";
import { rendreBulletinEleve } from "@/lib/pdf/bulletinEleve";
import { getUtilisateurCourant } from "@/lib/auth/session";
import { classeVisible } from "@/lib/data/guard";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ eleveId: string; trimestreId: string }> }
) {
  const { eleveId, trimestreId } = await params;

  const user = await getUtilisateurCourant();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const pdf = await rendreBulletinEleve(user.etablissementId, eleveId, trimestreId);
  if (!pdf) return NextResponse.json({ error: "Bulletin introuvable" }, { status: 404 });
  if (pdf.etablissementId === user.etablissementId) {
    // Enseignant : uniquement ses classes
    const courant = await getUtilisateurCourant();
    if (!courant || !(await classeVisible(courant, pdf.classeId))) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }
  }
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
