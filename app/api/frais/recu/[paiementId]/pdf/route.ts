import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { ecole } from "@/lib/data/ecole";
import { getUtilisateurCourant } from "@/lib/auth/session";
import { RecuPDF } from "@/lib/pdf/RecuPDF";

export async function GET(_: NextRequest, { params }: { params: Promise<{ paiementId: string }> }) {
  const { paiementId } = await params;

  const user = await getUtilisateurCourant();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  const db = ecole(user);

  const paiement = await db.paiementFrais.findUnique({
    where: { id: paiementId },
    include: {
      tranche: {
        include: {
          frais: {
            include: {
              eleve: { include: { classe: true } },
              etablissement: true,
            },
          },
        },
      },
    },
  });

  if (!paiement) return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
  if (paiement.tranche.frais.etablissementId !== user.etablissementId) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const buffer = await renderToBuffer(
    RecuPDF({
      etablissement: paiement.tranche.frais.etablissement,
      eleve: paiement.tranche.frais.eleve,
      tranche: paiement.tranche,
      paiement,
    })
  );

  return new NextResponse(buffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=\"" + paiement.recuNumero + ".pdf\"",
    },
  });
}