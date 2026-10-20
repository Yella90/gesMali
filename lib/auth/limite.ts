// Limite les tentatives de connexion echouees, en base (table EchecConnexion) : le
// compteur est commun a tous les serveurs. Sur 15 minutes :
// - 5 echecs pour un meme e-mail bloquent ce compte ;
// - 50 echecs depuis une meme adresse IP la bloquent, quels que soient les comptes
//   essayes (une ecole, un cybercafe ou un operateur mobile partagent souvent la meme
//   adresse : le seuil reste large pour ne pas gener les utilisateurs honnetes).

import { prisma, DB_SCHEMA } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";

const FENETRE_MS = 15 * 60 * 1000;
const JOUR_MS = 24 * 3600 * 1000;
export const MAX_ECHECS = { email: 5, ip: 50 };

const T = Prisma.raw('"' + DB_SCHEMA + '"."EchecConnexion"');

function cles(email: string, ip: string | null) {
  return ["email:" + email.trim().toLowerCase(), ...(ip ? ["ip:" + ip] : [])];
}

// Adresse du client : en-tetes poses par l'hebergeur (Vercel remplace ceux du client)
export function adresseIp(headers: Headers): string | null {
  const ip = headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0];
  return ip?.trim() || null;
}

export async function connexionBloquee(email: string, ip: string | null, maintenant = new Date()): Promise<boolean> {
  const lignes = await prisma.echecConnexion.findMany({
    where: { cle: { in: cles(email, ip) }, depuis: { gt: new Date(maintenant.getTime() - FENETRE_MS) } },
  });
  return lignes.some((l) => l.nombre >= (l.cle.startsWith("ip:") ? MAX_ECHECS.ip : MAX_ECHECS.email));
}

// Une requete atomique : nouvelle fenetre si la precedente est ecoulee, sinon +1
async function incrementer(cle: string, fenetreMs: number, maintenant: Date) {
  const debutFenetre = new Date(maintenant.getTime() - fenetreMs);
  await prisma.$executeRaw`
    INSERT INTO ${T} AS e ("cle", "nombre", "depuis") VALUES (${cle}, 1, ${maintenant})
    ON CONFLICT ("cle") DO UPDATE SET
      "nombre" = CASE WHEN e."depuis" <= ${debutFenetre} THEN 1 ELSE e."nombre" + 1 END,
      "depuis" = CASE WHEN e."depuis" <= ${debutFenetre} THEN ${maintenant} ELSE e."depuis" END
  `;
}

export async function noterEchec(email: string, ip: string | null, maintenant = new Date()) {
  for (const cle of cles(email, ip)) await incrementer(cle, FENETRE_MS, maintenant);
  // Menage : lignes de plus d'un jour
  await prisma.echecConnexion.deleteMany({ where: { depuis: { lt: new Date(maintenant.getTime() - JOUR_MS) } } });
}

// Connexion reussie : le compteur du compte repart a zero (pas celui de l'adresse,
// partagee avec d'autres personnes)
export async function effacerEchecs(email: string) {
  await prisma.echecConnexion.deleteMany({ where: { cle: cles(email, null)[0] } });
}

// Inscription d'une ecole en ligne : 5 par jour au plus depuis une meme adresse IP
export const MAX_INSCRIPTIONS_PAR_JOUR = 5;

export async function inscriptionAutorisee(ip: string | null, maintenant = new Date()): Promise<boolean> {
  if (!ip) return true;
  const l = await prisma.echecConnexion.findUnique({ where: { cle: "inscription:" + ip } });
  return !l || l.depuis.getTime() <= maintenant.getTime() - JOUR_MS || l.nombre < MAX_INSCRIPTIONS_PAR_JOUR;
}

export async function noterInscription(ip: string | null, maintenant = new Date()) {
  if (ip) await incrementer("inscription:" + ip, JOUR_MS, maintenant);
}

// Envois d'e-mails demandes depuis une page publique (mot de passe oublie, confirmation,
// inscription) : 10 par heure depuis une meme adresse IP, 3 par heure pour une meme adresse e-mail
export const MAX_ENVOIS = { ip: 10, email: 3 };
const HEURE_MS = 3600 * 1000;

export async function envoiAutorise(ip: string | null, email: string, maintenant = new Date()): Promise<boolean> {
  const cles = [{ cle: "envoi:email:" + email.trim().toLowerCase(), max: MAX_ENVOIS.email }];
  if (ip) cles.push({ cle: "envoi:ip:" + ip, max: MAX_ENVOIS.ip });
  const lignes = await prisma.echecConnexion.findMany({
    where: { cle: { in: cles.map((c) => c.cle) }, depuis: { gt: new Date(maintenant.getTime() - HEURE_MS) } },
  });
  if (lignes.some((l) => l.nombre >= (cles.find((c) => c.cle === l.cle)?.max ?? 0))) return false;
  for (const c of cles) await incrementer(c.cle, HEURE_MS, maintenant);
  return true;
}
