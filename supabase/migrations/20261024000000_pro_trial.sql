-- 14-day Pro trial for every new account, and automatic downgrade when Pro ends.
--
-- New sign-ups start on Pro with plan_expires_at 14 days from now. When
-- plan_expires_at passes, expire_pro_plans() moves the account back to Free.
-- The existing photo retention trigger handles the plan change. Accounts that
-- already exist are not changed, except Pro accounts that have an end date in
-- the past: they go back to Free the next time the job runs.
--
-- Run in SQL Editor > New query > paste > Run, once.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles
    (id, email, shop_name, owner_name, age, gender, terms_accepted_at,
     plan, plan_expires_at)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'shop_name', ''),
    coalesce(new.raw_user_meta_data ->> 'owner_name', ''),
    case
      when new.raw_user_meta_data ->> 'age' ~ '^[0-9]{1,3}$'
        then (new.raw_user_meta_data ->> 'age')::integer
    end,
    nullif(new.raw_user_meta_data ->> 'gender', ''),
    case
      when new.raw_user_meta_data ->> 'terms_accepted' = 'true' then now()
    end,
    'pro',
    now() + interval '14 days'
  );
  return new;
end;
$$;

create or replace function public.expire_pro_plans()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  update public.profiles
  set plan = 'free'
  where plan = 'pro'
    and plan_expires_at is not null
    and plan_expires_at < now();
  get diagnostics changed = row_count;
  return changed;
end;
$$;

-- Only the scheduled job (and the SQL Editor) may run it.
revoke all on function public.expire_pro_plans() from public, anon, authenticated;

-- Run it every hour. pg_cron is available on Supabase (Database > Extensions).
create extension if not exists pg_cron;

select cron.unschedule(jobid) from cron.job where jobname = 'expire-pro-plans';
select cron.schedule('expire-pro-plans', '0 * * * *', 'select public.expire_pro_plans()');

notify pgrst, 'reload schema';
