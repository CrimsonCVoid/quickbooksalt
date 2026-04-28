import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { brand } from "@/lib/branding";

/**
 * Invoice PDF — branded, polished, print-friendly.
 *
 * Layout rhythm:
 *   - Page padding 48 (50 horizontal for letter)
 *   - Sections separated by 22pt margins
 *   - All content cards use 8pt borderRadius with 1pt #E8E6DE borders
 *   - Yellow accent (#FFD60A) reserved for: brand highlight, balance due,
 *     Pay-by-Check header, status pill. Soft yellow (#FFF6D0) for the
 *     items-table header row.
 *
 * Helvetica is used everywhere (built into the PDF spec — no embedding).
 */

const C = {
  ink: "#1E1E1E",
  yellow: "#FFD60A",
  yellowSoft: "#FFF6D0",
  paper: "#FAFAF7",
  line: "#E8E6DE",
  lineDark: "#D6D4CC",
  muted: "#6B6B66",
};

const RADIUS = 8;

const s = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 60,
    paddingHorizontal: 50,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: C.ink,
    backgroundColor: "#FFFFFF",
    lineHeight: 1.4,
  },

  // ── Letterhead ──────────────────────────────────────────
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  brandBlock: { flex: 1, paddingRight: 24 },
  brandName: { fontSize: 26, fontFamily: "Helvetica-Bold", letterSpacing: -0.4 },
  brandHighlight: { backgroundColor: C.yellow, paddingHorizontal: 4, paddingVertical: 0 },
  tagline: { color: C.muted, marginTop: 4, fontSize: 10 },
  brandMeta: { color: C.muted, fontSize: 9.5, marginTop: 1 },

  // Right-side invoice card
  invCard: {
    width: 200,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: RADIUS,
    padding: 12,
    backgroundColor: C.paper,
  },
  invLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.muted,
  },
  invNumber: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 2, marginBottom: 8 },
  invMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    fontSize: 9.5,
  },
  invMetaKey: { color: C.muted, textTransform: "uppercase", letterSpacing: 1, fontSize: 8 },
  invMetaVal: { fontFamily: "Helvetica-Bold" },
  statusPill: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusPillText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // ── Bill-to row ─────────────────────────────────────────
  partiesRow: { marginTop: 14, marginBottom: 22 },
  sectionLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  partyName: { fontFamily: "Helvetica-Bold", fontSize: 12 },
  partyMeta: { color: C.muted, fontSize: 9.5 },

  // ── Items table ─────────────────────────────────────────
  table: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: RADIUS,
    overflow: "hidden",
  },
  tHead: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: C.yellowSoft,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  tRow: {
    flexDirection: "row",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: C.line,
  },
  tRowAlt: { backgroundColor: C.paper },
  tRowLast: { borderBottomWidth: 0 },
  tDesc: { flex: 5, paddingRight: 8 },
  tQty: { flex: 1, textAlign: "right" },
  tPrice: { flex: 1.4, textAlign: "right" },
  tTotal: { flex: 1.4, textAlign: "right" },

  // ── Totals card ─────────────────────────────────────────
  totalsWrap: { flexDirection: "row", justifyContent: "flex-end", marginTop: 18 },
  totalsCard: {
    width: 270,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: RADIUS,
    overflow: "hidden",
  },
  totalsBody: { padding: 12 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, fontSize: 10 },
  totalsRowMuted: { color: C.muted, fontSize: 9.5 },
  totalsDivider: { height: 0.5, backgroundColor: C.line, marginVertical: 4 },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.yellow,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  grandLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  grandValue: { fontFamily: "Helvetica-Bold", fontSize: 16 },

  // ── Pay-by-Check card ───────────────────────────────────
  checkCard: {
    marginTop: 22,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: RADIUS,
    overflow: "hidden",
  },
  checkHeader: {
    backgroundColor: C.yellow,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  checkHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.8,
  },
  checkBody: { padding: 14 },
  checkRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 4 },
  checkLabel: {
    width: 95,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingTop: 2,
  },
  checkValue: { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 11 },
  checkValueLine: { fontFamily: "Helvetica-Bold", fontSize: 11, lineHeight: 1.35 },
  checkAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    marginTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: C.line,
  },
  checkAmountLabel: {
    width: 95,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  checkAmountValue: { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 18 },
  checkNotes: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: C.line,
    fontSize: 9.5,
    color: C.muted,
    fontStyle: "italic",
    lineHeight: 1.4,
  },

  // ── Notes / pay-online ──────────────────────────────────
  notesBlock: { marginTop: 22 },
  payOnlineBlock: {
    marginTop: 14,
    padding: 12,
    backgroundColor: C.paper,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: C.line,
  },
  payOnlineTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 4,
  },

  // ── Signatures ──────────────────────────────────────────
  sigRow: {
    marginTop: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 24,
  },
  sigCol: { flex: 1 },
  sigImage: { height: 44, marginBottom: 6 },
  sigLine: {
    borderTopWidth: 1,
    borderTopColor: C.ink,
    paddingTop: 5,
  },
  sigLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  sigMeta: { fontSize: 8, color: C.muted, marginTop: 1 },

  // ── Footer ──────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 28,
    left: 50,
    right: 50,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: C.line,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: C.muted,
  },
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
  check?: {
    payTo: string;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    postal: string | null;
    memo: string;
    notes: string | null;
  };
  payUrl?: string | null;
};

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function humanDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const safe = iso.length === 10 ? `${iso}T00:00:00` : iso;
  const d = new Date(safe);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function statusPillStyle(status: string) {
  if (status === "paid") return { backgroundColor: "#16A34A", color: "#FFFFFF" };
  if (status === "overdue") return { backgroundColor: "#DC2626", color: "#FFFFFF" };
  if (status === "void") return { backgroundColor: C.line, color: C.muted };
  if (status === "pending_approval") return { backgroundColor: C.yellowSoft, color: C.ink };
  return { backgroundColor: C.yellow, color: C.ink };
}

function statusLabel(status: string) {
  if (status === "pending_approval") return "Pending";
  if (status === "overdue") return "Past Due";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function InvoicePDF({ invoice }: { invoice: PdfInvoice }) {
  const balance = invoice.total - invoice.amount_paid;
  const showStatus = invoice.status !== "draft" && invoice.status !== "sent";
  const pillStyle = statusPillStyle(invoice.status);

  // Brand-name split: first word + yellow-highlighted remainder.
  const [firstWord, ...restWords] = invoice.business.name.split(" ");
  const restName = restWords.join(" ");

  return (
    <Document
      title={`Invoice ${invoice.invoice_number}`}
      author={invoice.business.name}
      subject={`Invoice ${invoice.invoice_number}`}
    >
      <Page size="LETTER" style={s.page}>
        {/* ── Letterhead ───────────────────────────────────── */}
        <View style={s.headerRow}>
          <View style={s.brandBlock}>
            {invoice.business.logoUrl ? (
              <Image src={invoice.business.logoUrl} style={{ width: 110, height: 110, marginBottom: 8 }} />
            ) : (
              <Text style={s.brandName}>
                {firstWord}
                {restName ? <> <Text style={s.brandHighlight}>{restName}</Text></> : null}
              </Text>
            )}
            <Text style={s.tagline}>{brand.tagline}</Text>
            {invoice.business.address && (
              <View style={{ marginTop: 8 }}>
                {invoice.business.address.split("\n").filter(Boolean).map((line, i) => (
                  <Text key={i} style={s.brandMeta}>{line}</Text>
                ))}
              </View>
            )}
            {(invoice.business.phone || invoice.business.email) && (
              <Text style={s.brandMeta}>
                {[invoice.business.phone, invoice.business.email].filter(Boolean).join(" · ")}
              </Text>
            )}
          </View>

          <View style={s.invCard}>
            <Text style={s.invLabel}>Invoice</Text>
            <Text style={s.invNumber}>#{invoice.invoice_number}</Text>
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
            {showStatus && (
              <View style={[s.statusPill, { backgroundColor: pillStyle.backgroundColor }]}>
                <Text style={[s.statusPillText, { color: pillStyle.color }]}>{statusLabel(invoice.status)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Bill to ──────────────────────────────────────── */}
        <View style={s.partiesRow}>
          <Text style={s.sectionLabel}>Bill to</Text>
          <Text style={s.partyName}>{invoice.bill_to_company}</Text>
          {invoice.bill_to_contact && <Text>{invoice.bill_to_contact}</Text>}
          {invoice.bill_to_email && <Text style={s.partyMeta}>{invoice.bill_to_email}</Text>}
          {invoice.bill_to_address && (
            <View style={{ marginTop: 2 }}>
              {invoice.bill_to_address.split("\n").filter(Boolean).map((line, i) => (
                <Text key={i} style={s.partyMeta}>{line}</Text>
              ))}
            </View>
          )}
        </View>

        {/* ── Line items ───────────────────────────────────── */}
        <View style={s.table}>
          <View style={s.tHead}>
            <Text style={s.tDesc}>Description</Text>
            <Text style={s.tQty}>Qty</Text>
            <Text style={s.tPrice}>Unit Price</Text>
            <Text style={s.tTotal}>Amount</Text>
          </View>
          {invoice.lines.map((l, i) => {
            const isLast = i === invoice.lines.length - 1;
            const isAlt = i % 2 === 1;
            return (
              <View
                key={i}
                style={[s.tRow, isAlt ? s.tRowAlt : null, isLast ? s.tRowLast : null].filter(Boolean) as any}
                wrap={false}
              >
                <Text style={s.tDesc}>{l.description}</Text>
                <Text style={s.tQty}>{Number(l.quantity).toLocaleString()}</Text>
                <Text style={s.tPrice}>{fmt(Number(l.unit_price))}</Text>
                <Text style={s.tTotal}>{fmt(Number(l.line_total))}</Text>
              </View>
            );
          })}
        </View>

        {/* ── Totals ───────────────────────────────────────── */}
        <View style={s.totalsWrap}>
          <View style={s.totalsCard}>
            <View style={s.totalsBody}>
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
                <>
                  <View style={s.totalsDivider} />
                  <View style={[s.totalsRow, s.totalsRowMuted]}>
                    <Text>Less: payments received</Text>
                    <Text>−{fmt(invoice.amount_paid)}</Text>
                  </View>
                </>
              )}
            </View>
            <View style={s.grandRow}>
              <Text style={s.grandLabel}>Balance Due</Text>
              <Text style={s.grandValue}>{fmt(balance)}</Text>
            </View>
          </View>
        </View>

        {/* ── Pay by Check (under Balance Due) ─────────────── */}
        {invoice.check && balance > 0 && (() => {
          const c = invoice.check;
          const cityStateZip = [
            c.city,
            [c.state, c.postal].filter(Boolean).join(" "),
          ].filter(Boolean).join(", ");
          const hasAddress = !!(c.addressLine1 || cityStateZip);
          return (
            <View style={s.checkCard} wrap={false}>
              <View style={s.checkHeader}>
                <Text style={s.checkHeaderText}>Pay by Check</Text>
              </View>
              <View style={s.checkBody}>
                <View style={s.checkRow}>
                  <Text style={s.checkLabel}>Pay to</Text>
                  <Text style={s.checkValue}>{c.payTo}</Text>
                </View>
                {hasAddress && (
                  <View style={s.checkRow}>
                    <Text style={s.checkLabel}>Mail to</Text>
                    <View style={{ flex: 1, flexDirection: "column" }}>
                      {c.addressLine1 && <Text style={s.checkValueLine}>{c.addressLine1}</Text>}
                      {c.addressLine2 && <Text style={s.checkValueLine}>{c.addressLine2}</Text>}
                      {cityStateZip && <Text style={s.checkValueLine}>{cityStateZip}</Text>}
                    </View>
                  </View>
                )}
                <View style={s.checkRow}>
                  <Text style={s.checkLabel}>Memo line</Text>
                  <Text style={s.checkValue}>{c.memo}</Text>
                </View>
                <View style={s.checkAmountRow}>
                  <Text style={s.checkAmountLabel}>Amount</Text>
                  <Text style={s.checkAmountValue}>{fmt(balance)}</Text>
                </View>
                {c.notes && <Text style={s.checkNotes}>{c.notes}</Text>}
              </View>
            </View>
          );
        })()}

        {/* ── Notes ────────────────────────────────────────── */}
        {invoice.notes && (
          <View style={s.notesBlock} wrap={false}>
            <Text style={s.sectionLabel}>Notes</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}

        {/* ── Pay online (only when Stripe enabled) ────────── */}
        {invoice.payUrl && (
          <View style={s.payOnlineBlock} wrap={false}>
            <Text style={s.payOnlineTitle}>Pay online</Text>
            <Text>{invoice.payUrl}</Text>
          </View>
        )}

        {/* ── Signatures ───────────────────────────────────── */}
        <View style={s.sigRow} wrap={false}>
          <View style={s.sigCol}>
            {invoice.signature_png_data && (
              <Image src={invoice.signature_png_data} style={s.sigImage} />
            )}
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>Customer Signature</Text>
            {invoice.signature_signer && <Text style={s.sigMeta}>{invoice.signature_signer}</Text>}
            {invoice.signed_at && <Text style={s.sigMeta}>Signed {humanDate(invoice.signed_at)}</Text>}
          </View>
          <View style={s.sigCol}>
            <View style={[s.sigLine, { marginTop: invoice.signature_png_data ? 50 : 0 }]} />
            <Text style={s.sigLabel}>Date</Text>
          </View>
        </View>

        {/* ── Footer ───────────────────────────────────────── */}
        <View style={s.footer} fixed>
          <Text>{invoice.business.name}</Text>
          <Text>Invoice #{invoice.invoice_number}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
