# Latli

**Order management for shops that buy products on behalf of customers.**

Latli is a mobile-first web app for small resellers who take orders in Messenger chats, buy the items from shops (for example in Bangkok), ship them through cargo companies, and get paid in Thai baht or Myanmar kyat. It replaces a mess of screenshots, notebooks and spreadsheets with one place to track every order from "customer asked" to "delivered and paid".

> Built end to end as a solo project: product design, UI, database, auth, security rules, AI integration and deployment.

<!-- Add screenshots here, for example:
![Dashboard](docs/dashboard.png)
![New order](docs/new-order.png)
-->

## The problem

A typical day for these sellers: a customer sends a screenshot of a product in a chat, the seller buys it from a shop, forwards it by cargo, and chases payment. Details end up scattered across chats and notes: which shop, which cargo, who has paid, what the profit was. Latli keeps all of that in one structured flow.

## Features

- **Dashboard.** Counts for Not bought, Bought, With cargo, Delivered, Complete and Unpaid. Each card opens the Orders list with the matching filter. It also shows "orders to buy" grouped by shop, plus money totals (sales, profit, unpaid, refunds).
- **Orders.** Search by order ID, customer, shop or product, and filter by order status, payment status, shop and date range. Each order has an auto-numbered ID (`ORD-0001`), its own status and payment tracking, a shop, a cargo company and photos.
- **Read a chat screenshot to fill the form.** Upload the Messenger screenshot and the form is filled in for you. Pro managers use Google Gemini on the server. Everyone else uses on-device OCR (Tesseract.js), so the feature works without sending images to a third party. The user always reviews before saving.
- **Customers, shops and cargo.** Saved customers (matched to orders by phone, Facebook name or name), shops with their own product catalogues and photos, and cargo companies. New customers, shops and products can also be created while writing an order.
- **Photo retention.** Photos are private and deleted after 7 days. Pro accounts can keep them for a month. The dates are enforced in the database, not in the browser.
- **Burmese and English.** Full UI translation with an MM / ENG switch, a translation completeness check, and Burmese-aware date formatting.
- **Accounts.** Email and password sign-up with terms acceptance, email confirmation, and profile settings.

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| UI | Tailwind CSS v4, shadcn/ui on Radix, Tabler icons |
| Backend | Supabase: Postgres, Auth, Storage, Row Level Security |
| AI / OCR | Google Gemini (server route), Tesseract.js (on device) |
| Hosting | Vercel, with a cron job for photo clean-up |
| Tooling | pnpm, ESLint, a custom i18n check script |

## Engineering highlights

- **Security in the database.** Every table has Row Level Security so each user can only see their own rows. Plan and role can't be changed from the client. The photo-expiry table is read-only to users, and "keep for a month" is a function that follows the same security rules. The Supabase Security Advisor is clean apart from one paid-plan setting.
- **Server-checked AI access.** The Gemini route checks the signed-in user's plan and role on the server every time. The API key never reaches the browser.
- **Migrations as the source of truth.** The schema, triggers (profile creation, order numbering, `updated_at`), storage policies and retention logic live in versioned SQL files in `supabase/migrations`, with a step-by-step setup guide.
- **Photo lifecycle.** Private bucket, signed URLs, per-photo expiry records, and a protected cron route that deletes expired files with the service role key.
- **Form UX.** Every required field is marked with a red star, all errors are checked in one pass and shown under their fields, the page scrolls to the first problem, and a summary appears beside the Save button so it is never hidden below the fold.
- **Localization without a heavy library.** An English-as-key dictionary with a small `t()` helper, a runtime translator for non-React code, a server helper, and `scripts/check-i18n.mjs`, which fails when a phrase is missing or unused.
- **Next.js 16 specifics.** Uses `proxy.ts` for route protection and the new conventions rather than older middleware patterns.

## Project structure

```
app/                 Routes: dashboard, orders, customers, shops, cargo, more, auth, API
  api/extract-order  Gemini screenshot reading (server only)
  api/cron/          Photo clean-up job
components/          Shared UI (forms, pickers, field errors) and shadcn/ui
lib/db/              Data access for orders, customers, shops, cargo, photos
lib/i18n/            Translations (my.json) and helpers
lib/supabase/        Browser and server clients
supabase/            Migrations and setup guide
proxy.ts             Redirects signed-out visitors to login
```

## Getting started

Requirements: Node.js 20+, pnpm, a Supabase project.

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Create the database. Follow [supabase/README.md](supabase/README.md): run the SQL files in `supabase/migrations` in order and configure Auth.
3. Create `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   GEMINI_API_KEY=your-gemini-key          # Pro managers only
   SUPABASE_SERVICE_ROLE_KEY=your-key      # photo clean-up route only, keep secret
   CRON_SECRET=a-long-random-string
   GA_MEASUREMENT_ID=G-XXXXXXXXXX          # optional, Google Analytics
   ```
4. Run it:
   ```bash
   pnpm dev
   ```
   Open http://localhost:3000, register an account and add your first order.

Useful scripts:

```bash
pnpm build          # production build
pnpm lint           # ESLint
pnpm i18n:check     # translation completeness
```

## Deployment

Deployed on Vercel. Set the environment variables above in the project settings and add a daily cron job in `vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/expire-photos", "schedule": "0 3 * * *" }] }
```

Add the live URL to Supabase under Authentication > URL Configuration so confirmation emails work.

## Roadmap

- Cargo tracking numbers and delivery updates
- Order export (CSV)
- Customer-facing order status page
- Automated tests

## Contact

Questions or feedback: support@shwan.me
