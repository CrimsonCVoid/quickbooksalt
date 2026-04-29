import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatDate } from "@/lib/utils";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  let q = supabase
    .from("invoices")
    .select("id, invoice_number, status, total, amount_paid, balance_due, issue_date, due_date, bill_to_company")
    .order("issue_date", { ascending: false })
    .limit(200);

  if (params.status) q = q.eq("status", params.status);
  const { data: invoices } = await q;

  const STATUSES = [
    { key: "", label: "All" },
    { key: "pending_approval", label: "Pending" },
    { key: "draft", label: "Drafts" },
    { key: "sent", label: "Sent" },
    { key: "paid", label: "Paid" },
    { key: "overdue", label: "Overdue" },
    { key: "void", label: "Void" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="display text-4xl">Invoices</h1>
          <p className="text-fm-muted">All invoices, newest first.</p>
        </div>
        <Link href="/admin/invoices/new" className="btn btn-primary">+ New invoice</Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUSES.map((s) => (
          <Link
            key={s.key}
            href={s.key ? `/admin/invoices?status=${s.key}` : "/admin/invoices"}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              (params.status || "") === s.key ? "bg-fm-ink text-white" : "bg-white border border-fm-line text-fm-ink"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-fm-muted bg-fm-paper">
            <tr>
              <th className="px-6 py-3">Invoice #</th>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Issued</th>
              <th className="px-6 py-3">Due</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Total</th>
              <th className="px-6 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-fm-line">
            {!invoices || invoices.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-fm-muted">No invoices match.</td></tr>
            ) : invoices.map((inv) => (
              <tr key={inv.id} className={inv.status === "void" ? "row-void" : "hover:bg-fm-paper/50"}>
                <td className="px-6 py-3 font-mono text-xs"><Link href={`/admin/invoices/${inv.id}`} className="hover:underline">{inv.invoice_number}</Link></td>
                <td className="px-6 py-3 font-medium">{inv.bill_to_company}</td>
                <td className="px-6 py-3 text-fm-muted">{formatDate(inv.issue_date)}</td>
                <td className="px-6 py-3">{formatDate(inv.due_date)}</td>
                <td className="px-6 py-3"><span className={`badge badge-${inv.status}`}>{inv.status.replace("_", " ")}</span></td>
                <td className="px-6 py-3 text-right">{formatMoney(Number(inv.total))}</td>
                <td className="px-6 py-3 text-right font-semibold">{formatMoney(Number(inv.balance_due))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
