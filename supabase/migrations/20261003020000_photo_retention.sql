-- Photo retention: every photo is deleted 7 days after it is saved. Pro
-- accounts can press "Keep for a month" to push the date to 30 days from that
-- click, and can press it again later to extend it again.
--
-- Run AFTER 20261003010000_app_data.sql: SQL Editor > New query > paste > Run.
--
-- Expiry dates live in their own table that users can read but never write,
-- so nobody can extend their own photos from the browser. Only the functions
-- below can change them.

create table if not exists public.photo_expiry (
  path        text primary key,                       -- file in the "photos" bucket
  user_id     uuid not null references auth.users (id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create index if not exists photo_expiry_due_idx on public.photo_expiry (expires_at);

alter table public.photo_expiry enable row level security;

create policy "Users read their own photo expiry"
  on public.photo_expiry for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- No insert, update or delete policy, and no table privileges to write.
revoke all on public.photo_expiry from anon, authenticated;
grant select on public.photo_expiry to authenticated;

-- ------------------------------------------- start the 7-day clock on save
create or replace function public.register_order_photo_expiry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only paths inside the owner's own storage folder are tracked.
  if new.product_photo_path is not null
     and new.product_photo_path like new.user_id::text || '/%' then
    insert into public.photo_expiry (path, user_id, expires_at)
    values (new.product_photo_path, new.user_id, now() + interval '7 days')
    on conflict (path) do nothing;
  end if;

  if new.screenshot_path is not null
     and new.screenshot_path like new.user_id::text || '/%' then
    insert into public.photo_expiry (path, user_id, expires_at)
    values (new.screenshot_path, new.user_id, now() + interval '7 days')
    on conflict (path) do nothing;
  end if;

  return new;
end;
$$;

create trigger orders_register_photo_expiry
  after insert or update of product_photo_path, screenshot_path on public.orders
  for each row execute function public.register_order_photo_expiry();

create or replace function public.register_product_photo_expiry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.image_path is not null
     and new.image_path like new.user_id::text || '/%' then
    insert into public.photo_expiry (path, user_id, expires_at)
    values (new.image_path, new.user_id, now() + interval '7 days')
    on conflict (path) do nothing;
  end if;

  return new;
end;
$$;

create trigger shop_products_register_photo_expiry
  after insert or update of image_path on public.shop_products
  for each row execute function public.register_product_photo_expiry();

-- Photos that were saved before this migration get 7 days from now.
insert into public.photo_expiry (path, user_id, expires_at)
select p, user_id, now() + interval '7 days'
from (
  select user_id, product_photo_path as p from public.orders where product_photo_path is not null
  union
  select user_id, screenshot_path from public.orders where screenshot_path is not null
  union
  select user_id, image_path from public.shop_products where image_path is not null
) existing
where p like user_id::text || '/%'
on conflict (path) do nothing;

-- ------------------------------------------ "Keep for a month" (Pro only)
create or replace function public.keep_photos_longer(photo_paths text[])
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_expiry timestamptz := now() + interval '30 days';
begin
  if (select auth.uid()) is null then
    raise exception 'Log in to keep photos longer.';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and plan = 'pro'
  ) then
    raise exception 'Keeping photos longer is available on the Pro plan.';
  end if;

  -- Only the caller's own photos that have not been deleted yet.
  update public.photo_expiry
  set expires_at = greatest(expires_at, new_expiry)
  where user_id = (select auth.uid())
    and path = any (photo_paths)
    and expires_at > now();

  return new_expiry;
end;
$$;

revoke all on function public.keep_photos_longer(text[]) from public, anon;
grant execute on function public.keep_photos_longer(text[]) to authenticated;

-- --------------------------------- clean-up, called by the scheduled job
-- Only the service role may call these (the /api/cron/expire-photos route).
create or replace function public.expired_photo_paths(max_rows integer default 500)
returns setof text
language sql
security definer
set search_path = ''
as $$
  select path
  from public.photo_expiry
  where expires_at <= now()
  order by expires_at
  limit max_rows;
$$;

-- Run after the files are removed from Storage: forget the paths.
create or replace function public.clear_expired_photos(photo_paths text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.orders set product_photo_path = null where product_photo_path = any (photo_paths);
  update public.orders set screenshot_path = null where screenshot_path = any (photo_paths);
  update public.shop_products set image_path = null where image_path = any (photo_paths);
  delete from public.photo_expiry where path = any (photo_paths);
end;
$$;

revoke all on function public.expired_photo_paths(integer) from public, anon, authenticated;
revoke all on function public.clear_expired_photos(text[]) from public, anon, authenticated;
grant execute on function public.expired_photo_paths(integer) to service_role;
grant execute on function public.clear_expired_photos(text[]) to service_role;
