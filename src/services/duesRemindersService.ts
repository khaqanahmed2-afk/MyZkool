/**
 * Dues & Reminders Service
 * 
 * Provides production-ready data layer for:
 * - Real-time student fee balances, overdue analysis, and metrics
 * - Reminder template management with dynamic variables
 * - WhatsApp & SMS bulk reminder dispatch and scheduling
 * - De-duplication and re-verification of balances prior to sending
 * - Full delivery history and failure retry management
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { getSchoolInvoices } from "./invoiceService";
import { formatPaiseCompact } from "../lib/amountInWords";
import type {
  DuesReminderRow,
  DuesSummaryMetrics,
  ReminderTemplate,
  ReminderDispatchLog,
  SendRemindersPayload,
  SendRemindersResult,
  DueStatusType,
} from "../types/duesReminders";
import type { FeeReminderRule, FeeFollowup } from "../types/feeOperations";
import type { StudentInvoice } from "../types/fees";

function lsGet<T>(key: string): T[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function lsSet<T>(key: string, data: T[]): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(key, JSON.stringify(data));
  }
}

function getTodayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = String(d.getDate()).padStart(2, "0");
    const mon = months[d.getMonth()];
    const yr = d.getFullYear();
    return `${day} ${mon} ${yr}`;
  } catch {
    return dateStr;
  }
}

const AVATAR_COLORS = [
  { bg: "#EBF2FE", text: "#2563EB" }, // blue
  { bg: "#F3E8FF", text: "#7E22CE" }, // purple
  { bg: "#ECFDF5", text: "#059669" }, // emerald
  { bg: "#FEF3C7", text: "#D97706" }, // amber
  { bg: "#FFE4E6", text: "#E11D48" }, // rose
  { bg: "#E0F2FE", text: "#0284C7" }, // sky
  { bg: "#F1F5F9", text: "#475569" }, // slate
];

function getAvatarForName(name: string): { bg: string; text: string; initials: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : (name.slice(0, 2) || "ST").toUpperCase();

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % AVATAR_COLORS.length;
  const color = AVATAR_COLORS[colorIndex];
  return { bg: color.bg, text: color.text, initials };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DEFAULT TEMPLATES SEED
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_REMINDER_TEMPLATES: Omit<ReminderTemplate, "id" | "schoolId" | "createdAt" | "updatedAt">[] = [
  {
    name: "Payment Reminder (Default)",
    purpose: "general",
    channel: "whatsapp",
    body: `Dear Parent,\nThis is a reminder that a fee balance of ₹{amount} is pending for your child, {student_name} (Class {class_section}).\nInvoice: {invoice_no}\nDue Date: {due_date}\nPlease complete the payment at the earliest. For any assistance, contact the school office.\n- {school_name}`,
    variables: ["student_name", "parent_name", "class_section", "amount", "invoice_no", "due_date", "school_name"],
    isActive: true,
  },
  {
    name: "Upcoming Fee Due",
    purpose: "upcoming",
    channel: "whatsapp",
    body: `Dear Parent,\nThis is an advance notice that fee invoice {invoice_no} amounting to ₹{amount} for {student_name} (Class {class_section}) will be due on {due_date}.\nPlease plan payment accordingly.\n- {school_name}`,
    variables: ["student_name", "parent_name", "class_section", "amount", "invoice_no", "due_date", "school_name"],
    isActive: true,
  },
  {
    name: "Due Today",
    purpose: "due_today",
    channel: "whatsapp",
    body: `Dear Parent,\nFriendly reminder that the school fee of ₹{amount} for {student_name} (Class {class_section}) is due today ({due_date}).\nInvoice: {invoice_no}\nKindly make the payment today to avoid late fees.\n- {school_name}`,
    variables: ["student_name", "parent_name", "class_section", "amount", "invoice_no", "due_date", "school_name"],
    isActive: true,
  },
  {
    name: "Overdue Fee Notice",
    purpose: "overdue",
    channel: "whatsapp",
    body: `URGENT: Dear Parent, the fee payment of ₹{amount} for {student_name} (Class {class_section}) is overdue since {due_date}.\nInvoice: {invoice_no}\nPlease clear the outstanding dues immediately.\n- {school_name}`,
    variables: ["student_name", "parent_name", "class_section", "amount", "invoice_no", "due_date", "school_name"],
    isActive: true,
  },
  {
    name: "Partial Payment Follow-up",
    purpose: "partial",
    channel: "whatsapp",
    body: `Dear Parent,\nThank you for your recent payment. A remaining balance of ₹{amount} is still outstanding for {student_name} against Invoice {invoice_no}.\nPlease arrange for settlement at your earliest convenience.\n- {school_name}`,
    variables: ["student_name", "parent_name", "class_section", "amount", "invoice_no", "due_date", "school_name"],
    isActive: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. LOAD DATA: INVOICES, METRICS & REMINDER STATUSES
// ─────────────────────────────────────────────────────────────────────────────
export async function loadDuesAndRemindersData(
  schoolId: string,
  options: { academicYearId?: string } = {}
): Promise<{
  rows: DuesReminderRow[];
  metrics: DuesSummaryMetrics;
  classes: { id: string; name: string }[];
  sections: { id: string; name: string; class_id: string }[];
  academicYears: { id: string; name: string; is_current?: boolean }[];
  terms: { id: string; name: string; term_code?: string }[];
}> {
  const todayStr = getTodayIST();
  const todayDate = new Date(todayStr);

  // 1. Load authoritative invoices from invoiceService
  const invoiceRes = await getSchoolInvoices(schoolId, {
    academic_year_id: options.academicYearId,
  });
  const invoices = invoiceRes.invoices || [];

  // 2. Load total student count and outbox notifications
  let totalStudentsCount = 0;
  let outboxItems: any[] = [];
  let followups: FeeFollowup[] = [];
  let classes: any[] = [];
  let sections: any[] = [];
  let academicYears: any[] = [];
  let terms: any[] = [];

  if (isSupabaseConfigured) {
    try {
      const [
        studentsCountRes,
        outboxRes,
        followupsRes,
        classesRes,
        sectionsRes,
        yearsRes,
        termsRes,
      ] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId).is("deleted_at", null),
        supabase.from("notification_outbox").select("*").eq("school_id", schoolId),
        supabase.from("fee_followups").select("*").eq("school_id", schoolId),
        supabase.from("classes").select("id, name").eq("school_id", schoolId).order("name"),
        supabase.from("sections").select("id, name, class_id").eq("school_id", schoolId).order("name"),
        supabase.from("academic_years").select("id, name, is_current").eq("school_id", schoolId),
        supabase.from("fee_terms").select("id, name, term_code").eq("school_id", schoolId),
      ]);

      totalStudentsCount = studentsCountRes.count || 0;
      outboxItems = outboxRes.data || [];
      followups = (followupsRes.data || []) as FeeFollowup[];
      classes = classesRes.data || [];
      sections = sectionsRes.data || [];
      academicYears = yearsRes.data || [];
      terms = termsRes.data || [];
    } catch (err) {
      console.warn("Notice: Falling back to local storage caches for metadata", err);
    }
  }

  // Fallback to local storage if DB empty or offline
  if (totalStudentsCount === 0) {
    const cachedStudents = lsGet<any>(`myzkool_students_${schoolId}`).filter((s) => !s.deleted_at);
    totalStudentsCount = cachedStudents.length;
  }
  if (outboxItems.length === 0) {
    outboxItems = lsGet<any>(`myzkool_notification_outbox_${schoolId}`);
  }
  if (followups.length === 0) {
    followups = lsGet<FeeFollowup>(`myzkool_fee_followups_${schoolId}`);
  }
  if (classes.length === 0) {
    classes = lsGet<any>(`myzkool_classes_${schoolId}`);
  }
  if (sections.length === 0) {
    sections = lsGet<any>(`myzkool_sections_${schoolId}`);
  }
  if (academicYears.length === 0) {
    academicYears = lsGet<any>(`myzkool_academic_years_${schoolId}`);
  }
  if (terms.length === 0) {
    terms = lsGet<any>(`myzkool_fee_terms_${schoolId}`);
  }

  // Build outbox mapping by invoice / student
  const remindersByInvoice = new Map<string, any[]>();
  let remindersPendingCount = 0;

  for (const item of outboxItems) {
    if (item.status === "scheduled" || item.status === "queued") {
      remindersPendingCount++;
    }
    const invKey = item.params?.invoice_no || item.related_id || item.params?.student_id;
    if (invKey) {
      const list = remindersByInvoice.get(invKey) || [];
      list.push(item);
      remindersByInvoice.set(invKey, list);
    }
  }

  // Build rows from invoices
  let totalOutstandingPaise = 0;
  let pendingInvoicesCount = 0;
  let overduePaise = 0;
  let overdueInvoicesCount = 0;
  const distinctStudentsWithDues = new Set<string>();

  const rows: DuesReminderRow[] = [];

  for (const inv of invoices) {
    // Skip cancelled invoices completely
    if (inv.status === "cancelled") continue;

    const balancePaise = inv.balance_paise || 0;
    const paidPaise = inv.paid_paise || 0;
    const grossPaise = inv.gross_paise || 0;
    const concessionPaise = inv.concession_paise || 0;
    const netPaise = inv.total_paise || (inv.gross_paise - inv.concession_paise) || 0;

    const dueDueDateStr = inv.due_date ? inv.due_date.split("T")[0] : todayStr;
    const dueDueDate = new Date(dueDueDateStr);
    const diffTime = todayDate.getTime() - dueDueDate.getTime();
    const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Determine status
    let status: DueStatusType = "upcoming";
    if (balancePaise <= 0) {
      status = "paid";
    } else if (daysOverdue > 0) {
      status = "overdue";
    } else if (daysOverdue === 0) {
      status = "due_today";
    } else if (daysOverdue >= -7) {
      status = "due_soon";
    } else {
      status = "upcoming";
    }

    if (balancePaise > 0) {
      totalOutstandingPaise += balancePaise;
      pendingInvoicesCount++;
      distinctStudentsWithDues.add(inv.student_id);

      if (daysOverdue > 0) {
        overduePaise += balancePaise;
        overdueInvoicesCount++;
      }
    }

    // Class & Section formatting (e.g. "10-A")
    const clsName = inv.class_name || "";
    const secName = inv.section_name || "";
    const classSection = clsName ? (secName ? `${clsName}-${secName}` : clsName) : "Unassigned";

    // Avatar styling
    const avatar = getAvatarForName(inv.student_name);

    // Associated reminders
    const invReminders = remindersByInvoice.get(inv.invoice_no) || remindersByInvoice.get(inv.id) || [];
    const reminderCount = invReminders.length;
    let reminderStatus: DuesReminderRow["reminderStatus"] = "not_sent";
    let lastReminderAt: string | null = null;

    if (invReminders.length > 0) {
      const latest = invReminders[invReminders.length - 1];
      reminderStatus = latest.status as any;
      lastReminderAt = latest.sent_at || latest.created_at || null;
    }

    // Followup note
    const sFollowup = followups.filter((f) => f.student_id === inv.student_id).pop();

    const cleanPhone = (inv.guardian_phone || "").replace(/[^0-9]/g, "");
    const hasValidPhone = cleanPhone.length >= 10;

    rows.push({
      id: inv.id,
      studentId: inv.student_id,
      studentName: inv.student_name,
      admissionNo: inv.admission_no,
      className: clsName,
      sectionName: secName,
      classSection,
      invoiceId: inv.id,
      invoiceNo: inv.invoice_no,
      billingPeriod: inv.billing_period || "Annual Fees",
      academicYearId: inv.academic_year_id,
      academicYearName: inv.academic_year_name || "2025–2026",
      grossPaise,
      concessionPaise,
      netPaise,
      paidPaise,
      balancePaise,
      dueDate: formatDisplayDate(dueDueDateStr),
      dueDateIso: dueDueDateStr,
      daysOverdue,
      status,
      parentName: inv.guardian_name || "Guardian",
      parentPhone: inv.guardian_phone || "",
      hasValidPhone,
      reminderStatus,
      reminderCount,
      lastReminderAt,
      followupNote: sFollowup?.note || null,
      promiseDate: sFollowup?.promise_date ? formatDisplayDate(sFollowup.promise_date) : null,
      avatarBg: avatar.bg,
      avatarInitials: avatar.initials,
      rawInvoice: inv,
    });
  }

  const metrics: DuesSummaryMetrics = {
    totalOutstandingPaise,
    pendingInvoicesCount,
    overduePaise,
    overdueInvoicesCount,
    studentsWithDuesCount: distinctStudentsWithDues.size,
    totalStudentsCount: Math.max(totalStudentsCount, distinctStudentsWithDues.size),
    remindersPendingCount,
  };

  return {
    rows,
    metrics,
    classes,
    sections,
    academicYears,
    terms,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. REMINDER TEMPLATES MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
export async function getReminderTemplates(schoolId: string): Promise<ReminderTemplate[]> {
  const cacheKey = `myzkool_fee_reminder_templates_${schoolId}`;
  let templates: ReminderTemplate[] = [];

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("fee_reminder_templates")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: true });

      if (!error && data && data.length > 0) {
        templates = data.map((t) => ({
          id: t.id,
          schoolId: t.school_id,
          name: t.name,
          purpose: t.purpose || "general",
          channel: t.channel || "whatsapp",
          body: t.body,
          variables: t.variables || ["student_name", "amount", "invoice_no", "due_date", "school_name"],
          isActive: t.is_active !== false,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        }));
        lsSet(cacheKey, templates);
        return templates;
      }
    } catch {
      // Fallback to local cache
    }
  }

  // Check local storage
  templates = lsGet<ReminderTemplate>(cacheKey);
  if (templates.length > 0) return templates;

  // Seed default templates
  const nowStr = new Date().toISOString();
  const seeded: ReminderTemplate[] = DEFAULT_REMINDER_TEMPLATES.map((t) => ({
    ...t,
    id: crypto.randomUUID(),
    schoolId,
    createdAt: nowStr,
    updatedAt: nowStr,
  }));
  lsSet(cacheKey, seeded);
  return seeded;
}

export async function saveReminderTemplate(
  schoolId: string,
  template: Partial<ReminderTemplate> & { name: string; body: string }
): Promise<ReminderTemplate> {
  const cacheKey = `myzkool_fee_reminder_templates_${schoolId}`;
  const nowStr = new Date().toISOString();

  const toSave: ReminderTemplate = {
    id: template.id || crypto.randomUUID(),
    schoolId,
    name: template.name.trim(),
    purpose: template.purpose || "general",
    channel: template.channel || "whatsapp",
    body: template.body.trim(),
    variables: template.variables || ["student_name", "parent_name", "class_section", "amount", "invoice_no", "due_date", "school_name"],
    isActive: template.isActive !== false,
    createdAt: template.createdAt || nowStr,
    updatedAt: nowStr,
  };

  // Try DB
  if (isSupabaseConfigured) {
    try {
      await supabase.from("fee_reminder_templates").upsert({
        id: toSave.id,
        school_id: schoolId,
        name: toSave.name,
        purpose: toSave.purpose,
        channel: toSave.channel,
        body: toSave.body,
        variables: toSave.variables,
        is_active: toSave.isActive,
        updated_at: nowStr,
      });
    } catch (err) {
      console.warn("Notice: could not upsert template to DB, saving locally", err);
    }
  }

  // Update local storage
  const existing = lsGet<ReminderTemplate>(cacheKey);
  const idx = existing.findIndex((t) => t.id === toSave.id);
  if (idx >= 0) {
    existing[idx] = toSave;
  } else {
    existing.push(toSave);
  }
  lsSet(cacheKey, existing);

  return toSave;
}

export async function deleteReminderTemplate(schoolId: string, templateId: string): Promise<boolean> {
  const cacheKey = `myzkool_fee_reminder_templates_${schoolId}`;
  if (isSupabaseConfigured) {
    try {
      await supabase.from("fee_reminder_templates").delete().eq("id", templateId).eq("school_id", schoolId);
    } catch {
      // Ignore
    }
  }
  const existing = lsGet<ReminderTemplate>(cacheKey);
  const filtered = existing.filter((t) => t.id !== templateId);
  lsSet(cacheKey, filtered);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. REMINDER HISTORY & DELIVERY TRACKING
// ─────────────────────────────────────────────────────────────────────────────
export async function getReminderHistory(
  schoolId: string,
  options: { studentId?: string; invoiceNo?: string } = {}
): Promise<ReminderDispatchLog[]> {
  const cacheKey = `myzkool_notification_outbox_${schoolId}`;
  let outboxItems: any[] = [];

  if (isSupabaseConfigured) {
    try {
      let query = supabase
        .from("notification_outbox")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (options.studentId) {
        query = query.eq("related_id", options.studentId);
      }

      const { data, error } = await query;
      if (!error && data) {
        outboxItems = data;
      }
    } catch {
      // Fallback
    }
  }

  if (outboxItems.length === 0) {
    outboxItems = lsGet<any>(cacheKey);
  }

  // Convert to structured ReminderDispatchLog
  const logs: ReminderDispatchLog[] = outboxItems
    .filter((item) => {
      if (options.studentId && item.params?.student_id !== options.studentId && item.related_id !== options.studentId) {
        return false;
      }
      if (options.invoiceNo && item.params?.invoice_no !== options.invoiceNo) {
        return false;
      }
      return true;
    })
    .map((item) => ({
      id: item.id,
      schoolId: item.school_id,
      studentId: item.params?.student_id || item.related_id || "",
      studentName: item.params?.student_name || "Student",
      admissionNo: item.params?.admission_no || "-",
      invoiceNo: item.params?.invoice_no || "-",
      recipientPhone: item.recipient_phone || "",
      parentName: item.params?.parent_name || "Parent",
      channel: item.channel || "whatsapp",
      templateName: item.template_name || item.template_key || "Payment Reminder",
      messageBody: item.params?.rendered_body || item.params?.message || "Fee reminder notice",
      status: item.status || "queued",
      scheduledAt: item.scheduled_at || item.created_at,
      sentAt: item.sent_at || null,
      deliveredAt: item.delivered_at || null,
      providerMessageId: item.provider_message_id || null,
      error: item.error || null,
      attempts: item.attempts || 0,
      createdAt: item.created_at,
    }));

  return logs;
}

export async function retryFailedReminder(schoolId: string, logId: string): Promise<boolean> {
  const nowStr = new Date().toISOString();
  if (isSupabaseConfigured) {
    try {
      await supabase
        .from("notification_outbox")
        .update({
          status: "queued",
          attempts: 0,
          error: null,
          scheduled_at: nowStr,
        })
        .eq("id", logId)
        .eq("school_id", schoolId);
    } catch {
      // Ignore
    }
  }

  const cacheKey = `myzkool_notification_outbox_${schoolId}`;
  const cached = lsGet<any>(cacheKey);
  const item = cached.find((i) => i.id === logId);
  if (item) {
    item.status = "queued";
    item.attempts = 0;
    item.error = null;
    item.scheduled_at = nowStr;
    lsSet(cacheKey, cached);
  }
  return true;
}

export async function cancelScheduledReminder(schoolId: string, logId: string): Promise<boolean> {
  if (isSupabaseConfigured) {
    try {
      await supabase
        .from("notification_outbox")
        .update({ status: "cancelled" })
        .eq("id", logId)
        .eq("school_id", schoolId);
    } catch {
      // Ignore
    }
  }

  const cacheKey = `myzkool_notification_outbox_${schoolId}`;
  const cached = lsGet<any>(cacheKey);
  const item = cached.find((i) => i.id === logId);
  if (item) {
    item.status = "cancelled";
    lsSet(cacheKey, cached);
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. BULK SEND & SCHEDULE REMINDERS
// ─────────────────────────────────────────────────────────────────────────────
export function interpolateTemplate(
  templateBody: string,
  variables: Record<string, string | number>
): string {
  let result = templateBody;
  for (const [key, value] of Object.entries(variables)) {
    const strVal = String(value ?? "");
    // Replace both {key} and {{key}}
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), strVal);
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), strVal);
  }
  return result;
}

export async function sendBulkReminders(
  schoolId: string,
  payload: SendRemindersPayload,
  schoolName: string = "Sunrise International School"
): Promise<SendRemindersResult> {
  const { selectedRowIds, templateId, templateBody, channels, scheduleMode, scheduledDate, scheduledTime } = payload;

  const result: SendRemindersResult = {
    totalEligible: 0,
    queuedCount: 0,
    scheduledCount: 0,
    skippedPaidCount: 0,
    skippedDuplicateCount: 0,
    invalidPhoneCount: 0,
    errors: [],
  };

  if (!selectedRowIds || selectedRowIds.length === 0) {
    result.errors.push("No students selected for reminder.");
    return result;
  }

  // 1. Re-fetch current fresh data to prevent sending reminders for paid invoices!
  const freshData = await loadDuesAndRemindersData(schoolId);
  const freshRowMap = new Map<string, DuesReminderRow>(freshData.rows.map((r) => [r.id, r]));

  // Selected channel
  const channelList: ("whatsapp" | "sms")[] = [];
  if (channels.whatsapp) channelList.push("whatsapp");
  if (channels.sms) channelList.push("sms");
  if (channelList.length === 0) channelList.push("whatsapp");

  const todayStr = getTodayIST();
  const scheduledTimestamp = scheduleMode === "later" && scheduledDate
    ? new Date(`${scheduledDate}T${scheduledTime || "09:00"}:00+05:30`).toISOString()
    : new Date().toISOString();

  const outboxCacheKey = `myzkool_notification_outbox_${schoolId}`;
  const existingOutbox = lsGet<any>(outboxCacheKey);
  const existingDedupeKeys = new Set<string>(existingOutbox.map((o) => o.dedupe_key).filter(Boolean));

  const newOutboxEntries: any[] = [];

  for (const rowId of selectedRowIds) {
    const row = freshRowMap.get(rowId);
    if (!row) continue;

    // Safety check: Skip fully paid or zero balance invoices!
    if (row.balancePaise <= 0 || row.status === "paid") {
      result.skippedPaidCount++;
      continue;
    }

    // Safety check: Validate phone number
    const cleanPhone = (row.parentPhone || "").replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10) {
      result.invalidPhoneCount++;
      // Still proceed or skip? We record invalid phone count and skip sending
      continue;
    }

    result.totalEligible++;

    // Interpolate message
    const formattedAmount = (row.balancePaise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });
    const renderedMessage = interpolateTemplate(templateBody, {
      student_name: row.studentName,
      parent_name: row.parentName,
      class_section: row.classSection,
      amount: formattedAmount,
      invoice_no: row.invoiceNo,
      due_date: row.dueDate,
      school_name: schoolName,
    });

    for (const ch of channelList) {
      // Dedupe key: prevents duplicate reminder sent on the same date for the same invoice & channel
      const dedupeKey = `rem_${schoolId}_${row.invoiceNo}_${ch}_${todayStr}`;
      if (existingDedupeKeys.has(dedupeKey)) {
        result.skippedDuplicateCount++;
        continue;
      }

      const outboxItem = {
        id: crypto.randomUUID(),
        school_id: schoolId,
        channel: ch,
        template_key: templateId || "fee_reminder",
        template_name: templateId || "Payment Reminder",
        recipient_phone: cleanPhone,
        params: {
          student_id: row.studentId,
          student_name: row.studentName,
          admission_no: row.admissionNo,
          invoice_no: row.invoiceNo,
          parent_name: row.parentName,
          amount_paise: row.balancePaise,
          due_date: row.dueDate,
          rendered_body: renderedMessage,
        },
        related_type: "fee_invoice",
        related_id: row.invoiceId,
        dedupe_key: dedupeKey,
        status: scheduleMode === "later" ? "scheduled" : "queued",
        attempts: 0,
        scheduled_at: scheduledTimestamp,
        created_at: new Date().toISOString(),
      };

      newOutboxEntries.push(outboxItem);
      existingDedupeKeys.add(dedupeKey);

      if (scheduleMode === "later") {
        result.scheduledCount++;
      } else {
        result.queuedCount++;
      }
    }
  }

  // Insert to DB or local storage
  if (newOutboxEntries.length > 0) {
    if (isSupabaseConfigured) {
      try {
        await supabase.from("notification_outbox").insert(newOutboxEntries);
      } catch (err) {
        console.warn("Notice: notification_outbox insert fallback to local cache", err);
      }
    }

    const updated = [...newOutboxEntries, ...existingOutbox];
    lsSet(outboxCacheKey, updated);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. RECORD FOLLOW-UP
// ─────────────────────────────────────────────────────────────────────────────
export async function addStudentFollowup(
  schoolId: string,
  studentId: string,
  note: string,
  promiseDate?: string | null
): Promise<FeeFollowup> {
  const nowStr = new Date().toISOString();
  const followup: FeeFollowup = {
    id: crypto.randomUUID(),
    school_id: schoolId,
    student_id: studentId,
    note: note.trim(),
    promise_date: promiseDate || null,
    status: "pending",
    created_at: nowStr,
    updated_at: nowStr,
  };

  if (isSupabaseConfigured) {
    try {
      await supabase.from("fee_followups").insert(followup);
    } catch {
      // Local fallback
    }
  }

  const cacheKey = `myzkool_fee_followups_${schoolId}`;
  const existing = lsGet<FeeFollowup>(cacheKey);
  existing.push(followup);
  lsSet(cacheKey, existing);

  return followup;
}
