"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { allocateInvoiceNumber, buildLineItemsFromLocations, lineItemsTotal, formatYmd } from "@/lib/invoicing";
import { addDays } from "date-fns";

const LineSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().min(0),
  unit_price: z.coerce.number().min(0),
  sku_id: z.string().uuid().optional().nullable(),
  location_id: z.string().uuid().optional().nullable(),
});

const CreateSchema = z.object({
  customer_id: z.string().uuid(),
  location_ids: z.array(z.string().uuid()).default([]),
  due_date: z.string().min(1),
  payment_terms_days: z.coerce.number().int().min(0).max(365).optional().nullable(),
  notes: z.string().optional().nullable(),
  lines: z.array(LineSchema).min(1, "At least one line item required"),
});

export async function createInvoice(input: z.infer<typeof CreateSchema>) {
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: customer, error: cErr } = await supabase
    .from("customers")
    .select("*")
    .eq("id", parsed.data.customer_id)
    .single();
  if (cErr || !customer) return { error: "Customer not found" };

  const { data: settings } = await supabase
    .from("settings")
    .select("check_instructions")
    .eq("owner_id", user.id)
    .maybeSingle();

  const subtotal = lineItemsTotal(parsed.data.lines);
  const billToAddress = [
    customer.billing_line1,
    customer.billing_line2,
    [customer.billing_city, [customer.billing_state, customer.billing_postal].filter(Boolean).join(" ")].filter(Boolean).join(", "),
  ].filter(Boolean).join("\n");
  const termsDays = parsed.data.payment_terms_days ?? customer.payment_terms_days ?? 15;
  const invoiceNumber = await allocateInvoiceNumber(supabase as any, user.id);

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      owner_id: user.id,
      customer_id: customer.id,
      invoice_number: invoiceNumber,
      status: "draft",
      issue_date: formatYmd(new Date()),
      due_date: parsed.data.due_date,
      bill_to_company: customer.company_name,
      bill_to_contact: customer.contact_name,
      bill_to_email: customer.email,
      bill_to_address: billToAddress,
      subtotal,
      tax: 0,
      total: subtotal,
      payment_terms: `Net ${termsDays}`,
      check_instructions: settings?.check_instructions ?? null,
      notes: parsed.data.notes,
    })
    .select("id")
    .single();

  if (invErr || !invoice) return { error: invErr?.message || "Failed to create" };

  const lineRows = parsed.data.lines.map((l, i) => ({
    owner_id: user.id,
    invoice_id: invoice.id,
    sku_id: l.sku_id || null,
    location_id: l.location_id || null,
    description: l.description,
    quantity: l.quantity,
    unit_price: l.unit_price,
    sort_order: i,
  }));
  const { error: liErr } = await supabase.from("invoice_line_items").insert(lineRows);
  if (liErr) return { error: liErr.message };

  revalidatePath("/admin/invoices");
  redirect(`/admin/invoices/${invoice.id}`);
}

export async function prefillFromCustomer(customerId: string, locationIds: string[], laborFee = 0, laborLabel = "Service visit") {
  const supabase = await createClient();
  const lines = await buildLineItemsFromLocations(supabase as any, customerId, locationIds, laborFee, laborLabel);
  return lines;
}

const PaymentSchema = z.object({
  invoice_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  method: z.enum(["check", "stripe", "cash", "ach", "other"]),
  paid_at: z.string().min(1),
  check_number: z.string().optional().nullable(),
  deposit_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function recordPayment(input: z.infer<typeof PaymentSchema>) {
  const parsed = PaymentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: pay, error } = await supabase
    .from("payments")
    .insert({ ...parsed.data, owner_id: user.id, deposit_date: parsed.data.deposit_date || null })
    .select("invoice_id")
    .single();
  if (error) return { error: error.message };

  // Recompute amount_paid + status
  const { data: payments } = await supabase
    .from("payments")
    .select("amount")
    .eq("invoice_id", pay.invoice_id);
  const totalPaid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);

  const { data: inv } = await supabase
    .from("invoices")
    .select("total")
    .eq("id", pay.invoice_id)
    .single();
  const newStatus = inv && totalPaid >= Number(inv.total) ? "paid" : undefined;

  await supabase
    .from("invoices")
    .update({
      amount_paid: totalPaid,
      ...(newStatus ? { status: newStatus } : {}),
    })
    .eq("id", pay.invoice_id);

  revalidatePath(`/admin/invoices/${pay.invoice_id}`);
  return { ok: true };
}

export async function deletePayment(paymentId: string) {
  const supabase = await createClient();
  const { data: pay } = await supabase.from("payments").select("invoice_id").eq("id", paymentId).single();
  if (!pay) return { error: "Not found" };
  const { error } = await supabase.from("payments").delete().eq("id", paymentId);
  if (error) return { error: error.message };

  // Recompute
  const { data: payments } = await supabase.from("payments").select("amount").eq("invoice_id", pay.invoice_id);
  const totalPaid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const { data: inv } = await supabase.from("invoices").select("total, status").eq("id", pay.invoice_id).single();
  const newStatus = inv && inv.status === "paid" && totalPaid < Number(inv.total) ? "sent" : inv?.status;
  await supabase.from("invoices").update({ amount_paid: totalPaid, status: newStatus }).eq("id", pay.invoice_id);

  revalidatePath(`/admin/invoices/${pay.invoice_id}`);
  return { ok: true };
}

export async function voidInvoice(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("invoices").update({ status: "void" }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/invoices/${id}`);
  revalidatePath("/admin/invoices");
  return { ok: true };
}

/** Approve a pending_approval invoice & send (approve + email). */
export async function approveAndSendInvoice(id: string) {
  const supabase = await createClient();
  await supabase.from("invoices").update({ status: "draft" }).eq("id", id); // flip out of pending so send can proceed
  const { sendInvoiceEmail } = await import("@/lib/email");
  return await sendInvoiceEmail(id);
}

export async function sendInvoice(id: string) {
  const { sendInvoiceEmail } = await import("@/lib/email");
  return await sendInvoiceEmail(id);
}
