import { z } from "zod";

export const classeSchema = z.object({
  nom: z.string().max(50).optional().nullable(),
  niveau: z.coerce.number().int().min(0).max(9),
  cycle: z.enum(["PRESCOLAIRE", "PREMIER_CYCLE", "SECOND_CYCLE"]),
  section: z.string().max(5).optional().nullable(),
  salle: z.string().max(50).optional().nullable(),
  anneeScolaireId: z.string().min(1),
  titulaireId: z.string().optional().nullable(),
  fraisInscription: z.coerce.number().min(0).default(0),
  fraisScolariteMensuel: z.coerce.number().min(0).default(0),
  capaciteMax: z.coerce.number().int().min(1).max(200).default(50),
});

export type ClasseInput = z.infer<typeof classeSchema>;