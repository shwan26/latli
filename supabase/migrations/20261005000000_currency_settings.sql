-- Currency settings.
--
-- Every user picks a primary (base) currency in Settings. Until they do, it is
-- MMK. Pro users can also pick a second
-- currency and a default exchange rate (1 base = N second). Free users have
-- one currency only, which the database enforces below.
--
-- The money columns on orders are still named *_thb and the rate column is
-- still named exchange_rate_thb_to_mmk. These names are legacy: the *_thb
-- columns hold amounts in the order's base_currency, and the rate means
-- "1 base_currency = N customer_currency".
--
-- Run in SQL Editor > New query > paste > Run, once.

-- 1. Profiles ---------------------------------------------------------------

alter table public.profiles
  add column if not exists base_currency text not null default 'MMK',
  add column if not exists secondary_currency text,
  add column if not exists default_exchange_rate numeric(14,4);

alter table public.profiles
  add constraint profiles_base_currency_check
    check (base_currency in ('THB','MMK','USD','SGD','CNY','MYR','JPY')),
  add constraint profiles_secondary_currency_check
    check (secondary_currency is null
      or secondary_currency in ('THB','MMK','USD','SGD','CNY','MYR','JPY')),
  add constraint profiles_currencies_differ_check
    check (secondary_currency is null or secondary_currency <> base_currency),
  add constraint profiles_default_rate_check
    check (default_exchange_rate is null or default_exchange_rate > 0);

grant update (base_currency, secondary_currency, default_exchange_rate)
  on public.profiles to authenticated;

-- Only Pro accounts may have a second currency. Plan is changed from the
-- dashboard, so a downgraded account simply keeps the stored value, and the
-- app ignores it.
create or replace function public.enforce_second_currency_is_pro()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.secondary_currency is not null
     and new.plan <> 'pro'
     and new.secondary_currency is distinct from old.secondary_currency then
    raise exception 'A second currency is available on the Pro plan.';
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_second_currency_is_pro() from public, anon, authenticated;

drop trigger if exists profiles_second_currency_is_pro on public.profiles;
create trigger profiles_second_currency_is_pro
  before update on public.profiles
  for each row execute function public.enforce_second_currency_is_pro();

-- 2. Orders -----------------------------------------------------------------

-- Orders made before this migration were priced in THB, so existing rows (and
-- this column default) stay THB. The app always writes the user's primary
-- currency explicitly on new orders.
alter table public.orders
  add column if not exists base_currency text not null default 'THB';

alter table public.orders
  drop constraint if exists orders_customer_currency_check;

alter table public.orders
  add constraint orders_customer_currency_check
    check (customer_currency in ('THB','MMK','USD','SGD','CNY','MYR','JPY')),
  add constraint orders_base_currency_check
    check (base_currency in ('THB','MMK','USD','SGD','CNY','MYR','JPY'));

-- Make the API pick up the new columns right away.
notify pgrst, 'reload schema';
