-- Photo limits and clean-up of photos that were never linked to anything.
--
-- Each file is at most 5 MB (the bucket already enforces it). Each account can
-- keep 30 photos on the Free plan and 150 on Pro. The count is the files that
-- are in storage right now, so photos deleted by the 7-day / 30-day clean-up
-- free up room.
--
-- A file that was uploaded but never saved on an order or product has no row in
-- photo_expiry, so the expiry job never saw it. orphan_photo_paths() lists
-- those files (older than a day) so /api/cron/expire-photos can delete them.
--
-- Run AFTER 20261003030000_security_fixes.sql: SQL Editor > New query > paste >
-- Run, once.

-- 1. Limits -----------------------------------------------------------------

create or replace function public.photo_limit()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select case
    when exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and plan = 'pro'
    ) then 150
    else 30
  end;
$$;

-- Counts the signed-in user's own files (the select rule on storage.objects
-- already hides everyone else's).
create or replace function public.photo_count()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::integer
  from storage.objects
  where bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text;
$$;

-- For the app: how many photos are used and how many are allowed.
create or replace function public.photo_quota()
returns table (used integer, max integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select public.photo_count(), public.photo_limit();
$$;

revoke all on function public.photo_limit() from public, anon;
revoke all on function public.photo_count() from public, anon;
revoke all on function public.photo_quota() from public, anon;
grant execute on function public.photo_limit() to authenticated;
grant execute on function public.photo_count() to authenticated;
grant execute on function public.photo_quota() to authenticated;

-- The upload rule now also refuses a new file once the limit is reached.
drop policy if exists "Users upload their own photos" on storage.objects;

create policy "Users upload their own photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.photo_count() < public.photo_limit()
  );

-- 2. Orphan clean-up --------------------------------------------------------

-- Files in the photos bucket with no photo_expiry row, older than a day (so a
-- photo is not removed between the upload and the save of its order). Only the
-- scheduled job (service role) can call this. It removes the files through the
-- Storage API, not from here.
create or replace function public.orphan_photo_paths(
  older_than interval default interval '1 day',
  max_rows integer default 500
)
returns setof text
language sql
security definer
set search_path = ''
as $$
  select o.name
  from storage.objects o
  where o.bucket_id = 'photos'
    and o.created_at < now() - older_than
    and not exists (
      select 1 from public.photo_expiry e where e.path = o.name
    )
  order by o.created_at
  limit max_rows;
$$;

revoke all on function public.orphan_photo_paths(interval, integer) from public, anon, authenticated;
grant execute on function public.orphan_photo_paths(interval, integer) to service_role;

-- Make the API pick up the new functions right away.
notify pgrst, 'reload schema';
