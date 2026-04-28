import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createServiceClient();
  const { data: inv } = await supabase.from("invoices").select("*").eq("public_token", token).maybeSingle();
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (inv.status === "void") return NextResponse.json({ error: "Invoice is void." }, { status: 400 });

  const balance = Number(inv.balance_due);
  if (balance <= 0) return NextResponse.json({ error: "Already paid." }, { status: 400 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  let session;
  try {
    const stripe = getStripe();
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(balance * 100),
          product_data: { name: `Invoice ${inv.invoice_number}` },
        },
      }],
      customer_email: inv.bill_to_email || undefined,
      metadata: {
        invoice_id: inv.id,
        owner_id: inv.owner_id,
        invoice_number: inv.invoice_number,
      },
      success_url: `${baseUrl}/pay/${token}?success=1`,
      cancel_url: `${baseUrl}/pay/${token}?canceled=1`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
