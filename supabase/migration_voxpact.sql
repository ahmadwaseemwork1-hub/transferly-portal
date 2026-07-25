-- ============================================================================
-- VOXPACT migration — run once in Supabase SQL Editor
-- Adds: state/requirements to clients, employees table, employee_uploads table
-- ============================================================================

-- 1. Add new columns to clients
alter table public.clients add column if not exists state text;
alter table public.clients add column if not exists requirements text;

-- 2. Update profiles role constraint to include 'employee'
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'client', 'employee'));

-- Relax client_role_needs_client_id to allow employee role too
alter table public.profiles drop constraint if exists client_role_needs_client_id;
alter table public.profiles add column if not exists employee_id uuid;

-- 3. Create employees table
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  daily_cap integer not null default 10,
  status text not null default 'active' check (status in ('active', 'paused')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Create employee_uploads table
create table if not exists public.employee_uploads (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  upload_date date not null default current_date,
  transfer_count integer not null default 0,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists employee_uploads_employee_id_idx on public.employee_uploads (employee_id);
create index if not exists employee_uploads_date_idx on public.employee_uploads (upload_date);
create index if not exists employees_email_idx on public.employees (email);

-- 5. Helper functions
create or replace function public.is_employee()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'employee'
  );
$$;

create or replace function public.current_employee_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select employee_id from public.profiles where id = auth.uid();
$$;

-- 6. RLS for employees
alter table public.employees enable row level security;

drop policy if exists "admin full access employees" on public.employees;
create policy "admin full access employees" on public.employees
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "employee reads own record" on public.employees;
create policy "employee reads own record" on public.employees
  for select using (id = public.current_employee_id());

-- 7. RLS for employee_uploads
alter table public.employee_uploads enable row level security;

drop policy if exists "admin full access employee_uploads" on public.employee_uploads;
create policy "admin full access employee_uploads" on public.employee_uploads
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "employee manages own uploads" on public.employee_uploads;
create policy "employee manages own uploads" on public.employee_uploads
  for all using (employee_id = public.current_employee_id())
  with check (employee_id = public.current_employee_id());

-- 8. updated_at trigger for employees
drop trigger if exists set_updated_at_employees on public.employees;
create trigger set_updated_at_employees before update on public.employees
  for each row execute function public.set_updated_at();
