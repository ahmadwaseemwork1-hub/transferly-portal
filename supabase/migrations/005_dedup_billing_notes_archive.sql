-- ============================================================================
-- Migration 005: duplicate-lead detection, billing decision notes, and
-- reversible archive for clients/employees.
-- Run this in the Supabase SQL Editor AFTER migration 004.
-- Safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- DUPLICATE LEAD ATTEMPTS — logged whenever submitLeadTransfer blocks a
-- submission because the phone number already exists for that client. Feeds
-- the real-time admin alert banner ("Duplicate lead attempt by <agent>").
-- ----------------------------------------------------------------------------
create table if not exists public.duplicate_lead_attempts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete cascade,
  employee_id uuid references public.employees (id) on delete cascade,
  phone text,
  attempted_at timestamptz not null default now()
);

create index if not exists duplicate_lead_attempts_attempted_at_idx
  on public.duplicate_lead_attempts (attempted_at desc);

alter table public.duplicate_lead_attempts enable row level security;

drop policy if exists "admin full access duplicate_lead_attempts" on public.duplicate_lead_attempts;
create policy "admin full access duplicate_lead_attempts" on public.duplicate_lead_attempts
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "employee inserts own duplicate attempts" on public.duplicate_lead_attempts;
create policy "employee inserts own duplicate attempts" on public.duplicate_lead_attempts
  for insert with check (employee_id = public.current_employee_id());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'duplicate_lead_attempts'
  ) then
    alter publication supabase_realtime add table public.duplicate_lead_attempts;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- BILLING NOTE — why a transfer was marked refund, required at decision time.
-- ----------------------------------------------------------------------------
alter table public.transfers add column if not exists billing_note text;

create or replace function public.set_transfer_billing(
  p_transfer_id uuid,
  p_billing_status text,
  p_note text default null
)
returns public.transfers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.transfers;
  v_caller_client_id uuid;
  v_caller_is_admin boolean;
begin
  if p_billing_status not in ('billable', 'refund') then
    raise exception 'Invalid billing status: %', p_billing_status;
  end if;

  select client_id into v_caller_client_id from public.profiles where id = auth.uid();
  select public.is_admin() into v_caller_is_admin;

  select * into v_row from public.transfers where id = p_transfer_id for update;

  if v_row is null then
    raise exception 'Transfer not found';
  end if;

  if not v_caller_is_admin and (v_caller_client_id is null or v_row.client_id <> v_caller_client_id) then
    raise exception 'Not authorized for this transfer';
  end if;

  if v_row.status <> 'accepted' then
    raise exception 'Only accepted transfers can be marked billable or refund';
  end if;

  if p_billing_status = 'refund' and (p_note is null or length(trim(p_note)) = 0) then
    raise exception 'A note is required when marking a transfer refund';
  end if;

  update public.transfers
  set billing_status = p_billing_status,
      billing_note = case when p_note is null then null else trim(p_note) end,
      billing_decided_at = now(),
      billing_decided_by = auth.uid(),
      updated_at = now()
  where id = p_transfer_id
  returning * into v_row;

  return v_row;
end;
$$;

-- ----------------------------------------------------------------------------
-- ARCHIVE (reversible soft delete) — hides a client/employee from active
-- lists and blocks their login, but keeps every historical transfer/invoice
-- intact. Distinct from the existing account-level `status` field.
-- ----------------------------------------------------------------------------
alter table public.clients add column if not exists archived_at timestamptz;
alter table public.employees add column if not exists archived_at timestamptz;

create index if not exists clients_archived_at_idx on public.clients (archived_at);
create index if not exists employees_archived_at_idx on public.employees (archived_at);
