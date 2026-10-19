export type Permission =
  | "eleve.read" | "eleve.create" | "eleve.update" | "eleve.delete"
  | "classe.read" | "classe.manage"
  | "matiere.read" | "matiere.manage"
  | "trimestre.read" | "trimestre.manage"
  | "note.read" | "note.create" | "note.update.own" | "note.update.any"
  | "note.validate" | "note.lock"
  | "bulletin.read" | "bulletin.generate"
  | "frais.read" | "frais.manage" | "frais.encaisser"
  | "paiement.read" | "paiement.create" | "paiement.annuler"
  | "personnel.read" | "personnel.manage"
  | "parametres.read" | "parametres.manage"
  | "audit.read";

export type Role = "DIRECTEUR" | "SECRETAIRE" | "COMPTABLE" | "ENSEIGNANT";

export const PERMISSIONS_PAR_ROLE: Record<Role, readonly Permission[]> = {
  DIRECTEUR: [
    "eleve.read","eleve.create","eleve.update","eleve.delete",
    "classe.read","classe.manage",
    "matiere.read","matiere.manage",
    "trimestre.read","trimestre.manage",
    "note.read","note.create","note.update.own","note.update.any",
    "note.validate","note.lock",
    "bulletin.read","bulletin.generate",
    "frais.read","frais.manage","frais.encaisser",
    "paiement.read","paiement.create","paiement.annuler",
    "personnel.read","personnel.manage",
    "parametres.read","parametres.manage",
    "audit.read",
  ] as const,
  SECRETAIRE: [
    "eleve.read","eleve.create","eleve.update",
    "classe.read","matiere.read","trimestre.read",
    "note.read","note.create","note.update.own","note.update.any",
    "bulletin.read",
    "frais.read","frais.manage","frais.encaisser",
    // Pas d'acces aux paiements du personnel (salaires)
    "personnel.read",
  ] as const,
  COMPTABLE: [
    "eleve.read",
    "classe.read",
    "frais.read","frais.manage","frais.encaisser",
    "paiement.read","paiement.create",
  ] as const,
  ENSEIGNANT: [
    "eleve.read","classe.read","matiere.read","trimestre.read",
    "note.read","note.create","note.update.own",
    "bulletin.read",
  ] as const,
};

export function peut(roles: Role[], permission: Permission): boolean {
  return roles.some((r) => PERMISSIONS_PAR_ROLE[r]?.includes(permission));
}

export function allPermissionsFor(roles: Role[]): Set<Permission> {
  const set = new Set<Permission>();
  for (const r of roles) for (const p of PERMISSIONS_PAR_ROLE[r] ?? []) set.add(p);
  return set;
}