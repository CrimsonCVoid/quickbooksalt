import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PlanForm } from "@/components/plan-form";

export default async function NewPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, company_name, locations(id, label, archived)")
    .eq("archived", false)
    .order("company_name");

  return (
    <div>
      <Link href="/admin/plans" className="text-sm text-fm-muted hover:text-fm-ink">← Service plans</Link>
      <h1 className="display text-4xl mt-2 mb-6">New service plan</h1>
      <PlanForm customers={customers ?? []} initialCustomerId={params.customer} />
    </div>
  );
}
