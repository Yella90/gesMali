import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { ecole } from "@/lib/data/ecole";
import { getUtilisateurCourant } from "@/lib/auth/session";
import { RappelElevePDF } from "@/lib/pdf/RappelElevePDF";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ eleveId: string }> }
) {
  const { eleveId } = await params;

  const user = await getUtilisateurCourant();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  const db = ecole(user);

  const eleve = await db.eleve.findUnique({
    where: { id: eleveId },
    include: { classe: true },
  });
  if (!eleve || eleve.etablissementId !== user.etablissementId) {
    return NextResponse.json({ error: "Eleve introuvable" }, { status: 404 });
  }

  const [etablissement, rappels] = await Promise.all([
    db.etablissement.findUnique({ where: { id: user.etablissementId } }),
    db.rappel.findMany({
      where: {
        tranche: { frais: { eleveId } },
        envoye: false,
      },
      include: {
        tranche: { include: { paiements: true } },
      },
      orderBy: { tranche: { dateEcheance: "asc" } },
    }),
  ]);

  if (!etablissement) return NextResponse.json({ error: "Etablissement introuvable" }, { status: 404 });
  if (rappels.length === 0) {
    return NextResponse.json({ error: "Aucun rappel en attente pour cet eleve" }, { status: 404 });
  }

  const buffer = await renderToBuffer(
    RappelElevePDF({
      etablissement,
      eleve,
      rappels,
    })
  );

  const nom = "rappel-" + eleve.matricule + ".pdf";

  return new NextResponse(buffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=\"" + nom + "\"",
    },
  });
}