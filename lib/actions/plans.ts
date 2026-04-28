"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const PlanSchema = z.object({
  id: z.string().uuid().optional(),
  customer_id: z.string().uuid(),
  name: z.string().min(1),
  frequency: z.enum(["monthly", "quarterly", "semiannual", "annual", "custom_days"]),
  custom_interval_days: z.coerce.number().int().min(1).optional().nullable(),
  location_ids: z.array(z.string().uuid()).default([]),
  labor_fee: z.coerce.number().min(0).default(0),
  labor_fee_label: z.string().optional().nullable(),
  lead_time_days: z.coerce.number().int().min(0).max(60).default(7),
  next_due_date: z.string().min(1), // YYYY-MM-DD
  payment_terms_days: z.coerce.number().int().min(0).max(365).optional().nullable(),
  active: z.boolean().default(true),
  notes: z.string().optional().nullable(),
});

export type PlanInput = z.infer<typeof PlanSchema>;

export async function savePlan(input: PlanInput) {
  const parsed = PlanSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { id, ...rest } = parsed.data;
  const cleaned = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v === "" ? null : v]));

  if (id) {
    const { error } = await supabase.from("service_plans").update(cleaned).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("service_plans").insert({ ...cleaned, owner_id: user.id });
    if (error) return { error: error.message };
  }
  revalidatePath("/admin/plans");
  revalidatePath(`/admin/customers/${parsed.data.customer_id}`);
  return { ok: true };
}

export async function togglePlanActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("service_plans").update({ active }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/plans");
  return { ok: true };
}

export async function deletePlan(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("service_plans").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/plans");
  return { ok: true };
}
