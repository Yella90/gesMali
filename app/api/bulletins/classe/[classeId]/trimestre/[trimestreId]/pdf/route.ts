import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { BulletinPDF } from "@/lib/pdf/BulletinPDF";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ classeId: string; trimestreId: string }> }
) {
  const { classeId, trimestreId } = await params;

  let session = null;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Non authentifie" }, { status: 401 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { etablissementId: true },
  });
  if (!user) return NextResponse.json({ error: "Utilisateur inconnu" }, { status: 401 });

  const classe = await prisma.classe.findUnique({
    where: { id: classeId },
    include: {
      etablissement: true,
      anneeScolaire: true,
      professeurPrincipal: { select: { nom: true, prenom: true } },
      titulaire: { select: { nom: true, prenom: true } },
    },
  });
  const trimestre = await prisma.trimestre.findUnique({ where: { id: trimestreId } });

  if (!classe || !trimestre) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (classe.etablissementId !== user.etablissementId) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const bulletins = await prisma.bulletin.findMany({
    where: { classeId, trimestreId },
    include: {
      eleve: true,
      lignes: { orderBy: { nomMatiere: "asc" } },
    },
    orderBy: { rang: "asc" },
  });

  if (bulletins.length === 0) {
    return NextResponse.json({ error: "Aucun bulletin genere" }, { status: 404 });
  }

  // Utiliser prof principal ou titulaire
  const profPrincipal = classe.professeurPrincipal ?? classe.titulaire;
  const classeAvecProf = { ...classe, professeurPrincipal: profPrincipal };

  const buffer = await renderToBuffer(
    BulletinPDF({
      etablissement: classe.etablissement,
      classe: classeAvecProf,
      trimestre,
      anneeScolaire: classe.anneeScolaire,
      bulletins,
    })
  );

  const nom = "bulletins-" + (classe.nom || classe.niveau) + (classe.section || "") + "-" + trimestre.nom.replace(/\s+/g, "") + ".pdf";

  return new NextResponse(buffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=\"" + nom + "\"",
    },
  });
}