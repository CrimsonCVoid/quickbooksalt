"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { sendInvoice, voidInvoice, approveAndSendInvoice } from "@/lib/actions/invoices";

export function InvoiceActions({ invoice }: { invoice: any }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const isPending = invoice.status === "pending_approval";
  const canSend = invoice.status === "draft" || invoice.status === "sent";
  const canVoid = invoice.status !== "void" && invoice.status !== "paid";

  return (
    <div className="card flex flex-wrap items-center gap-3">
      {isPending && (
        <button
          disabled={pending}
          onClick={() => start(async () => {
            const r = await approveAndSendInvoice(invoice.id);
            if (r?.error) setMsg(r.error); else { setMsg("Sent ✓"); router.refresh(); }
          })}
          className="btn btn-primary"
        >
          {pending ? "Sending…" : "Approve & send"}
        </button>
      )}
      {canSend && (
        <button
          disabled={pending}
          onClick={() => start(async () => {
            const r = await sendInvoice(invoice.id);
            if (r?.error) setMsg(r.error); else { setMsg("Email sent ✓"); router.refresh(); }
          })}
          className="btn btn-primary"
        >
          {pending ? "Sending…" : invoice.sent_at ? "Resend email" : "Send invoice"}
        </button>
      )}
      <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener" className="btn btn-secondary">
        View PDF
      </a>
      <a href={`/sign/${invoice.public_token}`} target="_blank" rel="noopener" className="btn btn-ghost">
        Open public sign link →
      </a>
      {canVoid && (
        <button
          disabled={pending}
          onClick={() => { if (!confirm("Void this invoice?")) return; start(async () => { await voidInvoice(invoice.id); router.refresh(); }); }}
          className="btn btn-ghost text-red-700 ml-auto"
        >
          Void
        </button>
      )}
      {msg && <p className="text-sm text-fm-muted">{msg}</p>}
    </div>
  );
}
