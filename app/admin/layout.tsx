import { brand } from "@/lib/branding";
import { logoutAction } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/invoices", label: "Invoices" },
  { href: "/admin/approvals", label: "Approvals" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/plans", label: "Service Plans" },
  { href: "/admin/tax-projection", label: "Tax projection" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen md:flex">
      <AdminNav nav={NAV} brandName={brand.name} userEmail={user.email ?? ""} />
      <main className="flex-1 overflow-x-hidden md:ml-0">
        <div className="px-4 py-5 md:px-8 md:py-8 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
