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
import { getLedger } from "./feeDuesService";
import type {
  StudentFeeSummary,
  StudentFeeSummaryMetrics,
  StudentFeeFilterOptions,
  StudentFeeListResponse,
  StudentLedgerDetails,
  LedgerTransactionItem,
  FeeObligationBreakdownItem,
  StudentFeeStatus,
} from "../types/studentFeeLedger";
import type { StudentInvoice, StudentDue, FeeTerm, FeeHead, InvoiceStatus, InvoiceLineItem } from "../types/fees";
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
  let feeCredits: any[] = [];
  let feeStructures: any[] = [];
  let feeAssignments: any[] = [];

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
        creditsRes,
        structuresRes,
        assignmentsRes,
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
        supabase.from("academic_years").select("id, label, is_current").eq("school_id", schoolId),
        supabase.from("fee_credits").select("*").eq("school_id", schoolId),
        supabase.from("fee_structures").select("id, name, class_id, academic_year_id, status, version").eq("school_id", schoolId),
        supabase.from("student_fee_assignments").select("id, student_id, structure_id, structure_version, academic_year_id").eq("school_id", schoolId),
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
      feeCredits = creditsRes.data || [];
      feeStructures = structuresRes.data || [];
      feeAssignments = assignmentsRes.data || [];
      academicYears = (yearsRes.data || []).map((y: any) => ({
        id: y.id,
        name: y.label || y.name || "Academic Year",
        label: y.label || y.name || "Academic Year",
        is_current: Boolean(y.is_current),
      }));
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
    feeStructures = lsGet<any>(`myzkool_fee_structures_${schoolId}`);
    feeAssignments = lsGet<any>(`myzkool_student_fee_assignments_${schoolId}`);
    enrollments = lsGet<any>(`myzkool_student_enrollments_${schoolId}`);
    feeCredits = lsGet<any>(`myzkool_fee_credits_${schoolId}`);
    const cachedYears = lsGet<any>(`myzkool_academic_years_${schoolId}`);
    academicYears = cachedYears.map((y: any) => ({
      id: y.id,
      name: y.label || y.name || "Academic Year",
      label: y.label || y.name || "Academic Year",
      is_current: Boolean(y.is_current),
    }));
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
  if (feeCredits.length === 0) {
    feeCredits = lsGet<any>(`myzkool_fee_credits_${schoolId}`);
  }
  const creditsMap = new Map<string, number>();
  for (const c of feeCredits) {
    if (c.remaining_paise && c.remaining_paise > 0) {
      creditsMap.set(c.student_id, (creditsMap.get(c.student_id) || 0) + Number(c.remaining_paise));
    }
  }

  // Determine active academic year
  const currentYear = academicYears.find((y) => y.is_current) || academicYears[0];
  const activeYearId = filters.academic_year_id || currentYear?.id || "2026-2027";
  const activeYearName = currentYear?.name || currentYear?.label || "2026–2027";

  // Active fee structures for the year
  const activeStructures = feeStructures.filter(
    (s: any) =>
      s.status === "active" &&
      (!activeYearId || !s.academic_year_id || s.academic_year_id === activeYearId)
  );
  const structureMap = new Map<string, any>(activeStructures.map((s: any) => [s.id, s]));
  const assignmentMap = new Map<string, any>(
    feeAssignments.map((a: any) => [`${a.student_id}_${a.academic_year_id}`, a])
  );

  // Group dues by student_id
  const studentDuesMap = new Map<string, StudentDue[]>();
  for (const d of dues) {
    if (d.status === "cancelled" || d.status === "waived") continue; // Exclude cancelled/waived obligations
    if (activeYearId && d.academic_year_id && d.academic_year_id !== activeYearId) {
      continue;
    }
    if (!studentDuesMap.has(d.student_id)) studentDuesMap.set(d.student_id, []);
    studentDuesMap.get(d.student_id)!.push(d);
  }

  const schoolHasEnrollments = enrollments.length > 0;
  // Enrollment map for class/section strictly for active academic year
  const enrollMap = new Map<string, any>();
  for (const en of enrollments) {
    if (activeYearId && en.academic_year_id && en.academic_year_id !== activeYearId) continue;
    if (en.status && en.status !== "active" && en.status !== "enrolled") continue;
    enrollMap.set(en.student_id, en);
  }

  let summaries: StudentFeeSummary[] = [];

  // Build summaries from real records if available
  if (students.length > 0) {
    for (const student of students) {
      const studentDues = studentDuesMap.get(student.id) || [];
      const enrollment = enrollMap.get(student.id);

      // If scoped to an academic year and school has enrollment records, only include students actively enrolled in this year OR with dues in this year
      if (schoolHasEnrollments && activeYearId && !enrollment && studentDues.length === 0) {
        continue;
      }

      const classId = enrollment?.class_id || student.admission_class_id || student.class_id;
      const sectionId = enrollment?.section_id || student.section_id;
      const className = classMap.get(classId)?.name || student.class_name || "Class 11";
      const sectionName = sectionMap.get(sectionId)?.name || student.section_name || "Section A";

      // Applicable Fee Structure lookup
      let applicableStructureName = "No Fee Structure";
      let hasFeeStructure = false;

      const studentAssignment = assignmentMap.get(`${student.id}_${activeYearId}`);
      if (studentAssignment && studentAssignment.status !== "replaced" && studentAssignment.status !== "inactive") {
        const st = structureMap.get(studentAssignment.structure_id);
        if (st?.name && st.status === "active") {
          applicableStructureName = st.name;
          hasFeeStructure = true;
        }
      }

      if (!hasFeeStructure && classId) {
        const activeClassStructure = activeStructures.find(
          (s: any) =>
            (s.class_id === classId || s.class_ids?.includes(classId)) &&
            (!s.academic_year_id || s.academic_year_id === activeYearId)
        );
        if (activeClassStructure?.name) {
          applicableStructureName = activeClassStructure.name;
          hasFeeStructure = true;
        }
      }

      // Transport
      const tInfo = transportMap.get(student.id);
      const hasTransport = !!tInfo;
      const hasTransportDues = studentDues.some((d) => d.source === "transport");
      const isTransportOnly = !hasFeeStructure && (hasTransport || hasTransportDues);

      if (!hasFeeStructure) {
        applicableStructureName = isTransportOnly ? "Transport Only" : "No Fee Structure";
      }

      // Guardian details
      const sps = spMap.get(student.id) || [];
      const primarySp = sps.find((s) => s.is_primary_contact) || sps[0];
      const pRecord = primarySp ? parentMap.get(primarySp.parent_id) : null;
      const parentName = pRecord?.full_name || student.guardian_name || `${student.last_name || "Parent"}`;
      const parentPhone = pRecord?.phone || student.contact_phone || "9876543210";
      const parentRelation = primarySp?.relation || "Father";

      // Financial calculations (Rule 3, 8 & 9)
      let totalGross = 0;
      let totalConcession = 0;
      let totalApplicable = 0;
      let totalPaid = 0;
      let totalPending = 0;
      let totalOverdue = 0;
      let earliestUnpaidDue: string | null = null;
      let earliestOverdueDate: string | null = null;

      for (const d of studentDues) {
        const gross = Number(d.gross_paise || (d.net_paise + d.concession_paise) || 0);
        const concession = Number(d.concession_paise || 0);
        const net = Number(d.net_paise !== undefined ? d.net_paise : Math.max(0, gross - concession));
        const paid = Number(d.paid_paise || 0);
        const balance = Math.max(0, net - paid);

        totalGross += gross;
        totalConcession += concession;
        totalApplicable += net;
        totalPaid += paid;
        totalPending += balance;

        if (balance > 0) {
          // Rule 9: If due date has passed (< today in IST), it is OVERDUE
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

      const advanceCredit = creditsMap.get(student.id) || 0;
      const netPending = Math.max(0, totalPending - advanceCredit);
      const netOverdue = Math.max(0, totalOverdue - advanceCredit);

      // Determine accurate fee status (Rule 8 & 9)
      let feeStatus: StudentFeeStatus = "no_dues";
      if (totalGross === 0 && totalApplicable === 0) {
        feeStatus = "no_dues";
      } else if (totalPending === 0 || netPending === 0) {
        // Rule 8: Fully paid students show zero outstanding
        feeStatus = "fully_paid";
      } else if (netOverdue > 0) {
        feeStatus = "overdue";
      } else if (totalPaid > 0) {
        feeStatus = "partially_paid";
      } else if (earliestUnpaidDue && earliestUnpaidDue >= todayStr) {
        // Rule 9: Future unpaid invoices are strictly NOT overdue
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
        applicable_fee_structure_name: applicableStructureName,
        parent_name: parentName,
        parent_phone: parentPhone,
        parent_relation: parentRelation,
        has_transport: hasTransport,
        transport_route: hasTransport ? "Route A" : undefined,
        total_billed_paise: totalGross,
        total_applicable_paise: totalApplicable,
        total_concession_paise: totalConcession,
        total_paid_paise: totalPaid,
        total_pending_paise: totalPending,
        total_overdue_paise: netOverdue,
        advance_credit_paise: advanceCredit,
        net_pending_paise: netPending,
        next_due_date: earliestUnpaidDue,
        overdue_days: overdueDays,
        fee_status: feeStatus,
        total_invoices_count: studentDues.length,
        unpaid_invoices_count: studentDues.filter((d) => (d.net_paise - d.paid_paise) > 0).length,
        has_fee_structure: hasFeeStructure,
        is_transport_only: isTransportOnly,
      });
    }
  }

  // Compute calculated metrics strictly from real student summaries
  let totalGrossPaise = 0;
  let totalConcessionsPaise = 0;
  let totalFeesPaise = 0;
  let totalPaidPaise = 0;
  let totalPendingPaise = 0;
  let netPendingPaise = 0;
  let totalOverduePaise = 0;
  let fullyPaidCount = 0;
  let withDuesCount = 0;
  let partiallyPaidCount = 0;
  let upcomingCount = 0;
  let overdueCount = 0;
  let structureAssignedCount = 0;
  let studentsWithInvoicesCount = 0;
  let transportOnlyCount = 0;
  let totalStudentsWithRecords = 0;

  for (const s of summaries) {
    totalGrossPaise += s.total_billed_paise || 0;
    totalConcessionsPaise += s.total_concession_paise || 0;
    totalFeesPaise += s.total_applicable_paise;
    totalPaidPaise += s.total_paid_paise;
    totalPendingPaise += s.total_pending_paise;
    netPendingPaise += s.net_pending_paise;
    totalOverduePaise += s.total_overdue_paise;

    if (s.has_fee_structure) structureAssignedCount++;
    if (s.is_transport_only) transportOnlyCount++;
    if (s.total_invoices_count > 0 || (s.total_billed_paise || 0) > 0) {
      studentsWithInvoicesCount++;
    }
    totalStudentsWithRecords++;

    if (s.fee_status === "fully_paid") fullyPaidCount++;
    if (s.net_pending_paise > 0) withDuesCount++;
    if (s.fee_status === "partially_paid") partiallyPaidCount++;
    if (s.fee_status === "upcoming") upcomingCount++;
    if (s.fee_status === "overdue") overdueCount++;
  }

  // Calculate distinct actively enrolled students for the selected academic year
  const enrolledStudentIdSet = new Set<string>();
  for (const en of enrollments) {
    if (activeYearId && en.academic_year_id && en.academic_year_id !== activeYearId) continue;
    if (en.status && en.status !== "active" && en.status !== "enrolled") continue;
    if (en.student_id) enrolledStudentIdSet.add(en.student_id);
  }
  const totalEnrolled = schoolHasEnrollments ? enrolledStudentIdSet.size : summaries.length;

  const colPct = totalFeesPaise > 0 ? (totalPaidPaise / totalFeesPaise) * 100 : 0;
  const penPct = totalFeesPaise > 0 ? (netPendingPaise / totalFeesPaise) * 100 : 0;
  const ovrPct = totalFeesPaise > 0 ? (totalOverduePaise / totalFeesPaise) * 100 : 0;
  const fulPct = totalEnrolled > 0 ? (fullyPaidCount / totalEnrolled) * 100 : 0;
  const duePct = totalEnrolled > 0 ? (withDuesCount / totalEnrolled) * 100 : 0;

  const totalAdvanceCreditsPaise = Array.from(creditsMap.values()).reduce((sum, c) => sum + c, 0);

  const finalMetrics: StudentFeeSummaryMetrics = {
    total_students_with_records: totalStudentsWithRecords,
    total_enrolled_count: totalEnrolled,
    structure_assigned_count: structureAssignedCount,
    students_with_invoices_count: studentsWithInvoicesCount,
    transport_only_count: transportOnlyCount,
    total_gross_paise: totalGrossPaise,
    total_concessions_paise: totalConcessionsPaise,
    total_fees_paise: totalFeesPaise,
    total_collected_paise: totalPaidPaise,
    total_pending_paise: totalPendingPaise,
    total_advance_credit_paise: totalAdvanceCreditsPaise,
    net_pending_paise: netPendingPaise,
    total_overdue_paise: totalOverduePaise,
    fully_paid_count: fullyPaidCount,
    with_dues_count: withDuesCount,
    partially_paid_count: partiallyPaidCount,
    upcoming_count: upcomingCount,
    overdue_count: overdueCount,
    total_students_count: totalEnrolled,
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
    if (filters.quick_pill === "structure_assigned") {
      filtered = filtered.filter((s) => s.has_fee_structure);
    } else if (filters.quick_pill === "with_invoices") {
      filtered = filtered.filter((s) => s.total_invoices_count > 0 || (s.total_billed_paise || 0) > 0);
    } else if (filters.quick_pill === "with_dues") {
      filtered = filtered.filter((s) => s.total_pending_paise > 0);
    } else if (filters.quick_pill === "overdue") {
      filtered = filtered.filter((s) => s.fee_status === "overdue" || s.total_overdue_paise > 0);
    } else if (filters.quick_pill === "fully_paid") {
      filtered = filtered.filter((s) => s.fee_status === "fully_paid" || s.total_pending_paise === 0);
    } else if (filters.quick_pill === "partially_paid") {
      filtered = filtered.filter((s) => s.fee_status === "partially_paid");
    } else if (filters.quick_pill === "upcoming") {
      filtered = filtered.filter((s) => s.fee_status === "upcoming");
    } else if (filters.quick_pill === "transport_only") {
      filtered = filtered.filter((s) => s.is_transport_only);
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

  // Fetch dues, receipts, and advance credits for this student
  let dues: StudentDue[] = [];
  let receipts: FeeReceipt[] = [];
  let studentCredits: any[] = [];
  const paymentDetailsMap = new Map<string, any>();

  if (isSupabaseConfigured) {
    try {
      const [duesRes, headsRes, termsRes, yearsRes, receiptsRes, paymentsRes, creditsRes] = await Promise.all([
        supabase
          .from("student_dues")
          .select("*")
          .eq("school_id", schoolId)
          .eq("student_id", studentId)
          .order("due_date"),
        supabase
          .from("fee_heads")
          .select("id, name, code, kind, rte_waivable")
          .eq("school_id", schoolId),
        supabase
          .from("fee_terms")
          .select("id, name, period_start, period_end, due_date")
          .eq("school_id", schoolId),
        supabase
          .from("academic_years")
          .select("id, label, is_current")
          .eq("school_id", schoolId),
        supabase
          .from("fee_receipts")
          .select("*, fee_receipt_items(*)")
          .eq("school_id", schoolId)
          .eq("student_id", studentId)
          .order("receipt_date"),
        supabase
          .from("fee_payments")
          .select("*")
          .eq("school_id", schoolId),
        supabase
          .from("fee_credits")
          .select("*")
          .eq("school_id", schoolId)
          .eq("student_id", studentId),
      ]);

      const rawDues = (duesRes.data || []) as StudentDue[];
      const heads = headsRes.data || [];
      const terms = termsRes.data || [];
      const years = yearsRes.data || [];

      const headMap = new Map<string, any>(heads.map((h: any) => [h.id, h]));
      const termMap = new Map<string, any>(terms.map((t: any) => [t.id, t]));
      const yearMap = new Map<string, any>(years.map((y: any) => [y.id, y]));

      dues = rawDues.map((d: any) => ({
        ...d,
        fee_heads: headMap.get(d.fee_head_id) || {},
        fee_terms: termMap.get(d.term_id) || {},
        academic_years: yearMap.get(d.academic_year_id) || {},
      }));

      receipts = (receiptsRes.data || []) as FeeReceipt[];
      studentCredits = (creditsRes.data || []) as any[];
      const payments = (paymentsRes.data || []) as any[];
      for (const p of payments) {
        if (p.receipt_id) paymentDetailsMap.set(p.receipt_id, p);
      }
    } catch (e) {
      console.warn("Error fetching ledger dues:", e);
    }
  }

  if (dues.length === 0) {
    const rawDues = lsGet<StudentDue>(LEDGER_DUES_KEY(schoolId)).filter((d) => d.student_id === studentId);
    const cachedHeads = lsGet<any>(`myzkool_fee_heads_${schoolId}`);
    const cachedTerms = lsGet<any>(`myzkool_fee_terms_${schoolId}`);
    const cachedYears = lsGet<any>(`myzkool_academic_years_${schoolId}`);
    const headMap = new Map<string, any>(cachedHeads.map((h: any) => [h.id, h]));
    const termMap = new Map<string, any>(cachedTerms.map((t: any) => [t.id, t]));
    const yearMap = new Map<string, any>(cachedYears.map((y: any) => [y.id, y]));
    dues = rawDues.map((d: any) => ({
      ...d,
      fee_heads: headMap.get(d.fee_head_id) || {},
      fee_terms: termMap.get(d.term_id) || {},
      academic_years: yearMap.get(d.academic_year_id) || {},
    }));
    receipts = lsGet<FeeReceipt>(LEDGER_RECEIPTS_KEY(schoolId)).filter((r) => r.student_id === studentId);
    studentCredits = lsGet<any>(`myzkool_fee_credits_${schoolId}`).filter((c) => c.student_id === studentId);
  }

  const advanceCreditPaise = studentCredits.reduce((s: number, c: any) => s + Number(c.remaining_paise || 0), 0);

  // Lookup maps for fast, canonical resolution
  const dueMap = new Map<string, any>();
  for (const d of dues) {
    dueMap.set(d.id, d);
  }

  const receiptMap = new Map<string, FeeReceipt>();
  for (const r of receipts) {
    receiptMap.set(r.id, r);
  }

  // Payment allocations mapping
  const paymentAllocationsByDue = new Map<string, Array<{ receipt_no: string; receipt_date: string; amount_paise: number; payment_mode?: string }>>();
  const allocationsByReceipt = new Map<string, Array<{ due_id: string; due_description: string; amount_paise: number; billing_period: string }>>();

  for (const r of receipts) {
    const items = (r as any).fee_receipt_items || [];
    const pmt = paymentDetailsMap.get(r.id);
    const mode = (pmt?.mode || (r as any).payment_mode || (r.source === "online" ? "Online" : "Cash")).toUpperCase();

    for (const it of items) {
      if (it.due_id) {
        if (!paymentAllocationsByDue.has(it.due_id)) {
          paymentAllocationsByDue.set(it.due_id, []);
        }
        paymentAllocationsByDue.get(it.due_id)!.push({
          receipt_no: r.receipt_no,
          receipt_date: r.receipt_date,
          amount_paise: Number(it.amount_paise || 0),
          payment_mode: mode,
        });

        const linkedDue = dueMap.get(it.due_id);
        const hName = linkedDue?.fee_heads?.name || "Fee Obligation";
        const tName = linkedDue?.fee_terms?.name || "";
        const desc = tName ? `${tName} ${hName}` : hName;
        const period = tName || linkedDue?.academic_years?.label || "2026–2027";

        if (!allocationsByReceipt.has(r.id)) {
          allocationsByReceipt.set(r.id, []);
        }
        allocationsByReceipt.get(r.id)!.push({
          due_id: it.due_id,
          due_description: desc,
          amount_paise: Number(it.amount_paise || 0),
          billing_period: period,
        });
      }
    }
  }

  // Build fee-wise pending and overdue breakdown
  const feeBreakdown: FeeObligationBreakdownItem[] = dues
    .filter((d) => d.status !== "cancelled")
    .map((d) => {
      const head = (d as any).fee_heads || {};
      const term = (d as any).fee_terms || {};
      const headName = head.name || (d as any).fee_head_name || "Tuition Fee";
      const termName = term.name || (d as any).term_name || "";
      const headKind = head.kind || "";
      const yearLabel = (d as any).academic_years?.label || effectiveStudent.academic_year_name || "2026–2027";
      const isTransport = d.source === "transport" || head.code === "transport_fee" || headName.toLowerCase().includes("transport");
      const isRte = Boolean(head.rte_waivable || d.status === "waived");

      let desc = "";
      if (isTransport) {
        desc = termName ? `${termName} Transport Fee` : "Transport Fee";
      } else if (headKind === "one_time" || (!termName && headName)) {
        desc = `${headName} ${yearLabel}`;
      } else if (termName && headName) {
        desc = `${termName} ${headName}`;
      } else {
        desc = headName;
      }

      let category = "Fee";
      if (isTransport) category = "Transport";
      else if (headName.toLowerCase().includes("tuition")) category = "Tuition";
      else if (headName.toLowerCase().includes("exam")) category = "Exam";
      else if (headName.toLowerCase().includes("admission")) category = "Admission";
      else if (headName.toLowerCase().includes("development")) category = "Development";
      else if (headName.toLowerCase().includes("annual")) category = "Annual";

      const isOverdue = Boolean(d.due_date && d.due_date < todayStr && d.balance_paise > 0);
      let statusLabel: 'Paid' | 'Unpaid' | 'Partial' | 'Overdue' | 'Waived' = "Unpaid";
      if (d.balance_paise === 0) {
        statusLabel = (d.concession_paise > 0 && d.paid_paise === 0) ? "Waived" : "Paid";
      } else if (isOverdue) {
        statusLabel = "Overdue";
      } else if (d.paid_paise > 0) {
        statusLabel = "Partial";
      } else {
        statusLabel = "Unpaid";
      }

      return {
        id: d.id,
        description: desc,
        category,
        billing_period: termName || yearLabel,
        academic_year: yearLabel,
        original_amount_paise: d.gross_paise,
        paid_paise: d.paid_paise,
        waived_paise: d.concession_paise,
        pending_paise: d.balance_paise,
        due_date: d.due_date,
        status: statusLabel,
        allocations: paymentAllocationsByDue.get(d.id) || [],
      };
    });

  feeBreakdown.sort((a, b) => {
    if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
    return a.description.localeCompare(b.description);
  });

  // Helper: Canonical resolution of transaction item metadata from verified business records
  const resolveLedgerTransaction = (
    e: any,
    idx: number
  ): LedgerTransactionItem & { effectiveDate: string } => {
    const isDebit = e.amount_paise > 0;
    const debitPaise = isDebit ? e.amount_paise : 0;
    const creditPaise = isDebit ? 0 : Math.abs(e.amount_paise);

    let txType: LedgerTransactionItem["type"] = "charge";
    if (e.entry_type === "due_created") txType = "charge";
    else if (e.entry_type === "concession") txType = "concession";
    else if (e.entry_type === "waiver") txType = "waiver";
    else if (e.entry_type === "payment") txType = "payment";
    else if (e.entry_type === "refund") txType = "refund";
    else txType = "adjustment";

    const isPayment = txType === "payment";
    const isConcession = txType === "concession" || txType === "waiver";

    let description = "";
    let period = "";
    let billingPeriod = "";
    let category = "Fee";
    let paymentStatus: LedgerTransactionItem["payment_status"] = isPayment
      ? "Received"
      : isConcession
      ? "Waived"
      : "Paid";
    let refNo = "";
    let dueDate: string | undefined = undefined;
    let effectiveDate = e.created_at ? e.created_at.split("T")[0] : todayStr;
    let isUnclassified = false;
    const auditRef = e.due_id
      ? `DUE-${e.due_id.slice(0, 8)}`
      : e.receipt_id
      ? `RCPT-${e.receipt_id.slice(0, 8)}`
      : `LED-${(e.id || "").slice(0, 8)}`;

    if (e.due_id && dueMap.has(e.due_id)) {
      const d = dueMap.get(e.due_id);
      const head = d.fee_heads || {};
      const term = d.fee_terms || {};
      const headName = head.name || d.fee_head_name || "";
      const termName = term.name || d.term_name || "";
      const headKind = head.kind || "";
      const yearLabel = d.academic_years?.label || effectiveStudent.academic_year_name || "2026–2027";
      const isTransport =
        d.source === "transport" ||
        head.code === "transport_fee" ||
        headName.toLowerCase().includes("transport");
      const isRte = Boolean(head.rte_waivable || (e.note && e.note.includes("RTE")));
      const isOverdue = Boolean(d.due_date && d.due_date < todayStr && d.balance_paise > 0);

      dueDate = d.due_date || undefined;
      effectiveDate = d.due_date || effectiveDate;

      // Category derivation
      if (isTransport) category = "Transport";
      else if (isConcession) category = "Concession";
      else if (headName.toLowerCase().includes("tuition")) category = "Tuition";
      else if (headName.toLowerCase().includes("exam")) category = "Exam";
      else if (headName.toLowerCase().includes("admission")) category = "Admission";
      else if (headName.toLowerCase().includes("development")) category = "Development";
      else if (headName.toLowerCase().includes("annual")) category = "Annual";
      else if (headName) category = headName;

      // Billing period identification
      if (termName) {
        period = termName;
        billingPeriod = termName;
      } else if (headKind === "one_time" || d.source === "structure") {
        period = yearLabel;
        billingPeriod = yearLabel;
      } else if (isTransport) {
        period = termName || "Transport Period";
        billingPeriod = termName || "Transport Period";
      } else {
        period = yearLabel;
        billingPeriod = yearLabel;
      }

      // Human-readable description generation from verified business data
      if (txType === "charge") {
        if (isTransport) {
          description = termName ? `${termName} Transport Fee` : "Transport Fee";
        } else if (headKind === "one_time" || (!termName && headName)) {
          description = `${headName || "Fee Obligation"} ${yearLabel}`;
        } else if (termName && headName) {
          description = `${termName} ${headName}`;
        } else if (headName) {
          description = headName;
        } else {
          description = "Unclassified Historical Due";
          isUnclassified = true;
        }
      } else if (isConcession) {
        if (isRte) {
          description = `${termName ? termName + " " : ""}${headName || "Tuition Fee"} Waiver (100% RTE Concession)`;
        } else {
          description = `${termName ? termName + " " : ""}${headName || "Fee"} Concession / Waiver`;
        }
      } else if (txType === "adjustment") {
        if (isTransport) {
          description = `${termName ? termName + " " : ""}Transport Fee Adjustment`;
        } else if (headName) {
          description = `${termName ? termName + " " : ""}${headName} Adjustment`;
        } else {
          description = "Opening Balance Adjustment";
        }
      } else {
        description = headName || "Fee Obligation";
      }

      // Readable reference number
      if (d.invoice_no) {
        refNo = d.invoice_no;
      } else if (dueDate) {
        refNo = `INV-${dueDate.replace(/[^0-9]/g, "").slice(0, 6)}-${d.id.slice(0, 4)}`;
      } else {
        refNo = `DUE-${d.id.slice(0, 8)}`;
      }

      // Payment status
      if (isConcession) {
        paymentStatus = "Waived";
      } else if (d.balance_paise === 0) {
        paymentStatus = d.status === "waived" ? "Waived" : "Paid";
      } else if (isOverdue) {
        paymentStatus = "Overdue";
      } else if (d.paid_paise > 0) {
        paymentStatus = "Partial";
      } else {
        paymentStatus = "Unpaid";
      }
    } else if (e.receipt_id && receiptMap.has(e.receipt_id)) {
      const rcpt = receiptMap.get(e.receipt_id)!;
      effectiveDate = rcpt.receipt_date || effectiveDate;
      refNo = rcpt.receipt_no || `RCPT-${e.receipt_id.slice(0, 8)}`;
      category = "Payment";
      paymentStatus = "Received";
      const pmt = paymentDetailsMap.get(e.receipt_id);
      const modeStr = (pmt?.mode || (rcpt as any)?.payment_mode || rcpt?.source || "Cash").toUpperCase();
      const allocs = allocationsByReceipt.get(e.receipt_id) || [];
      if (allocs.length > 0) {
        description = `Fee Payment (${modeStr}): ${allocs.map((a) => `${a.due_description} (${formatPaise(a.amount_paise)})`).join(", ")}`;
        period = allocs.map((a) => a.billing_period).filter(Boolean).join(", ");
        billingPeriod = period;
      } else {
        description = `Fee Payment Received (${modeStr}) — Unallocated Payment/Credit`;
        period = "Payment Receipt";
        billingPeriod = "Unallocated Payment/Credit";
      }
    } else {
      // Unlinked legacy or direct adjustment
      refNo = `LED-${(e.id || "").slice(0, 8)}`;
      const noteLower = (e.note || "").toLowerCase();
      if (noteLower.includes("opening")) {
        description = "Opening Balance Adjustment";
        period = "Opening Balance";
        billingPeriod = "Opening Balance";
        category = "Adjustment";
      } else if (noteLower.includes("previous")) {
        description = "Previous Outstanding Balance";
        period = "Previous Session";
        billingPeriod = "Previous Session";
        category = "Adjustment";
      } else if (noteLower.includes("transport")) {
        description = "Transport Fee Adjustment";
        period = "Transport Period";
        billingPeriod = "Transport Adjustment";
        category = "Transport";
      } else {
        description = "Unclassified Historical Due";
        period = "Legacy Record";
        billingPeriod = "Unclassified";
        category = "Legacy";
        isUnclassified = true;
      }
    }

    return {
      id: e.id || `tx-${idx + 1}`,
      date: effectiveDate,
      effectiveDate,
      ref_no: refNo,
      period,
      billing_period: billingPeriod,
      type: txType,
      description,
      category,
      debit_paise: debitPaise,
      credit_paise: creditPaise,
      running_balance_paise: 0,
      due_date: dueDate,
      payment_status: paymentStatus,
      receipt_id: e.receipt_id || undefined,
      raw_due_id: e.due_id || undefined,
      internal_note: e.note || undefined,
      audit_ref: auditRef,
      is_unclassified: isUnclassified,
      academic_year: effectiveStudent.academic_year_name,
      allocations: e.receipt_id ? allocationsByReceipt.get(e.receipt_id) : undefined,
    };
  };

  // Authentic ledger transactions strictly from database fee_ledger or fallback dues/receipts
  const { entries: dbLedgerEntries } = await getLedger(schoolId, studentId, academicYearId);

  let transactions: LedgerTransactionItem[] = [];

  if (dbLedgerEntries && dbLedgerEntries.length > 0) {
    const resolvedItems = dbLedgerEntries.map((e, idx) =>
      resolveLedgerTransaction(e, idx)
    );

    // Deterministic chronological ordering:
    // 1. Effective business date (due date or receipt date)
    // 2. Charges (debit) strictly precede concessions/waivers (credit) for the same due obligation
    // 3. Stable grouping by due_id
    // 4. Stable secondary key: entry id
    resolvedItems.sort((a, b) => {
      if (a.effectiveDate !== b.effectiveDate) {
        return a.effectiveDate.localeCompare(b.effectiveDate);
      }
      if (a.raw_due_id && b.raw_due_id && a.raw_due_id === b.raw_due_id) {
        const priority = (type: string, debit: number) => {
          if (debit > 0) return 1;
          if (type === "concession" || type === "waiver") return 2;
          if (type === "payment") return 3;
          if (type === "adjustment") return 4;
          return 5;
        };
        const pDiff = priority(a.type, a.debit_paise) - priority(b.type, b.debit_paise);
        if (pDiff !== 0) return pDiff;
      }
      if (a.raw_due_id && b.raw_due_id && a.raw_due_id !== b.raw_due_id) {
        return a.raw_due_id.localeCompare(b.raw_due_id);
      }
      if (a.debit_paise > 0 && b.credit_paise > 0) return -1;
      if (a.credit_paise > 0 && b.debit_paise > 0) return 1;
      return a.id.localeCompare(b.id);
    });

    let runningBalance = 0;
    transactions = resolvedItems.map((item) => {
      runningBalance += item.debit_paise - item.credit_paise;
      return {
        ...item,
        running_balance_paise: runningBalance,
      };
    });
  } else {
    // Fallback: Construct transactions from dues and receipts if fee_ledger has not been populated
    const fallbackItems: Array<LedgerTransactionItem & { effectiveDate: string }> = [];

    for (const d of dues) {
      if (d.status === "cancelled") continue;
      const head = (d as any).fee_heads || {};
      const term = (d as any).fee_terms || {};
      const headName = head.name || (d as any).fee_head_name || "Tuition Fee";
      const termName = term.name || (d as any).term_name || "";
      const headKind = head.kind || "";
      const yearLabel = (d as any).academic_years?.label || effectiveStudent.academic_year_name || "2026–2027";
      const isTransport = d.source === "transport" || headName.toLowerCase().includes("transport");
      const isRte = Boolean(head.rte_waivable || d.status === "waived");
      const isOverdue = d.due_date < todayStr && d.balance_paise > 0;
      const statusLabel = d.balance_paise === 0 ? (d.status === "waived" ? "Waived" : "Paid") : isOverdue ? "Overdue" : d.paid_paise > 0 ? "Partial" : "Unpaid";

      let chargeDesc = "";
      if (isTransport) {
        chargeDesc = termName ? `${termName} Transport Fee` : "Transport Fee";
      } else if (headKind === "one_time") {
        chargeDesc = `${headName} ${yearLabel}`;
      } else if (termName) {
        chargeDesc = `${termName} ${headName}`;
      } else {
        chargeDesc = headName;
      }

      fallbackItems.push({
        id: `tx-due-${d.id}`,
        date: d.due_date || (d.created_at ? d.created_at.split("T")[0] : todayStr),
        effectiveDate: d.due_date || todayStr,
        ref_no: d.invoice_no || `INV-${d.due_date.replace(/[^0-9]/g, "").slice(0, 6)}-${d.id.slice(0, 4)}`,
        period: termName || yearLabel,
        billing_period: termName || yearLabel,
        type: "charge",
        description: chargeDesc,
        category: isTransport ? "Transport" : headName.includes("Exam") ? "Exam" : "Tuition",
        debit_paise: d.gross_paise,
        credit_paise: 0,
        running_balance_paise: 0,
        due_date: d.due_date,
        payment_status: statusLabel,
        raw_due_id: d.id,
        audit_ref: `DUE-${d.id.slice(0, 8)}`,
      });

      if (d.concession_paise > 0) {
        fallbackItems.push({
          id: `tx-conc-${d.id}`,
          date: d.due_date || (d.created_at ? d.created_at.split("T")[0] : todayStr),
          effectiveDate: d.due_date || todayStr,
          ref_no: `CON-${d.id.slice(0, 4)}`,
          period: termName || yearLabel,
          billing_period: termName || yearLabel,
          type: "concession",
          description: isRte
            ? `${termName ? termName + " " : ""}${headName} Waiver (100% RTE Concession)`
            : `${termName ? termName + " " : ""}${headName} Concession / Waiver`,
          category: "Concession",
          debit_paise: 0,
          credit_paise: d.concession_paise,
          running_balance_paise: 0,
          due_date: d.due_date,
          payment_status: "Waived",
          raw_due_id: d.id,
          audit_ref: `DUE-${d.id.slice(0, 8)}`,
        });
      }
    }

    for (const r of receipts) {
      if (r.status === "cancelled") continue;
      fallbackItems.push({
        id: `tx-rcpt-${r.id}`,
        date: r.receipt_date,
        effectiveDate: r.receipt_date,
        ref_no: r.receipt_no,
        period: "Payment Receipt",
        billing_period: "Payment Receipt",
        type: "payment",
        description: `Fee Payment Received (${((r as any).payment_mode || r.source || "Counter").toUpperCase()})`,
        category: "Payment",
        debit_paise: 0,
        credit_paise: r.total_paise,
        running_balance_paise: 0,
        payment_status: "Received",
        receipt_id: r.id,
        audit_ref: `RCPT-${r.id.slice(0, 8)}`,
      });
    }

    // Sort chronologically ascending to compute running balance accurately
    fallbackItems.sort((a, b) => {
      if (a.effectiveDate !== b.effectiveDate) {
        return a.effectiveDate.localeCompare(b.effectiveDate);
      }
      if (a.raw_due_id && b.raw_due_id && a.raw_due_id === b.raw_due_id) {
        if (a.debit_paise > 0 && b.credit_paise > 0) return -1;
        if (a.credit_paise > 0 && b.debit_paise > 0) return 1;
      }
      return a.id.localeCompare(b.id);
    });

    let runningBalance = 0;
    transactions = fallbackItems.map((tx) => {
      runningBalance += tx.debit_paise - tx.credit_paise;
      return {
        ...tx,
        running_balance_paise: runningBalance,
      };
    });
  }

  // Calculate ledger summary metrics
  const totalCharges = transactions
    .filter((t) => t.type === "charge" || (t.type === "adjustment" && t.debit_paise > 0))
    .reduce((acc, t) => acc + t.debit_paise, 0);
  const totalConcessions = transactions
    .filter((t) => t.type === "concession" || t.type === "waiver")
    .reduce((acc, t) => acc + t.credit_paise, 0);
  const totalPayments = transactions
    .filter((t) => t.type === "payment")
    .reduce((acc, t) => acc + t.credit_paise, 0);
  const totalCreditAdjustments = transactions
    .filter((t) => t.type === "adjustment" && t.credit_paise > 0)
    .reduce((acc, t) => acc + t.credit_paise, 0);

  // If transactions are derived from fee_ledger, running balance already accounts for advance payments.
  // Otherwise, fallback calculation subtracts advance credit exactly once.
  const isFromFeeLedger = Boolean(dbLedgerEntries && dbLedgerEntries.length > 0);
  const rawClosing = Math.max(0, totalCharges - (totalConcessions + totalPayments + totalCreditAdjustments));
  const closingBalance = isFromFeeLedger
    ? (transactions.length > 0 ? transactions[transactions.length - 1].running_balance_paise : rawClosing)
    : Math.max(0, rawClosing - advanceCreditPaise);
  const overdueBalance = effectiveStudent.total_overdue_paise || 0;

  // Invoices list for the student: query with student_id and sufficient pageSize to guarantee complete invoice history
  let studentInvoices: StudentInvoice[] = [];
  try {
    const invResp = await getSchoolInvoices(schoolId, {
      student_id: effectiveStudent.student_id,
      pageSize: 100,
    });
    studentInvoices = (invResp.invoices || []).filter(
      (inv) => inv.student_id === effectiveStudent.student_id
    );
  } catch (err) {
    console.warn("Failed to fetch student invoices in getStudentLedgerDetails:", err);
    studentInvoices = [];
  }

  // Robust Fallback: If no invoices were returned from getSchoolInvoices but student has valid dues,
  // compile term fee invoices directly from student dues so "Issued Term Fee Invoices" is never blank.
  if (studentInvoices.length === 0 && dues.length > 0) {
    const termGroups = new Map<string, StudentDue[]>();
    for (const d of dues) {
      if (d.status === "cancelled") continue;
      const termKey = d.term_id || "general";
      const arr = termGroups.get(termKey) || [];
      arr.push(d);
      termGroups.set(termKey, arr);
    }

    let seq = 1;
    for (const [termKey, dueList] of termGroups.entries()) {
      const grossPaise = dueList.reduce((s, d) => s + (d.gross_paise || (d.net_paise + (d.concession_paise || 0)) || 0), 0);
      const concessionPaise = dueList.reduce((s, d) => s + (d.concession_paise || 0), 0);
      const netPaise = dueList.reduce((s, d) => s + (d.net_paise !== undefined ? d.net_paise : Math.max(0, (d.gross_paise || 0) - (d.concession_paise || 0))), 0);
      const paidPaise = dueList.reduce((s, d) => s + (d.paid_paise || 0), 0);
      const balancePaise = Math.max(0, netPaise - paidPaise);

      const dueDates = dueList.map((d) => d.due_date).filter(Boolean).sort();
      const earliestDue = dueDates[0] || todayStr;
      const firstDue = dueList[0];
      const termObj = (firstDue as any).fee_terms || {};
      const termName = termObj.name || (firstDue as any).term_name || "Annual Term Fee";
      const invoiceNo = firstDue.invoice_no || `INV-2026-${String(seq).padStart(3, "0")}`;

      let invStatus: InvoiceStatus = "unpaid";
      if (balancePaise <= 0) {
        invStatus = "paid";
      } else if (earliestDue < todayStr) {
        invStatus = "overdue";
      } else if (paidPaise > 0) {
        invStatus = "partial";
      } else {
        invStatus = "unpaid";
      }

      studentInvoices.push({
        id: `inv_${studentId}_${termKey}`,
        invoice_no: invoiceNo,
        school_id: schoolId,
        academic_year_id: firstDue.academic_year_id || effectiveStudent.academic_year_id || "2026-2027",
        academic_year_name: effectiveStudent.academic_year_name || "2026–2027",
        student_id: studentId,
        student_name: effectiveStudent.student_name,
        admission_no: effectiveStudent.admission_no,
        roll_no: "-",
        class_id: effectiveStudent.class_id || "",
        class_name: effectiveStudent.class_name || "",
        section_id: effectiveStudent.section_id || "",
        section_name: effectiveStudent.section_name || "",
        guardian_name: effectiveStudent.parent_name || "Guardian",
        guardian_phone: effectiveStudent.parent_phone || "",
        term_id: termKey === "general" ? "" : termKey,
        billing_period: termName,
        invoice_date: firstDue.created_at?.split("T")[0] || todayStr,
        due_date: earliestDue,
        total_paise: netPaise,
        gross_paise: grossPaise,
        concession_paise: concessionPaise,
        late_fee_paise: 0,
        transport_paise: dueList.filter((d) => d.source === "transport").reduce((s, d) => s + (d.net_paise || 0), 0),
        tuition_paise: dueList.filter((d) => d.source !== "transport").reduce((s, d) => s + (d.net_paise || 0), 0),
        paid_paise: paidPaise,
        balance_paise: balancePaise,
        status: invStatus,
        line_items: dueList.map((d) => ({
          due_id: d.id,
          fee_head_id: d.fee_head_id,
          fee_head_name: (d as any).fee_heads?.name || (d as any).fee_head_name || "Fee Particular",
          source: d.source,
          gross_paise: d.gross_paise || (d.net_paise + (d.concession_paise || 0)) || 0,
          concession_paise: d.concession_paise || 0,
          net_paise: d.net_paise,
          paid_paise: d.paid_paise || 0,
          balance_paise: d.balance_paise || 0,
          due_date: d.due_date,
          status: d.status,
          is_transport: d.source === "transport",
        })),
        payments: [],
        created_at: firstDue.created_at || todayStr,
      });
      seq++;
    }
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
    allocations: allocationsByReceipt.get(r.id) || [],
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
      const head = (d as any).fee_heads || {};
      const term = (d as any).fee_terms || {};
      const headName = head.name || (d as any).fee_head_name || "Fee";
      const termName = term.name || (d as any).term_name || "";
      const isRte = Boolean(head.rte_waivable || d.status === "waived");
      concessionsList.push({
        id: `conc-${d.id}`,
        rule_name: isRte
          ? `${termName ? termName + " " : ""}${headName} (100% RTE Quota Waiver)`
          : `${termName ? termName + " " : ""}${headName} Concession`,
        basis: "standard",
        type: "fixed",
        value: d.concession_paise / 100,
        reason: isRte ? "Approved 100% RTE Government Concession" : "Applied Fee Concession",
        status: d.status || "active",
        applied_amount_paise: d.concession_paise,
      });
    }
  }

  // Transport details for student
  let transportDetails = undefined;
  const transDues = dues.filter((d) => d.source === "transport" || (d as any).fee_heads?.code === "transport_fee");
  if (effectiveStudent.has_transport || transDues.length > 0) {
    const totalTransBilled = transDues.reduce((s, d) => s + (d.gross_paise || d.net_paise), 0);
    const totalTransPaid = transDues.reduce((s, d) => s + (d.paid_paise || 0), 0);
    const totalTransPending = transDues.reduce((s, d) => s + (d.balance_paise || 0), 0);
    transportDetails = {
      has_transport: Boolean(effectiveStudent.has_transport),
      route_name: effectiveStudent.transport_route || (effectiveStudent.has_transport ? "Route A" : undefined),
      stop_name: effectiveStudent.transport_stop || (effectiveStudent.has_transport ? "Designated Stop" : undefined),
      monthly_fee_paise: transDues[0]?.gross_paise || 120000,
      total_billed_paise: totalTransBilled,
      total_paid_paise: totalTransPaid,
      total_pending_paise: totalTransPending,
    };
  } else {
    transportDetails = {
      has_transport: false,
    };
  }

  const advanceCreditsList = studentCredits.map((c: any) => ({
    id: c.id,
    amount_paise: Number(c.amount_paise || 0),
    remaining_paise: Number(c.remaining_paise || 0),
    receipt_no: c.receipt_no || (c.source_receipt_id ? `RCPT-${c.source_receipt_id.slice(0, 8)}` : undefined),
    date: c.created_at ? c.created_at.split("T")[0] : todayStr,
    note: c.notes || c.note || "Advance Fee Payment",
  }));

  return {
    student: effectiveStudent,
    metrics: {
      opening_balance_paise: 0,
      total_charges_paise: totalCharges, // Gross assessed charges before concessions
      total_concessions_paise: totalConcessions, // Approved concessions / waivers
      net_assessed_paise: Math.max(0, totalCharges - totalConcessions), // Net applicable obligations
      total_payments_paise: totalPayments,
      total_refunds_paise: 0,
      closing_balance_paise: closingBalance,
      overdue_balance_paise: overdueBalance,
      advance_credits_paise: advanceCreditPaise,
    },
    transactions,
    fee_breakdown: feeBreakdown,
    invoices: studentInvoices,
    payments: paymentsList,
    concessions: concessionsList,
    transport_details: transportDetails,
    advance_credits: advanceCreditsList,
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
  const feeBreakdown = ledger.fee_breakdown || [];

  const breakdownRows = feeBreakdown
    .map(
      (b) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 8px 10px; font-size: 11px; font-weight: 600; color: #0f172a;">${b.description}</td>
      <td style="padding: 8px 10px; font-size: 11px; color: #475569;">${b.billing_period}</td>
      <td style="padding: 8px 10px; font-size: 11px; text-align: right; font-weight: 600; color: #0f172a;">${formatPaise(b.original_amount_paise)}</td>
      <td style="padding: 8px 10px; font-size: 11px; text-align: right; font-weight: 600; color: #15803d;">${b.paid_paise > 0 ? formatPaise(b.paid_paise) : "—"}</td>
      <td style="padding: 8px 10px; font-size: 11px; text-align: right; font-weight: 600; color: #0284c7;">${b.waived_paise > 0 ? formatPaise(b.waived_paise) : "—"}</td>
      <td style="padding: 8px 10px; font-size: 11px; text-align: right; font-weight: 700; color: ${b.pending_paise > 0 ? '#b91c1c' : '#15803d'};">${formatPaise(b.pending_paise)}</td>
      <td style="padding: 8px 10px; font-size: 11px; color: #475569; white-space: nowrap;">${b.due_date}</td>
      <td style="padding: 8px 10px; font-size: 11px; text-align: center; white-space: nowrap;">
        <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; ${
          b.status === "Paid" ? "background: #dcfce7; color: #166534;" :
          b.status === "Waived" ? "background: #f0fdf4; color: #15803d;" :
          b.status === "Overdue" ? "background: #fee2e2; color: #991b1b;" :
          b.status === "Partial" ? "background: #fef3c7; color: #92400e;" :
          "background: #f1f5f9; color: #475569;"
        }">${b.status}</span>
      </td>
    </tr>
  `
    )
    .join("");

  const rows = transactions
    .map(
      (tx) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 8px 10px; font-size: 11px; white-space: nowrap;">${tx.date}</td>
      <td style="padding: 8px 10px; font-size: 11px; font-weight: 600; color: #1e293b; white-space: nowrap;">${tx.ref_no}</td>
      <td style="padding: 8px 10px; font-size: 11px; color: #0f172a; font-weight: 500;">
        ${tx.description}
        ${tx.internal_note ? `<div style="font-size: 9px; color: #64748b; margin-top: 2px;">Note: ${tx.internal_note}</div>` : ""}
      </td>
      <td style="padding: 8px 10px; font-size: 11px; color: #475569;">${tx.billing_period || tx.period || "—"}</td>
      <td style="padding: 8px 10px; font-size: 11px; color: #475569; white-space: nowrap;">${tx.due_date || "—"}</td>
      <td style="padding: 8px 10px; font-size: 11px; text-align: right; font-weight: 600; color: #b91c1c;">
        ${tx.debit_paise > 0 ? formatPaise(tx.debit_paise) : "—"}
      </td>
      <td style="padding: 8px 10px; font-size: 11px; text-align: right; font-weight: 600; color: #15803d;">
        ${tx.credit_paise > 0 ? formatPaise(tx.credit_paise) : "—"}
      </td>
      <td style="padding: 8px 10px; font-size: 11px; text-align: right; font-weight: 700; color: #0f172a;">
        ${formatPaise(tx.running_balance_paise)}
      </td>
      <td style="padding: 8px 10px; font-size: 11px; text-align: center; white-space: nowrap;">
        <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; ${
          tx.payment_status === "Paid" || tx.payment_status === "Received"
            ? "background: #dcfce7; color: #166534;"
            : tx.payment_status === "Overdue"
            ? "background: #fee2e2; color: #991b1b;"
            : tx.payment_status === "Waived"
            ? "background: #f0fdf4; color: #15803d;"
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
    .tile.total { background: #f8fafc; border-color: #cbd5e1; }
    .tile.paid { background: #f0fdf4; border-color: #bbf7d0; }
    .tile.pending { background: #fffbeb; border-color: #fde68a; }
    .tile.overdue { background: #fef2f2; border-color: #fecaca; }
    .tile-val { font-size: 18px; font-weight: 800; }
    .tile-lbl { font-size: 11px; color: #64748b; margin-top: 2px; }

    table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 24px; }
    th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; border-bottom: 2px solid #cbd5e1; }
    .section-title { font-size: 13px; font-weight: 700; margin-top: 24px; margin-bottom: 8px; text-transform: uppercase; color: #475569; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
    @media print {
      body { padding: 10mm; }
      @page { size: A4 landscape; margin: 10mm; }
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
      <div class="card-value">${student.has_transport ? student.transport_route || "Enrolled" : "Not Opted"}</div>
    </div>
    <div class="card-item">
      <div class="card-label">Next Due Date</div>
      <div class="card-value">${student.next_due_date || "All Cleared"}</div>
    </div>
    <div class="card-item">
      <div class="card-label">Fee Status</div>
      <div class="card-value" style="text-transform: capitalize; font-weight: 700; color: ${(student.fee_status || student.student_status) === "overdue" ? "#dc2626" : (student.fee_status || student.student_status) === "fully_paid" ? "#16a34a" : "#d97706"};">${String(student.fee_status || student.student_status || "Active").replace("_", " ")}</div>
    </div>
  </div>

  <div class="summary-tiles">
    <div class="tile total">
      <div class="tile-val" style="color: #0f172a;">${formatPaise(metrics.net_assessed_paise !== undefined ? metrics.net_assessed_paise : student.total_applicable_paise)}</div>
      <div class="tile-lbl">Total Net Fee (Assessed)</div>
      ${metrics.total_concessions_paise > 0 ? `<div style="font-size: 9px; color: #15803d; margin-top: 2px;">(Gross ${formatPaise(metrics.total_charges_paise)} - Concessions ${formatPaise(metrics.total_concessions_paise)})</div>` : ""}
    </div>
    <div class="tile paid">
      <div class="tile-val" style="color: #15803d;">${formatPaise(metrics.total_payments_paise)}</div>
      <div class="tile-lbl">Total Paid to Date</div>
    </div>
    <div class="tile pending">
      <div class="tile-val" style="color: #d97706;">${formatPaise(metrics.closing_balance_paise)}</div>
      <div class="tile-lbl">Current Outstanding Balance</div>
    </div>
    <div class="tile overdue">
      <div class="tile-val" style="color: #dc2626;">${formatPaise(metrics.overdue_balance_paise)}</div>
      <div class="tile-lbl">Total Overdue Balance</div>
    </div>
  </div>

  ${
    breakdownRows.length > 0
      ? `
  <div class="section-title">Fee Obligations, Concessions & Pending Breakdown</div>
  <table>
    <thead>
      <tr>
        <th>Fee Description</th>
        <th>Billing Period</th>
        <th style="text-align: right;">Original Amount</th>
        <th style="text-align: right;">Paid</th>
        <th style="text-align: right;">Waived</th>
        <th style="text-align: right;">Pending</th>
        <th>Due Date</th>
        <th style="text-align: center;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${breakdownRows}
    </tbody>
  </table>`
      : ""
  }

  <div class="section-title">Chronological Fee Ledger & Transactions</div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Reference #</th>
        <th>Fee / Transaction Description</th>
        <th>Billing Period</th>
        <th>Due Date</th>
        <th style="text-align: right;">Debit</th>
        <th style="text-align: right;">Credit</th>
        <th style="text-align: right;">Running Balance</th>
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
    "Fee Structure",
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
    `"${s.applicable_fee_structure_name || (s.has_transport ? 'Transport Only' : 'None')}"`,
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
