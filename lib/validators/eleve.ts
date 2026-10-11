import { z } from "zod";

export const eleveSchema = z.object({
  nom: z.string().min(2, "Nom trop court"),
  prenom: z.string().min(2, "Prenom trop court"),
  dateNaissance: z.coerce.date(),
  sexe: z.enum(["M", "F"]),
  tuteurNom: z.string().optional().nullable(),
  tuteurTelephone: z.string().optional().nullable(),
  emailParent: z
    .union([z.string().email("Email invalide"), z.literal("")])
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v)),
  classeId: z.string().optional().nullable(),
});

export type EleveInput = z.infer<typeof eleveSchema>;