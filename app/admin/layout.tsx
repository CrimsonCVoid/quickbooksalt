import Link from "next/link";
import { brand } from "@/lib/branding";
import { logoutAction } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-r border-fm-line bg-white p-5 flex flex-col">
        <Link href="/admin" className="display text-2xl mb-8 leading-none">
          <span className="text-fm-ink">{brand.name.split(" ")[0]}</span>
          <span className="ml-1 inline-block bg-fm-yellow px-1.5 rounded">{brand.name.split(" ")[1] ?? ""}</span>
        </Link>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-fm-ink hover:bg-fm-paper"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 pt-6 border-t border-fm-line">
          <p className="text-xs text-fm-muted truncate mb-2">{user.email}</p>
          <form action={logoutAction}>
            <button type="submit" className="text-xs text-fm-muted hover:text-fm-ink">
              Sign out →
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <div className="px-8 py-8 max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
