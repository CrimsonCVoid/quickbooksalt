import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LocationFiltersEditor } from "@/components/location-filters-editor";

export default async function LocationFiltersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: location }, { data: skus }, { data: locationFilters }] = await Promise.all([
    supabase.from("locations").select("*, customer:customers(id, company_name)").eq("id", id).single(),
    supabase.from("filter_skus").select("*").eq("archived", false).order("name"),
    supabase.from("location_filters").select("*, sku:filter_skus(*)").eq("location_id", id),
  ]);

  if (!location) notFound();

  return (
    <div>
      <Link href={`/admin/customers/${location.customer.id}`} className="text-sm text-fm-muted hover:text-fm-ink">
        ← {location.customer.company_name}
      </Link>
      <h1 className="display text-4xl mt-2 mb-1">{location.label}</h1>
      <p className="text-fm-muted mb-6">Filter quantities billed each service cycle.</p>

      <LocationFiltersEditor
        locationId={id}
        skus={skus ?? []}
        initial={locationFilters ?? []}
      />
    </div>
  );
}
