import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const C = {
  ink: "#0F172A",
  inkMuted: "#64748B",
  inkFaint: "#94A3B8",
  brand: "#1E3A5F",
  gold: "#B8893B",
  border: "#E2E8F0",
  surface: "#F1F5F9",
  danger: "#A32D2D",
  accent: "#0F766E",
};

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9, fontFamily: "Helvetica", color: C.ink },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: C.gold,
    paddingBottom: 10,
    marginBottom: 12,
  },
  headerLeft: { flexDirection: "row", gap: 10, alignItems: "center" },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontSize: 7, color: C.gold, textAlign: "center" },
  etabNom: { fontSize: 12, fontWeight: "bold", color: C.brand },
  etabInfo: { fontSize: 7, color: C.inkMuted, marginTop: 2 },
  headerRight: { textAlign: "right" },
  titre: { fontSize: 13, fontWeight: "bold", color: C.brand },
  sousTitre: { fontSize: 8, color: C.inkMuted, marginTop: 2 },

  resume: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  resumeItem: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: 6,
    padding: 6,
  },
  resumeLabel: { fontSize: 6, color: C.inkMuted, textTransform: "uppercase" },
  resumeValue: { fontSize: 12, fontWeight: "bold", marginTop: 2 },
  resumeValueDanger: { color: C.danger },

  table: { borderTopWidth: 0.5, borderTopColor: C.border },
  thead: { flexDirection: "row", backgroundColor: C.brand },
  th: { color: "#FFFFFF", fontSize: 7, fontWeight: "bold", padding: 5, textAlign: "center" },
  thLeft: { textAlign: "left", paddingLeft: 6 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.border },
  rowAlt: { backgroundColor: "#FAFBFC" },
  rowDanger: { backgroundColor: "#FEF2F2" },
  td: { padding: 5, fontSize: 8, textAlign: "center" },
  tdLeft: { textAlign: "left", paddingLeft: 6 },
  tdRight: { textAlign: "right", paddingRight: 6 },
  tdDanger: { color: C.danger, fontWeight: "bold" },
  tdBold: { fontWeight: "bold" },

  colEleve: { width: "22%" },
  colClasse: { width: "10%" },
  colPeriode: { width: "16%" },
  colEcheance: { width: "12%" },
  colMontant: { width: "11%" },
  colPaye: { width: "11%" },
  colReste: { width: "13%" },
  colStatut: { width: "10%" },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: C.inkFaint,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 4,
  },
  mention: {
    marginTop: 10,
    fontSize: 7,
    color: C.inkMuted,
    textAlign: "center",
    fontStyle: "italic",
  },
});

function fmtDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("fr-FR");
}

function fmtMontant(n: number): string {
  return n.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ");
}

export function RappelsPDF({
  etablissement,
  rappels,
  periode,
  filtre,
}: {
  etablissement: any;
  rappels: any[];
  periode?: string;
  filtre?: string;
}) {
  const totalReste = rappels.reduce((s, r) => {
    const paye = r.tranche.paiements.filter((p: any) => !p.annule).reduce((ss: number, p: any) => ss + p.montant, 0);
    return s + (r.tranche.montant - paye);
  }, 0);
  const nbEnAttente = rappels.filter((r) => !r.envoye).length;
  const nbEnvoyes = rappels.filter((r) => r.envoye).length;

  // Grouper par eleve
  const parEleve = new Map<string, any[]>();
  for (const r of rappels) {
    const key = r.tranche.frais.eleve.id;
    if (!parEleve.has(key)) parEleve.set(key, []);
    parEleve.get(key)!.push(r);
  }

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* En-tete */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>LOGO</Text>
            </View>
            <View>
              <Text style={styles.etabNom}>{etablissement.nom}</Text>
              <Text style={styles.etabInfo}>
                {etablissement.adresse || ""}
                {etablissement.telephone ? " - Tel. " + etablissement.telephone : ""}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.titre}>Liste des rappels</Text>
            <Text style={styles.sousTitre}>
              {periode ? "Periode : " + periode : "Toutes les periodes"}
              {filtre === "en_attente" ? " - En attente uniquement" : ""}
              {filtre === "envoye" ? " - Envoyes uniquement" : ""}
            </Text>
          </View>
        </View>

        {/* Resume */}
        <View style={styles.resume}>
          <View style={styles.resumeItem}>
            <Text style={styles.resumeLabel}>Total rappels</Text>
            <Text style={styles.resumeValue}>{rappels.length}</Text>
          </View>
          <View style={styles.resumeItem}>
            <Text style={styles.resumeLabel}>En attente</Text>
            <Text style={styles.resumeValue}>{nbEnAttente}</Text>
          </View>
          <View style={styles.resumeItem}>
            <Text style={styles.resumeLabel}>Envoyes</Text>
            <Text style={styles.resumeValue}>{nbEnvoyes}</Text>
          </View>
          <View style={styles.resumeItem}>
            <Text style={styles.resumeLabel}>Eleves concernes</Text>
            <Text style={styles.resumeValue}>{parEleve.size}</Text>
          </View>
          <View style={styles.resumeItem}>
            <Text style={styles.resumeLabel}>Total reste a payer</Text>
            <Text style={[styles.resumeValue, styles.resumeValueDanger]}>
              {fmtMontant(totalReste)} F
            </Text>
          </View>
        </View>

        {/* Tableau */}
        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, styles.thLeft, styles.colEleve]}>Eleve</Text>
            <Text style={[styles.th, styles.colClasse]}>Classe</Text>
            <Text style={[styles.th, styles.colPeriode]}>Periode</Text>
            <Text style={[styles.th, styles.colEcheance]}>Echeance</Text>
            <Text style={[styles.th, styles.colMontant]}>Montant</Text>
            <Text style={[styles.th, styles.colPaye]}>Paye</Text>
            <Text style={[styles.th, styles.colReste]}>Reste</Text>
            <Text style={[styles.th, styles.colStatut]}>Statut</Text>
          </View>

          {rappels.map((r, i) => {
            const paye = r.tranche.paiements.filter((p: any) => !p.annule).reduce((s: number, p: any) => s + p.montant, 0);
            const reste = r.tranche.montant - paye;
            const enRetard = new Date(r.tranche.dateEcheance) < new Date();
            const rowStyle = i % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row;
            const rowStyleFinal = enRetard ? [styles.row, styles.rowDanger] : rowStyle;

            return (
              <View key={r.id} style={rowStyleFinal}>
                <Text style={[styles.td, styles.tdLeft, styles.colEleve]}>
                  {r.tranche.frais.eleve.nom} {r.tranche.frais.eleve.prenom}
                </Text>
                <Text style={[styles.td, styles.colClasse]}>
                  {r.tranche.frais.eleve.classe
                    ? r.tranche.frais.eleve.classe.nom ||
                      (r.tranche.frais.eleve.classe.niveau + (r.tranche.frais.eleve.classe.section ? " " + r.tranche.frais.eleve.classe.section : ""))
                    : "-"}
                </Text>
                <Text style={[styles.td, styles.colPeriode]}>{r.tranche.libelle}</Text>
                <Text style={[styles.td, styles.colEcheance]}>
                  {fmtDate(r.tranche.dateEcheance)}
                </Text>
                <Text style={[styles.td, styles.colMontant]}>{fmtMontant(r.tranche.montant)}</Text>
                <Text style={[styles.td, styles.colPaye]}>{paye > 0 ? fmtMontant(paye) : "-"}</Text>
                <Text style={[styles.td, styles.colReste, styles.tdBold, styles.tdDanger]}>
                  {fmtMontant(reste)}
                </Text>
                <Text style={[styles.td, styles.colStatut]}>
                  {r.envoye ? "Envoye" : "En attente"}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.mention}>
          Document interne - Liste des rappels a traiter. Genere le {fmtDate(new Date())}.
        </Text>

        <View style={styles.footer} fixed>
          <Text>{etablissement.nom} - Liste des rappels</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}