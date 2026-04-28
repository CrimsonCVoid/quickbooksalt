"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const SettingsSchema = z.object({
  business_name: z.string().optional().nullable(),
  business_address: z.string().optional().nullable(),
  business_phone: z.string().optional().nullable(),
  business_email: z.string().optional().nullable(),
  email_signature: z.string().optional().nullable(),
  pdf_accent_color: z.string().optional().nullable(),
  default_terms_days: z.coerce.number().int().min(0).max(365).default(15),
  invoice_number_prefix: z.string().min(1).max(10).default("FM"),
  check_instructions: z.string().optional().nullable(),
  stripe_enabled: z.coerce.boolean().default(false),
  resend_from_email: z.string().optional().nullable(),
});

export async function saveSettings(input: z.infer<typeof SettingsSchema>) {
  const parsed = SettingsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const cleaned = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, v === "" ? null : v])
  );

  const { error } = await supabase
    .from("settings")
    .upsert({ ...cleaned, owner_id: user.id }, { onConflict: "owner_id" });
  if (error) return { error: error.message };

  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function uploadLogo(formData: FormData) {
  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) return { error: "No file" };
  if (file.size > 2 * 1024 * 1024) return { error: "Logo must be under 2MB" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const ext = file.name.split(".").pop() || "png";
  const path = `${user.id}/logo.${ext}`;
  const arrBuf = await file.arrayBuffer();

  const { error: upErr } = await supabase.storage
    .from("logos")
    .upload(path, new Uint8Array(arrBuf), { contentType: file.type, upsert: true });
  if (upErr) return { error: upErr.message };

  const { data: pub } = supabase.storage.from("logos").getPublicUrl(path);
  await supabase.from("settings").upsert({ owner_id: user.id, logo_url: pub.publicUrl }, { onConflict: "owner_id" });

  revalidatePath("/admin/settings");
  return { ok: true, url: pub.publicUrl };
}
