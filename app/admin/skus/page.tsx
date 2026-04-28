import { createClient } from "@/lib/supabase/server";
import { SkuTable } from "@/components/sku-table";

export default async function SkusPage() {
  const supabase = await createClient();
  const { data: skus } = await supabase
    .from("filter_skus")
    .select("*")
    .eq("archived", false)
    .order("name");

  return (
    <div>
      <div className="mb-6">
        <h1 className="display text-4xl">Filter SKUs</h1>
        <p className="text-fm-muted">Reusable filter catalog. Assign quantities per location after.</p>
      </div>
      <SkuTable initial={skus ?? []} />
    </div>
  );
}
