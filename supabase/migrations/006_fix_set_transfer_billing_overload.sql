-- Migration 005 added set_transfer_billing(uuid, text, text) via CREATE OR
-- REPLACE, but that only replaces a function with an identical argument
-- list. Since it added a third parameter, Postgres kept the old
-- set_transfer_billing(uuid, text) from migration 004 as a separate
-- overload instead of replacing it. With both versions present,
-- PostgREST's RPC call resolution can inconsistently route
-- set_transfer_billing calls to either one — explaining why marking a
-- transfer billable/refund worked intermittently. Drop the stale
-- 2-argument overload so only the 3-argument (note-aware) version remains.

drop function if exists public.set_transfer_billing(uuid, text);
