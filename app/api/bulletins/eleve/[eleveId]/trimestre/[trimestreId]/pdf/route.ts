import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { BulletinPDF } from "@/lib/pdf/BulletinPDF";

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

  const bulletin = await prisma.bulletin.findUnique({
    where: { eleveId_trimestreId: { eleveId, trimestreId } },
    include: {
      eleve: true,
      lignes: { orderBy: { nomMatiere: "asc" } },
      classe: {
        include: {
          etablissement: true,
          anneeScolaire: true,
          professeurPrincipal: { select: { nom: true, prenom: true } },
          titulaire: { select: { nom: true, prenom: true } },
        },
      },
      trimestre: true,
    },
  });

  if (!bulletin) return NextResponse.json({ error: "Bulletin introuvable" }, { status: 404 });
  if (bulletin.classe.etablissementId !== user.etablissementId) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const profPrincipal = bulletin.classe.professeurPrincipal ?? bulletin.classe.titulaire;
  const classeAvecProf = { ...bulletin.classe, professeurPrincipal: profPrincipal };

  const buffer = await renderToBuffer(
    BulletinPDF({
      etablissement: bulletin.classe.etablissement,
      classe: classeAvecProf,
      trimestre: bulletin.trimestre,
      anneeScolaire: bulletin.classe.anneeScolaire,
      bulletins: [bulletin],
    })
  );

  return new NextResponse(buffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=\"bulletin-" + bulletin.eleve.matricule + ".pdf\"",
    },
  });
}