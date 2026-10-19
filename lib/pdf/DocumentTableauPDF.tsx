import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

// Modele de document PDF commun : en-tete de l'etablissement (avec logo),
// identite, chiffres cles, puis sections en tableau. Sert aux fiches de
// scolarite, de paiements du personnel, de presence et au rapport financier.

const C = {
  ink: "#0F172A",
  inkMuted: "#64748B",
  inkFaint: "#94A3B8",
  brand: "#1E3A5F",
  gold: "#B8893B",
  border: "#E2E8F0",
  surface: "#F1F5F9",
};

const s = StyleSheet.create({
  page: { paddingTop: 34, paddingBottom: 44, paddingHorizontal: 34, fontSize: 9, fontFamily: "Helvetica", color: C.ink },
  entete: { flexDirection: "row", alignItems: "center", borderBottomWidth: 2, borderBottomColor: C.gold, paddingBottom: 10, marginBottom: 14 },
  logo: { width: 44, height: 44, marginRight: 12, objectFit: "contain" },
  etabNom: { fontSize: 13, fontWeight: "bold", color: C.brand },
  etabInfo: { fontSize: 8, color: C.inkMuted, marginTop: 2 },
  titreBloc: { marginLeft: "auto", alignItems: "flex-end" },
  titre: { fontSize: 13, fontWeight: "bold", color: C.brand },
  sousTitre: { fontSize: 8.5, color: C.inkMuted, marginTop: 2 },
  identite: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  idItem: { width: "33%", marginBottom: 6 },
  label: { fontSize: 7.5, color: C.inkMuted },
  valeur: { fontSize: 9.5, fontWeight: "bold", marginTop: 1 },
  resume: { flexDirection: "row", marginBottom: 14 },
  resumeItem: { flex: 1, backgroundColor: C.surface, borderRadius: 6, padding: 8, marginRight: 6 },
  resumeValeur: { fontSize: 11, fontWeight: "bold", color: C.brand, marginTop: 2 },
  section: { marginBottom: 14 },
  sectionTitre: { fontSize: 10, fontWeight: "bold", color: C.brand, marginBottom: 5 },
  ligneEntete: { flexDirection: "row", backgroundColor: C.brand, color: "#FFFFFF", paddingVertical: 4, paddingHorizontal: 4 },
  ligne: { flexDirection: "row", paddingVertical: 3.5, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: C.border },
  ligneTotal: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 4, backgroundColor: C.surface },
  // Marge interieure : deux colonnes voisines ne se touchent jamais
  cellEntete: { fontSize: 7.5, fontWeight: "bold", paddingHorizontal: 3 },
  cell: { fontSize: 8, paddingHorizontal: 3 },
  vide: { fontSize: 8, color: C.inkMuted, paddingVertical: 6 },
  note: { fontSize: 7.5, color: C.inkMuted, marginTop: 4 },
  pied: { position: "absolute", bottom: 18, left: 34, right: 34, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: C.inkFaint },
});

export type Colonne = { titre: string; largeur: number; droite?: boolean };
export type Section = {
  titre: string;
  colonnes: Colonne[];
  lignes: string[][];
  total?: string[];
  vide?: string;
  note?: string;
};

export type DocumentTableau = {
  etablissement: { nom: string; adresse?: string | null; telephone?: string | null; logo?: string | null };
  titre: string;
  sousTitre?: string;
  identite?: [string, string][];
  resume?: [string, string][];
  sections: Section[];
  paysage?: boolean;
};

// Montant au format F CFA, espaces simples (les espaces fines manquent dans Helvetica)
export function montantPdf(n: number): string {
  return n.toLocaleString("fr-FR").replace(/ | /g, " ") + " F";
}
export function datePdf(d: Date | string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("fr-FR");
}

function Tableau({ section }: { section: Section }) {
  const style = (c: Colonne) => ({ width: c.largeur + "%", textAlign: (c.droite ? "right" : "left") as "right" | "left" });
  return (
    <View style={s.section} wrap>
      <Text style={s.sectionTitre}>{section.titre}</Text>
      <View style={s.ligneEntete} fixed>
        {section.colonnes.map((c) => (
          <Text key={c.titre} style={[s.cellEntete, style(c)]}>{c.titre}</Text>
        ))}
      </View>
      {section.lignes.length === 0 ? (
        <Text style={s.vide}>{section.vide ?? "Aucune donnée."}</Text>
      ) : (
        section.lignes.map((l, i) => (
          <View key={i} style={s.ligne} wrap={false}>
            {l.map((v, j) => (
              <Text key={j} style={[s.cell, style(section.colonnes[j])]}>{v}</Text>
            ))}
          </View>
        ))
      )}
      {section.total && (
        <View style={s.ligneTotal} wrap={false}>
          {section.total.map((v, j) => (
            <Text key={j} style={[s.cellEntete, style(section.colonnes[j])]}>{v}</Text>
          ))}
        </View>
      )}
      {section.note && <Text style={s.note}>{section.note}</Text>}
    </View>
  );
}

export function DocumentTableauPDF({ etablissement, titre, sousTitre, identite, resume, sections, paysage }: DocumentTableau) {
  return (
    <Document title={titre}>
      <Page size="A4" orientation={paysage ? "landscape" : "portrait"} style={s.page}>
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
            <Text style={s.titre}>{titre}</Text>
            {sousTitre && <Text style={s.sousTitre}>{sousTitre}</Text>}
          </View>
        </View>

        {identite && (
          <View style={s.identite}>
            {identite.map(([l, v]) => (
              <View key={l} style={s.idItem}>
                <Text style={s.label}>{l}</Text>
                <Text style={s.valeur}>{v}</Text>
              </View>
            ))}
          </View>
        )}

        {resume && (
          <View style={s.resume}>
            {resume.map(([l, v]) => (
              <View key={l} style={s.resumeItem}>
                <Text style={s.label}>{l}</Text>
                <Text style={s.resumeValeur}>{v}</Text>
              </View>
            ))}
          </View>
        )}

        {sections.map((sec) => (
          <Tableau key={sec.titre} section={sec} />
        ))}

        <View style={s.pied} fixed>
          <Text>Document généré le {datePdf(new Date())} par GES Mali</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
