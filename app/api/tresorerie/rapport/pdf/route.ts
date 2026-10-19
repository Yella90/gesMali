import { NextRequest } from "next/server";
import { ecole } from "@/lib/data/ecole";
import { utilisateurApi } from "@/lib/auth/api";
import { reponsePdf } from "@/lib/pdf/reponse";
import { montantPdf } from "@/lib/pdf/DocumentTableauPDF";
import { fmtPeriode } from "@/lib/frais/periode";
import { moisValide } from "@/lib/tableau-de-bord/finances";
import { LIB_CAISSE } from "@/lib/tresorerie/tresorerie";
import { periodeRapport, rapportFinancier } from "@/lib/tresorerie/rapport";

// Rapport financier en PDF (?debut=AAAA-MM&fin=AAAA-MM)
export async function GET(req: NextRequest) {
  const { user, erreur } = await utilisateurApi("tresorerie.read");
  if (erreur) return erreur;
  const db = ecole(user);
  const finMois = moisValide(req.nextUrl.searchParams.get("fin") ?? undefined);
  const d = req.nextUrl.searchParams.get("debut") ?? undefined;
  const debutMois = d && moisValide(d) <= finMois ? moisValide(d) : finMois;
  const { debut, fin } = periodeRapport(debutMois, finMois);

  const [r, etablissement] = await Promise.all([
    rapportFinancier(user.etablissementId, debut, fin),
    db.etablissement.findUniqueOrThrow({ where: { id: user.etablissementId } }),
  ]);
  const periode = debutMois === finMois ? fmtPeriode(debutMois) : fmtPeriode(debutMois) + " à " + fmtPeriode(finMois);
  const deux = [
    { titre: "Poste", largeur: 70 },
    { titre: "Montant", largeur: 30, droite: true },
  ];

  return reponsePdf(
    "rapport-financier-" + debutMois + (debutMois === finMois ? "" : "-" + finMois) + ".pdf",
    async () => {
      const { renderToBuffer } = await import("@react-pdf/renderer");
      const { DocumentTableauPDF } = await import("@/lib/pdf/DocumentTableauPDF");
      return renderToBuffer(
        DocumentTableauPDF({
          etablissement,
          titre: "Rapport financier",
          sousTitre: periode,
          resume: [
            ["Recettes", montantPdf(r.totalRecettes)],
            ["Charges", montantPdf(r.totalCharges)],
            ["Résultat", montantPdf(r.resultat)],
            ["Impayés à fin de période", montantPdf(r.impayes)],
          ],
          sections: [
            { titre: "Recettes de l'école", colonnes: deux, lignes: r.recettes.map((x) => [x.libelle, montantPdf(x.montant)]), total: ["Total des recettes", montantPdf(r.totalRecettes)] },
            { titre: "Charges de l'école", colonnes: deux, lignes: r.charges.map((x) => [x.libelle, montantPdf(x.montant)]), total: ["Total des charges", montantPdf(r.totalCharges)], vide: "Aucune charge sur la période." },
            {
              titre: "Promoteur (hors recettes et charges)",
              colonnes: deux,
              lignes: [
                ["Apports de capital", montantPdf(r.apports)],
                ["Retraits du promoteur", montantPdf(r.retraits)],
              ],
              total: ["Apport net", montantPdf(r.apports - r.retraits)],
            },
            {
              titre: "Soldes des caisses",
              colonnes: [
                { titre: "Caisse", largeur: 40 },
                { titre: "Début de période", largeur: 30, droite: true },
                { titre: "Fin de période", largeur: 30, droite: true },
              ],
              lignes: r.soldesFin.map((c, i) => [LIB_CAISSE[c.caisse], montantPdf(r.soldesDebut[i].solde), montantPdf(c.solde)]),
              total: [
                "Total",
                montantPdf(r.soldesDebut.reduce((s, c) => s + c.solde, 0)),
                montantPdf(r.soldesFin.reduce((s, c) => s + c.solde, 0)),
              ],
              note: "Outil de gestion interne : ce rapport ne remplace pas une comptabilité conforme au référentiel SYSCOHADA.",
            },
          ],
        })
      );
    },
    { detail: true, prive: true }
  );
}
