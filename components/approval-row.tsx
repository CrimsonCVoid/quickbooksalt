"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveAndSendInvoice } from "@/lib/actions/invoices";
import { formatMoney, formatDate } from "@/lib/utils";

export function ApprovalRow({ invoice }: { invoice: { id: string; invoice_number: string; total: number; due_date: string; bill_to_company: string; bill_to_email: string | null } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="card flex items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/invoices/${invoice.id}`} className="font-semibold hover:underline">{invoice.bill_to_company}</Link>
          <span className="text-xs text-fm-muted font-mono">{invoice.invoice_number}</span>
        </div>
        <div className="text-sm text-fm-muted">
          Due {formatDate(invoice.due_date)} · {formatMoney(Number(invoice.total))} · {invoice.bill_to_email || "no email on file"}
        </div>
        {msg && <div className="text-xs mt-1 text-green-700">{msg}</div>}
      </div>
      <div className="flex gap-2">
        <Link href={`/admin/invoices/${invoice.id}`} className="btn btn-secondary text-sm">Review</Link>
        <button
          disabled={pending || !invoice.bill_to_email}
          onClick={() => start(async () => {
            const r = await approveAndSendInvoice(invoice.id);
            if (r?.error) setMsg(r.error);
            else { setMsg("Sent ✓"); router.refresh(); }
          })}
          className="btn btn-primary text-sm"
          title={invoice.bill_to_email ? undefined : "No customer email; add one before sending"}
        >
          {pending ? "Sending…" : "Approve & send"}
        </button>
      </div>
    </div>
  );
}
