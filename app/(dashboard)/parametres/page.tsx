import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";

export default async function ParametresPage() {
  const user = await requirePermission("parametres.read");

  const [etablissement, parametres, annees, nbUsers, nbEleves, nbClasses] = await Promise.all([
    prisma.etablissement.findUnique({ where: { id: user.etablissementId } }),
    prisma.parametresEtablissement.findUnique({ where: { etablissementId: user.etablissementId } }),
    prisma.anneeScolaire.findMany({
      where: { etablissementId: user.etablissementId },
      orderBy: { libelle: "desc" },
    }),
    prisma.user.count({ where: { etablissementId: user.etablissementId } }),
    prisma.eleve.count({ where: { etablissementId: user.etablissementId, statut: "INSCRIT" } }),
    prisma.classe.count({ where: { etablissementId: user.etablissementId } }),
  ]);

  const anneeActive = annees.find((a) => a.active);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Paramétres</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-1">
          Configuration de l'établissement et du système
        </p>
      </div>

      {/* Resume etablissement */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl bg-[var(--color-brand)] text-white flex items-center justify-center text-xl font-bold">
            {etablissement?.nom?.charAt(0) || "E"}
          </div>
          <div>
            <h2 className="font-semibold text-lg">{etablissement?.nom}</h2>
            <p className="text-xs text-[var(--color-ink-muted)]">
              {etablissement?.type} · {etablissement?.adresse || "Adresse non renseignée"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-[var(--color-border)]">
          <MiniStat label="élèves" value={String(nbEleves)} />
          <MiniStat label="Classes" value={String(nbClasses)} />
          <MiniStat label="Personnel" value={String(nbUsers)} />
          <MiniStat label="Année active" value={anneeActive?.libelle || "Aucune"} accent={anneeActive ? "accent" : "danger"} />
        </div>
      </div>

      {/* Cartes de navigation */}
      <div className="grid md:grid-cols-3 gap-4">
        <CarteLien
          href="/parametres/etablissement"
          title="établissement"
          description="Nom, type, coordonnées, année scolaire active"
          icon="🏫"
        />
        <CarteLien
          href="/parametres/notes"
          title="Notes et bulletins"
          description="Mode de saisie, validation, pondérations"
          icon="📝"
        />
        <CarteLien
          href="/parametres/utilisateurs"
          title="Utilisateurs"
          description="Gestion des comptes et des rôles"
          icon="👥"
        />
      </div>

      {/* Info systeme */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <h2 className="font-semibold mb-3">Informations système</h2>
        <div className="space-y-2 text-sm">
          <Ligne label="Version" value="1.0.0" />
          <Ligne label="Base de données" value="PostgreSQL (Neon)" />
          <Ligne label="Mode de saisie des notes" value={parametres?.modeSaisieNotes || "DECENTRALISEE"} />
          <Ligne label="Validation obligatoire" value={parametres?.validationObligatoire ? "Oui" : "Non"} />
          <Ligne
            label="Régle de pondération"
            value={
              parametres
                ? "Devoirs " + (parametres.ponderationDevoirs * 100).toFixed(0) + " % / Composition " + (parametres.ponderationCompo * 100).toFixed(0) + " %"
                : "Non configurée"
            }
          />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: "accent" | "danger" }) {
  const color =
    accent === "accent" ? "text-[var(--color-accent)]"
    : accent === "danger" ? "text-red-700"
    : "text-[var(--color-ink)]";
  return (
    <div>
      <p className="text-xs text-[var(--color-ink-muted)]">{label}</p>
      <p className={"font-semibold tnum mt-0.5 " + color}>{value}</p>
    </div>
  );
}

function CarteLien({
  href, title, description, icon,
}: { href: string; title: string; description: string; icon: string }) {
  return (
    <Link
      href={href}
      className="block bg-white rounded-xl border border-[var(--color-border)] p-5 hover:border-[var(--color-border-strong)] transition"
    >
      <div className="text-2xl mb-3">{icon}</div>
      <p className="font-medium">{title}</p>
      <p className="text-xs text-[var(--color-ink-muted)] mt-1">{description}</p>
      <p className="text-xs text-[var(--color-brand)] mt-3">Configurer →</p>
    </Link>
  );
}

function Ligne({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-[var(--color-border)] last:border-0">
      <span className="text-[var(--color-ink-muted)]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}