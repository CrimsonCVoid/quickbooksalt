"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { renderInvoicePdf } from "@/lib/pdf/render";
import { InvoiceEmail, ReceiptEmail, SignatureConfirmEmail } from "./templates";
import { getResend, fromAddress, replyToAddress } from "./resend";
import { brand } from "@/lib/branding";
import { format } from "date-fns";
import { render } from "@react-email/components";

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

async function logEmail(
  ownerId: string,
  invoiceId: string | null,
  kind: string,
  toEmail: string,
  subject: string,
  resendId: string | null,
  status: string,
  error?: string
) {
  const supabase = createServiceClient();
  await supabase.from("email_log").insert({
    owner_id: ownerId,
    invoice_id: invoiceId,
    kind,
    to_email: toEmail,
    subject,
    resend_id: resendId,
    status,
    error: error || null,
  });
}

async function getSettings(ownerId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase.from("settings").select("*").eq("owner_id", ownerId).maybeSingle();
  return data;
}

/** Send the invoice email with PDF attached + sign/pay links. */
export async function sendInvoiceEmail(invoiceId: string): Promise<{ ok?: boolean; error?: string }> {
  const supabase = createServiceClient();
  const { data: inv, error } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
  if (error || !inv) return { error: "Invoice not found" };
  if (!inv.bill_to_email) return { error: "Customer has no email on file." };

  const settings = await getSettings(inv.owner_id);
  const businessName = settings?.business_name || brand.name;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  // Email links straight to the PDF — no "Review & sign" interstitial.
  // Browsers render application/pdf inline, so the recipient sees the invoice
  // immediately in a new tab. Signatures happen in person via the contractor's phone.
  const viewUrl = `${baseUrl}/api/public/invoices/${inv.public_token}/pdf`;
  const payUrl = settings?.stripe_enabled ? `${baseUrl}/pay/${inv.public_token}` : null;

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderInvoicePdf(invoiceId);
  } catch (e: any) {
    return { error: `PDF render failed: ${e.message}` };
  }

  const subject = `${businessName} invoice ${inv.invoice_number} — ${fmt(Number(inv.total))} due ${format(new Date(inv.due_date), "MMM d, yyyy")}`;
  const html = await render(
    InvoiceEmail({
      businessName,
      invoiceNumber: inv.invoice_number,
      total: fmt(Number(inv.total)),
      dueDate: format(new Date(inv.due_date), "MMM d, yyyy"),
      contactName: inv.bill_to_contact,
      viewUrl,
      payUrl,
      checkInstructions: inv.check_instructions || settings?.check_instructions || null,
      signature: settings?.email_signature || null,
    }) as any
  );

  let resendId: string | null = null;
  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: settings?.resend_from_email || fromAddress(),
      replyTo: replyToAddress(),
      to: [inv.bill_to_email],
      subject,
      html,
      attachments: [{ filename: `${inv.invoice_number}.pdf`, content: pdfBuffer }],
    });
    resendId = (result as any)?.data?.id ?? null;
    if ((result as any)?.error) {
      const msg = (result as any).error.message || "Send failed";
      await logEmail(inv.owner_id, inv.id, "invoice_sent", inv.bill_to_email, subject, null, "failed", msg);
      return { error: msg };
    }
  } catch (e: any) {
    await logEmail(inv.owner_id, inv.id, "invoice_sent", inv.bill_to_email, subject, null, "failed", e.message);
    return { error: e.message };
  }

  // mark sent + bump status
  const newStatus = inv.status === "paid" ? inv.status : "sent";
  await supabase
    .from("invoices")
    .update({ status: newStatus, sent_at: new Date().toISOString(), last_email_id: resendId })
    .eq("id", inv.id);

  await logEmail(inv.owner_id, inv.id, "invoice_sent", inv.bill_to_email, subject, resendId, "sent");
  return { ok: true };
}

export async function sendReceiptEmail(invoiceId: string, paymentId: string) {
  const supabase = createServiceClient();
  const { data: inv } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
  const { data: pay } = await supabase.from("payments").select("*").eq("id", paymentId).single();
  if (!inv || !pay || !inv.bill_to_email) return { error: "Missing data" };

  const settings = await getSettings(inv.owner_id);
  const businessName = settings?.business_name || brand.name;
  const subject = `Payment received — ${inv.invoice_number}`;
  const html = await render(
    ReceiptEmail({
      businessName,
      invoiceNumber: inv.invoice_number,
      amount: fmt(Number(pay.amount)),
      paidAt: format(new Date(pay.paid_at), "MMM d, yyyy"),
      method: pay.method,
      signature: settings?.email_signature || null,
    }) as any
  );
  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: settings?.resend_from_email || fromAddress(),
      replyTo: replyToAddress(),
      to: [inv.bill_to_email],
      subject,
      html,
    });
    const id = (result as any)?.data?.id ?? null;
    await logEmail(inv.owner_id, inv.id, "receipt", inv.bill_to_email, subject, id, "sent");
    return { ok: true };
  } catch (e: any) {
    await logEmail(inv.owner_id, inv.id, "receipt", inv.bill_to_email, subject, null, "failed", e.message);
    return { error: e.message };
  }
}

export async function sendSignatureConfirm(invoiceId: string, signatureId: string) {
  const supabase = createServiceClient();
  const { data: inv } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
  const { data: sig } = await supabase.from("signatures").select("*").eq("id", signatureId).single();
  if (!inv || !sig) return { error: "Missing data" };

  const settings = await getSettings(inv.owner_id);
  const businessName = settings?.business_name || brand.name;
  const subject = `Signed — ${inv.invoice_number}`;
  const html = await render(
    SignatureConfirmEmail({
      businessName,
      invoiceNumber: inv.invoice_number,
      signerName: sig.signer_name || "Customer",
      signedAt: format(new Date(sig.signed_at), "MMM d, yyyy h:mm a"),
      signature: settings?.email_signature || null,
    }) as any
  );

  let pdfBuffer: Buffer | null = null;
  try { pdfBuffer = await renderInvoicePdf(invoiceId); } catch {}

  // Send to both the signer (bill_to_email) and the owner
  const ownerEmail = process.env.OWNER_EMAIL;
  const recipients = [inv.bill_to_email, ownerEmail].filter(Boolean) as string[];

  try {
    const resend = getResend();
    for (const to of recipients) {
      const result = await resend.emails.send({
        from: settings?.resend_from_email || fromAddress(),
        replyTo: replyToAddress(),
        to: [to],
        subject,
        html,
        attachments: pdfBuffer ? [{ filename: `${inv.invoice_number}.pdf`, content: pdfBuffer }] : undefined,
      });
      const id = (result as any)?.data?.id ?? null;
      await logEmail(inv.owner_id, inv.id, "signature_confirm", to, subject, id, "sent");
    }
    return { ok: true };
  } catch (e: any) {
    return { error: e.message };
  }
}
