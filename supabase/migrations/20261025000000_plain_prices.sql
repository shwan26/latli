-- Orders and shop products store plain prices. The currency lives only on the
-- profile (profiles.base_currency); changing it in Settings relabels the
-- dashboard and never touches the stored amounts, so no conversion is needed.
--
-- Renames the legacy *_thb columns to neutral names and drops the per-order
-- base_currency. customer_currency and exchange_rate are kept for orders with
-- a second currency (exchange_rate = 1 means no second currency).

do $$
declare
  pair text[];
begin
  foreach pair slice 1 in array array[
    array['orders', 'total_retailer_cost_thb', 'total_retailer_cost'],
    array['orders', 'total_customer_payable_thb', 'total_customer_payable'],
    array['orders', 'total_paid_thb', 'total_paid'],
    array['orders', 'remaining_balance_thb', 'remaining_balance'],
    array['orders', 'profit_thb', 'profit'],
    array['orders', 'retailer_unit_price_thb', 'retailer_unit_price'],
    array['orders', 'selling_unit_price_thb', 'selling_unit_price'],
    array['orders', 'exchange_rate_thb_to_mmk', 'exchange_rate'],
    array['shop_products', 'price_thb', 'price']
  ]
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = pair[1] and column_name = pair[2]
    ) then
      execute format('alter table public.%I rename column %I to %I', pair[1], pair[2], pair[3]);
    end if;
  end loop;
end $$;

alter table public.orders
  drop constraint if exists orders_base_currency_check;

alter table public.orders
  drop column if exists base_currency;

-- Make the API pick up the renamed columns right away.
notify pgrst, 'reload schema';
