import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { utilisateurApi } from "@/lib/auth/api";
import { reponsePdf } from "@/lib/pdf/reponse";
import { datePdf, montantPdf, type Section } from "@/lib/pdf/DocumentTableauPDF";

const MODES: Record<string, string> = { ESPECES: "Espèces", VIREMENT: "Virement", MOBILE_MONEY: "Mobile Money", CHEQUE: "Chèque" };

// Fiche de scolarite d'un eleve : echeances et paiements de chaque annee
export async function GET(_: NextRequest, { params }: { params: Promise<{ eleveId: string }> }) {
  const { eleveId } = await params;
  const { user, erreur } = await utilisateurApi("frais.read");
  if (erreur) return erreur;

  const eleve = await prisma.eleve.findUnique({
    where: { id: eleveId },
    include: {
      etablissement: true,
      classe: true,
      fraisScolarite: {
        include: {
          anneeScolaire: true,
          tranches: { orderBy: { ordre: "asc" }, include: { paiements: { orderBy: { datePaiement: "asc" } } } },
        },
        orderBy: { dateDebut: "desc" },
      },
    },
  });
  if (!eleve || eleve.etablissementId !== user.etablissementId) {
    return NextResponse.json({ error: "Eleve introuvable" }, { status: 404 });
  }

  let totalDu = 0;
  let totalPaye = 0;
  const sections: Section[] = [];
  for (const f of eleve.fraisScolarite) {
    const lignesEch: string[][] = [];
    const lignesPai: string[][] = [];
    let du = 0;
    let paye = 0;
    for (const t of f.tranches) {
      const p = t.paiements.filter((x) => !x.annule).reduce((s, x) => s + x.montant, 0);
      du += t.montant;
      paye += p;
      const reste = Math.max(0, t.montant - p);
      const statut =
        reste <= 0.01 ? "Payé" : p > 0 ? "Partiel" : new Date(t.dateEcheance) < new Date() ? "En retard" : "À venir";
      lignesEch.push([t.libelle, datePdf(t.dateEcheance), montantPdf(t.montant), montantPdf(p), montantPdf(reste), statut]);
      for (const x of t.paiements) {
        lignesPai.push([
          datePdf(x.datePaiement),
          x.recuNumero,
          t.libelle,
          MODES[x.mode] ?? x.mode,
          (x.annule ? "Annulé - " : "") + montantPdf(x.montant),
        ]);
      }
    }
    totalDu += du;
    totalPaye += paye;
    sections.push({
      titre: "Échéances " + f.anneeScolaire.libelle,
      colonnes: [
        { titre: "Échéance", largeur: 24 },
        { titre: "Date", largeur: 14 },
        { titre: "Montant", largeur: 16, droite: true },
        { titre: "Payé", largeur: 16, droite: true },
        { titre: "Reste", largeur: 16, droite: true },
        { titre: "Statut", largeur: 14 },
      ],
      lignes: lignesEch,
      total: ["Total", "", montantPdf(du), montantPdf(paye), montantPdf(Math.max(0, du - paye)), ""],
    });
    sections.push({
      titre: "Paiements " + f.anneeScolaire.libelle,
      colonnes: [
        { titre: "Date", largeur: 14 },
        { titre: "Reçu", largeur: 22 },
        { titre: "Échéance", largeur: 24 },
        { titre: "Mode", largeur: 16 },
        { titre: "Montant", largeur: 24, droite: true },
      ],
      lignes: lignesPai,
      vide: "Aucun paiement enregistré.",
    });
  }

  const c = eleve.classe;
  return reponsePdf(
    "scolarite-" + eleve.matricule + ".pdf",
    async () => {
      const { renderToBuffer } = await import("@react-pdf/renderer");
      const { DocumentTableauPDF } = await import("@/lib/pdf/DocumentTableauPDF");
      return renderToBuffer(
        DocumentTableauPDF({
          etablissement: eleve.etablissement,
          titre: "Fiche de scolarité",
          sousTitre: "Matricule " + eleve.matricule,
          identite: [
            ["Élève", eleve.nom + " " + eleve.prenom],
            ["Classe", c ? c.nom || c.niveau + (c.section ? " " + c.section : "") : "-"],
            ["Parent / tuteur", (eleve.tuteurNom ?? "-") + (eleve.tuteurTelephone ? " (" + eleve.tuteurTelephone + ")" : "")],
          ],
          resume: [
            ["Total dû", montantPdf(totalDu)],
            ["Total payé", montantPdf(totalPaye)],
            ["Reste à payer", montantPdf(Math.max(0, totalDu - totalPaye))],
          ],
          sections: sections.length
            ? sections
            : [
                {
                  titre: "Échéances",
                  colonnes: [{ titre: "Échéance", largeur: 100 }],
                  lignes: [],
                  vide: "Aucun frais de scolarité configuré pour cet élève.",
                },
              ],
        })
      );
    },
    { detail: true, prive: true }
  );
}
