import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, company_name, contact_name, email, phone, archived")
    .eq("archived", false)
    .order("company_name");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="display text-4xl">Customers</h1>
          <p className="text-fm-muted">Clients you bill for filter service.</p>
        </div>
        <Link href="/admin/customers/new" className="btn btn-primary">+ New customer</Link>
      </div>

      {!customers || customers.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-fm-muted mb-4">No customers yet.</p>
          <Link href="/admin/customers/new" className="btn btn-primary">Add your first customer</Link>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-fm-muted bg-fm-paper">
              <tr><th className="px-6 py-3">Company</th><th className="px-6 py-3">Contact</th><th className="px-6 py-3">Email</th><th className="px-6 py-3">Phone</th></tr>
            </thead>
            <tbody className="divide-y divide-fm-line">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-fm-paper/50">
                  <td className="px-6 py-3"><Link href={`/admin/customers/${c.id}`} className="font-medium hover:underline">{c.company_name}</Link></td>
                  <td className="px-6 py-3 text-fm-muted">{c.contact_name || "—"}</td>
                  <td className="px-6 py-3 text-fm-muted">{c.email || "—"}</td>
                  <td className="px-6 py-3 text-fm-muted">{c.phone || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
