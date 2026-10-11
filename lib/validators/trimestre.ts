import { z } from "zod";

export const anneeScolaireSchema = z.object({
  libelle: z.string().regex(/^\d{4}-\d{4}$/, "Format attendu : 2025-2026"),
  dateDebut: z.coerce.date(),
  dateFin: z.coerce.date(),
});

export const trimestreSchema = z.object({
  anneeScolaireId: z.string().min(1),
  nom: z.string().min(2),
  ordre: z.coerce.number().int().min(1).max(3),
  dateDebut: z.coerce.date(),
  dateFin: z.coerce.date().optional().nullable(),
});

export type AnneeScolaireInput = z.infer<typeof anneeScolaireSchema>;
export type TrimestreInput = z.infer<typeof trimestreSchema>;