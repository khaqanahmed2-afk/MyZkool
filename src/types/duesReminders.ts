/**
 * Types for Dues & Reminders Module
 */
import type { StudentInvoice } from "./fees";

export type DueStatusType =
  | "overdue"
  | "due_today"
  | "due_soon"
  | "upcoming"
  | "partial"
  | "paid"
  | "cancelled";

export type QuickFilterType =
  | "all"
  | "upcoming"
  | "due_today"
  | "overdue"
  | "partial"
  | "unpaid"
  | "reminder_sent"
  | "reminder_pending";

export interface DuesReminderRow {
  id: string; // Unique row ID (typically invoiceId or studentId+termId)
  studentId: string;
  studentName: string;
  admissionNo: string;
  className: string;
  sectionName: string;
  classSection: string;
  invoiceId: string;
  invoiceNo: string;
  billingPeriod: string;
  academicYearId: string;
  academicYearName: string;
  grossPaise: number;
  concessionPaise: number;
  netPaise: number;
  paidPaise: number;
  balancePaise: number;
  dueDate: string; // e.g. "10 Apr 2025"
  dueDateIso: string; // "2025-04-10"
  daysOverdue: number;
  status: DueStatusType;
  parentName: string;
  parentPhone: string;
  hasValidPhone: boolean;
  reminderStatus: "not_sent" | "pending" | "scheduled" | "sent" | "delivered" | "failed";
  reminderCount: number;
  lastReminderAt?: string | null;
  followupNote?: string | null;
  promiseDate?: string | null;
  avatarBg: string;
  avatarInitials: string;
  rawInvoice?: StudentInvoice;
}

export interface DuesSummaryMetrics {
  totalOutstandingPaise: number;
  pendingInvoicesCount: number;
  overduePaise: number;
  overdueInvoicesCount: number;
  studentsWithDuesCount: number;
  totalStudentsCount: number;
  remindersPendingCount: number;
}

export interface ReminderTemplate {
  id: string;
  schoolId: string;
  name: string;
  purpose: "upcoming" | "due_today" | "overdue" | "partial" | "general";
  channel: "whatsapp" | "sms" | "both";
  body: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderDispatchLog {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  invoiceNo: string;
  recipientPhone: string;
  parentName: string;
  channel: "whatsapp" | "sms" | "email";
  templateName: string;
  messageBody: string;
  status: "scheduled" | "queued" | "sent" | "delivered" | "failed" | "cancelled";
  scheduledAt: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
  providerMessageId?: string | null;
  error?: string | null;
  attempts: number;
  createdAt: string;
}

export interface SendRemindersPayload {
  selectedRowIds: string[];
  templateId: string;
  templateBody: string;
  channels: {
    whatsapp: boolean;
    sms: boolean;
  };
  scheduleMode: "now" | "later";
  scheduledDate?: string;
  scheduledTime?: string;
  timezone?: string;
}

export interface SendRemindersResult {
  totalEligible: number;
  queuedCount: number;
  scheduledCount: number;
  skippedPaidCount: number;
  skippedDuplicateCount: number;
  invalidPhoneCount: number;
  errors: string[];
}
