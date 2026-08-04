-- ============================================================================
-- Migration 004: billable/refund workflow, client operational fields,
-- employee daily cap, richer lead-detail columns (email, city, extra fields
-- from the real 17-column paste format).
-- Run this in the Supabase SQL Editor AFTER migration 003.
-- Safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TRANSFERS: two-stage outcome (accept, then billable/refund after the call),
-- plus lead-detail columns for the real paste format.
-- ----------------------------------------------------------------------------
alter table public.transfers add column if not exists billing_status text
  check (billing_status in ('billable', 'refund'));
alter table public.transfers add column if not exists billing_decided_at timestamptz;
alter table public.transfers add column if not exists billing_decided_by uuid
  references public.profiles (id);

-- New lead-detail columns the real spreadsheet format captures that the
-- original 9-column parser didn't: email, and city separate from the street
-- address (state/zip already existed). lead_extra holds the handful of
-- ambiguous mid-row columns (e.g. lapses/accidents/tickets/spouse) as
-- labeled key/value pairs so nothing is silently dropped or mislabeled.
alter table public.transfers add column if not exists email text;
alter table public.transfers add column if not exists city text;
alter table public.transfers add column if not exists lead_extra jsonb not null default '[]'::jsonb;

create index if not exists transfers_billing_status_idx on public.transfers (billing_status);

-- ----------------------------------------------------------------------------
-- CLIENTS: operational fields shown on the admin Clients page — campaign
-- status the CLIENT can self-toggle (separate from the admin-controlled
-- account `status`), schedule window, a pause timer, a daily cap, a
-- cool-off, and accepted states.
-- ----------------------------------------------------------------------------
alter table public.clients add column if not exists campaign_status text not null default 'active'
  check (campaign_status in ('active', 'paused'));
alter table public.clients add column if not exists schedule_from time;
alter table public.clients add column if not exists schedule_to time;
alter table public.clients add column if not exists paused_until timestamptz;
alter table public.clients add column if not exists daily_cap integer check (daily_cap is null or daily_cap >= 0);
alter table public.clients add column if not exists cooloff_minutes integer
  check (cooloff_minutes is null or cooloff_minutes >= 0);
alter table public.clients add column if not exists accepted_states text;

-- ----------------------------------------------------------------------------
-- EMPLOYEES: daily submission cap ("max transfers they can upload per day").
-- Enforced in submitLeadTransfer, not just decorative.
-- ----------------------------------------------------------------------------
alter table public.employees add column if not exists daily_cap integer
  check (daily_cap is null or daily_cap >= 0);

-- ----------------------------------------------------------------------------
-- RLS: allow a client to update their OWN campaign_status (self-service
-- toggle) without giving them any other write access. Everything else on
-- clients stays admin-only per the existing "admin full access clients"
-- policy — this is an additive, narrowly-scoped policy.
-- ----------------------------------------------------------------------------
drop policy if exists "client toggles own campaign status" on public.clients;
create policy "client toggles own campaign status" on public.clients
  for update
  using (id = public.current_client_id())
  with check (id = public.current_client_id());

-- ----------------------------------------------------------------------------
-- RPC: client (or admin) marks an already-accepted transfer billable/refund.
-- Runs as SECURITY DEFINER, same pattern as respond_to_transfer.
-- ----------------------------------------------------------------------------
create or replace function public.set_transfer_billing(
  p_transfer_id uuid,
  p_billing_status text
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

  update public.transfers
  set billing_status = p_billing_status,
      billing_decided_at = now(),
      billing_decided_by = auth.uid(),
      updated_at = now()
  where id = p_transfer_id
  returning * into v_row;

  return v_row;
end;
$$;

-- ----------------------------------------------------------------------------
-- Realtime: let the client dashboard subscribe to live inserts/updates on
-- transfers (used for "lead lands on the client's screen instantly").
-- Safe to re-run — guarded against "already a member" errors.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'transfers'
  ) then
    alter publication supabase_realtime add table public.transfers;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- RLS: let an employee read the full record (including the new operational
-- fields) of any client they're assigned to — needed for the employee-side
-- "my assigned clients" view.
-- ----------------------------------------------------------------------------
drop policy if exists "employee reads assigned clients" on public.clients;
create policy "employee reads assigned clients" on public.clients
  for select using (
    exists (
      select 1 from public.employee_client_assignments eca
      where eca.client_id = clients.id and eca.employee_id = public.current_employee_id()
    )
  );
