import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  IndianRupee,
  Clock,
  Users,
  Mail,
  Send,
  FileText,
  Download,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  MessageSquare,
  History,
  X,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import {
  loadDuesAndRemindersData,
  getReminderTemplates,
} from "../../../services/duesRemindersService";
import { exportToCSV } from "../../../services/feeReportsService";
import { SendRemindersDrawer } from "../../../components/admin/fees/SendRemindersDrawer";
import { ReminderTemplatesModal } from "../../../components/admin/fees/ReminderTemplatesModal";
import { ReminderHistoryModal } from "../../../components/admin/fees/ReminderHistoryModal";
import { StudentFollowupModal } from "../../../components/admin/fees/StudentFollowupModal";
import { InvoiceDetailModal } from "../../../components/admin/fees/InvoiceDetailModal";
import type {
  DuesReminderRow,
  DuesSummaryMetrics,
  ReminderTemplate,
  QuickFilterType,
  SendRemindersResult,
} from "../../../types/duesReminders";
import type { StudentInvoice } from "../../../types/fees";

export default function DuesRemindersPage() {
  const { school } = useAuth() as any;
  const schoolId = school?.id || "";
  const schoolName = school?.name || "School";
  const navigate = useNavigate();

  // Primary data states
  const [loading, setLoading] = useState<boolean>(true);
  const [rows, setRows] = useState<DuesReminderRow[]>([]);
  const [metrics, setMetrics] = useState<DuesSummaryMetrics>({
    totalOutstandingPaise: 0,
    pendingInvoicesCount: 0,
    overduePaise: 0,
    overdueInvoicesCount: 0,
    studentsWithDuesCount: 0,
    totalStudentsCount: 0,
    remindersPendingCount: 0,
  });
  const [templates, setTemplates] = useState<ReminderTemplate[]>([]);

  // Metadata dropdowns
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string }[]>([]);
  const [classesList, setClassesList] = useState<{ id: string; name: string }[]>([]);
  const [sectionsList, setSectionsList] = useState<{ id: string; name: string; class_id: string }[]>([]);
  const [termsList, setTermsList] = useState<{ id: string; name: string }[]>([]);

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("2025–2026");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [selectedDueStatus, setSelectedDueStatus] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [activeChip, setActiveChip] = useState<QuickFilterType>("all");

  // Selection & Pagination state
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(8);

  // Modals & Drawers
  const [isSendDrawerOpen, setIsSendDrawerOpen] = useState<boolean>(false);
  const [drawerPreSelectedIds, setDrawerPreSelectedIds] = useState<string[]>([]);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [historyTargetStudentId, setHistoryTargetStudentId] = useState<string | undefined>();
  const [historyTargetInvoiceNo, setHistoryTargetInvoiceNo] = useState<string | undefined>();
  const [selectedFollowupRow, setSelectedFollowupRow] = useState<DuesReminderRow | null>(null);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState<StudentInvoice | null>(null);

  // Active row dropdown action menu
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Success toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load Data
  const loadData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [res, tpls] = await Promise.all([
        loadDuesAndRemindersData(schoolId),
        getReminderTemplates(schoolId),
      ]);

      setRows(res.rows || []);
      setMetrics(res.metrics || {
        totalOutstandingPaise: 0,
        pendingInvoicesCount: 0,
        overduePaise: 0,
        overdueInvoicesCount: 0,
        studentsWithDuesCount: 0,
        totalStudentsCount: 0,
        remindersPendingCount: 0,
      });

      setTemplates(tpls);
      setAcademicYears(res.academicYears);
      setClassesList(res.classes);
      setSectionsList(res.sections);
      setTermsList(res.terms);
    } catch (err) {
      console.error("Error loading Dues & Reminders data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

  // Click outside to close action menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenActionMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // 1. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          r.studentName.toLowerCase().includes(q) ||
          r.admissionNo.toLowerCase().includes(q) ||
          r.invoiceNo.toLowerCase().includes(q) ||
          r.parentPhone.includes(q) ||
          r.parentName.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 2. Class filter
      if (selectedClass !== "all" && r.className !== selectedClass) return false;

      // 3. Section filter
      if (selectedSection !== "all" && r.sectionName !== selectedSection) return false;

      // 4. Period filter
      if (selectedPeriod !== "all" && r.billingPeriod !== selectedPeriod) return false;

      // 5. Due Status filter dropdown
      if (selectedDueStatus !== "all") {
        if (selectedDueStatus === "overdue" && r.status !== "overdue") return false;
        if (selectedDueStatus === "due_today" && r.status !== "due_today") return false;
        if (selectedDueStatus === "due_soon" && r.status !== "due_soon") return false;
        if (selectedDueStatus === "upcoming" && r.status !== "upcoming") return false;
        if (selectedDueStatus === "paid" && r.status !== "paid") return false;
        if (selectedDueStatus === "partial" && r.paidPaise === 0) return false;
      }

      // 6. Quick chip filters
      if (activeChip === "upcoming" && r.status !== "upcoming") return false;
      if (activeChip === "due_today" && r.status !== "due_today") return false;
      if (activeChip === "overdue" && r.status !== "overdue") return false;
      if (activeChip === "partial" && (r.paidPaise === 0 || r.balancePaise === 0)) return false;
      if (activeChip === "unpaid" && r.paidPaise > 0) return false;
      if (activeChip === "reminder_sent" && (r.reminderStatus !== "sent" && r.reminderStatus !== "delivered")) return false;
      if (activeChip === "reminder_pending" && (r.reminderStatus !== "pending" && r.reminderStatus !== "scheduled")) return false;

      return true;
    });
  }, [rows, searchQuery, selectedClass, selectedSection, selectedPeriod, selectedDueStatus, activeChip]);

  // Pagination calculation
  const totalItems = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Clear filters
  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedClass("all");
    setSelectedSection("all");
    setSelectedDueStatus("all");
    setSelectedPeriod("all");
    setActiveChip("all");
    setCurrentPage(1);
  };

  // Row selection
  const handleToggleSelectAll = () => {
    if (selectedRowIds.size === paginatedRows.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(paginatedRows.map((r) => r.id)));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    const next = new Set(selectedRowIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRowIds(next);
  };

  // Open send reminders with custom selection
  const handleOpenSendDrawer = (ids?: string[]) => {
    if (ids && ids.length > 0) {
      setDrawerPreSelectedIds(ids);
    } else if (selectedRowIds.size > 0) {
      setDrawerPreSelectedIds(Array.from(selectedRowIds));
    } else {
      setDrawerPreSelectedIds([]);
    }
    setIsSendDrawerOpen(true);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      "Student Name",
      "Admission No",
      "Class",
      "Invoice No",
      "Billing Period",
      "Gross Amount (Paise)",
      "Paid Amount (Paise)",
      "Balance Due (Paise)",
      "Due Date",
      "Status",
      "Parent Name",
      "Parent Phone",
      "Reminder Status",
    ];

    const data = filteredRows.map((r) => [
      r.studentName,
      r.admissionNo,
      r.classSection,
      r.invoiceNo,
      r.billingPeriod,
      r.netPaise,
      r.paidPaise,
      r.balancePaise,
      r.dueDate,
      r.status,
      r.parentName,
      r.parentPhone,
      r.reminderStatus,
    ]);

    const csvContent = exportToCSV(headers, data);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dues_and_reminders_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle Send Reminder Success
  const handleReminderSuccess = (result: SendRemindersResult) => {
    loadData();
    const count = result.queuedCount + result.scheduledCount;
    setToastMessage(`Successfully queued ${count} reminders!`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  if (!schoolId) {
    return (
      <div className="min-h-[60vh] bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">School Context Required</h2>
        <p className="text-sm text-slate-500 max-w-md">
          Please select or log into an authenticated school context to view and manage dues reminders.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl shadow-lg text-xs font-semibold animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Breadcrumb & Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {/* Breadcrumb: Fee Management > Dues & Reminders */}
          <nav className="flex items-center gap-1.5 text-xs text-[#5B6478] mb-1.5">
            <Link to="/admin/fees" className="hover:text-[#141A2E] transition-colors">
              Fee Management
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[#141A2E] font-semibold">Dues & Reminders</span>
          </nav>

          {/* Title & Subtitle */}
          <h1 className="text-2xl font-bold text-[#141A2E] tracking-tight">Dues & Reminders</h1>
          <p className="text-xs text-[#5B6478] mt-0.5">
            Track outstanding fees and follow up on pending payments.
          </p>
        </div>

        {/* Top Action Buttons (Matches Reference Image) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsTemplatesModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E6EAF3] hover:border-slate-300 hover:bg-slate-50 text-[#141A2E] rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-gray-500" />
            <span>Reminder Templates</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenSendDrawer()}
            className="flex items-center gap-2 px-4 py-2 bg-[#0B7B49] hover:bg-[#096a3e] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Reminders</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SUMMARY CARDS (4 Cards matching Reference Image)
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Outstanding */}
        <div className="p-4 bg-white border border-[#E6EAF3] rounded-2xl shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <span className="text-lg font-bold">₹</span>
            </div>
            <div>
              <p className="text-xs text-[#5B6478] font-medium">Total Outstanding</p>
              <h3 className="text-xl font-bold text-[#141A2E] tracking-tight mt-0.5">
                ₹{(metrics.totalOutstandingPaise / 100).toLocaleString("en-IN")}
              </h3>
              <p className="text-[11px] text-[#5B6478] mt-0.5">
                {metrics.pendingInvoicesCount} invoices pending
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Overdue Amount */}
        <div className="p-4 bg-white border border-[#E6EAF3] rounded-2xl shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0 border border-red-100">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-[#5B6478] font-medium">Overdue Amount</p>
              <h3 className="text-xl font-bold text-red-600 tracking-tight mt-0.5">
                ₹{(metrics.overduePaise / 100).toLocaleString("en-IN")}
              </h3>
              <p className="text-[11px] text-[#5B6478] mt-0.5">
                {metrics.overdueInvoicesCount} invoices overdue
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: Students with Dues */}
        <div className="p-4 bg-white border border-[#E6EAF3] rounded-2xl shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-[#5B6478] font-medium">Students with Dues</p>
              <h3 className="text-xl font-bold text-[#141A2E] tracking-tight mt-0.5">
                {metrics.studentsWithDuesCount}
              </h3>
              <p className="text-[11px] text-[#5B6478] mt-0.5">
                Out of {metrics.totalStudentsCount} students
              </p>
            </div>
          </div>
        </div>

        {/* Card 4: Reminders Pending */}
        <div className="p-4 bg-white border border-[#E6EAF3] rounded-2xl shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-[#5B6478] font-medium">Reminders Pending</p>
              <h3 className="text-xl font-bold text-[#141A2E] tracking-tight mt-0.5">
                {metrics.remindersPendingCount}
              </h3>
              <p className="text-[11px] text-[#5B6478] mt-0.5">
                Scheduled or not sent
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SEARCH AND FILTERS PANEL (Matches Reference Image)
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-2xs space-y-3.5">
        {/* Full-width Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by student name, admission no., invoice no. or parent phone..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Filter Dropdowns Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 items-end">
          {/* Academic Year */}
          <div>
            <label className="block text-[11px] font-semibold text-[#5B6478] mb-1">Academic Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="2025–2026">2025–2026</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.name}>{y.name}</option>
              ))}
            </select>
          </div>

          {/* Class */}
          <div>
            <label className="block text-[11px] font-semibold text-[#5B6478] mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Classes</option>
              {classesList.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
              {/* Fallback standard class numbers */}
              {classesList.length === 0 && (
                <>
                  <option value="10">Class 10</option>
                  <option value="9">Class 9</option>
                  <option value="8">Class 8</option>
                  <option value="7">Class 7</option>
                  <option value="6">Class 6</option>
                </>
              )}
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="block text-[11px] font-semibold text-[#5B6478] mb-1">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Sections</option>
              {sectionsList.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
              {sectionsList.length === 0 && (
                <>
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                </>
              )}
            </select>
          </div>

          {/* Due Status */}
          <div>
            <label className="block text-[11px] font-semibold text-[#5B6478] mb-1">Due Status</label>
            <select
              value={selectedDueStatus}
              onChange={(e) => {
                setSelectedDueStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Status</option>
              <option value="overdue">Overdue</option>
              <option value="due_soon">Due Soon</option>
              <option value="due_today">Due Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="partial">Partially Paid</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {/* Fee Period */}
          <div>
            <label className="block text-[11px] font-semibold text-[#5B6478] mb-1">Fee Period</label>
            <select
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-[#E6EAF3] rounded-xl text-xs text-[#141A2E] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Periods</option>
              <option value="Apr 2025">Apr 2025</option>
              <option value="Jul 2025">Jul 2025</option>
              <option value="Oct 2025">Oct 2025</option>
              <option value="Jan 2026">Jan 2026</option>
              {termsList.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          <div>
            <button
              type="button"
              onClick={handleClearFilters}
              className="w-full py-1.5 px-3 bg-white border border-[#E6EAF3] hover:bg-slate-50 text-[#5B6478] hover:text-[#141A2E] rounded-xl text-xs font-semibold transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Quick Filter Chips Row (Matches Reference Image) */}
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100">
          {[
            { key: "all", label: "All Dues" },
            { key: "upcoming", label: "Upcoming" },
            { key: "due_today", label: "Due Today" },
            { key: "overdue", label: "Overdue" },
            { key: "partial", label: "Partially Paid" },
            { key: "unpaid", label: "Not Paid" },
            { key: "reminder_sent", label: "Reminder Sent" },
            { key: "reminder_pending", label: "Reminder Pending" },
          ].map((chip) => {
            const isActive = activeChip === chip.key;
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => {
                  setActiveChip(chip.key as QuickFilterType);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#0B7B49] text-white shadow-2xs font-semibold"
                    : chip.key === "overdue"
                    ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                    : chip.key === "due_today"
                    ? "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                    : "bg-white border border-[#E6EAF3] text-[#5B6478] hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          OUTSTANDING DUES TABLE (Matches Reference Image)
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-[#E6EAF3] rounded-2xl shadow-2xs overflow-hidden">
        {/* Table Top Header */}
        <div className="px-5 py-4 border-b border-[#E6EAF3] flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-bold text-[#141A2E]">
            Students with Outstanding Dues ({totalItems})
          </h2>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E6EAF3] rounded-xl text-xs font-semibold text-[#5B6478] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="p-1.5 border border-[#E6EAF3] rounded-xl text-gray-500 hover:bg-slate-50 transition-colors"
              title="Reminder History"
            >
              <History className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-[#E6EAF3] text-[11px] font-semibold text-[#5B6478] uppercase tracking-wider">
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={paginatedRows.length > 0 && selectedRowIds.size === paginatedRows.length}
                    onChange={handleToggleSelectAll}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">Student</th>
                <th className="py-3 px-3">Class</th>
                <th className="py-3 px-3">Invoice(s)</th>
                <th className="py-3 px-3 text-right">Total Amount</th>
                <th className="py-3 px-3 text-right">Paid Amount</th>
                <th className="py-3 px-3 text-right">Balance Due</th>
                <th className="py-3 px-3">Due Date</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E6EAF3]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-xs text-gray-400">
                    Loading dues and reminders...
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-xs text-gray-500 space-y-2">
                    <AlertCircle className="w-8 h-8 text-gray-300 mx-auto" />
                    <p className="font-semibold text-gray-700">No records match your selected criteria.</p>
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="text-emerald-700 font-semibold hover:underline"
                    >
                      Clear all filters
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  const isSelected = selectedRowIds.has(row.id);

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? "bg-emerald-50/30" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(row.id)}
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Student with Initials Avatar */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                            style={{ backgroundColor: row.avatarBg, color: "#141A2E" }}
                          >
                            {row.avatarInitials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-[#141A2E] truncate">
                              {row.studentName}
                            </p>
                            <p className="text-[11px] text-[#5B6478] truncate">
                              {row.admissionNo}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Class */}
                      <td className="py-3 px-3 whitespace-nowrap text-xs text-[#141A2E] font-medium">
                        {row.classSection}
                      </td>

                      {/* Invoice(s) & Period */}
                      <td className="py-3 px-3">
                        <p className="font-medium text-xs text-[#141A2E] truncate">
                          {row.invoiceNo}
                        </p>
                        <p className="text-[11px] text-[#5B6478] truncate">
                          {row.billingPeriod}
                        </p>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3 px-3 text-right font-medium text-xs text-[#141A2E] whitespace-nowrap">
                        ₹{(row.netPaise / 100).toLocaleString("en-IN")}
                      </td>

                      {/* Paid Amount */}
                      <td className="py-3 px-3 text-right text-xs text-[#5B6478] whitespace-nowrap">
                        ₹{(row.paidPaise / 100).toLocaleString("en-IN")}
                      </td>

                      {/* Balance Due (Bold) */}
                      <td className="py-3 px-3 text-right font-bold text-xs text-[#141A2E] whitespace-nowrap">
                        ₹{(row.balancePaise / 100).toLocaleString("en-IN")}
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-3 whitespace-nowrap text-xs text-[#141A2E]">
                        {row.dueDate}
                      </td>

                      {/* Status Badges */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {row.status === "overdue" && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200">
                            Overdue
                          </span>
                        )}
                        {row.status === "due_soon" && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Due Soon
                          </span>
                        )}
                        {row.status === "due_today" && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                            Due Today
                          </span>
                        )}
                        {row.status === "upcoming" && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Upcoming
                          </span>
                        )}
                        {row.status === "paid" && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Paid
                          </span>
                        )}
                      </td>

                      {/* Actions Menu */}
                      <td className="py-3 px-4 text-center relative">
                        <button
                          type="button"
                          onClick={() => setOpenActionMenuId(openActionMenuId === row.id ? null : row.id)}
                          className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-slate-100 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Action Menu Dropdown */}
                        {openActionMenuId === row.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-4 top-10 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 text-left text-xs animate-in fade-in duration-150"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                handleOpenSendDrawer([row.id]);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-emerald-700 hover:bg-emerald-50 font-medium"
                            >
                              <Send className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Send Reminder</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                if (row.rawInvoice) {
                                  setSelectedInvoiceDetail(row.rawInvoice);
                                }
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[#141A2E] hover:bg-slate-50 font-medium"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-500" />
                              <span>View Invoice</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                navigate(`/admin/students/${row.studentId}`);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[#141A2E] hover:bg-slate-50 font-medium"
                            >
                              <Eye className="w-3.5 h-3.5 text-purple-500" />
                              <span>View Student</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                setHistoryTargetStudentId(row.studentId);
                                setHistoryTargetInvoiceNo(row.invoiceNo);
                                setIsHistoryModalOpen(true);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[#141A2E] hover:bg-slate-50 font-medium"
                            >
                              <History className="w-3.5 h-3.5 text-amber-500" />
                              <span>Reminder History</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                setSelectedFollowupRow(row);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[#141A2E] hover:bg-slate-50 font-medium border-t border-slate-100"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-teal-500" />
                              <span>Add Follow-up</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            TABLE PAGINATION FOOTER (Matches Reference Image)
           ══════════════════════════════════════════════════════════════════════ */}
        <div className="px-5 py-3.5 border-t border-[#E6EAF3] flex items-center justify-between flex-wrap gap-3 text-xs text-[#5B6478]">
          {/* Showing text */}
          <div>
            Showing{" "}
            <span className="font-bold text-[#141A2E]">
              {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-[#141A2E]">
              {Math.min(currentPage * pageSize, totalItems)}
            </span>{" "}
            of{" "}
            <span className="font-bold text-[#141A2E]">{totalItems}</span> students
          </div>

          {/* Numbered Pagination & Page Size */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {/* Prev */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E6EAF3] hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Page numbers (up to 5 or ellipsis) */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  type="button"
                  onClick={() => setCurrentPage(pg)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                    currentPage === pg
                      ? "border border-emerald-500 text-[#0B7B49] bg-emerald-50/50"
                      : "border border-[#E6EAF3] text-[#5B6478] hover:bg-slate-50"
                  }`}
                >
                  {pg}
                </button>
              ))}

              {totalPages > 5 && (
                <>
                  <span className="px-1 text-gray-400">...</span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold border ${
                      currentPage === totalPages
                        ? "border-emerald-500 text-[#0B7B49] bg-emerald-50/50"
                        : "border-[#E6EAF3] text-[#5B6478] hover:bg-slate-50"
                    }`}
                  >
                    {totalPages}
                  </button>
                </>
              )}

              {/* Next */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E6EAF3] hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Page size select */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-white border border-[#E6EAF3] rounded-lg text-xs text-[#141A2E] focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value={8}>8 per page</option>
                <option value={15}>15 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SIDE DRAWERS & MODALS
         ══════════════════════════════════════════════════════════════════════ */}

      {/* Send Reminders Side Drawer (Right side) */}
      <SendRemindersDrawer
        isOpen={isSendDrawerOpen}
        onClose={() => setIsSendDrawerOpen(false)}
        rows={rows}
        templates={templates}
        schoolId={schoolId}
        schoolName={schoolName}
        preSelectedRowIds={drawerPreSelectedIds}
        onSuccess={handleReminderSuccess}
        onOpenTemplates={() => {
          setIsSendDrawerOpen(false);
          setIsTemplatesModalOpen(true);
        }}
      />

      {/* Reminder Templates Modal */}
      <ReminderTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        templates={templates}
        schoolId={schoolId}
        schoolName={schoolName}
        onTemplatesUpdated={loadData}
      />

      {/* Reminder History Modal */}
      <ReminderHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setHistoryTargetStudentId(undefined);
          setHistoryTargetInvoiceNo(undefined);
        }}
        schoolId={schoolId}
        initialStudentId={historyTargetStudentId}
        initialInvoiceNo={historyTargetInvoiceNo}
      />

      {/* Student Follow-up Note Modal */}
      <StudentFollowupModal
        isOpen={!!selectedFollowupRow}
        onClose={() => setSelectedFollowupRow(null)}
        row={selectedFollowupRow}
        schoolId={schoolId}
        onSaved={loadData}
      />

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        isOpen={!!selectedInvoiceDetail}
        onClose={() => setSelectedInvoiceDetail(null)}
        invoice={selectedInvoiceDetail}
        schoolName={schoolName}
      />
    </div>
  );
}
