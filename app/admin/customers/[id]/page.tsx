import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomerForm } from "@/components/customer-form";
import { LocationsList } from "@/components/locations-list";
import { FilterMixCard } from "@/components/filter-mix-card";
import { formatMoney, formatDate } from "@/lib/utils";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: customer }, { data: locations }, { data: invoices }, { data: plan }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).single(),
    supabase
      .from("locations")
      .select("*, location_filters(quantity, unit_price_override, sku:filter_skus(id, name, size, merv, unit_price))")
      .eq("customer_id", id)
      .eq("archived", false)
      .order("label"),
    supabase
      .from("invoices")
      .select("id, invoice_number, status, total, balance_due, due_date, issue_date")
      .eq("customer_id", id)
      .order("issue_date", { ascending: false })
      .limit(10),
    supabase
      .from("service_plans")
      .select("id, name, frequency, custom_interval_days, labor_fee, next_due_date, active")
      .eq("customer_id", id)
      .eq("active", true)
      .maybeSingle(),
  ]);

  if (!customer) notFound();

  const locs = locations ?? [];
  const invList = invoices ?? [];

  return (
    <div>
      <Link href="/admin/customers" className="text-sm text-fm-muted hover:text-fm-ink">← Customers</Link>
      <div className="flex items-start justify-between mt-2 mb-6">
        <div className="flex-1">
          <h1 className="display text-4xl">{customer.company_name}</h1>
          {customer.contact_name && <p className="text-fm-muted mt-1">{customer.contact_name}</p>}
          {customer.archived && (
            <span className="inline-block mt-2 rounded-md bg-fm-line px-2 py-0.5 text-xs font-semibold text-fm-muted uppercase tracking-wider">Archived</span>
          )}
        </div>
        <Link href={`/admin/invoices/new?customer=${customer.id}`} className="btn btn-primary">
          + New invoice
        </Link>
      </div>

      {/* Quick-glance summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryStat
          label="Tax rate"
          value={customer.tax_rate > 0 ? `${(Number(customer.tax_rate) * 100).toFixed(3).replace(/\.?0+$/, "")}%` : "Exempt / 0%"}
        />
        <SummaryStat
          label={plan ? "Cycle price" : "Billing"}
          value={plan ? formatMoney(Number(plan.labor_fee)) : "Per invoice"}
        />
        <SummaryStat
          label="Frequency"
          value={plan
            ? plan.frequency === "custom_days"
              ? `Every ${plan.custom_interval_days} days`
              : (plan.frequency || "—").replace("_", " ")
            : "—"}
        />
        <SummaryStat
          label="Next service"
          value={plan?.next_due_date ? formatDate(plan.next_due_date) : "—"}
        />
      </div>

      {/* Filter mix front-and-center — what gets serviced each cycle */}
      <FilterMixCard locations={locs as any} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <section className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="display text-xl mb-4">Details</h2>
            <CustomerForm customer={customer} />
          </div>

          <div className="card">
            <h2 className="display text-xl mb-4">Service locations</h2>
            <LocationsList customerId={customer.id} initialLocations={locs as any} />
          </div>
        </section>

        <aside className="space-y-6">
          {plan && (
            <div className="card">
              <h2 className="display text-xl mb-3">Service plan</h2>
              <p className="font-medium">{plan.name}</p>
              <p className="text-sm text-fm-muted">{formatMoney(Number(plan.labor_fee))} every {plan.custom_interval_days} days</p>
              <p className="text-xs text-fm-muted mt-1">Next due {formatDate(plan.next_due_date)}</p>
              <Link href={`/admin/plans/${plan.id}`} className="btn btn-secondary text-sm mt-3 w-full text-center">
                Manage plan
              </Link>
            </div>
          )}

          <div className="card">
            <h2 className="display text-xl mb-4">Recent invoices</h2>
            {invList.length === 0 ? (
              <p className="text-sm text-fm-muted">No invoices yet.</p>
            ) : (
              <ul className="space-y-3">
                {invList.map((inv) => (
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

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card py-3 px-4">
      <p className="text-xs uppercase tracking-wider text-fm-muted">{label}</p>
      <p className="font-semibold mt-0.5">{value}</p>
    </div>
  );
}
