-- Photo retention: Free accounts keep photos for 90 days after they are saved,
-- Pro accounts for 6 months. The date is set when the photo is saved.
--
-- A plan change moves the dates of photos that are already saved:
--   - Free -> Pro: photos are kept until 6 months after they were saved.
--   - Pro -> Free: photos that would last longer than 90 days from now are
--     deleted 90 days from now (that is the notice).
--
-- The "Keep photos for 3 months" button is gone: Pro photos already last 6
-- months.
--
-- Run AFTER 20261022000000_ai_usage.sql: SQL Editor > New query > paste > Run,
-- once.

-- 1. New photos get their date from the plan --------------------------------

create or replace function public.photo_expiry_for(uid uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select now() + case
    when exists (
      select 1 from public.profiles where id = uid and plan = 'pro'
    ) then interval '6 months'
    else interval '90 days'
  end;
$$;

revoke all on function public.photo_expiry_for(uuid) from public, anon, authenticated;

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
    values (new.product_photo_path, new.user_id, public.photo_expiry_for(new.user_id))
    on conflict (path) do nothing;
  end if;

  if new.screenshot_path is not null
     and new.screenshot_path like new.user_id::text || '/%' then
    insert into public.photo_expiry (path, user_id, expires_at)
    values (new.screenshot_path, new.user_id, public.photo_expiry_for(new.user_id))
    on conflict (path) do nothing;
  end if;

  return new;
end;
$$;

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
    values (new.image_path, new.user_id, public.photo_expiry_for(new.user_id))
    on conflict (path) do nothing;
  end if;

  return new;
end;
$$;

revoke execute on function public.register_order_photo_expiry() from public, anon, authenticated;
revoke execute on function public.register_product_photo_expiry() from public, anon, authenticated;

-- 2. A plan change moves the dates ------------------------------------------

create or replace function public.sync_photo_expiry_on_plan_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.plan = 'pro' and old.plan is distinct from 'pro' then
    update public.photo_expiry
    set expires_at = greatest(expires_at, created_at + interval '6 months')
    where user_id = new.id and expires_at > now();
  elsif new.plan <> 'pro' and old.plan = 'pro' then
    update public.photo_expiry
    set expires_at = now() + interval '90 days'
    where user_id = new.id and expires_at > now() + interval '90 days';
  end if;

  return new;
end;
$$;

revoke execute on function public.sync_photo_expiry_on_plan_change() from public, anon, authenticated;

drop trigger if exists profiles_sync_photo_expiry on public.profiles;

create trigger profiles_sync_photo_expiry
  after update of plan on public.profiles
  for each row execute function public.sync_photo_expiry_on_plan_change();

-- 3. Photos that are saved already ------------------------------------------

update public.photo_expiry e
set expires_at = greatest(
  e.expires_at,
  e.created_at + case
    when exists (
      select 1 from public.profiles p where p.id = e.user_id and p.plan = 'pro'
    ) then interval '6 months'
    else interval '90 days'
  end
)
where e.expires_at > now();

-- 4. No more "Keep photos for 3 months" -------------------------------------

drop function if exists public.keep_photos_longer(text[]);
drop policy if exists "Pro users extend their own photo expiry" on public.photo_expiry;
revoke update on public.photo_expiry from authenticated;

-- Make the API pick up the changes right away.
notify pgrst, 'reload schema';
