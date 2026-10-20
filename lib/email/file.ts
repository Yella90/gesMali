// Envoi d'e-mails : GES Mali depose ses messages dans la table mail_sortant d'une base
// PostgreSQL dediee, commune a vos systemes (MAIL_DATABASE_URL). Une tache planifiee les
// envoie (envoi-mails/envoyer.py). Sans MAIL_DATABASE_URL, aucun e-mail ne part : les
// fonctions qui en dependent (inscription en ligne, mot de passe oublie) restent fermees.

import { Pool } from "pg";

export const SYSTEME = "GES Mali";

const globalPourMail = globalThis as unknown as { poolMail: Pool | undefined };

export function envoiDisponible(): boolean {
  return !!process.env.MAIL_DATABASE_URL;
}

function pool(): Pool {
  if (globalPourMail.poolMail) return globalPourMail.poolMail;
  const url = new URL(process.env.MAIL_DATABASE_URL!);
  const local = ["localhost", "127.0.0.1"].includes(url.hostname);
  url.searchParams.delete("sslmode");
  const p = new Pool({
    connectionString: url.toString(),
    ssl: local ? false : { rejectUnauthorized: process.env.MAIL_DATABASE_SSL_NO_VERIFY !== "1" },
    max: 2,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 15000,
    allowExitOnIdle: true,
  });
  p.on("error", (err) => console.error("[mail pool]", err.message));
  globalPourMail.poolMail = p;
  return p;
}

export type Email = { destinataire: string; objet: string; titre: string; message: string };

export async function deposerEmail(e: Email): Promise<void> {
  if (!envoiDisponible()) throw new Error("L'envoi d'e-mails n'est pas configuré");
  try {
    await pool().query(
      "INSERT INTO mail_sortant (systeme, destinataire, objet, titre, message) VALUES ($1, $2, $3, $4, $5)",
      [SYSTEME, e.destinataire, e.objet, e.titre, e.message]
    );
  } catch (err) {
    // Base d'envoi injoignable : message clair pour l'utilisateur, detail dans les logs
    console.error("[mail]", err);
    throw new Error("L'e-mail n'a pas pu être envoyé pour le moment : réessayez dans quelques minutes");
  }
}
