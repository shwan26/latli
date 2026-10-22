-- AI screenshot reads per month.
--
-- Reading a chat screenshot with Gemini is open to every account. Every read
-- is counted per calendar month (UTC) so the app can show how many a shop has
-- used. Free accounts get 10 reads per month, Pro accounts are not limited.
-- consume_ai_read() takes one read and refuses once the Free limit is used, in
-- a single statement so two requests at the same time cannot get past it.
-- refund_ai_read() gives one back when Gemini fails.
--
-- Run AFTER 20261016000000_photo_keep_3_months.sql: SQL Editor > New query >
-- paste > Run, once.

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  month   date not null,
  used    integer not null default 0 check (used >= 0),
  primary key (user_id, month)
);

alter table public.ai_usage enable row level security;

-- Users can read their own count. Only the functions below change it.
create policy "Users read their own AI usage"
  on public.ai_usage for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.ai_usage from anon, authenticated;
grant select on public.ai_usage to authenticated;

-- Reads used this month, and the limit. max is null for Pro (no limit).
create or replace function public.ai_quota()
returns table (used integer, max integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce((
      select u.used from public.ai_usage u
      where u.user_id = (select auth.uid())
        and u.month = date_trunc('month', now() at time zone 'utc')::date
    ), 0),
    case
      when exists (
        select 1 from public.profiles
        where id = (select auth.uid()) and plan = 'pro'
      ) then null
      else 10
    end;
$$;

-- Takes one read. allowed is false when a Free account has used all 10.
create or replace function public.consume_ai_read()
returns table (allowed boolean, used integer, max integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  this_month date := date_trunc('month', now() at time zone 'utc')::date;
  is_pro boolean;
  new_used integer;
begin
  if uid is null then
    return query select false, 0, 10;
    return;
  end if;

  select p.plan = 'pro' into is_pro from public.profiles p where p.id = uid;
  is_pro := coalesce(is_pro, false);

  insert into public.ai_usage as u (user_id, month, used)
  values (uid, this_month, 1)
  on conflict (user_id, month) do update
    set used = u.used + 1
    where is_pro or u.used < 10
  returning u.used into new_used;

  if new_used is null then
    -- The conflict update was skipped: the Free limit is used up.
    return query
      select false,
             (select u.used from public.ai_usage u
              where u.user_id = uid and u.month = this_month),
             10;
  else
    return query select true, new_used, case when is_pro then null else 10 end;
  end if;
end;
$$;

-- Gives one read back after a failed Gemini call.
create or replace function public.refund_ai_read()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ai_usage
  set used = greatest(used - 1, 0)
  where user_id = (select auth.uid())
    and month = date_trunc('month', now() at time zone 'utc')::date;
$$;

revoke all on function public.ai_quota() from public, anon;
revoke all on function public.consume_ai_read() from public, anon;
revoke all on function public.refund_ai_read() from public, anon;
grant execute on function public.ai_quota() to authenticated;
grant execute on function public.consume_ai_read() to authenticated;
grant execute on function public.refund_ai_read() to authenticated;

-- Make the API pick up the new functions right away.
notify pgrst, 'reload schema';
