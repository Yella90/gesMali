import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { classeVisible } from "@/lib/data/guard";

const JOURS = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"];

// Creneaux horaires standard (8h a 18h par tranche d'1h)
const HEURES_DEBUT = 8;
const HEURES_FIN = 18;

function libJour(j: string): string {
  const map: Record<string, string> = {
    LUNDI: "Lundi", MARDI: "Mardi", MERCREDI: "Mercredi",
    JEUDI: "Jeudi", VENDREDI: "Vendredi", SAMEDI: "Samedi",
  };
  return map[j] || j;
}

// Convertit "HH:MM" en heures decimales (ex "08:30" = 8.5)
function toHeureDecimale(h: string): number {
  const [hh, mm] = h.split(":").map(Number);
  return hh + (mm || 0) / 60;
}

// Couleurs par matiere (hash stable sur le nom)
const COULEURS = [
  "bg-blue-50 text-blue-800 border-blue-200",
  "bg-emerald-50 text-emerald-800 border-emerald-200",
  "bg-amber-50 text-amber-800 border-amber-200",
  "bg-violet-50 text-violet-800 border-violet-200",
  "bg-pink-50 text-pink-800 border-pink-200",
  "bg-cyan-50 text-cyan-800 border-cyan-200",
  "bg-orange-50 text-orange-800 border-orange-200",
  "bg-lime-50 text-lime-800 border-lime-200",
];
function couleurMatiere(nom: string): string {
  let h = 0;
  for (let i = 0; i < nom.length; i++) h = (h * 31 + nom.charCodeAt(i)) % COULEURS.length;
  return COULEURS[h];
}

export default async function EmploiDuTempsClassePage({ params }: { params: Promise<{ classeId: string }> }) {
  const { classeId } = await params;
  const user = await requirePermission("classe.read");

  const classe = await prisma.classe.findUnique({
    where: { id: classeId },
    include: {
      anneeScolaire: true,
      titulaire: { select: { nom: true, prenom: true } },
      affectations: {
        include: {
          enseignant: { select: { nom: true, prenom: true } },
          matiere: { select: { nom: true } },
        },
      },
    },
  });
  if (!classe || classe.etablissementId !== user.etablissementId) notFound();
  if (!(await classeVisible(user, classe.id))) notFound();

  const lib = classe.nom || (classe.niveau + (classe.section ? " " + classe.section : ""));

  // Extraire les creneaux
  const creneaux = classe.affectations.filter((a) => a.jour && a.heureDebut && a.heureFin);

  // Toutes les heures utilisees
  const heuresUtilisees = new Set<number>();
  for (const c of creneaux) {
    const debut = Math.floor(toHeureDecimale(c.heureDebut!));
    const fin = Math.ceil(toHeureDecimale(c.heureFin!));
    for (let h = debut; h < fin; h++) heuresUtilisees.add(h);
  }

  // Construire la liste des heures a afficher
  const heures: number[] = [];
  if (heuresUtilisees.size > 0) {
    const min = Math.min(...heuresUtilisees, HEURES_DEBUT);
    const max = Math.max(...heuresUtilisees, HEURES_FIN - 1);
    for (let h = min; h <= max; h++) heures.push(h);
  } else {
    for (let h = HEURES_DEBUT; h < HEURES_FIN; h++) heures.push(h);
  }

  // Index des creneaux : [jour][heure] = creneau
  type Slot = { aff: any; debut: number; fin: number; span: number } | null;
  const grille: Record<string, Slot[]> = {};
  for (const j of JOURS) {
    grille[j] = heures.map(() => null);
  }
  for (const c of creneaux) {
    const debut = toHeureDecimale(c.heureDebut!);
    const fin = toHeureDecimale(c.heureFin!);
    const jour = c.jour!;
    const debutH = Math.floor(debut);
    const span = Math.ceil(fin - debut);
    const idx = heures.indexOf(debutH);
    if (idx >= 0) {
      grille[jour][idx] = { aff: c, debut, fin, span };
    }
  }

  const creneauxSansHoraire = classe.affectations.filter((a) => !a.jour || !a.heureDebut || !a.heureFin);

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/emploi-du-temps" className="text-xs text-[var(--color-ink-muted)] hover:underline">
            ← Retour
          </Link>
          <h1 className="text-2xl font-semibold mt-1">Emploi du temps · {lib}</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">
            {classe.anneeScolaire.libelle} · {creneaux.length} créneau{creneaux.length > 1 ? "x" : ""} planifié{creneaux.length > 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href={"/classes/" + classeId}
          className="inline-flex items-center h-10 px-4 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm hover:bg-neutral-50"
        >
          Voir la classe
        </Link>
      </div>

      {creneaux.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-[var(--color-border-strong)] py-16 text-center">
          <p className="text-sm text-[var(--color-ink-muted)]">
            Aucun créneau horaire défini pour cette classe.
          </p>
          <p className="text-xs text-[var(--color-ink-faint)] mt-2">
            Allez dans <strong>Personnel</strong> → fiche d'un enseignant → Affectations, et ajoutez des créneaux.
          </p>
          <Link
            href="/personnel"
            className="inline-flex items-center h-10 px-4 rounded-lg bg-[var(--color-brand)] text-white text-sm font-medium mt-4"
          >
            Gérer les affectations
          </Link>
        </div>
      ) : (
        <>
          {/* Grille desktop */}
          <div className="hidden md:block bg-white rounded-xl border border-[var(--color-border)] overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="w-16 p-2 border-b border-r border-[var(--color-border)] bg-[var(--color-surface)] font-medium text-[var(--color-ink-muted)]">
                    Heure
                  </th>
                  {JOURS.map((j) => (
                    <th key={j} className="p-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] font-medium text-[var(--color-ink-muted)]">
                      {libJour(j)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heures.map((h, hi) => (
                  <tr key={h}>
                    <td className="p-2 border-b border-r border-[var(--color-border)] text-center font-mono text-[var(--color-ink-muted)]">
                      {String(h).padStart(2, "0")}:00
                    </td>
                    {JOURS.map((j) => {
                      const slot = grille[j][hi];
                      // Ne dessiner que si le creneau demarre a cette heure
                      if (slot && Math.floor(slot.debut) === h) {
                        const rowSpan = slot.span;
                        const matiereNom = slot.aff.matiere?.nom || "Titulariat";
                        const couleur = couleurMatiere(matiereNom);
                        return (
                          <td
                            key={j}
                            rowSpan={rowSpan}
                            className={"p-1 align-top border-b border-r border-[var(--color-border)] " + couleur}
                          >
                            <div className="rounded p-2 h-full flex flex-col justify-between min-h-[60px]">
                              <div>
                                <p className="font-semibold text-xs leading-tight">{matiereNom}</p>
                                <p className="text-[10px] mt-0.5 opacity-80">
                                  {slot.aff.enseignant.nom} {slot.aff.enseignant.prenom}
                                </p>
                              </div>
                              <p className="font-mono text-[10px] mt-1 opacity-70">
                                {slot.aff.heureDebut}-{slot.aff.heureFin}
                              </p>
                            </div>
                          </td>
                        );
                      } else if (slot) {
                        // Cellule couverte par un rowSpan au-dessus : ne rien dessiner
                        return null;
                      } else {
                        return (
                          <td key={j} className="p-1 border-b border-r border-[var(--color-border)] bg-neutral-50/50">
                            &nbsp;
                          </td>
                        );
                      }
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vue mobile : liste par jour */}
          <div className="md:hidden space-y-4">
            {JOURS.filter((j) => grille[j].some((s) => s)).map((j) => (
              <div key={j} className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
                <div className="px-4 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)] font-medium text-sm">
                  {libJour(j)}
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                  {grille[j]
                    .filter((s) => s)
                    .sort((a, b) => a!.debut - b!.debut)
                    .map((slot, i) => {
                      const matiereNom = slot!.aff.matiere?.nom || "Titulariat";
                      return (
                        <div key={i} className="p-3 flex items-start gap-3">
                          <div className="w-20 flex-shrink-0 text-xs font-mono text-[var(--color-ink-muted)] pt-0.5">
                            {slot!.aff.heureDebut}
                            <br />
                            {slot!.aff.heureFin}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{matiereNom}</p>
                            <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                              {slot!.aff.enseignant.nom} {slot!.aff.enseignant.prenom}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>

          {/* Affectations sans horaire */}
          {creneauxSansHoraire.length > 0 && (
            <div className="bg-white rounded-xl border border-amber-200 bg-amber-50/40 p-4">
              <p className="text-sm font-medium text-amber-900 mb-2">
                {creneauxSansHoraire.length} affectation(s) sans créneau horaire
              </p>
              <ul className="space-y-1 text-xs text-amber-800">
                {creneauxSansHoraire.map((a) => (
                  <li key={a.id}>
                    • {a.matiere?.nom || "Titulariat"} — {a.enseignant.nom} {a.enseignant.prenom}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Legende */}
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)] mb-3">
              Légende
            </p>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(creneaux.map((c) => c.matiere?.nom || "Titulariat"))).map((nom) => (
                <span key={nom} className={"inline-flex px-3 py-1 rounded-md text-xs border " + couleurMatiere(nom)}>
                  {nom}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}