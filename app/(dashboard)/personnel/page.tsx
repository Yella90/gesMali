import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { ListePersonnel } from "./ListePersonnel";

export default async function PersonnelPage() {
  const user = await requirePermission("personnel.read");

  const employes = await prisma.employe.findMany({
    where: { etablissementId: user.etablissementId },
    include: {
      user: {
        select: { id: true, email: true, roles: true, actif: true },
      },
      _count: {
        select: {
          affectations: true,
          paiements: true,
        },
      },
    },
    orderBy: [{ actif: "desc" }, { nom: "asc" }, { prenom: "asc" }],
  });

  const totalActif = employes.filter((e) => e.actif).length;
  const avecCompte = employes.filter((e) => e.user).length;
  const sansCompte = employes.length - avecCompte;
  const nbEnseignants = employes.filter((e) => e.poste === "Enseignant").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Personnel</h1>
          <p className="text-sm text-[var(--color-ink-muted)] mt-1">
            {employes.length} employé(s) · {totalActif} actif(s)
          </p>
        </div>
        <Link
          href="/personnel/nouveau"
          className="inline-flex items-center h-10 px-4 rounded-lg bg-[var(--color-brand)] text-white text-sm font-medium hover:bg-[var(--color-brand-dark)]"
        >
          + Nouvel employé
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Stat label="Total" value={String(employes.length)} accent="brand" />
        <Stat label="Enseignants" value={String(nbEnseignants)} accent="accent" />
        <Stat label="Avec compte" value={String(avecCompte)} accent="gold" />
        <Stat label="Sans compte" value={String(sansCompte)} />
      </div>

      <ListePersonnel
        employes={employes.map((e) => ({
          id: e.id,
          nom: e.nom,
          prenom: e.prenom,
          telephone: e.telephone,
          poste: e.poste,
          posteLibre: e.posteLibre,
          actif: e.actif,
          dateEmbauche: e.dateEmbauche.toISOString(),
          salaireReference: e.salaireReference,
          nbAffectations: e._count.affectations,
          nbPaiements: e._count.paiements,
          user: e.user
            ? {
                id: e.user.id,
                email: e.user.email,
                roles: e.user.roles as string[],
                actif: e.user.actif,
              }
            : null,
        }))}
      />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "brand" | "accent" | "gold" }) {
  const bg =
    accent === "accent" ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
    : accent === "gold" ? "bg-[var(--color-gold-soft)] text-[var(--color-gold)]"
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