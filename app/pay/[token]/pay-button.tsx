"use client";

import { useState } from "react";

export function PayButton({ token, amountLabel }: { token: string; amountLabel: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/public/invoices/${token}/checkout`, { method: "POST" });
    const json = await res.json();
    setLoading(false);
    if (!res.ok || !json.url) { setError(json?.error || "Could not start checkout."); return; }
    window.location.href = json.url;
  }

  return (
    <div>
      <button onClick={go} disabled={loading} className="btn btn-primary w-full text-base">
        {loading ? "Loading…" : `Pay ${amountLabel} online`}
      </button>
      {error && <div className="mt-2 text-sm text-red-700 text-center">{error}</div>}
    </div>
  );
}
