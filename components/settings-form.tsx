"use client";

import { useState, useTransition } from "react";
import { saveSettings, uploadLogo } from "@/lib/actions/settings";
import Image from "next/image";

type Initial = {
  business_name: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  email_signature: string;
  pdf_accent_color: string;
  default_terms_days: number;
  invoice_number_prefix: string;
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
            invoice_number_prefix: String(fd.get("invoice_number_prefix") || "FM"),
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
            <input name="resend_from_email" defaultValue={initial.resend_from_email} placeholder="billing@filtermonkey.com" className="input" />
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

        <div>
          <label className="label">Check payment instructions</label>
          <textarea name="check_instructions" defaultValue={initial.check_instructions} rows={4} className="input font-mono text-xs" />
          <p className="text-xs text-fm-muted mt-1">Shown on every invoice PDF + email. This is the primary payment path.</p>
        </div>

        {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-900">{error}</div>}
        {msg && <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-900">{msg}</div>}

        <button disabled={pending} className="btn btn-primary">{pending ? "Saving…" : "Save settings"}</button>
      </form>

      <form
        className="card space-y-3"
        action={(fd) => start(async () => {
          setMsg(null); setError(null);
          const res = await uploadLogo(fd);
          if (res?.error) setError(res.error);
          else { setLogoUrl(res?.url ?? null); setMsg("Logo updated ✓"); }
        })}
      >
        <h2 className="display text-2xl">Logo</h2>
        {logoUrl && (
          <div className="rounded-lg border border-fm-line p-4 bg-fm-paper inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Logo" style={{ maxHeight: 80 }} />
          </div>
        )}
        <input type="file" name="logo" accept="image/png,image/jpeg,image/svg+xml" className="block text-sm" />
        <button disabled={pending} className="btn btn-secondary">{pending ? "Uploading…" : "Upload logo"}</button>
      </form>
    </div>
  );
}
