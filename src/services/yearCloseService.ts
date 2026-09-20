/**
 * Year-End Close & Carry Forward Service (Spec B6.9)
 * 
 * Rules:
 * - Every student with a balance in the closed year gets exactly ONE carry_forward due
 *   in the target year (system head 'Previous year dues') for the exact balance.
 * - Old dues become 'carried_forward' (not deleted).
 * - Ledger entry written for the carry forward.
 * - Preview available before closing.
 * - Idempotent: repeated runs produce exactly ONE carry-forward due per student.
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { ensureSystemHeads, getFeeHeads } from "./feeSetupService";
import type { StudentDue, FeeLedgerEntry } from "../types/fees";
import type { YearClosePreview, YearCloseResult, YearCloseStudentPreview } from "../types/feeOperations";

function lsGet<T>(key: string): T[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}

function lsSet<T>(key: string, data: T[]) {
  if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Preview Year-End Carry Forward (Spec B6.9)
 */
export async function previewYearClose(
  schoolId: string,
  currentYearId: string,
  targetYearId: string
): Promise<YearClosePreview> {
  const allDues = lsGet<StudentDue>(`myzkool_student_dues_${schoolId}`);

  // Fetch current year unpaid dues
  const currentUnpaidDues = allDues.filter(d => 
    d.academic_year_id === currentYearId && 
    (d.status === "pending" || d.status === "partial") && 
    d.balance_paise > 0
  );

  const students = lsGet<any>(`myzkool_students_${schoolId}`);
  const classes = lsGet<any>(`myzkool_classes_${schoolId}`);

  const studentMap = new Map<string, { balance: number; count: number }>();
  for (const d of currentUnpaidDues) {
    const prev = studentMap.get(d.student_id) || { balance: 0, count: 0 };
    prev.balance += d.balance_paise;
    prev.count += 1;
    studentMap.set(d.student_id, prev);
  }

  const previews: YearCloseStudentPreview[] = [];
  let totalOutstanding = 0;

  for (const [studentId, info] of studentMap.entries()) {
    const s = students.find((st: any) => st.id === studentId);
    const c = classes.find((cl: any) => cl.id === s?.class_id);
    previews.push({
      student_id: studentId,
      student_name: s ? `${s.first_name} ${s.last_name}`.trim() : `Student ${studentId.slice(0, 6)}`,
      admission_no: s?.admission_no || "—",
      class_name: c?.name || "Class",
      outstanding_paise: info.balance,
      unpaid_dues_count: info.count,
    });

    totalOutstanding += info.balance;
  }

  return {
    current_year_id: currentYearId,
    target_year_id: targetYearId,
    total_students_with_balance: previews.length,
    total_outstanding_paise: totalOutstanding,
    students: previews.sort((a, b) => b.outstanding_paise - a.outstanding_paise),
  };
}

/**
 * Execute Year-End Close & Carry Forward (Spec B6.9)
 * Idempotent: repeating produces exactly ONE carry-forward due per student in the target year.
 */
export async function executeYearClose(
  schoolId: string,
  currentYearId: string,
  targetYearId: string,
  actorId?: string
): Promise<YearCloseResult> {
  // 1. Ensure system head for Previous year dues
  await ensureSystemHeads(schoolId);
  const { heads } = await getFeeHeads(schoolId);
  const carryHead = heads.find(h => h.name.toLowerCase().includes("previous year") || h.name.toLowerCase().includes("arrear")) || heads[0];

  const allDues = lsGet<StudentDue>(`myzkool_student_dues_${schoolId}`);
  const ledger = lsGet<FeeLedgerEntry>(`myzkool_fee_ledger_${schoolId}`);
  const years = lsGet<any>(`myzkool_academic_years_${schoolId}`);

  // Fetch current year's unpaid dues
  const currentUnpaidDues = allDues.filter(d => 
    d.academic_year_id === currentYearId && 
    (d.status === "pending" || d.status === "partial") && 
    d.balance_paise > 0
  );

  // Group outstanding balance by student
  const studentBalances = new Map<string, { balance: number; dueIds: string[] }>();
  for (const d of currentUnpaidDues) {
    const prev = studentBalances.get(d.student_id) || { balance: 0, dueIds: [] };
    prev.balance += d.balance_paise;
    prev.dueIds.push(d.id);
    studentBalances.set(d.student_id, prev);
  }

  let studentsProcessed = 0;
  let totalPaiseCarried = 0;
  let duesCreatedCount = 0;

  for (const [studentId, data] of studentBalances.entries()) {
    if (data.balance <= 0) continue;

    // Check if carry forward due already exists for this student in target year (Idempotency!)
    const existingCarryDue = allDues.find(d => 
      d.student_id === studentId && 
      d.academic_year_id === targetYearId && 
      d.source === "carry_forward"
    );

    if (existingCarryDue) {
      // Already carried forward! If balance matches, do nothing. If not, update it.
      if (existingCarryDue.balance_paise !== data.balance) {
        existingCarryDue.gross_paise = data.balance;
        existingCarryDue.net_paise = data.balance;
        existingCarryDue.balance_paise = data.balance;
        existingCarryDue.updated_at = new Date().toISOString();
      }
      continue;
    }

    // 1. Mark old dues as 'carried_forward' (not deleted)
    for (const dueId of data.dueIds) {
      const oldDue = allDues.find(d => d.id === dueId);
      if (oldDue) {
        oldDue.status = "carried_forward" as any;
        oldDue.updated_at = new Date().toISOString();
      }
    }

    // 2. Create exactly ONE carry-forward due in target year
    const targetDueDate = new Date().toISOString().split("T")[0];
    const newCarryDue: StudentDue = {
      id: crypto.randomUUID(),
      school_id: schoolId,
      student_id: studentId,
      academic_year_id: targetYearId,
      fee_head_id: carryHead ? carryHead.id : "head-arrears",
      term_id: null,
      source: "carry_forward",
      description: "Previous year dues (Carried forward)",
      gross_paise: data.balance,
      concession_paise: 0,
      net_paise: data.balance,
      paid_paise: 0,
      balance_paise: data.balance,
      due_date: targetDueDate,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    allDues.push(newCarryDue);
    duesCreatedCount++;
    studentsProcessed++;
    totalPaiseCarried += data.balance;

    // 3. Write ledger entries:
    // a. Credit/clearing entry in current year
    ledger.push({
      id: crypto.randomUUID(),
      school_id: schoolId,
      student_id: studentId,
      academic_year_id: currentYearId,
      entry_type: "carry_forward",
      amount_paise: -data.balance,
      receipt_id: null,
      due_id: null,
      note: `Balance carried forward to next academic year`,
      created_by: actorId || null,
      created_at: new Date().toISOString(),
    });

    // b. Debit entry in target year
    ledger.push({
      id: crypto.randomUUID(),
      school_id: schoolId,
      student_id: studentId,
      academic_year_id: targetYearId,
      entry_type: "due_created",
      amount_paise: data.balance,
      receipt_id: null,
      due_id: newCarryDue.id,
      note: `Arrears from previous academic year`,
      created_by: actorId || null,
      created_at: new Date().toISOString(),
    });
  }

  // Update year status
  const curYear = years.find((y: any) => y.id === currentYearId);
  if (curYear) {
    curYear.is_closed = true;
    curYear.is_current = false;
  }
  const tgtYear = years.find((y: any) => y.id === targetYearId);
  if (tgtYear) {
    tgtYear.is_current = true;
  }

  lsSet(`myzkool_student_dues_${schoolId}`, allDues);
  lsSet(`myzkool_fee_ledger_${schoolId}`, ledger);
  lsSet(`myzkool_academic_years_${schoolId}`, years);

  return {
    closed_year_id: currentYearId,
    target_year_id: targetYearId,
    students_carried_forward: studentsProcessed,
    total_paise_carried_forward: totalPaiseCarried,
    dues_created_count: duesCreatedCount,
  };
}
