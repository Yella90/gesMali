import { z } from "zod";

export const matiereSchema = z.object({
  nom: z.string().min(2),
  code: z.string().max(10).optional().nullable(),
  cycle: z.enum(["PRESCOLAIRE", "PREMIER_CYCLE", "SECOND_CYCLE"]),
  coefficient: z.coerce.number().int().min(1).max(10).default(1),
});

export type MatiereInput = z.infer<typeof matiereSchema>;