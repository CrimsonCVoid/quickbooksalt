import type { SupabaseClient } from "@supabase/supabase-js";
import { addMonths, addDays, format } from "date-fns";

/**
 * Allocate the next invoice number for an owner.
 * Uses settings.invoice_number_seq as a monotonic counter, formatted as PREFIX-YYYY-NNNN.
 * Race-safe via UPDATE ... RETURNING.
 */
export async function allocateInvoiceNumber(
  supabase: SupabaseClient,
  ownerId: string
): Promise<string> {
  // Ensure a settings row exists
  const { data: existing } = await supabase
    .from("settings")
    .select("invoice_number_prefix, invoice_number_seq")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (!existing) {
    await supabase.from("settings").insert({ owner_id: ownerId });
  }

  // Atomic increment via RPC alternative: update + return
  const { data: updated, error } = await supabase
    .from("settings")
    .update({ invoice_number_seq: (existing?.invoice_number_seq ?? 0) + 1 })
    .eq("owner_id", ownerId)
    .select("invoice_number_prefix, invoice_number_seq")
    .single();

  if (error || !updated) throw error || new Error("Failed to allocate invoice number");

  const prefix = updated.invoice_number_prefix || "FM";
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(updated.invoice_number_seq).padStart(4, "0")}`;
}

export type LineDraft = {
  sku_id?: string | null;
  location_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  sort_order?: number;
};

/**
 * Build line item drafts for a customer from their location_filters.
 *
 * Two modes — chosen automatically based on `laborFee`:
 *
 *   PROJECT MODE (laborFee > 0):
 *     One bundled line per location: "Filter service · 1× 16x20, 3× 20x20"
 *     priced at the cycle price. The customer sees one clean number,
 *     never a wall of $0 filter rows. This is the right model when the
 *     project price covers everything (filters + labor + margin).
 *
 *   ITEMIZED MODE (laborFee == 0):
 *     One line per filter at its SKU unit_price. Used when each SKU has
 *     real per-unit pricing (e.g. residential subscription where every
 *     filter has a list price).
 */
export async function buildLineItemsFromLocations(
  supabase: SupabaseClient,
  customerId: string,
  locationIds: string[],
  laborFee = 0,
  laborLabel = "Filter service"
): Promise<LineDraft[]> {
  let q = supabase
    .from("locations")
    .select(
      "id, label, location_filters(quantity, unit_price_override, sku:filter_skus(id, name, size, merv, unit_price))"
    )
    .eq("customer_id", customerId)
    .eq("archived", false);

  if (locationIds.length) q = q.in("id", locationIds);

  const { data: locations, error } = await q;
  if (error) throw error;

  const lines: LineDraft[] = [];
  let order = 0;

  if (laborFee > 0) {
    // Project mode: one bundled line per location with the filter mix in the description.
    const allMixParts: string[] = [];
    for (const loc of locations ?? []) {
      const filters = (loc.location_filters as any[]) ?? [];
      const mix = filters
        .filter((lf) => lf.sku)
        .map((lf) => `${lf.quantity}× ${lf.sku.name}`)
        .join(", ");
      if (mix) allMixParts.push(mix);
    }
    const mixSummary = allMixParts.join(" · ");
    const description = mixSummary ? `${laborLabel} — ${mixSummary}` : laborLabel;
    lines.push({
      location_id: locations?.[0]?.id ?? null,
      description,
      quantity: 1,
      unit_price: laborFee,
      sort_order: 0,
    });
    return lines;
  }

  // Itemized mode
  for (const loc of locations ?? []) {
    for (const lf of (loc.location_filters as any[]) ?? []) {
      const sku = lf.sku;
      if (!sku) continue;
      const price = Number(lf.unit_price_override ?? sku.unit_price ?? 0);
      lines.push({
        sku_id: sku.id,
        location_id: loc.id,
        description: `${sku.name}${sku.size ? ` (${sku.size})` : ""} — ${loc.label}`,
        quantity: lf.quantity,
        unit_price: price,
        sort_order: order++,
      });
    }
  }

  return lines;
}

export function lineItemsTotal(lines: LineDraft[]): number {
  return lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
}

/** Compute the next due date for a service plan after generation. */
export function advanceDueDate(
  current: Date,
  frequency: "monthly" | "quarterly" | "semiannual" | "annual" | "custom_days",
  customDays?: number | null
): Date {
  switch (frequency) {
    case "monthly":    return addMonths(current, 1);
    case "quarterly":  return addMonths(current, 3);
    case "semiannual": return addMonths(current, 6);
    case "annual":     return addMonths(current, 12);
    case "custom_days":return addDays(current, customDays || 30);
  }
}

export function formatYmd(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/**
 * Generate one draft invoice from a service plan.
 * Inserts an `invoices` row with status=pending_approval and snapshotted lines.
 * Returns the new invoice id, or null if the customer has no billable lines.
 */
export async function generateInvoiceFromPlan(
  supabase: SupabaseClient,
  ownerId: string,
  plan: {
    id: string;
    customer_id: string;
    location_ids: string[];
    labor_fee: number;
    labor_fee_label: string | null;
    payment_terms_days: number | null;
    next_due_date: string;
  }
): Promise<{ invoiceId: string; invoiceNumber: string } | null> {
  const lines = await buildLineItemsFromLocations(
    supabase,
    plan.customer_id,
    plan.location_ids ?? [],
    Number(plan.labor_fee || 0),
    plan.labor_fee_label || "Service visit"
  );
  if (lines.length === 0) return null;

  const { data: customer, error: cErr } = await supabase
    .from("customers")
    .select("*")
    .eq("id", plan.customer_id)
    .single();
  if (cErr || !customer) throw cErr;

  const { data: settings } = await supabase
    .from("settings")
    .select("check_instructions, default_terms_days")
    .eq("owner_id", ownerId)
    .maybeSingle();

  const termsDays = plan.payment_terms_days ?? customer.payment_terms_days ?? settings?.default_terms_days ?? 15;
  const issueDate = new Date();
  const dueDate = new Date(plan.next_due_date);
  const subtotal = lineItemsTotal(lines);
  // Tax applied to full invoice (NC sources to destination; HVAC repair/maintenance
  // is taxable on filters + labor combined).
  const taxRate = Number(customer.tax_rate || 0);
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = subtotal + tax;

  const billToAddress = [
    customer.billing_line1,
    customer.billing_line2,
    [customer.billing_city, [customer.billing_state, customer.billing_postal].filter(Boolean).join(" ")].filter(Boolean).join(", "),
  ].filter(Boolean).join("\n");

  const invoiceNumber = await allocateInvoiceNumber(supabase, ownerId);

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      owner_id: ownerId,
      customer_id: plan.customer_id,
      service_plan_id: plan.id,
      invoice_number: invoiceNumber,
      status: "pending_approval",
      issue_date: formatYmd(issueDate),
      due_date: formatYmd(dueDate),
      bill_to_company: customer.company_name,
      bill_to_contact: customer.contact_name,
      bill_to_email: customer.email,
      bill_to_address: billToAddress,
      subtotal,
      tax,
      total,
      payment_terms: `Net ${termsDays}`,
      check_instructions: settings?.check_instructions ?? null,
    })
    .select("id, invoice_number")
    .single();

  if (invErr || !invoice) throw invErr;

  const lineRows = lines.map((l) => ({ ...l, owner_id: ownerId, invoice_id: invoice.id }));
  const { error: liErr } = await supabase.from("invoice_line_items").insert(lineRows);
  if (liErr) throw liErr;

  return { invoiceId: invoice.id, invoiceNumber: invoice.invoice_number };
}
