/**
 * FeeDashboard — /admin/fees
 * Complete redesign matching reference UI:
 *  A. Page header (title + subtitle + Create Invoice / Collect Payment / More)
 *  B. Compact setup reminder
 *  C. 4 summary stat cards
 *  D. Analytics row (SVG bar chart + SVG donut chart)
 *  E. 4 quick-action cards
 *  F. Two-column tables (recent collections + top pending dues)
 *  G. Receipt slide-over drawer
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  CreditCard,
  IndianRupee,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  FileCheck2,
  Grid3X3,
  X,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Printer,
  ExternalLink,
  Users,
  Bell,
  FileText,
  MoreVertical,
  Plus,
  BarChart3,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { getReceipts, getReceiptById } from "../../../services/collectionService";
import { getFeeHeads, getFeeTerms, getFeeStructures } from "../../../services/feeSetupService";
import { getCurrentAcademicYear } from "../../../services/academicService";
import { generateReceiptHTML } from "../../../lib/receiptTemplate";
import { supabase, isSupabaseConfigured } from "../../../lib/supabase";
import type { FeeReceipt, FeeReceiptItem, FeePayment } from "../../../types/collection";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface TopPendingDue {
  studentId: string;
  studentName: string;
  admissionNo: string;
  className: string;
  balancePaise: number;
  daysPastDue: number;
}

interface MonthlyData {
  month: string;
  label: string;
  collectedPaise: number;
  pendingPaise: number;
}

interface SetupStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  href: string;
  isComplete: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatDateShort(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

function calcDaysOverdue(dueDateStr: string, todayStr: string): number {
  if (!dueDateStr || dueDateStr >= todayStr) return 0;
  return Math.floor(
    (new Date(todayStr).getTime() - new Date(dueDateStr).getTime()) / 86400000
  );
}

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────

function CollectionBarChart({
  data,
  loading,
}: {
  data: MonthlyData[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-end gap-1.5 h-36 px-2 pt-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-slate-100 animate-pulse rounded-t"
            style={{ height: `${20 + ((i * 11) % 75)}%` }}
          />
        ))}
      </div>
    );
  }

  const maxPaise = Math.max(
    ...data.map((d) => d.collectedPaise + d.pendingPaise),
    1
  );
  const chartH = 130;
  const labelH = 20;
  const barW = 22;
  const gap = 6;
  const leftPad = 36;
  const totalW = leftPad + data.length * (barW + gap) - gap + 8;

  const magnitude = Math.pow(10, Math.floor(Math.log10(maxPaise / 100)));
  const yMax = Math.ceil((maxPaise / 100) / magnitude) * magnitude;
  const formatY = (v: number) =>
    v >= 100000
      ? `${(v / 100000).toFixed(0)}L`
      : v >= 1000
      ? `${(v / 1000).toFixed(0)}K`
      : `${v}`;
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${totalW} ${chartH + labelH + 10}`}
        className="w-full"
        style={{ minWidth: `${Math.max(totalW, 280)}px`, maxHeight: "180px" }}
      >
        {yTicks.map((t, i) => {
          const y = chartH - t * chartH;
          return (
            <g key={i}>
              <line
                x1={leftPad}
                y1={y}
                x2={totalW - 4}
                y2={y}
                stroke="#F1F5F9"
                strokeWidth={1}
              />
              <text
                x={leftPad - 4}
                y={y + 3}
                textAnchor="end"
                fontSize={8}
                fill="#94A3B8"
              >
                {formatY(Math.round(t * yMax))}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = leftPad + i * (barW + gap);
          const collH =
            yMax > 0 ? (d.collectedPaise / 100 / yMax) * chartH : 0;
          const pendH =
            yMax > 0 ? (d.pendingPaise / 100 / yMax) * chartH : 0;
          const totH = collH + pendH;
          return (
            <g key={d.month}>
              {pendH > 0 && (
                <rect
                  x={x}
                  y={chartH - totH}
                  width={barW}
                  height={pendH}
                  fill="#BFDBFE"
                  rx={totH > 4 ? 3 : 0}
                />
              )}
              {collH > 0 && (
                <rect
                  x={x}
                  y={chartH - collH}
                  width={barW}
                  height={collH}
                  fill="#22C55E"
                  rx={3}
                />
              )}
              <text
                x={x + barW / 2}
                y={chartH + labelH}
                textAnchor="middle"
                fontSize={8.5}
                fill="#94A3B8"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── SVG Donut Chart ──────────────────────────────────────────────────────────

function DonutChart({
  collected,
  pending,
  overdue,
  loading,
}: {
  collected: number;
  pending: number;
  overdue: number;
  loading: boolean;
}) {
  const pendingNonOverdue = Math.max(0, pending - overdue);
  const total = collected + pending;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-32 h-32 rounded-full bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-2">
        <div className="w-28 h-28 rounded-full border-8 border-slate-100 flex items-center justify-center">
          <span className="text-xs text-slate-400 text-center px-2">No data yet</span>
        </div>
      </div>
    );
  }

  const r = 56;
  const cx = 72;
  const cy = 72;
  const sw = 20;
  const C = 2 * Math.PI * r;

  const cf = collected / total;
  const pf = pendingNonOverdue / total;
  const of = overdue / total;
  const cd = cf * C;
  const pd = pf * C;
  const od = of * C;
  const o0 = C * 0.25;
  const o1 = o0 - cd;
  const o2 = o1 - pd;

  const cpct = Math.round(cf * 100);
  const ppct = Math.round(pf * 100);
  const opct = Math.round(of * 100);

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0">
        <svg viewBox="0 0 144 144" className="w-36 h-36">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F5F9" strokeWidth={sw} />
          {cd > 0.5 && (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#22C55E" strokeWidth={sw}
              strokeDasharray={`${cd} ${C}`} strokeDashoffset={o0} strokeLinecap="round" />
          )}
          {pd > 0.5 && (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#93C5FD" strokeWidth={sw}
              strokeDasharray={`${pd} ${C}`} strokeDashoffset={o1} strokeLinecap="round" />
          )}
          {od > 0.5 && (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F87171" strokeWidth={sw}
              strokeDasharray={`${od} ${C}`} strokeDashoffset={o2} strokeLinecap="round" />
          )}
          <text x={cx} y={cy - 5} textAnchor="middle" fontSize={20} fontWeight="bold" fill="#141A2E"
            fontFamily="system-ui,sans-serif">{cpct}%</text>
          <text x={cx} y={cy + 11} textAnchor="middle" fontSize={9} fill="#5B6478"
            fontFamily="system-ui,sans-serif">Collected</text>
        </svg>
      </div>
      <div className="space-y-3 text-xs">
        {[
          { color: "#22C55E", label: "Collected", amount: collected, pct: cpct },
          { color: "#93C5FD", label: "Pending", amount: pendingNonOverdue, pct: ppct },
          { color: "#F87171", label: "Overdue", amount: overdue, pct: opct },
        ].map((s) => (
          <div key={s.label} className="flex items-start gap-2">
            <span className="w-3 h-3 rounded-full mt-0.5 shrink-0" style={{ background: s.color }} />
            <div>
              <p className="font-semibold text-slate-700">{s.label}</p>
              <p className="text-slate-500 tabular-nums">{fmt(s.amount)} ({s.pct}%)</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export default function FeeDashboard() {
  const { schoolId } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yearId, setYearId] = useState("");
  const [yearLabel, setYearLabel] = useState("Current Year");
  const [todayDate] = useState(new Date().toISOString().split("T")[0]);

  // Metrics
  const [collectedYearPaise, setCollectedYearPaise] = useState(0);
  const [collectedMonthPaise, setCollectedMonthPaise] = useState(0);
  const [collectedLastMonthPaise, setCollectedLastMonthPaise] = useState(0);
  const [outstandingPaise, setOutstandingPaise] = useState(0);
  const [overduePaise, setOverduePaise] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);

  // Setup steps
  const [setupSteps, setSetupSteps] = useState<SetupStep[]>([
    { id: "heads", stepNumber: 1, title: "Fee Categories", description: "Define fee heads", href: "/admin/fees/setup/heads", isComplete: false },
    { id: "terms", stepNumber: 2, title: "Billing Cycles", description: "Configure cycles", href: "/admin/fees/setup/terms", isComplete: false },
    { id: "structures", stepNumber: 3, title: "Fee Structures", description: "Set class fee amounts", href: "/admin/fees/setup/structures", isComplete: false },
    { id: "dues", stepNumber: 4, title: "Assign Dues", description: "Generate student invoices", href: "/admin/fees/dues", isComplete: false },
    { id: "collect", stepNumber: 5, title: "Payment Collection", description: "Receive fee payments", href: "/admin/fees/collect", isComplete: false },
  ]);
  const [setupDismissed, setSetupDismissed] = useState(() => {
    try { return sessionStorage.getItem("myzkool_fee_setup_dismissed") === "true"; } catch { return false; }
  });

  // Chart + table data
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [topPendingDues, setTopPendingDues] = useState<TopPendingDue[]>([]);

  // UI state
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Drawer
  const [selectedTx, setSelectedTx] = useState<RecentTransaction | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerReceipt, setDrawerReceipt] = useState<FeeReceipt | null>(null);
  const [drawerItems, setDrawerItems] = useState<FeeReceiptItem[]>([]);
  const [drawerPayments, setDrawerPayments] = useState<FeePayment[]>([]);

  // Resolve academic year
  useEffect(() => {
    if (!schoolId) return;
    let mounted = true;
    (async () => {
      try {
        const stored = JSON.parse(localStorage.getItem(`myzkool_academic_years_${schoolId}`) || "[]");
        const cur = stored.find((y: any) => y.is_current);
        if (cur?.id && mounted) {
          setYearId(cur.id);
          if (cur.label || cur.name) setYearLabel(cur.label || cur.name);
          return;
        }
      } catch { /* ignore */ }
      try {
        const { academicYear } = await getCurrentAcademicYear(schoolId);
        if (academicYear?.id && mounted) {
          setYearId(academicYear.id);
          const y = academicYear as any;
          if (y.label || y.name) setYearLabel(y.label || y.name);
        }
      } catch { /* ignore */ }
    })();
    return () => { mounted = false; };
  }, [schoolId]);

  // Load all dashboard data
  const loadDashboardData = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);

    try {
      const curMonthPfx = todayDate.slice(0, 7);
      const lastMonthDate = new Date(todayDate);
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
      const lstMonthPfx = lastMonthDate.toISOString().slice(0, 7);

      // 1. Receipts
      const { receipts: allReceipts } = await getReceipts(schoolId, undefined, yearId || undefined);
      const active = allReceipts.filter((r) => r.status === "active");

      let yearSum = 0, monthSum = 0, lastSum = 0;
      for (const r of active) {
        yearSum += r.total_paise;
        if (r.receipt_date.startsWith(curMonthPfx)) monthSum += r.total_paise;
        if (r.receipt_date.startsWith(lstMonthPfx)) lastSum += r.total_paise;
      }
      setCollectedYearPaise(yearSum);
      setCollectedMonthPaise(monthSum);
      setCollectedLastMonthPaise(lastSum);

      // 2. Monthly chart data
      const monthMap: Record<string, { label: string; collectedPaise: number; pendingPaise: number }> = {};
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toISOString().slice(0, 7);
        const label = d.toLocaleDateString("en-IN", { month: "short" });
        monthMap[key] = { label, collectedPaise: 0, pendingPaise: 0 };
      }
      for (const r of active) {
        const key = r.receipt_date.slice(0, 7);
        if (monthMap[key]) monthMap[key].collectedPaise += r.total_paise;
      }

      // 3. Recent transactions (top 10)
      const slice = allReceipts.slice(0, 10);
      const sids = Array.from(new Set(slice.map((r) => r.student_id).filter(Boolean)));
      const rids = slice.map((r) => r.id);
      const sMap: Record<string, { name: string; admission_no: string; class_name: string }> = {};
      const mMap: Record<string, string> = {};

      if (isSupabaseConfigured && sids.length > 0) {
        try {
          const { data: sd } = await supabase
            .from("students")
            .select("id, first_name, last_name, admission_no, classes(name)")
            .eq("school_id", schoolId)
            .in("id", sids);
          if (sd) {
            for (const s of sd as any[]) {
              sMap[s.id] = {
                name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Student",
                admission_no: s.admission_no || "—",
                class_name: s.classes?.name || "Class",
              };
            }
          }
          if (rids.length > 0) {
            const { data: pd } = await supabase
              .from("fee_payments").select("receipt_id, mode").eq("school_id", schoolId).in("receipt_id", rids);
            if (pd) for (const p of pd as any[]) { if (p.receipt_id && !mMap[p.receipt_id]) mMap[p.receipt_id] = p.mode; }
          }
        } catch (e) { console.warn("Student lookup:", e); }
      }
      // localStorage fallback
      try {
        const ls = JSON.parse(localStorage.getItem(`myzkool_students_${schoolId}`) || "[]");
        const lc = JSON.parse(localStorage.getItem(`myzkool_classes_${schoolId}`) || "[]");
        const lp = JSON.parse(localStorage.getItem(`myzkool_fee_payments_${schoolId}`) || "[]");
        for (const s of ls) {
          if (!sMap[s.id]) {
            const cls = lc.find((c: any) => c.id === s.class_id);
            sMap[s.id] = { name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Student", admission_no: s.admission_no || "—", class_name: cls?.name || "Class" };
          }
        }
        for (const p of lp) { if (p.receipt_id && !mMap[p.receipt_id]) mMap[p.receipt_id] = p.mode; }
      } catch { /* ignore */ }

      setRecentTransactions(slice.map((r) => {
        const s = sMap[r.student_id] || { name: "Student", admission_no: "—", class_name: "Class" };
        return {
          id: r.id, receipt_no: r.receipt_no, student_id: r.student_id,
          student_name: s.name, admission_no: s.admission_no, class_name: s.class_name,
          total_paise: r.total_paise,
          payment_mode: mMap[r.id] || r.source || "Cash",
          receipt_date: r.receipt_date, status: r.status,
        };
      }));

      // 4. Dues
      let totalOut = 0, totalOvd = 0, duesCount = 0;
      const topDues: TopPendingDue[] = [];

      if (isSupabaseConfigured) {
        try {
          let q = supabase
            .from("student_dues")
            .select(`id, student_id, balance_paise, due_date, status,
              students(id, first_name, last_name, admission_no, class_id, classes(name))`)
            .eq("school_id", schoolId)
            .in("status", ["pending", "partial"])
            .gt("balance_paise", 0)
            .order("balance_paise", { ascending: false });
          if (yearId) q = q.eq("academic_year_id", yearId);
          const { data: dd } = await q;
          if (dd) {
            duesCount = dd.length;
            const seen = new Set<string>();
            for (const d of dd as any[]) {
              const bal = Number(d.balance_paise) || 0;
              totalOut += bal;
              if (d.due_date && d.due_date < todayDate) totalOvd += bal;
              if (d.due_date && monthMap[d.due_date.slice(0, 7)]) {
                monthMap[d.due_date.slice(0, 7)].pendingPaise += bal;
              }
              if (topDues.length < 6 && !seen.has(d.student_id)) {
                seen.add(d.student_id);
                topDues.push({
                  studentId: d.student_id,
                  studentName: `${d.students?.first_name || ""} ${d.students?.last_name || ""}`.trim() || "Student",
                  admissionNo: d.students?.admission_no || "—",
                  className: d.students?.classes?.name || "Class",
                  balancePaise: bal,
                  daysPastDue: d.due_date ? calcDaysOverdue(d.due_date, todayDate) : 0,
                });
              }
            }
          }
        } catch (e) { console.warn("Dues query:", e); }
      }
      if (duesCount === 0) {
        try {
          const ld = JSON.parse(localStorage.getItem(`myzkool_student_dues_${schoolId}`) || "[]");
          const ls = JSON.parse(localStorage.getItem(`myzkool_students_${schoolId}`) || "[]");
          const lc = JSON.parse(localStorage.getItem(`myzkool_classes_${schoolId}`) || "[]");
          const pnd = ld
            .filter((d: any) => ["pending", "partial"].includes(d.status) && (Number(d.balance_paise) || 0) > 0 && (!yearId || d.academic_year_id === yearId))
            .sort((a: any, b: any) => (Number(b.balance_paise) || 0) - (Number(a.balance_paise) || 0));
          const seen = new Set<string>();
          for (const d of pnd) {
            const bal = Number(d.balance_paise) || 0;
            totalOut += bal;
            if (d.due_date && d.due_date < todayDate) totalOvd += bal;
            if (d.due_date && monthMap[d.due_date.slice(0, 7)]) {
              monthMap[d.due_date.slice(0, 7)].pendingPaise += bal;
            }
            if (topDues.length < 6 && !seen.has(d.student_id)) {
              seen.add(d.student_id);
              const st = ls.find((s: any) => s.id === d.student_id);
              const cls = lc.find((c: any) => c.id === st?.class_id);
              topDues.push({
                studentId: d.student_id,
                studentName: `${st?.first_name || ""} ${st?.last_name || ""}`.trim() || "Student",
                admissionNo: st?.admission_no || "—",
                className: cls?.name || "Class",
                balancePaise: bal,
                daysPastDue: d.due_date ? calcDaysOverdue(d.due_date, todayDate) : 0,
              });
            }
          }
        } catch { /* ignore */ }
      }

      setOutstandingPaise(totalOut);
      setOverduePaise(totalOvd);
      setTopPendingDues(topDues);
      setMonthlyData(Object.entries(monthMap).map(([month, v]) => ({ month, ...v })));

      // 5. Student count
      let sc = 0;
      if (isSupabaseConfigured) {
        try {
          const { count } = await supabase
            .from("students").select("id", { count: "exact", head: true })
            .eq("school_id", schoolId).in("status", ["active", "enrolled"]);
          sc = count || 0;
        } catch { /* ignore */ }
      }
      if (sc === 0) {
        try {
          const ls = JSON.parse(localStorage.getItem(`myzkool_students_${schoolId}`) || "[]");
          sc = ls.filter((s: any) => !["inactive", "left"].includes(s.status)).length;
        } catch { /* ignore */ }
      }
      setTotalStudents(sc);

      // 6. Setup steps
      const [hr, tr, sr] = await Promise.all([
        getFeeHeads(schoolId, true).catch(() => ({ heads: [] })),
        getFeeTerms(schoolId, yearId || undefined).catch(() => ({ terms: [] })),
        getFeeStructures(schoolId, yearId || undefined).catch(() => ({ structures: [] })),
      ]);
      setSetupSteps((prev) => [
        { ...prev[0], isComplete: (hr.heads || []).length > 0 },
        { ...prev[1], isComplete: (tr.terms || []).length > 0 },
        { ...prev[2], isComplete: (sr.structures || []).length > 0 },
        { ...prev[3], isComplete: duesCount > 0 },
        { ...prev[4], isComplete: allReceipts.length > 0 },
      ]);
    } catch (err: any) {
      console.error("Fee dashboard error:", err);
      setError(err?.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [schoolId, yearId, todayDate]);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  // Setup helpers
  const completedCount = setupSteps.filter((s) => s.isComplete).length;
  const isSetupComplete = completedCount === setupSteps.length;
  const currentStep = setupSteps.find((s) => !s.isComplete) || setupSteps[0];
  const handleDismissSetup = () => {
    setSetupDismissed(true);
    try { sessionStorage.setItem("myzkool_fee_setup_dismissed", "true"); } catch { /* ignore */ }
  };

  // Month-over-month change
  const monthChange =
    collectedLastMonthPaise > 0
      ? Math.round(((collectedMonthPaise - collectedLastMonthPaise) / collectedLastMonthPaise) * 100)
      : null;

  // Drawer
  const handleOpenTransaction = async (tx: RecentTransaction) => {
    setSelectedTx(tx);
    if (!schoolId) return;
    setDrawerLoading(true);
    try {
      const res = await getReceiptById(schoolId, tx.id);
      if (res.receipt) setDrawerReceipt(res.receipt);
      if (res.items) setDrawerItems(res.items);
      if (res.payments) setDrawerPayments(res.payments);
    } catch (e) { console.warn("Drawer load:", e); }
    finally { setDrawerLoading(false); }
  };
  const handleCloseDrawer = () => {
    setSelectedTx(null); setDrawerReceipt(null); setDrawerItems([]); setDrawerPayments([]);
  };
  const handlePrintReceipt = (paper: "a5" | "thermal80" = "a5") => {
    if (!drawerReceipt || !selectedTx) return;
    try {
      const html = generateReceiptHTML(
        drawerReceipt, drawerItems, drawerPayments,
        { student_name: selectedTx.student_name, admission_no: selectedTx.admission_no },
        { name: "MyZkool School" }, paper, (drawerReceipt.print_count ?? 0) > 0
      );
      const w = window.open("", "_blank");
      if (!w) return;
      w.document.write(html); w.document.close(); w.focus(); w.print();
    } catch (e) { console.error("Print:", e); }
  };

  // Overdue badge helper
  const overdueBadge = (days: number) => {
    if (days >= 45) return "bg-red-100 text-red-700";
    if (days >= 30) return "bg-orange-100 text-orange-700";
    if (days >= 15) return "bg-amber-100 text-amber-700";
    if (days > 0) return "bg-yellow-100 text-yellow-700";
    return "bg-slate-100 text-slate-500";
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* A. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#141A2E]">Fee Management</h1>
          <p className="text-sm text-[#5B6478] mt-0.5">
            Track collections, manage dues and streamline your school's fee process.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Link
            to="/admin/fees/invoices"
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-[#2563EB] border border-[#2563EB] rounded-xl hover:bg-blue-50 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Invoice
          </Link>
          <Link
            to="/admin/fees/collect"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl shadow-sm transition-colors"
          >
            <CreditCard className="w-4 h-4" /> Collect Payment
          </Link>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
              <span className="hidden sm:inline">More</span>
            </button>
            {moreMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMoreMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-[#E6EAF3] rounded-xl shadow-lg z-20 p-1.5">
                  {[
                    { label: "Assign Dues", href: "/admin/fees/dues", icon: FileCheck2 },
                    { label: "Fee Collections", href: "/admin/fees/collections", icon: Receipt },
                    { label: "Defaulters List", href: "/admin/fees/defaulters", icon: AlertTriangle },
                    { label: "Day Close", href: "/admin/fees/day-close", icon: BarChart3 },
                    { label: "Fee Reports", href: "/admin/fees/reports", icon: BarChart3 },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.href} to={item.href} onClick={() => setMoreMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                        <Icon className="w-4 h-4 text-slate-400 shrink-0" /> {item.label}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-3 text-red-800 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => loadDashboardData()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-300 rounded-lg text-xs font-semibold hover:bg-red-50 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* B. Setup Reminder */}
      {!loading && !isSetupComplete && !setupDismissed && (
        <div className="bg-blue-50/80 border border-blue-200/90 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#2563EB] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900">Complete your fee setup to start assigning student dues.</p>
              <p className="text-[11px] text-slate-500">
                Step {currentStep.stepNumber} of 5:{" "}
                <span className="font-medium text-slate-700">{currentStep.title}</span> — {currentStep.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button type="button" onClick={() => navigate(currentStep.href)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors">
              Continue Setup <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={handleDismissSetup}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors" title="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* C. 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Fee Collected */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
            <IndianRupee className="w-5 h-5 text-emerald-600" />
          </div>
          {loading
            ? <div className="h-7 w-28 bg-slate-100 rounded animate-pulse mb-1" />
            : <div className="text-2xl font-bold text-[#141A2E] tabular-nums">{fmt(collectedYearPaise)}</div>
          }
          <p className="text-xs text-slate-400 mt-1">Total Fee Collected</p>
          {!loading && monthChange !== null && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${monthChange >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {monthChange >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {monthChange >= 0 ? "+" : ""}{monthChange}% from last month
            </div>
          )}
        </div>

        {/* Pending Dues */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-blue-500" />
          </div>
          {loading
            ? <div className="h-7 w-28 bg-slate-100 rounded animate-pulse mb-1" />
            : <div className="text-2xl font-bold text-[#141A2E] tabular-nums">{fmt(Math.max(0, outstandingPaise - overduePaise))}</div>
          }
          <p className="text-xs text-slate-400 mt-1">Pending Dues</p>
          {!loading && outstandingPaise > 0 && (
            <div className="flex items-center gap-1 mt-2 text-xs font-semibold text-amber-600">
              <TrendingUp className="w-3.5 h-3.5" /> Needs follow-up
            </div>
          )}
        </div>

        {/* Overdue Fees */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          {loading
            ? <div className="h-7 w-24 bg-slate-100 rounded animate-pulse mb-1" />
            : <div className="text-2xl font-bold text-red-500 tabular-nums">{fmt(overduePaise)}</div>
          }
          <p className="text-xs text-slate-400 mt-1">Overdue (30+ days)</p>
          {!loading && overduePaise > 0 && (
            <div className="flex items-center gap-1 mt-2 text-xs font-semibold text-red-500">
              <TrendingUp className="w-3.5 h-3.5" /> Immediate action needed
            </div>
          )}
        </div>

        {/* Total Students */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-purple-500" />
          </div>
          {loading
            ? <div className="h-7 w-16 bg-slate-100 rounded animate-pulse mb-1" />
            : <div className="text-2xl font-bold text-[#141A2E] tabular-nums">{totalStudents.toLocaleString("en-IN")}</div>
          }
          <p className="text-xs text-slate-400 mt-1">Total Students</p>
          {!loading && totalStudents > 0 && (
            <p className="text-xs text-slate-400 mt-2">Active enrollment</p>
          )}
        </div>
      </div>

      {/* D. Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Bar Chart */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#141A2E]">Collection Overview</h2>
              <p className="text-xs text-slate-400 mt-0.5">Monthly fee collection trend</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2.5 rounded bg-[#22C55E] inline-block" /> Collected
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2.5 rounded bg-[#BFDBFE] inline-block" /> Pending
              </span>
            </div>
          </div>
          <CollectionBarChart data={monthlyData} loading={loading} />
        </div>

        {/* Donut Chart */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#141A2E]">Fee Collection Status</h2>
              <span className="text-xs text-slate-400">{yearLabel}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Academic year breakdown</p>
          </div>
          <DonutChart
            collected={collectedYearPaise}
            pending={outstandingPaise}
            overdue={overduePaise}
            loading={loading}
          />
        </div>
      </div>

      {/* E. Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: "Generate Fee Invoices", desc: "Create invoices for students in bulk or individually", icon: FileText, bg: "bg-blue-50", ic: "text-blue-500", border: "border-blue-100", href: "/admin/fees/invoices" },
          { label: "Record Payment", desc: "Collect fee payment and generate receipt", icon: CreditCard, bg: "bg-emerald-50", ic: "text-emerald-500", border: "border-emerald-100", href: "/admin/fees/collect" },
          { label: "Manage Fee Structure", desc: "Create and manage class-wise fee structures", icon: Grid3X3, bg: "bg-red-50", ic: "text-red-500", border: "border-red-100", href: "/admin/fees/setup/structures" },
          { label: "Send Reminders", desc: "Send payment reminders to parents via WhatsApp", icon: Bell, bg: "bg-amber-50", ic: "text-amber-500", border: "border-amber-100", href: "/admin/fees/defaulters" },
        ].map((a) => {
          const Icon = a.icon;
          return (
            <Link key={a.href} to={a.href}
              className={`bg-white rounded-2xl border ${a.border} p-4 flex items-center gap-3 group hover:shadow-md transition-all`}>
              <div className={`w-10 h-10 rounded-xl ${a.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${a.ic}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 group-hover:text-[#2563EB] transition-colors leading-snug">{a.label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">{a.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#2563EB] shrink-0 transition-colors" />
            </Link>
          );
        })}
      </div>

      {/* F. Two-Column Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Fee Collections */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#141A2E]">Recent Fee Collections</h2>
            <Link to="/admin/fees/collections" className="text-xs font-semibold text-[#2563EB] hover:underline">View All</Link>
          </div>
          {loading ? (
            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-9 bg-slate-50 rounded-lg animate-pulse" />)}
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Receipt className="w-8 h-8 text-slate-200 mx-auto" />
              <p className="text-xs text-slate-400">No fee collections yet.</p>
              <Link to="/admin/fees/collect"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] text-white text-xs font-semibold rounded-lg hover:bg-[#1D4ED8] transition-colors">
                <CreditCard className="w-3.5 h-3.5" /> Collect First Fee
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs min-w-[400px]">
                <thead>
                  <tr className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide border-b border-slate-50">
                    <th className="py-2 px-2 text-left">Date</th>
                    <th className="py-2 px-2 text-left">Student</th>
                    <th className="py-2 px-2 text-left">Class</th>
                    <th className="py-2 px-2 text-right">Amount</th>
                    <th className="py-2 px-2 text-left hidden sm:table-cell">Mode</th>
                    <th className="py-2 px-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentTransactions.map((tx) => (
                    <tr key={tx.id} onClick={() => handleOpenTransaction(tx)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors">
                      <td className="py-2.5 px-2 text-slate-500 whitespace-nowrap">{formatDateShort(tx.receipt_date)}</td>
                      <td className="py-2.5 px-2">
                        <span className="font-semibold text-slate-800 block truncate max-w-[90px]">{tx.student_name}</span>
                      </td>
                      <td className="py-2.5 px-2 text-slate-500 whitespace-nowrap">{tx.class_name}</td>
                      <td className="py-2.5 px-2 font-bold text-slate-900 tabular-nums text-right whitespace-nowrap">{fmt(tx.total_paise)}</td>
                      <td className="py-2.5 px-2 capitalize text-slate-500 whitespace-nowrap hidden sm:table-cell">{tx.payment_mode}</td>
                      <td className="py-2.5 px-2 text-center">
                        {tx.status === "active"
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Paid</span>
                          : tx.status === "cancelled"
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Cancelled</span>
                          : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />{tx.status}</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Pending Dues */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#141A2E]">Top Pending Dues</h2>
            <Link to="/admin/fees/defaulters" className="text-xs font-semibold text-[#2563EB] hover:underline">View All</Link>
          </div>
          {loading ? (
            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-9 bg-slate-50 rounded-lg animate-pulse" />)}
            </div>
          ) : topPendingDues.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-xs text-slate-400">All payments are up to date.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs min-w-[360px]">
                <thead>
                  <tr className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide border-b border-slate-50">
                    <th className="py-2 px-2 text-left">Student</th>
                    <th className="py-2 px-2 text-left">Class</th>
                    <th className="py-2 px-2 text-right">Pending</th>
                    <th className="py-2 px-2 text-center">Days Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {topPendingDues.map((due, idx) => (
                    <tr key={`${due.studentId}-${idx}`}
                      onClick={() => navigate(`/admin/fees/students/${due.studentId}`)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors">
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                            {due.studentName.charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-800 truncate max-w-[80px] block">{due.studentName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-slate-500 whitespace-nowrap">{due.className}</td>
                      <td className="py-2.5 px-2 font-bold text-slate-900 tabular-nums text-right whitespace-nowrap">{fmt(due.balancePaise)}</td>
                      <td className="py-2.5 px-2 text-center">
                        {due.daysPastDue > 0
                          ? <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${overdueBadge(due.daysPastDue)}`}>{due.daysPastDue} days</span>
                          : <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400">Not due</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* G. Receipt Detail Drawer */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={handleCloseDrawer} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Transaction Details</span>
                <h3 className="text-base font-bold text-slate-900 font-mono">{selectedTx.receipt_no}</h3>
              </div>
              <button type="button" onClick={handleCloseDrawer}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {drawerLoading ? (
                <div className="space-y-4 py-8">
                  {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs text-slate-500">Receipt Status</span>
                    {selectedTx.status === "active"
                      ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active</span>
                      : <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {selectedTx.status}</span>
                    }
                  </div>
                  <div className="space-y-2 border-b border-slate-100 pb-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Student Information</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { label: "Student Name", value: selectedTx.student_name },
                        { label: "Admission No", value: selectedTx.admission_no },
                        { label: "Class", value: selectedTx.class_name },
                        { label: "Payment Date", value: formatDate(selectedTx.receipt_date) },
                      ].map((f) => (
                        <div key={f.label}>
                          <span className="text-slate-400 block text-[11px]">{f.label}</span>
                          <span className="font-semibold text-slate-900">{f.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 border-b border-slate-100 pb-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Summary</h4>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Payment Mode</span>
                        <span className="capitalize font-semibold text-slate-800">{selectedTx.payment_mode}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-2">
                        <span className="text-slate-900">Total Collected</span>
                        <span className="text-[#2563EB] tabular-nums">{fmt(selectedTx.total_paise)}</span>
                      </div>
                    </div>
                  </div>
                  {drawerItems.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fee Breakdown</h4>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                        {drawerItems.map((item, idx) => (
                          <div key={idx} className="p-2.5 flex justify-between items-center">
                            <div>
                              <span className="font-semibold text-slate-800 block">{item.fee_head_name || "Tuition Fee"}</span>
                              {item.remarks && <span className="text-[10px] text-slate-400">{item.remarks}</span>}
                            </div>
                            <span className="font-semibold text-slate-900 tabular-nums">{fmt(item.amount_paise)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
              <button type="button" onClick={() => handlePrintReceipt("a5")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer">
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </button>
              <Link to="/admin/fees/collections"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors">
                Collections Register <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
