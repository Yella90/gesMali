import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { ListeAudit } from "./ListeAudit";

export default async function AuditPage() {
  const user = await requirePermission("audit.read");

  // Charger les 500 derniers evenements
  const logs = await prisma.auditLog.findMany({
    where: {
      user: { etablissementId: user.etablissementId },
    },
    include: {
      user: {
        select: { id: true, email: true, roles: true, employe: { select: { nom: true, prenom: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  // Stats
  const maintenant = new Date();
  const debutJour = new Date(maintenant);
  debutJour.setHours(0, 0, 0, 0);

  const aujourdHui = logs.filter((l) => new Date(l.createdAt) >= debutJour).length;
  const utilisateursUniques = new Set(logs.map((l) => l.userId)).size;
  const plusRecent = logs[0]?.createdAt;

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold">Journal d'audit</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-1">
          Historique des {logs.length} derniers événements de l'établissement
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Stat label="événements" value={String(logs.length)} accent="brand" />
        <Stat label="Aujourd'hui" value={String(aujourdHui)} accent="accent" />
        <Stat label="Utilisateurs actifs" value={String(utilisateursUniques)} accent="gold" />
        <Stat
          label="Dernier événement"
          value={plusRecent ? new Date(plusRecent).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"}
        />
      </div>

      {logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-[var(--color-border-strong)] py-16 text-center">
          <p className="text-sm text-[var(--color-ink-muted)]">
            Aucun événement enregistré pour l'instant.
          </p>
          <p className="text-xs text-[var(--color-ink-faint)] mt-2">
            Les actions sensibles apparaîtront ici au fur et à mesure.
          </p>
        </div>
      ) : (
        <ListeAudit
          logs={logs.map((l) => ({
            id: l.id,
            action: l.action,
            entite: l.entite,
            entiteId: l.entiteId,
            details: l.details,
            createdAt: l.createdAt.toISOString(),
            user: {
              id: l.user.id,
              nom: l.user.employe?.nom ?? l.user.email,
              prenom: l.user.employe?.prenom ?? "",
              email: l.user.email,
              roles: l.user.roles as string[],
            },
          }))}
        />
      )}

      {/* Info */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xs text-[var(--color-ink-muted)]">
        <strong className="text-[var(--color-ink)]">Journal d'audit.</strong> Toutes les actions sensibles
        sont enregistrées (création, modification, suppression, validation, paiement). Les
        500 derniers événements sont affichés. Aucune suppression n'est possible depuis cette page.
      </div>
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