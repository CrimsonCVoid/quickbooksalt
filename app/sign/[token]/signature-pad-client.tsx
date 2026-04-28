"use client";

import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";

export function SignaturePadClient({ token }: { token: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d")!.scale(ratio, ratio);
    padRef.current = new SignaturePad(canvas, { backgroundColor: "rgba(0,0,0,0)", penColor: "#1E1E1E" });
    return () => padRef.current?.off();
  }, []);

  function clear() { padRef.current?.clear(); }

  async function submit() {
    if (!padRef.current || padRef.current.isEmpty()) {
      setError("Please sign in the box first.");
      return;
    }
    if (!signerName.trim()) {
      setError("Please enter your name.");
      return;
    }
    setError(null);
    setSubmitting(true);

    const dataUrl = padRef.current.toDataURL("image/png");
    const res = await fetch(`/api/public/invoices/${token}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signature_png_data: dataUrl, signer_name: signerName, signer_title: signerTitle }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(json?.error || "Failed to submit."); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div className="card text-center py-10">
        <h2 className="display text-2xl mb-1">Thanks — signed ✓</h2>
        <p className="text-fm-muted text-sm">A confirmation copy has been emailed.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="display text-xl mb-3">Sign to approve</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="label">Your name *</label>
          <input value={signerName} onChange={(e) => setSignerName(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Title (optional)</label>
          <input value={signerTitle} onChange={(e) => setSignerTitle(e.target.value)} className="input" />
        </div>
      </div>

      <label className="label">Signature</label>
      <div className="rounded-lg border-2 border-fm-line bg-white">
        <canvas ref={canvasRef} className="w-full h-48 touch-none rounded-lg" />
      </div>
      <div className="mt-2 flex justify-between items-center">
        <button onClick={clear} className="text-sm text-fm-muted hover:text-fm-ink">Clear</button>
      </div>

      {error && <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-900">{error}</div>}

      <button
        onClick={submit}
        disabled={submitting}
        className="btn btn-primary w-full mt-4"
      >
        {submitting ? "Submitting…" : "Submit signature"}
      </button>

      <p className="text-xs text-fm-muted mt-3 text-center">
        By signing, you confirm review of the items above.
      </p>
    </div>
  );
}
