/**
 * FeeDashboard — /admin/fees
 * Spec B5.1:
 * Answers: what needs action, how much has come in, where is the money stuck.
 * 
 * 1. Action row: cheques to deposit, approvals pending, day not closed, promised payment today.
 * 2. Collection panel: today, this week, this month collected vs expected; progress bar for year; mode split.
 * 3. Where is the money stuck: outstanding by class (horizontal bars), aging buckets (0-30, 31-60, 61-90, 90+).
 * 4. Recent receipts: last 10 with number, student, amount, mode, collector.
 * 5. Primary action buttons: "Collect fee", "Send reminders".
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CreditCard, IndianRupee, Bell, AlertTriangle, CheckCircle2, Clock,
  Calendar, Users, ArrowUpRight, TrendingUp, BarChart3, CheckSquare,
  ShieldAlert, Banknote, RefreshCw, FileText, Settings, Layers, Grid3X3,
  PlusCircle, Sparkles, ArrowRight, ChevronRight, Percent, Sliders
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { FeeNavHeader } from "../../../components/admin/fees/FeeNavHeader";
import { getReceipts } from "../../../services/collectionService";
import { getStudentDues } from "../../../services/feeDuesService";
import { getOutstandingReport } from "../../../services/feeReportsService";
import { getCheques } from "../../../services/chequeService";
import { getFollowups } from "../../../services/reminderJob";
import { isBusinessDateClosed } from "../../../services/dayCloseService";
import { getPendingCount } from "../../../services/approvalService";
import { getFeeStructures } from "../../../services/feeSetupService";
import { formatPaise } from "../../../lib/amountInWords";
import type { FeeReceipt } from "../../../types/collection";
import type { OutstandingReportRow } from "../../../types/feeOperations";

function fmt(paise: number): string {
  return "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default function FeeDashboard() {
  const { schoolId } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [yearId, setYearId] = useState("");
  const [todayDate, setTodayDate] = useState(new Date().toISOString().split("T")[0]);
  const [structureCount, setStructureCount] = useState<number | null>(null);
  const [forceShowDashboard, setForceShowDashboard] = useState(false);

  // Action counts
  const [pendingChequesCount, setPendingChequesCount] = useState(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [dayClosed, setDayClosed] = useState(false);
  const [promisedTodayCount, setPromisedTodayCount] = useState(0);

  // Collections
  const [todayCollectedPaise, setTodayCollectedPaise] = useState(0);
  const [monthCollectedPaise, setMonthCollectedPaise] = useState(0);
  const [yearCollectedPaise, setYearCollectedPaise] = useState(0);
  const [yearTotalDemandPaise, setYearTotalDemandPaise] = useState(0);
  const [modeBreakdown, setModeBreakdown] = useState<Record<string, number>>({});

  // Outstanding & Aging
  const [agingCounts, setAgingCounts] = useState({
    "0_30": 0,
    "31_60": 0,
    "61_90": 0,
    "90_plus": 0,
  });
  const [classOutstanding, setClassOutstanding] = useState<Record<string, number>>({});
  const [recentReceipts, setRecentReceipts] = useState<FeeReceipt[]>([]);

  useEffect(() => {
    if (!schoolId) return;
    const years = JSON.parse(localStorage.getItem(`myzkool_academic_years_${schoolId}`) || "[]");
    const cur = years.find((y: any) => y.is_current);
    if (cur) setYearId(cur.id);
  }, [schoolId]);

  const loadData = async () => {
    if (!schoolId) return;
    setLoading(true);

    try {
      // 0. Structures count for onboarding state check
      try {
        const { structures } = await getFeeStructures(schoolId, yearId || undefined);
        setStructureCount(structures.length);
      } catch (err) {
        console.warn("Failed to check fee structures:", err);
        setStructureCount(0);
      }

      // 1. Actions
      const cheques = await getCheques(schoolId);
      setPendingChequesCount(cheques.filter(c => c.status === "received").length);

      const approvalsCount = await getPendingCount(schoolId);
      setPendingApprovalsCount(approvalsCount);

      const isClosed = await isBusinessDateClosed(schoolId, todayDate);
      setDayClosed(isClosed);

      const followupsToday = await getFollowups(schoolId, undefined, true);
      setPromisedTodayCount(followupsToday.length);

      // 2. Receipts & Collections
      const { receipts } = await getReceipts(schoolId);
      const activeReceipts = receipts.filter(r => r.status === "active");
      setRecentReceipts(activeReceipts.slice(0, 10));

      let todaySum = 0;
      let monthSum = 0;
      let yearSum = 0;
      const modes: Record<string, number> = {};

      const currentMonthPrefix = todayDate.slice(0, 7);

      for (const r of activeReceipts) {
        yearSum += r.total_paise;
        if (r.receipt_date === todayDate) todaySum += r.total_paise;
        if (r.receipt_date.startsWith(currentMonthPrefix)) monthSum += r.total_paise;

        const m = r.source || "cash";
        modes[m] = (modes[m] || 0) + r.total_paise;
      }

      setTodayCollectedPaise(todaySum);
      setMonthCollectedPaise(monthSum);
      setYearCollectedPaise(yearSum);
      setModeBreakdown(modes);

      // 3. Outstanding and Dues
      const outstandingRows = await getOutstandingReport(schoolId, { academic_year_id: yearId || undefined });
      const aging = { "0_30": 0, "31_60": 0, "61_90": 0, "90_plus": 0 };
      const classMap: Record<string, number> = {};
      let totalDemand = yearSum;

      for (const row of outstandingRows) {
        aging[row.aging_bucket] = (aging[row.aging_bucket] || 0) + row.total_balance_paise;
        classMap[row.class_name] = (classMap[row.class_name] || 0) + row.total_balance_paise;
        totalDemand += row.total_balance_paise;
      }

      setAgingCounts(aging);
      setClassOutstanding(classMap);
      setYearTotalDemandPaise(totalDemand > 0 ? totalDemand : yearSum);

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId, yearId]);

  const yearProgressPercent = yearTotalDemandPaise > 0
    ? Math.min(100, Math.round((yearCollectedPaise / yearTotalDemandPaise) * 100))
    : 0;

  const isUnconfigured = !loading && (structureCount === 0 || structureCount === null) && yearTotalDemandPaise === 0 && recentReceipts.length === 0 && !forceShowDashboard;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Persistent Fee Module Nav Header */}
      <FeeNavHeader
        title="Fee Operations"
        subtitle="Live dashboard, collection metrics, and risk monitoring"
      />

      {/* 0. First-Time School Setup Experience */}
      {isUnconfigured ? (
        <div className="bg-white border-2 border-blue-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in-50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2158E0] flex items-center justify-center shrink-0 border border-blue-100">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100/70 text-[#2158E0] mb-1">
                  New School Setup
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-display">
                  Your fee system isn't configured yet
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Follow this 5-step roadmap to configure fee heads, set class amounts, generate dues, and start collecting fees.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setForceShowDashboard(true)}
                className="text-xs text-slate-500 hover:text-slate-800 underline px-2 py-1 cursor-pointer"
              >
                View empty metrics
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin/fees/setup")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2158E0] text-white text-xs font-bold hover:bg-[#1A46B8] transition-colors shadow-sm cursor-pointer"
              >
                <span>Start Fee Setup (Step 1)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Step Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Step 1 */}
            <div
              onClick={() => navigate("/admin/fees/setup/heads")}
              className="group bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-2xl p-4 transition-all cursor-pointer flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">1</span>
                  <Layers className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">Fee Categories</h4>
                <p className="text-[11px] text-slate-500 mt-1">Define what you charge (Tuition, Exam, Transport, Lab).</p>
              </div>
              <span className="text-[11px] font-semibold text-blue-600 group-hover:underline flex items-center gap-1">
                Configure <ArrowRight className="w-3 h-3" />
              </span>
            </div>

            {/* Step 2 */}
            <div
              onClick={() => navigate("/admin/fees/setup/terms")}
              className="group bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-2xl p-4 transition-all cursor-pointer flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">2</span>
                  <Calendar className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">Billing Cycles</h4>
                <p className="text-[11px] text-slate-500 mt-1">Set monthly, quarterly, or annual schedules and due dates.</p>
              </div>
              <span className="text-[11px] font-semibold text-blue-600 group-hover:underline flex items-center gap-1">
                Configure <ArrowRight className="w-3 h-3" />
              </span>
            </div>

            {/* Step 3 */}
            <div
              onClick={() => navigate("/admin/fees/setup/structures")}
              className="group bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-2xl p-4 transition-all cursor-pointer flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">3</span>
                  <Grid3X3 className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">Fee Structures</h4>
                <p className="text-[11px] text-slate-500 mt-1">Set the amounts per category per term for each class.</p>
              </div>
              <span className="text-[11px] font-semibold text-blue-600 group-hover:underline flex items-center gap-1">
                Configure <ArrowRight className="w-3 h-3" />
              </span>
            </div>

            {/* Step 4 */}
            <div
              onClick={() => navigate("/admin/fees/dues")}
              className="group bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-2xl p-4 transition-all cursor-pointer flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">4</span>
                  <PlusCircle className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">Assign & Invoices</h4>
                <p className="text-[11px] text-slate-500 mt-1">Bulk generate dues/invoices for students based on structures.</p>
              </div>
              <span className="text-[11px] font-semibold text-blue-600 group-hover:underline flex items-center gap-1">
                Assign Dues <ArrowRight className="w-3 h-3" />
              </span>
            </div>

            {/* Step 5 */}
            <div
              onClick={() => navigate("/admin/fees/collect")}
              className="group bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-2xl p-4 transition-all cursor-pointer flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">5</span>
                  <CreditCard className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">Collect Payment</h4>
                <p className="text-[11px] text-slate-500 mt-1">Collect fees via Cash, UPI or Cheque and print receipts.</p>
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 group-hover:underline flex items-center gap-1">
                Collect <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Quick Actions: Setup vs Daily Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Setup Workflow */}
        <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/40 border border-blue-100/80 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#2158E0] text-white">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Fee Setup Workflow</h3>
                <p className="text-[11px] text-slate-500">Configure structures, heads, rules & settings</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/admin/fees/setup")}
              className="text-xs text-[#2158E0] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              Setup Hub <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            <button
              onClick={() => navigate("/admin/fees/setup/heads")}
              className="flex flex-col text-left p-2.5 rounded-xl bg-white border border-blue-100 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-slate-800">1. Categories</span>
              <span className="text-[10px] text-slate-400">Tuition, exams, bus</span>
            </button>
            <button
              onClick={() => navigate("/admin/fees/setup/terms")}
              className="flex flex-col text-left p-2.5 rounded-xl bg-white border border-blue-100 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-slate-800">2. Billing Cycles</span>
              <span className="text-[10px] text-slate-400">Monthly, quarterly</span>
            </button>
            <button
              onClick={() => navigate("/admin/fees/setup/structures")}
              className="flex flex-col text-left p-2.5 rounded-xl bg-white border border-blue-100 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-slate-800">3. Fee Structures</span>
              <span className="text-[10px] text-slate-400">Class-wise amounts</span>
            </button>
            <button
              onClick={() => navigate("/admin/fees/setup/concessions")}
              className="flex flex-col text-left p-2.5 rounded-xl bg-white border border-blue-100 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-slate-800">4. Discounts</span>
              <span className="text-[10px] text-slate-400">Sibling, RTE, staff</span>
            </button>
            <button
              onClick={() => navigate("/admin/fees/setup/late-fees")}
              className="flex flex-col text-left p-2.5 rounded-xl bg-white border border-blue-100 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-slate-800">5. Late Fees</span>
              <span className="text-[10px] text-slate-400">Grace days & penalties</span>
            </button>
            <button
              onClick={() => navigate("/admin/fees/setup/settings")}
              className="flex flex-col text-left p-2.5 rounded-xl bg-white border border-blue-100 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-slate-800">6. Settings</span>
              <span className="text-[10px] text-slate-400">Prefix, PIN & paper</span>
            </button>
          </div>
        </div>

        {/* Daily Operations */}
        <div className="bg-gradient-to-br from-emerald-50/60 to-teal-50/40 border border-emerald-100/80 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Daily Fee Operations</h3>
                <p className="text-[11px] text-slate-500">Collect fees, assign dues, view receipts & reports</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/admin/fees/collect")}
              className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              Collect Now <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            <button
              onClick={() => navigate("/admin/fees/collect")}
              className="flex flex-col text-left p-2.5 rounded-xl bg-white border border-emerald-100 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-slate-800">Collect Fee</span>
              <span className="text-[10px] text-slate-400">Search & receive pay</span>
            </button>
            <button
              onClick={() => navigate("/admin/fees/dues")}
              className="flex flex-col text-left p-2.5 rounded-xl bg-white border border-emerald-100 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-slate-800">Assign & Invoices</span>
              <span className="text-[10px] text-slate-400">Generate class dues</span>
            </button>
            <button
              onClick={() => navigate("/admin/fees/receipts")}
              className="flex flex-col text-left p-2.5 rounded-xl bg-white border border-emerald-100 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-slate-800">Receipts Register</span>
              <span className="text-[10px] text-slate-400">Print, PDF & WhatsApp</span>
            </button>
            <button
              onClick={() => navigate("/admin/fees/defaulters")}
              className="flex flex-col text-left p-2.5 rounded-xl bg-white border border-emerald-100 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-slate-800">Reminders</span>
              <span className="text-[10px] text-slate-400">Defaulters follow-up</span>
            </button>
            <button
              onClick={() => navigate("/admin/fees/cheques")}
              className="flex flex-col text-left p-2.5 rounded-xl bg-white border border-emerald-100 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-slate-800">Cheque Register</span>
              <span className="text-[10px] text-slate-400">Deposit & clearance</span>
            </button>
            <button
              onClick={() => navigate("/admin/fees/reports")}
              className="flex flex-col text-left p-2.5 rounded-xl bg-white border border-emerald-100 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-slate-800">Fee Reports</span>
              <span className="text-[10px] text-slate-400">Day book & ledger</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. Action Row (Spec B5.1.1) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => navigate("/admin/fees/cheques")}
          className="bg-white border border-[#E6EAF3] rounded-xl p-3.5 shadow-2xs hover:border-blue-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Cheques to deposit</span>
            <CheckSquare className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1.5 tabular-nums">{pendingChequesCount}</div>
        </div>

        <div
          onClick={() => navigate("/admin/approvals")}
          className="bg-white border border-[#E6EAF3] rounded-xl p-3.5 shadow-2xs hover:border-amber-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Approvals pending</span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1.5 tabular-nums">{pendingApprovalsCount}</div>
        </div>

        <div
          onClick={() => navigate("/admin/fees/day-close")}
          className="bg-white border border-[#E6EAF3] rounded-xl p-3.5 shadow-2xs hover:border-emerald-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Day status</span>
            <Clock className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-sm font-bold mt-2">
            {dayClosed ? (
              <span className="text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Closed
              </span>
            ) : (
              <span className="text-amber-700 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Day not closed
              </span>
            )}
          </div>
        </div>

        <div
          onClick={() => navigate("/admin/fees/dues-report?filter=promised_today")}
          className="bg-white border border-[#E6EAF3] rounded-xl p-3.5 shadow-2xs hover:border-purple-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Promised today</span>
            <Calendar className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1.5 tabular-nums">{promisedTodayCount}</div>
        </div>
      </div>

      {/* 2. Collection Panel (Spec B5.1.2) */}
      <div className="bg-white border border-[#E6EAF3] rounded-2xl p-5 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 font-display">Collection Summary</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
            <span className="text-xs text-slate-500 block">Collected Today</span>
            <span className="text-xl font-bold text-slate-900 tabular-nums font-display mt-0.5 block">{fmt(todayCollectedPaise)}</span>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
            <span className="text-xs text-slate-500 block">Collected This Month</span>
            <span className="text-xl font-bold text-slate-900 tabular-nums font-display mt-0.5 block">{fmt(monthCollectedPaise)}</span>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
            <span className="text-xs text-slate-500 block">Year Total Collected</span>
            <span className="text-xl font-bold text-[#1FAE7A] tabular-nums font-display mt-0.5 block">{fmt(yearCollectedPaise)}</span>
          </div>
        </div>

        {/* Progress for Year */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Year collection progress ({fmt(yearCollectedPaise)} of {fmt(yearTotalDemandPaise)})</span>
            <span className="font-semibold text-slate-800">{yearProgressPercent}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-[#2158E0] h-full rounded-full transition-all duration-500"
              style={{ width: `${yearProgressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Where is the money stuck (Spec B5.1.3) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aging Buckets */}
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 font-display">Defaulters Aging Buckets</h2>
            <button
              type="button"
              onClick={() => navigate("/admin/fees/dues-report")}
              className="text-xs text-[#2158E0] hover:underline font-semibold"
            >
              View all
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div
              onClick={() => navigate("/admin/fees/dues-report?bucket=0_30")}
              className="border border-slate-200 rounded-xl p-3 bg-slate-50 hover:bg-blue-50/40 cursor-pointer transition-colors"
            >
              <div className="text-[11px] font-medium text-slate-500">0 - 30 days</div>
              <div className="text-sm font-bold text-slate-800 mt-1 tabular-nums">{fmt(agingCounts["0_30"])}</div>
            </div>

            <div
              onClick={() => navigate("/admin/fees/dues-report?bucket=31_60")}
              className="border border-amber-200 rounded-xl p-3 bg-amber-50/30 hover:bg-amber-50/60 cursor-pointer transition-colors"
            >
              <div className="text-[11px] font-medium text-amber-800">31 - 60 days</div>
              <div className="text-sm font-bold text-amber-900 mt-1 tabular-nums">{fmt(agingCounts["31_60"])}</div>
            </div>

            <div
              onClick={() => navigate("/admin/fees/dues-report?bucket=61_90")}
              className="border border-orange-200 rounded-xl p-3 bg-orange-50/30 hover:bg-orange-50/60 cursor-pointer transition-colors"
            >
              <div className="text-[11px] font-medium text-orange-800">61 - 90 days</div>
              <div className="text-sm font-bold text-orange-900 mt-1 tabular-nums">{fmt(agingCounts["61_90"])}</div>
            </div>

            <div
              onClick={() => navigate("/admin/fees/dues-report?bucket=90_plus")}
              className="border border-red-200 rounded-xl p-3 bg-red-50/30 hover:bg-red-50/60 cursor-pointer transition-colors"
            >
              <div className="text-[11px] font-medium text-red-700">&gt; 90 days</div>
              <div className="text-sm font-bold text-red-800 mt-1 tabular-nums">{fmt(agingCounts["90_plus"])}</div>
            </div>
          </div>
        </div>

        {/* Outstanding by Class Horizontal Bars */}
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-5 shadow-2xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900 font-display">Outstanding by Class</h2>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {Object.keys(classOutstanding).length === 0 ? (
              <div className="text-xs text-slate-400 py-4 text-center">No outstanding class dues.</div>
            ) : (
              Object.entries(classOutstanding).map(([cls, amtVal]) => {
                const amt = Number(amtVal) || 0;
                const totalAging = agingCounts["0_30"] + agingCounts["31_60"] + agingCounts["61_90"] + agingCounts["90_plus"] || 1;
                return (
                  <div
                    key={cls}
                    onClick={() => navigate(`/admin/fees/dues-report?class=${encodeURIComponent(cls)}`)}
                    className="space-y-1 cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700">{cls}</span>
                      <span className="font-bold text-slate-900 tabular-nums">{fmt(amt)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-amber-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(10, (amt / totalAging) * 100))}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 4. Recent Receipts Table (Spec B5.1.4) */}
      <div className="bg-white border border-[#E6EAF3] rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 font-display">Recent Receipts</h2>
          <button
            type="button"
            onClick={() => navigate("/admin/fees/receipts")}
            className="text-xs text-[#2158E0] hover:underline font-semibold"
          >
            All receipts
          </button>
        </div>

        {recentReceipts.length === 0 ? (
          <div className="text-xs text-slate-400 py-6 text-center">No receipts recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 text-left">
                  <th className="py-2 px-3 font-semibold">Receipt No</th>
                  <th className="py-2 px-3 font-semibold">Date</th>
                  <th className="py-2 px-3 font-semibold">Amount</th>
                  <th className="py-2 px-3 font-semibold">Mode</th>
                  <th className="py-2 px-3 font-semibold">Collector</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {recentReceipts.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate("/admin/fees/receipts")}>
                    <td className="py-2.5 px-3 font-mono font-medium text-[#2158E0]">{r.receipt_no}</td>
                    <td className="py-2.5 px-3">{r.receipt_date}</td>
                    <td className="py-2.5 px-3 font-semibold tabular-nums">{fmt(r.total_paise)}</td>
                    <td className="py-2.5 px-3 capitalize">{r.source || "cash"}</td>
                    <td className="py-2.5 px-3 text-slate-500">{r.collected_by || "System"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
