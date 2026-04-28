import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InvoiceComposer } from "@/components/invoice-composer";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, company_name, payment_terms_days, locations(id, label, archived, location_filters(quantity, unit_price_override, sku:filter_skus(id, name, size, merv, unit_price)))")
    .eq("archived", false)
    .order("company_name");

  return (
    <div>
      <Link href="/admin/invoices" className="text-sm text-fm-muted hover:text-fm-ink">← Invoices</Link>
      <h1 className="display text-4xl mt-2 mb-6">New invoice</h1>
      <InvoiceComposer customers={(customers as any) ?? []} initialCustomerId={params.customer} />
    </div>
  );
}
