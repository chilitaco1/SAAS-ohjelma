-- Finnish sales invoices (Verohallinto / arvonlisäverolaki).
--
-- Run this once in Supabase: SQL Editor → New query → paste → Run.
-- It creates the tables, locks each user to their own rows, and stops an
-- issued invoice from being edited. Drafts have no invoice number. The number
-- INV-1001, INV-1002, … is given only by publish_invoice().

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  -- Who owns this invoice. Matches the signed-in Supabase user.
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Null on purpose for drafts. A number is assigned only when the invoice is issued.
  invoice_number text,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'paid', 'canceled')),
  issue_date date,
  due_date date,
  payment_terms_days integer
    check (payment_terms_days is null or (payment_terms_days >= 0 and payment_terms_days <= 365)),
  -- Percent per year, for example 8.50. Not a fraction.
  interest_rate numeric(5, 2)
    check (interest_rate is null or (interest_rate >= 0 and interest_rate <= 100)),
  delivery_date date,
  customer_name text,
  -- Column name follows the requested schema. The value is a Y-tunnus.
  customer_y_tunus text,
  customer_address text,
  customer_email text,
  -- Domestic reference (viitenumero), digits only, including the check digit.
  reference_number text,
  -- Maintained by a trigger from the rows. numeric is exact; it is not a float.
  subtotal_excluding_vat numeric(12, 2) not null default 0,
  total_including_vat numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  -- Two users may both have INV-1001. Drafts (null number) do not collide:
  -- PostgreSQL treats nulls as distinct in a unique constraint.
  unique (user_id, invoice_number),
  -- A draft must not consume a number. An issued invoice must have one.
  constraint invoice_number_matches_status check (
    (status = 'draft' and invoice_number is null)
    or (status <> 'draft' and invoice_number is not null)
  ),
  constraint due_on_or_after_issue check (
    due_date is null or issue_date is null or due_date >= issue_date
  )
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  description text not null,
  -- Keeps the form order. UUID primary keys are random, so they cannot do this.
  position integer not null check (position > 0),
  quantity numeric(12, 3) not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  -- Only the rates the Finnish form offers. 25.5 is the standard rate.
  vat_percentage numeric(4, 1) not null
    check (vat_percentage in (25.5, 14, 10, 0)),
  -- Filled by trigger. The client is not trusted for these.
  line_subtotal numeric(12, 2) not null default 0,
  line_total numeric(12, 2) not null default 0
);

create index if not exists invoices_user_created_idx
  on public.invoices (user_id, created_at desc);

create index if not exists invoice_items_invoice_idx
  on public.invoice_items (invoice_id);

-- ---------------------------------------------------------------------------
-- Exact row math. round(numeric, 2) is half-away-from-zero, matching the app.
-- ---------------------------------------------------------------------------

create or replace function public.set_invoice_item_amounts()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.line_subtotal := round(new.quantity * new.unit_price, 2);
  new.line_total := new.line_subtotal + round(new.line_subtotal * new.vat_percentage / 100, 2);
  return new;
end;
$$;

drop trigger if exists invoice_items_set_amounts on public.invoice_items;
create trigger invoice_items_set_amounts
  before insert or update on public.invoice_items
  for each row
  execute function public.set_invoice_item_amounts();

-- Keep the invoice header equal to the sum of its rows while it is a draft.
create or replace function public.refresh_invoice_totals()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target uuid := coalesce(new.invoice_id, old.invoice_id);
begin
  update public.invoices
  set
    subtotal_excluding_vat = coalesce((
      select round(sum(line_subtotal), 2)
      from public.invoice_items
      where invoice_id = target
    ), 0),
    total_including_vat = coalesce((
      select round(sum(line_total), 2)
      from public.invoice_items
      where invoice_id = target
    ), 0)
  where id = target
    and status = 'draft';

  return null;
end;
$$;

drop trigger if exists invoice_items_refresh_totals on public.invoice_items;
create trigger invoice_items_refresh_totals
  after insert or update or delete on public.invoice_items
  for each row
  execute function public.refresh_invoice_totals();

-- ---------------------------------------------------------------------------
-- Issued invoices are accounting documents. Their contents stay as issued.
-- Status may still move sent → paid or sent → canceled. That does not change
-- the amounts, parties, dates, or reference.
-- ---------------------------------------------------------------------------

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
      and new.created_at is not distinct from old.created_at
    then
      return new;
    end if;

    raise exception 'Julkaistua laskua ei voi muokata. Tee hyvityslasku.';
  end if;

  -- Leaving draft, or writing an invoice number, is allowed only for the
  -- publish_invoice() call that set this transaction-local flag. The API role
  -- also has no UPDATE privilege on status or invoice_number.
  if new.status <> 'draft' or new.invoice_number is not null then
    if current_setting('selko.publishing_invoice', true) is distinct from old.id::text then
      raise exception 'Laskunumero annetaan vain julkaisemalla lasku.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists invoices_protect_issued on public.invoices;
create trigger invoices_protect_issued
  before update or delete on public.invoices
  for each row
  execute function public.protect_issued_invoice();

-- Rows of an issued invoice are frozen as well.
create or replace function public.protect_issued_invoice_items()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_status text;
  parent_id uuid := coalesce(new.invoice_id, old.invoice_id);
begin
  select status into parent_status
  from public.invoices
  where id = parent_id;

  if parent_status is distinct from 'draft' then
    raise exception 'Julkaistun laskun rivejä ei voi muuttaa.';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists invoice_items_protect_issued on public.invoice_items;
create trigger invoice_items_protect_issued
  before insert or update or delete on public.invoice_items
  for each row
  execute function public.protect_issued_invoice_items();

-- ---------------------------------------------------------------------------
-- 7-3-1 check digit for the Finnish reference number.
-- ---------------------------------------------------------------------------

create or replace function public.finnish_reference_number(base_number bigint)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  digits text := base_number::text;
  i integer;
  weight integer;
  sum_products integer := 0;
  check_digit integer;
begin
  for i in 1..length(digits) loop
    weight := case (i - 1) % 3
      when 0 then 7
      when 1 then 3
      else 1
    end;
    sum_products := sum_products
      + substring(digits from length(digits) - i + 1 for 1)::integer * weight;
  end loop;

  check_digit := (10 - (sum_products % 10)) % 10;
  return digits || check_digit::text;
end;
$$;

-- ---------------------------------------------------------------------------
-- Save a draft in one transaction. Totals are recalculated by the triggers.
-- ---------------------------------------------------------------------------

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
    insert into public.invoice_items (
      invoice_id,
      position,
      description,
      quantity,
      unit_price,
      vat_percentage
    )
    values (
      v_id,
      v_row.ordinality::integer,
      btrim(v_row.item->>'description'),
      (v_row.item->>'quantity')::numeric,
      (v_row.item->>'unit_price')::numeric,
      (v_row.item->>'vat_percentage')::numeric
    );
  end loop;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Publish: next number for this user only, then status = sent.
-- An advisory lock stops two publishes from receiving the same number.
-- The number is taken only after the invoice is valid, and only inside this
-- transaction, so a failed publish does not leave a gap from a half-save.
-- ---------------------------------------------------------------------------

create or replace function public.publish_invoice(p_id uuid)
returns table (id uuid, invoice_number text, reference_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices%rowtype;
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

  -- One lock per user for the rest of this transaction.
  perform pg_advisory_xact_lock(hashtext('invoice-number'), hashtext(auth.uid()::text));

  -- Highest issued number for this user, then +1. First invoice is INV-1001.
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

  -- Lets the protection trigger accept this one draft → sent change.
  perform set_config('selko.publishing_invoice', p_id::text, true);

  update public.invoices
  set
    invoice_number = v_number,
    reference_number = v_reference,
    status = 'sent'
  where invoices.id = p_id
  returning invoices.id, invoices.invoice_number, invoices.reference_number
  into id, invoice_number, reference_number;

  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security. A user only sees and writes their own invoices.
-- invoice_items has no user_id, so the policy looks at the parent invoice.
-- ---------------------------------------------------------------------------

alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists invoices_insert on public.invoices;
create policy invoices_insert on public.invoices
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'draft'
    and invoice_number is null
  );

drop policy if exists invoices_update on public.invoices;
create policy invoices_update on public.invoices
  for update to authenticated
  using (user_id = auth.uid() and status = 'draft')
  with check (user_id = auth.uid() and status = 'draft');

drop policy if exists invoices_delete on public.invoices;
create policy invoices_delete on public.invoices
  for delete to authenticated
  using (user_id = auth.uid() and status = 'draft');

drop policy if exists invoice_items_select on public.invoice_items;
create policy invoice_items_select on public.invoice_items
  for select to authenticated
  using (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_items.invoice_id
        and invoices.user_id = auth.uid()
    )
  );

drop policy if exists invoice_items_insert on public.invoice_items;
create policy invoice_items_insert on public.invoice_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_items.invoice_id
        and invoices.user_id = auth.uid()
        and invoices.status = 'draft'
    )
  );

drop policy if exists invoice_items_update on public.invoice_items;
create policy invoice_items_update on public.invoice_items
  for update to authenticated
  using (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_items.invoice_id
        and invoices.user_id = auth.uid()
        and invoices.status = 'draft'
    )
  )
  with check (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_items.invoice_id
        and invoices.user_id = auth.uid()
        and invoices.status = 'draft'
    )
  );

drop policy if exists invoice_items_delete on public.invoice_items;
create policy invoice_items_delete on public.invoice_items
  for delete to authenticated
  using (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_items.invoice_id
        and invoices.user_id = auth.uid()
        and invoices.status = 'draft'
    )
  );

-- The API role may write draft contents, but not the official number or status.
-- publish_invoice() runs as its owner, so it can set those two columns.
revoke all on table public.invoices from public, anon;
revoke all on table public.invoice_items from public, anon;

grant select on table public.invoices to authenticated;
grant insert (
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
) on table public.invoices to authenticated;
grant update (
  issue_date,
  due_date,
  payment_terms_days,
  interest_rate,
  delivery_date,
  customer_name,
  customer_y_tunus,
  customer_address,
  customer_email,
  reference_number,
  subtotal_excluding_vat,
  total_including_vat
) on table public.invoices to authenticated;
grant delete on table public.invoices to authenticated;

grant select, insert, update, delete on table public.invoice_items to authenticated;

revoke all on function public.save_invoice_draft(
  uuid, date, date, integer, numeric, date, text, text, text, text, text, jsonb
) from public, anon;
grant execute on function public.save_invoice_draft(
  uuid, date, date, integer, numeric, date, text, text, text, text, text, jsonb
) to authenticated;

-- Marking an issued invoice paid does not change its amounts or parties.
create or replace function public.mark_invoice_paid(p_id uuid)
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
    raise exception 'Vain lähetetyn laskun voi merkitä maksetuksi.';
  end if;

  update public.invoices
  set status = 'paid'
  where id = p_id;
end;
$$;

revoke all on function public.publish_invoice(uuid) from public, anon;
grant execute on function public.publish_invoice(uuid) to authenticated;

revoke all on function public.mark_invoice_paid(uuid) from public, anon;
grant execute on function public.mark_invoice_paid(uuid) to authenticated;

revoke all on function public.finnish_reference_number(bigint) from public, anon;
grant execute on function public.finnish_reference_number(bigint) to authenticated;
