-- Fixes the warnings from the Supabase Security Advisor (database linter).
--
-- Run AFTER 20261003020000_photo_retention.sql: SQL Editor > New query >
-- paste > Run. Safe to run once on a project that already has the first three
-- files.

-- ------------------------------------------------------------------ 1
-- Trigger functions run on their own when a row changes. Nobody needs to call
-- them over the API, so remove the right to run them directly. Triggers keep
-- working without it.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.register_order_photo_expiry() from public, anon, authenticated;
revoke execute on function public.register_product_photo_expiry() from public, anon, authenticated;

-- ------------------------------------------------------------------ 2
-- "Keep photos for a month" no longer needs SECURITY DEFINER. Instead of
-- bypassing the security rules, the function now runs as the signed-in user and
-- the rules below allow exactly one change: a Pro user pushing the date of one
-- of their own photos out, to at most 30 days from now.
grant update (expires_at) on public.photo_expiry to authenticated;

drop policy if exists "Pro users extend their own photo expiry" on public.photo_expiry;

create policy "Pro users extend their own photo expiry"
  on public.photo_expiry for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and expires_at > now()
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.plan = 'pro'
    )
  )
  with check (
    (select auth.uid()) = user_id
    and expires_at <= now() + interval '30 days' + interval '1 minute'
  );

create or replace function public.keep_photos_longer(photo_paths text[])
returns timestamptz
language plpgsql
security invoker
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

  -- The policy above also limits this to the caller's own, unexpired photos.
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
