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
    check_pay_to: settings?.check_pay_to ?? brand.defaultCheck.payTo,
    check_address_line1: settings?.check_address_line1 ?? brand.defaultCheck.addressLine1,
    check_address_line2: settings?.check_address_line2 ?? brand.defaultCheck.addressLine2,
    check_city: settings?.check_city ?? brand.defaultCheck.city,
    check_state: settings?.check_state ?? brand.defaultCheck.state,
    check_postal: settings?.check_postal ?? brand.defaultCheck.postal,
    check_memo_template: settings?.check_memo_template ?? brand.defaultCheck.memoTemplate,
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
