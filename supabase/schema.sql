-- ============================================================================
-- VOXPACT database schema
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query)
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE where possible.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- CLIENTS  (the insurance agents / businesses you sell transfers to)
-- ----------------------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text,
  email text,
  phone text,
  price_per_transfer numeric(10,2),
  status text not null default 'active' check (status in ('active', 'paused')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- PROFILES  (links a Supabase auth user to a role, and to a client if applicable)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'client')),
  client_id uuid references public.clients (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  constraint client_role_needs_client_id check (
    (role = 'client' and client_id is not null) or (role = 'admin')
  )
);

-- ----------------------------------------------------------------------------
-- INVOICES
-- ----------------------------------------------------------------------------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  invoice_number text not null unique,
  period_start date not null,
  period_end date not null,
  total_amount numeric(10,2) not null default 0,
  transfer_count integer not null default 0,
  status text not null default 'generated' check (status in ('generated', 'sent', 'paid')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- TRANSFERS  (the daily live-transfer records, uploaded by admin via CSV)
-- ----------------------------------------------------------------------------
create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  transfer_date date not null,
  transfer_time text,
  lead_name text,
  phone text,
  state text,
  insurance_type text,
  value numeric(10,2) not null default 0,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  decline_reason text,
  responded_at timestamptz,
  invoice_id uuid references public.invoices (id) on delete set null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transfers_client_id_idx on public.transfers (client_id);
create index if not exists transfers_date_idx on public.transfers (transfer_date);
create index if not exists transfers_status_idx on public.transfers (status);
create index if not exists transfers_invoice_id_idx on public.transfers (invoice_id);
create index if not exists profiles_client_id_idx on public.profiles (client_id);

-- ----------------------------------------------------------------------------
-- Helper: is the current user an admin?
-- SECURITY DEFINER + fixed search_path so it can read profiles regardless of RLS
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.current_client_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select client_id from public.profiles where id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- RPC: client accepts or declines a transfer
-- Runs as SECURITY DEFINER so a client can update a row they don't have
-- direct UPDATE rights on, but only under these exact conditions.
-- ----------------------------------------------------------------------------
create or replace function public.respond_to_transfer(
  p_transfer_id uuid,
  p_status text,
  p_decline_reason text default null
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
  if p_status not in ('accepted', 'declined') then
    raise exception 'Invalid status: %', p_status;
  end if;

  select client_id into v_caller_client_id from public.profiles where id = auth.uid();

  if v_caller_client_id is null then
    raise exception 'Not authorized';
  end if;

  select * into v_row from public.transfers where id = p_transfer_id for update;

  if v_row is null then
    raise exception 'Transfer not found';
  end if;

  if v_row.client_id <> v_caller_client_id then
    raise exception 'Not authorized for this transfer';
  end if;

  if v_row.status <> 'pending' then
    raise exception 'Transfer already responded to';
  end if;

  if p_status = 'declined' and (p_decline_reason is null or length(trim(p_decline_reason)) = 0) then
    raise exception 'A decline reason is required';
  end if;

  update public.transfers
  set status = p_status,
      decline_reason = case when p_status = 'declined' then p_decline_reason else null end,
      responded_at = now(),
      updated_at = now()
  where id = p_transfer_id
  returning * into v_row;

  return v_row;
end;
$$;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.clients enable row level security;
alter table public.profiles enable row level security;
alter table public.transfers enable row level security;
alter table public.invoices enable row level security;

drop policy if exists "admin full access clients" on public.clients;
create policy "admin full access clients" on public.clients
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "client reads own record" on public.clients;
create policy "client reads own record" on public.clients
  for select using (id = public.current_client_id());

drop policy if exists "admin full access profiles" on public.profiles;
create policy "admin full access profiles" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "user reads own profile" on public.profiles;
create policy "user reads own profile" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "admin full access transfers" on public.transfers;
create policy "admin full access transfers" on public.transfers
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "client reads own transfers" on public.transfers;
create policy "client reads own transfers" on public.transfers
  for select using (client_id = public.current_client_id());

drop policy if exists "admin full access invoices" on public.invoices;
create policy "admin full access invoices" on public.invoices
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "client reads own invoices" on public.invoices;
create policy "client reads own invoices" on public.invoices
  for select using (client_id = public.current_client_id());

-- ----------------------------------------------------------------------------
-- Keep updated_at fresh
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_clients on public.clients;
create trigger set_updated_at_clients before update on public.clients
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_transfers on public.transfers;
create trigger set_updated_at_transfers before update on public.transfers
  for each row execute function public.set_updated_at();
