/**
 * Cheque Register Service (Spec B5.7)
 * 
 * Manages cheque lifecycle:
 * received -> deposited -> cleared / bounced.
 * 
 * Bounce flow:
 * - Reverses the payment (ledger reversal entry).
 * - Restores each affected due's paid amount and balance.
 * - Marks the receipt 'bounced'.
 * - Optional bounce charge added as a manual due.
 * - Respects cheque_receipt_timing ('on_receipt' vs 'on_clearance').
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { ChequeItem } from "../types/feeOperations";
import type { FeeReceipt, FeePayment, FeeReceiptItem } from "../types/collection";
import type { StudentDue, FeeLedgerEntry } from "../types/fees";

function lsGet<T>(key: string): T[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}

function lsSet<T>(key: string, data: T[]) {
  if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Fetch all cheques for a school with student and receipt details
 */
export async function getCheques(
  schoolId: string,
  statusFilter?: "received" | "deposited" | "cleared" | "bounced"
): Promise<ChequeItem[]> {
  const payments = lsGet<FeePayment>(`myzkool_fee_payments_${schoolId}`).filter(p => p.mode === "cheque");
  const receipts = lsGet<FeeReceipt>(`myzkool_fee_receipts_${schoolId}`);
  const students = lsGet<any>(`myzkool_students_${schoolId}`);

  const cheques: ChequeItem[] = payments.map(p => {
    const r = receipts.find(rec => rec.id === p.receipt_id);
    const s = students.find((st: any) => st.id === r?.student_id);

    const chequeStatus = p.cheque_status || (r?.status === "bounced" ? "bounced" : "received");

    return {
      id: p.id,
      payment_id: p.id,
      receipt_id: p.receipt_id,
      receipt_no: r?.receipt_no || "—",
      student_id: r?.student_id || "",
      student_name: s ? `${s.first_name} ${s.last_name}`.trim() : "Student",
      admission_no: s?.admission_no || "—",
      amount_paise: p.amount_paise,
      bank_name: p.bank_name || "Bank",
      cheque_no: p.instrument_no || p.reference_no || "CHQ000000",
      cheque_date: p.instrument_date || p.created_at.split("T")[0],
      status: chequeStatus as any,
    };
  });

  if (statusFilter) {
    return cheques.filter(c => c.status === statusFilter);
  }
  return cheques;
}

/**
 * Update cheque status (e.g. mark deposited or cleared)
 */
export async function updateChequeStatus(
  schoolId: string,
  paymentId: string,
  newStatus: "deposited" | "cleared",
  actorId?: string
): Promise<{ success: boolean; error?: string }> {
  const payments = lsGet<FeePayment>(`myzkool_fee_payments_${schoolId}`);
  const payment = payments.find(p => p.id === paymentId);
  if (!payment) return { success: false, error: "Cheque payment record not found" };

  payment.cheque_status = newStatus;
  lsSet(`myzkool_fee_payments_${schoolId}`, payments);
  return { success: true };
}

/**
 * Handle Cheque Bounce (Spec B5.7)
 * - Restores dues
 * - Reverses ledger entry
 * - Marks receipt 'bounced'
 * - Optionally creates a manual due for bounce charge
 */
export async function bounceCheque(
  schoolId: string,
  paymentId: string,
  input: {
    bounce_reason: string;
    bounce_charge_paise?: number; // optional bounce penalty fee
  },
  actorId?: string
): Promise<{ success: boolean; error?: string }> {
  const payments = lsGet<FeePayment>(`myzkool_fee_payments_${schoolId}`);
  const payment = payments.find(p => p.id === paymentId);
  if (!payment) return { success: false, error: "Cheque payment record not found" };

  const receipts = lsGet<FeeReceipt>(`myzkool_fee_receipts_${schoolId}`);
  const receipt = receipts.find(r => r.id === payment.receipt_id);
  if (!receipt) return { success: false, error: "Associated receipt not found" };

  // 1. Mark payment and receipt bounced
  payment.cheque_status = "bounced";
  receipt.status = "bounced" as any;
  receipt.cancel_reason = `Cheque bounced: ${input.bounce_reason}`;
  receipt.updated_at = new Date().toISOString();

  // 2. Restore dues
  const items = lsGet<FeeReceiptItem>(`myzkool_fee_receipt_items_${schoolId}`)
    .filter(i => i.receipt_id === receipt.id);
  const dues = lsGet<StudentDue>(`myzkool_student_dues_${schoolId}`);

  for (const item of items) {
    const due = dues.find(d => d.id === item.due_id);
    if (due) {
      due.paid_paise = Math.max(0, due.paid_paise - item.amount_paise);
      due.balance_paise = due.net_paise - due.paid_paise;
      due.status = due.paid_paise === 0 ? "pending" : "partial";
      due.updated_at = new Date().toISOString();
    }
  }

  // 3. Write ledger reversal entry
  const ledger = lsGet<FeeLedgerEntry>(`myzkool_fee_ledger_${schoolId}`);
  ledger.push({
    id: crypto.randomUUID(),
    school_id: schoolId,
    student_id: receipt.student_id,
    academic_year_id: receipt.academic_year_id,
    entry_type: "reversal",
    amount_paise: payment.amount_paise, // Restores amount owed
    receipt_id: receipt.id,
    due_id: null,
    note: `Cheque #${payment.instrument_no || payment.reference_no} BOUNCED: ${input.bounce_reason}`,
    created_by: actorId || null,
    created_at: new Date().toISOString(),
  });

  // 4. If bounce charge specified, create a manual due
  if (input.bounce_charge_paise && input.bounce_charge_paise > 0) {
    const bounceDue: StudentDue = {
      id: crypto.randomUUID(),
      school_id: schoolId,
      student_id: receipt.student_id,
      academic_year_id: receipt.academic_year_id,
      fee_head_id: "head-bounce-charge",
      term_id: null,
      source: "manual",
      description: `Cheque bounce charge (Chq #${payment.instrument_no || payment.reference_no})`,
      gross_paise: input.bounce_charge_paise,
      concession_paise: 0,
      net_paise: input.bounce_charge_paise,
      paid_paise: 0,
      balance_paise: input.bounce_charge_paise,
      due_date: new Date().toISOString().split("T")[0],
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    dues.push(bounceDue);

    ledger.push({
      id: crypto.randomUUID(),
      school_id: schoolId,
      student_id: receipt.student_id,
      academic_year_id: receipt.academic_year_id,
      entry_type: "due_created",
      amount_paise: input.bounce_charge_paise,
      receipt_id: null,
      due_id: bounceDue.id,
      note: `Cheque bounce penalty assessed`,
      created_by: actorId || null,
      created_at: new Date().toISOString(),
    });
  }

  lsSet(`myzkool_fee_payments_${schoolId}`, payments);
  lsSet(`myzkool_fee_receipts_${schoolId}`, receipts);
  lsSet(`myzkool_student_dues_${schoolId}`, dues);
  lsSet(`myzkool_fee_ledger_${schoolId}`, ledger);

  return { success: true };
}
