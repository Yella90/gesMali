import { NextRequest, NextResponse } from "next/server";
import { utilisateurApi } from "@/lib/auth/api";
import { filtreClasses } from "@/lib/data/guard";
import { anneeAffichee } from "@/lib/classes/annees";
import { classesPourPdf, reponseEmploiDuTemps } from "@/lib/emploi-du-temps/pdf";

// Emplois du temps de toutes les classes d'une annee (?annee=, sinon l'annee active),
// une page par classe ; les classes sans aucun cours planifie sont omises
export async function GET(req: NextRequest) {
  const { user, erreur } = await utilisateurApi("classe.read");
  if (erreur) return erreur;

  const { annee } = await anneeAffichee(user.etablissementId, req.nextUrl.searchParams.get("annee") ?? undefined);
  if (!annee) return NextResponse.json({ error: "Aucune année scolaire" }, { status: 404 });

  const classes = (
    await classesPourPdf({ etablissementId: user.etablissementId, anneeScolaireId: annee.id, ...(await filtreClasses(user)) })
  ).filter((c) => c.cours.length > 0);
  if (classes.length === 0) {
    return NextResponse.json({ error: "Aucun emploi du temps planifié pour l'année " + annee.libelle }, { status: 404 });
  }

  return reponseEmploiDuTemps(user.etablissementId, "emplois-du-temps-" + annee.libelle + ".pdf", classes);
}
