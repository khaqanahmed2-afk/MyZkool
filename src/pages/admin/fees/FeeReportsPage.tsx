/**
 * FeeReportsPage — /admin/fees/reports
 * Production-ready Financial Dashboard & Collection Analytics.
 *
 * Implements:
 * - Breadcrumb: Fee Management > Reports
 * - Header actions: Export PDF, Export Excel, Print, Primary green Generate Report
 * - Global Filters: Academic Year, Date Range, Class, Section, Fee Category, More Filters
 * - 5 Financial Summary KPI Cards (Billed, Collected, Outstanding, Discounts, Collection Rate)
 * - Collection Trend Chart (Triple grouped bars + Collection Rate polyline overlay with dual Y-axes)
 * - Donut Chart: Fee Collection by Payment Method (UPI, Cash, Bank Transfer, Online, Cheque)
 * - Class-wise Collection Summary Table with Export & View All
 * - Outstanding Dues by Aging Histogram with Export
 * - Top Students with Outstanding Dues with Action Drawer/Ledger links
 * - Recent Fee Transactions with Receipt Modal & Payment Method breakdown
 * - Comprehensive multi-section CSV/Excel export & printable PDF generation
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText,
  FileSpreadsheet,
  Printer,
  BarChart3,
  Calendar,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  Download,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Briefcase,
  AlertCircle,
  Tag,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  CreditCard,
  User,
  X,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  getFeeReportsDashboardData,
  exportFeeReportsExcel,
  exportClassWiseCSV,
  exportAgingCSV,
  generateFeeReportPrintHTML,
  FeeReportsDashboardData,
  FeeReportFilters,
  CollectionTrendPoint,
  PaymentMethodBreakdown,
  ClassCollectionSummary,
  AgingBucketSummary,
  TopOutstandingStudent,
  RecentTransactionRow,
} from "../../../services/feeReportsService";
import { formatPaiseCompact } from "../../../lib/amountInWords";
import { ReceiptDetailsModal } from "../../../components/admin/fees/ReceiptDetailsModal";
import { CollectFeeDrawer } from "../../../components/admin/fees/CollectFeeDrawer";
import type { EnrichedTransaction } from "../../../services/feeCollectionsQueryService";

// ─── Format Currency Helper ───────────────────────────────────────────────────

function fmtRupees(paise: number): string {
  return formatPaiseCompact(paise);
}

function fmtLakhs(amount: number): string {
  if (amount === 0) return "₹0";
  const lakhs = amount / 100000;
  if (lakhs >= 1) {
    return Number.isInteger(lakhs) ? `₹${lakhs}L` : `₹${lakhs.toFixed(1)}L`;
  }
  return `₹${(amount / 1000).toFixed(0)}K`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FeeReportsPage() {
  const { schoolId, school } = useAuth();
  const navigate = useNavigate();

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FeeReportsDashboardData | null>(null);

  // Filters State
  const [academicYearId, setAcademicYearId] = useState<string>("year-2025-2026");
  const [dateRangePreset, setDateRangePreset] = useState<string>("apr_mar");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");

  // Advanced "More Filters" Modal State
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("all");
  const [concessionTypeFilter, setConcessionTypeFilter] = useState<string>("all");
  const [agingFilter, setAgingFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Granularity for Trend Chart
  const [trendGranularity, setTrendGranularity] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);

  // All Classes Modal State
  const [showAllClassesModal, setShowAllClassesModal] = useState(false);

  // Modals & Drawers
  const [selectedTransactionForModal, setSelectedTransactionForModal] = useState<EnrichedTransaction | null>(null);
  const [collectDrawerOpen, setCollectDrawerOpen] = useState(false);
  const [collectInitialStudentId, setCollectInitialStudentId] = useState<string | undefined>(undefined);
  const [openStudentMenuId, setOpenStudentMenuId] = useState<string | null>(null);

  // Toast / feedback message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Close menus on outside click
  useEffect(() => {
    const handleDocClick = () => {
      setOpenStudentMenuId(null);
    };
    document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  }, []);

  // Compute Active Advanced Filters Count
  const activeAdvancedFilterCount = useMemo(() => {
    let count = 0;
    if (paymentMethodFilter !== "all") count++;
    if (invoiceStatusFilter !== "all") count++;
    if (concessionTypeFilter !== "all") count++;
    if (agingFilter !== "all") count++;
    if (customStartDate || customEndDate) count++;
    return count;
  }, [paymentMethodFilter, invoiceStatusFilter, concessionTypeFilter, agingFilter, customStartDate, customEndDate]);

  // Load Data
  const loadReports = useCallback(async (isRefresh = false) => {
    if (!schoolId) return;
    if (isRefresh) {
      setGenerating(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const filters: FeeReportFilters = {
        academic_year_id: academicYearId !== "all" ? academicYearId : undefined,
        class_id: selectedClassId !== "all" ? selectedClassId : undefined,
        section_id: selectedSectionId !== "all" ? selectedSectionId : undefined,
        fee_category_id: selectedCategoryId !== "all" ? selectedCategoryId : undefined,
        payment_method: paymentMethodFilter !== "all" ? paymentMethodFilter : undefined,
        invoice_status: invoiceStatusFilter !== "all" ? invoiceStatusFilter : undefined,
        concession_type: concessionTypeFilter !== "all" ? concessionTypeFilter : undefined,
        aging_bucket: agingFilter !== "all" ? agingFilter : undefined,
        date_range: dateRangePreset as any,
        start_date: customStartDate || undefined,
        end_date: customEndDate || undefined,
      };

      const result = await getFeeReportsDashboardData(schoolId, filters, trendGranularity);
      setData(result);
      if (isRefresh) {
        showToast("Fee reports successfully recalculated and refreshed.");
      }
    } catch (err: any) {
      console.error("Error loading fee reports:", err);
      setError(err?.message || "Failed to load fee reports data.");
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  }, [
    schoolId,
    academicYearId,
    selectedClassId,
    selectedSectionId,
    selectedCategoryId,
    paymentMethodFilter,
    invoiceStatusFilter,
    concessionTypeFilter,
    agingFilter,
    dateRangePreset,
    customStartDate,
    customEndDate,
    trendGranularity,
  ]);

  useEffect(() => {
    loadReports(false);
  }, [loadReports]);

  // Export PDF Handler
  const handleExportPDF = () => {
    if (!data) return;
    const schoolName = school?.name || "Sunrise International School";
    const filterDesc = `${dateRangePreset === "apr_mar" ? "Apr 2025 - Mar 2026" : dateRangePreset} | Class: ${selectedClassId}`;
    const html = generateFeeReportPrintHTML(data, schoolName, filterDesc);

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
      }, 300);
    }
  };

  // Export Excel Handler
  const handleExportExcel = () => {
    if (!data) return;
    const schoolName = school?.name || "Sunrise International School";
    const filterDesc = `Academic Year: ${academicYearId}, Range: ${dateRangePreset}, Class: ${selectedClassId}`;
    const csvContent = exportFeeReportsExcel(data, schoolName, filterDesc);

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Fee_Reports_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Financial report exported to Excel CSV format.");
  };

  // Export Class-wise Handler
  const handleExportClassWise = () => {
    if (!data) return;
    const csvContent = exportClassWiseCSV(data.classSummaries);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Class_Wise_Collections_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Class-wise collection report exported.");
  };

  // Export Aging Handler
  const handleExportAging = () => {
    if (!data) return;
    const csvContent = exportAgingCSV(data.agingAnalysis);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Aging_Analysis_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Aging analysis report exported.");
  };

  // Open Receipt Details Modal
  const handleOpenReceiptModal = (row: RecentTransactionRow) => {
    const enriched: EnrichedTransaction = {
      id: row.receipt_id,
      receipt_id: row.receipt_id,
      receipt_no: row.receipt_no,
      receipt_date: row.iso_date.split("T")[0],
      created_at: row.iso_date,
      formatted_date_time: row.date_time,
      student_id: row.student_id,
      student_name: row.student_name,
      admission_no: row.admission_no,
      initials: row.student_name.slice(0, 2).toUpperCase(),
      class_name: "Class",
      section_name: "",
      invoice_numbers: [row.invoice_ref],
      amount_paise: row.amount_paise,
      formatted_amount: fmtRupees(row.amount_paise),
      payment_method: row.payment_method.toLowerCase() as any,
      status: row.status,
    };
    setSelectedTransactionForModal(enriched);
  };

  // Open Collect Drawer for student
  const handleOpenCollectForStudent = (studentId: string) => {
    setCollectInitialStudentId(studentId);
    setCollectDrawerOpen(true);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedClassId("all");
    setSelectedSectionId("all");
    setSelectedCategoryId("all");
    setPaymentMethodFilter("all");
    setInvoiceStatusFilter("all");
    setConcessionTypeFilter("all");
    setAgingFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setDateRangePreset("apr_mar");
    setShowMoreFilters(false);
    showToast("All reporting filters have been reset.");
  };

  return (
    <div className="space-y-6 pb-12 text-[#141A2E] font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#141A2E] text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─── 1. Header & Navigation ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-medium text-[#5B6478] mb-1">
            <span className="hover:text-[#2158E0] transition-colors">Fee Management</span>
            <span className="text-slate-300">›</span>
            <span className="text-[#141A2E] font-semibold">Reports</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#141A2E] tracking-tight font-display">
            Fee Reports
          </h1>
          <p className="text-xs sm:text-sm text-[#5B6478] mt-0.5">
            Financial overview and collection analytics.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E6EAF3] bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Export PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E6EAF3] bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E6EAF3] bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={() => loadReports(true)}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#15803D] hover:bg-[#166534] active:bg-[#14532D] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-75"
          >
            <BarChart3 className={`w-4 h-4 ${generating ? "animate-pulse" : ""}`} />
            <span>{generating ? "Generating..." : "Generate Report"}</span>
          </button>
        </div>
      </div>

      {/* ─── 2. Global Filters Toolbar ─────────────────────────────────────── */}
      <div className="bg-white border border-[#E6EAF3] rounded-2xl p-3.5 sm:p-4 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          {/* Academic Year */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Academic Year
            </label>
            <select
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              className="w-full text-xs font-medium text-[#141A2E] bg-white border border-[#E6EAF3] rounded-xl px-3 py-2 focus:outline-none focus:border-[#15803D] transition-colors"
            >
              <option value="year-2025-2026">2025–2026</option>
              <option value="year-2024-2025">2024–2025</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Date Range
            </label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={dateRangePreset}
                onChange={(e) => setDateRangePreset(e.target.value)}
                className="w-full text-xs font-medium text-[#141A2E] bg-white border border-[#E6EAF3] rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-[#15803D] transition-colors"
              >
                <option value="apr_mar">Apr 2025 – Mar 2026</option>
                <option value="this_month">This Month</option>
                <option value="this_quarter">This Quarter</option>
                <option value="this_week">This Week</option>
                <option value="today">Today</option>
                <option value="all">All Dates</option>
              </select>
            </div>
          </div>

          {/* Class */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Class
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full text-xs font-medium text-[#141A2E] bg-white border border-[#E6EAF3] rounded-xl px-3 py-2 focus:outline-none focus:border-[#15803D] transition-colors"
            >
              <option value="all">All Classes</option>
              <option value="cls-nursery">Nursery</option>
              <option value="cls-lkg">LKG</option>
              <option value="cls-ukg">UKG</option>
              <option value="cls-1">Class 1</option>
              <option value="cls-2">Class 2</option>
              <option value="cls-3">Class 3</option>
              <option value="cls-8">Class 8</option>
              <option value="cls-9">Class 9</option>
              <option value="cls-10">Class 10</option>
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Section
            </label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full text-xs font-medium text-[#141A2E] bg-white border border-[#E6EAF3] rounded-xl px-3 py-2 focus:outline-none focus:border-[#15803D] transition-colors"
            >
              <option value="all">All Sections</option>
              <option value="sec-a">Section A</option>
              <option value="sec-b">Section B</option>
              <option value="sec-c">Section C</option>
            </select>
          </div>

          {/* Fee Category */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Fee Category
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full text-xs font-medium text-[#141A2E] bg-white border border-[#E6EAF3] rounded-xl px-3 py-2 focus:outline-none focus:border-[#15803D] transition-colors"
            >
              <option value="all">All Categories</option>
              <option value="Tuition Fee">Tuition Fee</option>
              <option value="Admission Fee">Admission Fee</option>
              <option value="Transport Fee">Transport Fee</option>
              <option value="Examination Fee">Examination Fee</option>
              <option value="Library Fee">Library Fee</option>
            </select>
          </div>

          {/* More Filters Button */}
          <div>
            <button
              type="button"
              onClick={() => setShowMoreFilters(true)}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                activeAdvancedFilterCount > 0
                  ? "border-[#15803D] bg-emerald-50 text-[#15803D]"
                  : "border-[#E6EAF3] bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>More Filters</span>
              {activeAdvancedFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#15803D] text-white text-[10px] flex items-center justify-center font-bold">
                  {activeAdvancedFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Active Filters Pill Bar */}
        {(selectedClassId !== "all" ||
          selectedSectionId !== "all" ||
          selectedCategoryId !== "all" ||
          activeAdvancedFilterCount > 0) && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 flex-wrap text-xs">
            <span className="text-[11px] font-semibold text-slate-400">Active Filters:</span>
            {selectedClassId !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
                Class: {selectedClassId.replace("cls-", "Grade ")}
                <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setSelectedClassId("all")} />
              </span>
            )}
            {selectedCategoryId !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
                Category: {selectedCategoryId}
                <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setSelectedCategoryId("all")} />
              </span>
            )}
            {paymentMethodFilter !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium capitalize">
                Method: {paymentMethodFilter}
                <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setPaymentMethodFilter("all")} />
              </span>
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-red-600 hover:text-red-700 underline cursor-pointer ml-auto"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* ─── 3. Financial Summary KPI Cards (5 Cards) ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Billed */}
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/60">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Billed</p>
              <p className="text-xl sm:text-2xl font-bold text-[#141A2E] tracking-tight tabular-nums mt-0.5">
                {data ? fmtRupees(data.summary.total_billed_paise) : "₹42,50,000"}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mb-2.5">
            {data ? `${data.summary.invoices_generated_count} invoices generated` : "248 invoices generated"}
          </p>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-lg w-fit border border-emerald-100/60">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>↑ 12%</span>
            <span className="text-[10px] text-emerald-600 font-normal">vs last period</span>
          </div>
        </div>

        {/* Card 2: Total Collected */}
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/60">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Collected</p>
              <p className="text-xl sm:text-2xl font-bold text-[#141A2E] tracking-tight tabular-nums mt-0.5">
                {data ? fmtRupees(data.summary.total_collected_paise) : "₹31,80,000"}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mb-2.5">
            {data ? `${data.summary.payments_received_count} payments received` : "186 payments received"}
          </p>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-lg w-fit border border-emerald-100/60">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>↑ 18%</span>
            <span className="text-[10px] text-emerald-600 font-normal">vs last period</span>
          </div>
        </div>

        {/* Card 3: Outstanding Dues */}
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 border border-rose-100/60">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Outstanding Dues</p>
              <p className="text-xl sm:text-2xl font-bold text-[#141A2E] tracking-tight tabular-nums mt-0.5">
                {data ? fmtRupees(data.summary.outstanding_dues_paise) : "₹10,70,000"}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mb-2.5">
            {data ? `${data.summary.invoices_pending_count} invoices pending` : "62 invoices pending"}
          </p>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50/80 px-2.5 py-1 rounded-lg w-fit border border-rose-100/60">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>↓ 8%</span>
            <span className="text-[10px] text-rose-600 font-normal">vs last period</span>
          </div>
        </div>

        {/* Card 4: Total Discounts */}
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100/60">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Discounts</p>
              <p className="text-xl sm:text-2xl font-bold text-[#141A2E] tracking-tight tabular-nums mt-0.5">
                {data ? fmtRupees(data.summary.total_discounts_paise) : "₹2,15,000"}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mb-2.5">
            {data ? `${data.summary.concessions_applied_count} concessions applied` : "124 concessions applied"}
          </p>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-lg w-fit border border-emerald-100/60">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>↑ 5%</span>
            <span className="text-[10px] text-emerald-600 font-normal">vs last period</span>
          </div>
        </div>

        {/* Card 5: Collection Rate */}
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100/60">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Collection Rate</p>
              <p className="text-xl sm:text-2xl font-bold text-[#141A2E] tracking-tight tabular-nums mt-0.5">
                {data ? `${data.summary.collection_rate_pct}%` : "74.8%"}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mb-2.5">of total billed amount</p>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-lg w-fit border border-emerald-100/60">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>↑ 4.2%</span>
            <span className="text-[10px] text-emerald-600 font-normal">vs last period</span>
          </div>
        </div>
      </div>

      {/* ─── 4. Middle Row: Collection Trend & Payment Methods ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Collection Trend Chart */}
        <div className="lg:col-span-2 bg-white border border-[#E6EAF3] rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-[#141A2E]">Collection Trend</h2>
              <p className="text-[11px] text-[#5B6478]">Monthly performance vs billed and outstanding</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Legend matching reference image */}
              <div className="flex items-center gap-3 text-[11px] text-slate-600 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#BFDBFE]" /> Billed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#15803D]" /> Collected
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#FCA5A5]" /> Outstanding
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#0F5132] ring-2 ring-[#0F5132]/30" /> Rate
                </span>
              </div>

              {/* View toggle */}
              <select
                value={trendGranularity}
                onChange={(e) => setTrendGranularity(e.target.value as any)}
                className="text-xs font-semibold border border-[#E6EAF3] rounded-xl px-2.5 py-1 text-slate-700 bg-white focus:outline-none cursor-pointer"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
          </div>

          {/* SVG Grouped Bar Chart with Line Overlay */}
          <div className="w-full relative">
            {loading ? (
              <div className="h-56 flex items-center justify-center text-xs text-slate-400">
                Loading collection trends...
              </div>
            ) : data && data.trends.length > 0 ? (
              <div className="relative">
                {/* SVG Visual */}
                <svg
                  viewBox="0 0 680 230"
                  className="w-full h-auto overflow-visible select-none"
                  style={{ maxHeight: "230px" }}
                >
                  {/* Grid Lines and Y-Axis Ticks */}
                  {[
                    { val: "₹10L", pct: "100%", y: 20 },
                    { val: "₹7.5L", pct: "75%", y: 65 },
                    { val: "₹5L", pct: "50%", y: 110 },
                    { val: "₹2.5L", pct: "25%", y: 155 },
                    { val: "₹0", pct: "0%", y: 200 },
                  ].map((tick, i) => (
                    <g key={i}>
                      <text x="36" y={tick.y + 4} textAnchor="end" fontSize="9" fill="#94A3B8" fontWeight="500">
                        {tick.val}
                      </text>
                      <line x1="42" y1={tick.y} x2="640" y2={tick.y} stroke="#F1F5F9" strokeWidth="1" />
                      <text x="646" y={tick.y + 4} textAnchor="start" fontSize="9" fill="#94A3B8" fontWeight="500">
                        {tick.pct}
                      </text>
                    </g>
                  ))}

                  {/* Bars & Coordinates */}
                  {(() => {
                    const chartBaseY = 200;
                    const maxAmount = 50000000; // 50 Lakhs scale
                    const usableHeight = 180;
                    const startX = 52;
                    const groupWidth = 46;
                    const barW = 8;
                    const space = 2;

                    // Compute points for line overlay
                    const points: Array<{ x: number; y: number; rate: number; label: string }> = [];

                    const barElements = data.trends.map((item, idx) => {
                      const groupX = startX + idx * groupWidth;

                      const billedH = Math.min(usableHeight, (item.billed_paise / maxAmount) * usableHeight);
                      const collectedH = Math.min(usableHeight, (item.collected_paise / maxAmount) * usableHeight);
                      const outstandingH = Math.min(usableHeight, (item.outstanding_paise / maxAmount) * usableHeight);

                      // Rate Y: 0% at 200, 100% at 20
                      const rateY = chartBaseY - (item.collection_rate_pct / 100) * usableHeight;
                      const centerX = groupX + barW * 1.5 + space;
                      points.push({ x: centerX, y: rateY, rate: item.collection_rate_pct, label: item.label });

                      const isHovered = hoveredTrendIdx === idx;

                      return (
                        <g
                          key={item.key}
                          className="cursor-pointer transition-opacity"
                          onMouseEnter={() => setHoveredTrendIdx(idx)}
                          onMouseLeave={() => setHoveredTrendIdx(null)}
                        >
                          {/* Hover highlight column */}
                          {isHovered && (
                            <rect
                              x={groupX - 4}
                              y={15}
                              width={groupWidth - 4}
                              height={190}
                              fill="#F8FAFC"
                              rx="6"
                              className="opacity-70"
                            />
                          )}

                          {/* 1. Billed Bar (Light Blue) */}
                          <rect
                            x={groupX}
                            y={chartBaseY - billedH}
                            width={barW}
                            height={billedH}
                            fill="#BFDBFE"
                            rx="2"
                          />

                          {/* 2. Collected Bar (Green) */}
                          <rect
                            x={groupX + barW + space}
                            y={chartBaseY - collectedH}
                            width={barW}
                            height={collectedH}
                            fill="#15803D"
                            rx="2"
                          />

                          {/* 3. Outstanding Bar (Soft Red) */}
                          <rect
                            x={groupX + (barW + space) * 2}
                            y={chartBaseY - outstandingH}
                            width={barW}
                            height={outstandingH}
                            fill="#FCA5A5"
                            rx="2"
                          />

                          {/* Month X-Axis Label */}
                          <text
                            x={centerX}
                            y={chartBaseY + 16}
                            textAnchor="middle"
                            fontSize="9"
                            fill={isHovered ? "#15803D" : "#64748B"}
                            fontWeight={isHovered ? "700" : "500"}
                          >
                            {item.label}
                          </text>
                        </g>
                      );
                    });

                    // Build connecting line path
                    const pathD = points.reduce((acc, p, i) => {
                      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                    }, "");

                    return (
                      <>
                        {barElements}

                        {/* Trend Polyline */}
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#0F5132"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Node Dots on Line */}
                        {points.map((p, i) => (
                          <g key={i}>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={hoveredTrendIdx === i ? "4.5" : "3"}
                              fill="#15803D"
                              stroke="#FFFFFF"
                              strokeWidth="1.5"
                            />
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>

                {/* Tooltip on Hover */}
                {hoveredTrendIdx !== null && data.trends[hoveredTrendIdx] && (
                  <div
                    className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#141A2E] text-white text-[11px] p-2.5 rounded-xl shadow-lg border border-slate-700 pointer-events-none z-20 space-y-1 min-w-[150px]"
                  >
                    <div className="font-bold border-b border-slate-700 pb-1 text-slate-200">
                      {data.trends[hoveredTrendIdx].label} Performance
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-blue-300">Billed:</span>
                      <span className="font-bold">{fmtRupees(data.trends[hoveredTrendIdx].billed_paise)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-emerald-300">Collected:</span>
                      <span className="font-bold">{fmtRupees(data.trends[hoveredTrendIdx].collected_paise)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-rose-300">Outstanding:</span>
                      <span className="font-bold">{fmtRupees(data.trends[hoveredTrendIdx].outstanding_paise)}</span>
                    </div>
                    <div className="flex justify-between gap-4 pt-1 border-t border-slate-800 text-emerald-400">
                      <span>Collection Rate:</span>
                      <span className="font-bold">{data.trends[hoveredTrendIdx].collection_rate_pct}%</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-xs text-slate-400">
                No trend data available for selected filters.
              </div>
            )}
          </div>
        </div>

        {/* Right (1 col): Fee Collection by Payment Method */}
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-[#141A2E] mb-1">Fee Collection by Payment Method</h2>
            <p className="text-[11px] text-[#5B6478] mb-4">Confirmed collection breakdown</p>
          </div>

          <div className="flex flex-col items-center justify-center my-auto">
            {/* SVG Donut Chart */}
            <div className="relative shrink-0 mb-4">
              <svg viewBox="0 0 160 160" className="w-40 h-40">
                {/* Background Ring */}
                <circle cx="80" cy="80" r="60" fill="none" stroke="#F1F5F9" strokeWidth="18" />

                {/* Slices: UPI 46%, Cash 26%, Bank Transfer 18%, Online 10%, Cheque 0% */}
                {(() => {
                  const r = 60;
                  const C = 2 * Math.PI * r; // ~376.99
                  let currentOffset = C * 0.25; // start from top

                  return data?.paymentMethods.map((pm) => {
                    if (pm.percentage <= 0) return null;
                    const strokeLen = (pm.percentage / 100) * C;
                    const offset = currentOffset;
                    currentOffset -= strokeLen;

                    return (
                      <circle
                        key={pm.method}
                        cx="80"
                        cy="80"
                        r={r}
                        fill="none"
                        stroke={pm.color}
                        strokeWidth="18"
                        strokeDasharray={`${strokeLen} ${C}`}
                        strokeDashoffset={offset}
                        className="transition-all duration-300 hover:opacity-85"
                      />
                    );
                  });
                })()}

                {/* Center text */}
                <text
                  x="80"
                  y="74"
                  textAnchor="middle"
                  fontSize="16"
                  fontWeight="bold"
                  fill="#141A2E"
                  className="font-display tabular-nums"
                >
                  {data ? fmtRupees(data.totalCollectedForMethodsPaise) : "₹31,80,000"}
                </text>
                <text
                  x="80"
                  y="92"
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="600"
                  fill="#5B6478"
                >
                  Total Collected
                </text>
              </svg>
            </div>

            {/* List breakdown on right/underneath */}
            <div className="w-full space-y-2.5 text-xs">
              {data?.paymentMethods.map((pm) => (
                <div key={pm.method} className="flex items-center justify-between text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: pm.color }} />
                    <span className="font-medium text-slate-700">{pm.label}</span>
                  </div>
                  <div className="flex items-center gap-3 tabular-nums font-semibold">
                    <span>{fmtRupees(pm.amount_paise)}</span>
                    <span className="text-slate-400 font-normal w-8 text-right">{pm.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 5. Row 3: Class-wise Summary & Aging Analysis ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Class-wise Collection Summary (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#E6EAF3] rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="text-base font-bold text-[#141A2E]">Class-wise Collection Summary</h2>
                <p className="text-[11px] text-[#5B6478]">Billing and recovery performance by grade</p>
              </div>
              <button
                type="button"
                onClick={handleExportClassWise}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E6EAF3] bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 font-semibold text-left">
                    <th className="py-2.5 px-2">Class</th>
                    <th className="py-2.5 px-2">Total Billed</th>
                    <th className="py-2.5 px-2">Collected</th>
                    <th className="py-2.5 px-2">Outstanding</th>
                    <th className="py-2.5 px-2 text-right">Collection %</th>
                    <th className="py-2.5 px-2 text-right">Students with Dues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[#141A2E]">
                  {data?.classSummaries.map((c) => (
                    <tr key={c.class_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-2 font-semibold text-slate-800">{c.class_name}</td>
                      <td className="py-3 px-2 tabular-nums">{fmtRupees(c.total_billed_paise)}</td>
                      <td className="py-3 px-2 tabular-nums font-medium text-emerald-700">
                        {fmtRupees(c.collected_paise)}
                      </td>
                      <td className="py-3 px-2 tabular-nums font-semibold text-slate-700">
                        {fmtRupees(c.outstanding_paise)}
                      </td>
                      <td className="py-3 px-2 text-right tabular-nums font-medium">
                        {c.collection_pct.toFixed(1)}%
                      </td>
                      <td className="py-3 px-2 text-right tabular-nums text-slate-500">
                        {c.students_with_dues_count} / {c.total_students_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-2">
            <button
              type="button"
              onClick={() => setShowAllClassesModal(true)}
              className="text-xs font-semibold text-[#15803D] hover:text-[#166534] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>View All Classes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Outstanding Dues by Aging (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-[#E6EAF3] rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-[#141A2E]">Outstanding Dues by Aging</h2>
                <p className="text-[11px] text-[#5B6478]">Overdue balance categorized by invoice maturity</p>
              </div>
              <button
                type="button"
                onClick={handleExportAging}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E6EAF3] bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            </div>

            {/* Visual Histogram Chart */}
            <div className="pt-6 pb-2">
              <div className="grid grid-cols-5 gap-3 items-end h-44 border-b border-slate-100 pb-2">
                {data?.agingAnalysis.map((a) => {
                  const maxAgingAmount = 45000000;
                  const heightPct = Math.max(15, Math.min(100, (a.amount_paise / maxAgingAmount) * 100));

                  return (
                    <div key={a.bucket} className="flex flex-col items-center h-full justify-end group">
                      {/* Floating Amount Badge above bar */}
                      <span className="text-[11px] font-bold text-slate-800 mb-1.5 tabular-nums text-center">
                        {fmtRupees(a.amount_paise)}
                      </span>

                      {/* Bar */}
                      <div
                        className="w-full rounded-t-lg transition-transform group-hover:scale-y-105 origin-bottom shadow-2xs"
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor: a.color,
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Labels and Invoice Counts below each bar */}
              <div className="grid grid-cols-5 gap-3 pt-2 text-center">
                {data?.agingAnalysis.map((a) => (
                  <div key={a.bucket}>
                    <p className="text-[11px] font-semibold text-slate-700 truncate">{a.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{a.invoice_count} invoices</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>As-of date: Today (IST)</span>
            <Link
              to="/admin/fees/defaulters"
              className="text-xs font-semibold text-[#15803D] hover:underline flex items-center gap-1"
            >
              <span>View Defaulters Register</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── 6. Row 4: Top Students with Outstanding Dues & Recent Transactions ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Students with Outstanding Dues */}
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-base font-bold text-[#141A2E]">Top Students with Outstanding Dues</h2>
              <p className="text-[11px] text-[#5B6478]">Highest pending balances requiring immediate followup</p>
            </div>
            <Link
              to="/admin/fees/defaulters"
              className="text-xs font-semibold text-[#15803D] hover:underline"
            >
              View All
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-semibold text-left">
                  <th className="py-2.5 px-2">Student</th>
                  <th className="py-2.5 px-2">Class</th>
                  <th className="py-2.5 px-2">Total Billed</th>
                  <th className="py-2.5 px-2">Paid Amount</th>
                  <th className="py-2.5 px-2">Balance Due</th>
                  <th className="py-2.5 px-2">Due Date</th>
                  <th className="py-2.5 px-2">Status</th>
                  <th className="py-2.5 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[#141A2E]">
                {data?.topOutstandingStudents.map((s) => (
                  <tr key={s.student_id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Student Name with Initials Badge */}
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-[#2158E0] font-bold text-[10px] flex items-center justify-center shrink-0">
                          {s.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{s.student_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">{s.admission_no}</p>
                        </div>
                      </div>
                    </td>

                    {/* Class */}
                    <td className="py-3 px-2 text-slate-700 font-medium">{s.class_name}</td>

                    {/* Total Billed */}
                    <td className="py-3 px-2 tabular-nums">{fmtRupees(s.total_billed_paise)}</td>

                    {/* Paid Amount */}
                    <td className="py-3 px-2 tabular-nums text-slate-500">{fmtRupees(s.paid_amount_paise)}</td>

                    {/* Balance Due */}
                    <td className="py-3 px-2 tabular-nums font-bold text-slate-900">{fmtRupees(s.balance_due_paise)}</td>

                    {/* Due Date */}
                    <td className="py-3 px-2 text-slate-600 whitespace-nowrap">{s.due_date}</td>

                    {/* Status Badge */}
                    <td className="py-3 px-2 whitespace-nowrap">
                      {s.status === "Overdue" ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Overdue
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Due Soon
                        </span>
                      )}
                    </td>

                    {/* Actions Menu */}
                    <td className="py-3 px-2 text-right relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenStudentMenuId(openStudentMenuId === s.student_id ? null : s.student_id);
                        }}
                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Student Actions"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {openStudentMenuId === s.student_id && (
                        <div
                          className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#E6EAF3] rounded-xl shadow-lg z-30 p-1.5 text-left text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setOpenStudentMenuId(null);
                              handleOpenCollectForStudent(s.student_id);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-[#15803D]" />
                            <span>Collect Fee</span>
                          </button>
                          <Link
                            to={`/admin/fees/students/${s.student_id}`}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                          >
                            <User className="w-3.5 h-3.5 text-blue-500" />
                            <span>Student Ledger</span>
                          </Link>
                          <Link
                            to={`/admin/fees/defaulters?search=${encodeURIComponent(s.student_name)}`}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
                            <span>Send Reminder</span>
                          </Link>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Fee Transactions */}
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-base font-bold text-[#141A2E]">Recent Fee Transactions</h2>
              <p className="text-[11px] text-[#5B6478]">Latest receipts issued across cash, bank, UPI, and online</p>
            </div>
            <Link
              to="/admin/fees/collections"
              className="text-xs font-semibold text-[#15803D] hover:underline"
            >
              View All
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-semibold text-left">
                  <th className="py-2.5 px-2">Date & Time</th>
                  <th className="py-2.5 px-2">Receipt No.</th>
                  <th className="py-2.5 px-2">Student</th>
                  <th className="py-2.5 px-2">Amount</th>
                  <th className="py-2.5 px-2">Method</th>
                  <th className="py-2.5 px-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[#141A2E]">
                {data?.recentTransactions.map((t) => (
                  <tr key={t.receipt_id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Date & Time */}
                    <td className="py-3 px-2 text-slate-600 whitespace-nowrap">{t.date_time}</td>

                    {/* Receipt No. Link */}
                    <td className="py-3 px-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenReceiptModal(t)}
                        className="font-semibold text-[#15803D] hover:text-[#166534] hover:underline cursor-pointer"
                        title="View Official Receipt"
                      >
                        {t.receipt_no}
                      </button>
                    </td>

                    {/* Student */}
                    <td className="py-3 px-2 font-medium text-slate-800">{t.student_name}</td>

                    {/* Amount */}
                    <td className="py-3 px-2 tabular-nums font-semibold text-slate-900">
                      {fmtRupees(t.amount_paise)}
                    </td>

                    {/* Payment Method */}
                    <td className="py-3 px-2 text-slate-700">{t.payment_method}</td>

                    {/* Status Badge */}
                    <td className="py-3 px-2 text-right">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Received
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── 7. More Filters Modal ─────────────────────────────────────────── */}
      {showMoreFilters && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-in fade-in duration-200">
          <div className="bg-white border border-[#E6EAF3] rounded-2xl w-full max-w-lg shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#15803D]" />
                <h3 className="font-bold text-sm text-[#141A2E]">Advanced Report Filters</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMoreFilters(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Payment Method */}
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Payment Method</label>
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-[#15803D]"
                >
                  <option value="all">All Payment Methods</option>
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="online">Online Gateway</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              {/* Invoice Status */}
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Invoice Status</label>
                <select
                  value={invoiceStatusFilter}
                  onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-[#15803D]"
                >
                  <option value="all">All Statuses</option>
                  <option value="paid">Paid in Full</option>
                  <option value="partial">Partially Paid</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              {/* Concession Type */}
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Concession Type</label>
                <select
                  value={concessionTypeFilter}
                  onChange={(e) => setConcessionTypeFilter(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-[#15803D]"
                >
                  <option value="all">All Concession Types</option>
                  <option value="sibling">Sibling Discount</option>
                  <option value="rte">RTE 25% Exemption</option>
                  <option value="merit">Merit Scholarship</option>
                  <option value="staff_ward">Staff Ward</option>
                </select>
              </div>

              {/* Aging Bucket */}
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Overdue Aging</label>
                <select
                  value={agingFilter}
                  onChange={(e) => setAgingFilter(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-[#15803D]"
                >
                  <option value="all">All Aging Buckets</option>
                  <option value="not_due">Not Yet Due</option>
                  <option value="1_30">1–30 Days Overdue</option>
                  <option value="31_60">31–60 Days Overdue</option>
                  <option value="61_90">61–90 Days Overdue</option>
                  <option value="90_plus">More than 90 Days</option>
                </select>
              </div>

              {/* Custom Date Range */}
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-[#15803D]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-[#15803D]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Reset Filters
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMoreFilters(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreFilters(false);
                    loadReports(true);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-[#15803D] text-white text-xs font-semibold hover:bg-[#166534] shadow-xs cursor-pointer"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 8. All Classes Modal ─────────────────────────────────────────── */}
      {showAllClassesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-in fade-in duration-200">
          <div className="bg-white border border-[#E6EAF3] rounded-2xl w-full max-w-2xl shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#141A2E]">All Classes Collection Summary</h3>
                <p className="text-[11px] text-slate-500">Comprehensive overview of all classes and sections</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAllClassesModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-96">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 font-semibold text-left">
                    <th className="py-2 px-2">Class</th>
                    <th className="py-2 px-2">Total Billed</th>
                    <th className="py-2 px-2">Collected</th>
                    <th className="py-2 px-2">Outstanding</th>
                    <th className="py-2 px-2 text-right">Collection %</th>
                    <th className="py-2 px-2 text-right">Students with Dues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[#141A2E]">
                  {data?.classSummaries.map((c) => (
                    <tr key={c.class_id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-2 font-semibold text-slate-800">{c.class_name}</td>
                      <td className="py-2.5 px-2 tabular-nums">{fmtRupees(c.total_billed_paise)}</td>
                      <td className="py-2.5 px-2 tabular-nums font-medium text-emerald-700">
                        {fmtRupees(c.collected_paise)}
                      </td>
                      <td className="py-2.5 px-2 tabular-nums font-semibold text-slate-700">
                        {fmtRupees(c.outstanding_paise)}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums font-medium">
                        {c.collection_pct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-slate-500">
                        {c.students_with_dues_count} / {c.total_students_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAllClassesModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 9. Receipt Details Modal ──────────────────────────────────────── */}
      <ReceiptDetailsModal
        transaction={selectedTransactionForModal}
        onClose={() => setSelectedTransactionForModal(null)}
        onCancelled={() => {
          setSelectedTransactionForModal(null);
          loadReports(true);
        }}
      />

      {/* ─── 10. Collect Fee Drawer ───────────────────────────────────────── */}
      <CollectFeeDrawer
        isOpen={collectDrawerOpen}
        onClose={() => {
          setCollectDrawerOpen(false);
          setCollectInitialStudentId(undefined);
        }}
        onSuccess={(rcpNo) => {
          showToast(`Fee receipt ${rcpNo} successfully generated!`);
          setCollectDrawerOpen(false);
          loadReports(true);
        }}
        initialStudentId={collectInitialStudentId}
        academicYearId={academicYearId}
      />
    </div>
  );
}
