/**
 * Day Close Service (Spec B5.9, B6.10, B6.12)
 * 
 * Rules:
 * - Calculates totals by mode and collector for a given date.
 * - Expected cash = opening cash + cash receipts - cash refunds.
 * - Denomination counter (notes and coins).
 * - Closing locks the date: collect and cancel operations for that date are blocked.
 * - Reopening requires owner role + reason.
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { DayClosing, DenominationCount } from "../types/feeOperations";
import type { FeeReceipt, FeePayment } from "../types/collection";

function lsGet<T>(key: string): T[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}

function lsSet<T>(key: string, data: T[]) {
  if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(data));
}

export interface DaySummary {
  business_date: string;
  opening_cash_paise: number;
  cash_receipts_paise: number;
  cash_refunds_paise: number;
  expected_cash_paise: number;
  totals_by_mode: Record<string, number>;
  totals_by_collector: Record<string, number>;
  total_receipts_count: number;
  is_closed: boolean;
  closing?: DayClosing | null;
}

export function calculateDenominationTotal(denominations: DenominationCount): number {
  let totalPaise = 0;
  totalPaise += (denominations.notes_2000 || 0) * 200000;
  totalPaise += (denominations.notes_500 || 0) * 50000;
  totalPaise += (denominations.notes_200 || 0) * 20000;
  totalPaise += (denominations.notes_100 || 0) * 10000;
  totalPaise += (denominations.notes_50 || 0) * 5000;
  totalPaise += (denominations.notes_20 || 0) * 2000;
  totalPaise += (denominations.notes_10 || 0) * 1000;
  totalPaise += (denominations.coins_10 || 0) * 1000;
  totalPaise += (denominations.coins_5 || 0) * 500;
  totalPaise += (denominations.coins_2 || 0) * 200;
  totalPaise += (denominations.coins_1 || 0) * 100;
  return totalPaise;
}

/**
 * Get Day Summary (totals by mode, collector, and expected cash)
 */
export async function getDaySummary(
  schoolId: string,
  businessDate: string
): Promise<DaySummary> {
  const receipts = lsGet<FeeReceipt>(`myzkool_fee_receipts_${schoolId}`)
    .filter(r => r.receipt_date === businessDate && r.status === "active");

  const payments = lsGet<FeePayment>(`myzkool_fee_payments_${schoolId}`);
  const refunds = lsGet<any>(`myzkool_fee_refunds_${schoolId}`)
    .filter((ref: any) => ref.paid_at?.startsWith(businessDate) && ref.status === "paid");

  const closings = lsGet<DayClosing>(`myzkool_day_closings_${schoolId}`);
  const existingClosing = closings.find(c => c.business_date === businessDate);

  const openingCashPaise = existingClosing?.opening_cash_paise ?? 0;

  const totalsByMode: Record<string, number> = {
    cash: 0,
    upi: 0,
    card: 0,
    cheque: 0,
    bank_transfer: 0,
    other: 0,
  };
  const totalsByCollector: Record<string, number> = {};

  for (const r of receipts) {
    const collector = r.collected_by || "System";
    totalsByCollector[collector] = (totalsByCollector[collector] || 0) + r.total_paise;

    const rPayments = payments.filter(p => p.receipt_id === r.id);
    for (const p of rPayments) {
      const modeKey = p.mode || "other";
      totalsByMode[modeKey] = (totalsByMode[modeKey] || 0) + p.amount_paise;
    }
  }

  const cashReceiptsPaise = totalsByMode.cash || 0;
  const cashRefundsPaise = refunds
    .filter((rf: any) => rf.payment_mode === "cash")
    .reduce((sum: number, rf: any) => sum + rf.amount_paise, 0);

  const expectedCashPaise = openingCashPaise + cashReceiptsPaise - cashRefundsPaise;

  return {
    business_date: businessDate,
    opening_cash_paise: openingCashPaise,
    cash_receipts_paise: cashReceiptsPaise,
    cash_refunds_paise: cashRefundsPaise,
    expected_cash_paise: expectedCashPaise,
    totals_by_mode: totalsByMode,
    totals_by_collector: totalsByCollector,
    total_receipts_count: receipts.length,
    is_closed: existingClosing?.status === "closed",
    closing: existingClosing,
  };
}

/**
 * Check if business date is locked/closed (B6.12)
 */
export async function isBusinessDateClosed(
  schoolId: string,
  businessDate: string
): Promise<boolean> {
  const closings = lsGet<DayClosing>(`myzkool_day_closings_${schoolId}`);
  const closing = closings.find(c => c.business_date === businessDate);
  return closing?.status === "closed";
}

/**
 * Close Business Day (Locks date)
 */
export async function closeDay(
  schoolId: string,
  input: {
    business_date: string;
    opening_cash_paise?: number;
    denominations?: DenominationCount;
    counted_cash_paise?: number;
    notes?: string;
  },
  actorId?: string
): Promise<{ success: boolean; closing: DayClosing; error?: string }> {
  const summary = await getDaySummary(schoolId, input.business_date);

  const countedCash = input.counted_cash_paise !== undefined 
    ? input.counted_cash_paise 
    : (input.denominations ? calculateDenominationTotal(input.denominations) : summary.expected_cash_paise);

  const differencePaise = countedCash - summary.expected_cash_paise;

  const closing: DayClosing = {
    id: crypto.randomUUID(),
    school_id: schoolId,
    business_date: input.business_date,
    opening_cash_paise: input.opening_cash_paise ?? summary.opening_cash_paise,
    system_cash_paise: summary.cash_receipts_paise,
    refunds_cash_paise: summary.cash_refunds_paise,
    expected_cash_paise: summary.expected_cash_paise,
    counted_cash_paise: countedCash,
    denominations: input.denominations,
    difference_paise: differencePaise,
    notes: input.notes,
    totals_by_mode: summary.totals_by_mode,
    status: "closed",
    closed_by: actorId || null,
    closed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const closings = lsGet<DayClosing>(`myzkool_day_closings_${schoolId}`);
  const existingIdx = closings.findIndex(c => c.business_date === input.business_date);
  if (existingIdx >= 0) {
    closings[existingIdx] = closing;
  } else {
    closings.push(closing);
  }
  lsSet(`myzkool_day_closings_${schoolId}`, closings);

  return { success: true, closing };
}

/**
 * Reopen Business Day (Requires owner role and reason)
 */
export async function reopenDay(
  schoolId: string,
  businessDate: string,
  reason: string,
  actorRole?: string,
  actorId?: string
): Promise<{ success: boolean; error?: string }> {
  const isOwner = actorRole === "owner" || actorRole === "school_admin";
  if (!isOwner) {
    return { success: false, error: "Only the school owner can reopen a closed business day." };
  }
  if (!reason || reason.trim().length < 10) {
    return { success: false, error: "Reopen reason must be at least 10 characters." };
  }

  const closings = lsGet<DayClosing>(`myzkool_day_closings_${schoolId}`);
  const closing = closings.find(c => c.business_date === businessDate);
  if (!closing) return { success: false, error: "Day closing record not found" };

  closing.status = "reopened";
  closing.reopened_by = actorId || null;
  closing.reopened_at = new Date().toISOString();
  closing.reopen_reason = reason;
  closing.updated_at = new Date().toISOString();

  lsSet(`myzkool_day_closings_${schoolId}`, closings);
  return { success: true };
}
