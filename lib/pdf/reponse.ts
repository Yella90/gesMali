import { NextResponse } from "next/server";

// Reponse PDF commune aux routes API. Une erreur de generation est journalisee
// (logs de l'hebergeur) et renvoyee en JSON plutot qu'en page blanche.
// `detail` : n'exposer le message technique qu'au personnel authentifie.
export async function reponsePdf(
  nomFichier: string,
  rendre: () => Promise<Uint8Array | Buffer>,
  { detail = false, prive = false }: { detail?: boolean; prive?: boolean } = {}
) {
  try {
    const buffer = await rendre();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=\"" + nomFichier + "\"",
        ...(prive ? { "Cache-Control": "private, no-store" } : {}),
      },
    });
  } catch (e) {
    console.error("[pdf] generation impossible :", nomFichier, e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Generation du PDF impossible", ...(detail ? { detail: message } : {}) },
      { status: 500 }
    );
  }
}
