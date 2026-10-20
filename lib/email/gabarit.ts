// Mise en forme des e-mails de GES Mali : une version texte (lue par les messageries sans HTML)
// et une version HTML. HTML en tableaux et styles en ligne (Gmail, Outlook, Apple Mail),
// largeur fluide jusqu'a 560 px : lisible sur telephone sans zoom. L'action principale est un
// gros bouton ; son lien est repete en petit et se coupe s'il est trop long pour l'ecran.

export type Paragraphe = string | { texte: string; libelleLien: string; lien: string };

export type ContenuEmail = {
  objet: string;
  titre: string;
  apercu: string; // texte affiche apres l'objet dans la liste des messages
  avant: Paragraphe[]; // paragraphes avant le bouton
  bouton?: { libelle: string; lien: string };
  apres?: Paragraphe[]; // paragraphes apres le bouton
  note?: string; // en petit, en bas du message
};

const COULEURS = {
  fond: "#F1F5F9",
  carte: "#FFFFFF",
  bordure: "#E2E8F0",
  marque: "#1E3A5F",
  or: "#E2C17E",
  encre: "#0F172A",
  texte: "#334155",
  discret: "#64748B",
  pale: "#94A3B8",
};
const POLICE = "Arial, Helvetica, sans-serif";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// ─── Texte ──────────────────────────────────────────────────────────────────────

function paragrapheTexte(p: Paragraphe): string {
  return typeof p === "string" ? p : p.texte + " " + p.libelleLien + " : " + p.lien;
}

export function texteEmail(c: ContenuEmail): string {
  return [
    ...c.avant.map(paragrapheTexte),
    ...(c.bouton ? [c.bouton.libelle + " : " + c.bouton.lien] : []),
    ...(c.apres ?? []).map(paragrapheTexte),
    ...(c.note ? [c.note] : []),
  ].join("\n\n");
}

// ─── HTML ───────────────────────────────────────────────────────────────────────

function paragrapheHtml(p: Paragraphe): string {
  const style = `margin:0 0 16px;font-family:${POLICE};font-size:15px;line-height:1.6;color:${COULEURS.texte};`;
  if (typeof p === "string") return `<p style="${style}">${esc(p)}</p>`;
  return (
    `<p style="${style}">${esc(p.texte)} ` +
    `<a href="${esc(p.lien)}" style="color:${COULEURS.marque};font-weight:bold;text-decoration:underline;">${esc(p.libelleLien)}</a></p>`
  );
}

function boutonHtml(b: { libelle: string; lien: string }): string {
  return (
    // Bouton « blinde » : un tableau, pour qu'Outlook garde le fond et l'arrondi
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="bouton" style="margin:8px 0 20px;">` +
    `<tr><td align="center" bgcolor="${COULEURS.marque}" style="border-radius:10px;">` +
    `<a href="${esc(b.lien)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${POLICE};font-size:16px;` +
    `font-weight:bold;line-height:1.2;color:#FFFFFF;text-decoration:none;border-radius:10px;">${esc(b.libelle)}</a>` +
    `</td></tr></table>` +
    `<p style="margin:0 0 20px;font-family:${POLICE};font-size:12px;line-height:1.5;color:${COULEURS.discret};">` +
    `Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :<br>` +
    `<a href="${esc(b.lien)}" style="color:${COULEURS.marque};word-break:break-all;overflow-wrap:anywhere;">${esc(b.lien)}</a></p>`
  );
}

export function htmlEmail(c: ContenuEmail): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(c.objet)}</title>
<style>
  @media (max-width: 600px) {
    .cadre { padding: 16px 8px !important; }
    .carte { padding: 24px 20px !important; border-radius: 12px !important; }
    .titre { font-size: 21px !important; }
    .bouton { width: 100% !important; }
    .bouton a { display: block !important; text-align: center !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${COULEURS.fond};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(c.apercu)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COULEURS.fond};">
<tr><td align="center" class="cadre" style="padding:32px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 4px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="36" height="36" align="center" valign="middle" bgcolor="${COULEURS.marque}" style="border-radius:9px;font-family:Georgia, 'Times New Roman', serif;font-size:18px;font-weight:bold;color:${COULEURS.or};">G</td>
<td style="padding-left:10px;font-family:${POLICE};font-size:16px;font-weight:bold;color:${COULEURS.marque};">GES Mali</td>
</tr></table>
</td></tr>
<tr><td class="carte" style="background:${COULEURS.carte};border:1px solid ${COULEURS.bordure};border-radius:16px;padding:32px;">
<h1 class="titre" style="margin:0 0 16px;font-family:Georgia, 'Times New Roman', serif;font-size:24px;line-height:1.25;font-weight:bold;color:${COULEURS.encre};">${esc(c.titre)}</h1>
${c.avant.map(paragrapheHtml).join("\n")}
${c.bouton ? boutonHtml(c.bouton) : ""}
${(c.apres ?? []).map(paragrapheHtml).join("\n")}
${
  c.note
    ? `<p style="margin:8px 0 0;padding-top:16px;border-top:1px solid ${COULEURS.bordure};font-family:${POLICE};font-size:13px;line-height:1.5;color:${COULEURS.discret};">${esc(c.note)}</p>`
    : ""
}
</td></tr>
<tr><td style="padding:20px 8px 0;text-align:center;font-family:${POLICE};font-size:12px;line-height:1.5;color:${COULEURS.pale};">
GES Mali · gestion d'établissement scolaire<br>Message automatique : merci de ne pas y répondre.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
