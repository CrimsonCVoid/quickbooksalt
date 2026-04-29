import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";

/**
 * Sales-tax collection projection. For every active service plan, projects
 * forward 12 months: number of cycles per year × labor_fee × customer.tax_rate.
 *
 * NOTE: this is a *projection*, not actuals. Once invoices are generated and
 * paid, build a separate "collected" view from the invoices table.
 */

const DAY_MS = 86_400_000;

function cyclesPerYear(intervalDays: number) {
  return 365 / intervalDays;
}

export default async function TaxProjectionPage() {
  const supabase = await createClient();

  // Pull every active service plan with its customer's tax_rate + city/state.
  const { data: plans } = await supabase
    .from("service_plans")
    .select(`
      id, name, frequency, custom_interval_days, labor_fee, active,
      customer:customers (
        id, company_name, tax_rate, billing_city, billing_state, archived
      )
    `)
    .eq("active", true);

  const rows: {
    customer: string;
    customerId: string;
    city: string;
    state: string;
    rate: number;
    cycle: number;
    interval: number;
    cyclesYr: number;
    annualRevenue: number;
    annualTax: number;
  }[] = [];

  for (const p of plans ?? []) {
    const c = (p as any).customer;
    if (!c || c.archived) continue;
    const interval =
      p.frequency === "monthly" ? 30 :
      p.frequency === "quarterly" ? 90 :
      p.frequency === "semiannual" ? 182 :
      p.frequency === "annual" ? 365 :
      p.custom_interval_days || 30;
    const cyc = cyclesPerYear(interval);
    const cycleRev = Number(p.labor_fee || 0);
    const annualRevenue = cycleRev * cyc;
    const annualTax = annualRevenue * Number(c.tax_rate || 0);
    rows.push({
      customer: c.company_name,
      customerId: c.id,
      city: c.billing_city || "—",
      state: c.billing_state || "—",
      rate: Number(c.tax_rate || 0),
      cycle: cycleRev,
      interval,
      cyclesYr: cyc,
      annualRevenue,
      annualTax,
    });
  }

  rows.sort((a, b) => b.annualTax - a.annualTax);

  const totalAnnualRevenue = rows.reduce((s, r) => s + r.annualRevenue, 0);
  const totalAnnualTax = rows.reduce((s, r) => s + r.annualTax, 0);

  // Aggregate by jurisdiction (state — NC vs GA — for filing buckets)
  const byState = new Map<string, { revenue: number; tax: number; count: number }>();
  for (const r of rows) {
    const k = r.state || "—";
    const cur = byState.get(k) ?? { revenue: 0, tax: 0, count: 0 };
    cur.revenue += r.annualRevenue;
    cur.tax += r.annualTax;
    cur.count += 1;
    byState.set(k, cur);
  }

  // Customers with no rate set
  const { data: missing } = await supabase
    .from("customers")
    .select("id, company_name, billing_city, billing_state")
    .eq("archived", false)
    .eq("tax_rate", 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="display text-4xl">Tax projection</h1>
        <p className="text-fm-muted">
          Projected annual sales-tax collection from active recurring service plans.
          Per-invoice clients (no recurring plan) aren't included — they'll show up
          in actuals once invoiced.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Stat label="Annual revenue (recurring)" value={formatMoney(totalAnnualRevenue)} />
        <Stat label="Annual sales tax to remit" value={formatMoney(totalAnnualTax)} accent />
        <Stat label="Avg quarterly tax" value={formatMoney(totalAnnualTax / 4)} />
      </div>

      <div className="card mb-6">
        <h2 className="display text-xl mb-3">By state</h2>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-fm-muted text-left">
            <tr><th className="py-2">State</th><th>Customers</th><th className="text-right">Annual revenue</th><th className="text-right">Annual tax</th><th className="text-right">Quarterly</th><th className="text-right">Monthly</th></tr>
          </thead>
          <tbody className="divide-y divide-fm-line">
            {Array.from(byState.entries()).sort((a, b) => b[1].tax - a[1].tax).map(([state, agg]) => (
              <tr key={state}>
                <td className="py-2 font-semibold">{state}</td>
                <td>{agg.count}</td>
                <td className="text-right">{formatMoney(agg.revenue)}</td>
                <td className="text-right font-semibold">{formatMoney(agg.tax)}</td>
                <td className="text-right text-fm-muted">{formatMoney(agg.tax / 4)}</td>
                <td className="text-right text-fm-muted">{formatMoney(agg.tax / 12)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {missing && missing.length > 0 && (
        <div className="card mb-6 border-fm-warn bg-fm-yellow/10">
          <h2 className="display text-xl mb-2">⚠ Customers with 0% tax rate</h2>
          <p className="text-sm text-fm-muted mb-3">
            Either tax-exempt (with E-595E on file) or jurisdiction not yet set. Verify each.
          </p>
          <ul className="space-y-1 text-sm">
            {missing.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/customers/${c.id}`} className="hover:underline font-medium">
                  {c.company_name}
                </Link>
                <span className="text-fm-muted"> — {[c.billing_city, c.billing_state].filter(Boolean).join(", ") || "no location"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h2 className="display text-xl mb-3">By customer (highest tax first)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-fm-muted text-left">
              <tr>
                <th className="py-2">Customer</th>
                <th>Location</th>
                <th className="text-right">Cycle</th>
                <th className="text-right">/yr</th>
                <th className="text-right">Annual rev</th>
                <th className="text-right">Rate</th>
                <th className="text-right">Annual tax</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fm-line">
              {rows.map((r) => (
                <tr key={r.customerId}>
                  <td className="py-2"><Link href={`/admin/customers/${r.customerId}`} className="font-medium hover:underline">{r.customer}</Link></td>
                  <td className="text-fm-muted">{[r.city, r.state].filter(s => s !== "—").join(", ") || "—"}</td>
                  <td className="text-right">{formatMoney(r.cycle)}</td>
                  <td className="text-right text-fm-muted">{r.cyclesYr.toFixed(1)}</td>
                  <td className="text-right">{formatMoney(r.annualRevenue)}</td>
                  <td className="text-right">{(r.rate * 100).toFixed(3).replace(/\.?0+$/, "")}%</td>
                  <td className="text-right font-semibold">{formatMoney(r.annualTax)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-fm-yellow/30">
              <tr>
                <td colSpan={4} className="py-2 font-bold">Total</td>
                <td className="text-right font-bold">{formatMoney(totalAnnualRevenue)}</td>
                <td></td>
                <td className="text-right font-bold">{formatMoney(totalAnnualTax)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="text-xs text-fm-muted mt-4">
          Tax base = full invoice (filters + labor) per NC G.S. 105-164.4(a)(16).
          NC sources to destination, so each customer's rate reflects the county
          where service is performed.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`card ${accent ? "bg-fm-yellow/30" : ""}`}>
      <p className="text-xs uppercase tracking-wider text-fm-muted">{label}</p>
      <p className="display text-3xl mt-1">{value}</p>
    </div>
  );
}
