-- Pro accounts can now keep photos for 3 months instead of 30 days.
-- Changes the limit in the policy and in the "Keep photos" function.
-- Photos already kept for 30 days stay as they are until the button is pressed again.

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
    and expires_at <= now() + interval '3 months' + interval '1 minute'
  );

create or replace function public.keep_photos_longer(photo_paths text[])
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_expiry timestamptz := now() + interval '3 months';
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
