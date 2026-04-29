import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatDate } from "@/lib/utils";
import { InvoiceActions } from "@/components/invoice-actions";
import { PaymentRecorder } from "@/components/payment-recorder";

export default async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: invoice }, { data: lines }, { data: payments }, { data: signature }, { data: emails }] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", id).single(),
    supabase.from("invoice_line_items").select("*").eq("invoice_id", id).order("sort_order"),
    supabase.from("payments").select("*").eq("invoice_id", id).order("paid_at", { ascending: false }),
    supabase.from("signatures").select("*").eq("invoice_id", id).order("signed_at", { ascending: false }).maybeSingle(),
    supabase.from("email_log").select("*").eq("invoice_id", id).order("sent_at", { ascending: false }).limit(5),
  ]);

  if (!invoice) notFound();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const signUrl = `${baseUrl}/sign/${invoice.public_token}`;
  const payUrl = `${baseUrl}/pay/${invoice.public_token}`;

  return (
    <div>
      <Link href="/admin/invoices" className="text-sm text-fm-muted hover:text-fm-ink">← Invoices</Link>

      <div className="flex items-start justify-between mt-2 mb-6">
        <div>
          <p className="text-fm-muted text-xs uppercase tracking-wider">Invoice</p>
          <h1 className="display text-4xl">{invoice.invoice_number}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`badge badge-${invoice.status}`}>{invoice.status.replace("_", " ")}</span>
            <span className="text-sm text-fm-muted">Issued {formatDate(invoice.issue_date)} • Due {formatDate(invoice.due_date)}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-fm-muted text-xs uppercase tracking-wider">Balance due</p>
          <p className="display text-3xl">{formatMoney(Number(invoice.balance_due))}</p>
          <p className="text-xs text-fm-muted">of {formatMoney(Number(invoice.total))} total</p>
        </div>
      </div>

      {invoice.status === "void" && (
        <div className="mb-4 rounded-lg border-2 border-red-300 bg-red-50 p-4 flex items-center gap-3">
          <span className="display text-2xl text-red-700">⊘</span>
          <div className="flex-1">
            <p className="font-bold text-red-900">This invoice has been voided</p>
            <p className="text-sm text-red-800">It's preserved here for records. Use "Delete permanently" below to remove it from the database — line items, payments, and signatures attached to it will cascade away.</p>
          </div>
        </div>
      )}

      <InvoiceActions invoice={invoice as any} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <section className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-fm-muted">Bill to</p>
                <p className="font-semibold">{invoice.bill_to_company}</p>
                {invoice.bill_to_contact && <p>{invoice.bill_to_contact}</p>}
                {invoice.bill_to_email && <p className="text-fm-muted">{invoice.bill_to_email}</p>}
                {invoice.bill_to_address && (
                  <p className="text-fm-muted whitespace-pre-line mt-1">{invoice.bill_to_address}</p>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-fm-muted">Terms</p>
                <p>{invoice.payment_terms || "—"}</p>
                <p className="text-xs uppercase tracking-wider text-fm-muted mt-3">Public sign link</p>
                <a className="text-xs underline break-all" href={signUrl}>{signUrl}</a>
              </div>
            </div>

            <table className="w-full text-sm mt-4 border-t border-fm-line">
              <thead className="text-left text-xs uppercase tracking-wider text-fm-muted">
                <tr><th className="py-2">Description</th><th className="text-right">Qty</th><th className="text-right">Unit</th><th className="text-right">Total</th></tr>
              </thead>
              <tbody className="divide-y divide-fm-line">
                {(lines ?? []).map((l) => (
                  <tr key={l.id}>
                    <td className="py-2">{l.description}</td>
                    <td className="text-right">{l.quantity}</td>
                    <td className="text-right">{formatMoney(Number(l.unit_price))}</td>
                    <td className="text-right font-medium">{formatMoney(Number(l.line_total))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-fm-ink/30"><td colSpan={3} className="py-2 text-right font-semibold">Subtotal</td><td className="text-right font-semibold">{formatMoney(Number(invoice.subtotal))}</td></tr>
                <tr><td colSpan={3} className="text-right font-semibold">Tax</td><td className="text-right">{formatMoney(Number(invoice.tax))}</td></tr>
                <tr><td colSpan={3} className="py-2 text-right display text-lg">Total</td><td className="text-right display text-lg">{formatMoney(Number(invoice.total))}</td></tr>
                <tr><td colSpan={3} className="text-right text-fm-muted">Amount paid</td><td className="text-right">{formatMoney(Number(invoice.amount_paid))}</td></tr>
                <tr className="bg-fm-yellow/30"><td colSpan={3} className="py-2 text-right font-bold">Balance due</td><td className="text-right font-bold">{formatMoney(Number(invoice.balance_due))}</td></tr>
              </tfoot>
            </table>

            {invoice.notes && (
              <div className="mt-4 pt-4 border-t border-fm-line text-sm">
                <p className="text-xs uppercase tracking-wider text-fm-muted mb-1">Notes</p>
                <p className="whitespace-pre-line">{invoice.notes}</p>
              </div>
            )}
          </div>

          {signature && (
            <div className="card">
              <h2 className="display text-xl mb-3">Signed</h2>
              <p className="text-sm">By {signature.signer_name || "—"} on {formatDate(signature.signed_at)}</p>
              <p className="text-xs text-fm-muted">IP {signature.ip_address || "—"}</p>
              {/* signature image accessed via signed URL on demand */}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <PaymentRecorder invoiceId={invoice.id} balanceDue={Number(invoice.balance_due)} payments={payments ?? []} />

          <div className="card">
            <h2 className="display text-xl mb-3">Email log</h2>
            {(!emails || emails.length === 0) ? (
              <p className="text-sm text-fm-muted">No emails sent yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {emails.map((e) => (
                  <li key={e.id} className="flex justify-between gap-3">
                    <span className="capitalize text-fm-muted">{e.kind.replace(/_/g, " ")}</span>
                    <span className="text-xs text-fm-muted">{formatDate(e.sent_at)}</span>
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
