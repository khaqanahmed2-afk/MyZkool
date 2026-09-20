/**
 * Late Fee Job (Spec B6.7)
 * Evaluates unpaid dues past due date + grace days.
 * 
 * Rules:
 * - Creates or updates ONE late_fee due linked to parent due.
 * - Never compounds.
 * - percent_once is calculated once on the unpaid balance at the first evaluation after grace and then fixed.
 * - Payment of parent due stops further accrual.
 * - Job is idempotent by (due, date).
 * - Waiving writes a ledger 'waiver' entry and records who waived it.
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { getLateFeeRules, ensureSystemHeads, getFeeHeads } from "./feeSetupService";
import type { StudentDue, FeeLedgerEntry } from "../types/fees";

function lsGet<T>(key: string): T[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}

function lsSet<T>(key: string, data: T[]) {
  if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(data));
}

export interface LateFeeJobReport {
  evaluated_dues: number;
  late_fees_created: number;
  late_fees_updated: number;
  total_late_fee_paise: number;
  job_date: string;
}

export async function runLateFeeJob(
  schoolId: string,
  academicYearId: string,
  asOfDateStr?: string
): Promise<LateFeeJobReport> {
  const asOfDate = asOfDateStr ? new Date(asOfDateStr) : new Date();
  const dateKey = asOfDate.toISOString().split("T")[0];

  // 1. Ensure system head for Late fee exists
  await ensureSystemHeads(schoolId);
  const { heads } = await getFeeHeads(schoolId);
  const lateFeeHead = heads.find(h => h.name.toLowerCase().includes("late fee")) || heads[0];

  // 2. Fetch rules
  const { rules } = await getLateFeeRules(schoolId);
  const activeRule = rules.find(r => r.is_active);

  // Default fallback rule if none configured: grace 5 days, Rs 20/day, cap Rs 1000
  const graceDays = activeRule?.grace_days ?? 5;
  const method = activeRule?.method ?? "per_day";
  const ruleValue = activeRule?.value ?? 2000;
  const maxCapPaise = activeRule?.max_cap_paise ?? 100000;

  let dues: StudentDue[] = [];
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from("student_dues")
      .select("*")
      .eq("school_id", schoolId)
      .eq("academic_year_id", academicYearId);
    dues = (data || []) as StudentDue[];
  } else {
    dues = lsGet<StudentDue>(`myzkool_student_dues_${schoolId}`)
      .filter(d => d.academic_year_id === academicYearId);
  }

  // Parent dues that are unpaid and not already a late fee due itself
  const parentDues = dues.filter(d => 
    d.source !== "late_fee" && 
    (d.status === "pending" || d.status === "partial") &&
    d.balance_paise > 0
  );

  let createdCount = 0;
  let updatedCount = 0;
  let totalPaise = 0;

  for (const parent of parentDues) {
    const dueDueDate = new Date(parent.due_date);
    const diffTime = asOfDate.getTime() - dueDueDate.getTime();
    const daysLate = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (daysLate <= graceDays) {
      continue; // within grace period
    }

    // Calculate late fee amount
    let feePaise = 0;
    if (method === "per_day") {
      const chargeableDays = daysLate - graceDays;
      feePaise = chargeableDays * ruleValue;
    } else if (method === "per_week") {
      const chargeableWeeks = Math.ceil((daysLate - graceDays) / 7);
      feePaise = chargeableWeeks * ruleValue;
    } else if (method === "per_month") {
      const chargeableMonths = Math.ceil((daysLate - graceDays) / 30);
      feePaise = chargeableMonths * ruleValue;
    } else if (method === "flat_once") {
      feePaise = ruleValue;
    } else if (method === "percent_once") {
      // Fixed on unpaid balance at first evaluation
      feePaise = Math.round(parent.balance_paise * (ruleValue / 100));
    }

    if (maxCapPaise > 0) {
      feePaise = Math.min(feePaise, maxCapPaise);
    }

    if (feePaise <= 0) continue;

    // Check if an existing late fee due exists for this parent due
    const existingLateFee = dues.find(d => 
      d.source === "late_fee" && 
      (d as any).parent_due_id === parent.id
    );

    if (existingLateFee) {
      // Never compound, and if percent_once or flat_once, do not change
      if (method === "percent_once" || method === "flat_once") {
        continue;
      }

      // Update daily if amount changed
      if (existingLateFee.gross_paise !== feePaise) {
        const diff = feePaise - existingLateFee.gross_paise;
        existingLateFee.gross_paise = feePaise;
        existingLateFee.net_paise = Math.max(0, feePaise - existingLateFee.concession_paise);
        existingLateFee.balance_paise = Math.max(0, existingLateFee.net_paise - existingLateFee.paid_paise);
        existingLateFee.updated_at = new Date().toISOString();
        updatedCount++;
        totalPaise += diff;
      }
    } else {
      // Create new late fee due linked to parent
      const newLateDue: StudentDue & { parent_due_id?: string } = {
        id: crypto.randomUUID(),
        school_id: schoolId,
        student_id: parent.student_id,
        academic_year_id: academicYearId,
        fee_head_id: lateFeeHead ? lateFeeHead.id : parent.fee_head_id,
        term_id: parent.term_id,
        source: "late_fee",
        parent_due_id: parent.id,
        description: `Late fee for ${parent.description || 'Due'}`,
        gross_paise: feePaise,
        concession_paise: 0,
        net_paise: feePaise,
        paid_paise: 0,
        balance_paise: feePaise,
        due_date: dateKey,
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      dues.push(newLateDue);
      createdCount++;
      totalPaise += feePaise;

      // Write ledger due_created row
      const ledgerEntry: FeeLedgerEntry = {
        id: crypto.randomUUID(),
        school_id: schoolId,
        student_id: parent.student_id,
        academic_year_id: academicYearId,
        entry_type: "late_fee",
        amount_paise: feePaise,
        receipt_id: null,
        due_id: newLateDue.id,
        note: `Late fee assessed for ${parent.description || 'due'} (${daysLate} days overdue)`,
        created_by: null,
        created_at: new Date().toISOString(),
      };

      if (!isSupabaseConfigured) {
        const ledger = lsGet<FeeLedgerEntry>(`myzkool_fee_ledger_${schoolId}`);
        ledger.push(ledgerEntry);
        lsSet(`myzkool_fee_ledger_${schoolId}`, ledger);
      }
    }
  }

  if (!isSupabaseConfigured) {
    lsSet(`myzkool_student_dues_${schoolId}`, dues);
  }

  return {
    evaluated_dues: parentDues.length,
    late_fees_created: createdCount,
    late_fees_updated: updatedCount,
    total_late_fee_paise: totalPaise,
    job_date: dateKey,
  };
}

/**
 * Waive Late Fee (B6.7)
 * Writes a ledger 'waiver' entry and records who waived it.
 */
export async function waiveLateFee(
  schoolId: string,
  dueId: string,
  reason: string,
  actorId?: string
): Promise<{ success: boolean; waived_paise: number; error?: string }> {
  if (!reason || reason.trim().length < 5) {
    return { success: false, waived_paise: 0, error: "Reason is required (min 5 characters)" };
  }

  let due: (StudentDue & { parent_due_id?: string }) | undefined;
  let allDues: StudentDue[] = [];

  if (isSupabaseConfigured) {
    const { data } = await supabase.from("student_dues").select("*").eq("id", dueId).single();
    due = data as any;
  } else {
    allDues = lsGet<StudentDue>(`myzkool_student_dues_${schoolId}`);
    due = allDues.find(d => d.id === dueId) as any;
  }

  if (!due) return { success: false, waived_paise: 0, error: "Due not found" };
  if (due.source !== "late_fee") return { success: false, waived_paise: 0, error: "Only late fee dues can be waived" };
  if (due.balance_paise <= 0) return { success: false, waived_paise: 0, error: "Due has no outstanding balance to waive" };

  const waivedAmount = due.balance_paise;
  due.concession_paise += waivedAmount;
  due.net_paise = Math.max(0, due.gross_paise - due.concession_paise);
  due.balance_paise = 0;
  due.status = "waived" as any;
  due.updated_at = new Date().toISOString();

  // Ledger entry for waiver (reduces student balance owed, so negative or waiver type)
  const ledgerEntry: FeeLedgerEntry = {
    id: crypto.randomUUID(),
    school_id: schoolId,
    student_id: due.student_id,
    academic_year_id: due.academic_year_id,
    entry_type: "waiver",
    amount_paise: -waivedAmount,
    receipt_id: null,
    due_id: due.id,
    note: `Late fee waived: ${reason} (by ${actorId || 'admin'})`,
    created_by: actorId || null,
    created_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured) {
    lsSet(`myzkool_student_dues_${schoolId}`, allDues);
    const ledger = lsGet<FeeLedgerEntry>(`myzkool_fee_ledger_${schoolId}`);
    ledger.push(ledgerEntry);
    lsSet(`myzkool_fee_ledger_${schoolId}`, ledger);
  }

  return { success: true, waived_paise: waivedAmount };
}
