import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { ecole } from "@/lib/data/ecole";
import { getUtilisateurCourant } from "@/lib/auth/session";
import { RappelsPDF } from "@/lib/pdf/RappelsPDF";

export async function GET(req: NextRequest) {
  const user = await getUtilisateurCourant();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  const db = ecole(user);

  const { searchParams } = new URL(req.url);
  const statut = searchParams.get("statut");

  const where: any = { tranche: { frais: { etablissementId: user.etablissementId } } };
  if (statut === "en_attente") where.envoye = false;
  if (statut === "envoye") where.envoye = true;

  const [etablissement, rappels] = await Promise.all([
    db.etablissement.findUnique({ where: { id: user.etablissementId } }),
    db.rappel.findMany({
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