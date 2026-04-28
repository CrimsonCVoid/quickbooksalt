"use client";

import { useState, useTransition } from "react";
import { saveSettings } from "@/lib/actions/settings";
import { LogoUploader } from "@/components/logo-uploader";

type Initial = {
  business_name: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  email_signature: string;
  pdf_accent_color: string;
  default_terms_days: number;
  invoice_number_prefix: string;
  check_pay_to: string;
  check_address_line1: string;
  check_address_line2: string;
  check_city: string;
  check_state: string;
  check_postal: string;
  check_memo_template: string;
  check_instructions: string;
  stripe_enabled: boolean;
  resend_from_email: string;
  logo_url: string | null;
};

export function SettingsForm({ initial }: { initial: Initial }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logo_url);

  return (
    <div className="space-y-6 max-w-3xl">
      <form
        className="card space-y-5"
        action={(fd) => start(async () => {
          setMsg(null); setError(null);
          const res = await saveSettings({
            business_name: String(fd.get("business_name") || ""),
            business_address: String(fd.get("business_address") || ""),
            business_phone: String(fd.get("business_phone") || ""),
            business_email: String(fd.get("business_email") || ""),
            email_signature: String(fd.get("email_signature") || ""),
            pdf_accent_color: String(fd.get("pdf_accent_color") || ""),
            default_terms_days: Number(fd.get("default_terms_days") || 15),
            invoice_number_prefix: String(fd.get("invoice_number_prefix") || "CCH"),
            check_pay_to: String(fd.get("check_pay_to") || ""),
            check_address_line1: String(fd.get("check_address_line1") || ""),
            check_address_line2: String(fd.get("check_address_line2") || ""),
            check_city: String(fd.get("check_city") || ""),
            check_state: String(fd.get("check_state") || ""),
            check_postal: String(fd.get("check_postal") || ""),
            check_memo_template: String(fd.get("check_memo_template") || ""),
            check_instructions: String(fd.get("check_instructions") || ""),
            stripe_enabled: fd.get("stripe_enabled") === "on",
            resend_from_email: String(fd.get("resend_from_email") || ""),
          });
          if (res?.error) setError(res.error); else setMsg("Saved ✓");
        })}
      >
        <h2 className="display text-2xl">Branding</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Business name</label>
            <input name="business_name" defaultValue={initial.business_name} className="input" />
          </div>
          <div>
            <label className="label">PDF accent color</label>
            <div className="flex gap-2">
              <input name="pdf_accent_color" defaultValue={initial.pdf_accent_color} className="input flex-1" />
              <div className="size-10 rounded-lg border border-fm-line" style={{ backgroundColor: initial.pdf_accent_color }} />
            </div>
          </div>
          <div>
            <label className="label">Business address</label>
            <textarea name="business_address" defaultValue={initial.business_address} rows={2} className="input" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input name="business_phone" defaultValue={initial.business_phone} className="input" />
            <label className="label mt-3">Email shown on invoices</label>
            <input name="business_email" defaultValue={initial.business_email} className="input" />
          </div>
        </div>

        <h2 className="display text-2xl mt-2">Email</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Resend "From" address</label>
            <input name="resend_from_email" defaultValue={initial.resend_from_email} placeholder="billing@carolinacomfort.info" className="input" />
            <p className="text-xs text-fm-muted mt-1">Must be a verified domain in your Resend dashboard.</p>
          </div>
          <div>
            <label className="label">Email signature</label>
            <textarea name="email_signature" defaultValue={initial.email_signature} rows={4} className="input" />
          </div>
        </div>

        <h2 className="display text-2xl mt-2">Invoice defaults</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Default Net (days)</label>
            <input name="default_terms_days" type="number" min={0} max={365} defaultValue={initial.default_terms_days} className="input" />
          </div>
          <div>
            <label className="label">Invoice number prefix</label>
            <input name="invoice_number_prefix" defaultValue={initial.invoice_number_prefix} className="input" />
            <p className="text-xs text-fm-muted mt-1">e.g. <code>FM-2026-0001</code></p>
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm text-fm-muted cursor-not-allowed">
              <input type="checkbox" disabled checked={false} />
              Online payments (Stripe) — disabled
            </label>
          </div>
        </div>

        <h2 className="display text-2xl mt-2">Check payment details</h2>
        <p className="text-xs text-fm-muted -mt-3">Shown prominently on the invoice PDF (right under the balance due) so the customer can write the check without hunting for the info.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Make checks payable to</label>
            <input name="check_pay_to" defaultValue={initial.check_pay_to} placeholder="Carolina Comfort HVAC" className="input" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Mail to — street address</label>
            <input name="check_address_line1" defaultValue={initial.check_address_line1} placeholder="123 Main Street" className="input" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Mail to — apt / suite (optional)</label>
            <input name="check_address_line2" defaultValue={initial.check_address_line2} placeholder="Suite 4B" className="input" />
          </div>
          <div>
            <label className="label">City</label>
            <input name="check_city" defaultValue={initial.check_city} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">State</label>
              <input name="check_state" defaultValue={initial.check_state} maxLength={2} className="input uppercase" />
            </div>
            <div>
              <label className="label">ZIP</label>
              <input name="check_postal" defaultValue={initial.check_postal} className="input" />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="label">Memo line on the check</label>
            <input name="check_memo_template" defaultValue={initial.check_memo_template} placeholder="Invoice {invoice_number}" className="input" />
            <p className="text-xs text-fm-muted mt-1">Use <code>{`{invoice_number}`}</code> as a placeholder — it'll be filled in per invoice.</p>
          </div>
          <div className="md:col-span-2">
            <label className="label">Additional instructions (optional)</label>
            <textarea name="check_instructions" defaultValue={initial.check_instructions} rows={2} className="input" placeholder="e.g. After-hours drop box at side door" />
          </div>
        </div>

        {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-900">{error}</div>}
        {msg && <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-900">{msg}</div>}

        <button disabled={pending} className="btn btn-primary">{pending ? "Saving…" : "Save settings"}</button>
      </form>

      <LogoUploader initialUrl={logoUrl} />
    </div>
  );
}
