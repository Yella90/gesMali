import QRCode from "qrcode";
import { CalendarClock, FileText, QrCode, Receipt, UserRoundPlus, Users } from "lucide-react";
import { urlApplication } from "@/lib/portail/acces";
import { AvatarEleve, AvatarEleveGarcon, AvatarEnseignant, AvatarParent } from "./Avatars";
import { Compteur } from "./Compteur";
import s from "./vitrine.module.css";

// Delai d'entree d'un element de la sequence (variable CSS --d)
const d = (ms: number) => ({ "--d": ms + "ms" }) as React.CSSProperties;

// ─── Motif bogolan (tissu malien) en fond du panneau ───

export function Bogolan() {
  return (
    <svg aria-hidden className="absolute inset-0 h-full w-full opacity-[0.08] [mask-image:linear-gradient(to_bottom,transparent,black_40%)]">
      <defs>
        <pattern id="bogolan" width="64" height="64" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="#E2C17E" strokeWidth="1.3" strokeLinecap="round">
            <rect x="6" y="6" width="16" height="16" />
            <rect x="11" y="11" width="6" height="6" />
            <path d="M40 8v14M33 15h14" />
            <path d="M6 50l5-6 5 6 5-6 5 6" />
            <path d="M38 40h18M38 46h18" />
          </g>
          <g fill="#E2C17E">
            <circle cx="8" cy="34" r="1.5" />
            <circle cx="16" cy="34" r="1.5" />
            <circle cx="24" cy="34" r="1.5" />
            <circle cx="47" cy="56" r="1.5" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#bogolan)" />
    </svg>
  );
}

// ─── L'ecole (architecture soudano-sahelienne), le baobab et le drapeau ───

function Ecole({ className }: { className?: string }) {
  const pinaclesAiles = [94, 118, 142, 214, 238, 262];
  const torons = [108, 132, 228, 252];
  return (
    <svg viewBox="0 0 360 240" className={className} role="img" aria-label="Une école en banco avec le drapeau du Mali">
      <ellipse cx="180" cy="228" rx="172" ry="8" fill="#0B1D33" opacity="0.45" />

      {/* Baobab */}
      <g>
        <path d="M30 226c2-30-2-50 7-74h16c9 24 5 44 7 74z" fill="#6B4A2B" />
        <path d="M39 154l-15-24M45 152v-30M51 154l16-26" stroke="#6B4A2B" strokeWidth="5" strokeLinecap="round" />
        <circle cx="22" cy="124" r="11" fill="#2F6B4F" />
        <circle cx="45" cy="114" r="13" fill="#2F6B4F" />
        <circle cx="68" cy="122" r="11" fill="#2F6B4F" />
        <circle cx="40" cy="110" r="6" fill="#3C7D5E" />
      </g>

      {/* Ailes */}
      <rect x="92" y="128" width="196" height="98" fill="#C99A55" />
      <rect x="92" y="212" width="196" height="14" fill="#B4843F" />
      {pinaclesAiles.map((x) => (
        <rect key={x} x={x} y="118" width="10" height="16" rx="5" fill="#C99A55" />
      ))}
      {/* Contreforts */}
      <rect x="88" y="116" width="12" height="110" rx="6" fill="#D4A963" />
      <rect x="280" y="116" width="12" height="110" rx="6" fill="#D4A963" />
      {/* Torons (pieces de bois) */}
      {torons.map((x) => (
        <g key={x} fill="#7A5530">
          <rect x={x} y="142" width="6" height="3" rx="1.5" />
          <rect x={x} y="196" width="6" height="3" rx="1.5" />
        </g>
      ))}
      {/* Fenetres */}
      {[112, 136, 232, 256].map((x) => (
        <path key={x} d={`M${x} 184v-14a7 7 0 0 1 14 0v14z`} fill="#6B4A2B" />
      ))}

      {/* Tour centrale */}
      <rect x="156" y="84" width="68" height="142" fill="#D4A963" />
      {[158, 176, 194, 212].map((x) => (
        <rect key={x} x={x} y="68" width="10" height="22" rx="5" fill="#D4A963" />
      ))}
      {[104, 136, 168].map((y) => (
        <g key={y} fill="#7A5530">
          <rect x="150" y={y} width="8" height="3" rx="1.5" />
          <rect x="222" y={y} width="8" height="3" rx="1.5" />
        </g>
      ))}
      <rect x="166" y="100" width="48" height="19" rx="3" fill="#F8FAFC" />
      <text x="190" y="113.5" textAnchor="middle" fontFamily="var(--font-serif4), Georgia, serif" fontSize="11" fontWeight="600" fill="#1E3A5F">
        École
      </text>
      <path d="M176 226v-26a14 14 0 0 1 28 0v26z" fill="#5E4320" />

      {/* Mat et drapeau du Mali (le drapeau se leve au chargement) */}
      <line x1="320" y1="98" x2="320" y2="226" stroke="#CBD5E1" strokeWidth="2.5" />
      <circle cx="320" cy="96" r="3" fill="#E2C17E" />
      <g className={s.drapeau}>
        <rect x="322" y="102" width="12" height="24" fill="#14B53A" />
        <rect x="334" y="102" width="12" height="24" fill="#FCD116" />
        <rect x="346" y="102" width="12" height="24" fill="#CE1126" />
      </g>
    </svg>
  );
}

// ─── Les documents de l'ecole, avec leurs avatars ───

const ombre = "shadow-[0_22px_45px_-20px_rgba(4,14,30,0.75)]";

function CarteBulletin() {
  const matieres = [
    { nom: "Français", note: 15.5 },
    { nom: "Mathématiques", note: 13 },
    { nom: "Sciences", note: 14.75 },
  ];
  return (
    <div className={"rounded-xl bg-white text-[var(--color-ink)] overflow-hidden " + ombre}>
      <div className="flex items-center gap-2.5 bg-[var(--color-brand-soft)] px-3 py-2.5">
        <AvatarEleve className="h-8 w-8" />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-tight">Awa Traoré</p>
          <p className="text-[11px] text-[var(--color-ink-muted)]">6e A, bulletin du 1er trimestre</p>
        </div>
      </div>
      <ul className="space-y-1.5 px-3 py-2.5">
        {matieres.map((m, i) => (
          <li key={m.nom} className="flex items-center gap-2 text-[11px]">
            <span className="w-[5.5rem] shrink-0 text-[var(--color-ink-muted)]">{m.nom}</span>
            <span className="h-1.5 flex-1 rounded-full bg-[var(--color-surface)]">
              <span
                className={"block h-full rounded-full bg-[var(--color-brand)] " + s.barre}
                style={{ width: (m.note / 20) * 100 + "%", ...d(700 + i * 120) }}
              />
            </span>
            <span className="w-9 text-right font-medium tnum">
              {m.note.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-end justify-between border-t border-[var(--color-border)] px-3 py-2">
        <div>
          <p className="text-[11px] text-[var(--color-ink-muted)]">Moyenne générale</p>
          <p className="font-serif text-[22px] font-semibold leading-none text-[var(--color-brand)]">
            <Compteur valeur={14.25} delai={900} />
            <span className="ml-0.5 font-sans text-[11px] font-normal text-[var(--color-ink-muted)]">/20</span>
          </p>
        </div>
        <p className="rounded-md bg-[var(--color-gold-soft)] px-2 py-0.5 text-[11px] font-medium text-[#7A5A1F]">3e sur 42</p>
      </div>
    </div>
  );
}

function CarteEmploiDuTemps() {
  return (
    <div className={"rounded-xl bg-white p-3 text-[var(--color-ink)] " + ombre}>
      <div className="mb-2 flex items-center gap-2">
        <AvatarEnseignant className="h-7 w-7" />
        <div>
          <p className="text-[12.5px] font-semibold leading-tight">Lundi, 6e A</p>
          <p className="text-[11px] text-[var(--color-ink-muted)]">M. Coulibaly, mathématiques</p>
        </div>
      </div>
      <ul className="space-y-1 text-[11.5px]">
        <li className="flex items-center gap-2">
          <span className="w-9 text-[11px] text-[var(--color-ink-muted)] tnum">08h</span>
          <span className="flex-1 rounded-md bg-[var(--color-brand-soft)] px-2 py-1 text-[var(--color-brand)]">Français</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="w-9 text-[11px] text-[var(--color-ink-muted)] tnum">10h</span>
          <span className="flex flex-1 items-center justify-between rounded-md bg-[var(--color-accent-soft)] px-2 py-1 font-medium text-[var(--color-accent)]">
            Mathématiques
            <span className="flex items-center gap-1.5 text-[10.5px] font-normal">
              <span className={"h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] " + s.pouls} />
              en cours
            </span>
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span className="w-9 text-[11px] text-[var(--color-ink-muted)] tnum">15h</span>
          <span className="flex-1 rounded-md bg-[var(--color-gold-soft)] px-2 py-1 text-[#7A5A1F]">Sciences</span>
        </li>
      </ul>
    </div>
  );
}

function CarteRecu() {
  return (
    <div className={"relative " + ombre}>
      {/* Bord detache du carnet de recus */}
      <div aria-hidden className="h-2 bg-[radial-gradient(circle_at_6px_0,transparent_4px,#ffffff_4.5px)] bg-[length:12px_8px]" />
      <div className="relative rounded-b-xl bg-white px-3 pb-3 pt-1.5 text-[var(--color-ink)]">
        <p className="text-[11px] text-[var(--color-ink-muted)]">Reçu n° 2026-00128</p>
        <div className="mt-1.5 flex items-center gap-2">
          <AvatarEleveGarcon className="h-7 w-7" />
          <div>
            <p className="text-[12.5px] font-semibold leading-tight">Moussa Diarra</p>
            <p className="text-[11px] text-[var(--color-ink-muted)]">Scolarité d&apos;octobre</p>
          </div>
        </div>
        <p className="mt-2 font-serif text-[21px] font-semibold leading-none tnum">15 000 F</p>
        <span
          className={
            "absolute bottom-2.5 right-3 rounded-md border-2 border-[var(--color-accent)] px-2 py-0.5 text-[13px] font-bold tracking-wide text-[var(--color-accent)] " +
            s.tampon
          }
        >
          Payé
        </span>
      </div>
    </div>
  );
}

function CarteParent({ qr }: { qr: string }) {
  return (
    <div className={"flex items-center gap-3 rounded-xl bg-white p-3 text-[var(--color-ink)] " + ombre}>
      <div
        aria-hidden
        className="h-[60px] w-[60px] shrink-0 rounded-md border border-[var(--color-border)] p-1 [&>svg]:h-full [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: qr }}
      />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <AvatarParent className="h-7 w-7" />
          <p className="text-[12.5px] font-semibold leading-tight">Mme Keïta</p>
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-[var(--color-ink-muted)]">
          Le bulletin de sa fille est disponible dans l&apos;espace parent.
        </p>
      </div>
    </div>
  );
}

export async function Scene({ className = "" }: { className?: string }) {
  // Vrai QR code : il mene a l'application
  const qr = await QRCode.toString(await urlApplication(), { type: "svg", margin: 0, color: { dark: "#0F172A", light: "#FFFFFF" } });
  return (
    <div className={"relative h-[25rem] " + className}>
      <div className={"absolute inset-x-0 bottom-0 mx-auto w-[74%] max-w-[440px] " + s.ecole}>
        <Ecole className="w-full" />
      </div>
      <div className={"absolute left-0 top-0 w-[14.5rem] " + s.flotte} style={d(400)}>
        <CarteBulletin />
      </div>
      <div className={"absolute right-0 top-8 w-[15rem] " + s.flotte} style={d(650)}>
        <CarteEmploiDuTemps />
      </div>
      <div className={"absolute bottom-0 left-0 w-[14.5rem] " + s.flotte} style={d(1150)}>
        <CarteParent qr={qr} />
      </div>
      <div className={"absolute bottom-4 right-2 w-[12.5rem] " + s.flotte} style={d(900)}>
        <CarteRecu />
      </div>
    </div>
  );
}

// ─── Les personnes (version compacte, ecrans etroits) ───

export function Personnes() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2.5">
        {[AvatarEleve, AvatarEnseignant, AvatarParent, AvatarEleveGarcon].map((A, i) => (
          <A key={i} className={"h-10 w-10 ring-2 ring-[var(--color-brand)] " + s.entree} />
        ))}
      </div>
      <p className="text-sm text-white/75">Élèves, enseignants, parents et administration sur le même outil.</p>
    </div>
  );
}

// ─── Cycles : une vraie progression ───

const CYCLES = [
  { nom: "Préscolaire", niveaux: "Petite, moyenne et grande section" },
  { nom: "Premier cycle", niveaux: "De la 1re à la 6e année" },
  { nom: "Second cycle", niveaux: "De la 7e à la 9e année" },
];

export function Cycles() {
  return (
    <section aria-labelledby="titre-cycles">
      <h3 id="titre-cycles" className="font-serif text-lg font-semibold">
        Une seule école, tous les cycles
      </h3>
      <ol className="relative mt-4 grid gap-4 sm:grid-cols-3 sm:gap-6">
        {/* Le fil qui relie les cycles */}
        <span aria-hidden className="absolute left-[11px] top-3 bottom-3 w-px bg-white/20 sm:bottom-auto sm:left-3 sm:right-3 sm:top-[11px] sm:h-px sm:w-auto" />
        {CYCLES.map((c, i) => (
          <li key={c.nom} className="relative flex gap-3 sm:block">
            <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[#E2C17E] bg-[var(--color-brand)] text-[11px] font-semibold text-[#E2C17E] tnum">
              {i + 1}
            </span>
            <div className="sm:mt-3">
              <p className="text-sm font-semibold">{c.nom}</p>
              <p className="text-xs text-white/60">{c.niveaux}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ─── Ce que l'outil gere ───

const FONCTIONS = [
  { icone: UserRoundPlus, titre: "Inscriptions", texte: "Dossier de l'élève, matricule et fiche d'inscription imprimable." },
  { icone: FileText, titre: "Notes et bulletins", texte: "Moyennes, rangs et bulletins PDF calculés automatiquement." },
  { icone: Receipt, titre: "Frais de scolarité", texte: "Échéances mensuelles, reçus, impayés et rappels aux parents." },
  { icone: CalendarClock, titre: "Emploi du temps", texte: "Cours et enseignants de chaque classe, jour par jour." },
  { icone: Users, titre: "Personnel et paie", texte: "Fiches du personnel, rôles et paiements des salaires." },
  { icone: QrCode, titre: "Espace parent", texte: "Notes et bulletins consultables par simple QR code." },
];

export function Fonctionnalites() {
  return (
    <section aria-labelledby="titre-fonctions">
      <h3 id="titre-fonctions" className="font-serif text-lg font-semibold">
        Tout l&apos;établissement au même endroit
      </h3>
      <ul className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {FONCTIONS.map((f) => (
          <li key={f.titre} className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-[#E2C17E]">
              <f.icone className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium">{f.titre}</p>
              <p className="text-xs leading-relaxed text-white/60">{f.texte}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── Les documents en bande defilante (ecrans etroits) ───

export async function DocumentsDefilants({ className = "" }: { className?: string }) {
  const qr = await QRCode.toString(await urlApplication(), { type: "svg", margin: 0, color: { dark: "#0F172A", light: "#FFFFFF" } });
  const cartes = [
    { cle: "bulletin", el: <CarteBulletin />, delai: 300 },
    { cle: "edt", el: <CarteEmploiDuTemps />, delai: 450 },
    { cle: "recu", el: <CarteRecu />, delai: 600 },
    { cle: "parent", el: <CarteParent qr={qr} />, delai: 750 },
  ];
  return (
    <ul
      aria-label="Exemples de documents gérés par GES Mali"
      className={"-mx-6 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 pb-6 pt-2 sm:scroll-px-10 [scrollbar-width:none] sm:-mx-10 sm:px-10 " + className}
    >
      {cartes.map((c) => (
        <li key={c.cle} className={"w-[15rem] shrink-0 snap-start " + s.entree} style={d(c.delai)}>
          {c.el}
        </li>
      ))}
    </ul>
  );
}
