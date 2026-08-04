-- ============================================================================
-- Migration 003: expenses, actual revenue entries, exchange rate snapshots
-- Run this in the Supabase SQL Editor AFTER migration 002.
-- Admin-only data — no client or employee ever reads these tables.
-- Safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- EXCHANGE RATES — one snapshot per calendar date, entered manually.
-- Rate convention: pkr_per_usd = how many PKR equal 1 USD (e.g. 278.50).
-- Historical entries are never rewritten by a later rate change — that's
-- what "snapshot per period" means: June stays priced at June's rate.
-- ----------------------------------------------------------------------------
create table if not exists public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  rate_date date not null unique,
  pkr_per_usd numeric(10,4) not null check (pkr_per_usd > 0),
  entered_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- EXPENSES — rent, employee pay, software, anything recurring or one-off.
-- ----------------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  description text,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'PKR' check (currency in ('PKR', 'USD')),
  expense_date date not null,
  recurring boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists expenses_date_idx on public.expenses (expense_date);

-- ----------------------------------------------------------------------------
-- REVENUE ENTRIES — what actually landed in the bank, separate from the
-- automatically-computed "billable" total (accepted transfers x client
-- rate). Gross is what the platform charged you for; net is what actually
-- hit your bank after that platform's fee and any tax withheld.
-- ----------------------------------------------------------------------------
create table if not exists public.revenue_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete set null,
  platform text not null default 'other'
    check (platform in ('payoneer', 'paypal', 'bank_transfer', 'other')),
  gross_amount numeric(12,2) not null check (gross_amount >= 0),
  fee_amount numeric(12,2) not null default 0 check (fee_amount >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  net_amount numeric(12,2) not null check (net_amount >= 0),
  currency text not null default 'USD' check (currency in ('PKR', 'USD')),
  received_date date not null,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists revenue_entries_date_idx on public.revenue_entries (received_date);

-- ----------------------------------------------------------------------------
-- Row Level Security — admin only, full stop.
-- ----------------------------------------------------------------------------
alter table public.exchange_rates enable row level security;
alter table public.expenses enable row level security;
alter table public.revenue_entries enable row level security;

drop policy if exists "admin full access exchange_rates" on public.exchange_rates;
create policy "admin full access exchange_rates" on public.exchange_rates
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin full access expenses" on public.expenses;
create policy "admin full access expenses" on public.expenses
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin full access revenue_entries" on public.revenue_entries;
create policy "admin full access revenue_entries" on public.revenue_entries
  for all using (public.is_admin()) with check (public.is_admin());
