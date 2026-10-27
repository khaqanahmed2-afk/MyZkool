/**
 * Fee Dashboard Service
 *
 * Provides optimized, high-performance financial aggregation and server-side
 * paginated queries for the Fee Management Dashboard.
 *
 * Follows the project's multi-tenant architecture:
 * - Direct PostgreSQL aggregation via RPC (get_fee_dashboard_metrics)
 * - Server-side paginated queries with search & filters
 * - LocalStorage / memory authoritative fallback matching exact financial invariants
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { computeAuthoritativeFinancialSummary, getTodayIST } from "./feeCalculationService";
import { getReceipts } from "./collectionService";
import type { FeeReceipt } from "../types/collection";

export interface DashboardMetricsResult {
  totalCollectedPaise: number;
  thisMonthCollectedPaise: number;
  lastMonthCollectedPaise: number;
  todayCollectedPaise: number;
  totalOutstandingPaise: number;
  totalOverduePaise: number;
  pendingCurrentPaise: number;
  totalGrossBilledPaise: number;
  totalConcessionsPaise: number;
  totalNetBilledPaise: number;
  totalStudentsCount: number;
  collectionRatePct: number;
  monthChangePct: number | null;
  monthlyTrend: Array<{
    month: string;
    label: string;
    collectedPaise: number;
    billedPaise: number;
  }>;
}

export interface DashboardRecentTransaction {
  id: string;
  receipt_no: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  class_name: string;
  total_paise: number;
  payment_mode: string;
  receipt_date: string;
  status: "active" | "cancelled" | "bounced";
}

export interface DashboardTopPendingDue {
  studentId: string;
  studentName: string;
  admissionNo: string;
  className: string;
  balancePaise: number;
  daysPastDue: number;
  earliestOverdueDate?: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function lsGet<T>(key: string): T[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function cleanUUID(val?: string | null): string | null {
  if (!val || typeof val !== "string") return null;
  const trimmed = val.trim();
  if (trimmed === "" || trimmed === "all" || trimmed === "none" || trimmed === "undefined" || trimmed === "null") return null;
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

/**
 * Retrieves high-level dashboard financial KPIs and monthly collection trends.
 */
export async function getFeeDashboardMetrics(params: {
  schoolId: string;
  academicYearId?: string;
  classId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<DashboardMetricsResult> {
  const { schoolId, academicYearId, classId, startDate, endDate } = params;
  const validSchoolId = cleanUUID(schoolId);

  if (isSupabaseConfigured && validSchoolId) {
    try {
      const { data, error } = await supabase.rpc("get_fee_dashboard_metrics", {
        p_school_id: validSchoolId,
        p_academic_year_id: cleanUUID(academicYearId),
        p_class_id: cleanUUID(classId),
        p_start_date: startDate || null,
        p_end_date: endDate || null,
      });

      if (!error && data) {
        return {
          totalCollectedPaise: Number(data.totalCollectedPaise) || 0,
          thisMonthCollectedPaise: Number(data.thisMonthCollectedPaise) || 0,
          lastMonthCollectedPaise: Number(data.lastMonthCollectedPaise) || 0,
          todayCollectedPaise: Number(data.todayCollectedPaise) || 0,
          totalOutstandingPaise: Number(data.totalOutstandingPaise) || 0,
          totalOverduePaise: Number(data.totalOverduePaise) || 0,
          pendingCurrentPaise: Number(data.pendingCurrentPaise) || 0,
          totalGrossBilledPaise: Number(data.totalGrossBilledPaise) || 0,
          totalConcessionsPaise: Number(data.totalConcessionsPaise) || 0,
          totalNetBilledPaise: Number(data.totalNetBilledPaise) || 0,
          totalStudentsCount: Number(data.totalStudentsCount) || 0,
          collectionRatePct: Number(data.collectionRatePct) || 0,
          monthChangePct: data.monthChangePct !== null ? Number(data.monthChangePct) : null,
          monthlyTrend: Array.isArray(data.monthlyTrend) ? data.monthlyTrend : [],
        };
      }
    } catch (err) {
      console.warn("get_fee_dashboard_metrics RPC error, falling back to authoritative calculation:", err);
    }
  }

  // Fallback to client-side authoritative financial calculation
  const todayDate = getTodayIST();
  const curMonthPfx = todayDate.slice(0, 7);
  const lastMonthDate = new Date(todayDate);
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lstMonthPfx = lastMonthDate.toISOString().slice(0, 7);

  let allReceipts: FeeReceipt[] = [];
  if (isSupabaseConfigured) {
    try {
      const { data: recData } = await supabase
        .from("fee_receipts")
        .select("id, school_id, student_id, academic_year_id, receipt_date, total_paise, status, source")
        .eq("school_id", schoolId);
      allReceipts = (recData || []) as FeeReceipt[];
    } catch {
      allReceipts = lsGet<FeeReceipt>(`myzkool_fee_receipts_${schoolId}`);
    }
  } else {
    allReceipts = lsGet<FeeReceipt>(`myzkool_fee_receipts_${schoolId}`);
  }

  let allDues: any[] = [];
  let creditsData: any[] = [];
  let studentsData: any[] = [];
  let enrollmentsList: any[] = [];

  if (isSupabaseConfigured) {
    try {
      const [dRes, cRes, sRes, enrRes] = await Promise.all([
        supabase
          .from("student_dues")
          .select("id, student_id, academic_year_id, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status")
          .eq("school_id", schoolId),
        supabase.from("fee_credits").select("student_id, remaining_paise").eq("school_id", schoolId),
        supabase.from("students").select("id, first_name, last_name, admission_no").eq("school_id", schoolId).is("deleted_at", null),
        supabase.from("student_enrollments").select("student_id, class_id, status").eq("school_id", schoolId).eq("status", "active"),
      ]);
      allDues = dRes.data || [];
      creditsData = cRes.data || [];
      studentsData = sRes.data || [];
      enrollmentsList = enrRes.data || [];
    } catch {
      allDues = lsGet<any>(`myzkool_student_dues_${schoolId}`);
      creditsData = lsGet<any>(`myzkool_fee_credits_${schoolId}`);
      studentsData = lsGet<any>(`myzkool_students_${schoolId}`);
      enrollmentsList = lsGet<any>(`myzkool_student_enrollments_${schoolId}`);
    }
  } else {
    allDues = lsGet<any>(`myzkool_student_dues_${schoolId}`);
    creditsData = lsGet<any>(`myzkool_fee_credits_${schoolId}`);
    studentsData = lsGet<any>(`myzkool_students_${schoolId}`);
    enrollmentsList = lsGet<any>(`myzkool_student_enrollments_${schoolId}`);
  }

  // Filter by class if needed
  if (classId) {
    const studentIdsInClass = new Set(
      enrollmentsList.filter((e: any) => e.class_id === classId && e.status === "active").map((e: any) => e.student_id)
    );
    allDues = allDues.filter((d: any) => studentIdsInClass.has(d.student_id));
    allReceipts = allReceipts.filter((r: any) => studentIdsInClass.has(r.student_id));
    studentsData = studentsData.filter((s: any) => studentIdsInClass.has(s.id));
  }

  const activeReceipts = allReceipts.filter((r) => {
    if (r.status !== "active") return false;
    if (academicYearId && r.academic_year_id && r.academic_year_id !== academicYearId) return false;
    if (startDate && r.receipt_date < startDate) return false;
    if (endDate && r.receipt_date > endDate) return false;
    return true;
  });

  let thisMonthPaise = 0;
  let lastMonthPaise = 0;
  let todayPaise = 0;
  for (const r of activeReceipts) {
    if (r.receipt_date.startsWith(curMonthPfx)) thisMonthPaise += Number(r.total_paise) || 0;
    if (r.receipt_date.startsWith(lstMonthPfx)) lastMonthPaise += Number(r.total_paise) || 0;
    if (r.receipt_date === todayDate) todayPaise += Number(r.total_paise) || 0;
  }

  const authSummary = computeAuthoritativeFinancialSummary({
    dues: allDues,
    credits: creditsData,
    receipts: activeReceipts,
    students: studentsData,
    academicYearId: academicYearId || undefined,
    asOfDateStr: todayDate,
  });

  // Trailing 12 months collection trend
  const monthMap: Record<string, { label: string; collectedPaise: number; billedPaise: number }> = {};
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("en-IN", { month: "short" });
    monthMap[key] = { label, collectedPaise: 0, billedPaise: 0 };
  }
  for (const r of activeReceipts) {
    const key = r.receipt_date.slice(0, 7);
    if (monthMap[key]) monthMap[key].collectedPaise += Number(r.total_paise) || 0;
  }
  for (const d of allDues) {
    if (d.status !== "cancelled" && d.status !== "waived" && (!academicYearId || d.academic_year_id === academicYearId)) {
      if (d.due_date && monthMap[d.due_date.slice(0, 7)]) {
        monthMap[d.due_date.slice(0, 7)].billedPaise += Number(d.net_paise || d.balance_paise || 0);
      }
    }
  }

  const monthChangePct =
    lastMonthPaise > 0
      ? Math.round(((thisMonthPaise - lastMonthPaise) / lastMonthPaise) * 100)
      : null;

  return {
    totalCollectedPaise: authSummary.total_collected_paise,
    thisMonthCollectedPaise: thisMonthPaise,
    lastMonthCollectedPaise: lastMonthPaise,
    todayCollectedPaise: todayPaise,
    totalOutstandingPaise: authSummary.net_outstanding_paise,
    totalOverduePaise: authSummary.net_overdue_paise,
    pendingCurrentPaise: Math.max(0, authSummary.net_outstanding_paise - authSummary.net_overdue_paise),
    totalGrossBilledPaise: authSummary.total_gross_billed_paise,
    totalConcessionsPaise: authSummary.total_concessions_paise,
    totalNetBilledPaise: authSummary.total_net_billed_paise,
    totalStudentsCount: authSummary.total_students_count,
    collectionRatePct: authSummary.collection_rate_pct,
    monthChangePct,
    monthlyTrend: Object.entries(monthMap).map(([month, val]) => ({
      month,
      label: val.label,
      collectedPaise: val.collectedPaise,
      billedPaise: val.billedPaise,
    })),
  };
}

/**
 * Retrieves paginated, searchable recent fee collection receipts.
 */
export async function getDashboardRecentCollections(params: {
  schoolId: string;
  academicYearId?: string;
  classId?: string;
  status?: string;
  paymentMode?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<DashboardRecentTransaction>> {
  const { schoolId, academicYearId, classId, status, paymentMode, search, page = 1, pageSize = 10 } = params;
  const validSchoolId = cleanUUID(schoolId);

  if (isSupabaseConfigured && validSchoolId) {
    try {
      const { data, error } = await supabase.rpc("get_dashboard_recent_collections", {
        p_school_id: validSchoolId,
        p_academic_year_id: cleanUUID(academicYearId),
        p_class_id: cleanUUID(classId),
        p_status: status && status !== "all" ? status : null,
        p_payment_mode: paymentMode && paymentMode !== "all" ? paymentMode : null,
        p_search: search && search.trim() ? search.trim() : null,
        p_page: Math.max(1, page),
        p_page_size: Math.max(1, pageSize),
      });

      if (!error && data) {
        return {
          items: Array.isArray(data.items) ? data.items : [],
          total: Number(data.total) || 0,
          page: Number(data.page) || 1,
          pageSize: Number(data.pageSize) || 10,
          totalPages: Number(data.totalPages) || 1,
        };
      }
    } catch (err) {
      console.warn("get_dashboard_recent_collections RPC error, falling back:", err);
    }
  }

  // Fallback
  const { receipts: allReceipts } = await getReceipts(schoolId, undefined, academicYearId);
  const students = lsGet<any>(`myzkool_students_${schoolId}`);
  const classes = lsGet<any>(`myzkool_classes_${schoolId}`);
  const enrollments = lsGet<any>(`myzkool_student_enrollments_${schoolId}`);
  const payments = lsGet<any>(`myzkool_fee_payments_${schoolId}`);

  const sMap = new Map(students.map((s: any) => [s.id, s]));
  const cMap = new Map(classes.map((c: any) => [c.id, c.name]));
  const eMap = new Map(enrollments.filter((e: any) => e.status === "active").map((e: any) => [e.student_id, e.class_id]));
  const pMap = new Map(payments.map((p: any) => [p.receipt_id, p.mode]));

  let filtered = allReceipts.map((r) => {
    const s = sMap.get(r.student_id);
    const clsId = eMap.get(r.student_id) || (s ? (s.class_id || s.admission_class_id) : undefined);
    const clsName = (clsId && cMap.get(clsId)) || "—";
    const mode = pMap.get(r.id) || r.source || "cash";
    const sName = s ? `${s.first_name || ""} ${s.last_name || ""}`.trim() : "Student";
    const admNo = s?.admission_no || "—";

    return {
      id: r.id,
      receipt_no: r.receipt_no,
      student_id: r.student_id,
      student_name: sName,
      admission_no: admNo,
      class_name: clsName,
      class_id: clsId,
      total_paise: r.total_paise,
      payment_mode: mode,
      receipt_date: r.receipt_date,
      status: r.status,
    };
  });

  if (classId) {
    filtered = filtered.filter((r) => r.class_id === classId);
  }
  if (status && status !== "all") {
    filtered = filtered.filter((r) => r.status === status);
  }
  if (paymentMode && paymentMode !== "all") {
    filtered = filtered.filter((r) => r.payment_mode.toLowerCase() === paymentMode.toLowerCase());
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.receipt_no.toLowerCase().includes(q) ||
        r.student_name.toLowerCase().includes(q) ||
        r.admission_no.toLowerCase().includes(q)
    );
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return { items, total, page, pageSize, totalPages };
}

/**
 * Retrieves paginated top pending student dues with overdue days.
 */
export async function getDashboardTopPendingDues(params: {
  schoolId: string;
  academicYearId?: string;
  classId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<DashboardTopPendingDue>> {
  const { schoolId, academicYearId, classId, search, page = 1, pageSize = 10 } = params;
  const validSchoolId = cleanUUID(schoolId);

  if (isSupabaseConfigured && validSchoolId) {
    try {
      const { data, error } = await supabase.rpc("get_dashboard_top_pending_dues", {
        p_school_id: validSchoolId,
        p_academic_year_id: cleanUUID(academicYearId),
        p_class_id: cleanUUID(classId),
        p_search: search && search.trim() ? search.trim() : null,
        p_page: Math.max(1, page),
        p_page_size: Math.max(1, pageSize),
      });

      if (!error && data) {
        return {
          items: Array.isArray(data.items) ? data.items : [],
          total: Number(data.total) || 0,
          page: Number(data.page) || 1,
          pageSize: Number(data.pageSize) || 10,
          totalPages: Number(data.totalPages) || 1,
        };
      }
    } catch (err) {
      console.warn("get_dashboard_top_pending_dues RPC error, falling back:", err);
    }
  }

  // Fallback
  const todayDate = getTodayIST();
  let allDues = lsGet<any>(`myzkool_student_dues_${schoolId}`);
  let creditsData = lsGet<any>(`myzkool_fee_credits_${schoolId}`);
  let studentsData = lsGet<any>(`myzkool_students_${schoolId}`);
  let classes = lsGet<any>(`myzkool_classes_${schoolId}`);
  let enrollments = lsGet<any>(`myzkool_student_enrollments_${schoolId}`);

  const sMap = new Map(studentsData.map((s: any) => [s.id, s]));
  const cMap = new Map(classes.map((c: any) => [c.id, c.name]));
  const eMap = new Map(enrollments.filter((e: any) => e.status === "active").map((e: any) => [e.student_id, e.class_id]));

  if (classId) {
    const studentIdsInClass = new Set(
      enrollments.filter((e: any) => e.class_id === classId && e.status === "active").map((e: any) => e.student_id)
    );
    allDues = allDues.filter((d: any) => studentIdsInClass.has(d.student_id));
    studentsData = studentsData.filter((s: any) => studentIdsInClass.has(s.id));
  }

  const authSummary = computeAuthoritativeFinancialSummary({
    dues: allDues,
    credits: creditsData,
    students: studentsData,
    academicYearId: academicYearId || undefined,
    asOfDateStr: todayDate,
  });

  let studentsList = Array.from(authSummary.studentsMap.values())
    .filter((s) => s.net_pending_paise > 0)
    .map((sBreakdown) => {
      const s = sMap.get(sBreakdown.student_id);
      const clsId = eMap.get(sBreakdown.student_id) || (s ? (s.class_id || s.admission_class_id) : undefined);
      const clsName = (clsId && cMap.get(clsId)) || "—";
      const sName = s ? `${s.first_name || ""} ${s.last_name || ""}`.trim() : "Student";
      const admNo = s?.admission_no || "—";
      let daysPastDue = 0;
      if (sBreakdown.earliest_overdue_date && sBreakdown.earliest_overdue_date < todayDate) {
        daysPastDue = Math.floor(
          (new Date(todayDate).getTime() - new Date(sBreakdown.earliest_overdue_date).getTime()) / 86400000
        );
      }

      return {
        studentId: sBreakdown.student_id,
        studentName: sName,
        admissionNo: admNo,
        className: clsName,
        balancePaise: sBreakdown.net_pending_paise,
        daysPastDue,
        earliestOverdueDate: sBreakdown.earliest_overdue_date,
      };
    })
    .sort((a, b) => b.balancePaise - a.balancePaise);

  if (search) {
    const q = search.toLowerCase();
    studentsList = studentsList.filter(
      (s) => s.studentName.toLowerCase().includes(q) || s.admissionNo.toLowerCase().includes(q)
    );
  }

  const total = studentsList.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const start = (page - 1) * pageSize;
  const items = studentsList.slice(start, start + pageSize);

  return { items, total, page, pageSize, totalPages };
}
