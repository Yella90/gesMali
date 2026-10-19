import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

const C = {
  ink: "#0F172A",
  inkMuted: "#64748B",
  inkFaint: "#94A3B8",
  brand: "#1E3A5F",
  gold: "#B8893B",
  border: "#E2E8F0",
  surface: "#F1F5F9",
  accent: "#0F766E",
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: C.ink },
  logoImage: { width: 48, height: 48, objectFit: "contain", alignSelf: "center", marginBottom: 6 },
  header: {
    textAlign: "center",
    borderBottomWidth: 2,
    borderBottomColor: C.gold,
    paddingBottom: 12,
    marginBottom: 20,
  },
  etabNom: { fontSize: 16, fontWeight: "bold", color: C.brand },
  etabInfo: { fontSize: 9, color: C.inkMuted, marginTop: 3 },
  titre: { fontSize: 14, fontWeight: "bold", marginTop: 12, color: C.brand },
  numero: { fontSize: 10, color: C.inkMuted, marginTop: 3 },

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
  row: { flexDirection: "row", marginBottom: 6 },
  label: { width: 160, fontSize: 9, color: C.inkMuted },
  value: { flex: 1, fontSize: 10, fontWeight: "bold" },

  montantBox: {
    marginTop: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.brand,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
  },
  montantLabel: {
    fontSize: 8,
    color: C.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  montantValeur: {
    fontSize: 24,
    fontWeight: "bold",
    color: C.brand,
    marginTop: 6,
  },

  signatures: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 40,
  },
  signature: {
    width: 180,
    borderTopWidth: 0.5,
    borderTopColor: C.inkFaint,
    paddingTop: 6,
    textAlign: "center",
    fontSize: 9,
    color: C.inkMuted,
  },

  mention: {
    marginTop: 30,
    fontSize: 7,
    color: C.inkFaint,
    textAlign: "center",
  },
});

function fmtDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function fmtMontant(n: number): string {
  return n.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ") + " F CFA";
}

function modeLabel(m: string): string {
  if (m === "ESPECES") return "Especes";
  if (m === "VIREMENT") return "Virement";
  if (m === "MOBILE_MONEY") return "Mobile Money";
  if (m === "CHEQUE") return "Cheque";
  return m;
}

export function RecuPDF({
  etablissement,
  eleve,
  tranche,
  paiement,
}: {
  etablissement: any;
  eleve: any;
  tranche: any;
  paiement: any;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* En-tete */}
        <View style={styles.header}>
          {etablissement.logo && (
            // eslint-disable-next-line jsx-a11y/alt-text -- Image react-pdf, pas une balise HTML
            <Image src={etablissement.logo} style={styles.logoImage} />
          )}
          <Text style={styles.etabNom}>{etablissement.nom}</Text>
          <Text style={styles.etabInfo}>
            {etablissement.adresse || ""}
            {etablissement.telephone ? " - Tel. " + etablissement.telephone : ""}
          </Text>
          <Text style={styles.titre}>RECU DE PAIEMENT</Text>
          <Text style={styles.numero}>N {paiement.recuNumero}</Text>
        </View>

        {/* Eleve */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Eleve</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nom complet</Text>
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
                ? (eleve.classe.nom || (eleve.classe.niveau + (eleve.classe.section ? " " + eleve.classe.section : "")))
                : "-"}
            </Text>
          </View>
        </View>

        {/* Paiement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details du paiement</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Periode concernee</Text>
            <Text style={styles.value}>{tranche.libelle}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date de paiement</Text>
            <Text style={styles.value}>{fmtDate(paiement.datePaiement)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Mode de paiement</Text>
            <Text style={styles.value}>{modeLabel(paiement.mode)}</Text>
          </View>
          {paiement.reference && (
            <View style={styles.row}>
              <Text style={styles.label}>Reference</Text>
              <Text style={styles.value}>{paiement.reference}</Text>
            </View>
          )}
        </View>

        {/* Montant */}
        <View style={styles.montantBox}>
          <Text style={styles.montantLabel}>Montant paye</Text>
          <Text style={styles.montantValeur}>{fmtMontant(paiement.montant)}</Text>
        </View>

        {/* Signatures */}
        <View style={styles.signatures}>
          <Text style={styles.signature}>Le caissier</Text>
          <Text style={styles.signature}>Le parent ou tuteur</Text>
        </View>

        {/* Mention */}
        <Text style={styles.mention}>
          Recu genere le {fmtDate(new Date())} - Conservez ce document comme preuve de paiement.
        </Text>
      </Page>
    </Document>
  );
}