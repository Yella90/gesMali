import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { BulletinPDF } from "@/lib/pdf/BulletinPDF";

// Bulletin PDF d'un eleve pour un trimestre (null si non genere).
// Le controle d'acces est fait par l'appelant (etablissementId renvoye).
export async function rendreBulletinEleve(eleveId: string, trimestreId: string) {
  const bulletin = await prisma.bulletin.findUnique({
    where: { eleveId_trimestreId: { eleveId, trimestreId } },
    include: {
      eleve: true,
      lignes: { orderBy: { nomMatiere: "asc" } },
      classe: {
        include: {
          etablissement: true,
          anneeScolaire: true,
          professeurPrincipal: { select: { nom: true, prenom: true } },
          titulaire: { select: { nom: true, prenom: true } },
        },
      },
      trimestre: true,
    },
  });
  if (!bulletin) return null;

  const profPrincipal = bulletin.classe.professeurPrincipal ?? bulletin.classe.titulaire;
  const classeAvecProf = { ...bulletin.classe, professeurPrincipal: profPrincipal };

  const buffer = await renderToBuffer(
    BulletinPDF({
      etablissement: bulletin.classe.etablissement,
      classe: classeAvecProf,
      trimestre: bulletin.trimestre,
      anneeScolaire: bulletin.classe.anneeScolaire,
      bulletins: [bulletin],
    })
  );

  return {
    buffer,
    etablissementId: bulletin.classe.etablissementId,
    classeId: bulletin.classeId,
    nomFichier: "bulletin-" + bulletin.eleve.matricule + ".pdf",
  };
}
