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
  ShieldAlert, Banknote, RefreshCw, FileText
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { getReceipts } from "../../../services/collectionService";
import { getStudentDues } from "../../../services/feeDuesService";
import { getOutstandingReport } from "../../../services/feeReportsService";
import { getCheques } from "../../../services/chequeService";
import { getFollowups } from "../../../services/reminderJob";
import { isBusinessDateClosed } from "../../../services/dayCloseService";
import { getPendingCount } from "../../../services/approvalService";
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

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">Fee Operations</h1>
          <p className="text-xs text-slate-500">Live dashboard, collection metrics, and risk monitoring</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => navigate("/admin/fees/collect")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2158E0] text-white text-xs font-semibold hover:bg-[#1A46B8] transition-colors cursor-pointer shadow-xs"
          >
            <CreditCard className="w-3.5 h-3.5" /> Collect fee
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/fees/dues-report")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E6EAF3] bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5 text-amber-600" /> Send reminders
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/fees/reports")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E6EAF3] bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" /> Reports
          </button>
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
