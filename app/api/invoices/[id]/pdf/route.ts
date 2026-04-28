import { createClient } from "@/lib/supabase/server";
import { renderInvoicePdf } from "@/lib/pdf/render";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  // Confirm ownership via RLS-bound select
  const { data: inv } = await supabase.from("invoices").select("id, invoice_number").eq("id", id).single();
  if (!inv) return new NextResponse("Not found", { status: 404 });

  const buf = await renderInvoicePdf(id);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${inv.invoice_number}.pdf"`,
    },
  });
}
