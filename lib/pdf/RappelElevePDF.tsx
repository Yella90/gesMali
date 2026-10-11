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
  dangerSoft: "#FEF2F2",
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: C.ink },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: C.gold,
    paddingBottom: 12,
    marginBottom: 20,
  },
  headerLeft: { flexDirection: "row", gap: 12, alignItems: "center" },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontSize: 8, color: C.gold, textAlign: "center" },
  etabNom: { fontSize: 14, fontWeight: "bold", color: C.brand },
  etabInfo: { fontSize: 8, color: C.inkMuted, marginTop: 3 },
  headerRight: { textAlign: "right" },
  titre: { fontSize: 16, fontWeight: "bold", color: C.brand },
  sousTitre: { fontSize: 9, color: C.inkMuted, marginTop: 3 },

  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 8,
    color: C.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    paddingBottom: 4,
  },
  row: { flexDirection: "row", marginBottom: 5 },
  label: { width: 140, fontSize: 9, color: C.inkMuted },
  value: { flex: 1, fontSize: 10, fontWeight: "bold" },

  message: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: C.dangerSoft,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    marginBottom: 20,
  },
  messageTitle: { fontSize: 11, fontWeight: "bold", color: C.danger, marginBottom: 4 },
  messageText: { fontSize: 10, color: C.ink, lineHeight: 1.5 },

  table: { borderTopWidth: 0.5, borderTopColor: C.border },
  thead: { flexDirection: "row", backgroundColor: C.brand },
  th: { color: "#FFFFFF", fontSize: 8, fontWeight: "bold", padding: 6, textAlign: "center" },
  thLeft: { textAlign: "left", paddingLeft: 8 },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.border },
  trAlt: { backgroundColor: "#FAFBFC" },
  td: { padding: 6, fontSize: 9, textAlign: "center" },
  tdLeft: { textAlign: "left", paddingLeft: 8 },
  tdRight: { textAlign: "right", paddingRight: 8 },
  tdBold: { fontWeight: "bold" },
  tdDanger: { color: C.danger, fontWeight: "bold" },

  colPeriode: { width: "30%" },
  colEcheance: { width: "20%" },
  colMontant: { width: "17%" },
  colPaye: { width: "17%" },
  colReste: { width: "16%" },

  totalBox: {
    marginTop: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.danger,
    backgroundColor: C.dangerSoft,
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 9,
    color: C.danger,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  totalValue: { fontSize: 26, fontWeight: "bold", color: C.danger, marginTop: 4 },

  infoBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: C.surface,
    marginBottom: 20,
  },
  infoTitle: { fontSize: 10, fontWeight: "bold", marginBottom: 6 },
  infoText: { fontSize: 9, color: C.inkMuted, lineHeight: 1.6 },

  signatures: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
  },
  signature: {
    width: 200,
    borderTopWidth: 0.5,
    borderTopColor: C.inkFaint,
    paddingTop: 6,
    textAlign: "center",
    fontSize: 9,
    color: C.inkMuted,
  },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: C.inkFaint,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 5,
  },
});

function fmtDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function fmtMontant(n: number): string {
  return n.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ");
}

export function RappelElevePDF({
  etablissement,
  eleve,
  rappels,
}: {
  etablissement: any;
  eleve: any;
  rappels: any[];
}) {
  const totalReste = rappels.reduce((s, r) => {
    const paye = r.tranche.paiements.filter((p: any) => !p.annule).reduce((ss: number, p: any) => ss + p.montant, 0);
    return s + (r.tranche.montant - paye);
  }, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
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
            <Text style={styles.titre}>RAPPEL DE PAIEMENT</Text>
            <Text style={styles.sousTitre}>Le {fmtDate(new Date())}</Text>
          </View>
        </View>

        {/* Destinataire */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Destinataire</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Parent / Tuteur</Text>
            <Text style={styles.value}>{eleve.tuteurNom || "Non renseigne"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Eleve</Text>
            <Text style={styles.value}>{eleve.nom} {eleve.prenom}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Matricule</Text>
            <Text style={styles.value}>{eleve.matricule}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Classe</Text>
            <Text style={styles.value}>
              {eleve.classe
                ? eleve.classe.nom || (eleve.classe.niveau + (eleve.classe.section ? " " + eleve.classe.section : ""))
                : "-"}
            </Text>
          </View>
          {eleve.tuteurTelephone && (
            <View style={styles.row}>
              <Text style={styles.label}>Telephone</Text>
              <Text style={styles.value}>{eleve.tuteurTelephone}</Text>
            </View>
          )}
        </View>

        {/* Message */}
        <View style={styles.message}>
          <Text style={styles.messageTitle}>Objet : Regularisation des frais de scolarite</Text>
          <Text style={styles.messageText}>
            Madame, Monsieur,{"\n\n"}
            Sauf erreur de notre part, nous constatons que les frais de scolarite de votre enfant
            {" "}{eleve.nom} {eleve.prenom} presentent un retard de paiement pour {rappels.length} echeance{rappels.length > 1 ? "s" : ""}.
            {"\n\n"}
            Nous vous prions de bien vouloir regulariser la situation dans les meilleurs delais.
          </Text>
        </View>

        {/* Tableau des echeances impayees */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details des echeances impayees</Text>
          <View style={styles.table}>
            <View style={styles.thead}>
              <Text style={[styles.th, styles.thLeft, styles.colPeriode]}>Periode</Text>
              <Text style={[styles.th, styles.colEcheance]}>Echeance</Text>
              <Text style={[styles.th, styles.colMontant]}>Montant</Text>
              <Text style={[styles.th, styles.colPaye]}>Paye</Text>
              <Text style={[styles.th, styles.colReste]}>Reste</Text>
            </View>

            {rappels.map((r, i) => {
              const paye = r.tranche.paiements.filter((p: any) => !p.annule).reduce((s: number, p: any) => s + p.montant, 0);
              const reste = r.tranche.montant - paye;
              return (
                <View key={r.id} style={i % 2 === 1 ? [styles.tr, styles.trAlt] : styles.tr}>
                  <Text style={[styles.td, styles.tdLeft, styles.colPeriode]}>{r.tranche.libelle}</Text>
                  <Text style={[styles.td, styles.colEcheance]}>
                    {new Date(r.tranche.dateEcheance).toLocaleDateString("fr-FR")}
                  </Text>
                  <Text style={[styles.td, styles.colMontant]}>{fmtMontant(r.tranche.montant)}</Text>
                  <Text style={[styles.td, styles.colPaye]}>{paye > 0 ? fmtMontant(paye) : "-"}</Text>
                  <Text style={[styles.td, styles.colReste, styles.tdBold, styles.tdDanger]}>
                    {fmtMontant(reste)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Total */}
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total reste a payer</Text>
          <Text style={styles.totalValue}>{fmtMontant(totalReste)} F CFA</Text>
        </View>

        {/* Info paiement */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Modalites de paiement</Text>
          <Text style={styles.infoText}>
            Le paiement peut etre effectue au secretariat de l'etablissement, par especes,
            virement bancaire, mobile money ou cheque a l'ordre de {etablissement.nom}.
            {"\n"}
            Un recu vous sera delivre pour chaque paiement.
          </Text>
        </View>

        {/* Signatures */}
        <View style={styles.signatures}>
          <Text style={styles.signature}>Le Directeur</Text>
          <Text style={styles.signature}>Le Parent / Tuteur</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>{etablissement.nom}</Text>
          <Text>Rappel de paiement - {eleve.matricule}</Text>
        </View>
      </Page>
    </Document>
  );
}