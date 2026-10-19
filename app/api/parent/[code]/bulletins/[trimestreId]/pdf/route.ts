import { NextRequest, NextResponse } from "next/server";
import { rendreBulletinEleve } from "@/lib/pdf/bulletinEleve";
import { eleveParCodeParent } from "@/lib/portail/eleve";

// Bulletin PDF pour l'espace parent : l'acces se fait par le code secret de l'eleve
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ code: string; trimestreId: string }> }
) {
  const { code, trimestreId } = await params;

  const eleve = await eleveParCodeParent(code);
  if (!eleve) return NextResponse.json({ error: "Lien invalide" }, { status: 404 });

  const pdf = await rendreBulletinEleve(eleve.etablissementId, eleve.id, trimestreId);
  if (!pdf) return NextResponse.json({ error: "Bulletin introuvable" }, { status: 404 });

  return new NextResponse(new Uint8Array(pdf.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=\"" + pdf.nomFichier + "\"",
      "Cache-Control": "private, no-store",
    },
  });
}
