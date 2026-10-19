import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { Reprise } from "./Reprise";

// Un import de plusieurs centaines d'eleves peut prendre quelques secondes
export const maxDuration = 60;

export default async function ReprisePage() {
  const user = await requirePermission("reprise.manage");
  const annee = await prisma.anneeScolaire.findFirst({ where: { etablissementId: user.etablissementId, active: true } });
  const [classes, eleves, notes] = annee
    ? await Promise.all([
        prisma.classe.count({ where: { etablissementId: user.etablissementId, anneeScolaireId: annee.id } }),
        prisma.eleve.count({ where: { etablissementId: user.etablissementId, statut: "INSCRIT" } }),
        prisma.note.count({ where: { trimestre: { anneeScolaireId: annee.id }, eleve: { etablissementId: user.etablissementId } } }),
      ])
    : [0, 0, 0];

  return (
    <div className="max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Reprise des données</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--color-ink-muted)]">
          Pour démarrer avec les données de l&apos;ancien système : importez d&apos;abord les classes, puis les élèves, puis les notes.
          Chaque fichier est vérifié ligne par ligne et rien n&apos;est enregistré tant qu&apos;une ligne reste en erreur.
        </p>
      </div>
      {annee ? (
        <>
          <p className="text-sm">
            Année scolaire active : <span className="font-semibold">{annee.libelle}</span>
          </p>
          <Reprise effectifs={{ classes, eleves, notes }} />
        </>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Aucune année scolaire active : créez et activez l&apos;année dans les paramètres avant de reprendre les données.
        </p>
      )}
    </div>
  );
}
