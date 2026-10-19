import { NextRequest, NextResponse } from "next/server";
import { reponsePdf } from "@/lib/pdf/reponse";
import { ecole } from "@/lib/data/ecole";
import { getUtilisateurCourant } from "@/lib/auth/session";
import { peut } from "@/lib/auth/permissions";
import { assurerCodeParent, qrCodeDataUrl, urlPortailParent } from "@/lib/portail/acces";

export async function GET(_: NextRequest, { params }: { params: Promise<{ eleveId: string }> }) {
  const { eleveId } = await params;

  const user = await getUtilisateurCourant();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  if (!peut(user.roles, "eleve.read")) return NextResponse.json({ error: "Permission refusee" }, { status: 403 });
  const db = ecole(user);

  const eleve = await db.eleve.findUnique({
    where: { id: eleveId },
    include: {
      etablissement: true,
      classe: { include: { anneeScolaire: true } },
      fraisScolarite: {
        include: { tranches: { where: { ordre: 0 }, include: { paiements: { where: { annule: false } } } } },
        orderBy: { dateDebut: "desc" },
        take: 1,
      },
    },
  });
  if (!eleve || eleve.etablissementId !== user.etablissementId) {
    return NextResponse.json({ error: "Eleve introuvable" }, { status: 404 });
  }

  const code = await assurerCodeParent(eleve.etablissementId, eleve.id);
  const urlParent = await urlPortailParent(code);

  const f = eleve.fraisScolarite[0];
  const trancheInscription = f?.tranches[0];
  const payeInscription = trancheInscription?.paiements.reduce((s, p) => s + p.montant, 0) ?? 0;
  const c = eleve.classe;

  return reponsePdf(
    "fiche-inscription-" + eleve.matricule + ".pdf",
    // Moteur PDF charge ici : une erreur de chargement est aussi capturee et journalisee
    async () => {
      const { renderToBuffer } = await import("@react-pdf/renderer");
      const { FicheInscriptionPDF } = await import("@/lib/pdf/FicheInscriptionPDF");
      return renderToBuffer(
    FicheInscriptionPDF({
      etablissement: eleve.etablissement,
      eleve,
      classe: c ? (c.nom || (c.niveau + (c.section ? " " + c.section : ""))) : null,
      anneeScolaire: c?.anneeScolaire.libelle ?? null,
      frais: f
        ? {
            inscription: f.fraisInscription,
            inscriptionClasse: c?.fraisInscription ?? f.fraisInscription,
            inscriptionPayee: !!trancheInscription && payeInscription >= trancheInscription.montant - 0.01,
            mensuel: f.fraisScolariteMensuel,
          }
        : null,
      urlParent,
      qrDataUrl: await qrCodeDataUrl(urlParent),
    })
      );
    },
    { detail: true, prive: true }
  );
}
