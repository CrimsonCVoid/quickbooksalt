import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlanForm } from "@/components/plan-form";

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: plan }, { data: customers }] = await Promise.all([
    supabase.from("service_plans").select("*").eq("id", id).single(),
    supabase
      .from("customers")
      .select("id, company_name, locations(id, label, archived)")
      .eq("archived", false)
      .order("company_name"),
  ]);
  if (!plan) notFound();

  return (
    <div>
      <Link href="/admin/plans" className="text-sm text-fm-muted hover:text-fm-ink">← Service plans</Link>
      <h1 className="display text-4xl mt-2 mb-6">{plan.name}</h1>
      <PlanForm customers={customers ?? []} initial={plan} />
    </div>
  );
}
