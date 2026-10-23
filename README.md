# Latli

**Know every order, customer, shop and profit in one place.**

Latli is a mobile-first web app for small online sellers who take orders in Messenger, LINE or Viber, buy the items from other shops, and ship them to customers by cargo. It replaces screenshots, notebooks and spreadsheets with one simple flow, from "customer asked" to "delivered and paid".

Every new account starts with a **14-day Pro trial**. No card needed. After that it stays on the free plan.

<!-- Add screenshots here:
![Dashboard](docs/dashboard.png)
-->

## The problem

Order details end up scattered across chats and notes: which shop, which cargo, who has paid, and what the profit was. Sellers lose track of orders and can't see what they really earn.

## What it does

- **Orders:** track each order's status (not bought, bought, with cargo, delivered, complete) and payment.
- **Customers, shops and cargo:** keep contacts, product lists and tracking in one place.
- **Chat screenshot to order:** upload a screenshot and the form fills itself.
- **Profit dashboard:** sales, costs, unpaid balances, refunds and monthly charts.
- **Two languages and currencies:** English and Burmese, baht and kyat.

## Free and Pro

| | Free | Pro |
|---|---|---|
| Orders, customers, shops, payments, profit dashboard | Yes | Yes |
| Screenshot reading | 10 per month | Unlimited |
| Advanced charts and second currency | No | Yes |
| Photo storage | 90 days | 6 months |

## Built with

Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui, Supabase (Postgres, Auth, Storage, Row Level Security), Google Gemini, Vercel.

Security rules and plan limits are enforced in the database, not in the browser.

## Getting started

```bash
pnpm install
pnpm dev
```

1. Create a Supabase project and run the SQL files in `supabase/migrations` in order. See [supabase/README.md](supabase/README.md).
2. Create `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   GEMINI_API_KEY=
   SUPABASE_SERVICE_ROLE_KEY=   # server only, keep secret
   CRON_SECRET=
   ```
3. Open http://localhost:3000 and register.

Other commands: `pnpm build`, `pnpm lint`, `pnpm i18n:check`.

## Docs

- [supabase/README.md](supabase/README.md): database setup, auth, and how to grant Pro.
- Deployed on Vercel; cron jobs are in `vercel.json`.

## Contact

Questions or feedback: support@shwan.me
