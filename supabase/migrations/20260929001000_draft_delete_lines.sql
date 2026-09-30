-- Let a draft delete remove its lines.
-- Run once: Supabase → SQL Editor → New query → paste this file → Run.
--
-- Deleting a draft also deletes its invoice lines. That line check used to
-- look up the invoice after the invoice row was already gone, see no status,
-- and refuse the delete. A draft with lines then stayed in the list.
-- A published invoice is still blocked before its lines are touched.

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

  if parent_status is null and tg_op = 'DELETE' then
    return old;
  end if;

  if parent_status is distinct from 'draft' then
    raise exception 'Julkaistun laskun rivejä ei voi muuttaa.';
  end if;

  return coalesce(new, old);
end;
$$;
