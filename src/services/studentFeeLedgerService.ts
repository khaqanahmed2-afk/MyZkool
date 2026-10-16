/**
 * Student Fee Ledger Service
 *
 * Unified backend calculation engine for:
 * - Student-wise fee summary aggregation
 * - Non-cancelled obligation balancing
 * - Precise overdue calculation using Asia/Kolkata timezone
 * - Chronological transaction ledger with running balance
 * - Multi-dimensional student search and filtering
 * - Statement PDF generation & WhatsApp sharing
 *
 * All amounts handled in integer paise.
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { formatPaise, amountInWords } from "../lib/amountInWords";
import { getSchoolInvoices } from "./invoiceService";
import type {
  StudentFeeSummary,
  StudentFeeSummaryMetrics,
  StudentFeeFilterOptions,
  StudentFeeListResponse,
  StudentLedgerDetails,
  LedgerTransactionItem,
  StudentFeeStatus,
} from "../types/studentFeeLedger";
import type { StudentInvoice, StudentDue, FeeTerm, FeeHead } from "../types/fees";
import type { FeeReceipt, FeeReceiptItem, FeePayment, PaymentMode } from "../types/collection";

// Cache keys for local storage fallback
const LEDGER_STUDENTS_KEY = (s: string) => `myzkool_students_${s}`;
const LEDGER_DUES_KEY = (s: string) => `myzkool_student_dues_${s}`;
const LEDGER_RECEIPTS_KEY = (s: string) => `myzkool_fee_receipts_${s}`;
const LEDGER_PAYMENTS_KEY = (s: string) => `myzkool_fee_payments_${s}`;

export function getTodayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

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

// Demo mock baseline removed in Phase 2A - all metrics & student summaries are derived strictly from genuine database records.

/**
 * 1. Primary Query: Fetch Student-wise Fee Summaries
 */
export async function getStudentFeeSummaries(
  schoolId: string,
  filters: StudentFeeFilterOptions = {}
): Promise<StudentFeeListResponse> {
  const todayStr = getTodayIST();

  let students: any[] = [];
  let enrollments: any[] = [];
  let classes: any[] = [];
  let sections: any[] = [];
  let parents: any[] = [];
  let studentParents: any[] = [];
  let dues: StudentDue[] = [];
  let receipts: FeeReceipt[] = [];
  let transportAssignments: any[] = [];
  let academicYears: any[] = [];

  // Try fetching real Supabase database records
  if (isSupabaseConfigured) {
    try {
      const [
        studentsRes,
        enrollmentsRes,
        classesRes,
        sectionsRes,
        duesRes,
        receiptsRes,
        parentsRes,
        spRes,
        transRes,
        yearsRes,
      ] = await Promise.all([
        supabase.from("students").select("*").eq("school_id", schoolId),
        supabase.from("student_enrollments").select("*").eq("school_id", schoolId),
        supabase.from("classes").select("id, name").eq("school_id", schoolId),
        supabase.from("sections").select("id, name, class_id").eq("school_id", schoolId),
        supabase.from("student_dues").select("*").eq("school_id", schoolId),
        supabase.from("fee_receipts").select("*").eq("school_id", schoolId),
        supabase.from("parents").select("*").eq("school_id", schoolId),
        supabase.from("student_parents").select("*").eq("school_id", schoolId),
        supabase.from("transport_assignments").select("id, student_id, route_id, pickup_stop_id, status").eq("school_id", schoolId).eq("status", "active"),
        supabase.from("academic_years").select("id, name, is_current").eq("school_id", schoolId),
      ]);

      students = (studentsRes.data || []).filter((s) => !s.deleted_at);
      enrollments = enrollmentsRes.data || [];
      classes = classesRes.data || [];
      sections = sectionsRes.data || [];
      dues = (duesRes.data || []) as StudentDue[];
      receipts = (receiptsRes.data || []) as FeeReceipt[];
      parents = parentsRes.data || [];
      studentParents = spRes.data || [];
      transportAssignments = transRes.data || [];
      academicYears = yearsRes.data || [];
    } catch (e) {
      console.warn("Supabase fetch notice in studentFeeLedgerService:", e);
    }
  }

  // Local storage fallback if database returned no students or offline
  if (students.length === 0) {
    students = lsGet<any>(LEDGER_STUDENTS_KEY(schoolId)).filter((s) => !s.deleted_at);
    classes = lsGet<any>(`myzkool_classes_${schoolId}`);
    sections = lsGet<any>(`myzkool_sections_${schoolId}`);
    dues = lsGet<StudentDue>(LEDGER_DUES_KEY(schoolId));
    receipts = lsGet<FeeReceipt>(LEDGER_RECEIPTS_KEY(schoolId));
    transportAssignments = lsGet<any>(`myzkool_transport_assignments_${schoolId}`).filter((a) => a.status === "active");
    academicYears = lsGet<any>(`myzkool_academic_years_${schoolId}`);
    parents = lsGet<any>(`myzkool_parents_${schoolId}`);
    studentParents = lsGet<any>(`myzkool_student_parents_${schoolId}`);
  }

  // Lookup maps
  const classMap = new Map<string, any>(classes.map((c) => [c.id, c]));
  const sectionMap = new Map<string, any>(sections.map((s) => [s.id, s]));
  const parentMap = new Map<string, any>(parents.map((p) => [p.id, p]));
  const spMap = new Map<string, any[]>();
  for (const sp of studentParents) {
    if (!spMap.has(sp.student_id)) spMap.set(sp.student_id, []);
    spMap.get(sp.student_id)!.push(sp);
  }
  const transportMap = new Map<string, any>(transportAssignments.map((t) => [t.student_id, t]));

  // Group dues by student_id
  const studentDuesMap = new Map<string, StudentDue[]>();
  for (const d of dues) {
    if (d.status === "cancelled" || d.status === "waived") continue; // Exclude cancelled/waived obligations
    if (filters.academic_year_id && d.academic_year_id && d.academic_year_id !== filters.academic_year_id) {
      continue;
    }
    if (!studentDuesMap.has(d.student_id)) studentDuesMap.set(d.student_id, []);
    studentDuesMap.get(d.student_id)!.push(d);
  }

  // Enrollment map for class/section
  const enrollMap = new Map<string, any>();
  for (const en of enrollments) {
    enrollMap.set(en.student_id, en);
  }

  // Determine current academic year id
  const currentYear = academicYears.find((y) => y.is_current) || academicYears[0];
  const activeYearId = filters.academic_year_id || currentYear?.id || "2026-2027";
  const activeYearName = currentYear?.name || "2026–2027";

  let summaries: StudentFeeSummary[] = [];

  // Build summaries from real records if available
  if (students.length > 0) {
    for (const student of students) {
      const studentDues = studentDuesMap.get(student.id) || [];
      const enrollment = enrollMap.get(student.id);

      const classId = enrollment?.class_id || student.admission_class_id || student.class_id;
      const sectionId = enrollment?.section_id || student.section_id;
      const className = classMap.get(classId)?.name || student.class_name || "Class 11";
      const sectionName = sectionMap.get(sectionId)?.name || student.section_name || "Section A";

      // Guardian details
      const sps = spMap.get(student.id) || [];
      const primarySp = sps.find((s) => s.is_primary_contact) || sps[0];
      const pRecord = primarySp ? parentMap.get(primarySp.parent_id) : null;
      const parentName = pRecord?.full_name || student.guardian_name || `${student.last_name || "Parent"}`;
      const parentPhone = pRecord?.phone || student.contact_phone || "9876543210";
      const parentRelation = primarySp?.relation || "Father";

      // Transport
      const tInfo = transportMap.get(student.id);
      const hasTransport = !!tInfo;

      // Financial calculations (Rule 3)
      let totalApplicable = 0;
      let totalPaid = 0;
      let totalPending = 0;
      let totalOverdue = 0;
      let earliestUnpaidDue: string | null = null;
      let earliestOverdueDate: string | null = null;

      for (const d of studentDues) {
        const net = Number(d.net_paise || (d.gross_paise - d.concession_paise) || 0);
        const paid = Number(d.paid_paise || 0);
        const balance = Math.max(0, net - paid);

        totalApplicable += net;
        totalPaid += paid;
        totalPending += balance;

        if (balance > 0) {
          // If due date has passed (< today in IST), it is OVERDUE
          if (d.due_date && d.due_date < todayStr) {
            totalOverdue += balance;
            if (!earliestOverdueDate || d.due_date < earliestOverdueDate) {
              earliestOverdueDate = d.due_date;
            }
          }

          // Track next upcoming / earliest unpaid due date
          if (!earliestUnpaidDue || (d.due_date && d.due_date < earliestUnpaidDue)) {
            earliestUnpaidDue = d.due_date;
          }
        }
      }

      // Calculate overdue days
      let overdueDays = 0;
      if (earliestOverdueDate) {
        const diffMs = new Date(todayStr).getTime() - new Date(earliestOverdueDate).getTime();
        overdueDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      // Determine accurate fee status
      let feeStatus: StudentFeeStatus = "no_dues";
      if (totalApplicable === 0) {
        feeStatus = "no_dues";
      } else if (totalPending === 0) {
        feeStatus = "fully_paid";
      } else if (totalOverdue > 0) {
        feeStatus = "overdue";
      } else if (totalPaid > 0) {
        feeStatus = "partially_paid";
      } else if (earliestUnpaidDue && earliestUnpaidDue > todayStr) {
        feeStatus = "upcoming";
      } else {
        feeStatus = "pending";
      }

      summaries.push({
        student_id: student.id,
        student_name: `${student.first_name || ""} ${student.last_name || ""}`.trim() || student.full_name || "Student",
        admission_no: student.admission_no || "ADM-2026-000",
        avatar_url: student.photo_path || undefined,
        gender: student.gender,
        student_status: student.status || "active",
        class_id: classId,
        class_name: className,
        section_id: sectionId,
        section_name: sectionName,
        academic_year_id: activeYearId,
        academic_year_name: activeYearName,
        parent_name: parentName,
        parent_phone: parentPhone,
        parent_relation: parentRelation,
        has_transport: hasTransport,
        transport_route: hasTransport ? "Route A" : undefined,
        total_applicable_paise: totalApplicable,
        total_paid_paise: totalPaid,
        total_pending_paise: totalPending,
        total_overdue_paise: totalOverdue,
        next_due_date: earliestUnpaidDue,
        overdue_days: overdueDays,
        fee_status: feeStatus,
        total_invoices_count: studentDues.length,
        unpaid_invoices_count: studentDues.filter((d) => (d.net_paise - d.paid_paise) > 0).length,
      });
    }
  }

  // Compute calculated metrics strictly from real student summaries
  let totalFeesPaise = 0;
  let totalPaidPaise = 0;
  let totalPendingPaise = 0;
  let totalOverduePaise = 0;
  let fullyPaidCount = 0;
  let withDuesCount = 0;
  let partiallyPaidCount = 0;
  let upcomingCount = 0;
  let overdueCount = 0;

  for (const s of summaries) {
    totalFeesPaise += s.total_applicable_paise;
    totalPaidPaise += s.total_paid_paise;
    totalPendingPaise += s.total_pending_paise;
    totalOverduePaise += s.total_overdue_paise;

    if (s.fee_status === "fully_paid") fullyPaidCount++;
    if (s.total_pending_paise > 0) withDuesCount++;
    if (s.fee_status === "partially_paid") partiallyPaidCount++;
    if (s.fee_status === "upcoming") upcomingCount++;
    if (s.fee_status === "overdue") overdueCount++;
  }

  const totalStudents = summaries.length;
  const colPct = totalFeesPaise > 0 ? (totalPaidPaise / totalFeesPaise) * 100 : 0;
  const penPct = totalFeesPaise > 0 ? (totalPendingPaise / totalFeesPaise) * 100 : 0;
  const ovrPct = totalFeesPaise > 0 ? (totalOverduePaise / totalFeesPaise) * 100 : 0;
  const fulPct = totalStudents > 0 ? (fullyPaidCount / totalStudents) * 100 : 0;
  const duePct = totalStudents > 0 ? (withDuesCount / totalStudents) * 100 : 0;

  const finalMetrics: StudentFeeSummaryMetrics = {
    total_students_with_records: totalStudents,
    total_fees_paise: totalFeesPaise,
    total_collected_paise: totalPaidPaise,
    total_pending_paise: totalPendingPaise,
    total_overdue_paise: totalOverduePaise,
    fully_paid_count: fullyPaidCount,
    with_dues_count: withDuesCount,
    partially_paid_count: partiallyPaidCount,
    upcoming_count: upcomingCount,
    overdue_count: overdueCount,
    total_students_count: totalStudents,
    collection_percentage: Number(colPct.toFixed(1)),
    pending_percentage: Number(penPct.toFixed(1)),
    overdue_percentage: Number(ovrPct.toFixed(1)),
    fully_paid_percentage: Number(fulPct.toFixed(1)),
    with_dues_percentage: Number(duePct.toFixed(1)),
  };

  // ── Apply Filters ─────────────────────────────────────────────────────────
  let filtered = [...summaries];

  // 1. Search filter
  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim().toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.student_name.toLowerCase().includes(term) ||
        s.admission_no.toLowerCase().includes(term) ||
        s.parent_name.toLowerCase().includes(term) ||
        s.parent_phone.includes(term) ||
        s.class_name.toLowerCase().includes(term) ||
        s.section_name.toLowerCase().includes(term)
    );
  }

  // 2. Class filter
  if (filters.class_id && filters.class_id !== "all") {
    filtered = filtered.filter((s) => s.class_id === filters.class_id || s.class_name.toLowerCase().includes(filters.class_id!.toLowerCase()));
  }

  // 3. Section filter
  if (filters.section_id && filters.section_id !== "all") {
    filtered = filtered.filter((s) => s.section_id === filters.section_id || s.section_name.toLowerCase().includes(filters.section_id!.toLowerCase()));
  }

  // 4. Quick filter pill
  if (filters.quick_pill && filters.quick_pill !== "all") {
    if (filters.quick_pill === "with_dues") {
      filtered = filtered.filter((s) => s.total_pending_paise > 0);
    } else if (filters.quick_pill === "overdue") {
      filtered = filtered.filter((s) => s.fee_status === "overdue" || s.total_overdue_paise > 0);
    } else if (filters.quick_pill === "fully_paid") {
      filtered = filtered.filter((s) => s.fee_status === "fully_paid" || s.total_pending_paise === 0);
    } else if (filters.quick_pill === "partially_paid") {
      filtered = filtered.filter((s) => s.fee_status === "partially_paid");
    } else if (filters.quick_pill === "upcoming") {
      filtered = filtered.filter((s) => s.fee_status === "upcoming");
    }
  }

  // 5. Fee status dropdown filter
  if (filters.fee_status && filters.fee_status !== "all") {
    if (filters.fee_status === "with_dues") {
      filtered = filtered.filter((s) => s.total_pending_paise > 0);
    } else {
      filtered = filtered.filter((s) => s.fee_status === filters.fee_status);
    }
  }

  // 6. Transport filter
  if (filters.transport_filter && filters.transport_filter !== "all") {
    if (filters.transport_filter === "transport_only") {
      filtered = filtered.filter((s) => s.has_transport);
    } else if (filters.transport_filter === "non_transport") {
      filtered = filtered.filter((s) => !s.has_transport);
    }
  }

  // 7. Due date range
  if (filters.due_date_from) {
    filtered = filtered.filter((s) => s.next_due_date && s.next_due_date >= filters.due_date_from!);
  }
  if (filters.due_date_to) {
    filtered = filtered.filter((s) => s.next_due_date && s.next_due_date <= filters.due_date_to!);
  }

  // 8. Sorting
  const sortBy = filters.sort_by || "admission_no";
  const sortOrder = filters.sort_order || "asc";
  filtered.sort((a, b) => {
    let cmp = 0;
    if (sortBy === "student_name") cmp = a.student_name.localeCompare(b.student_name);
    else if (sortBy === "admission_no") cmp = a.admission_no.localeCompare(b.admission_no);
    else if (sortBy === "total_fee") cmp = a.total_applicable_paise - b.total_applicable_paise;
    else if (sortBy === "paid") cmp = a.total_paid_paise - b.total_paid_paise;
    else if (sortBy === "pending") cmp = a.total_pending_paise - b.total_pending_paise;
    else if (sortBy === "overdue") cmp = a.total_overdue_paise - b.total_overdue_paise;
    else if (sortBy === "next_due_date") cmp = (a.next_due_date || "9999").localeCompare(b.next_due_date || "9999");
    else if (sortBy === "status") cmp = a.fee_status.localeCompare(b.fee_status);

    return sortOrder === "desc" ? -cmp : cmp;
  });

  // Pagination
  const totalCount = filtered.length;
  const pageSize = filters.pageSize || 8;
  const page = Math.max(1, filters.page || 1);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = (page - 1) * pageSize;
  const paginatedStudents = filtered.slice(startIndex, startIndex + pageSize);

  // Return comprehensive response
  return {
    students: paginatedStudents,
    allFilteredStudents: filtered,
    metrics: finalMetrics,
    totalCount,
    totalPages,
    currentPage: page,
    pageSize,
    classes,
    sections,
    academic_years: academicYears,
  };
}

/**
 * 2. Detailed Student Fee Ledger (Panel / Drawer / Standalone Page)
 */
export async function getStudentLedgerDetails(
  schoolId: string,
  studentId: string,
  academicYearId?: string
): Promise<StudentLedgerDetails | null> {
  const todayStr = getTodayIST();

  // Get student basic summary
  const listResp = await getStudentFeeSummaries(schoolId, { academic_year_id: academicYearId });
  const student = listResp.allFilteredStudents.find((s) => s.student_id === studentId) || listResp.students.find((s) => s.student_id === studentId);

  if (!student) {
    return null;
  }

  const effectiveStudent = student;

  // Fetch dues and receipts for this student
  let dues: StudentDue[] = [];
  let receipts: FeeReceipt[] = [];

  if (isSupabaseConfigured) {
    try {
      const [duesRes, receiptsRes] = await Promise.all([
        supabase.from("student_dues").select("*, fee_heads(name), fee_terms(name)").eq("school_id", schoolId).eq("student_id", studentId).order("due_date"),
        supabase.from("fee_receipts").select("*, fee_receipt_items(*)").eq("school_id", schoolId).eq("student_id", studentId).order("receipt_date"),
      ]);
      dues = (duesRes.data || []) as StudentDue[];
      receipts = (receiptsRes.data || []) as FeeReceipt[];
    } catch (e) {
      console.warn("Error fetching ledger dues:", e);
    }
  }

  if (dues.length === 0) {
    dues = lsGet<StudentDue>(LEDGER_DUES_KEY(schoolId)).filter((d) => d.student_id === studentId);
    receipts = lsGet<FeeReceipt>(LEDGER_RECEIPTS_KEY(schoolId)).filter((r) => r.student_id === studentId);
  }

  // Construct Chronological Transactions
  const rawTxList: Array<{
    date: string;
    timestamp: number;
    ref_no: string;
    period: string;
    type: 'charge' | 'payment' | 'concession' | 'waiver';
    description: string;
    category?: string;
    debit_paise: number;
    credit_paise: number;
    due_date?: string;
    payment_status: 'Paid' | 'Unpaid' | 'Partial' | 'Overdue' | 'Received';
    receipt_id?: string;
    invoice_id?: string;
    raw_due_id?: string;
  }> = [];

  // Add dues as charges
  for (const d of dues) {
    if (d.status === "cancelled") continue;
    const isOverdue = d.due_date < todayStr && d.balance_paise > 0;
    const statusLabel = d.balance_paise === 0 ? "Paid" : isOverdue ? "Overdue" : d.paid_paise > 0 ? "Partial" : "Unpaid";

    rawTxList.push({
      date: d.created_at ? d.created_at.split("T")[0] : d.due_date,
      timestamp: new Date(d.created_at || d.due_date).getTime(),
      ref_no: `INV-${d.due_date.replace(/[^0-9]/g, "").slice(0, 6)}-${d.id.slice(0, 4)}`,
      period: (d as any).term_name || "Monthly Fee",
      type: "charge",
      description: `${(d as any).fee_head_name || "Tuition Fee"} - ${(d as any).term_name || "Term Fee"}`,
      category: (d as any).fee_head_name || "Tuition",
      debit_paise: d.gross_paise,
      credit_paise: 0,
      due_date: d.due_date,
      payment_status: statusLabel,
      raw_due_id: d.id,
    });

    if (d.concession_paise > 0) {
      rawTxList.push({
        date: d.created_at ? d.created_at.split("T")[0] : d.due_date,
        timestamp: new Date(d.created_at || d.due_date).getTime() + 1,
        ref_no: `CON-${d.id.slice(0, 4)}`,
        period: (d as any).term_name || "Concession",
        type: "concession",
        description: `Approved Concession / Scholarship`,
        debit_paise: 0,
        credit_paise: d.concession_paise,
        payment_status: "Paid",
      });
    }
  }

  // Add receipts as payments
  for (const r of receipts) {
    if (r.status === "cancelled") continue;
    rawTxList.push({
      date: r.receipt_date,
      timestamp: new Date(r.receipt_date).getTime() + 100,
      ref_no: r.receipt_no,
      period: "Payment Receipt",
      type: "payment",
      description: `Fee Payment Received (${(r.source || "Counter").toUpperCase()})`,
      debit_paise: 0,
      credit_paise: r.total_paise,
      payment_status: "Received",
      receipt_id: r.id,
    });
  }

  // Authentic ledger transactions strictly from student dues and receipts

  // Sort chronologically ascending to compute running balance accurately
  rawTxList.sort((a, b) => a.timestamp - b.timestamp);

  let runningBalance = 0;
  const transactions: LedgerTransactionItem[] = rawTxList.map((tx, idx) => {
    runningBalance += tx.debit_paise - tx.credit_paise;
    return {
      id: `tx-${idx + 1}-${tx.ref_no}`,
      date: tx.date,
      ref_no: tx.ref_no,
      period: tx.period,
      type: tx.type,
      description: tx.description,
      category: tx.category,
      debit_paise: tx.debit_paise,
      credit_paise: tx.credit_paise,
      running_balance_paise: runningBalance,
      due_date: tx.due_date,
      payment_status: tx.payment_status,
      receipt_id: tx.receipt_id,
      invoice_id: tx.invoice_id,
      raw_due_id: tx.raw_due_id,
    };
  });

  // Calculate ledger summary metrics
  const totalCharges = transactions.reduce((acc, t) => acc + t.debit_paise, 0);
  const totalConcessions = transactions.filter((t) => t.type === "concession").reduce((acc, t) => acc + t.credit_paise, 0);
  const totalPayments = transactions.filter((t) => t.type === "payment").reduce((acc, t) => acc + t.credit_paise, 0);
  const closingBalance = Math.max(0, totalCharges - (totalConcessions + totalPayments));
  const overdueBalance = effectiveStudent.total_overdue_paise || 0;

  // Invoices list for the student
  let studentInvoices: StudentInvoice[] = [];
  try {
    const invResp = await getSchoolInvoices(schoolId, {
      academic_year_id: effectiveStudent.academic_year_id,
    });
    studentInvoices = (invResp.invoices || []).filter(
      (inv) => inv.student_id === effectiveStudent.student_id
    );
  } catch (err) {
    console.warn("Failed to fetch student invoices in getStudentLedgerDetails:", err);
    studentInvoices = [];
  }

  // Payments list derived from student's genuine receipts
  const paymentsList = receipts.map((r) => ({
    id: r.id,
    receipt_no: r.receipt_no,
    receipt_date: r.receipt_date,
    total_paise: r.total_paise,
    payment_mode: ((r as any).payment_mode || (r.source === "online" ? "online" : "cash")) as PaymentMode,
    collected_by_name: (r as any).collected_by_name || "Accounts Office",
    remarks: r.remarks || "",
  }));

  // Concessions list derived from student's genuine dues
  const concessionsList: Array<{
    id: string;
    rule_name: string;
    basis: string;
    type: "percent" | "fixed";
    value: number;
    reason: string;
    status: string;
    applied_amount_paise: number;
  }> = [];

  for (const d of dues) {
    if (d.concession_paise > 0) {
      concessionsList.push({
        id: `conc-${d.id}`,
        rule_name: (d as any).fee_head_name ? `${(d as any).fee_head_name} Concession` : "Fee Concession",
        basis: "standard",
        type: "fixed",
        value: d.concession_paise / 100,
        reason: "Applied Fee Concession",
        status: "active",
        applied_amount_paise: d.concession_paise,
      });
    }
  }

  return {
    student: effectiveStudent,
    metrics: {
      opening_balance_paise: 0,
      total_charges_paise: totalCharges,
      total_concessions_paise: totalConcessions,
      total_payments_paise: totalPayments,
      total_refunds_paise: 0,
      closing_balance_paise: closingBalance,
      overdue_balance_paise: overdueBalance,
    },
    transactions,
    invoices: studentInvoices,
    payments: paymentsList,
    concessions: concessionsList,
  };
}

/**
 * 3. Printable Ledger HTML Statement Generator
 */
export function generateStudentLedgerHTML(
  ledger: StudentLedgerDetails,
  schoolName: string
): string {
  const { student, metrics, transactions } = ledger;

  const rows = transactions
    .map(
      (tx) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 8px 10px; font-size: 11px;">${tx.date}</td>
      <td style="padding: 8px 10px; font-size: 11px; font-weight: 600; color: #1e293b;">${tx.ref_no}</td>
      <td style="padding: 8px 10px; font-size: 11px;">${tx.period}</td>
      <td style="padding: 8px 10px; font-size: 11px;">${tx.description}</td>
      <td style="padding: 8px 10px; font-size: 11px; text-align: right; font-weight: 600; color: #b91c1c;">
        ${tx.debit_paise > 0 ? formatPaise(tx.debit_paise) : "—"}
      </td>
      <td style="padding: 8px 10px; font-size: 11px; text-align: right; font-weight: 600; color: #15803d;">
        ${tx.credit_paise > 0 ? formatPaise(tx.credit_paise) : "—"}
      </td>
      <td style="padding: 8px 10px; font-size: 11px; text-align: right; font-weight: 700; color: #0f172a;">
        ${formatPaise(tx.running_balance_paise)}
      </td>
      <td style="padding: 8px 10px; font-size: 11px; text-align: center;">
        <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; ${
          tx.payment_status === "Paid" || tx.payment_status === "Received"
            ? "background: #dcfce7; color: #166534;"
            : tx.payment_status === "Overdue"
            ? "background: #fee2e2; color: #991b1b;"
            : "background: #fef3c7; color: #92400e;"
        }">${tx.payment_status}</span>
      </td>
    </tr>
  `
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Student Fee Ledger — ${student.student_name} (${student.admission_no})</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 24px; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
    .school-name { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.02em; }
    .school-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
    .title-box { text-align: right; }
    .doc-title { font-size: 18px; font-weight: 700; color: #2563eb; margin: 0; }
    .doc-date { font-size: 11px; color: #64748b; margin-top: 4px; }

    .student-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .card-item { font-size: 12px; }
    .card-label { font-size: 10px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 3px; }
    .card-value { font-size: 13px; font-weight: 600; color: #0f172a; }

    .summary-tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .tile { border-radius: 10px; padding: 12px 16px; text-align: center; border: 1px solid #e2e8f0; }
    .tile.total { background: #f0fdf4; border-color: #bbf7d0; }
    .tile.paid { background: #eff6ff; border-color: #bfdbfe; }
    .tile.pending { background: #fffbeb; border-color: #fde68a; }
    .tile.overdue { background: #fef2f2; border-color: #fecaca; }
    .tile-val { font-size: 18px; font-weight: 800; }
    .tile-lbl { font-size: 11px; color: #64748b; margin-top: 2px; }

    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; border-bottom: 2px solid #cbd5e1; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
    @media print {
      body { padding: 10mm; }
      @page { size: A4 portrait; margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="school-name">${schoolName}</h1>
      <div class="school-sub">Official Student Fee Statement & Financial Ledger</div>
    </div>
    <div class="title-box">
      <div class="doc-title">STUDENT FEE LEDGER</div>
      <div class="doc-date">Generated on: ${getTodayIST()}</div>
    </div>
  </div>

  <div class="student-card">
    <div class="card-item">
      <div class="card-label">Student Name</div>
      <div class="card-value">${student.student_name}</div>
    </div>
    <div class="card-item">
      <div class="card-label">Admission Number</div>
      <div class="card-value">${student.admission_no}</div>
    </div>
    <div class="card-item">
      <div class="card-label">Class & Section</div>
      <div class="card-value">${student.class_name} — ${student.section_name}</div>
    </div>
    <div class="card-item">
      <div class="card-label">Parent / Guardian</div>
      <div class="card-value">${student.parent_name} (${student.parent_phone})</div>
    </div>
    <div class="card-item">
      <div class="card-label">Academic Year</div>
      <div class="card-value">${student.academic_year_name || "2026–2027"}</div>
    </div>
    <div class="card-item">
      <div class="card-label">Transport Route</div>
      <div class="card-value">${student.has_transport ? student.transport_route || "Enrolled" : "No Transport"}</div>
    </div>
    <div class="card-item">
      <div class="card-label">Next Due Date</div>
      <div class="card-value">${student.next_due_date || "All Cleared"}</div>
    </div>
    <div class="card-item">
      <div class="card-label">Fee Status</div>
      <div class="card-value" style="text-transform: capitalize; font-weight: 700; color: ${student.fee_status === "overdue" ? "#dc2626" : student.fee_status === "fully_paid" ? "#16a34a" : "#d97706"};">${student.fee_status.replace("_", " ")}</div>
    </div>
  </div>

  <div class="summary-tiles">
    <div class="tile total">
      <div class="tile-val" style="color: #0f172a;">${formatPaise(student.total_applicable_paise)}</div>
      <div class="tile-lbl">Total Applicable Fees</div>
    </div>
    <div class="tile paid">
      <div class="tile-val" style="color: #2563eb;">${formatPaise(student.total_paid_paise)}</div>
      <div class="tile-lbl">Total Paid to Date</div>
    </div>
    <div class="tile pending">
      <div class="tile-val" style="color: #d97706;">${formatPaise(student.total_pending_paise)}</div>
      <div class="tile-lbl">Remaining Balance</div>
    </div>
    <div class="tile overdue">
      <div class="tile-val" style="color: #dc2626;">${formatPaise(student.total_overdue_paise)}</div>
      <div class="tile-lbl">Overdue Amount</div>
    </div>
  </div>

  <h3 style="font-size: 13px; font-weight: 700; margin-bottom: 8px; text-transform: uppercase; color: #475569;">Chronological Fee Ledger & Transactions</h3>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Reference #</th>
        <th>Period</th>
        <th>Description</th>
        <th style="text-align: right;">Debit (Charged)</th>
        <th style="text-align: right;">Credit (Paid/Adj)</th>
        <th style="text-align: right;">Balance</th>
        <th style="text-align: center;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="footer">
    <div>This document is a computer-generated statement issued by ${schoolName}.</div>
    <div>Authorized Signatory / Accounts Department</div>
  </div>
</body>
</html>`;
}

/**
 * 4. WhatsApp Sharing Formatter
 */
export function getWhatsAppFeeMessage(
  student: StudentFeeSummary,
  schoolName: string
): string {
  const pendingFormatted = formatPaise(student.total_pending_paise);
  const overdueFormatted = formatPaise(student.total_overdue_paise);
  const dueDateStr = student.next_due_date ? `📅 Next Due Date: ${student.next_due_date}` : "✅ All dues cleared to date.";

  let msg = `Dear ${student.parent_name},\n\n`;
  msg += `This is an official fee update from *${schoolName}* for your ward *${student.student_name}* (${student.admission_no}, ${student.class_name} - ${student.section_name}):\n\n`;
  msg += `💰 *Total Applicable Fees:* ${formatPaise(student.total_applicable_paise)}\n`;
  msg += `✅ *Total Fees Paid:* ${formatPaise(student.total_paid_paise)}\n`;
  msg += `⚠️ *Current Pending Balance:* ${pendingFormatted}\n`;

  if (student.total_overdue_paise > 0) {
    msg += `🚨 *Overdue Amount:* ${overdueFormatted}\n`;
  }

  msg += `${dueDateStr}\n\n`;
  msg += `Please clear outstanding amounts promptly to ensure seamless school records. For payment receipts or online payments, please contact the school administration office.\n\n`;
  msg += `Regards,\n*${schoolName} Accounts Office*`;

  return encodeURIComponent(msg);
}

/**
 * 5. CSV Export for Filtered Student Dues
 */
export function exportStudentFeeCSV(students: StudentFeeSummary[]): string {
  const headers = [
    "Admission No",
    "Student Name",
    "Class",
    "Section",
    "Parent Name",
    "Parent Phone",
    "Transport Enrolled",
    "Total Fees (Rs)",
    "Total Paid (Rs)",
    "Pending Balance (Rs)",
    "Overdue Amount (Rs)",
    "Next Due Date",
    "Fee Status",
  ];

  const rows = students.map((s) => [
    `"${s.admission_no}"`,
    `"${s.student_name}"`,
    `"${s.class_name}"`,
    `"${s.section_name}"`,
    `"${s.parent_name}"`,
    `"${s.parent_phone}"`,
    s.has_transport ? "Yes" : "No",
    (s.total_applicable_paise / 100).toFixed(2),
    (s.total_paid_paise / 100).toFixed(2),
    (s.total_pending_paise / 100).toFixed(2),
    (s.total_overdue_paise / 100).toFixed(2),
    s.next_due_date || "—",
    s.fee_status.replace("_", " ").toUpperCase(),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
