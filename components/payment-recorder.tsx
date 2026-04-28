"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordPayment, deletePayment } from "@/lib/actions/invoices";
import { formatMoney, formatDate } from "@/lib/utils";

type Payment = {
  id: string;
  amount: number;
  method: string;
  paid_at: string;
  check_number: string | null;
  deposit_date: string | null;
  notes: string | null;
};

export function PaymentRecorder({
  invoiceId,
  balanceDue,
  payments,
}: {
  invoiceId: string;
  balanceDue: number;
  payments: Payment[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<"check" | "cash" | "ach" | "stripe" | "other">("check");

  return (
    <div className="card">
      <h2 className="display text-xl mb-3">Payments</h2>

      {payments.length > 0 && (
        <ul className="space-y-2 text-sm mb-4">
          {payments.map((p) => (
            <li key={p.id} className="flex items-start justify-between border-b border-fm-line pb-2">
              <div>
                <div className="font-semibold">{formatMoney(Number(p.amount))} <span className="text-xs text-fm-muted font-normal capitalize ml-1">{p.method}</span></div>
                <div className="text-xs text-fm-muted">{formatDate(p.paid_at)}{p.check_number && ` • Check #${p.check_number}`}</div>
                {p.notes && <div className="text-xs text-fm-muted mt-0.5">{p.notes}</div>}
              </div>
              <button
                onClick={() => { if (confirm("Delete this payment?")) start(async () => { await deletePayment(p.id); router.refresh(); }); }}
                className="text-xs text-red-700 hover:underline"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {!open ? (
        <button onClick={() => setOpen(true)} className="btn btn-primary w-full" disabled={balanceDue <= 0}>
          {balanceDue <= 0 ? "Paid in full" : "+ Record payment"}
        </button>
      ) : (
        <form
          className="space-y-3"
          action={(fd) => start(async () => {
            setError(null);
            const r = await recordPayment({
              invoice_id: invoiceId,
              amount: Number(fd.get("amount") || 0),
              method,
              paid_at: String(fd.get("paid_at") || ""),
              check_number: String(fd.get("check_number") || ""),
              deposit_date: String(fd.get("deposit_date") || ""),
              notes: String(fd.get("notes") || ""),
            });
            if (r?.error) setError(r.error);
            else { setOpen(false); router.refresh(); }
          })}
        >
          <div>
            <label className="label">Method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value as any)} className="input">
              <option value="check">Check</option>
              <option value="cash">Cash</option>
              <option value="ach">ACH</option>
              <option value="stripe">Stripe</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Amount</label>
              <input name="amount" type="number" step="0.01" min="0.01" defaultValue={balanceDue.toFixed(2)} required className="input" />
            </div>
            <div>
              <label className="label">Paid on</label>
              <input name="paid_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="input" />
            </div>
          </div>
          {method === "check" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Check #</label>
                <input name="check_number" className="input" />
              </div>
              <div>
                <label className="label">Deposit date</label>
                <input name="deposit_date" type="date" className="input" />
              </div>
            </div>
          )}
          <div>
            <label className="label">Notes</label>
            <input name="notes" className="input" />
          </div>
          {error && <div className="text-sm text-red-700">{error}</div>}
          <div className="flex gap-2">
            <button disabled={pending} className="btn btn-primary flex-1">{pending ? "Saving…" : "Save"}</button>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
