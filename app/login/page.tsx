import { brand } from "@/lib/branding";
import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string; next?: string }>;
}) {
  const params = await searchParams;
  const errorMsg =
    params.error === "not_authorized"
      ? "That email is not the configured owner. Sign out and use the OWNER_EMAIL set in env."
      : params.error;

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="card w-full max-w-md">
        <h1 className="display text-3xl mb-1">{brand.name}</h1>
        <p className="text-fm-muted text-sm mb-6">Sign in to manage invoices.</p>

        {params.sent ? (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-900">
            Check your inbox — we sent you a magic-link sign-in.
          </div>
        ) : (
          <form action={loginAction} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input"
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
              />
            </div>
            {params.next && <input type="hidden" name="next" value={params.next} />}
            {errorMsg && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-900">
                {errorMsg}
              </div>
            )}
            <button type="submit" className="btn btn-primary w-full">
              Send magic link
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
