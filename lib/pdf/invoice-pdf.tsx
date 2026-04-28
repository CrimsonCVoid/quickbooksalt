import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";
import { brand } from "@/lib/branding";

// Use Helvetica as the safe built-in for production. Custom fonts can be wired later via Font.register.

const C = {
  ink: brand.colors.ink,
  yellow: brand.colors.yellow,
  paper: brand.colors.paper,
  line: brand.colors.line,
  muted: brand.colors.muted,
};

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: C.ink, backgroundColor: "#FFFFFF" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  brandName: { fontSize: 28, fontFamily: "Helvetica-Bold", letterSpacing: -0.5 },
  brandHighlight: { backgroundColor: C.yellow, paddingHorizontal: 4 },
  tagline: { color: C.muted, marginTop: 2 },
  invMeta: { textAlign: "right" },
  invNumber: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  pillSent: { marginTop: 4, alignSelf: "flex-end", paddingHorizontal: 6, paddingVertical: 2, backgroundColor: C.yellow, borderRadius: 4 },
  partiesRow: { flexDirection: "row", marginTop: 20, marginBottom: 20 },
  partyCol: { flex: 1, paddingRight: 12 },
  label: { fontSize: 8, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  partyName: { fontFamily: "Helvetica-Bold" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  table: { borderTop: 1, borderColor: C.ink, marginTop: 16 },
  tHead: { flexDirection: "row", paddingVertical: 6, borderBottom: 1, borderColor: C.ink, fontFamily: "Helvetica-Bold", fontSize: 9, textTransform: "uppercase" },
  tRow: { flexDirection: "row", paddingVertical: 8, borderBottom: 0.5, borderColor: C.line },
  tDesc: { flex: 4 },
  tQty: { flex: 1, textAlign: "right" },
  tPrice: { flex: 1.2, textAlign: "right" },
  tTotal: { flex: 1.2, textAlign: "right" },
  totalsBlock: { alignSelf: "flex-end", width: 240, marginTop: 16 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grandTotalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, marginTop: 4, backgroundColor: C.yellow, paddingHorizontal: 8 },
  grandTotalText: { fontFamily: "Helvetica-Bold", fontSize: 14 },
  payBlock: { marginTop: 32, padding: 12, backgroundColor: C.paper, borderRadius: 4 },
  payTitle: { fontFamily: "Helvetica-Bold", marginBottom: 4 },
  signatureBlock: { marginTop: 32, paddingTop: 12, borderTop: 0.5, borderColor: C.line, flexDirection: "row", justifyContent: "space-between" },
  signatureBox: { width: 220, paddingTop: 6, borderTop: 0.5, borderColor: C.ink },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", color: C.muted, fontSize: 8 },
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
  signature_png_data?: string | null;     // optional embedded signature
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

export function InvoicePDF({ invoice }: { invoice: PdfInvoice }) {
  const balance = invoice.total - invoice.amount_paid;
  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <View style={s.headerRow}>
          <View>
            {invoice.business.logoUrl ? (
              <Image src={invoice.business.logoUrl} style={{ width: 110, height: 110, marginBottom: 6 }} />
            ) : (
              <Text style={s.brandName}>
                {invoice.business.name.split(" ")[0]} <Text style={s.brandHighlight}>{invoice.business.name.split(" ").slice(1).join(" ") || ""}</Text>
              </Text>
            )}
            <Text style={s.tagline}>{brand.tagline}</Text>
            {invoice.business.address && <Text style={{ color: C.muted, marginTop: 6 }}>{invoice.business.address}</Text>}
            {invoice.business.phone && <Text style={{ color: C.muted }}>{invoice.business.phone}</Text>}
            {invoice.business.email && <Text style={{ color: C.muted }}>{invoice.business.email}</Text>}
          </View>
          <View style={s.invMeta}>
            <Text style={s.label}>Invoice</Text>
            <Text style={s.invNumber}>{invoice.invoice_number}</Text>
            {invoice.status === "paid" && <View style={s.pillSent}><Text style={{ fontFamily: "Helvetica-Bold" }}>PAID</Text></View>}
          </View>
        </View>

        <View style={s.partiesRow}>
          <View style={s.partyCol}>
            <Text style={s.label}>Bill to</Text>
            <Text style={s.partyName}>{invoice.bill_to_company}</Text>
            {invoice.bill_to_contact && <Text>{invoice.bill_to_contact}</Text>}
            {invoice.bill_to_email && <Text style={{ color: C.muted }}>{invoice.bill_to_email}</Text>}
            {invoice.bill_to_address && <Text style={{ color: C.muted, marginTop: 2 }}>{invoice.bill_to_address}</Text>}
          </View>
          <View style={[s.partyCol, { alignItems: "flex-end" }]}>
            <View style={s.metaRow}><Text style={s.label}>Issued</Text><Text style={{ marginLeft: 12 }}>{invoice.issue_date}</Text></View>
            <View style={s.metaRow}><Text style={s.label}>Due</Text><Text style={{ marginLeft: 12 }}>{invoice.due_date}</Text></View>
            {invoice.payment_terms && <View style={s.metaRow}><Text style={s.label}>Terms</Text><Text style={{ marginLeft: 12 }}>{invoice.payment_terms}</Text></View>}
          </View>
        </View>

        <View style={s.table}>
          <View style={s.tHead}>
            <Text style={s.tDesc}>Description</Text>
            <Text style={s.tQty}>Qty</Text>
            <Text style={s.tPrice}>Unit</Text>
            <Text style={s.tTotal}>Total</Text>
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

        <View style={s.totalsBlock}>
          <View style={s.totalsRow}><Text>Subtotal</Text><Text>{fmt(invoice.subtotal)}</Text></View>
          {invoice.tax > 0 && <View style={s.totalsRow}><Text>Tax</Text><Text>{fmt(invoice.tax)}</Text></View>}
          <View style={s.totalsRow}><Text style={{ color: C.muted }}>Amount paid</Text><Text style={{ color: C.muted }}>{fmt(invoice.amount_paid)}</Text></View>
          <View style={s.grandTotalRow}>
            <Text style={s.grandTotalText}>Balance due</Text>
            <Text style={s.grandTotalText}>{fmt(balance)}</Text>
          </View>
        </View>

        {invoice.notes && (
          <View style={{ marginTop: 16 }}>
            <Text style={s.label}>Notes</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}

        <View style={s.payBlock}>
          <Text style={s.payTitle}>How to pay</Text>
          {invoice.check_instructions ? (
            <Text>{invoice.check_instructions}</Text>
          ) : (
            <Text style={{ color: C.muted }}>Mail check or pay online via the link in the email.</Text>
          )}
          {invoice.payUrl && (
            <Text style={{ marginTop: 6 }}>Pay online: <Text style={{ color: C.ink, textDecoration: "underline" }}>{invoice.payUrl}</Text></Text>
          )}
        </View>

        <View style={s.signatureBlock}>
          <View style={s.signatureBox}>
            {invoice.signature_png_data && (
              <Image src={invoice.signature_png_data} style={{ height: 50, marginBottom: 4 }} />
            )}
            <Text style={{ fontSize: 8, color: C.muted }}>
              Signature{invoice.signature_signer ? ` — ${invoice.signature_signer}` : ""}
              {invoice.signed_at ? ` (${invoice.signed_at})` : ""}
            </Text>
          </View>
          <View style={[s.signatureBox, { alignSelf: "flex-end" }]}>
            <Text style={{ fontSize: 8, color: C.muted }}>Date</Text>
          </View>
        </View>

        <Text style={s.footer} fixed>
          {invoice.business.name} — Invoice {invoice.invoice_number}
        </Text>
      </Page>
    </Document>
  );
}
