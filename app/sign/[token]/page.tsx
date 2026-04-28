import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { SignaturePadClient } from "./signature-pad-client";
import { brand } from "@/lib/branding";
import { formatMoney, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: inv } = await supabase.from("invoices").select("*").eq("public_token", token).maybeSingle();
  if (!inv) notFound();

  const [{ data: lines }, { data: settings }, { data: existingSig }] = await Promise.all([
    supabase.from("invoice_line_items").select("*").eq("invoice_id", inv.id).order("sort_order"),
    supabase.from("settings").select("business_name, business_address").eq("owner_id", inv.owner_id).maybeSingle(),
    supabase.from("signatures").select("*").eq("invoice_id", inv.id).order("signed_at", { ascending: false }).maybeSingle(),
  ]);

  const businessName = settings?.business_name || brand.name;
  const alreadySigned = !!existingSig;

  return (
    <main className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="display text-3xl">{businessName}</h1>
        <p className="text-fm-muted text-sm">Invoice {inv.invoice_number}</p>
      </div>

      <div className="card mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-fm-muted">Bill to</p>
            <p className="font-semibold">{inv.bill_to_company}</p>
            {inv.bill_to_contact && <p className="text-sm">{inv.bill_to_contact}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-fm-muted">Due</p>
            <p className="font-semibold">{formatDate(inv.due_date)}</p>
          </div>
        </div>

        <table className="w-full text-sm border-t border-fm-line">
          <thead className="text-xs uppercase tracking-wider text-fm-muted text-left">
            <tr><th className="py-2">Item</th><th className="text-right">Qty</th><th className="text-right">Unit</th><th className="text-right">Total</th></tr>
          </thead>
          <tbody className="divide-y divide-fm-line">
            {(lines ?? []).map((l: any) => (
              <tr key={l.id}>
                <td className="py-2">{l.description}</td>
                <td className="text-right">{l.quantity}</td>
                <td className="text-right">{formatMoney(Number(l.unit_price))}</td>
                <td className="text-right font-medium">{formatMoney(Number(l.line_total))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-fm-yellow/30">
            <tr><td colSpan={3} className="py-2 text-right font-bold">Total</td><td className="text-right font-bold">{formatMoney(Number(inv.total))}</td></tr>
          </tfoot>
        </table>

        <div className="mt-4 flex flex-wrap gap-2">
          <a href={`/api/public/invoices/${inv.public_token}/pdf`} target="_blank" rel="noopener" className="btn btn-secondary text-sm">View / print PDF</a>
        </div>
      </div>

      {alreadySigned ? (
        <div className="card">
          <h2 className="display text-xl mb-2">Signed ✓</h2>
          <p className="text-sm text-fm-muted">Signed by {existingSig?.signer_name || "—"} on {formatDate(existingSig?.signed_at)}.</p>
        </div>
      ) : (
        <SignaturePadClient token={token} />
      )}
    </main>
  );
}
