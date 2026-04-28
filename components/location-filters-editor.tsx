"use client";

import { useState, useTransition } from "react";
import { saveLocationFilter, deleteLocationFilter } from "@/lib/actions/skus";
import { formatMoney } from "@/lib/utils";

type Sku = { id: string; name: string; size: string | null; merv: number | null; unit_price: number };
type LocationFilter = {
  id: string;
  sku_id: string;
  quantity: number;
  unit_price_override: number | null;
  notes: string | null;
  sku: Sku;
};

export function LocationFiltersEditor({
  locationId,
  skus,
  initial,
}: {
  locationId: string;
  skus: Sku[];
  initial: LocationFilter[];
}) {
  const [adding, setAdding] = useState(false);
  const total = initial.reduce((s, lf) => s + lf.quantity * Number(lf.unit_price_override ?? lf.sku.unit_price), 0);

  return (
    <div className="space-y-4">
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-fm-muted bg-fm-paper">
            <tr>
              <th className="px-6 py-3">Filter</th>
              <th className="px-6 py-3 text-right">Qty</th>
              <th className="px-6 py-3 text-right">Unit price</th>
              <th className="px-6 py-3 text-right">Line total</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-fm-line">
            {initial.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-fm-muted">No filters yet — add one below.</td></tr>
            ) : initial.map((lf) => {
              const price = Number(lf.unit_price_override ?? lf.sku.unit_price);
              return (
                <tr key={lf.id}>
                  <td className="px-6 py-3">
                    <div className="font-medium">{lf.sku.name}</div>
                    <div className="text-xs text-fm-muted">{[lf.sku.size, lf.sku.merv && `MERV ${lf.sku.merv}`].filter(Boolean).join(" • ")}</div>
                  </td>
                  <td className="px-6 py-3 text-right">{lf.quantity}</td>
                  <td className="px-6 py-3 text-right">{formatMoney(price)}{lf.unit_price_override !== null && <span className="text-xs text-fm-muted ml-1">(override)</span>}</td>
                  <td className="px-6 py-3 text-right font-semibold">{formatMoney(price * lf.quantity)}</td>
                  <td className="px-6 py-3 text-right"><RemoveBtn id={lf.id} locationId={locationId} /></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-fm-paper">
            <tr>
              <td className="px-6 py-3 font-semibold" colSpan={3}>Total per cycle</td>
              <td className="px-6 py-3 text-right font-semibold display">{formatMoney(total)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {adding ? (
        <AddRow
          locationId={locationId}
          skus={skus.filter((s) => !initial.some((lf) => lf.sku_id === s.id))}
          onDone={() => setAdding(false)}
        />
      ) : (
        <button onClick={() => setAdding(true)} className="btn btn-primary">+ Add filter to location</button>
      )}
    </div>
  );
}

function AddRow({ locationId, skus, onDone }: { locationId: string; skus: Sku[]; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (skus.length === 0) {
    return (
      <div className="card text-sm text-fm-muted">
        All SKUs are already on this location, or you haven't created any. <a href="/admin/skus" className="underline">Manage SKUs</a>.
      </div>
    );
  }

  return (
    <form
      className="card space-y-3"
      action={(fd) => start(async () => {
        setError(null);
        const res = await saveLocationFilter({
          location_id: locationId,
          sku_id: String(fd.get("sku_id") || ""),
          quantity: Number(fd.get("quantity") || 1),
          unit_price_override: fd.get("unit_price_override") ? Number(fd.get("unit_price_override")) : undefined,
          notes: String(fd.get("notes") || ""),
        });
        if (res?.error) setError(res.error);
        else onDone();
      })}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="label">Filter SKU</label>
          <select name="sku_id" required className="input">
            <option value="">Select…</option>
            {skus.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Quantity</label>
          <input name="quantity" type="number" min={1} defaultValue={1} required className="input" />
        </div>
        <div>
          <label className="label">Unit price override (optional)</label>
          <input name="unit_price_override" type="number" step="0.01" min={0} className="input" />
        </div>
      </div>
      <input name="notes" placeholder="Notes (optional)" className="input" />
      {error && <div className="text-sm text-red-700">{error}</div>}
      <div className="flex gap-2">
        <button disabled={pending} className="btn btn-primary">{pending ? "Saving…" : "Add"}</button>
        <button type="button" onClick={onDone} className="btn btn-ghost">Cancel</button>
      </div>
    </form>
  );
}

function RemoveBtn({ id, locationId }: { id: string; locationId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => { if (confirm("Remove this filter from the location?")) start(async () => { await deleteLocationFilter(id, locationId); }); }}
      disabled={pending}
      className="text-xs font-semibold text-red-700 hover:underline"
    >
      {pending ? "…" : "Remove"}
    </button>
  );
}
