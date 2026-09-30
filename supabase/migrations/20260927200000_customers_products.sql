-- Customers and products for the signed-in user.
-- Run once: Supabase → SQL Editor → New query → paste this file → Run.
-- A user only sees their own rows. An invoice copies the chosen values
-- onto itself, so later edits here do not change a sent invoice.

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  business_id text,
  address text,
  postal_code text,
  city text,
  country text not null default 'Suomi',
  email text,
  phone text,
  created_at timestamptz not null default now(),
  constraint customers_name_length check (char_length(btrim(name)) between 1 and 200),
  constraint customers_business_id check (
    business_id is null or business_id ~ '^\d{7}-\d$'
  )
);

create index if not exists customers_user_name_idx
  on public.customers (user_id, name);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  unit_price_cents integer not null,
  vat_rate numeric(4, 1) not null,
  unit text not null default 'kpl',
  created_at timestamptz not null default now(),
  constraint products_name_length check (char_length(btrim(name)) between 1 and 200),
  constraint products_price_nonnegative check (unit_price_cents >= 0),
  constraint products_vat_rate check (vat_rate in (25.5, 14, 10, 0)),
  constraint products_unit_length check (char_length(btrim(unit)) between 1 and 16)
);

create index if not exists products_user_name_idx
  on public.products (user_id, name);

-- Whether this company charges VAT. Products default to 25.5% when this is true.
alter table public.company_settings
  add column if not exists vat_registered boolean not null default true;

alter table public.customers enable row level security;
alter table public.products enable row level security;

drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists customers_delete on public.customers;
create policy customers_delete on public.customers
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists products_insert on public.products;
create policy products_insert on public.products
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists products_update on public.products;
create policy products_update on public.products
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists products_delete on public.products;
create policy products_delete on public.products
  for delete to authenticated
  using (user_id = auth.uid());

revoke all on table public.customers from public, anon;
revoke all on table public.products from public, anon;
grant select, insert, update, delete on table public.customers to authenticated;
grant select, insert, update, delete on table public.products to authenticated;
