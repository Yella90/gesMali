"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Permission, Role } from "@/lib/auth/permissions";
import { deconnexion } from "@/app/(dashboard)/_actions/deconnexion";
import { LiensLegaux } from "@/components/legal/PageLegale";
import { libRole } from "@/lib/libelles";
import {
  ArrowLeftRight, ArrowRightLeft, Banknote, BookOpen, BriefcaseBusiness, CalendarClock, CalendarRange, FileText,
  ClipboardCheck, GraduationCap, HandCoins, Landmark, LayoutDashboard, LogOut, Upload, PencilLine, School, ScrollText, Settings,
  ShieldCheck, UserRound, Wallet,
  type LucideIcon,
} from "lucide-react";

type Item = {
  href: string;
  label: string;
  permission: Permission;
  icon: LucideIcon;
  mobile?: boolean;
};

const MENU: Item[] = [
  { href: "/dashboard", label: "Tableau de bord", permission: "eleve.read", icon: LayoutDashboard, mobile: true },
  { href: "/eleves", label: "Élèves", permission: "eleve.read", icon: GraduationCap, mobile: true },
  { href: "/classes", label: "Classes", permission: "classe.read", icon: School, mobile: true },
  { href: "/emploi-du-temps", label: "Emploi du temps", permission: "classe.read", icon: CalendarClock },
  { href: "/notes", label: "Notes", permission: "note.create", icon: PencilLine, mobile: true },
  { href: "/presences", label: "Présences", permission: "presence.read", icon: ClipboardCheck },
  { href: "/bulletins", label: "Bulletins", permission: "bulletin.read", icon: FileText },
  { href: "/frais", label: "Frais", permission: "frais.read", icon: Wallet, mobile: true },
  { href: "/paiements", label: "Paiements", permission: "paiement.read", icon: Banknote },
  { href: "/tresorerie", label: "Trésorerie", permission: "tresorerie.read", icon: Landmark },
  { href: "/finance", label: "Finance", permission: "tresorerie.read", icon: HandCoins },
  { href: "/matieres", label: "Matières", permission: "matiere.read", icon: BookOpen },
  { href: "/trimestres", label: "Trimestres", permission: "trimestre.read", icon: CalendarRange },
  { href: "/personnel", label: "Personnel", permission: "personnel.read", icon: BriefcaseBusiness },
  { href: "/transition", label: "Transition annuelle", permission: "parametres.read", icon: ArrowRightLeft },
  { href: "/reprise", label: "Reprise des données", permission: "reprise.manage", icon: Upload },
  { href: "/parametres", label: "Paramètres", permission: "parametres.read", icon: Settings },
  { href: "/audit", label: "Journal", permission: "audit.read", icon: ScrollText },
];

// Liens du compte : mon compte, changer d'ecole (plusieurs ecoles), administration de la plateforme
function liensCompte(compte: { nbEcoles: number; administrateur: boolean }) {
  return [
    { href: "/compte", label: "Mon compte", icon: UserRound },
    ...(compte.nbEcoles > 1 ? [{ href: "/ecoles", label: "Changer d'école", icon: ArrowLeftRight }] : []),
    ...(compte.administrateur ? [{ href: "/plateforme", label: "Plateforme", icon: ShieldCheck }] : []),
  ];
}

export function Sidebar({
  permissions,
  nom,
  roles,
  etablissement,
  compte,
}: {
  permissions: Permission[];
  nom: string;
  roles: Role[];
  etablissement: { nom: string; logo: string | null };
  compte: { nbEcoles: number; administrateur: boolean };
}) {
  const pathname = usePathname();
  const [loadingOut, setLoadingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const set = new Set(permissions);
  const visibles = MENU.filter((m) => set.has(m.permission));
  const mobileItems = visibles.filter((m) => m.mobile).slice(0, 4);

  async function handleDeconnexion() {
    setLoadingOut(true);
    try {
      await deconnexion();
    } catch {
      setLoadingOut(false);
    }
  }

  return (
    <>
      {/* Header mobile */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-[var(--color-border)] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Embleme etablissement={etablissement} taille="w-8 h-8 rounded-lg text-sm" />
          <div className="leading-tight min-w-0">
            <p className="text-sm font-semibold truncate max-w-[180px]">{etablissement.nom}</p>
            <p className="text-[10px] text-[var(--color-ink-muted)] truncate max-w-[140px]">
              {nom}
            </p>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 -mr-2 rounded-lg hover:bg-neutral-100"
          aria-label="Menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {mobileOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
          </svg>
        </button>
      </header>

      {/* Drawer mobile */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 top-14 bg-black/30 z-30"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="lg:hidden fixed top-14 left-0 right-0 z-30 bg-white border-b border-[var(--color-border)] max-h-[calc(100vh-3.5rem)] overflow-y-auto">
            <ul className="p-2 space-y-0.5">
              {visibles.map((m) => {
                const actif = pathname === m.href || pathname.startsWith(m.href + "/");
                return (
                  <li key={m.href}>
                    <Link
                      href={m.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-lg text-sm",
                        actif
                          ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-medium"
                          : "text-[var(--color-ink)] hover:bg-neutral-50"
                      )}
                    >
                      <m.icon aria-hidden className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                      {m.label}
                    </Link>
                  </li>
                );
              })}
              <li className="pt-2 mt-2 border-t border-[var(--color-border)]" />
              {liensCompte(compte).map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-[var(--color-ink)] hover:bg-neutral-50"
                  >
                    <l.icon aria-hidden className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  onClick={handleDeconnexion}
                  disabled={loadingOut}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <LogOut aria-hidden className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                  {loadingOut ? "Déconnexion..." : "Se déconnecter"}
                </button>
              </li>
              <li className="px-3 py-2">
                <LiensLegaux className="text-[var(--color-ink-faint)]" />
              </li>
            </ul>
          </nav>
        </>
      )}

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-[var(--color-border)] flex-col h-screen sticky top-0">
        <div className="p-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <Embleme etablissement={etablissement} taille="w-10 h-10 rounded-xl" />
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate" title={etablissement.nom}>{etablissement.nom}</p>
              <p className="text-xs text-[var(--color-ink-muted)] truncate">{nom}</p>
            </div>
          </div>
          <p className="mt-3 text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)] font-medium">
            {roles.map(libRole).join(", ")}
          </p>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          <ul className="space-y-0.5">
            {visibles.map((m) => {
              const actif = pathname === m.href || pathname.startsWith(m.href + "/");
              return (
                <li key={m.href}>
                  <Link
                    href={m.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm",
                      actif
                        ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-medium"
                        : "text-[var(--color-ink)] hover:bg-neutral-50"
                    )}
                  >
                    <m.icon aria-hidden className="h-[18px] w-[18px] shrink-0 opacity-80" strokeWidth={1.8} />
                    {m.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-3 border-t border-[var(--color-border)]">
          {liensCompte(compte).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--color-ink)] hover:bg-neutral-50"
            >
              <l.icon aria-hidden className="h-[18px] w-[18px] shrink-0 opacity-80" strokeWidth={1.8} />
              {l.label}
            </Link>
          ))}
          <button
            onClick={handleDeconnexion}
            disabled={loadingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <LogOut aria-hidden className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
            {loadingOut ? "Déconnexion..." : "Se déconnecter"}
          </button>
          <LiensLegaux className="px-3 pt-2 text-[var(--color-ink-faint)]" />
        </div>
      </aside>

      {/* Bottom nav mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[var(--color-border)] pb-[env(safe-area-inset-bottom)]">
        <ul className="grid grid-cols-4">
          {mobileItems.map((m) => {
            const actif = pathname === m.href || pathname.startsWith(m.href + "/");
            return (
              <li key={m.href}>
                <Link
                  href={m.href}
                  className={cn(
                    "flex flex-col items-center justify-center py-2.5 gap-0.5 text-[10px]",
                    actif
                      ? "text-[var(--color-brand)] font-medium"
                      : "text-[var(--color-ink-muted)]"
                  )}
                >
                  <m.icon aria-hidden className="h-5 w-5" strokeWidth={1.8} />
                  <span className="truncate px-1">{m.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
// Logo de l etablissement, ou son initiale
function Embleme({ etablissement, taille }: { etablissement: { nom: string; logo: string | null }; taille: string }) {
  if (etablissement.logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- image servie par l API, deja reduite
      <img src={etablissement.logo} alt="" className={taille + " shrink-0 object-contain bg-white border border-[var(--color-border)]"} />
    );
  }
  return (
    <div className={taille + " shrink-0 bg-[var(--color-brand)] text-white flex items-center justify-center font-bold"}>
      {etablissement.nom.charAt(0).toUpperCase() || "G"}
    </div>
  );
}
