import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatDate } from "@/lib/utils";

export default async function PlansPage() {
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("service_plans")
    .select("*, customer:customers(id, company_name)")
    .order("next_due_date");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="display text-4xl">Service plans</h1>
          <p className="text-fm-muted">Recurring schedules. Drafts auto-generate ahead of due date.</p>
        </div>
        <Link href="/admin/plans/new" className="btn btn-primary">+ New plan</Link>
      </div>

      {!plans || plans.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-fm-muted mb-4">No plans yet.</p>
          <Link href="/admin/plans/new" className="btn btn-primary">Create a service plan</Link>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-fm-muted bg-fm-paper">
              <tr>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Plan</th>
                <th className="px-6 py-3">Frequency</th>
                <th className="px-6 py-3">Next due</th>
                <th className="px-6 py-3 text-right">Labor fee</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fm-line">
              {plans.map((p: any) => (
                <tr key={p.id} className="hover:bg-fm-paper/50">
                  <td className="px-6 py-3">
                    <Link href={`/admin/customers/${p.customer.id}`} className="font-medium hover:underline">
                      {p.customer.company_name}
                    </Link>
                  </td>
                  <td className="px-6 py-3">
                    <Link href={`/admin/plans/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                  </td>
                  <td className="px-6 py-3 capitalize">{p.frequency.replace("_", " ")}{p.frequency === "custom_days" && ` (${p.custom_interval_days}d)`}</td>
                  <td className="px-6 py-3">{formatDate(p.next_due_date)}</td>
                  <td className="px-6 py-3 text-right">{p.labor_fee > 0 ? formatMoney(p.labor_fee) : "—"}</td>
                  <td className="px-6 py-3">{p.active ? <span className="badge badge-paid">Active</span> : <span className="badge badge-void">Paused</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
