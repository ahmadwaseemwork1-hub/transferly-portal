-- ============================================================================
-- Transferly v2 migration — run once in the Supabase SQL editor, after
-- schema.sql and migration_voxpact.sql.
-- Adds: full lead-detail fields, employee-submitted leads, billable/non-billable
-- notes, client/employee archive (soft delete), duplicate-lead alerts, and a
-- PKR pay rate per employee.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Lead-detail fields on transfers + who submitted it + billable flag
-- ----------------------------------------------------------------------------
alter table public.transfers add column if not exists dob date;
alter table public.transfers add column if not exists address text;
alter table public.transfers add column if not exists num_cars integer;
alter table public.transfers add column if not exists cars text;
alter table public.transfers add column if not exists current_carrier text;
alter table public.transfers add column if not exists home_owner boolean;
alter table public.transfers add column if not exists submitted_by_employee_id uuid references public.employees (id) on delete set null;
alter table public.transfers add column if not exists billable boolean not null default true;
alter table public.transfers add column if not exists billable_note text;

create index if not exists transfers_client_phone_idx on public.transfers (client_id, phone);
create index if not exists transfers_submitted_by_employee_idx on public.transfers (submitted_by_employee_id);

-- ----------------------------------------------------------------------------
-- 2. Archive (soft delete) for clients and employees, PKR pay rate
-- ----------------------------------------------------------------------------
alter table public.clients add column if not exists archived_at timestamptz;
alter table public.employees add column if not exists archived_at timestamptz;
alter table public.employees add column if not exists pkr_rate_per_transfer numeric(10,2) not null default 0;

-- ----------------------------------------------------------------------------
-- 3. Duplicate-lead attempt log (for real-time admin alerts)
-- ----------------------------------------------------------------------------
create table if not exists public.duplicate_lead_attempts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete cascade,
  employee_id uuid references public.employees (id) on delete cascade,
  phone text,
  attempted_at timestamptz not null default now()
);

create index if not exists duplicate_lead_attempts_attempted_at_idx on public.duplicate_lead_attempts (attempted_at desc);

alter table public.duplicate_lead_attempts enable row level security;

drop policy if exists "admin full access duplicate_lead_attempts" on public.duplicate_lead_attempts;
create policy "admin full access duplicate_lead_attempts" on public.duplicate_lead_attempts
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "employee inserts own duplicate attempts" on public.duplicate_lead_attempts;
create policy "employee inserts own duplicate attempts" on public.duplicate_lead_attempts
  for insert with check (employee_id = public.current_employee_id());

-- ----------------------------------------------------------------------------
-- 4. RPC: client (or admin) sets billable / non-billable + note on a transfer
--    Mirrors respond_to_transfer's SECURITY DEFINER pattern. Editable any
--    time (not locked once invoiced), per product decision.
-- ----------------------------------------------------------------------------
create or replace function public.set_transfer_billable(
  p_transfer_id uuid,
  p_billable boolean,
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
begin
  select client_id into v_caller_client_id from public.profiles where id = auth.uid();

  select * into v_row from public.transfers where id = p_transfer_id for update;

  if v_row is null then
    raise exception 'Transfer not found';
  end if;

  if not public.is_admin() and (v_caller_client_id is null or v_row.client_id <> v_caller_client_id) then
    raise exception 'Not authorized for this transfer';
  end if;

  if not p_billable and (p_note is null or length(trim(p_note)) = 0) then
    raise exception 'A note is required when marking a transfer non-billable';
  end if;

  update public.transfers
  set billable = p_billable,
      billable_note = case when p_note is null then null else trim(p_note) end,
      updated_at = now()
  where id = p_transfer_id
  returning * into v_row;

  return v_row;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. Block archived clients/employees from being treated as active.
--    (Login/role checks are enforced in application code — requireClient()/
--    requireEmployee() — this index just makes "active, non-archived" lookups
--    cheap.)
-- ----------------------------------------------------------------------------
create index if not exists clients_archived_at_idx on public.clients (archived_at);
create index if not exists employees_archived_at_idx on public.employees (archived_at);

-- ----------------------------------------------------------------------------
-- 6. Make sure new realtime-watched tables are in the realtime publication.
--    (transfers/employee_uploads were presumably added via the dashboard
--    already; this covers clients — for the employee-facing live status
--    indicator — and duplicate_lead_attempts — for the admin alert banner.)
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'clients'
  ) then
    alter publication supabase_realtime add table public.clients;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'duplicate_lead_attempts'
  ) then
    alter publication supabase_realtime add table public.duplicate_lead_attempts;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'transfers'
  ) then
    alter publication supabase_realtime add table public.transfers;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'employees'
  ) then
    alter publication supabase_realtime add table public.employees;
  end if;
end $$;
