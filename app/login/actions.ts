"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isOwner } from "@/lib/owner";
import { redirect } from "next/navigation";

/**
 * Email + password sign-in for the single-tenant owner.
 * On first login, auto-creates the account (no email confirmation needed) using the password
 * the owner typed. Subsequent logins use the same password.
 *
 * Why no email confirmation: this is a single-user internal tool with the owner email
 * pinned via OWNER_EMAIL — the magic-link round-trip adds friction without security gain.
 */
export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/admin");

  if (!email || !password) redirect("/login?error=Email+and+password+required");
  if (password.length < 8) redirect("/login?error=Password+must+be+at+least+8+characters");

  if (!isOwner(email)) {
    redirect("/login?error=not_authorized");
  }

  const supabase = await createClient();

  // Try sign-in first
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error) redirect(next);

  // If that failed, see if the user exists at all. If not, create them on the fly.
  const admin = createServiceClient();
  const { data: list, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) redirect(`/login?error=${encodeURIComponent(listErr.message)}`);

  const exists = list.users.some(
    (u: { email?: string | null }) => u.email?.toLowerCase() === email
  );

  if (exists) {
    // User exists — wrong password
    redirect("/login?error=Invalid+password");
  }

  // First-time setup: create the owner with email_confirm so they can sign in immediately
  const { error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr) redirect(`/login?error=${encodeURIComponent(createErr.message)}`);

  const { error: postCreateErr } = await supabase.auth.signInWithPassword({ email, password });
  if (postCreateErr) redirect(`/login?error=${encodeURIComponent(postCreateErr.message)}`);

  redirect(next);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
