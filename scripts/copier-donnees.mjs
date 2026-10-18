// Copie toutes les donnees GES Mali d'une base vers une autre (schema deja cree
// par les migrations, et vide). Sert a deplacer une instance (ex. demo Neon -> Supabase).
//
//   SOURCE_URL=... SOURCE_SCHEMA=public CIBLE_URL=... CIBLE_SCHEMA=ges_mali node scripts/copier-donnees.mjs
//
// Lecture seule sur la source. La copie se fait dans une transaction sur la cible :
// en cas d'erreur, rien n'est ecrit.

import pg from "pg";

const { SOURCE_URL, CIBLE_URL } = process.env;
const SOURCE_SCHEMA = process.env.SOURCE_SCHEMA || "public";
const CIBLE_SCHEMA = process.env.CIBLE_SCHEMA || "public";
if (!SOURCE_URL || !CIBLE_URL) throw new Error("SOURCE_URL et CIBLE_URL requis");
for (const s of [SOURCE_SCHEMA, CIBLE_SCHEMA]) if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw new Error("schema invalide : " + s);

// Dates rendues telles quelles (texte) : aucune conversion de fuseau horaire
pg.types.setTypeParser(1114, (v) => v); // timestamp
pg.types.setTypeParser(1184, (v) => v); // timestamptz

// Ordre compatible avec les cles etrangeres
const TABLES = [
  "Etablissement", "ParametresEtablissement", "Employe", "User", "AnneeScolaire", "Trimestre",
  "Matiere", "Classe", "Eleve", "Affectation", "Note", "Bulletin", "BulletinLigne", "Paiement",
  "FraisScolarite", "TrancheFrais", "PaiementFrais", "Rappel", "AuditLog", "InscriptionAnnuelle",
];
const LOT = 500;

function client(url) {
  const u = new URL(url);
  for (const p of ["sslmode", "channel_binding", "schema", "pgbouncer"]) u.searchParams.delete(p);
  const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
  // SSL_NO_VERIFY=1 : chiffre sans verifier le certificat (ex. Supabase sans son CA)
  const verifier = process.env.SSL_NO_VERIFY !== "1";
  return new pg.Client({ connectionString: u.toString(), ssl: local ? false : { rejectUnauthorized: verifier } });
}

const q = (schema, table) => '"' + schema + '"."' + table + '"';

const src = client(SOURCE_URL);
const dst = client(CIBLE_URL);
await src.connect();
await dst.connect();

try {
  // La cible doit etre vide pour eviter les doublons
  for (const t of TABLES) {
    const { rows } = await dst.query("SELECT count(*)::int AS n FROM " + q(CIBLE_SCHEMA, t));
    if (rows[0].n > 0) throw new Error("La table cible " + t + " n'est pas vide (" + rows[0].n + " lignes)");
  }

  // Types des colonnes cibles (casts explicites : enums, tableaux d'enums, jsonb)
  const colonnes = {};
  const { rows: cols } = await dst.query(
    `SELECT table_name, column_name, format_type(a.atttypid, a.atttypmod) AS type
     FROM information_schema.columns c
     JOIN pg_attribute a ON a.attrelid = (quote_ident(c.table_schema) || '.' || quote_ident(c.table_name))::regclass
                        AND a.attname = c.column_name
     WHERE c.table_schema = $1 ORDER BY c.ordinal_position`,
    [CIBLE_SCHEMA]
  );
  for (const c of cols) (colonnes[c.table_name] ??= []).push({ nom: c.column_name, type: c.type });

  await dst.query("BEGIN");
  await dst.query("SET LOCAL search_path TO " + CIBLE_SCHEMA);
  const bilan = [];
  for (const t of TABLES) {
    const defs = colonnes[t];
    if (!defs) throw new Error("Table absente de la cible : " + t);
    const liste = defs.map((c) => '"' + c.nom + '"').join(", ");
    const { rows } = await src.query("SELECT " + liste + " FROM " + q(SOURCE_SCHEMA, t));

    for (let i = 0; i < rows.length; i += LOT) {
      const lot = rows.slice(i, i + LOT);
      const valeurs = [];
      const tuples = lot.map((r) =>
        "(" +
        defs
          .map((c) => {
            let v = r[c.nom];
            if (v !== null && c.type === "jsonb") v = JSON.stringify(v);
            if (Array.isArray(v)) v = "{" + v.join(",") + "}";
            valeurs.push(v);
            return "$" + valeurs.length + "::" + c.type;
          })
          .join(", ") +
        ")"
      );
      await dst.query("INSERT INTO " + q(CIBLE_SCHEMA, t) + " (" + liste + ") VALUES " + tuples.join(", "), valeurs);
    }
    bilan.push(t + " " + rows.length);
    console.log("  " + t.padEnd(24) + String(rows.length).padStart(6));
  }

  // Controle : memes nombres de lignes des deux cotes
  for (const t of TABLES) {
    const a = (await src.query("SELECT count(*)::int AS n FROM " + q(SOURCE_SCHEMA, t))).rows[0].n;
    const b = (await dst.query("SELECT count(*)::int AS n FROM " + q(CIBLE_SCHEMA, t))).rows[0].n;
    if (a !== b) throw new Error("Ecart sur " + t + " : source " + a + ", cible " + b);
  }
  await dst.query("COMMIT");
  console.log("OK : " + TABLES.length + " tables copiees et verifiees");
} catch (e) {
  await dst.query("ROLLBACK").catch(() => {});
  console.error("ECHEC, rien n'a ete ecrit :", e.message);
  process.exitCode = 1;
} finally {
  await src.end();
  await dst.end();
}
