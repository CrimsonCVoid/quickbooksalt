"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { createInvoice } from "@/lib/actions/invoices";
import { formatMoney } from "@/lib/utils";
import { addDays, format } from "date-fns";

type Sku = { id: string; name: string; size: string | null; merv: number | null; unit_price: number };
type LocFilter = { quantity: number; unit_price_override: number | null; sku: Sku };
type Location = { id: string; label: string; archived: boolean; location_filters: LocFilter[] };
type ServicePlan = { id: string; labor_fee: number; labor_fee_label: string | null; active: boolean };
type Customer = {
  id: string;
  company_name: string;
  payment_terms_days: number;
  locations: Location[];
  service_plans?: ServicePlan[];
};

type Line = {
  description: string;
  quantity: number;
  unit_price: number;
  sku_id?: string | null;
  location_id?: string | null;
};

export function InvoiceComposer({
  customers,
  initialCustomerId,
  autofill = false,
}: {
  customers: Customer[];
  initialCustomerId?: string;
  autofill?: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState(initialCustomerId || customers[0]?.id || "");
  const customer = customers.find((c) => c.id === customerId);
  const locs = useMemo(() => (customer?.locations || []).filter((l) => !l.archived), [customer]);
  const activePlan = customer?.service_plans?.find((p) => p.active);
  const cyclePrice = Number(activePlan?.labor_fee ?? 0);

  const [selectedLocs, setSelectedLocs] = useState<string[]>([]);
  const [lines, setLines] = useState<Line[]>([{ description: "", quantity: 1, unit_price: 0 }]);

  const [dueDate, setDueDate] = useState(() => format(addDays(new Date(), customer?.payment_terms_days ?? 15), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");

  // Project mode (cycle price > 0): bundle filter mix into one line at the cycle price.
  // Itemized mode (cycle price == 0): one line per filter at SKU price.
  function prefillFromLocations() {
    const targetLocs = selectedLocs.length ? locs.filter((l) => selectedLocs.includes(l.id)) : locs;

    if (cyclePrice > 0) {
      // Project mode
      const mix = targetLocs.flatMap((loc) =>
        (loc.location_filters || []).filter((lf) => lf.sku).map((lf) => `${lf.quantity}× ${lf.sku.name}`)
      );
      if (mix.length === 0 && targetLocs.length === 0) {
        setError("Pick a location first.");
        return;
      }
      const label = activePlan?.labor_fee_label || "Filter service";
      const description = mix.length ? `${label} — ${mix.join(", ")}` : label;
      setLines([{
        description,
        quantity: 1,
        unit_price: cyclePrice,
        location_id: targetLocs[0]?.id ?? null,
      }]);
      setError(null);
      return;
    }

    // Itemized mode
    const newLines: Line[] = [];
    for (const loc of targetLocs) {
      for (const lf of loc.location_filters || []) {
        const price = Number(lf.unit_price_override ?? lf.sku.unit_price ?? 0);
        newLines.push({
          sku_id: lf.sku.id,
          location_id: loc.id,
          description: `${lf.sku.name}${lf.sku.size ? ` (${lf.sku.size})` : ""} — ${loc.label}`,
          quantity: lf.quantity,
          unit_price: price,
        });
      }
    }
    if (newLines.length === 0) {
      setError("This customer has no filters or cycle price configured. Add filters under their location first.");
      return;
    }
    setLines(newLines);
    setError(null);
  }

  // Auto-prefill on mount when arriving from /admin/projects
  useEffect(() => {
    if (autofill && customer) prefillFromLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autofill, customerId]);

  function updateLine(idx: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }
  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }
  function addLine() {
    setLines((prev) => [...prev, { description: "", quantity: 1, unit_price: 0 }]);
  }

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Customer *</label>
            <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); setSelectedLocs([]); }} required className="input">
              <option value="">Select…</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Due date *</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required className="input" />
          </div>
        </div>

        {customer && (
          <div>
            <label className="label">Pre-fill from locations</label>
            {locs.length === 0 ? (
              <p className="text-sm text-fm-muted">No locations configured for this customer.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {locs.map((l) => (
                  <label key={l.id} className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${selectedLocs.includes(l.id) ? "border-fm-ink bg-fm-yellow" : "border-fm-line bg-white"}`}>
                    <input type="checkbox" className="mr-2" checked={selectedLocs.includes(l.id)} onChange={(e) => setSelectedLocs((prev) => e.target.checked ? [...prev, l.id] : prev.filter((x) => x !== l.id))} />
                    {l.label}
                    <span className="text-xs text-fm-muted ml-1">({l.location_filters?.length || 0})</span>
                  </label>
                ))}
                <button type="button" onClick={prefillFromLocations} className="btn btn-secondary text-sm">
                  Pre-fill lines{selectedLocs.length ? ` (${selectedLocs.length} selected)` : " (all)"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="display text-xl">Line items</h2>
          <button type="button" onClick={addLine} className="btn btn-secondary text-sm">+ Add line</button>
        </div>

        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <input
                value={l.description}
                onChange={(e) => updateLine(i, { description: e.target.value })}
                placeholder="Description"
                className="input col-span-6"
              />
              <input
                type="number"
                step="0.01"
                min={0}
                value={l.quantity}
                onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                placeholder="Qty"
                className="input col-span-1 text-right"
              />
              <input
                type="number"
                step="0.01"
                min={0}
                value={l.unit_price}
                onChange={(e) => updateLine(i, { unit_price: Number(e.target.value) })}
                placeholder="Unit"
                className="input col-span-2 text-right"
              />
              <div className="col-span-2 text-right pt-2 font-semibold">{formatMoney(l.quantity * l.unit_price)}</div>
              <button type="button" onClick={() => removeLine(i)} className="col-span-1 text-fm-muted hover:text-red-700 text-sm">✕</button>
            </div>
          ))}
        </div>

        <div className="border-t border-fm-line mt-4 pt-4 flex justify-end">
          <div className="text-right">
            <p className="text-sm text-fm-muted">Total</p>
            <p className="display text-3xl">{formatMoney(subtotal)}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <label className="label">Notes (shown on invoice)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="input" />
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-900">{error}</div>}

      <div className="flex justify-end gap-3">
        <button
          disabled={pending || !customerId}
          className="btn btn-primary"
          onClick={() => start(async () => {
            setError(null);
            const cleanLines = lines.filter((l) => l.description.trim() && l.quantity > 0);
            if (cleanLines.length === 0) { setError("Add at least one line item."); return; }
            const res = await createInvoice({
              customer_id: customerId,
              location_ids: selectedLocs,
              due_date: dueDate,
              notes,
              lines: cleanLines,
            });
            if (res?.error) setError(res.error);
          })}
        >
          {pending ? "Creating…" : "Create draft invoice"}
        </button>
      </div>
    </div>
  );
}
