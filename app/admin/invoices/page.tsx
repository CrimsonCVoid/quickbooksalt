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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="display text-3xl md:text-4xl">Invoices</h1>
          <p className="text-fm-muted text-sm">All invoices, newest first.</p>
        </div>
        <Link href="/admin/invoices/new" className="btn btn-primary self-start sm:self-auto">+ New invoice</Link>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4 -mx-1 px-1 overflow-x-auto">
        {STATUSES.map((s) => (
          <Link
            key={s.key}
            href={s.key ? `/admin/invoices?status=${s.key}` : "/admin/invoices"}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
              (params.status || "") === s.key ? "bg-fm-ink text-white" : "bg-white border border-fm-line text-fm-ink"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {!invoices || invoices.length === 0 ? (
        <div className="card text-center py-12 text-fm-muted">No invoices match.</div>
      ) : (
        <>
          {/* Mobile: card stack */}
          <ul className="md:hidden space-y-2">
            {invoices.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/admin/invoices/${inv.id}`}
                  className={`block rounded-xl border p-3 ${inv.status === "void" ? "border-red-200 bg-red-50/60" : "border-fm-line bg-white active:bg-fm-paper"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold truncate ${inv.status === "void" ? "line-through text-red-900/70" : ""}`}>
                        {inv.bill_to_company}
                      </p>
                      <p className="text-xs font-mono text-fm-muted truncate mt-0.5">{inv.invoice_number}</p>
                    </div>
                    <span className={`badge badge-${inv.status} shrink-0`}>{inv.status.replace("_", " ")}</span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between text-sm">
                    <span className="text-fm-muted">Due {formatDate(inv.due_date)}</span>
                    <span className={`font-semibold ${inv.status === "void" ? "line-through text-red-900/70" : ""}`}>
                      {formatMoney(Number(inv.balance_due))}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden md:block card p-0 overflow-hidden">
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
                {invoices.map((inv) => (
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
        </>
      )}
    </div>
  );
}
