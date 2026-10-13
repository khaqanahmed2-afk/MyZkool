/**
 * FeeDashboard — /admin/fees
 * Redesigned MyZkool School Fee Management Dashboard
 * 
 * Features:
 * 1. Clean Header with Title, Subtitle, and Quick Actions (Collect Fee, Assign Dues, Fee Settings)
 * 2. Fee Setup Status Banner with Step-by-Step progress (5 steps: Categories, Cycles, Structures, Assign Dues, Payment Collection)
 * 3. Key Metrics: Collected Today, Collected This Month, Outstanding Fees, Overdue Fees (formatted in ₹)
 * 4. Quick Actions: Collect Fee, Assign Dues, View Invoices, Manage Structures, View Receipts, Manage Defaulters
 * 5. Fee Collection Overview: Recent transactions table with student name, admission/receipt no, class, amount, method, date, status
 * 6. Outstanding Fees: Class-wise outstanding balances and overdue indicators
 * 7. Operational Highlights: Cheques, Approvals, Day Status, Promised Payments
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  CreditCard,
  IndianRupee,
  PlusCircle,
  Settings,
  FileCheck2,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  ArrowRight,
  Layers,
  Calendar,
  Grid3X3,
  RefreshCw,
  FileText,
  CheckSquare,
  ShieldAlert,
  ArrowUpRight,
  Sliders,
  TrendingUp,
  Ban,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { FeeNavHeader } from "../../../components/admin/fees/FeeNavHeader";
import { getReceipts } from "../../../services/collectionService";
import { getStudentDues } from "../../../services/feeDuesService";
import { getFeeHeads, getFeeTerms, getFeeStructures } from "../../../services/feeSetupService";
import { getCurrentAcademicYear } from "../../../services/academicService";
import { getCheques } from "../../../services/chequeService";
import { getPendingCount } from "../../../services/approvalService";
import { isBusinessDateClosed } from "../../../services/dayCloseService";
import { getFollowups } from "../../../services/reminderJob";
import { supabase, isSupabaseConfigured } from "../../../lib/supabase";
import type { FeeReceipt } from "../../../types/collection";

interface RecentTransaction {
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

interface ClassOutstandingItem {
  className: string;
  amountPaise: number;
  studentCount: number;
}

interface SetupStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  href: string;
  isComplete: boolean;
  icon: React.ElementType;
}

function fmt(paise: number): string {
  const num = Number(paise);
  if (!Number.isFinite(num)) return "₹0";
  return "₹" + Math.round(num / 100).toLocaleString("en-IN");
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function FeeDashboard() {
  const { schoolId } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yearId, setYearId] = useState("");
  const [todayDate] = useState(new Date().toISOString().split("T")[0]);

  // Key Metrics
  const [collectedTodayPaise, setCollectedTodayPaise] = useState(0);
  const [collectedMonthPaise, setCollectedMonthPaise] = useState(0);
  const [outstandingPaise, setOutstandingPaise] = useState(0);
  const [overduePaise, setOverduePaise] = useState(0);

  // Setup Progress Steps
  const [setupSteps, setSetupSteps] = useState<SetupStep[]>([
    {
      id: "heads",
      stepNumber: 1,
      title: "Fee Categories",
      description: "Define categories such as Tuition, Exams, and Lab fees.",
      href: "/admin/fees/setup/heads",
      isComplete: false,
      icon: Layers,
    },
    {
      id: "terms",
      stepNumber: 2,
      title: "Billing Cycles",
      description: "Configure payment terms and schedule due dates.",
      href: "/admin/fees/setup/terms",
      isComplete: false,
      icon: Calendar,
    },
    {
      id: "structures",
      stepNumber: 3,
      title: "Fee Structures",
      description: "Set term-wise fee amounts for every grade level.",
      href: "/admin/fees/setup/structures",
      isComplete: false,
      icon: Grid3X3,
    },
    {
      id: "dues",
      stepNumber: 4,
      title: "Assign Dues",
      description: "Generate student invoices based on fee structures.",
      href: "/admin/fees/dues",
      isComplete: false,
      icon: FileCheck2,
    },
    {
      id: "collect",
      stepNumber: 5,
      title: "Payment Collection",
      description: "Receive fee payments and generate formal receipts.",
      href: "/admin/fees/collect",
      isComplete: false,
      icon: CreditCard,
    },
  ]);

  // Recent Collections
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);

  // Class-wise Outstanding
  const [classOutstanding, setClassOutstanding] = useState<ClassOutstandingItem[]>([]);

  // Operational Action Highlights
  const [pendingChequesCount, setPendingChequesCount] = useState(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [dayClosed, setDayClosed] = useState(false);
  const [promisedTodayCount, setPromisedTodayCount] = useState(0);

  // Resolve current academic year
  useEffect(() => {
    if (!schoolId) return;
    let isMounted = true;
    async function resolveYear() {
      try {
        const storedYears = JSON.parse(
          localStorage.getItem(`myzkool_academic_years_${schoolId}`) || "[]"
        );
        const currentYear = storedYears.find((y: any) => y.is_current);
        if (currentYear?.id) {
          if (isMounted) setYearId(currentYear.id);
          return;
        }
      } catch {
        // ignore
      }

      // Fallback: Query active academic year via academicService
      try {
        const { academicYear } = await getCurrentAcademicYear(schoolId);
        if (academicYear?.id && isMounted) {
          setYearId(academicYear.id);
        }
      } catch {
        // ignore
      }
    }
    resolveYear();
    return () => {
      isMounted = false;
    };
  }, [schoolId]);

  const loadDashboardData = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);

    try {
      const currentMonthPrefix = todayDate.slice(0, 7);

      // ─── 1. Receipts & Daily Collections ────────────────────────────────────
      const { receipts: allReceipts } = await getReceipts(schoolId, undefined, yearId || undefined);
      const activeReceipts = allReceipts.filter((r) => r.status === "active");

      let todaySum = 0;
      let monthSum = 0;

      for (const r of activeReceipts) {
        if (r.receipt_date === todayDate) {
          todaySum += r.total_paise;
        }
        if (r.receipt_date.startsWith(currentMonthPrefix)) {
          monthSum += r.total_paise;
        }
      }

      setCollectedTodayPaise(todaySum);
      setCollectedMonthPaise(monthSum);

      // ─── 2. Recent Transactions (Top 8 with student info & mode) ───────────
      const recentSlice = allReceipts.slice(0, 8);
      const studentIds = Array.from(new Set(recentSlice.map((r) => r.student_id).filter(Boolean)));
      const receiptIds = recentSlice.map((r) => r.id);

      const studentMap: Record<string, { name: string; admission_no: string; class_name: string }> = {};
      const modeMap: Record<string, string> = {};

      if (isSupabaseConfigured && studentIds.length > 0) {
        try {
          const { data: studentsData } = await supabase
            .from("students")
            .select("id, first_name, last_name, admission_no, class_id, classes(name)")
            .in("id", studentIds);

          if (studentsData) {
            for (const st of studentsData as any[]) {
              studentMap[st.id] = {
                name: `${st.first_name || ""} ${st.last_name || ""}`.trim() || "Student",
                admission_no: st.admission_no || "—",
                class_name: st.classes?.name || "Class",
              };
            }
          }

          if (receiptIds.length > 0) {
            const { data: paymentsData } = await supabase
              .from("fee_payments")
              .select("receipt_id, mode")
              .in("receipt_id", receiptIds);

            if (paymentsData) {
              for (const p of paymentsData as any[]) {
                if (p.receipt_id && !modeMap[p.receipt_id]) {
                  modeMap[p.receipt_id] = p.mode;
                }
              }
            }
          }
        } catch (supabaseErr) {
          console.warn("Supabase student lookup warning, falling back to local:", supabaseErr);
        }
      }

      // Local storage fallback for students/classes/payments if missing
      if (typeof localStorage !== "undefined") {
        try {
          const localStudents = JSON.parse(
            localStorage.getItem(`myzkool_students_${schoolId}`) || "[]"
          );
          const localClasses = JSON.parse(
            localStorage.getItem(`myzkool_classes_${schoolId}`) || "[]"
          );
          const localPayments = JSON.parse(
            localStorage.getItem(`myzkool_fee_payments_${schoolId}`) || "[]"
          );

          for (const st of localStudents) {
            if (!studentMap[st.id]) {
              const cls = localClasses.find((c: any) => c.id === st.class_id);
              studentMap[st.id] = {
                name: `${st.first_name || ""} ${st.last_name || ""}`.trim() || "Student",
                admission_no: st.admission_no || "—",
                class_name: cls?.name || "Class",
              };
            }
          }

          for (const p of localPayments) {
            if (p.receipt_id && !modeMap[p.receipt_id]) {
              modeMap[p.receipt_id] = p.mode;
            }
          }
        } catch {
          // ignore
        }
      }

      const formattedRecent: RecentTransaction[] = recentSlice.map((r) => {
        const studentInfo = studentMap[r.student_id] || {
          name: "Student",
          admission_no: "—",
          class_name: "Class",
        };
        const paymentMode = modeMap[r.id] || r.source || "cash";

        return {
          id: r.id,
          receipt_no: r.receipt_no,
          student_id: r.student_id,
          student_name: studentInfo.name,
          admission_no: studentInfo.admission_no,
          class_name: studentInfo.class_name,
          total_paise: r.total_paise,
          payment_mode: paymentMode,
          receipt_date: r.receipt_date,
          status: r.status,
        };
      });

      setRecentTransactions(formattedRecent);

      // ─── 3. Outstanding and Overdue Fees ───────────────────────────────────
      let totalOutstanding = 0;
      let totalOverdue = 0;
      const classMap: Record<string, { amountPaise: number; studentCount: number }> = {};
      let totalDuesCount = 0;

      if (isSupabaseConfigured) {
        try {
          let duesQuery = supabase
            .from("student_dues")
            .select(`
              id, student_id, balance_paise, due_date, status,
              students(id, class_id, classes(name))
            `)
            .eq("school_id", schoolId)
            .in("status", ["pending", "partial"])
            .gt("balance_paise", 0);

          if (yearId) {
            duesQuery = duesQuery.eq("academic_year_id", yearId);
          }

          const { data: duesData, error: duesError } = await duesQuery;

          if (!duesError && duesData) {
            totalDuesCount = duesData.length;
            for (const d of duesData as any[]) {
              const bal = Number(d.balance_paise) || 0;
              totalOutstanding += bal;

              if (d.due_date && d.due_date < todayDate) {
                totalOverdue += bal;
              }

              const clsName = d.students?.classes?.name || "General";
              if (!classMap[clsName]) {
                classMap[clsName] = { amountPaise: 0, studentCount: 0 };
              }
              classMap[clsName].amountPaise += bal;
              classMap[clsName].studentCount += 1;
            }
          }
        } catch (duesSupabaseErr) {
          console.warn("Supabase dues query warning, checking local storage:", duesSupabaseErr);
        }
      }

      // If Supabase yielded no dues or was offline, evaluate local storage
      if (totalDuesCount === 0 && typeof localStorage !== "undefined") {
        try {
          const localDues = JSON.parse(
            localStorage.getItem(`myzkool_student_dues_${schoolId}`) || "[]"
          );
          const localStudents = JSON.parse(
            localStorage.getItem(`myzkool_students_${schoolId}`) || "[]"
          );
          const localClasses = JSON.parse(
            localStorage.getItem(`myzkool_classes_${schoolId}`) || "[]"
          );

          const pendingDues = localDues.filter(
            (d: any) =>
              (d.status === "pending" || d.status === "partial") &&
              (Number(d.balance_paise) || 0) > 0 &&
              (!yearId || d.academic_year_id === yearId)
          );

          totalDuesCount = pendingDues.length;

          for (const d of pendingDues) {
            const bal = Number(d.balance_paise) || 0;
            totalOutstanding += bal;

            if (d.due_date && d.due_date < todayDate) {
              totalOverdue += bal;
            }

            const student = localStudents.find((s: any) => s.id === d.student_id);
            const cls = localClasses.find((c: any) => c.id === student?.class_id);
            const clsName = cls?.name || "General";

            if (!classMap[clsName]) {
              classMap[clsName] = { amountPaise: 0, studentCount: 0 };
            }
            classMap[clsName].amountPaise += bal;
            classMap[clsName].studentCount += 1;
          }
        } catch {
          // ignore
        }
      }

      setOutstandingPaise(totalOutstanding);
      setOverduePaise(totalOverdue);

      const classList: ClassOutstandingItem[] = Object.entries(classMap)
        .map(([className, item]) => ({
          className,
          amountPaise: item.amountPaise,
          studentCount: item.studentCount,
        }))
        .sort((a, b) => b.amountPaise - a.amountPaise);

      setClassOutstanding(classList);

      // ─── 4. Setup Steps Verification ───────────────────────────────────────
      const [headsRes, termsRes, structuresRes] = await Promise.all([
        getFeeHeads(schoolId, true).catch(() => ({ heads: [] })),
        getFeeTerms(schoolId, yearId || undefined).catch(() => ({ terms: [] })),
        getFeeStructures(schoolId, yearId || undefined).catch(() => ({ structures: [] })),
      ]);

      const hasHeads = (headsRes.heads || []).length > 0;
      const hasTerms = (termsRes.terms || []).length > 0;
      const hasStructures = (structuresRes.structures || []).length > 0;
      const hasDues = totalDuesCount > 0;
      const hasReceipts = allReceipts.length > 0;

      setSetupSteps((prev) => [
        { ...prev[0], isComplete: hasHeads },
        { ...prev[1], isComplete: hasTerms },
        { ...prev[2], isComplete: hasStructures },
        { ...prev[3], isComplete: hasDues },
        { ...prev[4], isComplete: hasReceipts },
      ]);

      // ─── 5. Operational Highlights (Cheques, Approvals, Day Status) ────────
      const [cheques, approvalsCount, isClosed, followups] = await Promise.all([
        getCheques(schoolId).catch(() => []),
        getPendingCount(schoolId).catch(() => 0),
        isBusinessDateClosed(schoolId, todayDate).catch(() => false),
        getFollowups(schoolId, undefined, true).catch(() => []),
      ]);

      setPendingChequesCount(cheques.filter((c) => c.status === "received").length);
      setPendingApprovalsCount(approvalsCount);
      setDayClosed(isClosed);
      setPromisedTodayCount(followups.length);
    } catch (err: any) {
      console.error("Failed to load fee dashboard data:", err);
      setError(err?.message || "An unexpected error occurred while loading fee data.");
    } finally {
      setLoading(false);
    }
  }, [schoolId, yearId, todayDate]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Determine current incomplete setup step
  const completedCount = setupSteps.filter((s) => s.isComplete).length;
  const isSetupComplete = completedCount === setupSteps.length;
  const currentStep = setupSteps.find((s) => !s.isComplete) || setupSteps[0];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ─── A. Page Header & Persistent Sub-navigation ──────────────────── */}
      <FeeNavHeader
        title="Fees"
        subtitle="Manage fee structures, collections, invoices, and outstanding balances."
      />

      {/* ─── Error Notification if query fails ────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-red-800 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadDashboardData()}
            className="flex items-center gap-1.5 px-3 py-1 bg-white border border-red-300 rounded-lg font-semibold hover:bg-red-100 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* ─── B. Fee Setup Status ─────────────────────────────────────────── */}
      {!loading && !isSetupComplete ? (
        <div className="bg-white border border-blue-200 rounded-2xl p-5 shadow-xs transition-all">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#2158E0] border border-blue-100">
                <span>Setup Progress: {completedCount} of 5 Completed</span>
              </div>
              <h2 className="text-base font-bold text-[#141A2E]">
                Set up your school fee system
              </h2>
              <p className="text-xs text-[#5B6478]">
                Next: <strong className="text-slate-800 font-semibold">{currentStep.title}</strong> — {currentStep.description}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => navigate(currentStep.href)}
                className="flex items-center gap-2 px-4 py-2 bg-[#2158E0] hover:bg-[#1A46B8] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <span>Continue Setup</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin/fees/setup")}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
              >
                Setup Hub
              </button>
            </div>
          </div>

          {/* Compact 5-step Horizontal Progress Track */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-4 mt-4 border-t border-slate-100">
            {setupSteps.map((step) => {
              const StepIcon = step.icon;
              const isCurrent = !step.isComplete && step.id === currentStep.id;

              return (
                <button
                  key={step.id}
                  onClick={() => navigate(step.href)}
                  className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${step.isComplete
                      ? "bg-slate-50/70 border-slate-200 hover:border-slate-300"
                      : isCurrent
                        ? "bg-blue-50/60 border-blue-300 ring-1 ring-blue-200"
                        : "bg-white border-slate-200 opacity-60 hover:opacity-100"
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-400">Step {step.stepNumber}</span>
                    {step.isComplete ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <StepIcon className={`w-3.5 h-3.5 ${isCurrent ? "text-[#2158E0]" : "text-slate-400"}`} />
                    )}
                  </div>
                  <div className="text-xs font-semibold text-slate-900 truncate">{step.title}</div>
                </button>
              );
            })}
          </div>
        </div>
      ) : !loading && isSetupComplete ? (
        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-900">Fee System Configured</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">5/5 Steps Active</span>
              </div>
              <p className="text-[11px] text-[#5B6478]">
                Heads, cycles, class fee structures, and invoicing are active for the current academic session.
              </p>
            </div>
          </div>
          <Link
            to="/admin/fees/setup"
            className="text-xs font-semibold text-[#2158E0] hover:underline flex items-center gap-1 self-start sm:self-center"
          >
            <span>Review Fee Setup</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : null}

      {/* ─── C. Key Metrics Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Collected Today */}
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#5B6478]">Collected Today</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-[#2158E0]">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            {loading ? (
              <div className="h-7 w-24 bg-slate-100 animate-pulse rounded" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold text-[#141A2E] tabular-nums font-display">
                {fmt(collectedTodayPaise)}
              </div>
            )}
            <span className="text-[11px] text-slate-400 mt-1 block">
              {todayDate ? formatDate(todayDate) : "Today"}
            </span>
          </div>
        </div>

        {/* Metric 2: Collected This Month */}
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#5B6478]">Collected This Month</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            {loading ? (
              <div className="h-7 w-28 bg-slate-100 animate-pulse rounded" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold text-[#141A2E] tabular-nums font-display">
                {fmt(collectedMonthPaise)}
              </div>
            )}
            <span className="text-[11px] text-slate-400 mt-1 block">Month to date</span>
          </div>
        </div>

        {/* Metric 3: Outstanding Fees */}
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#5B6478]">Outstanding Fees</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            {loading ? (
              <div className="h-7 w-28 bg-slate-100 animate-pulse rounded" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold text-amber-700 tabular-nums font-display">
                {fmt(outstandingPaise)}
              </div>
            )}
            <span className="text-[11px] text-slate-400 mt-1 block">Total pending student dues</span>
          </div>
        </div>

        {/* Metric 4: Overdue Fees */}
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#5B6478]">Overdue Fees</span>
            <div className="p-1.5 rounded-lg bg-red-50 text-red-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            {loading ? (
              <div className="h-7 w-24 bg-slate-100 animate-pulse rounded" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold text-red-700 tabular-nums font-display">
                {fmt(overduePaise)}
              </div>
            )}
            <span className="text-[11px] text-slate-400 mt-1 block">Past scheduled due dates</span>
          </div>
        </div>
      </div>

      {/* ─── Operational Highlights Bar ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to="/admin/fees/cheques"
          className="bg-white border border-[#E6EAF3] rounded-xl p-3 shadow-2xs hover:border-blue-300 transition-colors flex items-center justify-between"
        >
          <div>
            <span className="text-[11px] font-medium text-slate-500 block">Cheques to deposit</span>
            <span className="text-base font-bold text-slate-900 tabular-nums">{pendingChequesCount}</span>
          </div>
          <CheckSquare className="w-4 h-4 text-blue-600" />
        </Link>

        <Link
          to="/admin/approvals"
          className="bg-white border border-[#E6EAF3] rounded-xl p-3 shadow-2xs hover:border-amber-300 transition-colors flex items-center justify-between"
        >
          <div>
            <span className="text-[11px] font-medium text-slate-500 block">Approvals pending</span>
            <span className="text-base font-bold text-slate-900 tabular-nums">{pendingApprovalsCount}</span>
          </div>
          <ShieldAlert className="w-4 h-4 text-amber-600" />
        </Link>

        <Link
          to="/admin/fees/day-close"
          className="bg-white border border-[#E6EAF3] rounded-xl p-3 shadow-2xs hover:border-emerald-300 transition-colors flex items-center justify-between"
        >
          <div>
            <span className="text-[11px] font-medium text-slate-500 block">Day Close</span>
            <span className="text-xs font-bold block mt-0.5">
              {dayClosed ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Closed
                </span>
              ) : (
                <span className="text-amber-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Open
                </span>
              )}
            </span>
          </div>
          <Clock className="w-4 h-4 text-slate-400" />
        </Link>

        <Link
          to="/admin/fees/defaulters"
          className="bg-white border border-[#E6EAF3] rounded-xl p-3 shadow-2xs hover:border-purple-300 transition-colors flex items-center justify-between"
        >
          <div>
            <span className="text-[11px] font-medium text-slate-500 block">Promised today</span>
            <span className="text-base font-bold text-slate-900 tabular-nums">{promisedTodayCount}</span>
          </div>
          <Calendar className="w-4 h-4 text-purple-600" />
        </Link>
      </div>

      {/* ─── D. Quick Actions Area ───────────────────────────────────────── */}
      <div className="bg-white border border-[#E6EAF3] rounded-2xl p-5 shadow-xs">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3.5">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <Link
            to="/admin/fees/collect"
            className="group flex flex-col p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center mb-2 group-hover:bg-[#2158E0] group-hover:text-white transition-colors">
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 group-hover:text-[#2158E0]">Collect Fee</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Receive counter payments</span>
          </Link>

          <Link
            to="/admin/fees/dues"
            className="group flex flex-col p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center mb-2 group-hover:bg-[#2158E0] group-hover:text-white transition-colors">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 group-hover:text-[#2158E0]">Assign Dues</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Generate class fees</span>
          </Link>

          <Link
            to="/admin/fees/invoices"
            className="group flex flex-col p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center mb-2 group-hover:bg-[#2158E0] group-hover:text-white transition-colors">
              <Receipt className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 group-hover:text-[#2158E0]">View Invoices</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Browse student invoices</span>
          </Link>

          <Link
            to="/admin/fees/setup/structures"
            className="group flex flex-col p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center mb-2 group-hover:bg-[#2158E0] group-hover:text-white transition-colors">
              <Grid3X3 className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 group-hover:text-[#2158E0]">Fee Structures</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Class fee matrix</span>
          </Link>

          <Link
            to="/admin/fees/receipts"
            className="group flex flex-col p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center mb-2 group-hover:bg-[#2158E0] group-hover:text-white transition-colors">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 group-hover:text-[#2158E0]">View Receipts</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Receipt register & reprint</span>
          </Link>

          <Link
            to="/admin/fees/defaulters"
            className="group flex flex-col p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-2 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 group-hover:text-amber-700">Manage Defaulters</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Aging & reminders</span>
          </Link>
        </div>
      </div>

      {/* ─── E & F. Main Content Split: Overview & Outstanding ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* E. Fee Collection Overview (Recent Transactions) — 8 columns on lg */}
        <div className="lg:col-span-8 bg-white border border-[#E6EAF3] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#141A2E] font-display">Fee Collection Overview</h2>
              <p className="text-[11px] text-[#5B6478]">Most recent receipts recorded across all collection points</p>
            </div>
            <Link
              to="/admin/fees/receipts"
              className="text-xs font-semibold text-[#2158E0] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-slate-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-200">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">No fee transactions recorded yet</h4>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1">
                  Once payments are recorded through Counter Collection or Online Payment gateways, receipts will appear here.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/admin/fees/collect")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2158E0] text-white text-xs font-semibold rounded-xl hover:bg-[#1A46B8] transition-colors cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Collect First Fee</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[#5B6478] font-semibold">
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Receipt / Adm No</th>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Payment Method</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {recentTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      onClick={() => navigate("/admin/fees/receipts")}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {tx.student_name}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono text-[#2158E0] font-medium block">
                          {tx.receipt_no}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {tx.admission_no}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{tx.class_name}</td>
                      <td className="py-3 px-3 font-bold tabular-nums text-slate-900">
                        {fmt(tx.total_paise)}
                      </td>
                      <td className="py-3 px-3 capitalize">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {tx.payment_mode}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 tabular-nums">
                        {formatDate(tx.receipt_date)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {tx.status === "active" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : tx.status === "cancelled" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                            Cancelled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            {tx.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* F. Outstanding Fees Grouped by Class — 4 columns on lg */}
        <div className="lg:col-span-4 bg-white border border-[#E6EAF3] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#141A2E] font-display">Outstanding by Class</h2>
              <p className="text-[11px] text-[#5B6478]">Pending balances grouped by grade</p>
            </div>
            <Link
              to="/admin/fees/dues"
              className="text-xs font-semibold text-[#2158E0] hover:underline"
            >
              View Dues
            </Link>
          </div>

          {/* Overdue alert indicator */}
          {overduePaise > 0 && (
            <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="text-xs font-semibold text-red-800">Overdue Balances</span>
              </div>
              <span className="text-xs font-bold text-red-800 tabular-nums">{fmt(overduePaise)}</span>
            </div>
          )}

          {loading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-9 bg-slate-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : classOutstanding.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-75" />
              <div className="text-xs font-bold text-slate-800">No outstanding dues</div>
              <p className="text-[11px] text-slate-400">All student dues are paid or have not yet been assigned.</p>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
              {classOutstanding.map((item) => {
                const percent = outstandingPaise > 0
                  ? Math.min(100, Math.round((item.amountPaise / outstandingPaise) * 100))
                  : 0;

                return (
                  <div
                    key={item.className}
                    onClick={() => navigate(`/admin/fees/dues?class=${encodeURIComponent(item.className)}`)}
                    className="p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer space-y-1.5"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-800">{item.className}</span>
                      <span className="font-bold text-slate-900 tabular-nums">{fmt(item.amountPaise)}</span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#2158E0] h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(5, percent)}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>{item.studentCount} student{item.studentCount !== 1 ? "s" : ""} with dues</span>
                      <span>{percent}% of total</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
