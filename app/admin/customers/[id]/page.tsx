import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomerForm } from "@/components/customer-form";
import { LocationsList } from "@/components/locations-list";
import { formatMoney, formatDate } from "@/lib/utils";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: customer }, { data: locations }, { data: invoices }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).single(),
    supabase.from("locations").select("*").eq("customer_id", id).eq("archived", false).order("label"),
    supabase
      .from("invoices")
      .select("id, invoice_number, status, total, balance_due, due_date, issue_date")
      .eq("customer_id", id)
      .order("issue_date", { ascending: false })
      .limit(10),
  ]);

  if (!customer) notFound();

  return (
    <div>
      <Link href="/admin/customers" className="text-sm text-fm-muted hover:text-fm-ink">← Customers</Link>
      <div className="flex items-start justify-between mt-2 mb-6">
        <div>
          <h1 className="display text-4xl">{customer.company_name}</h1>
          {customer.contact_name && <p className="text-fm-muted mt-1">{customer.contact_name}</p>}
        </div>
        <Link href={`/admin/invoices/new?customer=${customer.id}`} className="btn btn-primary">
          + New invoice
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="display text-xl mb-4">Details</h2>
            <CustomerForm customer={customer} />
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="display text-xl">Service locations</h2>
            </div>
            <LocationsList customerId={customer.id} initialLocations={locations ?? []} />
          </div>
        </section>

        <aside>
          <div className="card">
            <h2 className="display text-xl mb-4">Recent invoices</h2>
            {!invoices || invoices.length === 0 ? (
              <p className="text-sm text-fm-muted">No invoices yet.</p>
            ) : (
              <ul className="space-y-3">
                {invoices.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between text-sm">
                    <Link href={`/admin/invoices/${inv.id}`} className="hover:underline">
                      <div className="font-medium">{inv.invoice_number}</div>
                      <div className="text-xs text-fm-muted">Due {formatDate(inv.due_date)}</div>
                    </Link>
                    <div className="text-right">
                      <div className="font-semibold">{formatMoney(Number(inv.total))}</div>
                      <span className={`badge badge-${inv.status}`}>{inv.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
