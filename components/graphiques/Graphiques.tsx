// Graphiques du tableau de bord, rendus cote serveur (SVG + HTML, aucun JS) :
// pas de bibliotheque a telecharger, ce qui compte sur une connexion lente.
// Regles : barres <= 24px a bout arrondi, trait de 2px, aire a 10 %, grille en
// filet discret, legende des que 2 series, infobulle au survol ET au focus,
// tableau des donnees accessible sous chaque graphique.

import { AlertCircle, CheckCircle2, MinusCircle } from "lucide-react";

export type Serie = { nom: string; couleur: string };

// Couleurs validees (scripts/validate_palette.js, surface blanche) : contraste,
// separation daltonisme et luminosite OK
export const COULEURS = { prevu: "#3A6EA5", reel: "#C9862A" } as const;

const compact = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });
export const fcfa = (n: number) => n.toLocaleString("fr-FR") + " F";

// Graduation "propre" de l'axe : 0, 1/2, max arrondi
function graduations(max: number): number[] {
  if (max <= 0) return [0];
  // Pas de 1, 2, 2,5 ou 5 x 10^n pour environ 4 intervalles
  const brut = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(brut)));
  const n = brut / mag;
  const pas = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  const haut = Math.ceil(max / pas) * pas;
  const g: number[] = [];
  for (let v = 0; v <= haut + 1e-9; v += pas) g.push(v);
  return g;
}

function Legende({ series, forme = "barre" }: { series: Serie[]; forme?: "barre" | "ligne" }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-ink-muted)]">
      {series.map((s) => (
        <li key={s.nom} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={forme === "barre" ? "h-2.5 w-2.5 rounded-[3px]" : "h-[2px] w-3.5 rounded-full"}
            style={{ background: s.couleur }}
          />
          {s.nom}
        </li>
      ))}
    </ul>
  );
}

function TableDonnees({ titre, colonnes, lignes }: { titre: string; colonnes: string[]; lignes: (string | number)[][] }) {
  return (
    <details className="mt-3 text-xs">
      <summary className="cursor-pointer text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">Voir les données</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full tnum">
          <caption className="sr-only">{titre}</caption>
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-ink-muted)]">
              {colonnes.map((c, i) => (
                <th key={c} scope="col" className={"py-1.5 font-medium " + (i > 0 ? "text-right" : "")}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, i) => (
              <tr key={i} className="border-b border-[var(--color-border)] last:border-0">
                {l.map((v, j) => (
                  <td key={j} className={"py-1.5 " + (j > 0 ? "text-right" : "")}>
                    {typeof v === "number" ? fcfa(v) : v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

// Infobulle : la valeur d'abord, le nom de la serie ensuite, cle en trait
function Infobulle({
  titre,
  lignes,
  position,
}: {
  titre: string;
  lignes: { serie: Serie; valeur: number }[];
  position: "debut" | "milieu" | "fin";
}) {
  const place =
    position === "debut" ? "left-0" : position === "fin" ? "right-0" : "left-1/2 -translate-x-1/2";
  return (
    <div
      role="tooltip"
      className={
        "pointer-events-none absolute -top-2 z-20 hidden -translate-y-full whitespace-nowrap rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-xs shadow-[0_8px_24px_-8px_rgba(15,23,42,0.25)] group-hover:block group-focus-visible:block " +
        place
      }
    >
      <p className="mb-1 text-[var(--color-ink-muted)]">{titre}</p>
      {lignes.map((l) => (
        <p key={l.serie.nom} className="flex items-center gap-2">
          <span aria-hidden className="h-[2px] w-3 rounded-full" style={{ background: l.serie.couleur }} />
          <span className="font-semibold text-[var(--color-ink)] tnum">{fcfa(l.valeur)}</span>
          <span className="text-[var(--color-ink-muted)]">{l.serie.nom}</span>
        </p>
      ))}
    </div>
  );
}

// Libelle complet sur grand ecran, court sur telephone
function LibelleAxe({ libelle, court }: { libelle: string; court?: string }) {
  if (!court) return <>{libelle}</>;
  return (
    <>
      <span className="sm:hidden">{court}</span>
      <span className="hidden sm:inline">{libelle}</span>
    </>
  );
}

function position(i: number, n: number): "debut" | "milieu" | "fin" {
  return i === 0 ? "debut" : i === n - 1 ? "fin" : "milieu";
}

// ─── Barres groupees ───

export function BarresGroupees({
  titre,
  series,
  categories,
  hauteur = "h-56",
}: {
  titre: string;
  series: Serie[];
  categories: { libelle: string; court?: string; valeurs: number[] }[];
  hauteur?: string;
}) {
  const max = Math.max(0, ...categories.flatMap((c) => c.valeurs));
  const g = graduations(max);
  const haut = g[g.length - 1] || 1;

  return (
    <figure>
      <Legende series={series} />
      <div className={"mt-4 flex " + hauteur}>
        {/* Axe Y */}
        <div aria-hidden className="relative w-11 shrink-0 text-[10.5px] text-[var(--color-ink-faint)] tnum">
          {g.map((v) => (
            <span key={v} className="absolute right-2 translate-y-1/2" style={{ bottom: (v / haut) * 100 + "%" }}>
              {compact.format(v)}
            </span>
          ))}
        </div>
        {/* Zone de trace */}
        <div className="relative flex-1">
          {g.map((v) => (
            <div
              key={v}
              aria-hidden
              className={"absolute inset-x-0 h-px " + (v === 0 ? "bg-[#c3c2b7]" : "bg-[#eceae4]")}
              style={{ bottom: (v / haut) * 100 + "%" }}
            />
          ))}
          <div className="absolute inset-0 flex">
            {categories.map((c, i) => (
              <div
                key={c.libelle}
                tabIndex={0}
                aria-label={c.libelle + " : " + series.map((s, j) => s.nom + " " + fcfa(c.valeurs[j])).join(", ")}
                className="group relative flex flex-1 items-end justify-center gap-[2px] rounded-md outline-none hover:bg-[var(--color-surface)] focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]"
              >
                {series.map((s, j) => (
                  <div
                    key={s.nom}
                    className="w-[min(24px,30%)] rounded-t-[4px] group-hover:brightness-110"
                    style={{
                      height: c.valeurs[j] > 0 ? Math.max(1.5, (c.valeurs[j] / haut) * 100) + "%" : 0,
                      background: s.couleur,
                    }}
                  />
                ))}
                <Infobulle
                  titre={c.libelle}
                  lignes={series.map((s, j) => ({ serie: s, valeur: c.valeurs[j] }))}
                  position={position(i, categories.length)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Axe X */}
      <div aria-hidden className="ml-11 mt-1.5 flex text-[11px] text-[var(--color-ink-muted)]">
        {categories.map((c) => (
          <span key={c.libelle} className="flex-1 truncate text-center">
            <LibelleAxe libelle={c.libelle} court={c.court} />
          </span>
        ))}
      </div>
      <TableDonnees
        titre={titre}
        colonnes={["", ...series.map((s) => s.nom)]}
        lignes={categories.map((c) => [c.libelle, ...c.valeurs])}
      />
    </figure>
  );
}

// ─── Courbe avec aire (une serie, peut passer sous zero) ───

export function CourbeAire({
  titre,
  serie,
  points,
  hauteur = "h-56",
}: {
  titre: string;
  serie: Serie;
  points: { libelle: string; court?: string; valeur: number }[];
  hauteur?: string;
}) {
  const valeurs = points.map((p) => p.valeur);
  const maxAbs = Math.max(1, ...valeurs.map(Math.abs));
  const aNegatif = valeurs.some((v) => v < 0);
  const g = graduations(maxAbs);
  const haut = g[g.length - 1] || 1;
  const bas = aNegatif ? -haut : 0;
  const etendue = haut - bas;
  const n = points.length;
  // Abscisse au centre de chaque colonne (meme repere que les barres)
  const x = (i: number) => ((i + 0.5) / n) * 100;
  const y = (v: number) => ((haut - v) / etendue) * 100;
  const ligne = points.map((p, i) => (i ? "L" : "M") + x(i) + " " + y(p.valeur)).join(" ");
  const aire = ligne + " L" + x(n - 1) + " " + y(0) + " L" + x(0) + " " + y(0) + " Z";
  const graduationsY = aNegatif ? [...g.slice(1).reverse().map((v) => -v), ...g] : g;
  const dernier = points[n - 1];

  return (
    <figure>
      <div className={"mt-4 flex " + hauteur}>
        <div aria-hidden className="relative w-11 shrink-0 text-[10.5px] text-[var(--color-ink-faint)] tnum">
          {graduationsY.map((v) => (
            <span key={v} className="absolute right-2 -translate-y-1/2" style={{ top: y(v) + "%" }}>
              {compact.format(v)}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {graduationsY.map((v) => (
            <div
              key={v}
              aria-hidden
              className={"absolute inset-x-0 h-px " + (v === 0 ? "bg-[#c3c2b7]" : "bg-[#eceae4]")}
              style={{ top: y(v) + "%" }}
            />
          ))}
          <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            <path d={aire} fill={serie.couleur} opacity="0.1" />
            <path d={ligne} fill="none" stroke={serie.couleur} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
          {/* Point et valeur du dernier mois (etiquette selective) */}
          {dernier && (
            <>
              <span
                aria-hidden
                className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
                style={{ left: x(n - 1) + "%", top: y(dernier.valeur) + "%", background: serie.couleur }}
              />
            </>
          )}
          {/* Colonnes de survol : reticule + infobulle */}
          <div className="absolute inset-0 flex">
            {points.map((p, i) => (
              <div
                key={p.libelle}
                tabIndex={0}
                aria-label={p.libelle + " : " + serie.nom + " " + fcfa(p.valeur)}
                className="group relative flex-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]"
              >
                <span aria-hidden className="absolute inset-y-0 left-1/2 hidden w-px bg-[#c3c2b7] group-hover:block group-focus-visible:block" />
                <span
                  aria-hidden
                  className="absolute left-1/2 hidden h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white group-hover:block group-focus-visible:block"
                  style={{ top: y(p.valeur) + "%", background: serie.couleur }}
                />
                <Infobulle titre={p.libelle} lignes={[{ serie, valeur: p.valeur }]} position={position(i, n)} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div aria-hidden className="ml-11 mt-1.5 flex text-[11px] text-[var(--color-ink-muted)]">
        {points.map((p) => (
          <span key={p.libelle} className="flex-1 truncate text-center">
            <LibelleAxe libelle={p.libelle} court={p.court} />
          </span>
        ))}
      </div>
      <TableDonnees titre={titre} colonnes={["", serie.nom]} lignes={points.map((p) => [p.libelle, p.valeur])} />
    </figure>
  );
}

// ─── Anneau de statuts (situation des eleves) ───

// Palette de statut reservee : jamais reutilisee pour une serie
const STATUTS = {
  bon: { couleur: "#0ca30c", Icone: CheckCircle2 },
  critique: { couleur: "#d03b3b", Icone: AlertCircle },
  neutre: { couleur: "#a8a29e", Icone: MinusCircle },
} as const;

export function AnneauStatuts({
  segments,
  unite,
}: {
  segments: { libelle: string; valeur: number; statut: keyof typeof STATUTS }[];
  unite: string;
}) {
  const total = segments.reduce((s, x) => s + x.valeur, 0);
  const r = 46;
  const c = 2 * Math.PI * r;
  const ecart = 2.4; // filet de surface entre segments
  let decalage = 0;
  const visibles = segments.filter((s) => s.valeur > 0);

  return (
    <figure className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="60" cy="60" r={r} fill="none" stroke="#f1f0ec" strokeWidth="14" />
          {total > 0 &&
            visibles.map((s) => {
              const longueur = (s.valeur / total) * c;
              const trait = Math.max(0, longueur - (visibles.length > 1 ? ecart : 0));
              const el = (
                <circle
                  key={s.libelle}
                  cx="60"
                  cy="60"
                  r={r}
                  fill="none"
                  stroke={STATUTS[s.statut].couleur}
                  strokeWidth="14"
                  strokeDasharray={trait + " " + (c - trait)}
                  strokeDashoffset={-decalage}
                />
              );
              decalage += longueur;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold leading-none">{total}</span>
          <span className="mt-1 text-[11px] text-[var(--color-ink-muted)]">{unite}</span>
        </div>
      </div>
      <ul className="w-full space-y-2 text-sm">
        {segments.map((s) => {
          const { couleur, Icone } = STATUTS[s.statut];
          const pct = total > 0 ? Math.round((s.valeur / total) * 100) : 0;
          return (
            <li key={s.libelle} className="flex items-center gap-2.5">
              <Icone aria-hidden className="h-4 w-4 shrink-0" style={{ color: couleur }} strokeWidth={2} />
              <span className="flex-1 text-[var(--color-ink)]">{s.libelle}</span>
              <span className="font-semibold tnum">{s.valeur}</span>
              <span className="w-10 text-right text-xs text-[var(--color-ink-muted)] tnum">{pct} %</span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}

// ─── Carte de graphique ───

export function CarteGraphique({
  titre,
  sousTitre,
  action,
  children,
  className = "",
}: {
  titre: string;
  sousTitre?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={"rounded-xl border border-[var(--color-border)] bg-white p-5 " + className}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{titre}</h2>
          {sousTitre && <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{sousTitre}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
