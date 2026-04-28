"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const SkuSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().optional().nullable(),
  name: z.string().min(1, "Name required"),
  size: z.string().optional().nullable(),
  merv: z.coerce.number().int().optional().nullable(),
  brand: z.string().optional().nullable(),
  unit_price: z.coerce.number().min(0),
  unit_cost: z.coerce.number().min(0).optional().nullable(),
  description: z.string().optional().nullable(),
});

export type SkuInput = z.infer<typeof SkuSchema>;

export async function saveSku(input: SkuInput) {
  const parsed = SkuSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { id, ...rest } = parsed.data;
  const cleaned = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v === "" ? null : v]));

  if (id) {
    const { error } = await supabase.from("filter_skus").update(cleaned).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("filter_skus").insert({ ...cleaned, owner_id: user.id });
    if (error) return { error: error.message };
  }
  revalidatePath("/admin/skus");
  return { ok: true };
}

export async function archiveSku(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("filter_skus").update({ archived: true }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/skus");
  return { ok: true };
}

const LocationFilterSchema = z.object({
  id: z.string().uuid().optional(),
  location_id: z.string().uuid(),
  sku_id: z.string().uuid(),
  quantity: z.coerce.number().int().min(1),
  unit_price_override: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function saveLocationFilter(input: z.infer<typeof LocationFilterSchema>) {
  const parsed = LocationFilterSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { id, ...rest } = parsed.data;
  const cleaned = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v === "" ? null : v]));

  if (id) {
    const { error } = await supabase.from("location_filters").update(cleaned).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("location_filters")
      .upsert({ ...cleaned, owner_id: user.id }, { onConflict: "location_id,sku_id" });
    if (error) return { error: error.message };
  }
  revalidatePath(`/admin/locations/${parsed.data.location_id}/filters`);
  return { ok: true };
}

export async function deleteLocationFilter(id: string, locationId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("location_filters").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/locations/${locationId}/filters`);
  return { ok: true };
}
