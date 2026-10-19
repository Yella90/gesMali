import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { JOURS, disposer, enHeures, fmtDuree, indiceCouleur, libJour, plageHeures } from "@/lib/emploi-du-temps/creneaux";
import { datePdf } from "./DocumentTableauPDF";

// Emploi du temps en PDF : une page A4 paysage par classe, grille de la semaine
// (cours places selon leurs heures) puis matieres, enseignants et volume horaire.

const C = {
  ink: "#0F172A",
  inkMuted: "#64748B",
  inkFaint: "#94A3B8",
  brand: "#1E3A5F",
  gold: "#B8893B",
  border: "#E2E8F0",
  surface: "#F1F5F9",
};

// Memes teintes que la grille a l'ecran (Tailwind 50 / 200 / 800), dans l'ordre d'indiceCouleur
const COULEURS = [
  { fond: "#EFF6FF", bord: "#BFDBFE", texte: "#1E40AF" },
  { fond: "#ECFDF5", bord: "#A7F3D0", texte: "#065F46" },
  { fond: "#FFFBEB", bord: "#FDE68A", texte: "#92400E" },
  { fond: "#F5F3FF", bord: "#DDD6FE", texte: "#5B21B6" },
  { fond: "#FDF2F8", bord: "#FBCFE8", texte: "#9D174D" },
  { fond: "#ECFEFF", bord: "#A5F3FC", texte: "#155E75" },
  { fond: "#FFF7ED", bord: "#FED7AA", texte: "#9A3412" },
  { fond: "#F7FEE7", bord: "#D9F99D", texte: "#3F6212" },
];
const couleur = (matiere: string) => COULEURS[indiceCouleur(matiere)];

// Hauteur disponible pour les heures de la grille (A4 paysage, en-tete et legende deduits)
const HAUTEUR_GRILLE = 370;
const HAUTEUR_HEURE_MAX = 40;
const LARGEUR_HEURE = 36;

const s = StyleSheet.create({
  page: { paddingTop: 26, paddingBottom: 34, paddingHorizontal: 28, fontSize: 8, fontFamily: "Helvetica", color: C.ink },
  entete: { flexDirection: "row", alignItems: "center", borderBottomWidth: 2, borderBottomColor: C.gold, paddingBottom: 8, marginBottom: 10 },
  logo: { width: 38, height: 38, marginRight: 10, objectFit: "contain" },
  etabNom: { fontSize: 12, fontWeight: "bold", color: C.brand },
  etabInfo: { fontSize: 7.5, color: C.inkMuted, marginTop: 2 },
  titreBloc: { marginLeft: "auto", alignItems: "flex-end" },
  titre: { fontSize: 14, fontWeight: "bold", color: C.brand },
  sousTitre: { fontSize: 9, color: C.inkMuted, marginTop: 2 },
  infos: { flexDirection: "row", marginBottom: 8 },
  info: { marginRight: 28 },
  label: { fontSize: 7, color: C.inkMuted },
  valeur: { fontSize: 9, fontWeight: "bold", marginTop: 1 },
  grille: { borderWidth: 0.75, borderColor: C.border },
  ligneJours: { flexDirection: "row", backgroundColor: C.brand },
  jourEntete: { color: "#FFFFFF", fontSize: 8, fontWeight: "bold", textAlign: "center", paddingVertical: 4 },
  colonneJour: { flex: 1, borderLeftWidth: 0.75, borderLeftColor: C.border },
  heure: { fontSize: 7, color: C.inkMuted, textAlign: "center", paddingTop: 2, borderBottomWidth: 0.5, borderBottomColor: C.border },
  case: { position: "absolute", left: 0, right: 0, borderBottomWidth: 0.5, borderBottomColor: C.border },
  voie: { position: "absolute", padding: 1.5 },
  cours: { flexGrow: 1, borderWidth: 0.75, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 2, overflow: "hidden" },
  coursMatiere: { fontSize: 7.5, fontWeight: "bold" },
  coursDetail: { fontSize: 6.5, marginTop: 1 },
  vide: { fontSize: 8, color: C.inkMuted, marginTop: 6 },
  legendeTitre: { fontSize: 7, color: C.inkMuted, marginTop: 8, marginBottom: 3 },
  legende: { flexDirection: "row", flexWrap: "wrap" },
  puce: { flexDirection: "row", borderWidth: 0.75, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2, marginRight: 4, marginBottom: 3 },
  puceMatiere: { fontSize: 7, fontWeight: "bold" },
  puceDetail: { fontSize: 7 },
  pied: { position: "absolute", bottom: 14, left: 28, right: 28, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: C.inkFaint },
});

export type CoursPdf = { jour: string; heureDebut: string; heureFin: string; matiere: string; enseignant: string };
export type ClassePdf = { nom: string; annee: string; salle: string | null; titulaire: string | null; cours: CoursPdf[] };

type Etablissement = { nom: string; adresse?: string | null; telephone?: string | null; logo?: string | null };

const minutes = (c: CoursPdf) => Math.round((enHeures(c.heureFin) - enHeures(c.heureDebut)) * 60);
const hh = (h: number) => String(h).padStart(2, "0") + ":00";

function Grille({ cours }: { cours: CoursPdf[] }) {
  const heures = plageHeures(cours);
  const min = heures[0];
  const h = Math.min(HAUTEUR_HEURE_MAX, HAUTEUR_GRILLE / heures.length);

  return (
    <View style={s.grille} wrap={false}>
      <View style={s.ligneJours}>
        <Text style={[s.jourEntete, { width: LARGEUR_HEURE }]}>Heure</Text>
        {JOURS.map((j) => (
          <Text key={j} style={[s.jourEntete, { flex: 1 }]}>
            {libJour(j)}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: "row", height: heures.length * h }}>
        <View style={{ width: LARGEUR_HEURE }}>
          {heures.map((x) => (
            <Text key={x} style={[s.heure, { height: h }]}>
              {hh(x)}
            </Text>
          ))}
        </View>
        {JOURS.map((j) => (
          <View key={j} style={s.colonneJour}>
            {heures.map((x, i) => (
              <View key={x} style={[s.case, { top: i * h, height: h }]} />
            ))}
            {disposer(cours.filter((c) => c.jour === j)).map(({ c, voie, voies }, i) => {
              const hauteur = (minutes(c) / 60) * h;
              const teinte = couleur(c.matiere);
              return (
                <View
                  key={i}
                  style={[
                    s.voie,
                    {
                      top: (enHeures(c.heureDebut) - min) * h,
                      height: hauteur,
                      left: (voie / voies) * 100 + "%",
                      width: 100 / voies + "%",
                    },
                  ]}
                >
                  <View style={[s.cours, { backgroundColor: teinte.fond, borderColor: teinte.bord }]}>
                    <Text style={[s.coursMatiere, { color: teinte.texte }]}>{c.matiere}</Text>
                    {hauteur >= 30 && <Text style={[s.coursDetail, { color: teinte.texte }]}>{c.enseignant}</Text>}
                    {hauteur >= 20 && (
                      <Text style={[s.coursDetail, { color: teinte.texte }]}>
                        {c.heureDebut} – {c.heureFin}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

// Matieres de la classe : enseignants et heures de cours par semaine
function Legende({ cours }: { cours: CoursPdf[] }) {
  const parMatiere = new Map<string, { enseignants: Set<string>; minutes: number }>();
  for (const c of cours) {
    const m = parMatiere.get(c.matiere) ?? { enseignants: new Set<string>(), minutes: 0 };
    m.enseignants.add(c.enseignant);
    m.minutes += minutes(c);
    parMatiere.set(c.matiere, m);
  }
  const lignes = [...parMatiere.entries()].sort(([a], [b]) => a.localeCompare(b, "fr"));

  return (
    <View wrap={false}>
      <Text style={s.legendeTitre}>Matières, enseignants et heures par semaine</Text>
      <View style={s.legende}>
        {lignes.map(([matiere, m]) => {
          const teinte = couleur(matiere);
          return (
            <View key={matiere} style={[s.puce, { backgroundColor: teinte.fond, borderColor: teinte.bord }]}>
              {/* Un seul Text : react-pdf supprime l'espace en tete d'un Text voisin */}
              <Text style={[s.puceDetail, { color: teinte.texte }]}>
                <Text style={s.puceMatiere}>{matiere}</Text>
                {" · " + [...m.enseignants].join(", ") + " · " + fmtDuree(m.minutes)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function EmploiDuTempsPDF({ etablissement, classes }: { etablissement: Etablissement; classes: ClassePdf[] }) {
  return (
    <Document title={classes.length === 1 ? "Emploi du temps " + classes[0].nom : "Emplois du temps"}>
      {classes.map((classe, i) => {
        const total = classe.cours.reduce((t, c) => t + minutes(c), 0);
        const infos: [string, string][] = [
          ["Classe", classe.nom],
          ["Année scolaire", classe.annee],
          ...(classe.titulaire ? [["Titulaire", classe.titulaire] as [string, string]] : []),
          ...(classe.salle ? [["Salle", classe.salle] as [string, string]] : []),
          ["Volume hebdomadaire", fmtDuree(total)],
        ];
        return (
          <Page key={i} size="A4" orientation="landscape" style={s.page}>
            <View style={s.entete}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- Image react-pdf */}
              {etablissement.logo && <Image src={etablissement.logo} style={s.logo} />}
              <View>
                <Text style={s.etabNom}>{etablissement.nom}</Text>
                <Text style={s.etabInfo}>
                  {[etablissement.adresse, etablissement.telephone ? "Tél. " + etablissement.telephone : null].filter(Boolean).join(" - ")}
                </Text>
              </View>
              <View style={s.titreBloc}>
                <Text style={s.titre}>Emploi du temps</Text>
                <Text style={s.sousTitre}>
                  {classe.nom} · {classe.annee}
                </Text>
              </View>
            </View>

            <View style={s.infos}>
              {infos.map(([l, v]) => (
                <View key={l} style={s.info}>
                  <Text style={s.label}>{l}</Text>
                  <Text style={s.valeur}>{v}</Text>
                </View>
              ))}
            </View>

            <Grille cours={classe.cours} />
            {classe.cours.length === 0 ? (
              <Text style={s.vide}>Aucun cours planifié pour cette classe : grille vierge à compléter.</Text>
            ) : (
              <Legende cours={classe.cours} />
            )}

            <View style={s.pied} fixed>
              <Text>Document généré le {datePdf(new Date())} par GES Mali</Text>
              <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
