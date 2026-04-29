import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatDate } from "@/lib/utils";

/**
 * "Project SKUs" view — one row per customer, with their cycle price baked in
 * (from the CSV). Each row is a one-click invoice trigger that auto-prefills
 * the lines using the customer's filter mix + cycle price.
 *
 * Rows without an active plan ("per-invoice" customers) show "Per invoice"
 * and route to the invoice composer where you set the price manually.
 */

type ProjectRow = {
  customerId: string;
  customer: string;
  archived: boolean;
  city: string;
  state: string;
  cyclePrice: number | null;
  intervalDays: number | null;
  nextDue: string | null;
  filters: { name: string; qty: number }[];
  totalFilters: number;
  taxRate: number;
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const params = await searchParams;
  const filter = params.filter || "active";
  const q = (params.q || "").toLowerCase();

  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select(`
      id, company_name, archived, billing_city, billing_state, tax_rate,
      service_plans(id, labor_fee, custom_interval_days, frequency, next_due_date, active),
      locations(id, archived, location_filters(quantity, sku:filter_skus(id, name)))
    `)
    .order("company_name");

  const rows: ProjectRow[] = (customers ?? []).map((c: any) => {
    const plan = (c.service_plans || []).find((p: any) => p.active);
    const filterMap = new Map<string, number>();
    for (const loc of c.locations || []) {
      if (loc.archived) continue;
      for (const lf of loc.location_filters || []) {
        if (!lf.sku) continue;
        filterMap.set(lf.sku.name, (filterMap.get(lf.sku.name) ?? 0) + Number(lf.quantity));
      }
    }
    const filters = Array.from(filterMap.entries())
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty);
    return {
      customerId: c.id,
      customer: c.company_name,
      archived: c.archived,
      city: c.billing_city ?? "",
      state: c.billing_state ?? "",
      cyclePrice: plan ? Number(plan.labor_fee) : null,
      intervalDays: plan ? Number(plan.custom_interval_days || 30) : null,
      nextDue: plan?.next_due_date ?? null,
      filters,
      totalFilters: filters.reduce((s, f) => s + f.qty, 0),
      taxRate: Number(c.tax_rate ?? 0),
    };
  });

  // Filter
  const visible = rows.filter((r) => {
    if (q && !r.customer.toLowerCase().includes(q) && !r.city.toLowerCase().includes(q)) return false;
    if (filter === "active") return !r.archived && r.cyclePrice !== null;
    if (filter === "per-invoice") return !r.archived && r.cyclePrice === null;
    if (filter === "archived") return r.archived;
    return true;
  });

  const counts = {
    all: rows.length,
    active: rows.filter((r) => !r.archived && r.cyclePrice !== null).length,
    perInvoice: rows.filter((r) => !r.archived && r.cyclePrice === null).length,
    archived: rows.filter((r) => r.archived).length,
  };

  const tabs = [
    { key: "active", label: `Active (${counts.active})` },
    { key: "per-invoice", label: `Per-invoice (${counts.perInvoice})` },
    { key: "archived", label: `Archived (${counts.archived})` },
    { key: "all", label: `All (${counts.all})` },
  ];

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="display text-4xl">Projects</h1>
          <p className="text-fm-muted">
            One row per customer with their preloaded cycle price + filter mix.
            Click "+ Invoice" to generate one in a single click.
          </p>
        </div>
        <Link href="/admin/skus" className="btn btn-secondary text-sm">
          Filter catalog →
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-2 flex-wrap">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/admin/projects?filter=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                filter === t.key ? "bg-fm-ink text-white" : "bg-white border border-fm-line text-fm-ink"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <form action="/admin/projects" className="flex items-center gap-2">
          <input type="hidden" name="filter" value={filter} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search…"
            className="input text-sm"
            style={{ maxWidth: 240 }}
          />
        </form>
      </div>

      {visible.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-fm-muted">No projects match.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-fm-muted bg-fm-paper">
              <tr>
                <th className="px-6 py-3">Project</th>
                <th className="px-6 py-3">Filter mix</th>
                <th className="px-6 py-3 text-right">Cycle</th>
                <th className="px-6 py-3 text-right">Tax</th>
                <th className="px-6 py-3">Frequency</th>
                <th className="px-6 py-3">Next due</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fm-line">
              {visible.map((r) => (
                <tr key={r.customerId} className="hover:bg-fm-paper/50">
                  <td className="px-6 py-3 align-top">
                    <Link href={`/admin/customers/${r.customerId}`} className="font-medium hover:underline">
                      {r.customer}
                    </Link>
                    <div className="text-xs text-fm-muted">
                      {[r.city, r.state].filter(Boolean).join(", ") || "—"}
                    </div>
                  </td>
                  <td className="px-6 py-3 align-top">
                    {r.filters.length === 0 ? (
                      <span className="text-fm-muted text-xs italic">no filters set</span>
                    ) : (
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {r.filters.map((f) => (
                          <span
                            key={f.name}
                            className="inline-flex items-baseline gap-1 rounded bg-fm-yellow/30 px-1.5 py-0.5 text-xs"
                          >
                            <span className="font-mono uppercase">{f.name}</span>
                            <span className="font-bold">×{f.qty}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3 align-top text-right font-semibold">
                    {r.cyclePrice !== null ? formatMoney(r.cyclePrice) : <span className="text-fm-muted text-xs">Per invoice</span>}
                  </td>
                  <td className="px-6 py-3 align-top text-right text-xs text-fm-muted">
                    {r.taxRate > 0 ? `${(r.taxRate * 100).toFixed(2).replace(/\.?0+$/, "")}%` : "—"}
                  </td>
                  <td className="px-6 py-3 align-top text-fm-muted text-xs">
                    {r.intervalDays ? `Every ${r.intervalDays} days` : "—"}
                  </td>
                  <td className="px-6 py-3 align-top text-fm-muted text-xs">
                    {r.nextDue ? formatDate(r.nextDue) : "—"}
                  </td>
                  <td className="px-6 py-3 align-top text-right">
                    <Link
                      href={`/admin/invoices/new?customer=${r.customerId}&autofill=1`}
                      className="btn btn-primary text-xs whitespace-nowrap"
                    >
                      + Invoice
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-fm-muted mt-4 max-w-2xl">
        Cycle price covers everything (filters + labor + margin). Invoices generated
        from a project show one bundled line — e.g. "Filter service — 4× 16x20, 22× 20x20" — at
        the cycle price. The filter mix is informational; nothing prevents you from
        editing the lines before sending.
      </p>
    </div>
  );
}
