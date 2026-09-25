-- Unit on each invoice line (kpl, h, kg, …).
-- Run once: Supabase → SQL Editor → New query → paste → Run.
-- Existing rows become "kpl". New saves store the unit the user picked.

alter table public.invoice_items
  add column if not exists unit text not null default 'kpl';

alter table public.invoice_items
  drop constraint if exists invoice_items_unit_length;

alter table public.invoice_items
  add constraint invoice_items_unit_length
  check (char_length(btrim(unit)) between 1 and 16);

-- Same save function as before. The unit travels inside p_items, so the
-- function arguments do not change.
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
  p_items jsonb
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

  if p_id is null then
    insert into public.invoices (
      user_id,
      status,
      issue_date,
      due_date,
      payment_terms_days,
      interest_rate,
      delivery_date,
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
