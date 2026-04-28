import Link from "next/link";
import { brand } from "@/lib/branding";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-fm-yellow/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-fm-ink mb-6">
          <span className="size-1.5 rounded-full bg-fm-ink" /> Internal • Owner only
        </div>
        <h1 className="display text-5xl md:text-6xl mb-4">{brand.name}<br/>Invoicing</h1>
        <p className="text-fm-muted mb-8 text-lg">
          Recurring filter-service invoices, signatures on the contractor's phone,
          and check + Stripe payment tracking — all in one place.
        </p>
        <Link href="/login" className="btn btn-primary">
          Sign in to admin →
        </Link>
      </div>
    </main>
  );
}
