import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePDF, type PdfInvoice } from "./invoice-pdf";
import { createServiceClient } from "@/lib/supabase/server";
import { brand } from "@/lib/branding";

export async function loadInvoiceForPdf(invoiceId: string, ownerId?: string): Promise<PdfInvoice> {
  const supabase = createServiceClient();
  const { data: inv, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();
  if (error || !inv) throw error || new Error("Invoice not found");
  if (ownerId && inv.owner_id !== ownerId) throw new Error("Forbidden");

  const [{ data: lines }, { data: settings }, { data: signature }] = await Promise.all([
    supabase.from("invoice_line_items").select("*").eq("invoice_id", invoiceId).order("sort_order"),
    supabase.from("settings").select("*").eq("owner_id", inv.owner_id).maybeSingle(),
    supabase
      .from("signatures")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("signed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  let signatureDataUrl: string | null = null;
  if (signature?.signature_storage_path) {
    const { data } = await supabase.storage.from("signatures").download(signature.signature_storage_path);
    if (data) {
      const buf = Buffer.from(await data.arrayBuffer());
      signatureDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const payUrl = `${baseUrl}/pay/${inv.public_token}`;

  return {
    invoice_number: inv.invoice_number,
    status: inv.status,
    issue_date: inv.issue_date,
    due_date: inv.due_date,
    bill_to_company: inv.bill_to_company,
    bill_to_contact: inv.bill_to_contact,
    bill_to_email: inv.bill_to_email,
    bill_to_address: inv.bill_to_address,
    subtotal: Number(inv.subtotal),
    tax: Number(inv.tax),
    total: Number(inv.total),
    amount_paid: Number(inv.amount_paid),
    payment_terms: inv.payment_terms,
    notes: inv.notes,
    check_instructions: inv.check_instructions,
    lines: (lines ?? []).map((l: any) => ({
      description: l.description,
      quantity: Number(l.quantity),
      unit_price: Number(l.unit_price),
      line_total: Number(l.line_total),
    })),
    signature_png_data: signatureDataUrl,
    signature_signer: signature?.signer_name ?? null,
    signed_at: signature?.signed_at ?? null,
    business: {
      name: settings?.business_name || brand.name,
      address: settings?.business_address || null,
      phone: settings?.business_phone || null,
      email: settings?.business_email || null,
      logoUrl: settings?.logo_url || null,
    },
    check: {
      payTo: settings?.check_pay_to || settings?.business_name || brand.name,
      addressLine1: settings?.check_address_line1 || null,
      addressLine2: settings?.check_address_line2 || null,
      city: settings?.check_city || null,
      state: settings?.check_state || null,
      postal: settings?.check_postal || null,
      memo: (settings?.check_memo_template || "Invoice {invoice_number}").replace(
        "{invoice_number}",
        inv.invoice_number
      ),
      notes: inv.check_instructions || settings?.check_instructions || null,
    },
    payUrl: settings?.stripe_enabled ? payUrl : null,
  };
}

export async function renderInvoicePdf(invoiceId: string): Promise<Buffer> {
  const data = await loadInvoiceForPdf(invoiceId);
  return await renderToBuffer(<InvoicePDF invoice={data} />);
}
