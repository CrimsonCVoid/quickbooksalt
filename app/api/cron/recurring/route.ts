import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateInvoiceFromPlan, advanceDueDate, formatYmd } from "@/lib/invoicing";
import { addDays } from "date-fns";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily cron: for every active plan where (next_due_date - lead_time_days) <= today,
 * generate a pending_approval invoice and advance the plan's next_due_date.
 *
 * Trigger: GET /api/cron/recurring (Vercel cron) with header `Authorization: Bearer ${CRON_SECRET}`
 *           OR  `?secret=${CRON_SECRET}` (Vercel Cron prepends the auth header automatically once configured).
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const url = new URL(req.url);
  const ok =
    !expected ||
    auth === `Bearer ${expected}` ||
    url.searchParams.get("secret") === expected;
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const today = new Date();
  const { data: plans, error } = await supabase
    .from("service_plans")
    .select("*")
    .eq("active", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const generated: { plan_id: string; invoiceId: string; invoiceNumber: string }[] = [];
  const skipped: { plan_id: string; reason: string }[] = [];

  for (const plan of plans ?? []) {
    const nextDue = new Date(plan.next_due_date);
    const triggerOn = addDays(nextDue, -plan.lead_time_days);
    if (today < triggerOn) continue;

    try {
      const result = await generateInvoiceFromPlan(supabase as any, plan.owner_id, plan);
      if (!result) { skipped.push({ plan_id: plan.id, reason: "no_lines" }); continue; }
      generated.push({ plan_id: plan.id, invoiceId: result.invoiceId, invoiceNumber: result.invoiceNumber });

      // advance the plan's next due date
      const advanced = advanceDueDate(nextDue, plan.frequency, plan.custom_interval_days);
      await supabase.from("service_plans").update({ next_due_date: formatYmd(advanced) }).eq("id", plan.id);
    } catch (e: any) {
      skipped.push({ plan_id: plan.id, reason: e?.message || "error" });
    }
  }

  return NextResponse.json({
    ran_at: new Date().toISOString(),
    generated_count: generated.length,
    skipped_count: skipped.length,
    generated,
    skipped,
  });
}
