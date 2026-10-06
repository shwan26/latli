-- Pro subscription expiry date.
--
-- Shown on the More page for Pro accounts. It is only a date to display: the
-- app does not downgrade an account when it passes. Like plan and role, users
-- cannot change it (update on profiles is limited to a few columns), so set it
-- here:
--   update public.profiles
--   set plan = 'pro', plan_expires_at = '2026-12-31'
--   where email = 'owner@example.com';
--
-- Run in SQL Editor > New query > paste > Run, once.

alter table public.profiles
  add column if not exists plan_expires_at timestamptz;

-- Make the API pick up the new column right away.
notify pgrst, 'reload schema';
