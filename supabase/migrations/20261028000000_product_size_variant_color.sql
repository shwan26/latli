-- A shop product keeps its size, variant and color in their own columns
-- instead of one free-text note. The old note text (which held the variants,
-- such as "Black, White / S, M, L") is moved into variant.

alter table public.shop_products
  add column if not exists size    text not null default '',
  add column if not exists variant text not null default '',
  add column if not exists color   text not null default '';

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shop_products' and column_name = 'note'
  ) then
    update public.shop_products set variant = note where variant = '';
    alter table public.shop_products drop column note;
  end if;
end $$;

notify pgrst, 'reload schema';
