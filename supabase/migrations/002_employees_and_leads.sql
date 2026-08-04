-- ============================================================================
-- Migration 002: employees, client assignments, lead-detail transfer fields
-- Run this in the Supabase SQL Editor AFTER supabase/schema.sql.
-- Safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- EMPLOYEES
-- ----------------------------------------------------------------------------
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  employment_type text not null default 'remote'
    check (employment_type in ('onsite', 'hybrid', 'remote', 'part_time')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  -- Payroll config is captured here now so you don't have to re-enter it later,
  -- but the calculator that reads it is a later phase — for now this is just
  -- storage. base_rate_pkr is the per-transfer rate; bonus_tiers is a list of
  -- {"min_transfers": 5, "flat_amount": 3000} objects, highest threshold met
  -- wins as a flat daily total, replacing (not adding to) the per-transfer math.
  base_rate_pkr numeric(10,2) not null default 0,
  bonus_tiers jsonb not null default '[]'::jsonb,
  start_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- EMPLOYEE <-> CLIENT ASSIGNMENTS
-- ----------------------------------------------------------------------------
create table if not exists public.employee_client_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (employee_id, client_id)
);

create index if not exists eca_employee_idx on public.employee_client_assignments (employee_id);
create index if not exists eca_client_idx on public.employee_client_assignments (client_id);

-- ----------------------------------------------------------------------------
-- PROFILES: add employee role + employee_id
-- ----------------------------------------------------------------------------
alter table public.profiles add column if not exists employee_id uuid
  references public.employees (id) on delete cascade;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'client', 'employee'));

alter table public.profiles drop constraint if exists client_role_needs_client_id;
alter table public.profiles drop constraint if exists profile_role_requires_matching_id;
alter table public.profiles add constraint profile_role_requires_matching_id check (
  (role = 'admin' and client_id is null and employee_id is null)
  or (role = 'client' and client_id is not null and employee_id is null)
  or (role = 'employee' and employee_id is not null and client_id is null)
);

create index if not exists profiles_employee_id_idx on public.profiles (employee_id);

-- ----------------------------------------------------------------------------
-- TRANSFERS: lead-detail fields + employee submission/approval tracking
-- ----------------------------------------------------------------------------
alter table public.transfers add column if not exists date_of_birth date;
alter table public.transfers add column if not exists address text;
alter table public.transfers add column if not exists zip_code text;
alter table public.transfers add column if not exists home_status text;
alter table public.transfers add column if not exists vehicle_count integer;
alter table public.transfers add column if not exists vehicles text;
alter table public.transfers add column if not exists current_carrier text;
alter table public.transfers add column if not exists policy_term text;
alter table public.transfers add column if not exists submitted_by uuid
  references public.employees (id) on delete set null;
alter table public.transfers add column if not exists employee_approved boolean not null default false;
alter table public.transfers add column if not exists employee_approved_at timestamptz;
alter table public.transfers add column if not exists employee_approved_by uuid
  references public.profiles (id);

create index if not exists transfers_submitted_by_idx on public.transfers (submitted_by);
create index if not exists transfers_employee_approved_idx on public.transfers (employee_approved);

-- ----------------------------------------------------------------------------
-- Helper: current employee id (mirrors current_client_id)
-- ----------------------------------------------------------------------------
create or replace function public.current_employee_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select employee_id from public.profiles where id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.employees enable row level security;
alter table public.employee_client_assignments enable row level security;

drop policy if exists "admin full access employees" on public.employees;
create policy "admin full access employees" on public.employees
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "employee reads own record" on public.employees;
create policy "employee reads own record" on public.employees
  for select using (id = public.current_employee_id());

drop policy if exists "admin full access assignments" on public.employee_client_assignments;
create policy "admin full access assignments" on public.employee_client_assignments
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "employee reads own assignments" on public.employee_client_assignments;
create policy "employee reads own assignments" on public.employee_client_assignments
  for select using (employee_id = public.current_employee_id());

-- Employees only ever read transfers they personally submitted. All writes
-- (including their own submissions) go through server actions using the
-- service-role client after an app-level auth check — this keeps a rogue
-- client-side request from ever inserting a transfer directly.
drop policy if exists "employee reads own submitted transfers" on public.transfers;
create policy "employee reads own submitted transfers" on public.transfers
  for select using (submitted_by = public.current_employee_id());

drop trigger if exists set_updated_at_employees on public.employees;
create trigger set_updated_at_employees before update on public.employees
  for each row execute function public.set_updated_at();
