import { NextResponse, type NextRequest } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { sendReceiptEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: "Missing signature config" }, { status: 400 });

  const raw = await req.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, secret);
  } catch (e: any) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${e.message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const invoiceId = session.metadata?.invoice_id;
    const ownerId = session.metadata?.owner_id;
    if (!invoiceId || !ownerId) return NextResponse.json({ received: true });

    const supabase = createServiceClient();
    const amount = Number(session.amount_total) / 100;

    const { data: payment } = await supabase
      .from("payments")
      .insert({
        owner_id: ownerId,
        invoice_id: invoiceId,
        amount,
        method: "stripe",
        paid_at: new Date().toISOString().slice(0, 10),
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent,
      })
      .select("id")
      .single();

    // Recompute totals
    const { data: payments } = await supabase.from("payments").select("amount").eq("invoice_id", invoiceId);
    const totalPaid = (payments ?? []).reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0);
    const { data: inv } = await supabase.from("invoices").select("total").eq("id", invoiceId).single();
    const status = inv && totalPaid >= Number(inv.total) ? "paid" : undefined;
    await supabase.from("invoices").update({ amount_paid: totalPaid, ...(status ? { status } : {}) }).eq("id", invoiceId);

    if (payment?.id) await sendReceiptEmail(invoiceId, payment.id).catch(() => {});
  }

  return NextResponse.json({ received: true });
}
