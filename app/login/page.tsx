import { brand } from "@/lib/branding";
import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const errorMsg =
    params.error === "not_authorized"
      ? "That email isn't the configured owner."
      : params.error;

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="card w-full max-w-md">
        <h1 className="display text-3xl mb-1">{brand.name}</h1>
        <p className="text-fm-muted text-sm mb-6">
          Sign in to manage invoices. First time? Pick a password — we'll create your account on the spot.
        </p>

        <form action={loginAction} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="input"
              defaultValue={process.env.OWNER_EMAIL || ""}
              autoComplete="email"
              autoFocus
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="input"
              placeholder="At least 8 characters"
              autoComplete="current-password"
            />
          </div>
          {params.next && <input type="hidden" name="next" value={params.next} />}
          {errorMsg && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-900">
              {errorMsg}
            </div>
          )}
          <button type="submit" className="btn btn-primary w-full">
            Sign in / create account
          </button>
        </form>
      </div>
    </main>
  );
}
