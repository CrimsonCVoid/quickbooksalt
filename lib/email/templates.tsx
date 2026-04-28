import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Button,
  Hr,
  Img,
} from "@react-email/components";
import { brand } from "@/lib/branding";

const styles = {
  body: { backgroundColor: brand.colors.paper, fontFamily: "Helvetica, Arial, sans-serif", color: brand.colors.ink },
  container: { backgroundColor: "#ffffff", margin: "24px auto", padding: "32px", maxWidth: "560px", borderRadius: "12px", border: `1px solid ${brand.colors.line}` },
  heading: { fontSize: "24px", fontWeight: 800 as const, marginBottom: "8px" },
  pill: { backgroundColor: brand.colors.yellow, padding: "2px 6px", borderRadius: "4px" },
  text: { fontSize: "14px", lineHeight: "22px" },
  muted: { color: brand.colors.muted, fontSize: "12px" },
  button: { backgroundColor: brand.colors.yellow, color: brand.colors.ink, padding: "12px 18px", borderRadius: "8px", fontWeight: 700 as const, textDecoration: "none", display: "inline-block" },
  buttonAlt: { backgroundColor: "#ffffff", border: `1px solid ${brand.colors.ink}`, color: brand.colors.ink, padding: "12px 18px", borderRadius: "8px", fontWeight: 700 as const, textDecoration: "none", display: "inline-block", marginLeft: "8px" },
  hr: { borderTop: `1px solid ${brand.colors.line}`, margin: "20px 0" },
};

type InvoiceEmailProps = {
  businessName: string;
  invoiceNumber: string;
  total: string;
  dueDate: string;
  contactName: string | null;
  /** Opens the invoice PDF directly in a new tab — no review/sign page in the way. */
  viewUrl: string;
  payUrl: string | null;
  checkInstructions: string | null;
  signature: string | null;
};

export function InvoiceEmail({
  businessName,
  invoiceNumber,
  total,
  dueDate,
  contactName,
  viewUrl,
  payUrl,
  checkInstructions,
  signature,
}: InvoiceEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{businessName} invoice {invoiceNumber} — {total} due {dueDate}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>
            {businessName.split(" ")[0]} <span style={styles.pill}>{businessName.split(" ").slice(1).join(" ")}</span>
          </Heading>
          <Text style={styles.text}>Hi{contactName ? ` ${contactName}` : ""},</Text>
          <Text style={styles.text}>
            Your invoice <strong>{invoiceNumber}</strong> is attached as a PDF and ready for review.
            Total <strong>{total}</strong> — due <strong>{dueDate}</strong>.
          </Text>
          <Section style={{ margin: "20px 0" }}>
            <Button href={viewUrl} style={styles.button}>View invoice</Button>
            {payUrl && <Button href={payUrl} style={styles.buttonAlt}>Pay online</Button>}
          </Section>
          {checkInstructions && (
            <>
              <Hr style={styles.hr} />
              <Text style={{ ...styles.text, whiteSpace: "pre-line" }}>
                <strong>Paying by check?</strong>{"\n"}{checkInstructions}
              </Text>
            </>
          )}
          {signature && (
            <>
              <Hr style={styles.hr} />
              <Text style={{ ...styles.text, whiteSpace: "pre-line" }}>{signature}</Text>
            </>
          )}
          <Text style={styles.muted}>Reply to this email with any questions.</Text>
        </Container>
      </Body>
    </Html>
  );
}

export function ReceiptEmail({
  businessName,
  invoiceNumber,
  amount,
  paidAt,
  method,
  signature,
}: {
  businessName: string;
  invoiceNumber: string;
  amount: string;
  paidAt: string;
  method: string;
  signature: string | null;
}) {
  return (
    <Html>
      <Head />
      <Preview>{businessName} — payment received for {invoiceNumber}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Thanks — payment received</Heading>
          <Text style={styles.text}>
            We received <strong>{amount}</strong> via {method} on {paidAt}, applied to invoice <strong>{invoiceNumber}</strong>.
          </Text>
          <Text style={styles.muted}>{businessName}</Text>
          {signature && (
            <>
              <Hr style={styles.hr} />
              <Text style={{ ...styles.text, whiteSpace: "pre-line" }}>{signature}</Text>
            </>
          )}
        </Container>
      </Body>
    </Html>
  );
}

export function SignatureConfirmEmail({
  businessName,
  invoiceNumber,
  signerName,
  signedAt,
  signature,
}: {
  businessName: string;
  invoiceNumber: string;
  signerName: string;
  signedAt: string;
  signature: string | null;
}) {
  return (
    <Html>
      <Head />
      <Preview>Signed — {invoiceNumber}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Invoice signed</Heading>
          <Text style={styles.text}>
            <strong>{signerName}</strong> signed invoice <strong>{invoiceNumber}</strong> on {signedAt}. The signed PDF is attached.
          </Text>
          <Text style={styles.muted}>{businessName}</Text>
          {signature && (
            <>
              <Hr style={styles.hr} />
              <Text style={{ ...styles.text, whiteSpace: "pre-line" }}>{signature}</Text>
            </>
          )}
        </Container>
      </Body>
    </Html>
  );
}
