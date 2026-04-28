"use client";

import { useState, useTransition, useMemo } from "react";
import { savePlan, deletePlan, togglePlanActive, type PlanInput } from "@/lib/actions/plans";
import { useRouter } from "next/navigation";

type Customer = { id: string; company_name: string; locations: { id: string; label: string; archived: boolean }[] };

export function PlanForm({
  customers,
  initial,
  initialCustomerId,
}: {
  customers: Customer[];
  initial?: PlanInput & { id: string };
  initialCustomerId?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string>(initial?.customer_id || initialCustomerId || customers[0]?.id || "");
  const [frequency, setFrequency] = useState<PlanInput["frequency"]>(initial?.frequency || "quarterly");
  const [selectedLocs, setSelectedLocs] = useState<string[]>(initial?.location_ids || []);

  const customer = customers.find((c) => c.id === customerId);
  const locs = useMemo(() => (customer?.locations || []).filter((l) => !l.archived), [customer]);

  return (
    <form
      className="card space-y-5 max-w-3xl"
      action={(fd) => start(async () => {
        setError(null);
        const res = await savePlan({
          id: initial?.id,
          customer_id: customerId,
          name: String(fd.get("name") || ""),
          frequency,
          custom_interval_days: frequency === "custom_days" ? Number(fd.get("custom_interval_days") || 30) : undefined,
          location_ids: selectedLocs,
          labor_fee: Number(fd.get("labor_fee") || 0),
          labor_fee_label: String(fd.get("labor_fee_label") || ""),
          lead_time_days: Number(fd.get("lead_time_days") || 7),
          next_due_date: String(fd.get("next_due_date") || ""),
          payment_terms_days: fd.get("payment_terms_days") ? Number(fd.get("payment_terms_days")) : undefined,
          active: fd.get("active") === "on",
          notes: String(fd.get("notes") || ""),
        });
        if (res?.error) setError(res.error);
        else router.push("/admin/plans");
      })}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Customer *</label>
          <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); setSelectedLocs([]); }} required className="input">
            <option value="">Select…</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Plan name *</label>
          <input name="name" defaultValue={initial?.name || "Quarterly filter service"} required className="input" />
        </div>
        <div>
          <label className="label">Frequency *</label>
          <select value={frequency} onChange={(e) => setFrequency(e.target.value as any)} className="input">
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="semiannual">Every 6 months</option>
            <option value="annual">Yearly</option>
            <option value="custom_days">Custom (days)</option>
          </select>
        </div>
        {frequency === "custom_days" && (
          <div>
            <label className="label">Interval (days)</label>
            <input name="custom_interval_days" type="number" min={1} defaultValue={initial?.custom_interval_days || 30} className="input" />
          </div>
        )}
        <div>
          <label className="label">Next due date *</label>
          <input name="next_due_date" type="date" defaultValue={initial?.next_due_date || ""} required className="input" />
        </div>
        <div>
          <label className="label">Lead time (days before due)</label>
          <input name="lead_time_days" type="number" min={0} max={60} defaultValue={initial?.lead_time_days ?? 7} className="input" />
        </div>
      </div>

      <div>
        <label className="label">Locations covered</label>
        <p className="text-xs text-fm-muted mb-2">Empty = all of customer's locations.</p>
        {locs.length === 0 ? (
          <p className="text-sm text-fm-muted">{customerId ? "This customer has no locations yet." : "Select a customer first."}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {locs.map((l) => (
              <label key={l.id} className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${selectedLocs.includes(l.id) ? "border-fm-ink bg-fm-yellow" : "border-fm-line bg-white"}`}>
                <input type="checkbox" className="mr-2" checked={selectedLocs.includes(l.id)} onChange={(e) => setSelectedLocs((prev) => e.target.checked ? [...prev, l.id] : prev.filter((x) => x !== l.id))} />
                {l.label}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="label">Labor / visit fee</label>
          <input name="labor_fee" type="number" step="0.01" min={0} defaultValue={initial?.labor_fee ?? 0} className="input" />
        </div>
        <div className="md:col-span-2">
          <label className="label">Labor line label</label>
          <input name="labor_fee_label" defaultValue={initial?.labor_fee_label || "Service visit"} className="input" />
        </div>
        <div>
          <label className="label">Override payment terms (days)</label>
          <input name="payment_terms_days" type="number" min={0} max={365} defaultValue={initial?.payment_terms_days ?? ""} placeholder="Use customer default" className="input" />
        </div>
        <div className="md:col-span-2 flex items-end">
          <label className="inline-flex items-center gap-2 text-sm">
            <input name="active" type="checkbox" defaultChecked={initial?.active ?? true} />
            Active (auto-generate drafts)
          </label>
        </div>
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea name="notes" rows={2} defaultValue={initial?.notes || ""} className="input" />
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-900">{error}</div>}

      <div className="flex items-center gap-3">
        <button disabled={pending} className="btn btn-primary">{pending ? "Saving…" : initial ? "Save changes" : "Create plan"}</button>
        {initial && (
          <>
            <button type="button" onClick={() => start(async () => { await togglePlanActive(initial.id, !initial.active); router.refresh(); })} className="btn btn-secondary">
              {initial.active ? "Pause" : "Activate"}
            </button>
            <button type="button" onClick={() => { if (confirm("Delete this plan?")) start(async () => { await deletePlan(initial.id); router.push("/admin/plans"); }); }} className="btn btn-ghost text-red-700">
              Delete
            </button>
          </>
        )}
      </div>
    </form>
  );
}
