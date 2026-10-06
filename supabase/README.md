# Supabase setup

Latli uses Supabase for:

- **Auth**: login and account creation.
- **Database**: profiles, customers, shops, shop products, cargo companies and
  orders. Each user sees only their own rows (row level security).
- **Storage**: a private `photos` bucket for order and product photos. Photos
  are deleted after 7 days. Pro accounts can keep them for a month.

Follow the steps in order. It takes about 10 minutes.

## 1. Create the project

1. Go to https://supabase.com/dashboard and choose **New project**.
2. Pick a name, a database password (save it somewhere safe) and the region
   closest to your shops.
3. Wait until the project finishes setting up.

## 2. Connect the app

1. In the dashboard open **Project Settings > API**.
2. Copy the **Project URL** and the **anon public** key (also called the
   publishable key).
3. Create `latli/.env.local` (it is git-ignored) with:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   GEMINI_API_KEY=your-gemini-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   CRON_SECRET=a-long-random-string-you-make-up
   ```

4. Restart `pnpm dev` after changing this file.

- `GEMINI_API_KEY` is only used for managers on the Pro plan.
- `SUPABASE_SERVICE_ROLE_KEY` is under **Project Settings > API > service_role**.
  It bypasses all security rules, so keep it on the server only. The app uses it
  in one place: the photo clean-up route (step 6). Never prefix it with
  `NEXT_PUBLIC_` and never commit it.
- `CRON_SECRET` is any long random text. The clean-up route refuses callers
  that do not send it.

## 3. Create the tables

Open **SQL Editor > New query**. Run these six files **in this order**, one
after the other (paste the whole file, then press Run):

1. `supabase/migrations/20261003000000_profiles.sql`
   Creates `profiles` (shop details, age, gender, plan, role) and the trigger
   that makes a profile when someone registers.
2. `supabase/migrations/20261003010000_app_data.sql`
   Creates `customers`, `shops`, `shop_products`, `cargo_companies` and
   `orders`, the order numbering (`ORD-0001`, `ORD-0002`, ...), the
   `updated_at` triggers, row level security, and the `photos` storage bucket
   with its access rules.
3. `supabase/migrations/20261003020000_photo_retention.sql`
   Photo retention. Every photo is deleted 7 days after it is saved. A Pro
   account can press **Keep photos for a month** (30 days from that click, and
   it can be pressed again later). Dates are kept in `photo_expiry`, which users
   can read but not change, so nobody can extend their own photos from the
   browser.

4. `supabase/migrations/20261003030000_security_fixes.sql`
   Security Advisor fixes: stops the internal trigger functions from being
   callable over the API, and makes "Keep photos for a month" a normal function
   that follows the security rules instead of bypassing them. Run it even on a
   project that already has the first three files.

5. `supabase/migrations/20261004000000_order_cargo.sql`
   Adds the cargo company to orders. Run it before using the Cargo card on
   the order page.

6. `supabase/migrations/20261005000000_currency_settings.sql`
   Adds the primary currency (MMK until the user changes it in Settings), and
   the Pro-only second currency with a default exchange rate, to `profiles`,
   and `base_currency` to `orders`. Free accounts cannot set a second currency
   (the database refuses it). The `*_thb` order columns are legacy names: they
   hold amounts in the order's base currency.

Each file should end with "Success. No rows returned". Run each file only once.
If one fails halfway, tell me the error message instead of running it again.

If the bucket line fails, create it by hand: **Storage > New bucket**, name
`photos`, leave **Public bucket** off. Then run only the four
`create policy ... on storage.objects` statements at the end of the second file.

## 4. Configure Auth

In **Authentication > URL Configuration**:

- **Site URL**: `http://localhost:3000` (your real domain once deployed).
- **Redirect URLs**: add `http://localhost:3000/auth/callback`, and the same
  path on your real domain.

In **Authentication > Sign In / Providers > Email**, choose whether new users
must confirm their email:

- **On**: users get an email link and are sent to `/auth/callback`.
- **Off**: users are signed in as soon as they register. Easier while testing.

### Security Advisor

After the four files, open **Advisors > Security Advisor** and press **Rerun
linter**. Everything should be clear except one warning that needs a setting,
not SQL:

- **Leaked password protection disabled**: turn it on under **Authentication >
  Sign In / Providers > Email**, option *Prevent use of leaked passwords*. This
  option is only offered on Supabase's paid plans. On the free plan the warning
  stays and is safe to leave. While you are there, set **Minimum password
  length** to 8 to match the registration form.

## 5. Schedule the photo clean-up

Photos past their date stop showing in the app straight away, but the files are
only removed when the clean-up route runs. Call it once an hour:

```
GET https://YOUR-DOMAIN/api/cron/expire-photos
Authorization: Bearer YOUR_CRON_SECRET
```

Try it by hand first (local server running):

```
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/expire-photos
```

It answers `{"deleted": 0}` when nothing is due. Pick one way to schedule it
once the app is on a public domain (a scheduler cannot reach `localhost`):

- **Vercel Cron**: add a cron entry for `/api/cron/expire-photos` in
  `vercel.json` and set `CRON_SECRET` in the project settings. Vercel sends the
  secret as the `Authorization` header.
- **Supabase pg_cron**: turn on the `pg_cron` and `pg_net` extensions in
  **Database > Extensions**, then run in the SQL Editor:

  ```sql
  select cron.schedule(
    'expire-photos',
    '0 * * * *',
    $$
      select net.http_get(
        url := 'https://YOUR-DOMAIN/api/cron/expire-photos',
        headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET')
      );
    $$
  );
  ```

## 6. Check that it worked

In the dashboard:

- **Table Editor** lists `profiles`, `customers`, `shops`, `shop_products`,
  `cargo_companies` and `orders`, each marked **RLS enabled**.
- **Storage** lists a `photos` bucket that is **not** public.

In the app:

1. Open `/register`, create an account, and log in.
2. Add a customer, a shop with a product photo, and an order.
3. Refresh: everything is still there. In **Table Editor**, the rows appear
   with your `user_id`, and `updated_at` changes when you edit a row.
4. Register a second account in a private window. It must not see the first
   account's data.

## 7. Give someone Gemini or Pro access

New accounts are `free` / `owner`. To let a manager read order screenshots with
Gemini, run in the SQL Editor:

```sql
update public.profiles
set plan = 'pro', role = 'manager'
where email = 'manager@example.com';
```

- `plan = 'pro'` unlocks **Keep photos for a month**.
- Gemini needs `plan = 'pro'` **and** `role = 'manager'`.

Plan and role cannot be changed from the app, only here.

## Troubleshooting

| Message | Cause |
|---|---|
| `Supabase is not set up` | `.env.local` is missing or the server was not restarted. |
| `relation "public.orders" does not exist` | The second SQL file was not run. |
| `new row violates row-level security policy` | You are signed out, or the table was created without its policies. |
| `Keeping photos longer is available on the Pro plan` | The account is not `pro` (step 7). |
| `Could not upload the photo` | The `photos` bucket or its policies are missing (step 3). |
| Login works but the profile is empty | The profile trigger did not run. Run the first SQL file again on a fresh project, or insert your row by hand. |
