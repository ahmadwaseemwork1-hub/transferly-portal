"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, authErrorMessage } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/app/admin/actions";
import type { Currency, Platform } from "@/lib/types";

export async function addExpense(input: {
  category: string;
  description: string;
  amount: string;
  currency: Currency;
  expense_date: string;
  recurring: boolean;
}): Promise<ActionResult> {
  let adminUser;
  try {
    adminUser = await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }

  const amount = Number(input.amount);
  if (!input.category.trim()) return { ok: false, error: "Category is required." };
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, error: "Enter a valid amount." };
  }
  if (!input.expense_date) return { ok: false, error: "Date is required." };

  const admin = createAdminClient();
  const { error } = await admin.from("expenses").insert({
    category: input.category.trim(),
    description: input.description.trim() || null,
    amount,
    currency: input.currency,
    expense_date: input.expense_date,
    recurring: input.recurring,
    created_by: adminUser.user.id,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/financials");
  return { ok: true, data: undefined };
}

export async function addRevenueEntry(input: {
  client_id: string;
  platform: Platform;
  gross_amount: string;
  fee_amount: string;
  tax_amount: string;
  currency: Currency;
  received_date: string;
  notes: string;
}): Promise<ActionResult<{ net: number }>> {
  let adminUser;
  try {
    adminUser = await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }

  const gross = Number(input.gross_amount);
  const fee = Number(input.fee_amount) || 0;
  const tax = Number(input.tax_amount) || 0;

  if (!Number.isFinite(gross) || gross < 0) {
    return { ok: false, error: "Enter a valid gross amount." };
  }
  if (fee < 0 || tax < 0) return { ok: false, error: "Fees and taxes can't be negative." };
  if (fee + tax > gross) {
    return { ok: false, error: "Fees plus taxes can't exceed the gross amount." };
  }
  if (!input.received_date) return { ok: false, error: "Date is required." };

  const net = Math.round((gross - fee - tax) * 100) / 100;

  const admin = createAdminClient();
  const { error } = await admin.from("revenue_entries").insert({
    client_id: input.client_id || null,
    platform: input.platform,
    gross_amount: gross,
    fee_amount: fee,
    tax_amount: tax,
    net_amount: net,
    currency: input.currency,
    received_date: input.received_date,
    notes: input.notes.trim() || null,
    created_by: adminUser.user.id,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/financials");
  return { ok: true, data: { net } };
}

export async function setExchangeRate(
  rateDate: string,
  pkrPerUsd: string
): Promise<ActionResult> {
  let adminUser;
  try {
    adminUser = await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }

  const rate = Number(pkrPerUsd);
  if (!rateDate) return { ok: false, error: "Date is required." };
  if (!Number.isFinite(rate) || rate <= 0) {
    return { ok: false, error: "Enter a valid exchange rate." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("exchange_rates")
    .upsert(
      { rate_date: rateDate, pkr_per_usd: rate, entered_by: adminUser.user.id },
      { onConflict: "rate_date" }
    );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/financials");
  return { ok: true, data: undefined };
}

export async function updateClientRate(
  clientId: string,
  pricePerTransfer: string
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (err) {
    return { ok: false, error: authErrorMessage(err) };
  }

  const price = Number(pricePerTransfer);
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, error: "Enter a valid rate." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("clients")
    .update({ price_per_transfer: price })
    .eq("id", clientId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin");
  return { ok: true, data: undefined };
}
