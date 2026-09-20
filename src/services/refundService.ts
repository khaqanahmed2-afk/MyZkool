/**
 * Refunds and Adjustments Service (Spec B5.8)
 * 
 * Manages refund lifecycle:
 * requested -> approved -> paid (or rejected).
 * 
 * Rules:
 * - Amount cannot exceed total paid amount or credit balance.
 * - Paid refunds create ledger entries (outflow) and appear in the day book.
 * - Adjustments move credit between dues or correct a wrong due.
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { FeeRefund } from "../types/feeOperations";
import type { FeeLedgerEntry, FeeCredit } from "../types/fees";

function lsGet<T>(key: string): T[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}

function lsSet<T>(key: string, data: T[]) {
  if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Request a refund
 */
export async function requestRefund(
  schoolId: string,
  input: {
    student_id: string;
    academic_year_id: string;
    receipt_id?: string | null;
    amount_paise: number;
    reason: string;
    payment_mode: "cash" | "bank_transfer" | "cheque" | "upi" | "other";
  },
  actorId?: string
): Promise<{ success: boolean; refund: FeeRefund; error?: string }> {
  if (!input.reason || input.reason.trim().length < 5) {
    return { success: false, refund: null as any, error: "Reason is required (min 5 characters)" };
  }
  if (input.amount_paise <= 0) {
    return { success: false, refund: null as any, error: "Refund amount must be greater than 0" };
  }

  const refund: FeeRefund = {
    id: crypto.randomUUID(),
    school_id: schoolId,
    student_id: input.student_id,
    receipt_id: input.receipt_id || null,
    academic_year_id: input.academic_year_id,
    amount_paise: input.amount_paise,
    reason: input.reason,
    status: "requested",
    payment_mode: input.payment_mode,
    requested_by: actorId || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const refunds = lsGet<FeeRefund>(`myzkool_fee_refunds_${schoolId}`);
  refunds.push(refund);
  lsSet(`myzkool_fee_refunds_${schoolId}`, refunds);

  return { success: true, refund };
}

/**
 * Approve or Reject Refund
 */
export async function approveRefund(
  schoolId: string,
  refundId: string,
  approved: boolean,
  actorId?: string
): Promise<{ success: boolean; error?: string }> {
  const refunds = lsGet<FeeRefund>(`myzkool_fee_refunds_${schoolId}`);
  const refund = refunds.find(r => r.id === refundId);
  if (!refund) return { success: false, error: "Refund request not found" };

  refund.status = approved ? "approved" : "rejected";
  refund.approved_by = actorId || null;
  refund.approved_at = new Date().toISOString();
  refund.updated_at = new Date().toISOString();

  lsSet(`myzkool_fee_refunds_${schoolId}`, refunds);
  return { success: true };
}

/**
 * Pay / Disburse Approved Refund
 * Writes ledger entry and marks paid.
 */
export async function payRefund(
  schoolId: string,
  refundId: string,
  referenceNo?: string,
  actorId?: string
): Promise<{ success: boolean; error?: string }> {
  const refunds = lsGet<FeeRefund>(`myzkool_fee_refunds_${schoolId}`);
  const refund = refunds.find(r => r.id === refundId);
  if (!refund) return { success: false, error: "Refund request not found" };
  if (refund.status !== "approved") return { success: false, error: "Refund must be approved before payment" };

  refund.status = "paid";
  refund.reference_no = referenceNo || null;
  refund.paid_at = new Date().toISOString();
  refund.updated_at = new Date().toISOString();

  // Write ledger outflow entry
  const ledger = lsGet<FeeLedgerEntry>(`myzkool_fee_ledger_${schoolId}`);
  const ledgerId = crypto.randomUUID();
  refund.ledger_entry_id = ledgerId;

  ledger.push({
    id: ledgerId,
    school_id: schoolId,
    student_id: refund.student_id,
    academic_year_id: refund.academic_year_id,
    entry_type: "reversal", // Increases balance or represents cash outflow
    amount_paise: refund.amount_paise,
    receipt_id: refund.receipt_id || null,
    due_id: null,
    note: `Fee refund paid: ${refund.reason} (${refund.payment_mode.toUpperCase()})`,
    created_by: actorId || null,
    created_at: new Date().toISOString(),
  });

  lsSet(`myzkool_fee_refunds_${schoolId}`, refunds);
  lsSet(`myzkool_fee_ledger_${schoolId}`, ledger);

  return { success: true };
}

/**
 * Fetch all refunds for a school
 */
export async function getRefunds(schoolId: string): Promise<FeeRefund[]> {
  return lsGet<FeeRefund>(`myzkool_fee_refunds_${schoolId}`);
}
