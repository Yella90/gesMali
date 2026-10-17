// Acces parent : chaque eleve a un code secret (lien + QR code sur la fiche
// d'inscription). Le code suffit pour consulter le profil, les notes validees
// et les bulletins de l'eleve : il doit etre long et aleatoire, et peut etre
// regenere par l'etablissement (l'ancien lien cesse alors de fonctionner).

import { randomBytes } from "crypto";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";

// 18 octets = 144 bits d'entropie, 24 caracteres base64url
export function genererCodeParent(): string {
  return randomBytes(18).toString("base64url");
}

// Format attendu d'un code (evite une requete pour une URL fantaisiste)
export function codeParentValide(code: string): boolean {
  return /^[A-Za-z0-9_-]{24}$/.test(code);
}

// Retourne le code de l'eleve, en le creant s'il n'existe pas encore
// (eleves inscrits avant la mise en place du portail).
export async function assurerCodeParent(eleveId: string): Promise<string> {
  const eleve = await prisma.eleve.findUniqueOrThrow({
    where: { id: eleveId },
    select: { codeParent: true },
  });
  if (eleve.codeParent) return eleve.codeParent;

  // updateMany conditionnel : si deux requetes arrivent en meme temps, une seule ecrit
  await prisma.eleve.updateMany({
    where: { id: eleveId, codeParent: null },
    data: { codeParent: genererCodeParent() },
  });
  const apres = await prisma.eleve.findUniqueOrThrow({
    where: { id: eleveId },
    select: { codeParent: true },
  });
  return apres.codeParent!;
}

// URL publique de l'application : APP_URL (production), sinon AUTH_URL,
// sinon l'hote de la requete en cours.
export async function urlApplication(): Promise<string> {
  const env = process.env.APP_URL || process.env.AUTH_URL;
  if (env) return env.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return proto + "://" + host;
}

export async function urlPortailParent(code: string): Promise<string> {
  return (await urlApplication()) + "/parent/" + code;
}

export function qrCodeSvg(texte: string): Promise<string> {
  return QRCode.toString(texte, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
}

export function qrCodeDataUrl(texte: string): Promise<string> {
  return QRCode.toDataURL(texte, { margin: 1, width: 300, errorCorrectionLevel: "M" });
}
