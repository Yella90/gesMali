import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

const C = {
  ink: "#0F172A",
  inkMuted: "#64748B",
  inkFaint: "#94A3B8",
  brand: "#1E3A5F",
  gold: "#B8893B",
  border: "#E2E8F0",
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
    marginBottom: 18,
  },
  etabNom: { fontSize: 16, fontWeight: "bold", color: C.brand },
  etabInfo: { fontSize: 9, color: C.inkMuted, marginTop: 3 },
  titre: { fontSize: 14, fontWeight: "bold", marginTop: 12, color: C.brand },
  numero: { fontSize: 10, color: C.inkMuted, marginTop: 3 },

  section: { marginBottom: 14 },
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
  label: { width: 160, fontSize: 9, color: C.inkMuted },
  value: { flex: 1, fontSize: 10, fontWeight: "bold" },

  accesBox: {
    marginTop: 6,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.brand,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
  },
  qr: { width: 110, height: 110 },
  accesTexte: { flex: 1, marginLeft: 16 },
  accesTitre: { fontSize: 11, fontWeight: "bold", color: C.brand },
  accesAide: { fontSize: 9, color: C.inkMuted, marginTop: 4, lineHeight: 1.4 },
  accesUrl: { fontSize: 8, color: C.accent, marginTop: 8 },
  accesAvertissement: { fontSize: 7, color: C.inkFaint, marginTop: 6 },

  signatures: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 34,
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
    marginTop: 24,
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
  return n.toLocaleString("fr-FR").replace(/ | /g, " ") + " F CFA";
}

export type FicheInscriptionData = {
  etablissement: { nom: string; adresse: string | null; telephone: string | null; logo?: string | null };
  eleve: {
    matricule: string;
    nom: string;
    prenom: string;
    dateNaissance: Date;
    sexe: string;
    tuteurNom: string | null;
    tuteurTelephone: string | null;
    emailParent: string | null;
    createdAt: Date;
  };
  classe: string | null;
  anneeScolaire: string | null;
  // null : pas de frais configures pour l'annee
  frais: {
    inscription: number; // 0 si exonere
    inscriptionClasse: number; // montant prevu par la classe
    inscriptionPayee: boolean;
    mensuel: number;
  } | null;
  urlParent: string;
  qrDataUrl: string;
};

function Ligne({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function FicheInscriptionPDF({ etablissement, eleve, classe, anneeScolaire, frais, urlParent, qrDataUrl }: FicheInscriptionData) {
  const exonere = frais !== null && frais.inscription === 0 && frais.inscriptionClasse > 0;
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
          <Text style={styles.titre}>FICHE D&apos;INSCRIPTION</Text>
          <Text style={styles.numero}>
            Matricule {eleve.matricule}{anneeScolaire ? " - Annee scolaire " + anneeScolaire : ""}
          </Text>
        </View>

        {/* Eleve */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Eleve</Text>
          <Ligne label="Nom complet" value={eleve.nom + " " + eleve.prenom} />
          <Ligne label="Date de naissance" value={fmtDate(eleve.dateNaissance)} />
          <Ligne label="Sexe" value={eleve.sexe === "M" ? "Masculin" : "Feminin"} />
          <Ligne label="Classe" value={classe ?? "-"} />
          <Ligne label="Date d'inscription" value={fmtDate(eleve.createdAt)} />
        </View>

        {/* Parent */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parent / Tuteur</Text>
          <Ligne label="Nom" value={eleve.tuteurNom ?? "-"} />
          <Ligne label="Telephone" value={eleve.tuteurTelephone ?? "-"} />
          <Ligne label="E-mail" value={eleve.emailParent ?? "-"} />
        </View>

        {/* Frais */}
        {frais && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Frais de scolarite</Text>
            <Ligne
              label="Frais d'inscription"
              value={
                exonere
                  ? "Exonere"
                  : frais.inscription > 0
                    ? fmtMontant(frais.inscription) + (frais.inscriptionPayee ? " (paye)" : " (a payer)")
                    : "-"
              }
            />
            <Ligne label="Scolarite mensuelle" value={fmtMontant(frais.mensuel)} />
          </View>
        )}

        {/* Acces parent */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Espace parent</Text>
          <View style={styles.accesBox}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image react-pdf, pas une balise HTML */}
            <Image src={qrDataUrl} style={styles.qr} />
            <View style={styles.accesTexte}>
              <Text style={styles.accesTitre}>Suivez la scolarite de votre enfant</Text>
              <Text style={styles.accesAide}>
                Scannez ce QR code avec l&apos;appareil photo de votre telephone pour consulter
                le profil, les notes et les bulletins de {eleve.prenom}.
              </Text>
              <Text style={styles.accesUrl}>{urlParent}</Text>
              <Text style={styles.accesAvertissement}>
                Ce lien est personnel : ne le partagez pas. En cas de perte, demandez un nouveau lien a l&apos;etablissement.
              </Text>
            </View>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signatures}>
          <Text style={styles.signature}>La direction</Text>
          <Text style={styles.signature}>Le parent ou tuteur</Text>
        </View>

        <Text style={styles.mention}>Fiche generee le {fmtDate(new Date())}</Text>
      </Page>
    </Document>
  );
}
