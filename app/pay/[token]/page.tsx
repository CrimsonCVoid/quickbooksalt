import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { brand } from "@/lib/branding";
import { formatMoney, formatDate } from "@/lib/utils";
import { PayButton } from "./pay-button";

export const dynamic = "force-dynamic";

export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createServiceClient();
  const { data: inv } = await supabase.from("invoices").select("*").eq("public_token", token).maybeSingle();
  if (!inv) notFound();

  const { data: settings } = await supabase
    .from("settings")
    .select("business_name, stripe_enabled, check_instructions")
    .eq("owner_id", inv.owner_id)
    .maybeSingle();

  const businessName = settings?.business_name || brand.name;
  const balance = Number(inv.balance_due);

  return (
    <main className="min-h-screen px-4 py-8 max-w-md mx-auto">
      <h1 className="display text-3xl mb-1">{businessName}</h1>
      <p className="text-fm-muted text-sm mb-6">Invoice {inv.invoice_number}</p>

      <div className="card text-center mb-6">
        <p className="text-xs uppercase tracking-wider text-fm-muted">Balance due</p>
        <p className="display text-5xl my-2">{formatMoney(balance)}</p>
        <p className="text-sm text-fm-muted">to {inv.bill_to_company} • due {formatDate(inv.due_date)}</p>
      </div>

      {inv.status === "paid" || balance <= 0 ? (
        <div className="card text-center">
          <p className="display text-2xl">Paid in full ✓</p>
          <p className="text-fm-muted text-sm mt-1">Thanks for your business.</p>
        </div>
      ) : (
        <>
          {settings?.stripe_enabled ? (
            <PayButton token={token} amountLabel={formatMoney(balance)} />
          ) : (
            <div className="card text-sm">
              Online payment isn't enabled for this account. Please pay by check.
            </div>
          )}
          {(inv.check_instructions || settings?.check_instructions) && (
            <div className="card mt-4">
              <p className="text-xs uppercase tracking-wider text-fm-muted mb-1">Or pay by check</p>
              <p className="text-sm whitespace-pre-line">{inv.check_instructions || settings?.check_instructions}</p>
            </div>
          )}
        </>
      )}

      <p className="text-xs text-fm-muted text-center mt-8">
        <a href={`/sign/${token}`} className="underline">Review &amp; sign invoice →</a>
      </p>
    </main>
  );
}
