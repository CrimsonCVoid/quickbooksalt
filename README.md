# Filter Monkey Invoicing

Recurring invoicing system for HVAC filter-service businesses. Built for one operator (you). Deploys to Vercel.

**Stack:** Next.js 15 (App Router) · Supabase (Postgres + Auth + Storage) · Resend (email) · Stripe (online pay) · `@react-pdf/renderer` (PDFs) · `signature_pad` (mobile signatures) · Tailwind v4.

## What it does

- **Customers + locations**: Each client can have multiple service locations.
- **Filter SKUs + per-location filter mix**: Reusable catalog. Assign which filters + how many at each location.
- **Service plans**: Per-customer recurring schedule (monthly / quarterly / custom). A daily cron generates draft invoices ahead of due dates.
- **Approval queue**: Drafts land in `/admin/approvals` for you to review, edit, and one-click "Approve & send."
- **Branded invoice PDFs** sent via Resend, with attachments + tokenized public links.
- **Mobile-first signing** at `/sign/[token]` — contractor hands client their phone; client signs; PNG embedded into the regenerated PDF.
- **Check-first payments** (the 39 of 40 path): record check #, deposit date — invoice flips to paid.
- **Stripe Checkout** for the rare online payer at `/pay/[token]` with webhook reconciliation.
- **Settings**: business name, address, phone, email signature, accent color, logo upload, check instructions, invoice number format. Used across all PDFs and emails.

## One-time setup

### 1) Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Settings → API → copy the Project URL, `anon` key, and `service_role` key.
3. Run the schema migration. Either:
   - Paste `supabase/migrations/0001_init.sql` into Supabase SQL Editor, run.
   - Or with the Supabase CLI: `npm i -g supabase && supabase login && supabase link --project-ref <ref> && supabase db push`.
4. Create three storage buckets:
   ```sql
   insert into storage.buckets (id, name, public) values ('invoices','invoices',false) on conflict do nothing;
   insert into storage.buckets (id, name, public) values ('signatures','signatures',false) on conflict do nothing;
   insert into storage.buckets (id, name, public) values ('logos','logos',true) on conflict do nothing;
   ```
5. Authentication → Email → enable "Email" provider with magic links. Add `https://yourdomain.com/auth/callback` and `http://localhost:3000/auth/callback` to redirect URLs.

### 2) Resend (email)

1. Sign up at [resend.com](https://resend.com), create an API key.
2. Add the domain you'll send from (e.g. `filtermonkey.com`) and complete the DNS records. **Sender email must be on a verified domain.**
3. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in env.

### 3) Stripe (optional — only the rare online payer needs this)

1. Sign up at [stripe.com](https://stripe.com), grab API keys.
2. Set `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in env.
3. After deploying to Vercel, add a webhook endpoint at `https://yourdomain.com/api/stripe/webhook` for the `checkout.session.completed` event, copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

### 4) Local development

```bash
cp .env.example .env.local       # fill in the values from steps 1–3
npm install
npm run dev
```

Open `http://localhost:3000`. Sign in at `/login` with the email you set as `OWNER_EMAIL` — only that email can access `/admin`.

### 5) Deploy to Vercel

```bash
npm i -g vercel
vercel link
vercel env add NEXT_PUBLIC_APP_URL  # https://yourdomain.com (your prod URL)
# repeat for all keys in .env.example
vercel --prod
```

The `vercel.json` cron is configured to hit `/api/cron/recurring` daily at 13:00 UTC. Vercel automatically signs cron requests; the route also accepts `?secret=$CRON_SECRET` for manual triggers.

## Day-to-day

1. **Add customers + locations** under `/admin/customers`.
2. **Add filter SKUs** at `/admin/skus` (your catalog).
3. **Per location**, click "Filters" → set quantities (e.g. "Building A: 4× 16x20x1 MERV 8").
4. **Create service plans** at `/admin/plans` — frequency, lead time, locations covered, optional labor fee.
5. **Daily cron** auto-generates drafts. Visit `/admin/approvals` each morning to approve and send.
6. **Manual invoices** at `/admin/invoices/new` if you need a one-off.
7. **Mark paid** by recording the check number + deposit date right on the invoice page.
8. **Online payments** (when enabled in Settings) flow through Stripe Checkout and reconcile automatically via webhook.

## Customization

Hit **Settings** to change:
- Business name, address, phone, email
- Email signature (used in every invoice/receipt email)
- PDF accent color
- Logo upload
- Default Net days
- Invoice number prefix (e.g. `FM-2026-0001`)
- Check payment instructions (where clients mail their checks)
- Toggle "Pay online" link on or off

## Architecture

```
app/
  admin/             # owner-only UI (gated by middleware)
  sign/[token]/      # public — client signs the invoice
  pay/[token]/       # public — Stripe checkout
  api/
    invoices/[id]/pdf       # owner PDF download
    public/invoices/[token]/{pdf,sign,checkout}  # public token routes
    stripe/webhook          # checkout.session.completed
    cron/recurring          # daily generator (Vercel cron)
lib/
  supabase/{client,server,middleware}.ts
  invoicing.ts        # number sequence, line snapshotting, recurring generator
  pdf/                # @react-pdf/renderer template + render helper
  email/              # React Email templates + Resend wrapper
  actions/            # server actions (customers, skus, plans, invoices, settings)
  branding.ts         # default brand config (overridden by settings table at runtime)
supabase/migrations/0001_init.sql   # full schema with RLS
```

All tables have RLS enabled with `owner_id = auth.uid()` policies. Public token routes use the service-role client (RLS bypassed) but only after looking up the invoice by its long random `public_token`.

## License

Private — not for redistribution.
