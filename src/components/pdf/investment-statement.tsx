import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatINRAscii } from "@/lib/format";

const NAVY = "#1f2d4d";
const GOLD = "#c9a24b";
const INK = "#1a1a1a";
const MUTED = "#6b7280";
const BORDER = "#e3e4e8";
const SURFACE = "#f6f7f9";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: INK, fontFamily: "Helvetica" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: NAVY,
    color: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  brandMarkText: { color: "#ffffff", fontSize: 14, fontFamily: "Helvetica-Bold" },
  brandRow: { flexDirection: "row", alignItems: "center" },
  companyName: { fontSize: 14, fontFamily: "Helvetica-Bold", color: NAVY },
  companyTag: { fontSize: 8, color: MUTED },
  docTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: INK, textAlign: "right" },
  docMeta: { fontSize: 8, color: MUTED, textAlign: "right", marginTop: 2 },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  twoCol: { flexDirection: "row", gap: 16, marginBottom: 16 },
  card: { flex: 1, backgroundColor: SURFACE, borderRadius: 6, padding: 10, borderWidth: 1, borderColor: BORDER },
  rowLabel: { fontSize: 8, color: MUTED },
  rowValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 6 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summaryItem: { width: "30%", marginBottom: 8 },
  coverNote: {
    fontSize: 9.5,
    lineHeight: 1.5,
    color: INK,
    backgroundColor: SURFACE,
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },
  table: { borderWidth: 1, borderColor: BORDER, borderRadius: 4, overflow: "hidden" },
  tableHeaderRow: { flexDirection: "row", backgroundColor: NAVY },
  tableRow: { flexDirection: "row", borderTopWidth: 1, borderColor: BORDER },
  tableRowAlt: { backgroundColor: "#fafafa" },
  th: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#ffffff", padding: 6 },
  td: { fontSize: 8.5, color: INK, padding: 6 },
  colNo: { width: "6%" },
  colDate: { width: "16%" },
  colAmt: { width: "17%", textAlign: "right" },
  colStatus: { width: "16%", textAlign: "center" },
  totalsRow: { flexDirection: "row", backgroundColor: SURFACE, borderTopWidth: 1, borderColor: BORDER },
  footer: { marginTop: 18, fontSize: 7.5, color: MUTED, lineHeight: 1.4 },
  pageNumber: { position: "absolute", bottom: 20, right: 36, fontSize: 8, color: MUTED },
  badgePaid: { color: "#0ca30c", fontFamily: "Helvetica-Bold" },
  badgePending: { color: MUTED },
});

export interface StatementScheduleRow {
  installmentNo: number;
  dueDate: Date | string;
  interestAmount: number;
  principalAmount: number;
  totalPayout: number;
  closingBalance: number;
  status: "PENDING" | "PAID";
}

export interface InvestmentStatementProps {
  client: { name: string; phone: string; email?: string | null; address?: string | null };
  investment: {
    principalAmount: number;
    tenureYears: number;
    ratePercentApplied: number;
    rateBasisApplied: "MONTHLY" | "ANNUAL";
    payoutTypeApplied: "INTEREST_ONLY" | "AMORTIZING";
    startDate: Date | string;
    maturityDate: Date | string;
    status: string;
  };
  schedule: StatementScheduleRow[];
  totals: { totalInterest: number; totalPrincipal: number; totalPayout: number };
  coverNote?: string;
  generatedAt: Date;
  payoutTrackingEnabled: boolean;
}

const inr = formatINRAscii;

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function InvestmentStatement({
  client,
  investment,
  schedule,
  totals,
  coverNote,
  generatedAt,
  payoutTrackingEnabled,
}: InvestmentStatementProps) {
  return (
    <Document title={`Sirah Digital — Investment Statement — ${client.name}`}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>SD</Text>
            </View>
            <View>
              <Text style={styles.companyName}>Sirah Digital</Text>
              <Text style={styles.companyTag}>Commodity Trading Desk</Text>
            </View>
          </View>
          <View>
            <Text style={styles.docTitle}>Investment & Repayment Statement</Text>
            <Text style={styles.docMeta}>Generated {fmtDate(generatedAt)}</Text>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Client</Text>
            <Text style={styles.rowValue}>{client.name}</Text>
            <Text style={styles.rowLabel}>Phone</Text>
            <Text style={styles.rowValue}>{client.phone}</Text>
            {client.email ? (
              <>
                <Text style={styles.rowLabel}>Email</Text>
                <Text style={styles.rowValue}>{client.email}</Text>
              </>
            ) : null}
            {client.address ? (
              <>
                <Text style={styles.rowLabel}>Address</Text>
                <Text style={{ fontSize: 9, color: INK }}>{client.address}</Text>
              </>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Investment Summary</Text>
            <View style={styles.summaryGrid}>
              <SummaryItem label="Principal" value={inr(investment.principalAmount)} />
              <SummaryItem label="Tenure" value={`${investment.tenureYears} years`} />
              <SummaryItem
                label="Rate"
                value={`${investment.ratePercentApplied}% ${investment.rateBasisApplied === "MONTHLY" ? "/mo" : "/yr"}`}
              />
              <SummaryItem
                label="Structure"
                value={investment.payoutTypeApplied === "INTEREST_ONLY" ? "Interest-only" : "Amortizing"}
              />
              <SummaryItem label="Start date" value={fmtDate(investment.startDate)} />
              <SummaryItem label="Maturity date" value={fmtDate(investment.maturityDate)} />
            </View>
          </View>
        </View>

        {coverNote ? <Text style={styles.coverNote}>{coverNote}</Text> : null}

        <Text style={styles.sectionTitle}>Repayment Schedule</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, styles.colNo]}>#</Text>
            <Text style={[styles.th, styles.colDate]}>Due Date</Text>
            <Text style={[styles.th, styles.colAmt]}>Interest</Text>
            <Text style={[styles.th, styles.colAmt]}>Principal</Text>
            <Text style={[styles.th, styles.colAmt]}>Payout</Text>
            {payoutTrackingEnabled ? <Text style={[styles.th, styles.colStatus]}>Status</Text> : null}
          </View>
          {schedule.map((row, i) => (
            <View key={row.installmentNo} style={[styles.tableRow, ...(i % 2 === 1 ? [styles.tableRowAlt] : [])]} wrap={false}>
              <Text style={[styles.td, styles.colNo]}>{row.installmentNo}</Text>
              <Text style={[styles.td, styles.colDate]}>{fmtDate(row.dueDate)}</Text>
              <Text style={[styles.td, styles.colAmt]}>{inr(row.interestAmount)}</Text>
              <Text style={[styles.td, styles.colAmt]}>{inr(row.principalAmount)}</Text>
              <Text style={[styles.td, styles.colAmt]}>{inr(row.totalPayout)}</Text>
              {payoutTrackingEnabled ? (
                <Text style={[styles.td, styles.colStatus, row.status === "PAID" ? styles.badgePaid : styles.badgePending]}>
                  {row.status === "PAID" ? "Paid" : "Pending"}
                </Text>
              ) : null}
            </View>
          ))}
          <View style={styles.totalsRow}>
            <Text style={[styles.td, styles.colNo]} />
            <Text style={[styles.td, styles.colDate, { fontFamily: "Helvetica-Bold" }]}>Total</Text>
            <Text style={[styles.td, styles.colAmt, { fontFamily: "Helvetica-Bold" }]}>{inr(totals.totalInterest)}</Text>
            <Text style={[styles.td, styles.colAmt, { fontFamily: "Helvetica-Bold" }]}>{inr(totals.totalPrincipal)}</Text>
            <Text style={[styles.td, styles.colAmt, { fontFamily: "Helvetica-Bold" }]}>{inr(totals.totalPayout)}</Text>
            {payoutTrackingEnabled ? <Text style={[styles.td, styles.colStatus]} /> : null}
          </View>
        </View>

        <Text style={styles.footer}>
          This statement is generated for informational purposes by Sirah Digital&apos;s commodity trading desk and
          reflects the repayment schedule as agreed at the time the investment was created. Figures are in Indian
          Rupees (INR). For queries regarding this statement, please contact your relationship manager at Sirah
          Digital.
        </Text>

        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </Page>
    </Document>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: "48%" }}>
      <Text style={{ fontSize: 8, color: MUTED }}>{label}</Text>
      <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", color: INK }}>{value}</Text>
    </View>
  );
}
