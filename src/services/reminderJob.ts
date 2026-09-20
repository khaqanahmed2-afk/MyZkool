/**
 * Fee Reminder Engine & Follow-up Service (Spec B5.6)
 * 
 * Rules:
 * - Default reminder rules: 3 days before (-3), on due date (0), 7 days after (7), 15 days (15), 30 days (30).
 * - Maximum 5 sends per due.
 * - Skip balances under set minimum.
 * - Skip paid dues.
 * - Respect quiet hours (e.g. 21:00 to 08:00 IST).
 * - Deduplication: outbox dedupe_key prevents repeating for the same (due, rule, offset).
 * - Follow-up notes and promised payment dates.
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { FeeReminderRule, FeeFollowup } from "../types/feeOperations";
import type { StudentDue } from "../types/fees";

function lsGet<T>(key: string): T[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}

function lsSet<T>(key: string, data: T[]) {
  if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(data));
}

export const DEFAULT_REMINDER_RULES: Omit<FeeReminderRule, "id" | "school_id" | "created_at" | "updated_at">[] = [
  { name: "3 days before due", days_offset: -3, channel: "whatsapp", template_key: "fee_reminder_upcoming", is_active: true, max_sends: 1, min_balance_paise: 10000 },
  { name: "On due date", days_offset: 0, channel: "whatsapp", template_key: "fee_reminder_due_today", is_active: true, max_sends: 1, min_balance_paise: 10000 },
  { name: "7 days overdue", days_offset: 7, channel: "whatsapp", template_key: "fee_reminder_overdue_7", is_active: true, max_sends: 2, min_balance_paise: 10000 },
  { name: "15 days overdue", days_offset: 15, channel: "whatsapp", template_key: "fee_reminder_overdue_15", is_active: true, max_sends: 3, min_balance_paise: 10000 },
  { name: "30 days overdue", days_offset: 30, channel: "whatsapp", template_key: "fee_reminder_overdue_30", is_active: true, max_sends: 5, min_balance_paise: 10000 },
];

export function isQuietHoursIST(date: Date = new Date()): boolean {
  // Asia/Kolkata hour
  const istHour = parseInt(
    date.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }),
    10
  );
  // Quiet hours: 9 PM (21:00) to 8 AM (08:00)
  return istHour >= 21 || istHour < 8;
}

export interface ReminderJobResult {
  evaluated_count: number;
  reminders_queued: number;
  skipped_quiet_hours: boolean;
  skipped_already_sent: number;
  skipped_paid: number;
}

/**
 * Get or initialize reminder rules for a school
 */
export async function getReminderRules(schoolId: string): Promise<FeeReminderRule[]> {
  const rules = lsGet<FeeReminderRule>(`myzkool_fee_reminder_rules_${schoolId}`);
  if (rules.length > 0) return rules;

  // Seed default rules
  const seeded: FeeReminderRule[] = DEFAULT_REMINDER_RULES.map(r => ({
    ...r,
    id: crypto.randomUUID(),
    school_id: schoolId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
  lsSet(`myzkool_fee_reminder_rules_${schoolId}`, seeded);
  return seeded;
}

/**
 * Run Automated Reminders Engine (Spec B5.6)
 */
export async function runReminderJob(
  schoolId: string,
  academicYearId: string,
  options: { ignoreQuietHours?: boolean; asOfDateStr?: string } = {}
): Promise<ReminderJobResult> {
  const asOfDate = options.asOfDateStr ? new Date(options.asOfDateStr) : new Date();

  // Check quiet hours
  if (!options.ignoreQuietHours && isQuietHoursIST(asOfDate)) {
    return {
      evaluated_count: 0,
      reminders_queued: 0,
      skipped_quiet_hours: true,
      skipped_already_sent: 0,
      skipped_paid: 0,
    };
  }

  const rules = (await getReminderRules(schoolId)).filter(r => r.is_active);
  const dues = lsGet<StudentDue>(`myzkool_student_dues_${schoolId}`)
    .filter(d => d.academic_year_id === academicYearId);

  const outbox = lsGet<any>(`myzkool_fee_outbox_${schoolId}`);
  const sentDedupeKeys = new Set<string>(outbox.map((o: any) => o.payload?.dedupe_key).filter(Boolean));

  let queued = 0;
  let skippedAlreadySent = 0;
  let skippedPaid = 0;

  for (const due of dues) {
    // Rule: Skip paid dues
    if (due.status === "paid" || due.balance_paise <= 0) {
      skippedPaid++;
      continue;
    }

    const dueDueDate = new Date(due.due_date);
    const diffTime = asOfDate.getTime() - dueDueDate.getTime();
    const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    for (const rule of rules) {
      // Check minimum balance
      if (due.balance_paise < rule.min_balance_paise) continue;

      // Check if today matches rule days_offset
      if (daysOverdue === rule.days_offset) {
        // Dedupe key: unique per school, due, rule, and year
        const dedupeKey = `reminder_${schoolId}_${due.student_id}_${due.id}_rule_${rule.days_offset}`;

        if (sentDedupeKeys.has(dedupeKey)) {
          skippedAlreadySent++;
          continue;
        }

        // Queue reminder into fee_outbox
        outbox.push({
          id: crypto.randomUUID(),
          school_id: schoolId,
          event_type: "reminder",
          payload: {
            dedupe_key: dedupeKey,
            student_id: due.student_id,
            due_id: due.id,
            template_key: rule.template_key,
            channel: rule.channel,
            balance_paise: due.balance_paise,
            due_date: due.due_date,
          },
          status: "pending",
          attempts: 0,
          created_at: new Date().toISOString(),
        });

        sentDedupeKeys.add(dedupeKey);
        queued++;
      }
    }
  }

  lsSet(`myzkool_fee_outbox_${schoolId}`, outbox);

  return {
    evaluated_count: dues.length,
    reminders_queued: queued,
    skipped_quiet_hours: false,
    skipped_already_sent: skippedAlreadySent,
    skipped_paid: skippedPaid,
  };
}

/**
 * Add or update student follow-up with promise date
 */
export async function addFollowup(
  schoolId: string,
  studentId: string,
  input: {
    note: string;
    promise_date?: string | null;
  },
  actorId?: string
): Promise<FeeFollowup> {
  const followups = lsGet<FeeFollowup>(`myzkool_fee_followups_${schoolId}`);
  const followup: FeeFollowup = {
    id: crypto.randomUUID(),
    school_id: schoolId,
    student_id: studentId,
    staff_id: actorId || null as any,
    note: input.note,
    promise_date: input.promise_date || null,
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  followups.push(followup);
  lsSet(`myzkool_fee_followups_${schoolId}`, followups);
  return followup;
}

/**
 * Get followups for a student or promised today
 */
export async function getFollowups(
  schoolId: string,
  studentId?: string,
  promisedTodayOnly?: boolean
): Promise<FeeFollowup[]> {
  const followups = lsGet<FeeFollowup>(`myzkool_fee_followups_${schoolId}`);
  const today = new Date().toISOString().split("T")[0];

  return followups.filter(f => {
    if (studentId && f.student_id !== studentId) return false;
    if (promisedTodayOnly && f.promise_date !== today) return false;
    return true;
  });
}

