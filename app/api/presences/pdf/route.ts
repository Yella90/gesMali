import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { utilisateurApi } from "@/lib/auth/api";
import { classeVisible } from "@/lib/data/guard";
import { reponsePdf } from "@/lib/pdf/reponse";
import { fmtPeriode } from "@/lib/frais/periode";
import { aujourdhui, LIB_STATUT, moisDuJour, syntheseClasse } from "@/lib/presences/presences";

// Fiche de presence d'une classe pour un mois (?classe=...&mois=AAAA-MM)
export async function GET(req: NextRequest) {
  const { user, erreur } = await utilisateurApi("presence.read");
  if (erreur) return erreur;
  const classeId = req.nextUrl.searchParams.get("classe") ?? "";
  const m = req.nextUrl.searchParams.get("mois") ?? "";
  const mois = /^\d{4}-\d{2}$/.test(m) ? m : aujourdhui().slice(0, 7);

  const classe = await prisma.classe.findUnique({ where: { id: classeId }, include: { etablissement: true, anneeScolaire: true } });
  if (!classe || classe.etablissementId !== user.etablissementId || !(await classeVisible(user, classe.id))) {
    return NextResponse.json({ error: "Classe introuvable" }, { status: 404 });
  }
  const { debut, fin } = moisDuJour(mois + "-01");
  const s = await syntheseClasse(classe.id, debut, fin);
  const nomClasse = classe.nom || classe.niveau + (classe.section ? " " + classe.section : "");
  const absences = s.incidents.filter((i) => i.statut === "ABSENT").length;
  const retards = s.incidents.filter((i) => i.statut === "RETARD").length;

  return reponsePdf(
    "presences-" + nomClasse.replace(/\s+/g, "-") + "-" + mois + ".pdf",
    async () => {
      const { renderToBuffer } = await import("@react-pdf/renderer");
      const { DocumentTableauPDF } = await import("@/lib/pdf/DocumentTableauPDF");
      return renderToBuffer(
        DocumentTableauPDF({
          etablissement: classe.etablissement,
          titre: "Fiche de présence",
          sousTitre: fmtPeriode(mois),
          identite: [
            ["Classe", nomClasse],
            ["Année scolaire", classe.anneeScolaire.libelle],
            ["Effectif", String(s.lignes.length)],
          ],
          resume: [
            ["Jours d'appel", String(s.joursAppel)],
            ["Absences", String(absences)],
            ["Retards", String(retards)],
          ],
          sections: [
            {
              titre: "Bilan par élève",
              colonnes: [
                { titre: "Élève", largeur: 34 },
                { titre: "Matricule", largeur: 18 },
                { titre: "Absences", largeur: 12, droite: true },
                { titre: "Justifiées", largeur: 12, droite: true },
                { titre: "Retards", largeur: 12, droite: true },
                { titre: "Minutes", largeur: 12, droite: true },
              ],
              lignes: s.lignes.map((l) => [l.nom, l.matricule, String(l.absences), String(l.absencesJustifiees), String(l.retards), String(l.minutesRetard)]),
              vide: "Aucun élève inscrit.",
            },
            {
              titre: "Détail des absences et retards",
              colonnes: [
                { titre: "Date", largeur: 14 },
                { titre: "Élève", largeur: 32 },
                { titre: "Statut", largeur: 18 },
                { titre: "Justifié", largeur: 10 },
                { titre: "Motif", largeur: 26 },
              ],
              lignes: s.incidents.map((i) => [
                i.date.toLocaleDateString("fr-FR", { timeZone: "UTC" }),
                i.nom,
                LIB_STATUT[i.statut] + (i.dureeMinutes ? " (" + i.dureeMinutes + " min)" : ""),
                i.justifie ? "Oui" : "Non",
                i.motif ?? "",
              ]),
              vide: "Aucune absence ni aucun retard sur la période.",
            },
          ],
        })
      );
    },
    { detail: true, prive: true }
  );
}
