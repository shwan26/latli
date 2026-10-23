-- Slim down orders now that they point to a shop product (product_id).
--
-- * The product name, size, color and description are read from shop_products
--   (name, note), and the shop through the product, so the copies go.
-- * An order keeps only totals: total_retailer_price (product price x
--   quantity, saved when the order is made) and total_selling_price (typed by
--   the user, so it can include delivery and so on). Profit is computed.
-- * Second currency, exchange rate, paid/remaining amounts, unit prices and
--   source type are dropped. payment_status stays.

-- 1. Give every order that has a product name a product row -------------------
-- A product needs a shop, so orders without one use a "No shop" shop.

insert into public.shops (user_id, name)
select distinct o.user_id, 'No shop'
from public.orders o
where o.product_id is null
  and trim(o.product_name) <> ''
  and o.shop_id is null
  and not exists (
    select 1 from public.shops s
    where s.user_id = o.user_id and lower(trim(s.name)) = 'no shop'
  );

update public.orders o
set shop_id = (
  select s.id from public.shops s
  where s.user_id = o.user_id and lower(trim(s.name)) = 'no shop'
  order by s.created_at
  limit 1
)
where o.product_id is null
  and trim(o.product_name) <> ''
  and o.shop_id is null;

insert into public.shop_products (user_id, shop_id, name, price, note, created_at)
select distinct on (o.shop_id, lower(trim(o.product_name)))
  o.user_id, o.shop_id, trim(o.product_name), o.retailer_unit_price,
  trim(concat_ws(' ', nullif(trim(o.product_size), ''), nullif(trim(o.product_color), ''))),
  o.created_at
from public.orders o
where o.product_id is null
  and o.shop_id is not null
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
where o.product_id is null
  and o.shop_id is not null
  and trim(o.product_name) <> '';

-- 2. Totals --------------------------------------------------------------------

alter table public.orders rename column total_retailer_cost to total_retailer_price;
alter table public.orders rename column total_customer_payable to total_selling_price;

-- 3. Row level security without shop_id ------------------------------------------

drop policy if exists "Users manage their own orders" on public.orders;

create policy "Users manage their own orders"
  on public.orders for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (customer_id is null or exists (
      select 1 from public.customers c where c.id = customer_id and c.user_id = (select auth.uid())))
    and (cargo_id is null or exists (
      select 1 from public.cargo_companies g where g.id = cargo_id and g.user_id = (select auth.uid())))
    and (product_id is null or exists (
      select 1 from public.shop_products p where p.id = product_id and p.user_id = (select auth.uid())))
  );

-- 4. Drop what is no longer needed ----------------------------------------------

drop index if exists public.orders_shop_idx;

alter table public.orders
  drop constraint if exists orders_customer_currency_check,
  drop column if exists customer_currency,
  drop column if exists exchange_rate,
  drop column if exists total_paid,
  drop column if exists remaining_balance,
  drop column if exists profit,
  drop column if exists retailer_unit_price,
  drop column if exists selling_unit_price,
  drop column if exists source_type,
  drop column if exists product_name,
  drop column if exists product_size,
  drop column if exists product_color,
  drop column if exists product_description,
  drop column if exists shop_id;

notify pgrst, 'reload schema';
