import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { EtablissementForm } from "./EtablissementForm";

export default async function EtablissementPage() {
  const user = await requirePermission("parametres.read");

  const [etablissement, annees] = await Promise.all([
    prisma.etablissement.findUnique({ where: { id: user.etablissementId } }),
    prisma.anneeScolaire.findMany({
      where: { etablissementId: user.etablissementId },
      orderBy: { libelle: "desc" },
      include: { _count: { select: { classes: true, trimestres: true } } },
    }),
  ]);

  if (!etablissement) return null;

  const peutEditer = user.roles.includes("DIRECTEUR");

  return (
    <div className="space-y-5 max-w-3xl">
      <Link href="/parametres" className="text-xs text-[var(--color-ink-muted)] hover:underline">
        ← Retour aux paramétres
      </Link>

      <div>
        <h1 className="text-2xl font-semibold mt-1">établissement</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-1">
          Informations générales et année scolaire active
        </p>
      </div>

      {peutEditer && (
        <EtablissementForm
          etablissement={{
            nom: etablissement.nom,
            type: etablissement.type,
            adresse: etablissement.adresse || "",
            telephone: etablissement.telephone || "",
            email: etablissement.email || "",
          }}
        />
      )}

      {!peutEditer && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 space-y-3 text-sm">
          <p><strong>Nom :</strong> {etablissement.nom}</p>
          <p><strong>Type :</strong> {etablissement.type}</p>
          <p><strong>Adresse :</strong> {etablissement.adresse || "—"}</p>
          <p><strong>Téléphone :</strong> {etablissement.telephone || "—"}</p>
          <p><strong>Email :</strong> {etablissement.email || "—"}</p>
        </div>
      )}

      {/* Annees scolaires */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="p-5 border-b border-[var(--color-border)]">
          <h2 className="font-semibold">Années scolaires</h2>
          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
            Une seule année peut étre active à la fois
          </p>
        </div>

        {annees.length === 0 ? (
          <p className="p-6 text-center text-sm text-[var(--color-ink-muted)]">
            Aucune année scolaire. Créez-en une dans <Link href="/trimestres/nouveau" className="text-[var(--color-brand)] underline">Trimestres</Link>.
          </p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {annees.map((a) => (
              <div key={a.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{a.libelle}</p>
                    {a.active && (
                      <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-ink-muted)] mt-0.5 tnum">
                    {new Date(a.dateDebut).toLocaleDateString("fr-FR")} → {new Date(a.dateFin).toLocaleDateString("fr-FR")}
                    {" · "}{a._count.classes} classe(s) · {a._count.trimestres} trimestre(s)
                  </p>
                </div>
                {peutEditer && !a.active && (
                  <form action={async () => { "use server"; const { basculerAnnee } = await import("../actions"); await basculerAnnee(a.id); }}>
                    <button type="submit" className="h-9 px-3 rounded-lg border border-[var(--color-border-strong)] bg-white text-xs hover:bg-neutral-50 whitespace-nowrap">
                      Activer
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}