-- Link a draft invoice to the customer that was chosen.
-- Run once: Supabase → SQL Editor → New query → paste this file → Run.
--
-- What this does:
-- 1. Adds invoices.customer_id. It points at customers.id.
--    Deleting a customer clears that link. The name, address and email
--    already copied onto the invoice stay as they were.
-- 2. Lets the save function store that id together with the copied details.
-- 3. Keeps a sent invoice frozen, including this link, except when the
--    customer row itself is deleted (then only the link becomes empty).

alter table public.invoices
  add column if not exists customer_id uuid references public.customers (id) on delete set null;

create index if not exists invoices_customer_id_idx
  on public.invoices (customer_id);

grant insert (customer_id) on table public.invoices to authenticated;
grant update (customer_id) on table public.invoices to authenticated;

-- The old save function has no customer argument. Replace it so the chosen
-- customer id is written in the same save as the copied name and lines.
drop function if exists public.save_invoice_draft(
  uuid, date, date, integer, numeric, date, text, text, text, text, text, jsonb
);

create or replace function public.save_invoice_draft(
  p_id uuid,
  p_issue_date date,
  p_due_date date,
  p_payment_terms_days integer,
  p_interest_rate numeric,
  p_delivery_date date,
  p_customer_name text,
  p_customer_y_tunus text,
  p_customer_address text,
  p_customer_email text,
  p_reference_number text,
  p_items jsonb,
  p_customer_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_row record;
  v_unit text;
begin
  if auth.uid() is null then
    raise exception 'Kirjaudu sisään ennen laskun tallentamista.';
  end if;

  if p_customer_id is not null and not exists (
    select 1 from public.customers
    where id = p_customer_id and user_id = auth.uid()
  ) then
    raise exception 'Valittua asiakasta ei löytynyt.';
  end if;

  if p_id is null then
    insert into public.invoices (
      user_id,
      status,
      issue_date,
      due_date,
      payment_terms_days,
      interest_rate,
      delivery_date,
      customer_id,
      customer_name,
      customer_y_tunus,
      customer_address,
      customer_email,
      reference_number
    )
    values (
      auth.uid(),
      'draft',
      p_issue_date,
      p_due_date,
      p_payment_terms_days,
      p_interest_rate,
      p_delivery_date,
      p_customer_id,
      nullif(btrim(p_customer_name), ''),
      nullif(btrim(p_customer_y_tunus), ''),
      nullif(btrim(p_customer_address), ''),
      nullif(btrim(p_customer_email), ''),
      nullif(btrim(p_reference_number), '')
    )
    returning id into v_id;
  else
    update public.invoices
    set
      issue_date = p_issue_date,
      due_date = p_due_date,
      payment_terms_days = p_payment_terms_days,
      interest_rate = p_interest_rate,
      delivery_date = p_delivery_date,
      customer_id = p_customer_id,
      customer_name = nullif(btrim(p_customer_name), ''),
      customer_y_tunus = nullif(btrim(p_customer_y_tunus), ''),
      customer_address = nullif(btrim(p_customer_address), ''),
      customer_email = nullif(btrim(p_customer_email), ''),
      reference_number = nullif(btrim(p_reference_number), '')
    where id = p_id
      and user_id = auth.uid()
      and status = 'draft'
    returning id into v_id;

    if v_id is null then
      raise exception 'Luonnosta ei voi muokata. Se on jo julkaistu tai ei kuulu sinulle.';
    end if;

    delete from public.invoice_items where invoice_id = v_id;
  end if;

  -- Line amounts are the values from the form, not a live lookup of products.
  for v_row in
    select item, ordinality
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
      with ordinality as rows(item, ordinality)
  loop
    v_unit := nullif(btrim(v_row.item->>'unit'), '');
    insert into public.invoice_items (
      invoice_id,
      position,
      description,
      quantity,
      unit,
      unit_price,
      vat_percentage
    )
    values (
      v_id,
      v_row.ordinality::integer,
      btrim(v_row.item->>'description'),
      (v_row.item->>'quantity')::numeric,
      coalesce(v_unit, 'kpl'),
      (v_row.item->>'unit_price')::numeric,
      (v_row.item->>'vat_percentage')::numeric
    );
  end loop;

  return v_id;
end;
$$;

grant execute on function public.save_invoice_draft(
  uuid, date, date, integer, numeric, date, text, text, text, text, text, jsonb, uuid
) to authenticated;

-- Same lock as before, plus customer_id. A sent invoice may lose the link
-- only when the customer row is deleted. The copied party text stays.
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
      and new.created_at is not distinct from old.created_at
    then
      return new;
    end if;

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
    then
      return new;
    end if;

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
