-- Payment date and cancellation time for published invoices.
-- Run once: Supabase → SQL Editor → New query → paste this whole file → Run.
--
-- The status value stays "canceled" (one L). That word is already stored
-- on existing invoices. The screen still says "Peruttu".
-- "Erääntynyt" is not stored. The app calculates it from status + due date.
--
-- A published invoice can only change in the three ways below.
-- Amounts, parties, and the invoice number stay as they were.

alter table public.invoices
  add column if not exists paid_at date;

alter table public.invoices
  add column if not exists cancelled_at timestamptz;

comment on column public.invoices.paid_at is
  'Calendar date the user marked the invoice paid. Cleared if they undo that mark.';

comment on column public.invoices.cancelled_at is
  'When a sent invoice was cancelled. The row and its INV-number are kept.';

-- The API role may read the new columns (SELECT is already granted on the
-- table) but must not write them. Only the functions below may set them.

create or replace function public.protect_issued_invoice()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_same boolean;
begin
  if tg_op = 'DELETE' then
    if old.status in ('sent', 'paid', 'canceled') then
      raise exception 'Julkaistua laskua ei voi poistaa. Tee hyvityslasku.';
    end if;
    return old;
  end if;

  if old.status in ('sent', 'paid', 'canceled') then
    -- Everything except status and the two new timestamps.
    v_same :=
      new.user_id is not distinct from old.user_id
      and new.invoice_number is not distinct from old.invoice_number
      and new.issue_date is not distinct from old.issue_date
      and new.due_date is not distinct from old.due_date
      and new.payment_terms_days is not distinct from old.payment_terms_days
      and new.interest_rate is not distinct from old.interest_rate
      and new.delivery_date is not distinct from old.delivery_date
      and new.customer_id is not distinct from old.customer_id
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
      and new.created_at is not distinct from old.created_at;

    -- sent → paid. Only the status and the payment date may change.
    if old.status = 'sent'
      and new.status = 'paid'
      and v_same
      and new.paid_at is not null
      and new.cancelled_at is not distinct from old.cancelled_at
    then
      return new;
    end if;

    -- paid → sent. Undo a mistaken payment mark. Clears the payment date.
    if old.status = 'paid'
      and new.status = 'sent'
      and v_same
      and new.paid_at is null
      and new.cancelled_at is not distinct from old.cancelled_at
    then
      return new;
    end if;

    -- sent → canceled. Final. The number stays. Nothing else changes.
    if old.status = 'sent'
      and new.status = 'canceled'
      and v_same
      and new.cancelled_at is not null
      and new.paid_at is not distinct from old.paid_at
    then
      return new;
    end if;

    -- One-time seller copy, for invoices published before that copy existed.
    if old.seller_company_name is null
      and new.status is not distinct from old.status
      and new.user_id is not distinct from old.user_id
      and new.invoice_number is not distinct from old.invoice_number
      and new.issue_date is not distinct from old.issue_date
      and new.due_date is not distinct from old.due_date
      and new.payment_terms_days is not distinct from old.payment_terms_days
      and new.interest_rate is not distinct from old.interest_rate
      and new.delivery_date is not distinct from old.delivery_date
      and new.customer_id is not distinct from old.customer_id
      and new.customer_name is not distinct from old.customer_name
      and new.customer_y_tunus is not distinct from old.customer_y_tunus
      and new.customer_address is not distinct from old.customer_address
      and new.customer_email is not distinct from old.customer_email
      and new.reference_number is not distinct from old.reference_number
      and new.subtotal_excluding_vat is not distinct from old.subtotal_excluding_vat
      and new.total_including_vat is not distinct from old.total_including_vat
      and new.created_at is not distinct from old.created_at
      and new.paid_at is not distinct from old.paid_at
      and new.cancelled_at is not distinct from old.cancelled_at
    then
      return new;
    end if;

    -- Deleting a customer clears the link. The copied name and address stay.
    if new.customer_id is null
      and old.customer_id is not null
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
      and new.seller_company_name is not distinct from old.seller_company_name
      and new.seller_y_tunus is not distinct from old.seller_y_tunus
      and new.seller_iban is not distinct from old.seller_iban
      and new.seller_bic_swift is not distinct from old.seller_bic_swift
      and new.seller_billing_address is not distinct from old.seller_billing_address
      and new.created_at is not distinct from old.created_at
      and new.paid_at is not distinct from old.paid_at
      and new.cancelled_at is not distinct from old.cancelled_at
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

-- Replaces the one-argument function. The old signature would otherwise
-- stay in the database and the API would not know which one to call.
drop function if exists public.mark_invoice_paid(uuid);

create function public.mark_invoice_paid(p_id uuid, p_paid_at date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'Kirjaudu sisään.';
  end if;

  if p_paid_at is null then
    raise exception 'Anna maksupäivä.';
  end if;

  select user_id, status into v_user, v_status
  from public.invoices
  where id = p_id
  for update;

  if v_user is null or v_user <> auth.uid() then
    raise exception 'Laskua ei löydy.';
  end if;

  if v_status <> 'sent' then
    raise exception 'Vain lähetetyn laskun voi merkitä maksetuksi.';
  end if;

  update public.invoices
  set status = 'paid',
      paid_at = p_paid_at
  where id = p_id;
end;
$$;

create or replace function public.unmark_invoice_paid(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'Kirjaudu sisään.';
  end if;

  select user_id, status into v_user, v_status
  from public.invoices
  where id = p_id
  for update;

  if v_user is null or v_user <> auth.uid() then
    raise exception 'Laskua ei löydy.';
  end if;

  if v_status <> 'paid' then
    raise exception 'Vain maksetun laskun merkinnän voi perua.';
  end if;

  update public.invoices
  set status = 'sent',
      paid_at = null
  where id = p_id;
end;
$$;

create or replace function public.cancel_invoice(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'Kirjaudu sisään.';
  end if;

  select user_id, status into v_user, v_status
  from public.invoices
  where id = p_id
  for update;

  if v_user is null or v_user <> auth.uid() then
    raise exception 'Laskua ei löydy.';
  end if;

  if v_status <> 'sent' then
    raise exception 'Vain lähetetyn laskun voi peruuttaa.';
  end if;

  update public.invoices
  set status = 'canceled',
      cancelled_at = now()
  where id = p_id;
end;
$$;

revoke all on function public.mark_invoice_paid(uuid, date) from public, anon;
grant execute on function public.mark_invoice_paid(uuid, date) to authenticated;

revoke all on function public.unmark_invoice_paid(uuid) from public, anon;
grant execute on function public.unmark_invoice_paid(uuid) to authenticated;

revoke all on function public.cancel_invoice(uuid) from public, anon;
grant execute on function public.cancel_invoice(uuid) to authenticated;

-- Publishing also refuses an incomplete customer or seller.
-- The app shows the same message with a link. This is the lock in the database
-- so a direct API call cannot skip it. The customer copy is refreshed here,
-- while the invoice is still a draft, so a just-fixed address is what gets frozen.
create or replace function public.publish_invoice(p_id uuid)
returns table (id uuid, invoice_number text, reference_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices%rowtype;
  v_company public.company_settings%rowtype;
  v_customer public.customers%rowtype;
  v_next bigint;
  v_number text;
  v_reference text;
  v_missing text;
  v_country text;
  v_city_line text;
  v_address text;
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

  if v_invoice.customer_id is null then
    raise exception 'Ennen julkaisua: valitse asiakas.';
  end if;

  select * into v_customer
  from public.customers
  where customers.id = v_invoice.customer_id
    and customers.user_id = auth.uid();

  if not found then
    raise exception 'Ennen julkaisua: valitse asiakas.';
  end if;

  v_missing := '';
  if v_customer.name is null or btrim(v_customer.name) = '' then
    v_missing := v_missing || ', nimi';
  end if;
  if v_customer.address is null or btrim(v_customer.address) = '' then
    v_missing := v_missing || ', katuosoite';
  end if;
  if v_customer.postal_code is null or btrim(v_customer.postal_code) = '' then
    v_missing := v_missing || ', postinumero';
  end if;
  if v_customer.city is null or btrim(v_customer.city) = '' then
    v_missing := v_missing || ', postitoimipaikka';
  end if;
  if v_missing <> '' then
    raise exception using message =
      'Asiakkaalta puuttuu ' || substr(v_missing, 3) || '. Täydennä tiedot ennen julkaisua.';
  end if;

  if not exists (
    select 1 from public.invoice_items where invoice_id = p_id
  ) then
    raise exception 'Ennen julkaisua: lisää vähintään yksi laskurivi.';
  end if;

  select * into v_company
  from public.company_settings
  where user_id = auth.uid();

  if not found then
    raise exception using message =
      'Yrityksen tiedoista puuttuu yrityksen nimi, Y-tunnus, osoite ja IBAN. Täydennä ne Yritys-sivulla ennen julkaisua.';
  end if;

  v_missing := '';
  if v_company.company_name is null or btrim(v_company.company_name) = '' then
    v_missing := v_missing || ', yrityksen nimi';
  end if;
  if v_company.y_tunus is null or btrim(v_company.y_tunus) = '' then
    v_missing := v_missing || ', Y-tunnus';
  end if;
  if v_company.billing_address is null or btrim(v_company.billing_address) = '' then
    v_missing := v_missing || ', osoite';
  end if;
  if v_company.iban is null or btrim(v_company.iban) = '' then
    v_missing := v_missing || ', IBAN';
  end if;
  if v_missing <> '' then
    raise exception using message =
      'Yrityksen tiedoista puuttuu ' || substr(v_missing, 3) || '. Täydennä ne Yritys-sivulla ennen julkaisua.';
  end if;

  v_country := coalesce(nullif(btrim(v_customer.country), ''), 'Suomi');
  v_city_line := nullif(btrim(concat_ws(' ', v_customer.postal_code, v_customer.city)), '');
  v_address := concat_ws(
    E'\n',
    nullif(btrim(v_customer.address), ''),
    v_city_line,
    v_country
  );

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
    customer_name = nullif(btrim(v_customer.name), ''),
    customer_y_tunus = nullif(btrim(v_customer.business_id), ''),
    customer_address = v_address,
    customer_email = nullif(btrim(v_customer.email), ''),
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
