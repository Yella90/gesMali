import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { ListeClassement } from "./ListeClassement";
import { classeVisible } from "@/lib/data/guard";

export default async function ClassementPage({
  params,
}: {
  params: Promise<{ classeId: string; trimestreId: string }>;
}) {
  const { classeId, trimestreId } = await params;
  const user = await requirePermission("bulletin.read");

  const classe = await prisma.classe.findUnique({
    where: { id: classeId },
    include: { anneeScolaire: true },
  });
  const trimestre = await prisma.trimestre.findUnique({
    where: { id: trimestreId },
  });

  if (!classe || !trimestre || classe.etablissementId !== user.etablissementId || !(await classeVisible(user, classe.id))) {
    notFound();
  }

  const bulletins = await prisma.bulletin.findMany({
    where: { classeId, trimestreId },
    include: {
      eleve: {
        select: { id: true, nom: true, prenom: true, matricule: true },
      },
    },
    orderBy: { moyenneGenerale: "desc" },
  });

  if (bulletins.length === 0) {
    return (
      <div className="space-y-5">
        <Link href="/bulletins" className="text-xs text-[var(--color-ink-muted)] hover:underline">
          ← Retour aux bulletins
        </Link>
        <div className="bg-white rounded-xl border border-dashed border-[var(--color-border-strong)] py-16 text-center">
          <p className="text-sm text-[var(--color-ink-muted)]">
            Aucun bulletin généré pour cette classe et ce trimestre.
          </p>
        </div>
      </div>
    );
  }

  const lib = classe.nom || (classe.niveau + (classe.section ? " " + classe.section : ""));
  const moyenneClasse = bulletins[0]?.moyenneClasse ?? (bulletins.reduce((s, b) => s + b.moyenneGenerale, 0) / bulletins.length);
  const plusForte = bulletins[0]?.moyennePlusForte ?? bulletins[0]?.moyenneGenerale ?? 0;
  const plusFaible = bulletins[0]?.moyennePlusFaible ?? bulletins[bulletins.length - 1]?.moyenneGenerale ?? 0;
  const admis = bulletins.filter((b) => b.moyenneGenerale >= 10).length;

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/bulletins" className="text-xs text-[var(--color-ink-muted)] hover:underline">
            ← Retour aux bulletins
          </Link>
          <h1 className="text-2xl font-semibold mt-1">
            {lib} · {trimestre.nom}
          </h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">
            {classe.anneeScolaire.libelle} · {bulletins.length} élève(s)
          </p>
        </div>
        <Link
          href={"/api/bulletins/classe/" + classeId + "/trimestre/" + trimestreId + "/pdf"}
          target="_blank"
          className="inline-flex items-center h-10 px-4 rounded-lg bg-[var(--color-brand)] text-white text-sm font-medium hover:bg-[var(--color-brand-dark)]"
        >
          Télécharger tous les bulletins (PDF)
        </Link>
      </div>

      {/* Stats classe */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Stat label="Moyenne de classe" value={moyenneClasse.toFixed(2) + " / 20"} accent="brand" />
        <Stat label="Plus forte" value={plusForte.toFixed(2)} accent="accent" />
        <Stat label="Plus faible" value={plusFaible.toFixed(2)} accent="danger" />
        <Stat label="Élèves admis (>= 10)" value={admis + " / " + bulletins.length} accent="gold" />
      </div>

      {/* Classement avec recherche */}
      <ListeClassement
        bulletins={bulletins.map((b) => ({
          id: b.id,
          rang: b.rang,
          moyenneGenerale: b.moyenneGenerale,
          totalPoints: b.totalPoints,
          totalCoeffs: b.totalCoeffs,
          eleve: {
            id: b.eleve.id,
            nom: b.eleve.nom,
            prenom: b.eleve.prenom,
            matricule: b.eleve.matricule,
          },
        }))}
        trimestreId={trimestreId}
      />
    </div>
  );
}

function Stat({
  label, value, accent,
}: { label: string; value: string; accent: "brand" | "accent" | "gold" | "danger" }) {
  const bg =
    accent === "accent" ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
    : accent === "gold" ? "bg-[var(--color-gold-soft)] text-[var(--color-gold)]"
    : accent === "danger" ? "bg-red-50 text-red-700"
    : "bg-[var(--color-brand-soft)] text-[var(--color-brand)]";
  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
      <span className={"inline-block px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wide " + bg}>
        {label}
      </span>
      <p className="text-lg md:text-xl font-semibold mt-2 tnum">{value}</p>
    </div>
  );
}