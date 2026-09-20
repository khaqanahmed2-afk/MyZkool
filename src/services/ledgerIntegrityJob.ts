/**
 * Ledger Integrity Job (Phase 3a)
 *
 * Nightly job that compares student_dues balances with fee_ledger sums.
 * On mismatch: writes an alert row to fee_ledger (entry_type = 'adjustment').
 * Idempotent: skips students already checked today.
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { StudentDue, FeeLedgerEntry } from "../types/fees";

const INTEGRITY_KEY = (s: string, d: string) => `myzkool_integrity_checked_${s}_${d}`;

function now() { return new Date().toISOString(); }
function uuid() { return crypto.randomUUID(); }
function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function lsGet<T>(key: string): T[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}
function lsSet<T>(key: string, data: T[]) {
  if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(data));
}

export interface IntegrityReport {
  checked: number;
  mismatches: number;
  alerts: Array<{ student_id: string; dues_balance: number; ledger_net: number; diff: number }>;
}

export async function runLedgerIntegrityCheck(
  schoolId: string,
  yearId: string,
): Promise<IntegrityReport> {
  const today = todayIST();
  const report: IntegrityReport = { checked: 0, mismatches: 0, alerts: [] };

  // Idempotency: skip if already run today
  const alreadyRun = typeof localStorage !== "undefined" && localStorage.getItem(INTEGRITY_KEY(schoolId, today));
  if (alreadyRun) return report;

  if (isSupabaseConfigured) {
    // In Supabase mode: query aggregates
    try {
      const { data: duesData } = await supabase.from("student_dues")
        .select("student_id, net_paise, paid_paise")
        .eq("school_id", schoolId).eq("academic_year_id", yearId)
        .not("status", "in", "(cancelled,carried_forward,waived)");

      const { data: ledgerData } = await supabase.from("fee_ledger")
        .select("student_id, amount_paise")
        .eq("school_id", schoolId).eq("academic_year_id", yearId);

      if (!duesData || !ledgerData) return report;

      // Aggregate dues balance per student
      const duesBalance: Record<string, number> = {};
      for (const row of duesData as any[]) {
        duesBalance[row.student_id] = (duesBalance[row.student_id] ?? 0) + (row.net_paise - row.paid_paise);
      }

      // Aggregate ledger net per student (positive = owes, negative = paid)
      const ledgerNet: Record<string, number> = {};
      for (const row of ledgerData as any[]) {
        ledgerNet[row.student_id] = (ledgerNet[row.student_id] ?? 0) + row.amount_paise;
      }

      const allStudents = new Set([...Object.keys(duesBalance), ...Object.keys(ledgerNet)]);
      for (const studentId of allStudents) {
        report.checked++;
        const db = duesBalance[studentId] ?? 0;
        const ln = ledgerNet[studentId] ?? 0;
        if (Math.abs(db - ln) > 0) {
          report.mismatches++;
          report.alerts.push({ student_id: studentId, dues_balance: db, ledger_net: ln, diff: db - ln });
          // Write alert ledger row
          await supabase.from("fee_ledger").insert({
            school_id: schoolId, student_id: studentId, academic_year_id: yearId,
            due_id: null, receipt_id: null,
            entry_type: "adjustment",
            amount_paise: 0,
            note: `INTEGRITY ALERT: dues_balance=${db} ledger_net=${ln} diff=${db - ln} date=${today}`,
            created_by: null, created_at: now(),
          });
        }
      }
      localStorage?.setItem(INTEGRITY_KEY(schoolId, today), "1");
      return report;
    } catch (e: any) {
      throw new Error(`Integrity check failed: ${e.message}`);
    }
  }

  // localStorage mode
  const dues = lsGet<StudentDue>(`myzkool_student_dues_${schoolId}`)
    .filter(d => d.academic_year_id === yearId && !["cancelled","carried_forward","waived"].includes(d.status));
  const ledger = lsGet<FeeLedgerEntry>(`myzkool_fee_ledger_${schoolId}`)
    .filter(e => e.academic_year_id === yearId);

  const duesBalance: Record<string, number> = {};
  for (const d of dues) {
    duesBalance[d.student_id] = (duesBalance[d.student_id] ?? 0) + d.balance_paise;
  }

  const ledgerNet: Record<string, number> = {};
  for (const e of ledger) {
    ledgerNet[e.student_id] = (ledgerNet[e.student_id] ?? 0) + e.amount_paise;
  }

  const allStudents = new Set([...Object.keys(duesBalance), ...Object.keys(ledgerNet)]);
  for (const studentId of allStudents) {
    report.checked++;
    const db = duesBalance[studentId] ?? 0;
    // Ledger: positive = owed, negative = paid, net should equal balance
    const ln = ledgerNet[studentId] ?? 0;
    if (Math.abs(db - ln) > 0) {
      report.mismatches++;
      report.alerts.push({ student_id: studentId, dues_balance: db, ledger_net: ln, diff: db - ln });
      // Write alert row
      const all = lsGet<FeeLedgerEntry>(`myzkool_fee_ledger_${schoolId}`);
      all.push({
        id: uuid(),
        school_id: schoolId,
        student_id: studentId,
        academic_year_id: yearId,
        due_id: null,
        receipt_id: null,
        entry_type: "adjustment",
        amount_paise: 0,
        note: `INTEGRITY ALERT: dues_balance=${db} ledger_net=${ln} diff=${db - ln} date=${today}`,
        created_by: null,
        created_at: now(),
      });
      lsSet(`myzkool_fee_ledger_${schoolId}`, all);
    }
  }

  if (typeof localStorage !== "undefined") localStorage.setItem(INTEGRITY_KEY(schoolId, today), "1");
  return report;
}

