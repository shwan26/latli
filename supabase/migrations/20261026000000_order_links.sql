-- Orders point to their customer, shop, product and cargo company by id
-- instead of keeping a text copy of each. Deleting a row that orders still use
-- is refused (on delete no action).
--
-- Existing orders are backfilled: customers, shops, cargo companies and shop
-- products that only exist as text on orders get a real row first, then the
-- ids are set and the text columns are dropped.
--
-- orders.product_name stays, but only for an order that has no product row
-- (a product needs a shop). It is empty whenever product_id is set.

-- 1. Columns ------------------------------------------------------------------

alter table public.orders
  add column if not exists customer_id uuid references public.customers (id) on delete no action,
  add column if not exists shop_id     uuid references public.shops (id) on delete no action,
  add column if not exists cargo_id    uuid references public.cargo_companies (id) on delete no action,
  add column if not exists product_id  uuid references public.shop_products (id) on delete no action;

create index if not exists orders_customer_idx on public.orders (customer_id);
create index if not exists orders_shop_idx     on public.orders (shop_id);
create index if not exists orders_cargo_idx    on public.orders (cargo_id);
create index if not exists orders_product_idx  on public.orders (product_id);

-- 2. Backfill -----------------------------------------------------------------
-- A customer is identified by phone, else Facebook name, else name (the same
-- rule as getCustomerKey in the app).

create or replace function pg_temp.customer_key(p_name text, p_facebook text, p_phone text)
returns text language sql immutable as $$
  select coalesce(
    nullif(lower(trim(p_phone)), ''),
    nullif(lower(trim(p_facebook)), ''),
    nullif(lower(trim(p_name)), '')
  )
$$;

-- Customers that only exist on orders (the latest order's details win).
insert into public.customers (user_id, name, facebook_name, phone, address, other_contacts, created_at)
select distinct on (o.user_id, pg_temp.customer_key(o.customer_name, o.facebook_name, o.phone))
  o.user_id, o.customer_name, o.facebook_name, o.phone, o.address, '', o.created_at
from public.orders o
where pg_temp.customer_key(o.customer_name, o.facebook_name, o.phone) is not null
  and not exists (
    select 1 from public.customers c
    where c.user_id = o.user_id
      and pg_temp.customer_key(c.name, c.facebook_name, c.phone)
        = pg_temp.customer_key(o.customer_name, o.facebook_name, o.phone)
  )
order by o.user_id, pg_temp.customer_key(o.customer_name, o.facebook_name, o.phone), o.created_at desc;

update public.orders o
set customer_id = (
  select c.id from public.customers c
  where c.user_id = o.user_id
    and pg_temp.customer_key(c.name, c.facebook_name, c.phone)
      = pg_temp.customer_key(o.customer_name, o.facebook_name, o.phone)
  order by c.created_at
  limit 1
);

-- Shops.
insert into public.shops (user_id, name, created_at)
select distinct on (o.user_id, lower(trim(o.retailer_name)))
  o.user_id, trim(o.retailer_name), o.created_at
from public.orders o
where trim(o.retailer_name) <> ''
  and not exists (
    select 1 from public.shops s
    where s.user_id = o.user_id and lower(trim(s.name)) = lower(trim(o.retailer_name))
  )
order by o.user_id, lower(trim(o.retailer_name)), o.created_at;

update public.orders o
set shop_id = (
  select s.id from public.shops s
  where s.user_id = o.user_id and lower(trim(s.name)) = lower(trim(o.retailer_name))
  order by s.created_at
  limit 1
)
where trim(o.retailer_name) <> '';

-- Cargo companies.
insert into public.cargo_companies (user_id, name, created_at)
select distinct on (o.user_id, lower(trim(o.cargo_name)))
  o.user_id, trim(o.cargo_name), o.created_at
from public.orders o
where trim(o.cargo_name) <> ''
  and not exists (
    select 1 from public.cargo_companies g
    where g.user_id = o.user_id and lower(trim(g.name)) = lower(trim(o.cargo_name))
  )
order by o.user_id, lower(trim(o.cargo_name)), o.created_at;

update public.orders o
set cargo_id = (
  select g.id from public.cargo_companies g
  where g.user_id = o.user_id and lower(trim(g.name)) = lower(trim(o.cargo_name))
  order by g.created_at
  limit 1
)
where trim(o.cargo_name) <> '';

-- Products (only for orders that have a shop).
insert into public.shop_products (user_id, shop_id, name, price, note, created_at)
select distinct on (o.shop_id, lower(trim(o.product_name)))
  o.user_id, o.shop_id, trim(o.product_name), o.retailer_unit_price, o.product_size, o.created_at
from public.orders o
where o.shop_id is not null
  and trim(o.product_name) <> ''
  and not exists (
    select 1 from public.shop_products p
    where p.shop_id = o.shop_id and lower(trim(p.name)) = lower(trim(o.product_name))
  )
order by o.shop_id, lower(trim(o.product_name)), o.created_at desc;

update public.orders o
set product_id = (
  select p.id from public.shop_products p
  where p.shop_id = o.shop_id and lower(trim(p.name)) = lower(trim(o.product_name))
  order by p.created_at
  limit 1
)
where o.shop_id is not null and trim(o.product_name) <> '';

update public.orders set product_name = '' where product_id is not null;

-- 3. Drop the copies ----------------------------------------------------------

alter table public.orders
  drop column customer_name,
  drop column facebook_name,
  drop column phone,
  drop column address,
  drop column retailer_name,
  drop column cargo_name;

-- 4. Row level security -------------------------------------------------------
-- Every linked row must belong to the same user.

drop policy if exists "Users manage their own orders" on public.orders;

create policy "Users manage their own orders"
  on public.orders for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (customer_id is null or exists (
      select 1 from public.customers c where c.id = customer_id and c.user_id = (select auth.uid())))
    and (shop_id is null or exists (
      select 1 from public.shops s where s.id = shop_id and s.user_id = (select auth.uid())))
    and (cargo_id is null or exists (
      select 1 from public.cargo_companies g where g.id = cargo_id and g.user_id = (select auth.uid())))
    and (product_id is null or exists (
      select 1 from public.shop_products p where p.id = product_id and p.user_id = (select auth.uid())))
  );

notify pgrst, 'reload schema';
