-- Shop profile for each Supabase Auth user.
--
-- Run this once in the Supabase dashboard: SQL Editor > New query > paste > Run.
-- (Or with the Supabase CLI: supabase db push.)

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  shop_name   text not null default '',
  owner_name  text not null default '',
  email       text not null default '',
  phone       text not null default '',
  address     text not null default '',
  age         integer check (age between 13 and 120),
  gender      text check (gender in ('female', 'male', 'other', 'prefer_not_to_say')),
  terms_accepted_at timestamptz,
  plan        text not null default 'free'  check (plan in ('free', 'pro')),
  role        text not null default 'owner' check (role in ('owner', 'manager', 'staff')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A user can read and edit only their own profile. There is no insert or
-- delete policy: the row is created by the trigger below.
create policy "Users read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Users may change shop details but never their plan or role. Those are set
-- from the dashboard (Table Editor) or with the service role.
revoke update on public.profiles from authenticated, anon;
grant update (shop_name, owner_name, phone, address, age, gender) on public.profiles to authenticated;

-- Create the profile when someone registers. The details come from the
-- sign-up form (user metadata). The time the Terms and Privacy Policy were
-- accepted is set here by the database, not by the browser.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles
    (id, email, shop_name, owner_name, age, gender, terms_accepted_at)
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
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Give existing auth users (created before this migration) a profile.
insert into public.profiles (id, email, shop_name, owner_name)
select
  id,
  coalesce(email, ''),
  coalesce(raw_user_meta_data ->> 'shop_name', ''),
  coalesce(raw_user_meta_data ->> 'owner_name', '')
from auth.users
on conflict (id) do nothing;

-- To make someone a manager on the Pro plan (SQL Editor):
--   update public.profiles set plan = 'pro', role = 'manager'
--   where email = 'manager@example.com';
