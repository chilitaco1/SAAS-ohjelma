-- Remembers when an invoice PDF was last emailed.
-- Run once: Supabase → SQL Editor → New query → paste this whole file → Run.
-- Run the status file first if you have not already
-- (supabase/migrations/20260928120000_invoice_status.sql).
--
-- This does not delete invoices or change their numbers.
-- A published invoice may gain a send time. Amounts and parties stay locked.

alter table public.invoices
  add column if not exists email_sent_at timestamptz;

comment on column public.invoices.email_sent_at is
  'When the invoice PDF was last emailed to the customer. Updated on every successful send.';

-- Same lock as before, plus one extra allowed change: writing email_sent_at
-- on its own. Paid and cancelled rules are unchanged.
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

    if old.status = 'sent'
      and new.status = 'paid'
      and v_same
      and new.paid_at is not null
      and new.cancelled_at is not distinct from old.cancelled_at
      and new.email_sent_at is not distinct from old.email_sent_at
    then
      return new;
    end if;

    if old.status = 'paid'
      and new.status = 'sent'
      and v_same
      and new.paid_at is null
      and new.cancelled_at is not distinct from old.cancelled_at
      and new.email_sent_at is not distinct from old.email_sent_at
    then
      return new;
    end if;

    if old.status = 'sent'
      and new.status = 'canceled'
      and v_same
      and new.cancelled_at is not null
      and new.paid_at is not distinct from old.paid_at
      and new.email_sent_at is not distinct from old.email_sent_at
    then
      return new;
    end if;

    -- Successful email. Only the send time may change.
    if new.status is not distinct from old.status
      and v_same
      and new.paid_at is not distinct from old.paid_at
      and new.cancelled_at is not distinct from old.cancelled_at
      and new.email_sent_at is not null
      and new.email_sent_at is distinct from old.email_sent_at
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
      and new.paid_at is not distinct from old.paid_at
      and new.cancelled_at is not distinct from old.cancelled_at
      and new.email_sent_at is not distinct from old.email_sent_at
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
      and new.paid_at is not distinct from old.paid_at
      and new.cancelled_at is not distinct from old.cancelled_at
      and new.email_sent_at is not distinct from old.email_sent_at
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

create or replace function public.record_invoice_email_sent(p_id uuid)
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

  if v_status not in ('sent', 'paid', 'canceled') then
    raise exception 'Vain julkaistun laskun voi lähettää sähköpostilla.';
  end if;

  update public.invoices
  set email_sent_at = now()
  where id = p_id;
end;
$$;

revoke all on function public.record_invoice_email_sent(uuid) from public, anon;
grant execute on function public.record_invoice_email_sent(uuid) to authenticated;
