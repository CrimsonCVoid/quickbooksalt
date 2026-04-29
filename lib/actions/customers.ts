"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const CustomerSchema = z.object({
  id: z.string().uuid().optional(),
  company_name: z.string().min(1, "Company name is required"),
  contact_name: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  billing_line1: z.string().optional().nullable(),
  billing_line2: z.string().optional().nullable(),
  billing_city: z.string().optional().nullable(),
  billing_state: z.string().optional().nullable(),
  billing_postal: z.string().optional().nullable(),
  payment_terms_days: z.coerce.number().int().min(0).max(365).default(15),
  default_payment_method: z.enum(["check", "stripe", "cash", "ach", "other"]).default("check"),
  // Combined state + county sales tax rate as a fraction (e.g. 0.0700 = 7%).
  // 0 = exempt or out-of-jurisdiction.
  tax_rate: z.coerce.number().min(0).max(0.2).default(0),
  notes: z.string().optional().nullable(),
});

export type CustomerInput = z.infer<typeof CustomerSchema>;

export async function saveCustomer(input: CustomerInput) {
  const parsed = CustomerSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { id, ...rest } = parsed.data;
  const cleaned = Object.fromEntries(
    Object.entries(rest).map(([k, v]) => [k, v === "" ? null : v])
  );

  if (id) {
    const { error } = await supabase.from("customers").update(cleaned).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath(`/admin/customers/${id}`);
    revalidatePath("/admin/customers");
    return { ok: true, id };
  } else {
    const { data, error } = await supabase
      .from("customers")
      .insert({ ...cleaned, owner_id: user.id })
      .select("id")
      .single();
    if (error) return { error: error.message };
    revalidatePath("/admin/customers");
    redirect(`/admin/customers/${data.id}`);
  }
}

export async function archiveCustomer(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("customers").update({ archived: true }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/customers");
  redirect("/admin/customers");
}

const LocationSchema = z.object({
  id: z.string().uuid().optional(),
  customer_id: z.string().uuid(),
  label: z.string().min(1),
  line1: z.string().optional().nullable(),
  line2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postal: z.string().optional().nullable(),
  access_notes: z.string().optional().nullable(),
});

export type LocationInput = z.infer<typeof LocationSchema>;

export async function saveLocation(input: LocationInput) {
  const parsed = LocationSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { id, ...rest } = parsed.data;
  const cleaned = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v === "" ? null : v]));

  if (id) {
    const { error } = await supabase.from("locations").update(cleaned).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("locations").insert({ ...cleaned, owner_id: user.id });
    if (error) return { error: error.message };
  }

  revalidatePath(`/admin/customers/${parsed.data.customer_id}`);
  return { ok: true };
}

export async function archiveLocation(id: string, customerId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("locations").update({ archived: true }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/customers/${customerId}`);
  return { ok: true };
}
