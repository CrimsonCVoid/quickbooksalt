import Link from "next/link";

type Sku = { id: string; name: string; size: string | null; merv: number | null; unit_price: number };
type LocFilter = { quantity: number; unit_price_override: number | null; sku: Sku };
type Location = { id: string; label: string; location_filters: LocFilter[] };

/**
 * Shows every filter the customer needs each service cycle, aggregated across
 * all locations. The whole point: see at a glance what's billed without
 * clicking through to a location detail page. Edit goes per-location since
 * SKUs are scoped that way.
 */
export function FilterMixCard({ locations }: { locations: Location[] }) {
  // Aggregate qty per SKU across locations
  const totals = new Map<string, { name: string; qty: number; perLoc: { loc: string; qty: number; locId: string }[] }>();
  for (const loc of locations) {
    for (const lf of loc.location_filters || []) {
      if (!lf.sku) continue;
      const cur = totals.get(lf.sku.id) ?? { name: lf.sku.name, qty: 0, perLoc: [] };
      cur.qty += Number(lf.quantity);
      cur.perLoc.push({ loc: loc.label, qty: Number(lf.quantity), locId: loc.id });
      totals.set(lf.sku.id, cur);
    }
  }

  const rows = Array.from(totals.values()).sort((a, b) => b.qty - a.qty);
  const totalCount = rows.reduce((s, r) => s + r.qty, 0);
  const isMulti = locations.length > 1;

  if (rows.length === 0) {
    return (
      <div className="card border-dashed">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="display text-xl">Filter requirements</h2>
            <p className="text-sm text-fm-muted mt-1">No filters configured yet.</p>
          </div>
          {locations[0] && (
            <Link href={`/admin/locations/${locations[0].id}/filters`} className="btn btn-primary text-sm">
              Set up filters →
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="display text-xl">Filter requirements</h2>
        <p className="text-sm text-fm-muted">
          <span className="font-semibold text-fm-ink">{totalCount}</span> filter{totalCount !== 1 ? "s" : ""} per cycle
          {locations.length > 1 ? ` across ${locations.length} locations` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {rows.map((r) => {
          const sku = locations
            .flatMap((l) => l.location_filters || [])
            .find((lf) => lf.sku?.name === r.name)?.sku;
          return (
            <div
              key={r.name}
              className="rounded-lg border border-fm-line bg-fm-paper px-3 py-2 hover:border-fm-ink/40 transition"
              title={isMulti ? r.perLoc.map((pl) => `${pl.loc}: ${pl.qty}`).join("\n") : undefined}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-xs text-fm-muted uppercase">{r.name}</span>
                <span className="display text-2xl">{r.qty}</span>
              </div>
              {sku?.merv && (
                <p className="text-xs text-fm-muted mt-0.5">MERV {sku.merv}</p>
              )}
            </div>
          );
        })}
      </div>

      {locations.length === 1 && (
        <div className="mt-4 pt-4 border-t border-fm-line flex justify-end">
          <Link
            href={`/admin/locations/${locations[0].id}/filters`}
            className="text-sm font-semibold text-fm-ink hover:underline"
          >
            Edit filter mix →
          </Link>
        </div>
      )}
    </div>
  );
}
