/**
 * Fee Collections Query Service
 *
 * Dedicated service for the Fee Collections page:
 * - Real-time database data from Supabase (fee_receipts, fee_payments, fee_receipt_items, student_dues, students, classes, sections)
 * - Computes real-time collection metrics (Today, This Month, Online, Cash) via PostgreSQL RPC / database aggregations
 * - Multi-dimensional filtering (search, academic year, class, method, date range, status, tabs)
 * - Pagination, sorting, and CSV export
 * - Provides student outstanding invoices for collection workflow
 * - Strict multi-tenant isolation and RLS adherence
 *
 * All monetary amounts in integer paise.
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { formatPaise } from "../lib/amountInWords";
import { getTodayIST } from "./collectionService";
import { getStudentDues } from "./feeDuesService";
import type { FeeReceipt, FeePayment, FeeReceiptItem, PaymentMode } from "../types/collection";
import type { StudentDue, FeeTerm } from "../types/fees";

function lsGet<T>(key: string): T[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

export interface EnrichedTransaction {
  id: string;
  receipt_id: string;
  receipt_no: string;
  receipt_date: string;
  created_at: string;
  formatted_date_time: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  initials: string;
  class_id?: string;
  class_name: string;
  section_id?: string;
  section_name: string;
  invoice_numbers: string[];
  amount_paise: number;
  formatted_amount: string;
  payment_method: PaymentMode;
  status: "received" | "successful" | "pending" | "failed" | "cancelled" | "refunded" | "reversed";
  academic_year_id?: string;
  reference_no?: string;
  collected_by_name?: string;
  remarks?: string;
}

export interface CollectionSummaryMetrics {
  todayPaise: number;
  todayCount: number;
  thisMonthPaise: number;
  thisMonthCount: number;
  onlinePaise: number;
  onlineCount: number;
  cashPaise: number;
  cashCount: number;
  cancelledCount?: number;
  totalAuditedCount?: number;
}

export interface CollectionsFilterOptions {
  search?: string;
  academicYearId?: string;
  classId?: string;
  paymentMethod?: string;
  dateRange?: "all" | "today" | "yesterday" | "this_week" | "this_month" | "custom";
  customStartDate?: string;
  customEndDate?: string;
  status?: string;
  methodTab?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "date" | "amount" | "receipt_no" | "student_name" | "class_name" | "payment_method" | "status";
  sortOrder?: "asc" | "desc";
}

export interface CollectionsViewResponse {
  summary: CollectionSummaryMetrics;
  transactions: EnrichedTransaction[];
  allFilteredTransactions?: EnrichedTransaction[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  classes: Array<{ id: string; name: string }>;
  academicYears: Array<{ id: string; label: string; is_current: boolean }>;
}

export interface OutstandingInvoiceItem {
  id: string;
  invoice_number: string;
  term_id?: string;
  term_name: string;
  billing_period: string;
  due_date: string;
  total_paise: number;
  paid_paise: number;
  balance_paise: number;
  due_ids: string[];
  status: "pending" | "partial" | "overdue";
  is_overdue: boolean;
  particulars: string[];
  items?: Array<{
    due_id?: string;
    fee_head_id?: string;
    name: string;
    amount_paise: number;
    balance_paise: number;
    gross_paise?: number;
    concession_paise?: number;
    net_paise?: number;
    paid_paise?: number;
    due_date?: string;
  }>;
}

/**
 * Format timestamp to e.g. "24 Jul 2026 10:30 AM" in Asia/Kolkata timezone
 */
export function formatTransactionDateTime(isoString: string): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
    const time = d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
    return `${day} ${time}`;
  } catch {
    return isoString;
  }
}

/**
 * Derives student initials e.g. "Aarav Sharma" -> "AS"
 */
export function getInitials(name: string): string {
  if (!name) return "ST";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ST";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Helper to compute IST date boundaries
 */
function getISTDateBoundaries() {
  const todayIST = getTodayIST();
  const currentMonthIST = todayIST.slice(0, 7);

  // Yesterday in IST
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterdayIST = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  // Start of week (Monday) in IST
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const startOfWeekIST = monday.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  return { todayIST, currentMonthIST, yesterdayIST, startOfWeekIST };
}

/**
 * Main query function to fetch and enrich fee collections data from database
 */
export async function getCollectionsViewData(
  schoolId: string,
  options: CollectionsFilterOptions = {}
): Promise<CollectionsViewResponse> {
  const {
    search = "",
    academicYearId = "",
    classId = "all",
    paymentMethod = "all",
    dateRange = "all",
    customStartDate,
    customEndDate,
    status = "all",
    methodTab = "all",
    page = 1,
    pageSize = 8,
    sortBy = "date",
    sortOrder = "desc",
  } = options;

  if (!schoolId) {
    return {
      summary: {
        todayPaise: 0,
        todayCount: 0,
        thisMonthPaise: 0,
        thisMonthCount: 0,
        onlinePaise: 0,
        onlineCount: 0,
        cashPaise: 0,
        cashCount: 0,
      },
      transactions: [],
      totalCount: 0,
      totalPages: 1,
      currentPage: 1,
      pageSize,
      classes: [],
      academicYears: [],
    };
  }

  const { todayIST, currentMonthIST, yesterdayIST, startOfWeekIST } = getISTDateBoundaries();

  let summary: CollectionSummaryMetrics = {
    todayPaise: 0,
    todayCount: 0,
    thisMonthPaise: 0,
    thisMonthCount: 0,
    onlinePaise: 0,
    onlineCount: 0,
    cashPaise: 0,
    cashCount: 0,
  };

  let classesList: Array<{ id: string; name: string }> = [];
  let yearsList: Array<{ id: string; label: string; is_current: boolean }> = [];
  const allEnriched: EnrichedTransaction[] = [];

  let periodStartDate: string | null = null;
  let periodEndDate: string | null = null;

  if (dateRange === "today") {
    periodStartDate = todayIST;
    periodEndDate = todayIST;
  } else if (dateRange === "yesterday") {
    periodStartDate = yesterdayIST;
    periodEndDate = yesterdayIST;
  } else if (dateRange === "this_week") {
    periodStartDate = startOfWeekIST;
    periodEndDate = todayIST;
  } else if (dateRange === "this_month") {
    periodStartDate = `${currentMonthIST}-01`;
    periodEndDate = todayIST;
  } else if (dateRange === "custom") {
    periodStartDate = customStartDate || null;
    periodEndDate = customEndDate || null;
  }

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const cleanUUID = (val?: string | null): string | null => {
    if (!val || typeof val !== "string") return null;
    const trimmed = val.trim();
    if (trimmed === "" || trimmed === "all" || trimmed === "none" || trimmed === "undefined" || trimmed === "null") return null;
    return UUID_REGEX.test(trimmed) ? trimmed : null;
  };

  const validSchoolId = cleanUUID(schoolId);

  if (isSupabaseConfigured && validSchoolId) {
    try {
      // 1. Fetch real summary from PostgreSQL RPC
      const summaryRpcPromise = supabase.rpc("get_fee_collections_summary", {
        p_school_id: validSchoolId,
        p_academic_year_id: cleanUUID(academicYearId),
        p_start_date: periodStartDate,
        p_end_date: periodEndDate,
      });

      // 2. Fetch classes and academic years
      const classesPromise = supabase
        .from("classes")
        .select("id, name")
        .eq("school_id", schoolId)
        .order("name");

      const yearsPromise = supabase
        .from("academic_years")
        .select("id, label, is_current")
        .eq("school_id", schoolId)
        .order("start_year", { ascending: false });

      // 3. Fetch collectors profiles
      const profilesPromise = supabase
        .from("profiles")
        .select("auth_id, full_name")
        .eq("school_id", schoolId);

      // 4. Fetch fee receipts with embedded relations
      const receiptsPromise = supabase
        .from("fee_receipts")
        .select(`
          id,
          receipt_no,
          receipt_date,
          total_paise,
          status,
          source,
          remarks,
          collected_by,
          created_at,
          student_id,
          academic_year_id,
          student:students!fee_receipts_student_id_fkey (
            id,
            first_name,
            last_name,
            admission_no,
            student_enrollments!student_enrollments_student_id_fkey (
              class_id,
              section_id,
              status,
              class:classes!student_enrollments_class_id_fkey(name),
              section:sections(name)
            )
          ),
          payments:fee_payments!fee_payments_receipt_id_fkey (
            id,
            mode,
            amount_paise,
            reference_no,
            bank_name,
            cheque_status
          ),
          items:fee_receipt_items!fee_receipt_items_receipt_id_fkey (
            id,
            due_id,
            amount_paise,
            due:student_dues!fee_receipt_items_due_id_fkey (
              id,
              term_id,
              due_date,
              term:fee_terms!student_dues_term_id_fkey(name)
            )
          )
        `)
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      const [summaryRes, classesRes, yearsRes, profilesRes, receiptsRes] = await Promise.all([
        summaryRpcPromise,
        classesPromise,
        yearsPromise,
        profilesPromise,
        receiptsPromise,
      ]);

      if (summaryRes.data) {
        summary = summaryRes.data as CollectionSummaryMetrics;
      }

      classesList = (classesRes.data || []) as Array<{ id: string; name: string }>;
      yearsList = (yearsRes.data || []) as Array<{ id: string; label: string; is_current: boolean }>;

      const profileMap = new Map<string, string>();
      (profilesRes.data || []).forEach((p: any) => {
        if (p.auth_id && p.full_name) profileMap.set(p.auth_id, p.full_name);
      });

      const rawReceipts = (receiptsRes.data || []) as any[];

      // Transform raw database records to EnrichedTransaction
      for (const r of rawReceipts) {
        const student = r.student;
        const studentName = student
          ? `${student.first_name || ""} ${student.last_name || ""}`.trim() || "Student"
          : "Student";
        const admissionNo = student?.admission_no || "—";

        // Resolve active enrollment
        const enrollments = student?.student_enrollments || [];
        const activeEnroll = enrollments.find((e: any) => e.status !== "inactive") || enrollments[0];
        const className = activeEnroll?.class?.name || "—";
        const sectionName = activeEnroll?.section?.name || "";
        const classIdVal = activeEnroll?.class_id || undefined;
        const sectionIdVal = activeEnroll?.section_id || undefined;

        // Payment details
        const linkedPayments = r.payments || [];
        const primaryPayment = linkedPayments[0];
        const paymentMode: PaymentMode = (primaryPayment?.mode as PaymentMode) || (r.source === "online" ? "online" : "cash");

        // Format linked invoice numbers / terms
        const invoiceSet = new Set<string>();
        const rItems = r.items || [];
        for (const item of rItems) {
          const termName = item.due?.term?.name;
          if (termName) {
            invoiceSet.add(termName);
          } else if (item.due?.due_date) {
            const d = new Date(item.due.due_date);
            if (!isNaN(d.getTime())) {
              invoiceSet.add(d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }));
            }
          }
        }

        if (invoiceSet.size === 0) {
          const seqMatch = r.receipt_no ? r.receipt_no.replace(/[^0-9]/g, "").slice(-3) : "001";
          invoiceSet.add(`INV-2026-${seqMatch.padStart(3, "0")}`);
        }

        // Determine status according to consistent payment lifecycle
        let displayStatus: "received" | "successful" | "pending" | "failed" | "cancelled" | "refunded" | "reversed" = "successful";
        if (r.status === "cancelled") {
          displayStatus = "cancelled";
        } else if (r.status === "bounced" || primaryPayment?.cheque_status === "bounced") {
          displayStatus = "failed";
        } else if (primaryPayment?.cheque_status === "deposited" || primaryPayment?.status === "pending") {
          displayStatus = "pending";
        } else {
          displayStatus = "successful";
        }

        const collectorName = (r.collected_by && profileMap.get(r.collected_by)) || "School Office";

        allEnriched.push({
          id: r.id,
          receipt_id: r.id,
          receipt_no: r.receipt_no,
          receipt_date: r.receipt_date,
          created_at: r.created_at,
          formatted_date_time: formatTransactionDateTime(r.created_at),
          student_id: r.student_id,
          student_name: studentName,
          admission_no: admissionNo,
          initials: getInitials(studentName),
          class_id: classIdVal,
          class_name: className,
          section_id: sectionIdVal,
          section_name: sectionName,
          invoice_numbers: Array.from(invoiceSet),
          amount_paise: r.total_paise || 0,
          formatted_amount: formatPaise(r.total_paise || 0),
          payment_method: paymentMode,
          status: displayStatus,
          academic_year_id: r.academic_year_id || undefined,
          reference_no: primaryPayment?.reference_no || undefined,
          collected_by_name: collectorName,
          remarks: r.remarks || undefined,
        });
      }
    } catch (dbErr) {
      console.warn("Supabase collections fetch error:", dbErr);
    }
  } else {
    // Offline / LocalStorage fallback
    const receipts = lsGet<FeeReceipt>(`myzkool_fee_receipts_${schoolId}`);
    const payments = lsGet<FeePayment>(`myzkool_fee_payments_${schoolId}`);
    const items = lsGet<FeeReceiptItem>(`myzkool_fee_receipt_items_${schoolId}`);
    const dues = lsGet<StudentDue>(`myzkool_student_dues_${schoolId}`);
    const students = lsGet<any>(`myzkool_students_${schoolId}`).filter((s: any) => !s.deleted_at);
    const classes = lsGet<any>(`myzkool_classes_${schoolId}`);
    const sections = lsGet<any>(`myzkool_sections_${schoolId}`);
    const enrollments = lsGet<any>(`myzkool_student_enrollments_${schoolId}`);
    const academicYears = lsGet<any>(`myzkool_academic_years_${schoolId}`);

    classesList = classes.map((c: any) => ({ id: c.id, name: c.name }));
    yearsList = academicYears.map((y: any) => ({ id: y.id, label: y.label, is_current: Boolean(y.is_current) }));

    const studentMap = new Map<string, any>(students.map((s: any) => [s.id, s]));
    const classMap = new Map<string, any>(classes.map((c: any) => [c.id, c]));
    const sectionMap = new Map<string, any>(sections.map((sec: any) => [sec.id, sec]));
    const enrollmentMap = new Map<string, any>(enrollments.map((e: any) => [e.student_id, e]));
    const paymentsMap = new Map<string, FeePayment[]>();
    payments.forEach((p) => {
      const list = paymentsMap.get(p.receipt_id) || [];
      list.push(p);
      paymentsMap.set(p.receipt_id, list);
    });

    const refunds = lsGet<any>(`myzkool_fee_refunds_${schoolId}`);
    const paidRefundReceiptIds = new Set(
      refunds.filter((ref: any) => ref.status === "paid" && ref.receipt_id).map((ref: any) => ref.receipt_id)
    );
    const ledger = lsGet<any>(`myzkool_fee_ledger_${schoolId}`);
    const reversedReceiptIds = new Set(
      ledger.filter((l: any) => l.entry_type === "reversal" && l.receipt_id).map((l: any) => l.receipt_id)
    );

    for (const r of receipts) {
      const std = studentMap.get(r.student_id);
      const studentName = std ? `${std.first_name || ""} ${std.last_name || ""}`.trim() : "Student";
      const enr = enrollmentMap.get(r.student_id);
      const cls = enr ? classMap.get(enr.class_id) : null;
      const sec = enr ? sectionMap.get(enr.section_id) : null;
      const pms = paymentsMap.get(r.id) || [];
      const primaryPayment = pms[0];
      const mode = primaryPayment?.mode || (r.source === "online" ? "online" : "cash");

      let txStatus: "received" | "successful" | "pending" | "failed" | "cancelled" | "refunded" | "reversed" = "successful";
      if (r.status === "cancelled") {
        txStatus = "cancelled";
      } else if (r.status === "bounced" || primaryPayment?.cheque_status === "bounced" || primaryPayment?.status === "failed") {
        txStatus = "failed";
      } else if (primaryPayment?.cheque_status === "deposited" || primaryPayment?.status === "pending") {
        txStatus = "pending";
      } else if (paidRefundReceiptIds.has(r.id)) {
        txStatus = "refunded";
      } else if (reversedReceiptIds.has(r.id)) {
        txStatus = "reversed";
      } else {
        txStatus = "successful";
      }

      allEnriched.push({
        id: r.id,
        receipt_id: r.id,
        receipt_no: r.receipt_no,
        receipt_date: r.receipt_date,
        created_at: r.created_at,
        formatted_date_time: formatTransactionDateTime(r.created_at),
        student_id: r.student_id,
        student_name: studentName,
        admission_no: std?.admission_no || "—",
        initials: getInitials(studentName),
        class_id: enr?.class_id,
        class_name: cls?.name || "—",
        section_id: enr?.section_id,
        section_name: sec?.name || "",
        invoice_numbers: [`INV-2026-${r.receipt_no.slice(-3)}`],
        amount_paise: r.total_paise,
        formatted_amount: formatPaise(r.total_paise),
        payment_method: mode as PaymentMode,
        status: txStatus,
        academic_year_id: r.academic_year_id || undefined,
        reference_no: primaryPayment?.reference_no || undefined,
        remarks: r.remarks || undefined,
      });
    }

    // Compute summary locally
    const effectiveStart = periodStartDate || `${currentMonthIST}-01`;
    const effectiveEnd = periodEndDate || todayIST;

    allEnriched.forEach((tx) => {
      if (tx.status === "cancelled") {
        const inPeriod = tx.receipt_date >= effectiveStart && tx.receipt_date <= effectiveEnd;
        if (inPeriod) {
          summary.cancelledCount = (summary.cancelledCount || 0) + 1;
        }
      }
      if (tx.status === "received" || tx.status === "successful") {
        if (tx.receipt_date === todayIST) {
          summary.todayPaise += tx.amount_paise;
          summary.todayCount += 1;
        }
        if (tx.receipt_date.startsWith(currentMonthIST)) {
          summary.thisMonthPaise += tx.amount_paise;
          summary.thisMonthCount += 1;
        }

        // Cash and Online metrics for the selected reporting period (defaulting to current month)
        const inPeriod = tx.receipt_date >= effectiveStart && tx.receipt_date <= effectiveEnd;
        if (inPeriod) {
          if (["upi", "bank_transfer", "online", "card"].includes(tx.payment_method)) {
            summary.onlinePaise += tx.amount_paise;
            summary.onlineCount += 1;
          } else if (tx.payment_method === "cash") {
            summary.cashPaise += tx.amount_paise;
            summary.cashCount += 1;
          }
        }
      }
    });

    summary.totalAuditedCount = summary.thisMonthCount + (summary.cancelledCount || 0);
  }

  // 4. Apply Filters to Transactions
  let filtered = [...allEnriched];

  // Search filter
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter((t) =>
      t.student_name.toLowerCase().includes(q) ||
      t.admission_no.toLowerCase().includes(q) ||
      t.receipt_no.toLowerCase().includes(q) ||
      t.class_name.toLowerCase().includes(q) ||
      t.invoice_numbers.some((inv) => inv.toLowerCase().includes(q)) ||
      (t.reference_no && t.reference_no.toLowerCase().includes(q))
    );
  }

  // Academic Year filter
  if (academicYearId && academicYearId !== "all") {
    filtered = filtered.filter((t) => !t.academic_year_id || t.academic_year_id === academicYearId);
  }

  // Class filter
  if (classId && classId !== "all") {
    filtered = filtered.filter((t) => t.class_id === classId || t.class_name.toLowerCase() === classId.toLowerCase());
  }

  // Payment method dropdown
  if (paymentMethod && paymentMethod !== "all") {
    filtered = filtered.filter((t) => t.payment_method.toLowerCase() === paymentMethod.toLowerCase());
  }

  // Method tab / chip filter
  if (methodTab && methodTab !== "all") {
    const tabLower = methodTab.toLowerCase();
    if (tabLower === "failed") {
      filtered = filtered.filter((t) => t.status === "failed");
    } else if (tabLower === "cancelled") {
      filtered = filtered.filter((t) => t.status === "cancelled");
    } else if (tabLower === "refunded") {
      filtered = filtered.filter((t) => t.status === "refunded");
    } else if (tabLower === "reversed") {
      filtered = filtered.filter((t) => t.status === "reversed");
    } else if (tabLower === "pending") {
      filtered = filtered.filter((t) => t.status === "pending");
    } else if (tabLower === "successful" || tabLower === "received") {
      filtered = filtered.filter((t) => t.status === "successful" || t.status === "received");
    } else if (tabLower === "online") {
      filtered = filtered.filter((t) => ["online", "upi", "bank_transfer", "card"].includes(t.payment_method));
    } else {
      filtered = filtered.filter((t) => t.payment_method.toLowerCase() === tabLower);
    }
  }

  // Status dropdown filter
  if (status && status !== "all") {
    const sLower = status.toLowerCase();
    filtered = filtered.filter((t) =>
      sLower === "successful" || sLower === "received"
        ? (t.status === "successful" || t.status === "received")
        : t.status === sLower
    );
  }

  // Date range filter
  if (dateRange && dateRange !== "all") {
    if (dateRange === "today") {
      filtered = filtered.filter((t) => t.receipt_date === todayIST);
    } else if (dateRange === "yesterday") {
      filtered = filtered.filter((t) => t.receipt_date === yesterdayIST);
    } else if (dateRange === "this_week") {
      filtered = filtered.filter((t) => t.receipt_date >= startOfWeekIST && t.receipt_date <= todayIST);
    } else if (dateRange === "this_month") {
      filtered = filtered.filter((t) => t.receipt_date.startsWith(currentMonthIST));
    } else if (dateRange === "custom") {
      if (customStartDate) filtered = filtered.filter((t) => t.receipt_date >= customStartDate);
      if (customEndDate) filtered = filtered.filter((t) => t.receipt_date <= customEndDate);
    }
  }

  // Sorting
  filtered.sort((a, b) => {
    if (sortBy === "amount") {
      return sortOrder === "asc" ? a.amount_paise - b.amount_paise : b.amount_paise - a.amount_paise;
    }
    if (sortBy === "receipt_no") {
      return sortOrder === "asc"
        ? a.receipt_no.localeCompare(b.receipt_no)
        : b.receipt_no.localeCompare(a.receipt_no);
    }
    if (sortBy === "student_name") {
      return sortOrder === "asc"
        ? a.student_name.localeCompare(b.student_name)
        : b.student_name.localeCompare(a.student_name);
    }
    if (sortBy === "class_name") {
      return sortOrder === "asc"
        ? a.class_name.localeCompare(b.class_name)
        : b.class_name.localeCompare(a.class_name);
    }
    if (sortBy === "payment_method") {
      return sortOrder === "asc"
        ? a.payment_method.localeCompare(b.payment_method)
        : b.payment_method.localeCompare(a.payment_method);
    }
    if (sortBy === "status") {
      return sortOrder === "asc"
        ? a.status.localeCompare(b.status)
        : b.status.localeCompare(a.status);
    }
    // Default: date desc
    const timeA = new Date(a.created_at).getTime() || 0;
    const timeB = new Date(b.created_at).getTime() || 0;
    return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
  });

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    summary,
    transactions: paginated,
    allFilteredTransactions: filtered,
    totalCount,
    totalPages,
    currentPage: safePage,
    pageSize,
    classes: classesList,
    academicYears: yearsList,
  };
}

/**
 * Loads outstanding invoices for a student in the Collect Fee drawer
 */
export async function getStudentOutstandingInvoices(
  schoolId: string,
  studentId: string,
  yearId?: string
): Promise<OutstandingInvoiceItem[]> {
  if (!schoolId || !studentId) return [];

  const cleanYearId = yearId && yearId !== "all" && yearId !== "" ? yearId : undefined;

  const { dues, error } = await getStudentDues(schoolId, studentId, cleanYearId);
  if (error) {
    throw new Error(error);
  }

  let pendingDues = dues.filter((d) => d.status === "pending" || d.status === "partial");

  // If filtered by specific year and none found, check if student has pending dues in other years
  if (pendingDues.length === 0 && cleanYearId) {
    const allYearsResult = await getStudentDues(schoolId, studentId);
    if (!allYearsResult.error) {
      const anyPending = allYearsResult.dues.filter((d) => d.status === "pending" || d.status === "partial");
      if (anyPending.length > 0) {
        pendingDues = anyPending;
      }
    }
  }

  if (pendingDues.length === 0) return [];

  // Group by term_id or general
  const groupMap = new Map<string, StudentDue[]>();
  for (const due of pendingDues) {
    const key = due.term_id || "general";
    const arr = groupMap.get(key) || [];
    arr.push(due);
    groupMap.set(key, arr);
  }

  const result: OutstandingInvoiceItem[] = [];
  let seq = 1;

  for (const [termKey, list] of groupMap.entries()) {
    const totalPaise = list.reduce((s, d) => s + (d.net_paise || 0), 0);
    const paidPaise = list.reduce((s, d) => s + (d.paid_paise || 0), 0);
    const balancePaise = list.reduce((s, d) => s + (d.balance_paise || 0), 0);
    const earliestDueDate = list.map((d) => d.due_date).filter(Boolean).sort()[0] || getTodayIST();
    const isOverdue = new Date(earliestDueDate) < new Date(getTodayIST());

    // Month / term display
    const dObj = new Date(earliestDueDate);
    const monthStr = isNaN(dObj.getTime())
      ? `Term ${seq}`
      : dObj.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    const formattedDueDate = isNaN(dObj.getTime())
      ? earliestDueDate
      : dObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    const termDisplayName = list[0]?.term_name || monthStr;

    // Fee particulars
    const particulars = Array.from(
      new Set(list.map((d) => d.fee_head_name || d.description || "Tuition Fee").filter(Boolean))
    );
    const lineItems = list.map((d) => ({
      due_id: d.id,
      fee_head_id: d.fee_head_id,
      name: d.fee_head_name || d.description || "Fee Item",
      gross_paise: d.gross_paise || d.net_paise || 0,
      concession_paise: d.concession_paise || 0,
      net_paise: d.net_paise || 0,
      amount_paise: d.net_paise || 0,
      paid_paise: d.paid_paise || 0,
      balance_paise: d.balance_paise || 0,
      due_date: d.due_date,
    }));

    const existingInvNo = list.find((d) => d.invoice_no)?.invoice_no;
    result.push({
      id: termKey,
      invoice_number: existingInvNo || `INV-2026-${String(seq).padStart(3, "0")}`,
      term_id: termKey === "general" ? undefined : termKey,
      term_name: termDisplayName,
      billing_period: termDisplayName,
      due_date: formattedDueDate,
      total_paise: totalPaise,
      paid_paise: paidPaise,
      balance_paise: balancePaise,
      due_ids: list.map((d) => d.id),
      status: isOverdue ? "overdue" : paidPaise > 0 ? "partial" : "pending",
      is_overdue: isOverdue,
      particulars,
      items: lineItems,
    });
    seq++;
  }

  return result;
}

/**
 * Sanitize cell values against CSV formula injection (=, +, -, @)
 */
function sanitizeCSVField(val: string | null | undefined): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  if (/^[=\+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Export collections records as CSV
 */
export function exportCollectionsCSV(transactions: EnrichedTransaction[]): void {
  if (!transactions || transactions.length === 0) return;

  const headers = [
    "Receipt No",
    "Date & Time",
    "Student Name",
    "Admission No",
    "Class",
    "Invoice Numbers",
    "Amount (INR)",
    "Payment Method",
    "Status",
    "Reference No",
    "Collected By",
    "Remarks",
  ];

  const rows = transactions.map((t) => [
    sanitizeCSVField(t.receipt_no),
    sanitizeCSVField(t.formatted_date_time),
    sanitizeCSVField(t.student_name),
    sanitizeCSVField(t.admission_no),
    sanitizeCSVField(`${t.class_name}${t.section_name ? ` - ${t.section_name}` : ""}`),
    sanitizeCSVField(t.invoice_numbers.join(", ")),
    (t.amount_paise / 100).toFixed(2),
    sanitizeCSVField(t.payment_method.toUpperCase()),
    sanitizeCSVField(t.status.toUpperCase()),
    sanitizeCSVField(t.reference_no || ""),
    sanitizeCSVField(t.collected_by_name || ""),
    sanitizeCSVField(t.remarks || ""),
  ]);

  const csvContent =
    "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `fee_collections_${getTodayIST()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
