-- Orders, customers, shops, products and cargo companies, one set per user.
--
-- Run AFTER 20261003000000_profiles.sql, in the Supabase dashboard:
-- SQL Editor > New query > paste > Run.
--
-- Every table has a user_id and row level security, so a signed-in user can
-- read and change only their own rows. updated_at is set by the database.

-- Shared trigger function (also created by the profiles migration).
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- customers
create table if not exists public.customers (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name           text not null,
  facebook_name  text not null default '',
  phone          text not null default '',
  address        text not null default '',
  other_contacts text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ------------------------------------------------------------------- shops
create table if not exists public.shops (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  owner_name  text not null default '',
  phone       text not null default '',
  location    text not null default '',
  note        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.shop_products (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  shop_id     uuid not null references public.shops (id) on delete cascade,
  name        text not null,
  price_thb   numeric(14, 2) not null default 0,
  note        text not null default '',          -- variants such as color and size
  image_path  text,                              -- file in the "photos" bucket
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------- cargo companies
create table if not exists public.cargo_companies (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  phone       text not null default '',
  location    text not null default '',
  note        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------------- orders
create table if not exists public.orders (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  order_number              text not null default '',
  customer_name             text not null default '',
  facebook_name             text not null default '',
  phone                     text not null default '',
  address                   text not null default '',

  order_status              text not null default 'not_bought'
    check (order_status in ('not_bought', 'bought', 'sent_cargo', 'delivered', 'returned', 'complete')),
  payment_status            text not null default 'not_paid'
    check (payment_status in ('not_paid', 'partially_paid', 'fully_paid', 'refunded')),

  customer_currency         text not null default 'MMK' check (customer_currency in ('THB', 'MMK')),
  exchange_rate_thb_to_mmk  numeric(14, 4) not null default 1,

  total_retailer_cost_thb       numeric(14, 2) not null default 0,
  total_customer_payable_thb    numeric(14, 2) not null default 0,
  total_paid_thb                numeric(14, 2) not null default 0,
  remaining_balance_thb         numeric(14, 2) not null default 0,
  profit_thb                    numeric(14, 2) not null default 0,

  product_name              text not null default '',
  product_size              text not null default '',
  product_color             text not null default '',
  product_description       text not null default '',
  quantity                  integer not null default 1 check (quantity > 0),
  retailer_unit_price_thb   numeric(14, 2) not null default 0,
  selling_unit_price_thb    numeric(14, 2) not null default 0,
  customer_message          text not null default '',
  retailer_name             text not null default '',
  source_type               text not null default 'customer_chat',

  product_photo_name        text not null default '',
  product_photo_path        text,                -- files in the "photos" bucket
  screenshot_path           text,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  unique (user_id, order_number)
);

-- Number orders ORD-0001, ORD-0002, ... per user when none is given.
create or replace function public.set_order_number()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.order_number is null or new.order_number = '' then
    -- One insert at a time per user, so two orders never get the same number.
    perform pg_advisory_xact_lock(hashtext(new.user_id::text));

    new.order_number := 'ORD-' || lpad(
      (
        coalesce(
          (
            select max(substring(o.order_number from 5)::integer)
            from public.orders o
            where o.user_id = new.user_id
              and o.order_number ~ '^ORD-[0-9]+$'
          ),
          0
        ) + 1
      )::text,
      4,
      '0'
    );
  end if;

  return new;
end;
$$;

create trigger orders_set_number
  before insert on public.orders
  for each row execute function public.set_order_number();

-- ----------------------------------------------- updated_at on every table
create trigger customers_touch_updated_at
  before update on public.customers
  for each row execute function public.touch_updated_at();

create trigger shops_touch_updated_at
  before update on public.shops
  for each row execute function public.touch_updated_at();

create trigger shop_products_touch_updated_at
  before update on public.shop_products
  for each row execute function public.touch_updated_at();

create trigger cargo_companies_touch_updated_at
  before update on public.cargo_companies
  for each row execute function public.touch_updated_at();

create trigger orders_touch_updated_at
  before update on public.orders
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------ indexes
create index if not exists customers_user_idx       on public.customers (user_id, created_at desc);
create index if not exists shops_user_idx           on public.shops (user_id, created_at desc);
create index if not exists shop_products_shop_idx   on public.shop_products (shop_id);
create index if not exists shop_products_user_idx   on public.shop_products (user_id);
create index if not exists cargo_companies_user_idx on public.cargo_companies (user_id, created_at desc);
create index if not exists orders_user_created_idx  on public.orders (user_id, created_at desc);

-- ------------------------------------------------- row level security (RLS)
alter table public.customers       enable row level security;
alter table public.shops           enable row level security;
alter table public.shop_products   enable row level security;
alter table public.cargo_companies enable row level security;
alter table public.orders          enable row level security;

create policy "Users manage their own customers"
  on public.customers for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own shops"
  on public.shops for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own shop products"
  on public.shop_products for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.shops s
      where s.id = shop_id and s.user_id = (select auth.uid())
    )
  );

create policy "Users manage their own cargo companies"
  on public.cargo_companies for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own orders"
  on public.orders for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ------------------------------------------------------ photo storage bucket
-- Private bucket. Files live at <user id>/orders/<id>.jpg and
-- <user id>/products/<id>.jpg, and only that user can touch them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Users read their own photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users upload their own photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users update their own photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete their own photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
