/**
 * Collection Service (Phase 3a)
 *
 * Main engine for:
 *   - POST /fee/collect  (collectFees)
 *   - POST /receipts/:id/cancel  (cancelReceipt)
 *   - GET /students/:id/collect-context  (getCollectContext)
 *   - GET /collect/search  (searchStudents)
 *
 * In Supabase mode: uses the atomic `collect_fees` and `cancel_receipt` RPCs
 * so everything runs in a single DB transaction with row locks.
 *
 * In localStorage mode (dev): simulates the transaction atomically in JS.
 *
 * All amounts in integer paise. Never mutates input objects.
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { computeAllocation, validateAllocation } from "../lib/feeAllocation";
import { nextReceiptNo } from "./counterService";
import { getFeeSettings } from "./feeSetupService";
import { getStudentDues } from "./feeDuesService";
import type {
  CollectInput, CollectResult, CancelReceiptInput, CancelReceiptResult,
  FeeReceipt, FeeReceiptItem, FeePayment, CollectContext,
} from "../types/collection";
import type { StudentDue, FeeCredit, FeeLedgerEntry } from "../types/fees";

// ─── Cache keys ───────────────────────────────────────────────────────────────
const RECEIPTS_KEY  = (s: string) => `myzkool_fee_receipts_${s}`;
const ITEMS_KEY     = (s: string) => `myzkool_fee_receipt_items_${s}`;
const PAYMENTS_KEY  = (s: string) => `myzkool_fee_payments_${s}`;
const IDEMPOTENCY_KEY = (s: string) => `myzkool_idempotency_${s}`;
const CREDITS_KEY   = (s: string) => `myzkool_fee_credits_${s}`;
const DUES_KEY      = (s: string) => `myzkool_student_dues_${s}`;
const LEDGER_KEY    = (s: string) => `myzkool_fee_ledger_${s}`;

function now() { return new Date().toISOString(); }
function uuid() { return crypto.randomUUID(); }

function lsGet<T>(key: string): T[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}
function lsSet<T>(key: string, data: T[]) {
  if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(data));
}
function lsGetMap<T>(key: string): Record<string, T> {
  if (typeof localStorage === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; }
}
function lsSetMap<T>(key: string, data: Record<string, T>) {
  if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(data));
}

// ─── Per-student mutex (dev localStorage only) ────────────────────────────────
// Serializes concurrent collects for the same student to prevent TOCTOU races.
const _collectQueue: Map<string, Promise<unknown>> = new Map();
function withStudentLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = _collectQueue.get(key) ?? Promise.resolve();
  const next = prev.then(() => fn(), () => fn()); // always run even if prev threw
  _collectQueue.set(key, next.catch(() => {}));
  return next;
}

// ─── Business date (Asia/Kolkata) ─────────────────────────────────────────────
export function getTodayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

// ─── Day close check ──────────────────────────────────────────────────────────
async function isDateClosed(schoolId: string, dateStr: string): Promise<boolean> {
  if (isSupabaseConfigured) {
    const { data } = await supabase.from("day_closings")
      .select("id, status").eq("school_id", schoolId).eq("business_date", dateStr).maybeSingle();
    return data?.status === "closed";
  }
  const closings = lsGet<{ school_id: string; business_date: string; status: string }>(
    `myzkool_day_closings_${schoolId}`
  );
  const found = closings.find(c => c.business_date === dateStr);
  return found?.status === "closed";
}

// ─── Collect fees (localStorage path) ────────────────────────────────────────

async function collectFeesLocal(
  schoolId: string,
  input: CollectInput,
  idempotencyKey: string,
  actorId?: string,
): Promise<CollectResult> {
  // 1. Idempotency check
  const idempMap = lsGetMap<string>(IDEMPOTENCY_KEY(schoolId));
  if (idempMap[idempotencyKey]) {
    const existingId = idempMap[idempotencyKey];
    const receipts = lsGet<FeeReceipt>(RECEIPTS_KEY(schoolId));
    const existing = receipts.find(r => r.id === existingId);
    if (existing) {
      return {
        receipt_id: existing.id,
        receipt_no: existing.receipt_no,
        idempotent: true,
        lines: [],
        advance_paise: 0,
        total_paise: existing.total_paise,
      };
    }
  }

  // 2. Business date validation
  const receiptDate = input.receipt_date ?? getTodayIST();
  const closed = await isDateClosed(schoolId, receiptDate);
  if (closed) throw new Error(`Business date ${receiptDate} is closed`);

  // 3. Fetch dues
  const { dues } = await getStudentDues(schoolId, input.student_id, input.academic_year_id);
  const pendingDues = dues.filter(d => d.status === "pending" || d.status === "partial");

  // 4. Total amount
  const totalPaise = input.payments.reduce((s, p) => s + p.amount_paise, 0);
  if (totalPaise <= 0) throw new Error("Total payment amount must be positive");

  // 5. Allocation
  const { settings } = await getFeeSettings(schoolId);
  const allocationResult = computeAllocation(
    pendingDues,
    totalPaise,
    settings.allocation_mode,
    input.selected_due_ids,
  );

  // 6. Receipt number
  const years = typeof localStorage !== "undefined"
    ? JSON.parse(localStorage.getItem(`myzkool_academic_years_${schoolId}`) || "[]") : [];
  const year = years.find((y: any) => y.id === input.academic_year_id);
  const yearLabel = year?.label ?? "2026-27";
  const prefix = settings.receipt_prefix ?? "MZ";
  const receiptNo = await nextReceiptNo(schoolId, input.academic_year_id, prefix, yearLabel);

  // 7. Write receipt
  const receiptId = uuid();
  const receipt: FeeReceipt = {
    id: receiptId,
    school_id: schoolId,
    receipt_no: receiptNo,
    student_id: input.student_id,
    academic_year_id: input.academic_year_id,
    receipt_date: receiptDate,
    total_paise: totalPaise,
    status: "active",
    source: input.source ?? "counter",
    payment_group_id: input.payment_group_id ?? null,
    collected_by: actorId ?? null,
    remarks: input.remarks ?? null,
    idempotency_key: idempotencyKey,
    print_count: 0,
    whatsapp_sent_at: null,
    cancelled_by: null,
    cancelled_at: null,
    cancel_reason: null,
    created_at: now(),
    updated_at: now(),
  };
  lsSet(RECEIPTS_KEY(schoolId), [...lsGet<FeeReceipt>(RECEIPTS_KEY(schoolId)), receipt]);

  // 8. Write payment rows
  const paymentRows: FeePayment[] = input.payments.map(p => ({
    id: uuid(),
    school_id: schoolId,
    receipt_id: receiptId,
    mode: p.mode,
    amount_paise: p.amount_paise,
    reference_no: p.reference_no ?? null,
    bank_name: null, instrument_no: null, instrument_date: null,
    cheque_status: null, gateway_order_id: null, gateway_payment_id: null,
    created_at: now(),
  }));
  lsSet(PAYMENTS_KEY(schoolId), [...lsGet<FeePayment>(PAYMENTS_KEY(schoolId)), ...paymentRows]);

  // 9. Write receipt items + update dues + write ledger
  const itemRows: FeeReceiptItem[] = [];
  const allDues = lsGet<StudentDue>(DUES_KEY(schoolId));
  const ledger = lsGet<FeeLedgerEntry>(LEDGER_KEY(schoolId));

  for (const line of allocationResult.lines) {
    if (line.allocated_paise <= 0) continue;

    itemRows.push({
      id: uuid(),
      receipt_id: receiptId,
      due_id: line.due_id,
      fee_head_id: line.fee_head_id,
      amount_paise: line.allocated_paise,
      concession_paise: 0,
    });

    // Update due
    const dueIdx = allDues.findIndex(d => d.id === line.due_id);
    if (dueIdx >= 0) {
      const due = allDues[dueIdx];
      const newPaid = due.paid_paise + line.allocated_paise;
      allDues[dueIdx] = {
        ...due,
        paid_paise: newPaid,
        balance_paise: due.net_paise - newPaid,
        status: newPaid >= due.net_paise ? "paid" : newPaid > 0 ? "partial" : "pending",
        updated_at: now(),
      };
    }

    // Ledger row
    ledger.push({
      id: uuid(),
      school_id: schoolId,
      student_id: input.student_id,
      academic_year_id: input.academic_year_id,
      due_id: line.due_id,
      receipt_id: receiptId,
      entry_type: "payment",
      amount_paise: -line.allocated_paise,
      note: `Payment via ${receiptNo}`,
      created_by: actorId ?? null,
      created_at: now(),
    });
  }

  lsSet(ITEMS_KEY(schoolId), [...lsGet<FeeReceiptItem>(ITEMS_KEY(schoolId)), ...itemRows]);
  lsSet(DUES_KEY(schoolId), allDues);

  // 10. Advance credit
  if (allocationResult.advance_paise > 0) {
    const credits = lsGet<FeeCredit>(CREDITS_KEY(schoolId));
    credits.push({
      id: uuid(),
      school_id: schoolId,
      student_id: input.student_id,
      academic_year_id: input.academic_year_id,
      amount_paise: allocationResult.advance_paise,
      remaining_paise: allocationResult.advance_paise,
      source_receipt_id: receiptId,
      created_at: now(),
    });
    lsSet(CREDITS_KEY(schoolId), credits);

    ledger.push({
      id: uuid(),
      school_id: schoolId,
      student_id: input.student_id,
      academic_year_id: input.academic_year_id,
      due_id: null,
      receipt_id: receiptId,
      entry_type: "payment",
      amount_paise: -allocationResult.advance_paise,
      note: `Advance credit via ${receiptNo}`,
      created_by: actorId ?? null,
      created_at: now(),
    });
  }

  lsSet(LEDGER_KEY(schoolId), ledger);

  // 11. Idempotency map
  idempMap[idempotencyKey] = receiptId;
  lsSetMap(IDEMPOTENCY_KEY(schoolId), idempMap);

  return {
    receipt_id: receiptId,
    receipt_no: receiptNo,
    idempotent: false,
    lines: allocationResult.lines,
    advance_paise: allocationResult.advance_paise,
    total_paise: totalPaise,
  };
}

// ─── Public: collect fees ─────────────────────────────────────────────────────

export async function collectFees(
  schoolId: string,
  input: CollectInput,
  idempotencyKey: string,
  actorId?: string,
): Promise<CollectResult> {
  if (!schoolId || !input.student_id) throw new Error("schoolId and student_id required");
  if (!input.payments || input.payments.length === 0) throw new Error("At least one payment line required");

  if (isSupabaseConfigured) {
    try {
      const receiptDate = input.receipt_date ?? getTodayIST();
      const closed = await isDateClosed(schoolId, receiptDate);
      if (closed) throw new Error(`Business date ${receiptDate} is closed`);

      const { dues } = await getStudentDues(schoolId, input.student_id, input.academic_year_id);
      const pendingDues = dues.filter(d => d.status === "pending" || d.status === "partial");
      const totalPaise = input.payments.reduce((s, p) => s + p.amount_paise, 0);
      const { settings } = await getFeeSettings(schoolId);

      const allocationResult = computeAllocation(
        pendingDues, totalPaise,
        settings.allocation_mode, input.selected_due_ids,
      );

      const years: any[] = [];
      const { data: yearData } = await supabase.from("academic_years").select("label").eq("id", input.academic_year_id).single();
      const yearLabel = yearData?.label ?? "2026-27";
      const prefix = settings.receipt_prefix ?? "MZ";

      const { data, error } = await supabase.rpc("collect_fees", {
        p_school_id: schoolId,
        p_student_id: input.student_id,
        p_academic_year_id: input.academic_year_id,
        p_receipt_date: receiptDate,
        p_total_paise: totalPaise,
        p_source: input.source ?? "counter",
        p_payment_group_id: input.payment_group_id ?? null,
        p_collected_by: actorId ?? null,
        p_remarks: input.remarks ?? null,
        p_idempotency_key: idempotencyKey,
        p_prefix: prefix,
        p_year_label: yearLabel,
        p_allocations: allocationResult.lines.map(l => ({
          due_id: l.due_id,
          amount_paise: l.allocated_paise,
        })),
        p_payments: input.payments,
        p_advance_paise: allocationResult.advance_paise,
      });
      if (error) throw error;
      const result = data as { receipt_id: string; receipt_no: string; idempotent: boolean };
      return {
        receipt_id: result.receipt_id,
        receipt_no: result.receipt_no,
        idempotent: result.idempotent,
        lines: allocationResult.lines,
        advance_paise: allocationResult.advance_paise,
        total_paise: totalPaise,
      };
    } catch (e: any) { throw new Error(e.message); }
  }

  return withStudentLock(`${schoolId}:${input.student_id}`, () =>
    collectFeesLocal(schoolId, input, idempotencyKey, actorId)
  );
}


// ─── Public: cancel receipt ───────────────────────────────────────────────────

export async function cancelReceipt(
  schoolId: string,
  receiptId: string,
  input: CancelReceiptInput,
  actorId?: string,
): Promise<CancelReceiptResult> {
  if (!input.reason || input.reason.length < 10) {
    throw new Error("Cancel reason must be at least 10 characters");
  }

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc("cancel_receipt", {
      p_school_id: schoolId,
      p_receipt_id: receiptId,
      p_reason: input.reason,
      p_actor_id: actorId ?? null,
    });
    if (error) throw new Error(error.message);
    const r = data as { cancelled: boolean; receipt_no: string };
    return { ...r, reversed_lines: 0 };
  }

  // localStorage path
  const receipts = lsGet<FeeReceipt>(RECEIPTS_KEY(schoolId));
  const receiptIdx = receipts.findIndex(r => r.id === receiptId && r.school_id === schoolId);
  if (receiptIdx < 0) throw new Error("Receipt not found");
  const receipt = receipts[receiptIdx];
  if (receipt.status !== "active") throw new Error(`Receipt is already ${receipt.status}`);

  const closed = await isDateClosed(schoolId, receipt.receipt_date);
  if (closed) throw new Error(`Business date ${receipt.receipt_date} is closed`);

  // Reverse items
  const items = lsGet<FeeReceiptItem>(ITEMS_KEY(schoolId)).filter(i => i.receipt_id === receiptId);
  const allDues = lsGet<StudentDue>(DUES_KEY(schoolId));
  const ledger = lsGet<FeeLedgerEntry>(LEDGER_KEY(schoolId));

  for (const item of items) {
    const dueIdx = allDues.findIndex(d => d.id === item.due_id);
    if (dueIdx >= 0) {
      const due = allDues[dueIdx];
      const newPaid = Math.max(0, due.paid_paise - item.amount_paise);
      allDues[dueIdx] = {
        ...due,
        paid_paise: newPaid,
        balance_paise: due.net_paise - newPaid,
        status: newPaid === 0 && due.net_paise > 0 ? "pending"
              : newPaid < due.net_paise ? "partial"
              : "paid",
        updated_at: now(),
      };
      ledger.push({
        id: uuid(),
        school_id: schoolId,
        student_id: receipt.student_id,
        academic_year_id: receipt.academic_year_id,
        due_id: item.due_id,
        receipt_id: receiptId,
        entry_type: "reversal",
        amount_paise: item.amount_paise,
        note: `Reversal of ${receipt.receipt_no}: ${input.reason}`,
        created_by: actorId ?? null,
        created_at: now(),
      });
    }
  }

  // Mark receipt cancelled
  receipts[receiptIdx] = {
    ...receipt,
    status: "cancelled",
    cancelled_by: actorId ?? null,
    cancelled_at: now(),
    cancel_reason: input.reason,
    updated_at: now(),
  };

  lsSet(RECEIPTS_KEY(schoolId), receipts);
  lsSet(DUES_KEY(schoolId), allDues);
  lsSet(LEDGER_KEY(schoolId), ledger);

  return { cancelled: true, receipt_no: receipt.receipt_no, reversed_lines: items.length };
}

// ─── Public: get receipts ─────────────────────────────────────────────────────

export async function getReceipts(
  schoolId: string,
  studentId?: string,
  yearId?: string,
): Promise<{ receipts: FeeReceipt[]; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      let q = supabase.from("fee_receipts").select("*").eq("school_id", schoolId).order("created_at", { ascending: false });
      if (studentId) q = q.eq("student_id", studentId);
      if (yearId) q = q.eq("academic_year_id", yearId);
      const { data, error } = await q;
      if (error) throw error;
      return { receipts: (data || []) as FeeReceipt[] };
    } catch (e: any) { return { receipts: [], error: e.message }; }
  }
  let receipts = lsGet<FeeReceipt>(RECEIPTS_KEY(schoolId));
  if (studentId) receipts = receipts.filter(r => r.student_id === studentId);
  if (yearId) receipts = receipts.filter(r => r.academic_year_id === yearId);
  return { receipts: receipts.sort((a, b) => b.created_at.localeCompare(a.created_at)) };
}

export async function getReceiptById(
  schoolId: string,
  receiptId: string,
): Promise<{ receipt?: FeeReceipt; items?: FeeReceiptItem[]; payments?: FeePayment[]; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const [{ data: r }, { data: it }, { data: py }] = await Promise.all([
        supabase.from("fee_receipts").select("*").eq("id", receiptId).eq("school_id", schoolId).single(),
        supabase.from("fee_receipt_items").select("*").eq("receipt_id", receiptId),
        supabase.from("fee_payments").select("*").eq("receipt_id", receiptId),
      ]);
      return { receipt: r as FeeReceipt, items: (it || []) as FeeReceiptItem[], payments: (py || []) as FeePayment[] };
    } catch (e: any) { return { error: e.message }; }
  }
  const receipt = lsGet<FeeReceipt>(RECEIPTS_KEY(schoolId)).find(r => r.id === receiptId && r.school_id === schoolId);
  if (!receipt) return { error: "Receipt not found" };
  const items = lsGet<FeeReceiptItem>(ITEMS_KEY(schoolId)).filter(i => i.receipt_id === receiptId);
  const payments = lsGet<FeePayment>(PAYMENTS_KEY(schoolId)).filter(p => p.receipt_id === receiptId);
  return { receipt, items, payments };
}

// ─── Collect context (for counter UI) ────────────────────────────────────────

export async function getCollectContext(
  schoolId: string,
  studentId: string,
  yearId?: string,
): Promise<CollectContext> {
  // Get student
  let student = { id: studentId, name: "Unknown", admission_no: "", class_name: "" };
  if (isSupabaseConfigured) {
    const { data } = await supabase.from("students")
      .select("id, first_name, last_name, admission_no")
      .eq("id", studentId).eq("school_id", schoolId).single();
    if (data) {
      student = {
        id: data.id,
        name: `${data.first_name} ${data.last_name}`.trim(),
        admission_no: data.admission_no,
        class_name: "",
      };
    }
  } else {
    const cached = lsGet<any>(`myzkool_students_${schoolId}`).find((s: any) => s.id === studentId);
    if (cached) {
      student = {
        id: cached.id,
        name: `${cached.first_name} ${cached.last_name}`.trim(),
        admission_no: cached.admission_no,
        class_name: "",
      };
    }
  }

  // Get dues
  const { dues } = await getStudentDues(schoolId, studentId, yearId);

  // Get credits
  let credits: FeeCredit[] = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase.from("fee_credits")
      .select("*").eq("school_id", schoolId).eq("student_id", studentId);
    credits = (data || []) as FeeCredit[];
  } else {
    credits = lsGet<FeeCredit>(CREDITS_KEY(schoolId)).filter(c => c.student_id === studentId && c.remaining_paise > 0);
  }

  // Has structure?
  const hasStructure = dues.length > 0 || lsGet<any>(`myzkool_fee_assignments_${schoolId}`)
    .some((a: any) => a.student_id === studentId && a.status === "active");

  return {
    student,
    dues: dues.filter(d => d.status === "pending" || d.status === "partial"),
    credits,
    siblings: [],   // Phase 3b will wire sibling lookup
    has_structure: hasStructure,
  };
}

// ─── Student search (counter) ─────────────────────────────────────────────────

export async function searchStudentsForCounter(
  schoolId: string,
  q: string,
): Promise<Array<{ id: string; name: string; admission_no: string; balance_paise: number }>> {
  const term = q.trim().toLowerCase();
  if (term.length < 2) return [];

  if (isSupabaseConfigured) {
    const { data } = await supabase.from("students")
      .select("id, first_name, last_name, admission_no")
      .eq("school_id", schoolId).is("deleted_at", null)
      .or(`admission_no.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
      .limit(20);
    if (!data) return [];
    return data.map((s: any) => ({
      id: s.id,
      name: `${s.first_name} ${s.last_name}`.trim(),
      admission_no: s.admission_no,
      balance_paise: 0, // enriched client-side or via join in Phase 3b
    }));
  }

  const all = lsGet<any>(`myzkool_students_${schoolId}`).filter((s: any) => !s.deleted_at);
  return all
    .filter((s: any) =>
      s.admission_no?.toLowerCase().includes(term) ||
      s.first_name?.toLowerCase().includes(term) ||
      s.last_name?.toLowerCase().includes(term)
    )
    .slice(0, 20)
    .map((s: any) => ({
      id: s.id,
      name: `${s.first_name} ${s.last_name}`.trim(),
      admission_no: s.admission_no,
      balance_paise: 0,
    }));
}

// FeeCredit is imported from "../types/fees" above — no local redefinition needed.

