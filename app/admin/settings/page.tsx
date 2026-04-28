import { createClient } from "@/lib/supabase/server";
import { brand } from "@/lib/branding";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: settings } = await supabase
    .from("settings")
    .select("*")
    .eq("owner_id", user!.id)
    .maybeSingle();

  const initial = {
    business_name: settings?.business_name ?? brand.name,
    business_address: settings?.business_address ?? "",
    business_phone: settings?.business_phone ?? "",
    business_email: settings?.business_email ?? "",
    email_signature: settings?.email_signature ?? `— ${brand.name}\n${brand.domain}`,
    pdf_accent_color: settings?.pdf_accent_color ?? brand.colors.yellow,
    default_terms_days: settings?.default_terms_days ?? brand.defaultPaymentTermsDays,
    invoice_number_prefix: settings?.invoice_number_prefix ?? brand.invoiceNumberPrefix,
    check_instructions: settings?.check_instructions ?? brand.defaultCheckInstructions,
    stripe_enabled: settings?.stripe_enabled ?? false,
    resend_from_email: settings?.resend_from_email ?? "",
    logo_url: settings?.logo_url ?? null,
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="display text-4xl">Settings</h1>
        <p className="text-fm-muted">Branding, defaults, and payment instructions. Used everywhere.</p>
      </div>
      <SettingsForm initial={initial} />
    </div>
  );
}
