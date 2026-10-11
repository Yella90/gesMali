import type { Role } from "@/lib/auth/permissions";

type ModeSaisie = "DECENTRALISEE" | "CENTRALISEE" | "MIXTE";

export function peutSaisirSelonMode(roles: Role[], mode: ModeSaisie): boolean {
  if (roles.includes("DIRECTEUR")) return true;
  const estEnseignant = roles.includes("ENSEIGNANT");
  const estSecretaire = roles.includes("SECRETAIRE");
  switch (mode) {
    case "DECENTRALISEE": return estEnseignant;
    case "CENTRALISEE":   return estSecretaire;
    case "MIXTE":         return estEnseignant || estSecretaire;
  }
}