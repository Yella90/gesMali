import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

const C = {
  ink: "#0F172A",
  inkMuted: "#64748B",
  inkFaint: "#94A3B8",
  brand: "#1E3A5F",
  gold: "#B8893B",
  border: "#E2E8F0",
  surface: "#F1F5F9",
  danger: "#A32D2D",
};

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica", color: C.ink },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: C.gold,
    paddingBottom: 10,
    marginBottom: 10,
  },
  headerLeft: { flexDirection: "row", gap: 10, alignItems: "center" },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: { width: 44, height: 44, objectFit: "contain" },
  logoText: { fontSize: 8, color: C.gold, textAlign: "center" },
  etabNom: { fontSize: 13, fontWeight: "bold", color: C.brand },
  etabInfo: { fontSize: 8, color: C.inkMuted, marginTop: 2 },
  headerRight: { textAlign: "right" },
  titre: { fontSize: 14, fontWeight: "bold", color: C.brand },
  sousTitre: { fontSize: 8, color: C.inkMuted, marginTop: 2 },

  infoGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  infoCell: { width: "25%", marginBottom: 6 },
  infoCellLarge: { width: "50%", marginBottom: 6 },
  infoLabel: { fontSize: 7, color: C.inkMuted, textTransform: "uppercase" },
  infoValue: { fontSize: 10, fontWeight: "bold", marginTop: 1 },

  table: { borderTopWidth: 0.5, borderTopColor: C.border },
  thead: { flexDirection: "row", backgroundColor: C.brand },
  th: { color: "#FFFFFF", fontSize: 8, fontWeight: "bold", padding: 5, textAlign: "center" },
  thLeft: { textAlign: "left", paddingLeft: 6 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.border },
  rowAlt: { backgroundColor: "#FAFBFC" },
  td: { padding: 5, fontSize: 9, textAlign: "center" },
  tdLeft: { textAlign: "left", paddingLeft: 6 },
  tdSub: { fontSize: 7, color: C.inkMuted, marginTop: 1 },
  tdStrong: { fontWeight: "bold" },
  tdDanger: { color: C.danger, fontWeight: "bold" },
  tfoot: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  tfootTd: { padding: 5, fontSize: 9, fontWeight: "bold", textAlign: "center" },
  tfootLeft: { textAlign: "left", paddingLeft: 6 },

  colMatiere: { width: "28%" },
  colDev: { width: "9%" },
  colCompo: { width: "10%" },
  colMoy: { width: "9%" },
  colCoef: { width: "8%" },
  colPoints: { width: "11%" },
  colRang: { width: "9%" },
  colMoyClasse: { width: "16%" },

  stats: { flexDirection: "row", gap: 6, marginTop: 10, marginBottom: 10 },
  stat: { flex: 1, borderRadius: 8, borderWidth: 0.5, borderColor: C.border, padding: 8 },
  statPrimary: { borderWidth: 1, borderColor: C.brand },
  statLabel: { fontSize: 7, color: C.inkMuted, textTransform: "uppercase" },
  statValue: { fontSize: 16, fontWeight: "bold", marginTop: 2 },
  statValuePrimary: { color: C.brand },
  statSub: { fontSize: 9, color: C.inkMuted, fontWeight: "normal" },

  appreciation: {
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  appreciationLabel: { fontSize: 7, color: C.inkMuted, textTransform: "uppercase", marginBottom: 3 },
  appreciationText: { fontSize: 10 },

  signatures: { flexDirection: "row", gap: 24, marginTop: 8 },
  signature: {
    flex: 1,
    borderTopWidth: 0.5,
    borderTopColor: C.inkFaint,
    paddingTop: 5,
    height: 45,
  },
  signatureText: { fontSize: 8, color: C.inkMuted },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: C.inkMuted,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 5,
    marginTop: 8,
  },
});

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null) return "-";
  return n.toFixed(decimals).replace(".", ",");
}

function fmtDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("fr-FR");
}

function ordinal(n: number): string {
  return n === 1 ? "1er" : n + "e";
}

function typeEtablissement(t: string): string {
  if (t === "PRIVE") return "Etablissement prive";
  if (t === "PUBLIC") return "Etablissement public";
  if (t === "COMMUNAUTAIRE") return "Etablissement communautaire";
  if (t === "MEDERSA") return "Medersa";
  return "Etablissement";
}

export function BulletinPDF({
  etablissement,
  classe,
  trimestre,
  anneeScolaire,
  bulletins,
}: {
  etablissement: any;
  classe: any;
  trimestre: any;
  anneeScolaire: any;
  bulletins: any[];
}) {
  return (
    <Document>
      {bulletins.map((b) => {
        const lignes = b.lignes ?? [];
        return (
          <Page key={b.id} size="A4" style={styles.page}>
            {/* En-tete */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                {etablissement.logo ? (
                  // eslint-disable-next-line jsx-a11y/alt-text -- Image react-pdf, pas une balise HTML
                  <Image src={etablissement.logo} style={styles.logoImage} />
                ) : (
                  <View style={styles.logo}>
                    <Text style={styles.logoText}>{String(etablissement.nom ?? "").charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View>
                  <Text style={styles.etabNom}>{etablissement.nom}</Text>
                  <Text style={styles.etabInfo}>
                    {typeEtablissement(etablissement.type)}
                    {etablissement.adresse ? " - " + etablissement.adresse : ""}
                    {etablissement.telephone ? " - Tel. " + etablissement.telephone : ""}
                  </Text>
                </View>
              </View>
              <View style={styles.headerRight}>
                <Text style={styles.titre}>Bulletin de notes</Text>
                <Text style={styles.sousTitre}>
                  {trimestre.nom} - Annee {anneeScolaire.libelle}
                </Text>
              </View>
            </View>

            {/* Info grid */}
            <View style={styles.infoGrid}>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>Eleve</Text>
                <Text style={styles.infoValue}>
                  {b.eleve.nom} {b.eleve.prenom}
                </Text>
              </View>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>Matricule</Text>
                <Text style={styles.infoValue}>{b.eleve.matricule}</Text>
              </View>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>Classe</Text>
                <Text style={styles.infoValue}>
                  {classe.nom || classe.niveau + (classe.section ? " " + classe.section : "")}
                </Text>
              </View>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>Effectif</Text>
                <Text style={styles.infoValue}>{b.effectifClasse} eleves</Text>
              </View>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>Ne(e) le</Text>
                <Text style={styles.infoValue}>{fmtDate(b.eleve.dateNaissance)}</Text>
              </View>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>Sexe</Text>
                <Text style={styles.infoValue}>{b.eleve.sexe === "M" ? "M" : "F"}</Text>
              </View>
              <View style={styles.infoCellLarge}>
                <Text style={styles.infoLabel}>Professeur principal</Text>
                <Text style={styles.infoValue}>
                  {classe.professeurPrincipal
                    ? classe.professeurPrincipal.prenom + " " + classe.professeurPrincipal.nom
                    : "-"}
                </Text>
              </View>
            </View>

            {/* Tableau des matieres */}
            <View style={styles.table}>
              <View style={styles.thead}>
                <Text style={[styles.th, styles.thLeft, styles.colMatiere]}>Matiere</Text>
                <Text style={[styles.th, styles.colDev]}>Dev.</Text>
                <Text style={[styles.th, styles.colCompo]}>Compo.</Text>
                <Text style={[styles.th, styles.colMoy]}>Moy.</Text>
                <Text style={[styles.th, styles.colCoef]}>Coef.</Text>
                <Text style={[styles.th, styles.colPoints]}>Points</Text>
                <Text style={[styles.th, styles.colRang]}>Rang</Text>
                <Text style={[styles.th, styles.colMoyClasse]}>Moy. classe</Text>
              </View>

              {lignes.map((l: any, i: number) => {
                const faible = l.moyenneMatiere < 10;
                return (
                  <View
                    key={l.id}
                    style={i % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row}
                  >
                    <View style={styles.colMatiere}>
                      <Text style={[styles.td, styles.tdLeft]}>{l.nomMatiere}</Text>
                      {l.nomProfesseur && (
                        <Text style={[styles.tdSub, { paddingLeft: 6 }]}>{l.nomProfesseur}</Text>
                      )}
                    </View>
                    <Text style={[styles.td, styles.colDev]}>{fmt(l.moyenneDevoirs)}</Text>
                    <Text style={[styles.td, styles.colCompo]}>{fmt(l.moyenneCompo)}</Text>
                    <Text
                      style={[
                        styles.td,
                        styles.colMoy,
                        styles.tdStrong,
                        faible ? styles.tdDanger : {},
                      ]}
                    >
                      {fmt(l.moyenneMatiere)}
                    </Text>
                    <Text style={[styles.td, styles.colCoef]}>{l.coefficient}</Text>
                    <Text style={[styles.td, styles.colPoints]}>{fmt(l.points)}</Text>
                    <Text style={[styles.td, styles.colRang]}>
                      {l.rangMatiere ? ordinal(l.rangMatiere) : "-"}
                    </Text>
                    <Text style={[styles.td, styles.colMoyClasse]}>
                      {fmt(l.moyenneClasseMatiere)}
                    </Text>
                  </View>
                );
              })}

              <View style={styles.tfoot}>
                <Text style={[styles.tfootTd, styles.tfootLeft, styles.colMatiere]}>Total</Text>
                <Text style={[styles.tfootTd, styles.colDev]}></Text>
                <Text style={[styles.tfootTd, styles.colCompo]}></Text>
                <Text style={[styles.tfootTd, styles.colMoy]}></Text>
                <Text style={[styles.tfootTd, styles.colCoef]}>{b.totalCoeffs}</Text>
                <Text style={[styles.tfootTd, styles.colPoints]}>{fmt(b.totalPoints)}</Text>
                <Text style={[styles.tfootTd, styles.colRang]}></Text>
                <Text style={[styles.tfootTd, styles.colMoyClasse]}></Text>
              </View>
            </View>

            {/* 4 stats */}
            <View style={styles.stats}>
              <View style={[styles.stat, styles.statPrimary]}>
                <Text style={styles.statLabel}>Moyenne generale</Text>
                <Text style={[styles.statValue, styles.statValuePrimary]}>
                  {fmt(b.moyenneGenerale)} / 20
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Rang</Text>
                <Text style={styles.statValue}>
                  {b.rang ? ordinal(b.rang) : "-"}{" "}
                  <Text style={styles.statSub}>/ {b.effectifClasse}</Text>
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Moyenne de la classe</Text>
                <Text style={styles.statValue}>{fmt(b.moyenneClasse)}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Plus forte / plus faible</Text>
                <Text style={{ fontSize: 11, fontWeight: "bold", marginTop: 4 }}>
                  {fmt(b.moyennePlusForte)} - {fmt(b.moyennePlusFaible)}
                </Text>
              </View>
            </View>

            {/* Appreciation */}
            <View style={styles.appreciation}>
              <Text style={styles.appreciationLabel}>Appreciation du conseil de classe</Text>
              <Text style={styles.appreciationText}>
                {b.appreciation || "________________________________________"}
              </Text>
            </View>

            {/* Signatures */}
            <View style={styles.signatures}>
              <View style={styles.signature}>
                <Text style={styles.signatureText}>Le directeur (signature et cachet)</Text>
              </View>
              <View style={styles.signature}>
                <Text style={styles.signatureText}>Le parent ou tuteur (signature)</Text>
              </View>
            </View>

            {/* Pied de page */}
            <View style={styles.footer}>
              <Text>
                Genere le {fmtDate(b.genereLe)} - Version {b.version}
              </Text>
              <Text>Regle : (Composition x 2 + Moyenne des devoirs) / 3</Text>
            </View>
          </Page>
        );
      })}
    </Document>
  );
}