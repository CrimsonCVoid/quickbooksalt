import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendSignatureConfirm } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json().catch(() => ({}));
  const { signature_png_data, signer_name, signer_title } = body || {};
  if (!signature_png_data || !signer_name) {
    return NextResponse.json({ error: "Missing signature or name." }, { status: 400 });
  }
  if (typeof signature_png_data !== "string" || !signature_png_data.startsWith("data:image/png;base64,")) {
    return NextResponse.json({ error: "Invalid signature payload." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: inv } = await supabase.from("invoices").select("*").eq("public_token", token).maybeSingle();
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (inv.status === "void") return NextResponse.json({ error: "Invoice is void." }, { status: 400 });

  const base64 = signature_png_data.split(",")[1];
  const buf = Buffer.from(base64, "base64");
  const path = `${inv.owner_id}/${inv.id}/${Date.now()}.png`;

  const { error: upErr } = await supabase.storage.from("signatures").upload(path, buf, {
    contentType: "image/png",
    upsert: false,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;
  const ua = req.headers.get("user-agent") || null;

  const { data: sig, error: sigErr } = await supabase
    .from("signatures")
    .insert({
      owner_id: inv.owner_id,
      invoice_id: inv.id,
      signer_name,
      signer_title: signer_title || null,
      signature_storage_path: path,
      ip_address: ip,
      user_agent: ua,
    })
    .select("*")
    .single();
  if (sigErr) return NextResponse.json({ error: sigErr.message }, { status: 500 });

  await supabase
    .from("invoices")
    .update({ signed_at: sig.signed_at, signature_id: sig.id })
    .eq("id", inv.id);

  // fire-and-forget confirmation email
  sendSignatureConfirm(inv.id, sig.id).catch(() => {});

  return NextResponse.json({ ok: true });
}
