"use client";

import { useState, useTransition } from "react";
import { saveSku, archiveSku, type SkuInput } from "@/lib/actions/skus";
import { formatMoney } from "@/lib/utils";

type Sku = SkuInput & { id: string };

export function SkuTable({ initial }: { initial: Sku[] }) {
  const [editing, setEditing] = useState<Sku | "new" | null>(null);

  return (
    <div className="space-y-4">
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-fm-muted bg-fm-paper">
            <tr>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Size</th>
              <th className="px-6 py-3">MERV</th>
              <th className="px-6 py-3">Brand</th>
              <th className="px-6 py-3 text-right">Unit price</th>
              <th className="px-6 py-3 text-right">Cost</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-fm-line">
            {initial.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-fm-muted">No SKUs yet.</td></tr>
            ) : initial.map((s) => (
              <tr key={s.id}>
                <td className="px-6 py-3 font-medium">{s.name}</td>
                <td className="px-6 py-3 text-fm-muted">{s.size || "—"}</td>
                <td className="px-6 py-3 text-fm-muted">{s.merv ?? "—"}</td>
                <td className="px-6 py-3 text-fm-muted">{s.brand || "—"}</td>
                <td className="px-6 py-3 text-right font-medium">{formatMoney(Number(s.unit_price))}</td>
                <td className="px-6 py-3 text-right text-fm-muted">{s.unit_cost ? formatMoney(Number(s.unit_cost)) : "—"}</td>
                <td className="px-6 py-3 text-right space-x-3">
                  <button onClick={() => setEditing(s)} className="text-xs font-semibold hover:underline">Edit</button>
                  <ArchiveBtn id={s.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <SkuForm
          initial={editing === "new" ? undefined : editing}
          onDone={() => setEditing(null)}
        />
      ) : (
        <button onClick={() => setEditing("new")} className="btn btn-primary">+ New SKU</button>
      )}
    </div>
  );
}

function SkuForm({ initial, onDone }: { initial?: Sku; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="card space-y-4"
      action={(fd) => start(async () => {
        setError(null);
        const res = await saveSku({
          id: initial?.id,
          sku: String(fd.get("sku") || ""),
          name: String(fd.get("name") || ""),
          size: String(fd.get("size") || ""),
          merv: fd.get("merv") ? Number(fd.get("merv")) : undefined,
          brand: String(fd.get("brand") || ""),
          unit_price: Number(fd.get("unit_price") || 0),
          unit_cost: fd.get("unit_cost") ? Number(fd.get("unit_cost")) : undefined,
          description: String(fd.get("description") || ""),
        });
        if (res?.error) setError(res.error);
        else onDone();
      })}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="label">Name *</label>
          <input name="name" defaultValue={initial?.name || ""} required className="input" />
        </div>
        <div>
          <label className="label">SKU code (optional)</label>
          <input name="sku" defaultValue={initial?.sku || ""} className="input" />
        </div>
        <div>
          <label className="label">Size</label>
          <input name="size" placeholder="16x20x1" defaultValue={initial?.size || ""} className="input" />
        </div>
        <div>
          <label className="label">MERV</label>
          <input name="merv" type="number" min={1} max={20} defaultValue={initial?.merv ?? ""} className="input" />
        </div>
        <div>
          <label className="label">Brand</label>
          <input name="brand" defaultValue={initial?.brand || ""} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Unit price *</label>
            <input name="unit_price" type="number" step="0.01" min="0" required defaultValue={initial?.unit_price ?? ""} className="input" />
          </div>
          <div>
            <label className="label">Cost (private)</label>
            <input name="unit_cost" type="number" step="0.01" min="0" defaultValue={initial?.unit_cost ?? ""} className="input" />
          </div>
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea name="description" rows={2} defaultValue={initial?.description || ""} className="input" />
      </div>
      {error && <div className="text-sm text-red-700">{error}</div>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "Saving…" : "Save"}</button>
        <button type="button" onClick={onDone} className="btn btn-ghost">Cancel</button>
      </div>
    </form>
  );
}

function ArchiveBtn({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => { if (confirm("Archive this SKU?")) start(async () => { await archiveSku(id); }); }}
      disabled={pending}
      className="text-xs font-semibold text-red-700 hover:underline"
    >
      {pending ? "…" : "Archive"}
    </button>
  );
}
