"use client";

import { useState, useTransition } from "react";
import { saveLocation, archiveLocation, type LocationInput } from "@/lib/actions/customers";

type Location = LocationInput & { id: string };

export function LocationsList({
  customerId,
  initialLocations,
}: {
  customerId: string;
  initialLocations: Location[];
}) {
  const [editing, setEditing] = useState<Location | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-3">
      {initialLocations.length === 0 && !adding ? (
        <p className="text-sm text-fm-muted">No locations yet.</p>
      ) : (
        <ul className="space-y-2">
          {initialLocations.map((loc) => (
            <li key={loc.id} className="flex items-start justify-between rounded-lg border border-fm-line p-3">
              {editing?.id === loc.id ? (
                <LocationForm
                  customerId={customerId}
                  initial={loc}
                  onDone={() => setEditing(null)}
                />
              ) : (
                <>
                  <div>
                    <div className="font-semibold">{loc.label}</div>
                    <div className="text-sm text-fm-muted">
                      {[loc.line1, loc.city, loc.state, loc.postal].filter(Boolean).join(", ") || "—"}
                    </div>
                    {loc.access_notes && <div className="text-xs text-fm-muted mt-1 italic">{loc.access_notes}</div>}
                  </div>
                  <div className="flex gap-3">
                    <a href={`/admin/locations/${loc.id}/filters`} className="text-xs font-semibold text-fm-ink hover:underline">Filters</a>
                    <button onClick={() => setEditing(loc)} className="text-xs font-semibold text-fm-ink hover:underline">Edit</button>
                    <ArchiveButton id={loc.id!} customerId={customerId} />
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <LocationForm customerId={customerId} onDone={() => setAdding(false)} />
      ) : (
        <button onClick={() => setAdding(true)} className="btn btn-secondary text-sm">
          + Add location
        </button>
      )}
    </div>
  );
}

function LocationForm({
  customerId,
  initial,
  onDone,
}: {
  customerId: string;
  initial?: Location;
  onDone: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(fd) =>
        start(async () => {
          setError(null);
          const res = await saveLocation({
            id: initial?.id,
            customer_id: customerId,
            label: String(fd.get("label") || ""),
            line1: String(fd.get("line1") || ""),
            line2: String(fd.get("line2") || ""),
            city: String(fd.get("city") || ""),
            state: String(fd.get("state") || ""),
            postal: String(fd.get("postal") || ""),
            access_notes: String(fd.get("access_notes") || ""),
          });
          if (res?.error) setError(res.error);
          else onDone();
        })
      }
      className="w-full space-y-2"
    >
      <input name="label" defaultValue={initial?.label || ""} placeholder="Location label (e.g. Main office)" required className="input" />
      <input name="line1" defaultValue={initial?.line1 || ""} placeholder="Street" className="input" />
      <div className="grid grid-cols-3 gap-2">
        <input name="city" defaultValue={initial?.city || ""} placeholder="City" className="input" />
        <input name="state" defaultValue={initial?.state || ""} placeholder="State" className="input" />
        <input name="postal" defaultValue={initial?.postal || ""} placeholder="ZIP" className="input" />
      </div>
      <input name="access_notes" defaultValue={initial?.access_notes || ""} placeholder="Access notes (gate code, key, contact)" className="input" />
      {error && <div className="text-sm text-red-700">{error}</div>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn btn-primary text-sm">
          {pending ? "Saving…" : initial ? "Save" : "Add"}
        </button>
        <button type="button" onClick={onDone} className="btn btn-ghost text-sm">Cancel</button>
      </div>
    </form>
  );
}

function ArchiveButton({ id, customerId }: { id: string; customerId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm("Archive this location?")) return;
        start(async () => { await archiveLocation(id, customerId); });
      }}
      disabled={pending}
      className="text-xs font-semibold text-red-700 hover:underline"
    >
      {pending ? "…" : "Archive"}
    </button>
  );
}
