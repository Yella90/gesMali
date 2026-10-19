import { NextRequest, NextResponse } from "next/server";
import { ecole } from "@/lib/data/ecole";
import { utilisateurApi } from "@/lib/auth/api";
import { classeVisible } from "@/lib/data/guard";
import { classesPourPdf, reponseEmploiDuTemps } from "@/lib/emploi-du-temps/pdf";

// Emploi du temps d'une classe en PDF (grille vierge si aucun cours n'est planifie)
export async function GET(_: NextRequest, { params }: { params: Promise<{ classeId: string }> }) {
  const { user, erreur } = await utilisateurApi("classe.read");
  if (erreur) return erreur;
  const db = ecole(user);
  const { classeId } = await params;

  const classe = await db.classe.findUnique({ where: { id: classeId }, select: { etablissementId: true } });
  if (!classe || classe.etablissementId !== user.etablissementId || !(await classeVisible(user, classeId))) {
    return NextResponse.json({ error: "Classe introuvable" }, { status: 404 });
  }

  const classes = await classesPourPdf(user.etablissementId, { id: classeId });
  return reponseEmploiDuTemps(user.etablissementId, "emploi-du-temps-" + classes[0].nom + "-" + classes[0].annee + ".pdf", classes);
}
