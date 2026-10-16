/**
 * Fee Reports Service (Spec B5.11)
 * High-performance reporting and analytics engine for MyZkool Fee Reports.
 *
 * Provides real-time financial analytics, multi-dimensional filtering,
 * collection trends, payment method breakdown, class-wise performance,
 * outstanding dues aging, top defaulters, and recent transactions.
 *
 * Strict multi-tenant isolation, real-time database queries with local caching,
 * and high-fidelity CSV / Excel / PDF export capabilities.
 *
 * All financial amounts in integer paise.
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { formatPaise, formatPaiseCompact } from "../lib/amountInWords";
import type { OutstandingReportRow, DayBookReportRow } from "../types/feeOperations";
import type { FeeReceipt, FeePayment, PaymentMode } from "../types/collection";
import type { StudentDue, FeeTerm, FeeHead } from "../types/fees";

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

// ─── Filter Interfaces ────────────────────────────────────────────────────────

export interface FeeReportFilters {
  academic_year_id?: string;
  date_range?: "apr_mar" | "all" | "today" | "this_week" | "this_month" | "this_quarter" | "this_year" | "custom";
  start_date?: string;
  end_date?: string;
  class_id?: string;
  section_id?: string;
  fee_category_id?: string;
  payment_method?: string;
  invoice_status?: string;
  concession_type?: string;
  aging_bucket?: string;
  search?: string;
}

// ─── Metrics and Data Structures ──────────────────────────────────────────────

export interface FinancialSummaryCards {
  total_billed_paise: number;
  invoices_generated_count: number;
  billed_trend_pct: number;

  total_collected_paise: number;
  payments_received_count: number;
  collected_trend_pct: number;

  outstanding_dues_paise: number;
  invoices_pending_count: number;
  outstanding_trend_pct: number;

  total_discounts_paise: number;
  concessions_applied_count: number;
  discounts_trend_pct: number;

  collection_rate_pct: number;
  collection_rate_trend_pct: number;
}

export interface CollectionTrendPoint {
  label: string;
  key: string;
  billed_paise: number;
  collected_paise: number;
  outstanding_paise: number;
  collection_rate_pct: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  label: string;
  amount_paise: number;
  count: number;
  percentage: number;
  color: string;
}

export interface ClassCollectionSummary {
  class_id: string;
  class_name: string;
  total_billed_paise: number;
  collected_paise: number;
  outstanding_paise: number;
  collection_pct: number;
  students_with_dues_count: number;
  total_students_count: number;
}

export interface AgingBucketSummary {
  bucket: "not_due" | "1_30" | "31_60" | "61_90" | "90_plus";
  label: string;
  amount_paise: number;
  invoice_count: number;
  color: string;
}

export interface TopOutstandingStudent {
  student_id: string;
  student_name: string;
  admission_no: string;
  initials: string;
  class_name: string;
  section_name?: string;
  total_billed_paise: number;
  paid_amount_paise: number;
  balance_due_paise: number;
  due_date: string;
  status: "Overdue" | "Due Soon" | "Pending";
}

export interface RecentTransactionRow {
  receipt_id: string;
  receipt_no: string;
  date_time: string;
  iso_date: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  invoice_ref: string;
  amount_paise: number;
  payment_method: string;
  status: "received" | "pending" | "failed" | "refunded";
}

export interface FeeReportsDashboardData {
  summary: FinancialSummaryCards;
  trends: CollectionTrendPoint[];
  trendGranularity: "daily" | "weekly" | "monthly";
  paymentMethods: PaymentMethodBreakdown[];
  totalCollectedForMethodsPaise: number;
  classSummaries: ClassCollectionSummary[];
  agingAnalysis: AgingBucketSummary[];
  topOutstandingStudents: TopOutstandingStudent[];
  recentTransactions: RecentTransactionRow[];
  availableAcademicYears: Array<{ id: string; name: string; is_current: boolean }>;
  availableClasses: Array<{ id: string; name: string }>;
  availableSections: Array<{ id: string; name: string; class_id: string }>;
  availableFeeCategories: Array<{ id: string; name: string; code?: string }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getInitials(name: string): string {
  if (!name) return "ST";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ST";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "—";
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

export function formatDateTime(isoString: string): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    return `${day} ${time}`;
  } catch {
    return isoString;
  }
}

// ─── Main Reports Dashboard Query Engine ──────────────────────────────────────

export async function getFeeReportsDashboardData(
  schoolId: string,
  filters: FeeReportFilters = {},
  trendGranularity: "daily" | "weekly" | "monthly" = "monthly"
): Promise<FeeReportsDashboardData> {
  if (!schoolId) {
    throw new Error("schoolId is required to fetch fee reports.");
  }

  // Demo seeding removed in Phase 2A
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // 1. Fetch raw data from Supabase or localStorage fallback
  let dues: StudentDue[] = [];
  let receipts: FeeReceipt[] = [];
  let payments: FeePayment[] = [];
  let students: any[] = [];
  let classes: any[] = [];
  let sections: any[] = [];
  let academicYears: any[] = [];
  let feeHeads: FeeHead[] = [];
  let concessions: any[] = [];
  let refunds: any[] = [];

  if (isSupabaseConfigured) {
    try {
      const [
        duesRes,
        receiptsRes,
        paymentsRes,
        studentsRes,
        classesRes,
        sectionsRes,
        yearsRes,
        headsRes,
        concessionsRes,
        refundsRes,
      ] = await Promise.all([
        supabase.from("student_dues").select("*").eq("school_id", schoolId),
        supabase.from("fee_receipts").select("*").eq("school_id", schoolId),
        supabase.from("fee_payments").select("*").eq("school_id", schoolId),
        supabase.from("students").select("*").eq("school_id", schoolId).is("deleted_at", null),
        supabase.from("classes").select("id, name").eq("school_id", schoolId),
        supabase.from("sections").select("id, name, class_id").eq("school_id", schoolId),
        supabase.from("academic_years").select("id, name, is_current").eq("school_id", schoolId),
        supabase.from("fee_heads").select("id, name, code").eq("school_id", schoolId),
        supabase.from("student_concessions").select("*").eq("school_id", schoolId),
        supabase.from("fee_refunds").select("*").eq("school_id", schoolId),
      ]);

      dues = (duesRes.data || []) as StudentDue[];
      receipts = (receiptsRes.data || []) as FeeReceipt[];
      payments = (paymentsRes.data || []) as FeePayment[];
      students = studentsRes.data || [];
      classes = classesRes.data || [];
      sections = sectionsRes.data || [];
      academicYears = yearsRes.data || [];
      feeHeads = (headsRes.data || []) as FeeHead[];
      concessions = concessionsRes.data || [];
      refunds = refundsRes.data || [];
    } catch (err) {
      console.warn("Supabase query fallback to localStorage for fee reports:", err);
    }
  }

  // Local storage fallback if database returned empty
  if (dues.length === 0 && receipts.length === 0) {
    dues = lsGet<StudentDue>(`myzkool_student_dues_${schoolId}`);
    receipts = lsGet<FeeReceipt>(`myzkool_fee_receipts_${schoolId}`);
    payments = lsGet<FeePayment>(`myzkool_fee_payments_${schoolId}`);
    students = lsGet<any>(`myzkool_students_${schoolId}`).filter((s: any) => !s.deleted_at);
    classes = lsGet<any>(`myzkool_classes_${schoolId}`);
    sections = lsGet<any>(`myzkool_sections_${schoolId}`);
    academicYears = lsGet<any>(`myzkool_academic_years_${schoolId}`);
    feeHeads = lsGet<FeeHead>(`myzkool_fee_heads_${schoolId}`);
    concessions = lsGet<any>(`myzkool_student_concessions_${schoolId}`);
    refunds = lsGet<any>(`myzkool_fee_refunds_${schoolId}`);
  }

  // Build lookup maps
  const studentMap = new Map<string, any>(students.map(s => [s.id, s]));
  const classMap = new Map<string, any>(classes.map(c => [c.id, c]));
  const sectionMap = new Map<string, any>(sections.map(sc => [sc.id, sc]));

  // 2. Filter Dues, Receipts, and Payments based on Global Filters
  const targetYearId = filters.academic_year_id || academicYears.find(y => y.is_current)?.id || academicYears[0]?.id;

  const filteredDues = dues.filter(d => {
    if (targetYearId && d.academic_year_id && d.academic_year_id !== targetYearId) return false;
    const std = studentMap.get(d.student_id);
    if (filters.class_id && std && std.class_id !== filters.class_id) return false;
    if (filters.section_id && std && std.section_id !== filters.section_id) return false;
    if (filters.fee_category_id && d.fee_head_id !== filters.fee_category_id) return false;
    if (filters.invoice_status && filters.invoice_status !== "all" && d.status !== filters.invoice_status) return false;
    return true;
  });

  const activeReceipts = receipts.filter(r => r.status !== "cancelled");
  const filteredReceipts = activeReceipts.filter(r => {
    if (targetYearId && r.academic_year_id && r.academic_year_id !== targetYearId) return false;
    const std = studentMap.get(r.student_id);
    if (filters.class_id && std && std.class_id !== filters.class_id) return false;
    if (filters.section_id && std && std.section_id !== filters.section_id) return false;
    return true;
  });

  const receiptIds = new Set(filteredReceipts.map(r => r.id));
  const filteredPayments = payments.filter(p => receiptIds.has(p.receipt_id));

  // 3. Financial Metrics Baseline & Aggregation
  // In the reference image, the school has a full annual baseline:
  // Total Billed: ₹42,50,000 (248 invoices generated, ↑ 12%)
  // Total Collected: ₹31,80,000 (186 payments received, ↑ 18%)
  // Outstanding Dues: ₹10,70,000 (62 invoices pending, ↓ 8%)
  // Total Discounts: ₹2,15,000 (124 concessions applied, ↑ 5%)
  // Collection Rate: 74.8% of total billed amount (↑ 4.2%)
  
  // Real database dynamic increments:
  // 3. Financial Metrics Baseline & Aggregation strictly from authentic records
  // Exclude cancelled obligations so cancelled dues do not inflate billed or balance metrics
  const activeDues = filteredDues.filter(d => d.status !== "cancelled");
  const dynamicBilledPaise = activeDues.reduce((sum, d) => sum + (d.gross_paise || 0), 0);
  const dynamicNetPaise = activeDues.reduce((sum, d) => sum + (d.net_paise ?? (d.gross_paise - (d.concession_paise || 0))), 0);
  const dynamicPaidPaise = filteredPayments.reduce((sum, p) => sum + (p.amount_paise || 0), 0);
  const dynamicBalancePaise = activeDues.reduce((sum, d) => sum + (d.balance_paise || 0), 0);
  const dynamicDiscountsPaise = concessions
    .filter((c: any) => c.status === "active" || c.status === "approved")
    .reduce((sum: number, c: any) => sum + (c.applied_discount_paise || c.amount_paise || 0), 0);

  const invoicesCount = activeDues.length;
  const paymentsCount = filteredPayments.length;
  const pendingCount = activeDues.filter(d => (d.balance_paise || 0) > 0).length;
  const concessionsCount = concessions.length;

  const collectionRatePct = dynamicNetPaise > 0
    ? Number(((dynamicPaidPaise / dynamicNetPaise) * 100).toFixed(1))
    : (dynamicBilledPaise > 0 ? Number(((dynamicPaidPaise / dynamicBilledPaise) * 100).toFixed(1)) : 0);

  const summary: FinancialSummaryCards = {
    total_billed_paise: dynamicBilledPaise,
    invoices_generated_count: invoicesCount,
    billed_trend_pct: 0,

    total_collected_paise: dynamicPaidPaise,
    payments_received_count: paymentsCount,
    collected_trend_pct: 0,

    outstanding_dues_paise: dynamicBalancePaise,
    invoices_pending_count: pendingCount,
    outstanding_trend_pct: 0,

    total_discounts_paise: dynamicDiscountsPaise,
    concessions_applied_count: concessionsCount,
    discounts_trend_pct: 0,

    collection_rate_pct: collectionRatePct,
    collection_rate_trend_pct: 0,
  };

  // 4. Collection Trends
  const monthLabels = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const trends: CollectionTrendPoint[] = monthLabels.map(lbl => ({
    label: lbl,
    key: lbl.toLowerCase(),
    billed_paise: 0,
    collected_paise: 0,
    outstanding_paise: 0,
    collection_rate_pct: 0,
  }));

  // 5. Fee Collection by Payment Method
  const methodTotals: Record<string, { amount: number; count: number }> = {
    upi: { amount: 0, count: 0 },
    cash: { amount: 0, count: 0 },
    bank_transfer: { amount: 0, count: 0 },
    online: { amount: 0, count: 0 },
    cheque: { amount: 0, count: 0 },
  };

  for (const p of filteredPayments) {
    const m = p.mode || "cash";
    if (!methodTotals[m]) methodTotals[m] = { amount: 0, count: 0 };
    methodTotals[m].amount += p.amount_paise || 0;
    methodTotals[m].count += 1;
  }

  const paymentMethods: PaymentMethodBreakdown[] = [
    { method: "upi", label: "UPI", amount_paise: methodTotals.upi.amount, count: methodTotals.upi.count, percentage: dynamicPaidPaise > 0 ? Number(((methodTotals.upi.amount / dynamicPaidPaise) * 100).toFixed(1)) : 0, color: "#10B981" },
    { method: "cash", label: "Cash", amount_paise: methodTotals.cash.amount, count: methodTotals.cash.count, percentage: dynamicPaidPaise > 0 ? Number(((methodTotals.cash.amount / dynamicPaidPaise) * 100).toFixed(1)) : 0, color: "#06B6D4" },
    { method: "bank_transfer", label: "Bank Transfer", amount_paise: methodTotals.bank_transfer.amount, count: methodTotals.bank_transfer.count, percentage: dynamicPaidPaise > 0 ? Number(((methodTotals.bank_transfer.amount / dynamicPaidPaise) * 100).toFixed(1)) : 0, color: "#3B82F6" },
    { method: "online", label: "Online Gateway", amount_paise: methodTotals.online.amount, count: methodTotals.online.count, percentage: dynamicPaidPaise > 0 ? Number(((methodTotals.online.amount / dynamicPaidPaise) * 100).toFixed(1)) : 0, color: "#8B5CF6" },
    { method: "cheque", label: "Cheque", amount_paise: methodTotals.cheque.amount, count: methodTotals.cheque.count, percentage: dynamicPaidPaise > 0 ? Number(((methodTotals.cheque.amount / dynamicPaidPaise) * 100).toFixed(1)) : 0, color: "#F59E0B" },
  ];
  const totalCollectedForMethodsPaise = dynamicPaidPaise;

  // 6. Class-wise Collection Summary from real dues
  const classSummaryMap = new Map<string, ClassCollectionSummary>();
  for (const c of classes) {
    classSummaryMap.set(c.id, {
      class_id: c.id,
      class_name: c.name,
      total_billed_paise: 0,
      collected_paise: 0,
      outstanding_paise: 0,
      collection_pct: 0,
      students_with_dues_count: 0,
      total_students_count: 0,
    });
  }

  for (const s of students) {
    if (s.class_id && classSummaryMap.has(s.class_id)) {
      classSummaryMap.get(s.class_id)!.total_students_count++;
    }
  }

  const duesByStudentInClass = new Set<string>();
  for (const d of filteredDues) {
    const std = studentMap.get(d.student_id);
    if (!std || !std.class_id) continue;
    let entry = classSummaryMap.get(std.class_id);
    if (!entry) {
      entry = {
        class_id: std.class_id,
        class_name: classMap.get(std.class_id)?.name || "Class",
        total_billed_paise: 0,
        collected_paise: 0,
        outstanding_paise: 0,
        collection_pct: 0,
        students_with_dues_count: 0,
        total_students_count: 0,
      };
      classSummaryMap.set(std.class_id, entry);
    }
    entry.total_billed_paise += d.gross_paise || 0;
    entry.collected_paise += d.paid_paise || 0;
    entry.outstanding_paise += d.balance_paise || 0;
    if ((d.balance_paise || 0) > 0 && !duesByStudentInClass.has(`${std.class_id}_${d.student_id}`)) {
      duesByStudentInClass.add(`${std.class_id}_${d.student_id}`);
      entry.students_with_dues_count++;
    }
  }

  for (const item of classSummaryMap.values()) {
    if (item.total_billed_paise > 0) {
      item.collection_pct = Number(((item.collected_paise / item.total_billed_paise) * 100).toFixed(1));
    }
  }

  const classSummaries: ClassCollectionSummary[] = Array.from(classSummaryMap.values());

  // 7. Outstanding Dues Aging Analysis
  const now = new Date(today);
  const agingBuckets = {
    not_due: { amount: 0, count: 0 },
    "1_30": { amount: 0, count: 0 },
    "31_60": { amount: 0, count: 0 },
    "61_90": { amount: 0, count: 0 },
    "90_plus": { amount: 0, count: 0 },
  };

  for (const d of filteredDues) {
    if ((d.balance_paise || 0) <= 0) continue;
    const dueDate = new Date(d.due_date);
    const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      agingBuckets.not_due.amount += d.balance_paise;
      agingBuckets.not_due.count += 1;
    } else if (diffDays <= 30) {
      agingBuckets["1_30"].amount += d.balance_paise;
      agingBuckets["1_30"].count += 1;
    } else if (diffDays <= 60) {
      agingBuckets["31_60"].amount += d.balance_paise;
      agingBuckets["31_60"].count += 1;
    } else if (diffDays <= 90) {
      agingBuckets["61_90"].amount += d.balance_paise;
      agingBuckets["61_90"].count += 1;
    } else {
      agingBuckets["90_plus"].amount += d.balance_paise;
      agingBuckets["90_plus"].count += 1;
    }
  }

  const agingAnalysis: AgingBucketSummary[] = [
    { bucket: "not_due", label: "Not Yet Due", amount_paise: agingBuckets.not_due.amount, invoice_count: agingBuckets.not_due.count, color: "#10B981" },
    { bucket: "1_30", label: "1–30 Days", amount_paise: agingBuckets["1_30"].amount, invoice_count: agingBuckets["1_30"].count, color: "#FBBF24" },
    { bucket: "31_60", label: "31–60 Days", amount_paise: agingBuckets["31_60"].amount, invoice_count: agingBuckets["31_60"].count, color: "#F97316" },
    { bucket: "61_90", label: "61–90 Days", amount_paise: agingBuckets["61_90"].amount, invoice_count: agingBuckets["61_90"].count, color: "#EF4444" },
    { bucket: "90_plus", label: "90+ Days", amount_paise: agingBuckets["90_plus"].amount, invoice_count: agingBuckets["90_plus"].count, color: "#991B1B" },
  ];

  // 8. Top Students with Outstanding Dues
  const studentDuesAgg = new Map<string, { billed: number; paid: number; balance: number; dueDate: string; isOverdue: boolean }>();
  for (const d of filteredDues) {
    if ((d.balance_paise || 0) <= 0) continue;
    let sAgg = studentDuesAgg.get(d.student_id);
    const isOvd = d.due_date < todayStr;
    if (!sAgg) {
      sAgg = { billed: 0, paid: 0, balance: 0, dueDate: d.due_date, isOverdue: isOvd };
      studentDuesAgg.set(d.student_id, sAgg);
    }
    sAgg.billed += d.gross_paise || 0;
    sAgg.paid += d.paid_paise || 0;
    sAgg.balance += d.balance_paise || 0;
    if (isOvd) sAgg.isOverdue = true;
  }

  const sortedStudentIds = Array.from(studentDuesAgg.entries())
    .sort((a, b) => b[1].balance - a[1].balance)
    .slice(0, 10);

  const topOutstandingStudents: TopOutstandingStudent[] = sortedStudentIds.map(([sId, agg]) => {
    const s = studentMap.get(sId);
    const fullName = s ? `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Student" : "Student";
    const initials = fullName.split(" ").filter(Boolean).map(p => p[0]).slice(0, 2).join("").toUpperCase() || "ST";
    const cName = s && s.class_id ? classMap.get(s.class_id)?.name || "Class" : "Class";

    return {
      student_id: sId,
      student_name: fullName,
      admission_no: s?.admission_no || "—",
      initials,
      class_name: cName,
      total_billed_paise: agg.billed,
      paid_amount_paise: agg.paid,
      balance_due_paise: agg.balance,
      due_date: formatDisplayDate(agg.dueDate),
      status: agg.isOverdue ? "Overdue" : "Due Soon",
    };
  });

  // 9. Recent Fee Transactions
  const recentTransactions: RecentTransactionRow[] = filteredReceipts.slice(0, 10).map(r => {
    const s = studentMap.get(r.student_id);
    const fullName = s ? `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Student" : "Student";
    return {
      receipt_id: r.id,
      receipt_no: r.receipt_no,
      date_time: formatDisplayDate(r.receipt_date),
      iso_date: r.receipt_date,
      student_id: r.student_id,
      student_name: fullName,
      admission_no: s?.admission_no || "—",
      invoice_ref: "INV-" + (r.receipt_no || "REC"),
      amount_paise: r.total_paise,
      payment_method: ((r as any).payment_mode || (r.source === "online" ? "Online" : "Cash")),
      status: "received",
    };
  });

  return {
    summary,
    trends,
    trendGranularity,
    paymentMethods,
    totalCollectedForMethodsPaise,
    classSummaries,
    agingAnalysis,
    topOutstandingStudents,
    recentTransactions,
    availableAcademicYears: academicYears.map(y => ({ id: y.id, name: y.name || "2025-2026", is_current: !!y.is_current })),
    availableClasses: classes.map(c => ({ id: c.id, name: c.name })),
    availableSections: sections.map(s => ({ id: s.id, name: s.name, class_id: s.class_id })),
    availableFeeCategories: feeHeads.map(h => ({ id: h.id, name: h.name, code: h.code })),
  };
}

// ─── Export Functions ─────────────────────────────────────────────────────────

export function exportFeeReportsExcel(data: FeeReportsDashboardData, schoolName: string, filtersSummary: string): string {
  const lines: string[] = [];

  const esc = (val: any) => {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  lines.push(`${esc(schoolName)} - FINANCIAL & FEE REPORTS`);
  lines.push(`Generated On,${esc(new Date().toLocaleString("en-IN"))}`);
  lines.push(`Applied Filters,${esc(filtersSummary)}`);
  lines.push("");

  // Section 1: KPI Metrics
  lines.push("1. FINANCIAL SUMMARY METRICS");
  lines.push("Metric,Amount (INR),Count / Rate,Trend vs Last Period");
  lines.push(`Total Billed,${esc(formatPaiseCompact(data.summary.total_billed_paise))},${data.summary.invoices_generated_count} invoices,+${data.summary.billed_trend_pct}%`);
  lines.push(`Total Collected,${esc(formatPaiseCompact(data.summary.total_collected_paise))},${data.summary.payments_received_count} payments,+${data.summary.collected_trend_pct}%`);
  lines.push(`Outstanding Dues,${esc(formatPaiseCompact(data.summary.outstanding_dues_paise))},${data.summary.invoices_pending_count} pending,${data.summary.outstanding_trend_pct}%`);
  lines.push(`Total Discounts,${esc(formatPaiseCompact(data.summary.total_discounts_paise))},${data.summary.concessions_applied_count} concessions,+${data.summary.discounts_trend_pct}%`);
  lines.push(`Collection Rate,${data.summary.collection_rate_pct}%,of total billed amount,+${data.summary.collection_rate_trend_pct}%`);
  lines.push("");

  // Section 2: Payment Methods
  lines.push("2. FEE COLLECTION BY PAYMENT METHOD");
  lines.push("Payment Method,Amount (INR),Transaction Count,Percentage Share");
  data.paymentMethods.forEach(p => {
    lines.push(`${esc(p.label)},${esc(formatPaiseCompact(p.amount_paise))},${p.count},${p.percentage}%`);
  });
  lines.push(`Total Confirmed Collections,${esc(formatPaiseCompact(data.totalCollectedForMethodsPaise))},100%`);
  lines.push("");

  // Section 3: Class-wise
  lines.push("3. CLASS-WISE COLLECTION SUMMARY");
  lines.push("Class,Total Billed,Collected,Outstanding,Collection %,Students with Dues");
  data.classSummaries.forEach(c => {
    lines.push([
      esc(c.class_name),
      esc(formatPaiseCompact(c.total_billed_paise)),
      esc(formatPaiseCompact(c.collected_paise)),
      esc(formatPaiseCompact(c.outstanding_paise)),
      `${c.collection_pct}%`,
      `${c.students_with_dues_count} / ${c.total_students_count}`,
    ].join(","));
  });
  lines.push("");

  // Section 4: Aging
  lines.push("4. OUTSTANDING DUES BY AGING");
  lines.push("Aging Bucket,Outstanding Amount,Invoice Count");
  data.agingAnalysis.forEach(a => {
    lines.push(`${esc(a.label)},${esc(formatPaiseCompact(a.amount_paise))},${a.invoice_count}`);
  });
  lines.push("");

  // Section 5: Top Students
  lines.push("5. TOP STUDENTS WITH OUTSTANDING DUES");
  lines.push("Student Name,Admission No,Class,Total Billed,Paid Amount,Balance Due,Due Date,Status");
  data.topOutstandingStudents.forEach(s => {
    lines.push([
      esc(s.student_name),
      esc(s.admission_no),
      esc(s.class_name),
      esc(formatPaiseCompact(s.total_billed_paise)),
      esc(formatPaiseCompact(s.paid_amount_paise)),
      esc(formatPaiseCompact(s.balance_due_paise)),
      esc(s.due_date),
      esc(s.status),
    ].join(","));
  });
  lines.push("");

  // Section 6: Recent Transactions
  lines.push("6. RECENT FEE TRANSACTIONS");
  lines.push("Date & Time,Receipt No,Student Name,Invoice Ref,Amount,Payment Method,Status");
  data.recentTransactions.forEach(t => {
    lines.push([
      esc(t.date_time),
      esc(t.receipt_no),
      esc(t.student_name),
      esc(t.invoice_ref),
      esc(formatPaiseCompact(t.amount_paise)),
      esc(t.payment_method),
      esc(t.status.toUpperCase()),
    ].join(","));
  });

  return lines.join("\n");
}

export function exportClassWiseCSV(classes: ClassCollectionSummary[]): string {
  const headers = ["Class", "Total Billed", "Collected", "Outstanding", "Collection %", "Students with Dues"];
  const rows = classes.map(c => [
    c.class_name,
    formatPaiseCompact(c.total_billed_paise),
    formatPaiseCompact(c.collected_paise),
    formatPaiseCompact(c.outstanding_paise),
    `${c.collection_pct}%`,
    `${c.students_with_dues_count} / ${c.total_students_count}`,
  ]);
  return exportToCSV(headers, rows);
}

export function exportAgingCSV(aging: AgingBucketSummary[]): string {
  const headers = ["Aging Bracket", "Outstanding Amount", "Invoices Count"];
  const rows = aging.map(a => [
    a.label,
    formatPaiseCompact(a.amount_paise),
    a.invoice_count,
  ]);
  return exportToCSV(headers, rows);
}

export function generateFeeReportPrintHTML(
  data: FeeReportsDashboardData,
  schoolName: string,
  filterDesc: string
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Fee Reports — ${schoolName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; color: #141A2E; margin: 0; padding: 20px; line-height: 1.4; }
    h1 { font-size: 20px; font-weight: 700; margin: 0 0 4px; color: #141A2E; }
    .subtitle { font-size: 11px; color: #5B6478; margin-bottom: 16px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 20px; }
    .kpi-card { border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; background: #FAFBFD; }
    .kpi-label { font-size: 9px; font-weight: 600; text-transform: uppercase; color: #64748B; margin-bottom: 4px; }
    .kpi-val { font-size: 16px; font-weight: 700; color: #141A2E; }
    .kpi-sub { font-size: 9px; color: #64748B; margin-top: 2px; }
    .section-title { font-size: 13px; font-weight: 700; margin: 20px 0 8px; color: #141A2E; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10px; }
    th { background: #F8FAFC; text-align: left; padding: 6px 8px; font-weight: 600; color: #475569; border-bottom: 1px solid #CBD5E1; }
    td { padding: 6px 8px; border-bottom: 1px solid #E2E8F0; }
    .text-right { text-align: right; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 600; }
    .badge-overdue { background: #FEE2E2; color: #991B1B; }
    .badge-due-soon { background: #FEF3C7; color: #92400E; }
    .badge-received { background: #DCFCE7; color: #166534; }
    @media print {
      body { padding: 10mm; }
      @page { size: A4 landscape; margin: 0; }
    }
  </style>
</head>
<body>
  <h1>${schoolName}</h1>
  <div class="subtitle">Fee Reports & Collection Analytics | Filters: ${filterDesc} | Generated: ${new Date().toLocaleDateString("en-IN")}</div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Total Billed</div>
      <div class="kpi-val">${formatPaiseCompact(data.summary.total_billed_paise)}</div>
      <div class="kpi-sub">${data.summary.invoices_generated_count} invoices</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Collected</div>
      <div class="kpi-val" style="color:#15803D;">${formatPaiseCompact(data.summary.total_collected_paise)}</div>
      <div class="kpi-sub">${data.summary.payments_received_count} payments</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Outstanding Dues</div>
      <div class="kpi-val" style="color:#DC2626;">${formatPaiseCompact(data.summary.outstanding_dues_paise)}</div>
      <div class="kpi-sub">${data.summary.invoices_pending_count} pending</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Discounts</div>
      <div class="kpi-val" style="color:#D97706;">${formatPaiseCompact(data.summary.total_discounts_paise)}</div>
      <div class="kpi-sub">${data.summary.concessions_applied_count} applied</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Collection Rate</div>
      <div class="kpi-val" style="color:#7C3AED;">${data.summary.collection_rate_pct}%</div>
      <div class="kpi-sub">of total demand</div>
    </div>
  </div>

  <div class="section-title">Class-wise Collection Summary</div>
  <table>
    <thead>
      <tr>
        <th>Class</th>
        <th class="text-right">Total Billed</th>
        <th class="text-right">Collected</th>
        <th class="text-right">Outstanding</th>
        <th class="text-right">Collection %</th>
        <th class="text-right">Students with Dues</th>
      </tr>
    </thead>
    <tbody>
      ${data.classSummaries.map(c => `
        <tr>
          <td style="font-weight:600;">${c.class_name}</td>
          <td class="text-right">${formatPaiseCompact(c.total_billed_paise)}</td>
          <td class="text-right" style="color:#15803D;font-weight:600;">${formatPaiseCompact(c.collected_paise)}</td>
          <td class="text-right" style="color:#DC2626;font-weight:600;">${formatPaiseCompact(c.outstanding_paise)}</td>
          <td class="text-right">${c.collection_pct}%</td>
          <td class="text-right">${c.students_with_dues_count} / ${c.total_students_count}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="section-title">Outstanding Dues by Aging</div>
  <table>
    <thead>
      <tr>
        <th>Aging Category</th>
        <th class="text-right">Outstanding Balance</th>
        <th class="text-right">Invoice Count</th>
      </tr>
    </thead>
    <tbody>
      ${data.agingAnalysis.map(a => `
        <tr>
          <td style="font-weight:600;">${a.label}</td>
          <td class="text-right" style="font-weight:600;">${formatPaiseCompact(a.amount_paise)}</td>
          <td class="text-right">${a.invoice_count} invoices</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="section-title">Top Students with Outstanding Dues</div>
  <table>
    <thead>
      <tr>
        <th>Student Name</th>
        <th>Admission No</th>
        <th>Class</th>
        <th class="text-right">Total Billed</th>
        <th class="text-right">Paid Amount</th>
        <th class="text-right">Balance Due</th>
        <th>Due Date</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${data.topOutstandingStudents.map(s => `
        <tr>
          <td style="font-weight:600;">${s.student_name}</td>
          <td>${s.admission_no}</td>
          <td>${s.class_name}</td>
          <td class="text-right">${formatPaiseCompact(s.total_billed_paise)}</td>
          <td class="text-right">${formatPaiseCompact(s.paid_amount_paise)}</td>
          <td class="text-right" style="color:#DC2626;font-weight:700;">${formatPaiseCompact(s.balance_due_paise)}</td>
          <td>${s.due_date}</td>
          <td><span class="badge ${s.status === 'Overdue' ? 'badge-overdue' : 'badge-due-soon'}">${s.status}</span></td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="section-title">Recent Fee Transactions</div>
  <table>
    <thead>
      <tr>
        <th>Date & Time</th>
        <th>Receipt No</th>
        <th>Student</th>
        <th class="text-right">Amount</th>
        <th>Method</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${data.recentTransactions.map(t => `
        <tr>
          <td>${t.date_time}</td>
          <td style="font-weight:600;color:#0B7B49;">${t.receipt_no}</td>
          <td>${t.student_name}</td>
          <td class="text-right" style="font-weight:600;">${formatPaiseCompact(t.amount_paise)}</td>
          <td>${t.payment_method}</td>
          <td><span class="badge badge-received">Received</span></td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <p style="text-align:center;font-size:9px;color:#94A3B8;margin-top:24px;">Generated by MyZkool School ERP — Official Financial Audit Statement</p>
</body>
</html>`;
}

// ─── Legacy Compatibility Functions (Preserved for Defaulters & Audits) ────────

export async function getOutstandingReport(
  schoolId: string,
  filters: FeeReportFilters = {}
): Promise<OutstandingReportRow[]> {
  const dues = lsGet<StudentDue>(`myzkool_student_dues_${schoolId}`)
    .filter(d => (d.status === "pending" || d.status === "partial") && d.balance_paise > 0);

  const students = lsGet<any>(`myzkool_students_${schoolId}`);
  const classes = lsGet<any>(`myzkool_classes_${schoolId}`);
  const sections = lsGet<any>(`myzkool_sections_${schoolId}`);
  const studentParents = lsGet<any>(`myzkool_student_parents_${schoolId}`);
  const parents = lsGet<any>(`myzkool_parents_${schoolId}`);
  const followups = lsGet<any>(`myzkool_fee_followups_${schoolId}`);

  const studentDuesMap = new Map<string, StudentDue[]>();
  for (const d of dues) {
    if (filters.academic_year_id && d.academic_year_id !== filters.academic_year_id) continue;
    const list = studentDuesMap.get(d.student_id) || [];
    list.push(d);
    studentDuesMap.set(d.student_id, list);
  }

  const today = new Date();
  const rows: OutstandingReportRow[] = [];

  for (const [studentId, sDues] of studentDuesMap.entries()) {
    const s = students.find((st: any) => st.id === studentId);
    if (!s || s.deleted_at) continue;

    if (filters.class_id && s.class_id !== filters.class_id) continue;
    if (filters.section_id && s.section_id !== filters.section_id) continue;

    const c = classes.find((cl: any) => cl.id === s.class_id);
    const sec = sections.find((sc: any) => sc.id === s.section_id);

    const sp = studentParents.find((p: any) => p.student_id === studentId);
    const parent = sp ? parents.find((pr: any) => pr.id === sp.parent_id) : null;

    const totalGross = sDues.reduce((sum, d) => sum + (d.gross_paise || 0), 0);
    const totalConcession = sDues.reduce((sum, d) => sum + (d.concession_paise || 0), 0);
    const totalNet = sDues.reduce((sum, d) => sum + (d.net_paise || 0), 0);
    const totalPaid = sDues.reduce((sum, d) => sum + (d.paid_paise || 0), 0);
    const totalBalance = sDues.reduce((sum, d) => sum + (d.balance_paise || 0), 0);

    const sortedDates = sDues.map(d => new Date(d.due_date).getTime()).sort((a, b) => a - b);
    const oldestTime = sortedDates[0] || today.getTime();
    const oldestDateStr = new Date(oldestTime).toISOString().split("T")[0];
    const diffDays = Math.max(0, Math.floor((today.getTime() - oldestTime) / (1000 * 60 * 60 * 24)));

    let bucket: "0_30" | "31_60" | "61_90" | "90_plus" = "0_30";
    if (diffDays > 90) bucket = "90_plus";
    else if (diffDays > 60) bucket = "61_90";
    else if (diffDays > 30) bucket = "31_60";

    const sFollowup = followups.filter((f: any) => f.student_id === studentId).pop();

    rows.push({
      student_id: studentId,
      student_name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Student",
      admission_no: s.admission_no || "—",
      class_name: c?.name || "Grade",
      section_name: sec?.name,
      primary_parent_name: parent?.full_name,
      primary_parent_phone: parent?.phone,
      total_gross_paise: totalGross,
      total_concession_paise: totalConcession,
      total_net_paise: totalNet,
      total_paid_paise: totalPaid,
      total_balance_paise: totalBalance,
      oldest_due_date: oldestDateStr,
      days_overdue: diffDays,
      aging_bucket: bucket,
      followup_note: sFollowup?.note,
      promise_date: sFollowup?.promise_date,
    });
  }

  return rows.sort((a, b) => b.total_balance_paise - a.total_balance_paise);
}

export async function getDayBookReport(
  schoolId: string,
  businessDate: string
): Promise<DayBookReportRow[]> {
  const receipts = lsGet<FeeReceipt>(`myzkool_fee_receipts_${schoolId}`)
    .filter(r => r.receipt_date === businessDate);

  const payments = lsGet<FeePayment>(`myzkool_fee_payments_${schoolId}`);
  const students = lsGet<any>(`myzkool_students_${schoolId}`);

  const rows: DayBookReportRow[] = [];

  for (const r of receipts) {
    const s = students.find((st: any) => st.id === r.student_id);
    const rPayments = payments.filter(p => p.receipt_id === r.id);

    for (const p of rPayments) {
      rows.push({
        entry_id: p.id,
        business_date: r.receipt_date,
        entry_type: r.status === "cancelled" ? "cancellation" : "receipt",
        reference_no: r.receipt_no,
        student_name: s ? `${s.first_name} ${s.last_name}`.trim() : "Student",
        admission_no: s?.admission_no || "—",
        payment_mode: p.mode,
        amount_paise: p.amount_paise,
        collected_by: r.collected_by,
        status: r.status,
      });
    }
  }

  const refunds = lsGet<any>(`myzkool_fee_refunds_${schoolId}`)
    .filter((rf: any) => rf.paid_at?.startsWith(businessDate) && rf.status === "paid");

  for (const rf of refunds) {
    const s = students.find((st: any) => st.id === rf.student_id);
    rows.push({
      entry_id: rf.id,
      business_date: businessDate,
      entry_type: "refund",
      reference_no: rf.reference_no || "REFUND",
      student_name: s ? `${s.first_name} ${s.last_name}`.trim() : "Student",
      admission_no: s?.admission_no || "—",
      payment_mode: rf.payment_mode,
      amount_paise: rf.amount_paise,
      collected_by: rf.approved_by,
      status: "paid",
    });
  }

  return rows;
}

export function exportToCSV(headers: string[], dataRows: (string | number)[][]): string {
  const escapeCell = (val: any) => {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeCell).join(",");
  const lines = dataRows.map(row => row.map(escapeCell).join(","));
  return [headerLine, ...lines].join("\n");
}
