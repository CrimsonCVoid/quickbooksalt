import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

/**
 * Invoice PDF — black & white, print-optimized.
 *
 * Design rules:
 *  - Pure black on white (no grays, no fills) so it photocopies and prints crisply.
 *  - Hierarchy from type weight, size, and rules — never from color.
 *  - Helvetica + Helvetica-Bold (built into the PDF spec, no embedding required).
 *  - Generous whitespace; uppercase tracked labels.
 *  - Strong section rules (1pt/2pt). Double rule on grand-total for emphasis.
 *
 * Anything user-customizable (business name, address, accent color, etc.) flows
 * through the `business` prop. Color is intentionally ignored here — the PDF stays B&W.
 */

const INK = "#000000";
const WHITE = "#FFFFFF";

const s = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 50,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: INK,
    backgroundColor: WHITE,
    lineHeight: 1.4,
  },

  // Header block
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  brandBlock: { flex: 1, paddingRight: 24 },
  brandName: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  brandRule: {
    width: 40,
    height: 2,
    backgroundColor: INK,
    marginTop: 6,
    marginBottom: 8,
  },
  brandMeta: { fontSize: 9, color: INK },
  brandMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },

  invMeta: { width: 200, alignItems: "flex-end" },
  invLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  invNumber: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginTop: 2,
    marginBottom: 10,
  },
  invMetaTable: { width: "100%" },
  invMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    fontSize: 9,
  },
  invMetaKey: { letterSpacing: 1, textTransform: "uppercase", fontFamily: "Helvetica-Bold" },
  invMetaVal: {},

  // Status stamp (PAID / VOID) — bordered, no fill
  stamp: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: INK,
    alignSelf: "flex-end",
  },
  stampText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    letterSpacing: 3,
    textTransform: "uppercase",
  },

  // Major divider between letterhead and body
  thickRule: { height: 2, backgroundColor: INK, marginVertical: 16 },

  // Bill-to + parties
  partiesRow: { flexDirection: "row", marginBottom: 18 },
  partyCol: { flex: 1, paddingRight: 16 },
  sectionLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  partyName: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  partyLine: { fontSize: 10 },

  // Items table
  table: { marginTop: 4 },
  tHead: {
    flexDirection: "row",
    paddingVertical: 6,
    borderTopWidth: 1.5,
    borderBottomWidth: 1,
    borderColor: INK,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  tRow: {
    flexDirection: "row",
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderColor: INK,
  },
  tDesc: { flex: 5, paddingRight: 6 },
  tQty: { flex: 1, textAlign: "right" },
  tPrice: { flex: 1.4, textAlign: "right" },
  tTotal: { flex: 1.4, textAlign: "right" },

  // Totals
  totalsWrap: { flexDirection: "row", justifyContent: "flex-end", marginTop: 18 },
  totalsBlock: { width: 260 },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    fontSize: 10,
  },
  totalsRowMuted: { paddingVertical: 2, fontSize: 9 },
  // Grand total: double rule top + bottom
  grandRuleTop: { height: 1, backgroundColor: INK, marginTop: 6 },
  grandRuleTopThick: { height: 0.5, backgroundColor: INK, marginTop: 1 },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  grandRuleBottom: { height: 0.5, backgroundColor: INK },
  grandRuleBottomThick: { height: 1, backgroundColor: INK, marginTop: 1 },

  // Notes
  notesBlock: { marginTop: 22 },

  // Payment instructions — bordered frame, no fill
  payFrame: {
    marginTop: 22,
    borderWidth: 1,
    borderColor: INK,
    padding: 14,
  },
  payTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  payBody: { fontSize: 10 },

  // Signature
  sigRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 36,
  },
  sigCol: { width: "45%" },
  sigEmbedded: { height: 40, marginBottom: 4 },
  sigLine: { borderTopWidth: 1, borderColor: INK, paddingTop: 4 },
  sigLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  sigMeta: { fontSize: 8, color: INK },

  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    fontSize: 8,
    color: INK,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderColor: INK,
    paddingTop: 6,
  },
  footerLabel: { letterSpacing: 1, textTransform: "uppercase" },
});

export type PdfInvoice = {
  invoice_number: string;
  status: string;
  issue_date: string;
  due_date: string;
  bill_to_company: string;
  bill_to_contact: string | null;
  bill_to_email: string | null;
  bill_to_address: string | null;
  subtotal: number;
  tax: number;
  total: number;
  amount_paid: number;
  payment_terms: string | null;
  notes: string | null;
  check_instructions: string | null;
  lines: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  signature_png_data?: string | null;
  signature_signer?: string | null;
  signed_at?: string | null;
  business: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    logoUrl: string | null;
  };
  payUrl?: string | null;
};

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function humanDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  // Accept "YYYY-MM-DD" or full ISO; format as "April 27, 2026".
  const safe = iso.length === 10 ? `${iso}T00:00:00` : iso;
  const d = new Date(safe);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function InvoicePDF({ invoice }: { invoice: PdfInvoice }) {
  const balance = invoice.total - invoice.amount_paid;
  const stamp =
    invoice.status === "paid" ? "Paid" :
    invoice.status === "void" ? "Void" :
    invoice.status === "overdue" ? "Past Due" :
    null;

  return (
    <Document
      title={`Invoice ${invoice.invoice_number}`}
      author={invoice.business.name}
      subject={`Invoice ${invoice.invoice_number}`}
    >
      <Page size="LETTER" style={s.page}>
        {/* ── Letterhead ─────────────────────────────────────────── */}
        <View style={s.headerRow}>
          <View style={s.brandBlock}>
            {invoice.business.logoUrl && (
              <Image src={invoice.business.logoUrl} style={{ width: 90, height: 90, marginBottom: 8 }} />
            )}
            <Text style={s.brandName}>{invoice.business.name}</Text>
            <View style={s.brandRule} />
            {invoice.business.address && (
              <Text style={s.brandMeta}>{invoice.business.address}</Text>
            )}
            {(invoice.business.phone || invoice.business.email) && (
              <View style={s.brandMetaRow}>
                {invoice.business.phone && <Text style={s.brandMeta}>{invoice.business.phone}</Text>}
                {invoice.business.phone && invoice.business.email && <Text style={s.brandMeta}>·</Text>}
                {invoice.business.email && <Text style={s.brandMeta}>{invoice.business.email}</Text>}
              </View>
            )}
          </View>

          <View style={s.invMeta}>
            <Text style={s.invLabel}>Invoice</Text>
            <Text style={s.invNumber}>#{invoice.invoice_number}</Text>

            <View style={s.invMetaTable}>
              <View style={s.invMetaRow}>
                <Text style={s.invMetaKey}>Issued</Text>
                <Text style={s.invMetaVal}>{humanDate(invoice.issue_date)}</Text>
              </View>
              <View style={s.invMetaRow}>
                <Text style={s.invMetaKey}>Due</Text>
                <Text style={s.invMetaVal}>{humanDate(invoice.due_date)}</Text>
              </View>
              {invoice.payment_terms && (
                <View style={s.invMetaRow}>
                  <Text style={s.invMetaKey}>Terms</Text>
                  <Text style={s.invMetaVal}>{invoice.payment_terms}</Text>
                </View>
              )}
            </View>

            {stamp && (
              <View style={s.stamp}>
                <Text style={s.stampText}>{stamp}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.thickRule} />

        {/* ── Bill to ────────────────────────────────────────────── */}
        <View style={s.partiesRow}>
          <View style={s.partyCol}>
            <Text style={s.sectionLabel}>Bill To</Text>
            <Text style={s.partyName}>{invoice.bill_to_company}</Text>
            {invoice.bill_to_contact && <Text style={s.partyLine}>{invoice.bill_to_contact}</Text>}
            {invoice.bill_to_address && (
              <Text style={[s.partyLine, { marginTop: 2 }]}>{invoice.bill_to_address}</Text>
            )}
            {invoice.bill_to_email && (
              <Text style={[s.partyLine, { marginTop: 2 }]}>{invoice.bill_to_email}</Text>
            )}
          </View>
        </View>

        {/* ── Line items ────────────────────────────────────────── */}
        <View style={s.table}>
          <View style={s.tHead}>
            <Text style={s.tDesc}>Description</Text>
            <Text style={s.tQty}>Qty</Text>
            <Text style={s.tPrice}>Unit Price</Text>
            <Text style={s.tTotal}>Amount</Text>
          </View>
          {invoice.lines.map((l, i) => (
            <View key={i} style={s.tRow} wrap={false}>
              <Text style={s.tDesc}>{l.description}</Text>
              <Text style={s.tQty}>{Number(l.quantity).toLocaleString()}</Text>
              <Text style={s.tPrice}>{fmt(Number(l.unit_price))}</Text>
              <Text style={s.tTotal}>{fmt(Number(l.line_total))}</Text>
            </View>
          ))}
        </View>

        {/* ── Totals ────────────────────────────────────────────── */}
        <View style={s.totalsWrap}>
          <View style={s.totalsBlock}>
            <View style={s.totalsRow}>
              <Text>Subtotal</Text>
              <Text>{fmt(invoice.subtotal)}</Text>
            </View>
            {invoice.tax > 0 && (
              <View style={s.totalsRow}>
                <Text>Tax</Text>
                <Text>{fmt(invoice.tax)}</Text>
              </View>
            )}
            {invoice.amount_paid > 0 && (
              <View style={s.totalsRowMuted}>
                <Text>Less: payments received</Text>
                <Text>−{fmt(invoice.amount_paid)}</Text>
              </View>
            )}

            <View style={s.grandRuleTop} />
            <View style={s.grandRuleTopThick} />
            <View style={s.grandRow}>
              <Text>Balance Due</Text>
              <Text>{fmt(balance)}</Text>
            </View>
            <View style={s.grandRuleBottom} />
            <View style={s.grandRuleBottomThick} />
          </View>
        </View>

        {/* ── Notes ─────────────────────────────────────────────── */}
        {invoice.notes && (
          <View style={s.notesBlock} wrap={false}>
            <Text style={s.sectionLabel}>Notes</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}

        {/* ── Payment instructions ──────────────────────────────── */}
        <View style={s.payFrame} wrap={false}>
          <Text style={s.payTitle}>Payment Instructions</Text>
          <Text style={s.payBody}>
            {invoice.check_instructions ||
              `Make checks payable to: ${invoice.business.name}.\nReference invoice number on the memo line.`}
          </Text>
          {invoice.payUrl && (
            <Text style={[s.payBody, { marginTop: 6 }]}>
              To pay online, visit: {invoice.payUrl}
            </Text>
          )}
        </View>

        {/* ── Signatures ────────────────────────────────────────── */}
        <View style={s.sigRow} wrap={false}>
          <View style={s.sigCol}>
            {invoice.signature_png_data && (
              <Image src={invoice.signature_png_data} style={s.sigEmbedded} />
            )}
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>Customer Signature</Text>
            {invoice.signature_signer && (
              <Text style={s.sigMeta}>{invoice.signature_signer}</Text>
            )}
            {invoice.signed_at && (
              <Text style={s.sigMeta}>Signed {humanDate(invoice.signed_at)}</Text>
            )}
          </View>
          <View style={s.sigCol}>
            <View style={[s.sigLine, { marginTop: 36 }]} />
            <Text style={s.sigLabel}>Date</Text>
          </View>
        </View>

        {/* ── Footer (every page) ───────────────────────────────── */}
        <View style={s.footer} fixed>
          <Text style={s.footerLabel}>{invoice.business.name}</Text>
          <Text>Invoice #{invoice.invoice_number}</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
