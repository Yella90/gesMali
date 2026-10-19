import { cache } from "react";
import { prisma, DB_SCHEMA } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";

// Nom de l'etablissement et adresse de son logo, sans charger l'image elle-meme :
// la version (empreinte md5 calculee par la base) change a chaque nouveau logo.
export const identiteEtablissement = cache(async (etablissementId: string) => {
  const [e] = await prisma.$queryRaw<{ nom: string; version: string | null }[]>`
    SELECT nom, md5(logo) AS version
    FROM ${Prisma.raw('"' + DB_SCHEMA + '"."Etablissement"')}
    WHERE id = ${etablissementId}`;
  return {
    nom: e?.nom ?? "GES Mali",
    logo: e?.version ? "/api/etablissements/" + etablissementId + "/logo?v=" + e.version.slice(0, 12) : null,
  };
});

// Data URL "data:image/png;base64,..." vers octets et type
export function decoderLogo(logo: string): { type: string; octets: Buffer } | null {
  const m = logo.match(/^data:(image\/(?:png|jpeg));base64,(.+)$/);
  return m ? { type: m[1], octets: Buffer.from(m[2], "base64") } : null;
}
