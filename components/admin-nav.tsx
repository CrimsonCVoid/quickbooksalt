"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/login/actions";

type NavItem = { href: string; label: string };

export function AdminNav({
  nav,
  brandName,
  userEmail,
}: {
  nav: NavItem[];
  brandName: string;
  userEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname?.startsWith(href);

  const [first, ...rest] = brandName.split(" ");
  const restName = rest.join(" ");

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between border-b border-fm-line bg-white px-4 h-14">
        <Link href="/admin" className="display text-xl leading-none">
          <span>{first}</span>
          {restName && <span className="ml-1 inline-block bg-fm-yellow px-1.5 rounded">{restName}</span>}
        </Link>
        <button
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="size-10 -mr-2 flex items-center justify-center rounded-lg hover:bg-fm-paper"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="size-6">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* backdrop */}
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-fm-ink/50"
          />
          {/* panel */}
          <aside className="relative ml-auto h-full w-72 max-w-[80vw] bg-white p-5 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <Link href="/admin" className="display text-xl leading-none">
                <span>{first}</span>
                {restName && <span className="ml-1 inline-block bg-fm-yellow px-1.5 rounded">{restName}</span>}
              </Link>
              <button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="size-10 -mr-2 flex items-center justify-center rounded-lg hover:bg-fm-paper"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="size-6">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-3 text-base font-medium ${
                    isActive(item.href) ? "bg-fm-yellow text-fm-ink" : "text-fm-ink hover:bg-fm-paper"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-6 pt-6 border-t border-fm-line">
              <p className="text-xs text-fm-muted truncate mb-2">{userEmail}</p>
              <form action={logoutAction}>
                <button type="submit" className="text-sm text-fm-muted hover:text-fm-ink">
                  Sign out →
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 border-r border-fm-line bg-white p-5 flex-col min-h-screen sticky top-0">
        <Link href="/admin" className="display text-2xl mb-8 leading-none">
          <span>{first}</span>
          {restName && <span className="ml-1 inline-block bg-fm-yellow px-1.5 rounded">{restName}</span>}
        </Link>
        <nav className="flex flex-col gap-1 flex-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                isActive(item.href) ? "bg-fm-yellow text-fm-ink" : "text-fm-ink hover:bg-fm-paper"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 pt-6 border-t border-fm-line">
          <p className="text-xs text-fm-muted truncate mb-2">{userEmail}</p>
          <form action={logoutAction}>
            <button type="submit" className="text-xs text-fm-muted hover:text-fm-ink">
              Sign out →
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
