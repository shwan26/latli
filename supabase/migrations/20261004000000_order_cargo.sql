-- Which cargo company carries an order. Stored as the company's name, like
-- retailer_name, so old orders keep working.
--
-- Run in SQL Editor > New query > paste > Run, once.

alter table public.orders
  add column if not exists cargo_name text not null default '';
