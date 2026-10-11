import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const MOIS_FR = ["Janvier","F{{e}}vrier","Mars","Avril","Mai","Juin","Juillet","Ao{{u}}t","Septembre","Octobre","Novembre","D{{e}}cembre"];
function libelleMois(a: number, m: number) { return MOIS_FR[m - 1] + " " + a; }
function periodeStr(a: number, m: number) { return a + "-" + String(m).padStart(2, "0"); }

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const eleves = await prisma.eleve.findMany({
    where: { statut: "INSCRIT", fraisScolarite: { none: {} } },
    include: { classe: { include: { anneeScolaire: true } } },
  });

  console.log(eleves.length + " eleve(s) sans frais");

  let crees = 0;
  let ignores = 0;

  for (const e of eleves) {
    if (!e.classe) { ignores++; continue; }
    const c = e.classe;
    if (c.fraisInscription === 0 && c.fraisScolariteMensuel === 0) { ignores++; continue; }

    const debut = new Date(c.anneeScolaire.dateDebut);
    const fin = new Date(c.anneeScolaire.dateFin);
    const nbMois = (fin.getFullYear() - debut.getFullYear()) * 12 + (fin.getMonth() - debut.getMonth()) + 1;

    const tranches: any[] = [];
    if (c.fraisInscription > 0) {
      tranches.push({
        libelle: "Inscription",
        periode: periodeStr(debut.getFullYear(), debut.getMonth() + 1),
        ordre: 0,
        montant: c.fraisInscription,
        dateEcheance: new Date(debut.getFullYear(), debut.getMonth(), 5),
      });
    }

    let anneeCur = debut.getFullYear();
    let moisCur = debut.getMonth() + 1;
    for (let i = 0; i < nbMois; i++) {
      tranches.push({
        libelle: libelleMois(anneeCur, moisCur),
        periode: periodeStr(anneeCur, moisCur),
        ordre: i + 1,
        montant: c.fraisScolariteMensuel,
        dateEcheance: new Date(anneeCur, moisCur - 1, 5),
      });
      moisCur++;
      if (moisCur > 12) { moisCur = 1; anneeCur++; }
    }

    await prisma.fraisScolarite.create({
      data: {
        etablissementId: e.etablissementId,
        eleveId: e.id,
        anneeScolaireId: c.anneeScolaireId,
        fraisInscription: c.fraisInscription,
        fraisScolariteMensuel: c.fraisScolariteMensuel,
        reduction: 0,
        dateDebut: debut,
        tranches: { create: tranches },
      },
    });
    crees++;
    console.log("  + " + e.nom + " " + e.prenom + " (" + e.classe.nom + ")");
  }

  console.log("\n" + crees + " cree(s), " + ignores + " ignore(s)");
  await prisma.$disconnect();
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });