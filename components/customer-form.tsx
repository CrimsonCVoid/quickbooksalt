"use client";

import { useState, useTransition } from "react";
import { saveCustomer, type CustomerInput } from "@/lib/actions/customers";

type Customer = Partial<CustomerInput> & { id?: string };

export function CustomerForm({ customer }: { customer?: Customer }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(fd) =>
        start(async () => {
          setError(null);
          const input = {
            id: customer?.id,
            company_name: String(fd.get("company_name") || ""),
            contact_name: String(fd.get("contact_name") || ""),
            email: String(fd.get("email") || ""),
            phone: String(fd.get("phone") || ""),
            billing_line1: String(fd.get("billing_line1") || ""),
            billing_line2: String(fd.get("billing_line2") || ""),
            billing_city: String(fd.get("billing_city") || ""),
            billing_state: String(fd.get("billing_state") || ""),
            billing_postal: String(fd.get("billing_postal") || ""),
            payment_terms_days: Number(fd.get("payment_terms_days") || 15),
            default_payment_method: String(fd.get("default_payment_method") || "check") as "check" | "stripe" | "cash" | "ach" | "other",
            notes: String(fd.get("notes") || ""),
          };
          const res = await saveCustomer(input);
          if (res?.error) setError(res.error);
        })
      }
      className="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Company name *</label>
          <input name="company_name" defaultValue={customer?.company_name || ""} required className="input" />
        </div>
        <div>
          <label className="label">Contact name</label>
          <input name="contact_name" defaultValue={customer?.contact_name || ""} className="input" />
        </div>
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" defaultValue={customer?.email || ""} className="input" />
        </div>
        <div>
          <label className="label">Phone</label>
          <input name="phone" defaultValue={customer?.phone || ""} className="input" />
        </div>
      </div>

      <div>
        <label className="label">Billing address</label>
        <div className="space-y-2">
          <input name="billing_line1" placeholder="Street" defaultValue={customer?.billing_line1 || ""} className="input" />
          <input name="billing_line2" placeholder="Apt / Suite (optional)" defaultValue={customer?.billing_line2 || ""} className="input" />
          <div className="grid grid-cols-3 gap-2">
            <input name="billing_city" placeholder="City" defaultValue={customer?.billing_city || ""} className="input" />
            <input name="billing_state" placeholder="State" defaultValue={customer?.billing_state || ""} className="input" />
            <input name="billing_postal" placeholder="ZIP" defaultValue={customer?.billing_postal || ""} className="input" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Payment terms (Net days)</label>
          <input name="payment_terms_days" type="number" min={0} max={365} defaultValue={customer?.payment_terms_days ?? 15} className="input" />
        </div>
        <div>
          <label className="label">Default payment method</label>
          <select name="default_payment_method" defaultValue={customer?.default_payment_method || "check"} className="input">
            <option value="check">Check</option>
            <option value="stripe">Stripe (online)</option>
            <option value="cash">Cash</option>
            <option value="ach">ACH</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">Internal notes</label>
        <textarea name="notes" defaultValue={customer?.notes || ""} rows={3} className="input" />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-900">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Saving…" : customer?.id ? "Save changes" : "Create customer"}
        </button>
      </div>
    </form>
  );
}
