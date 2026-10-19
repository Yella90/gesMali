import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decoderLogo } from "@/lib/etablissement/logo";

// Logo d'un etablissement (public : il figure aussi sur les documents remis aux parents).
// Avec ?v=, l'adresse change a chaque nouveau logo : mise en cache longue.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await prisma.etablissement.findUnique({ where: { id }, select: { logo: true } });
  const logo = e?.logo ? decoderLogo(e.logo) : null;
  if (!logo) return NextResponse.json({ error: "Aucun logo" }, { status: 404 });
  return new NextResponse(new Uint8Array(logo.octets), {
    headers: {
      "Content-Type": logo.type,
      "Cache-Control": req.nextUrl.searchParams.has("v") ? "public, max-age=31536000, immutable" : "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
