import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatMoney } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: invoices }, { data: customers }, { count: pendingCount }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, status, total, amount_paid, balance_due, due_date, bill_to_company")
      .order("issue_date", { ascending: false })
      .limit(8),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_approval"),
  ]);

  const all = invoices ?? [];
  const outstanding = all
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + Number(i.balance_due ?? 0), 0);
  const paidThisBatch = all
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + Number(i.amount_paid ?? 0), 0);

  return (
    <div>
      <h1 className="display text-4xl mb-1">Dashboard</h1>
      <p className="text-fm-muted mb-8">Quick overview. Full reports under each section.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Stat label="Outstanding" value={formatMoney(outstanding)} hint="from recent invoices" />
        <Stat label="Pending approval" value={String(pendingCount ?? 0)} hint="awaiting your sign-off" cta={{ href: "/admin/approvals", label: "Review →" }} />
        <Stat label="Recent collected" value={formatMoney(paidThisBatch)} hint="latest 8 invoices" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="display text-xl">Recent invoices</h2>
          <Link href="/admin/invoices/new" className="btn btn-primary text-sm">+ New invoice</Link>
        </div>
        {all.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-fm-muted">
              <tr><th className="py-2">Customer</th><th>Status</th><th>Due</th><th className="text-right">Total</th><th className="text-right">Balance</th></tr>
            </thead>
            <tbody className="divide-y divide-fm-line">
              {all.map((inv) => (
                <tr key={inv.id}>
                  <td className="py-3"><Link href={`/admin/invoices/${inv.id}`} className="font-medium hover:underline">{inv.bill_to_company}</Link></td>
                  <td><span className={`badge badge-${inv.status}`}>{inv.status}</span></td>
                  <td>{inv.due_date}</td>
                  <td className="text-right">{formatMoney(Number(inv.total))}</td>
                  <td className="text-right font-semibold">{formatMoney(Number(inv.balance_due))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, hint, cta }: { label: string; value: string; hint?: string; cta?: { href: string; label: string } }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wider text-fm-muted">{label}</p>
      <p className="display text-3xl mt-1">{value}</p>
      {hint && <p className="text-xs text-fm-muted mt-1">{hint}</p>}
      {cta && <Link href={cta.href} className="text-sm font-semibold text-fm-ink hover:underline mt-3 inline-block">{cta.label}</Link>}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-10">
      <p className="text-fm-muted mb-4">No invoices yet.</p>
      <Link href="/admin/customers/new" className="btn btn-primary">Add your first customer</Link>
    </div>
  );
}
