import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { renderInvoicePdf } from "@/lib/pdf/render";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createServiceClient();
  const { data: inv } = await supabase.from("invoices").select("id, invoice_number").eq("public_token", token).maybeSingle();
  if (!inv) return new NextResponse("Not found", { status: 404 });
  const buf = await renderInvoicePdf(inv.id);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${inv.invoice_number}.pdf"`,
    },
  });
}
