import { NextRequest, NextResponse } from "next/server";
import { ecole } from "@/lib/data/ecole";
import { utilisateurApi } from "@/lib/auth/api";
import { reponsePdf } from "@/lib/pdf/reponse";
import { datePdf, montantPdf } from "@/lib/pdf/DocumentTableauPDF";

const TYPES: Record<string, string> = {
  MENSUEL: "Salaire mensuel",
  HORAIRE: "Heures",
  PRIME: "Prime",
  AVANCE: "Avance",
  REMBOURSEMENT: "Remboursement",
};
const MODES: Record<string, string> = { ESPECES: "Espèces", VIREMENT: "Virement", MOBILE_MONEY: "Mobile Money", CHEQUE: "Chèque" };

// Fiche des paiements d'un membre du personnel : tous les versements a son nom
// (?annee=2026 pour limiter a une annee civile)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, erreur } = await utilisateurApi("paiement.read");
  if (erreur) return erreur;
  const db = ecole(user);

  const annee = Number(req.nextUrl.searchParams.get("annee")) || null;

  const employe = await db.employe.findUnique({
    where: { id },
    include: {
      etablissement: true,
      paiements: {
        where: annee ? { datePaiement: { gte: new Date(annee, 0, 1), lt: new Date(annee + 1, 0, 1) } } : {},
        orderBy: { datePaiement: "asc" },
      },
    },
  });
  if (!employe || employe.etablissementId !== user.etablissementId) {
    return NextResponse.json({ error: "Employe introuvable" }, { status: 404 });
  }

  const valides = employe.paiements.filter((p) => p.statut !== "ANNULE");
  const total = valides.reduce((s, p) => s + p.montant, 0);
  const parType = new Map<string, number>();
  for (const p of valides) parType.set(p.type, (parType.get(p.type) ?? 0) + p.montant);
  const nomFichier = "paiements-" + (employe.nom + "-" + employe.prenom).toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".pdf";

  return reponsePdf(
    nomFichier,
    async () => {
      const { renderToBuffer } = await import("@react-pdf/renderer");
      const { DocumentTableauPDF } = await import("@/lib/pdf/DocumentTableauPDF");
      return renderToBuffer(
        DocumentTableauPDF({
          etablissement: employe.etablissement,
          titre: "Fiche des paiements",
          sousTitre: annee ? "Année " + annee : "Tous les versements",
          identite: [
            ["Nom", employe.prenom + " " + employe.nom],
            ["Poste", employe.poste === "Autre" && employe.posteLibre ? employe.posteLibre : employe.poste],
            [
              "Rémunération de référence",
              employe.salaireReference
                ? montantPdf(employe.salaireReference) + (employe.typeRemuneration === "HORAIRE" ? " / heure" : " / mois")
                : "Non définie",
            ],
          ],
          resume: [
            ["Total versé", montantPdf(total)],
            ["Nombre de versements", String(valides.length)],
          ],
          sections: [
            {
              titre: "Versements",
              colonnes: [
                { titre: "Date", largeur: 12 },
                { titre: "Période", largeur: 11 },
                { titre: "Type", largeur: 17 },
                { titre: "Détail", largeur: 18 },
                { titre: "Mode", largeur: 13 },
                { titre: "Référence", largeur: 13 },
                { titre: "Montant", largeur: 16, droite: true },
              ],
              lignes: employe.paiements.map((p) => [
                datePdf(p.datePaiement),
                p.periode,
                TYPES[p.type] ?? p.type,
                p.statut === "ANNULE"
                  ? "Annulé"
                  : p.type === "HORAIRE" && p.nombreHeures
                    ? p.nombreHeures + " h x " + montantPdf(p.tauxHoraire ?? 0)
                    : "",
                MODES[p.modePaiement] ?? p.modePaiement,
                p.reference ?? "",
                montantPdf(p.montant),
              ]),
              total: ["Total", "", "", "", "", "", montantPdf(total)],
              vide: "Aucun versement enregistré.",
              note: "Les versements annulés sont listés mais exclus du total. Registre interne : ne remplace pas un bulletin de paie légal.",
            },
            {
              titre: "Total par type de versement",
              colonnes: [
                { titre: "Type", largeur: 60 },
                { titre: "Montant", largeur: 40, droite: true },
              ],
              lignes: [...parType.entries()].map(([t, m]) => [TYPES[t] ?? t, montantPdf(m)]),
              vide: "Aucun versement.",
            },
          ],
        })
      );
    },
    { detail: true, prive: true }
  );
}
