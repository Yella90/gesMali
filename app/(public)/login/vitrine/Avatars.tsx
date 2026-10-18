// Avatars illustres (SVG) des personnes qui utilisent GES Mali.
// Formes simples, tons de peau et tenues d'ecole malienne (uniforme kaki / bleu).

type Props = { className?: string; titre?: string };

function Cadre({ fond, titre, className, children }: { fond: string; titre?: string; className?: string; children: React.ReactNode }) {
  // Decoupe ronde en CSS : pas d'identifiant SVG partage entre plusieurs avatars
  return (
    <span className={"inline-block shrink-0 overflow-hidden rounded-full " + (className ?? "")}>
      <svg
        viewBox="0 0 64 64"
        className="block h-full w-full"
        role={titre ? "img" : undefined}
        aria-label={titre}
        aria-hidden={titre ? undefined : true}
      >
        <rect width="64" height="64" fill={fond} />
        {children}
      </svg>
    </span>
  );
}

// Eleve (fille) : tresses, chemisier d'uniforme kaki
export function AvatarEleve({ className, titre }: Props) {
  return (
    <Cadre fond="#F5EDDD" titre={titre} className={className}>
      <path d="M10 64c2-12 11-18 22-18s20 6 22 18z" fill="#C9A66B" />
      <path d="M26 46l6 8 6-8" fill="none" stroke="#F8FAFC" strokeWidth="2.4" strokeLinejoin="round" />
      <rect x="28.5" y="38" width="7" height="9" rx="3" fill="#7A4A2E" />
      <circle cx="32" cy="29" r="11" fill="#7A4A2E" />
      <path d="M21 27c0-8 5-12 11-12s11 4 11 12c-3-4-7-6-11-6s-8 2-11 6z" fill="#1F1410" />
      <path d="M20.5 28c-2 3-2 8 0 11M43.5 28c2 3 2 8 0 11" stroke="#1F1410" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="28" cy="30" r="1.3" fill="#1F1410" />
      <circle cx="36" cy="30" r="1.3" fill="#1F1410" />
      <path d="M29 34.5c1.8 1.4 4.2 1.4 6 0" stroke="#1F1410" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </Cadre>
  );
}

// Eleve (garcon) : cheveux ras, chemise d'uniforme bleue
export function AvatarEleveGarcon({ className, titre }: Props) {
  return (
    <Cadre fond="#E8EEF5" titre={titre} className={className}>
      <path d="M10 64c2-12 11-18 22-18s20 6 22 18z" fill="#3B6EA5" />
      <path d="M26 46l6 7 6-7" fill="none" stroke="#F8FAFC" strokeWidth="2.4" strokeLinejoin="round" />
      <rect x="28.5" y="38" width="7" height="9" rx="3" fill="#5A3420" />
      <circle cx="32" cy="29" r="11" fill="#5A3420" />
      <path d="M21.5 26c1-6 5-9 10.5-9s9.5 3 10.5 9c-3-2.5-6.5-3.5-10.5-3.5s-7.5 1-10.5 3.5z" fill="#140D09" />
      <circle cx="28" cy="30" r="1.3" fill="#140D09" />
      <circle cx="36" cy="30" r="1.3" fill="#140D09" />
      <path d="M29 34.5c1.8 1.4 4.2 1.4 6 0" stroke="#140D09" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </Cadre>
  );
}

// Enseignant : lunettes, veste
export function AvatarEnseignant({ className, titre }: Props) {
  return (
    <Cadre fond="#E6F4F1" titre={titre} className={className}>
      <path d="M8 64c2-13 12-19 24-19s22 6 24 19z" fill="#1E3A5F" />
      <path d="M27 45l5 10 5-10z" fill="#F8FAFC" />
      <path d="M31 47h2l1 7-2 2-2-2z" fill="#B8893B" />
      <rect x="28.5" y="37" width="7" height="9" rx="3" fill="#6B3F24" />
      <circle cx="32" cy="28" r="11.5" fill="#6B3F24" />
      <path d="M20.6 25.5c.8-6.5 5.4-10 11.4-10s10.6 3.5 11.4 10c-2.5-1.8-6-2.6-11.4-2.6s-8.9.8-11.4 2.6z" fill="#2A1A12" />
      <circle cx="27.6" cy="29" r="3.4" fill="none" stroke="#0F172A" strokeWidth="1.3" />
      <circle cx="36.4" cy="29" r="3.4" fill="none" stroke="#0F172A" strokeWidth="1.3" />
      <path d="M31 29h2" stroke="#0F172A" strokeWidth="1.3" />
      <path d="M28.5 35c2 1.3 5 1.3 7 0" stroke="#2A1A12" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </Cadre>
  );
}

// Parent : foulard (musoro), boubou
export function AvatarParent({ className, titre }: Props) {
  return (
    <Cadre fond="#FBE9E0" titre={titre} className={className}>
      <path d="M8 64c2-13 12-19 24-19s22 6 24 19z" fill="#0F766E" />
      <path d="M16 56c5-4 10-5 16-5s11 1 16 5" stroke="#E2C17E" strokeWidth="1.6" fill="none" strokeDasharray="2 3" />
      <rect x="28.5" y="38" width="7" height="8" rx="3" fill="#8A5A3B" />
      <circle cx="32" cy="30" r="10.5" fill="#8A5A3B" />
      <path d="M19 27c0-9 6-14 13-14s13 5 13 14c0 2-1 3-2 3-1-6-5-9-11-9s-10 3-11 9c-1 0-2-1-2-3z" fill="#B8893B" />
      <path d="M41 17c4 1 7 4 7 8-2-2-4-3-6-3z" fill="#9A6F2C" />
      <circle cx="28" cy="31" r="1.3" fill="#1F1410" />
      <circle cx="36" cy="31" r="1.3" fill="#1F1410" />
      <path d="M29 35.5c1.8 1.3 4.2 1.3 6 0" stroke="#1F1410" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </Cadre>
  );
}
