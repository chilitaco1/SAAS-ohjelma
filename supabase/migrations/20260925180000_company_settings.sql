-- Seller details for Finnish invoices.
--
-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- There was no profiles or company_settings table. This creates one row per
-- user and copies those details onto an invoice when it is published, so a
-- later change on the Yritys page does not rewrite an issued invoice.

create table if not exists public.company_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  company_name text,
  y_tunus text,
  iban text,
  bic_swift text,
  billing_address text,
  updated_at timestamptz not null default now()
);

alter table public.company_settings enable row level security;

drop policy if exists company_settings_select on public.company_settings;
create policy company_settings_select on public.company_settings
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists company_settings_insert on public.company_settings;
create policy company_settings_insert on public.company_settings
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists company_settings_update on public.company_settings;
create policy company_settings_update on public.company_settings
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on table public.company_settings from public, anon;
grant select, insert, update on table public.company_settings to authenticated;

-- Frozen seller block stored on the invoice itself.
alter table public.invoices add column if not exists seller_company_name text;
alter table public.invoices add column if not exists seller_y_tunus text;
alter table public.invoices add column if not exists seller_iban text;
alter table public.invoices add column if not exists seller_bic_swift text;
alter table public.invoices add column if not exists seller_billing_address text;

-- Issued invoices stay immutable, except two cases already allowed:
-- status sent → paid / canceled, and filling seller columns once when they
-- are still empty (invoices published before this migration).
create or replace function public.protect_issued_invoice()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.status in ('sent', 'paid', 'canceled') then
      raise exception 'Julkaistua laskua ei voi poistaa. Tee hyvityslasku.';
    end if;
    return old;
  end if;

  if old.status in ('sent', 'paid', 'canceled') then
    if old.status = 'sent'
      and new.status in ('paid', 'canceled')
      and new.user_id is not distinct from old.user_id
      and new.invoice_number is not distinct from old.invoice_number
      and new.issue_date is not distinct from old.issue_date
      and new.due_date is not distinct from old.due_date
      and new.payment_terms_days is not distinct from old.payment_terms_days
      and new.interest_rate is not distinct from old.interest_rate
      and new.delivery_date is not distinct from old.delivery_date
      and new.customer_name is not distinct from old.customer_name
      and new.customer_y_tunus is not distinct from old.customer_y_tunus
      and new.customer_address is not distinct from old.customer_address
      and new.customer_email is not distinct from old.customer_email
      and new.reference_number is not distinct from old.reference_number
      and new.subtotal_excluding_vat is not distinct from old.subtotal_excluding_vat
      and new.total_including_vat is not distinct from old.total_including_vat
      and new.seller_company_name is not distinct from old.seller_company_name
      and new.seller_y_tunus is not distinct from old.seller_y_tunus
      and new.seller_iban is not distinct from old.seller_iban
      and new.seller_bic_swift is not distinct from old.seller_bic_swift
      and new.seller_billing_address is not distinct from old.seller_billing_address
      and new.created_at is not distinct from old.created_at
    then
      return new;
    end if;

    -- One-time copy of company settings onto an invoice that was issued
    -- before seller columns existed. No amounts or parties change.
    if old.seller_company_name is null
      and new.status is not distinct from old.status
      and new.user_id is not distinct from old.user_id
      and new.invoice_number is not distinct from old.invoice_number
      and new.issue_date is not distinct from old.issue_date
      and new.due_date is not distinct from old.due_date
      and new.payment_terms_days is not distinct from old.payment_terms_days
      and new.interest_rate is not distinct from old.interest_rate
      and new.delivery_date is not distinct from old.delivery_date
      and new.customer_name is not distinct from old.customer_name
      and new.customer_y_tunus is not distinct from old.customer_y_tunus
      and new.customer_address is not distinct from old.customer_address
      and new.customer_email is not distinct from old.customer_email
      and new.reference_number is not distinct from old.reference_number
      and new.subtotal_excluding_vat is not distinct from old.subtotal_excluding_vat
      and new.total_including_vat is not distinct from old.total_including_vat
      and new.created_at is not distinct from old.created_at
    then
      return new;
    end if;

    raise exception 'Julkaistua laskua ei voi muokata. Tee hyvityslasku.';
  end if;

  if new.status <> 'draft' or new.invoice_number is not null then
    if current_setting('selko.publishing_invoice', true) is distinct from old.id::text then
      raise exception 'Laskunumero annetaan vain julkaisemalla lasku.';
    end if;
  end if;

  return new;
end;
$$;

-- Copies the current company row onto issued invoices that do not have one yet.
create or replace function public.attach_seller_snapshot()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company public.company_settings%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Kirjaudu sisään.';
  end if;

  select * into v_company
  from public.company_settings
  where user_id = auth.uid();

  if not found then
    return;
  end if;

  update public.invoices
  set
    seller_company_name = nullif(btrim(v_company.company_name), ''),
    seller_y_tunus = nullif(btrim(v_company.y_tunus), ''),
    seller_iban = nullif(btrim(v_company.iban), ''),
    seller_bic_swift = nullif(btrim(v_company.bic_swift), ''),
    seller_billing_address = nullif(btrim(v_company.billing_address), '')
  where user_id = auth.uid()
    and status <> 'draft'
    and seller_company_name is null;
end;
$$;

-- Same publish as before, plus a copy of the seller block.
create or replace function public.publish_invoice(p_id uuid)
returns table (id uuid, invoice_number text, reference_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices%rowtype;
  v_company public.company_settings%rowtype;
  v_next bigint;
  v_number text;
  v_reference text;
begin
  if auth.uid() is null then
    raise exception 'Kirjaudu sisään ennen laskun julkaisemista.';
  end if;

  select * into v_invoice
  from public.invoices
  where invoices.id = p_id
  for update;

  if not found or v_invoice.user_id <> auth.uid() then
    raise exception 'Laskua ei löydy.';
  end if;

  if v_invoice.status <> 'draft' then
    raise exception 'Vain luonnoksen voi julkaista.';
  end if;

  if v_invoice.issue_date is null then
    raise exception 'Ennen julkaisua: lisää laskun päivä.';
  end if;

  if v_invoice.payment_terms_days is null or v_invoice.due_date is null then
    raise exception 'Ennen julkaisua: lisää maksuehto.';
  end if;

  if v_invoice.interest_rate is null then
    raise exception 'Ennen julkaisua: lisää viivästyskorko (0 jos et peri korkoa).';
  end if;

  if v_invoice.customer_name is null or btrim(v_invoice.customer_name) = '' then
    raise exception 'Ennen julkaisua: lisää asiakkaan nimi.';
  end if;

  if not exists (
    select 1 from public.invoice_items where invoice_id = p_id
  ) then
    raise exception 'Ennen julkaisua: lisää vähintään yksi laskurivi.';
  end if;

  select * into v_company
  from public.company_settings
  where user_id = auth.uid();

  perform pg_advisory_xact_lock(hashtext('invoice-number'), hashtext(auth.uid()::text));

  select coalesce(max(substring(invoices.invoice_number from 5)::bigint), 1000) + 1
    into v_next
  from public.invoices
  where invoices.user_id = auth.uid()
    and invoices.invoice_number ~ '^INV-[0-9]+$';

  v_number := 'INV-' || v_next::text;
  v_reference := coalesce(
    nullif(btrim(v_invoice.reference_number), ''),
    public.finnish_reference_number(v_next)
  );

  perform set_config('selko.publishing_invoice', p_id::text, true);

  update public.invoices
  set
    invoice_number = v_number,
    reference_number = v_reference,
    status = 'sent',
    seller_company_name = nullif(btrim(v_company.company_name), ''),
    seller_y_tunus = nullif(btrim(v_company.y_tunus), ''),
    seller_iban = nullif(btrim(v_company.iban), ''),
    seller_bic_swift = nullif(btrim(v_company.bic_swift), ''),
    seller_billing_address = nullif(btrim(v_company.billing_address), '')
  where invoices.id = p_id
  returning invoices.id, invoices.invoice_number, invoices.reference_number
  into id, invoice_number, reference_number;

  return next;
end;
$$;

revoke all on function public.attach_seller_snapshot() from public, anon;
grant execute on function public.attach_seller_snapshot() to authenticated;
