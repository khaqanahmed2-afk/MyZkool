import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Search,
  Plus,
  Download,
  Eye,
  Printer,
  Send,
  CreditCard,
  Ban,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
  Layers,
  Upload,
  MoreHorizontal,
  ChevronDown,
  Users,
  IndianRupee,
  Receipt,
  Wallet,
  AlertTriangle,
  Filter,
  CheckSquare,
  Bus,
  Phone,
  MessageSquare,
  Share2,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { FeeNavHeader } from "../../../components/admin/fees/FeeNavHeader";
import { formatPaise } from "../../../lib/amountInWords";
import { generateInvoiceHTML } from "../../../lib/invoiceTemplate";
import {
  getSchoolInvoices,
  cancelInvoice,
  sendInvoiceToParent,
} from "../../../services/invoiceService";
import { getClassesWithSections } from "../../../services/classSectionService";
import { getFeeTerms } from "../../../services/feeSetupService";
import {
  getStudentFeeSummaries,
  exportStudentFeeCSV,
  getWhatsAppFeeMessage,
  generateStudentLedgerHTML,
  getStudentLedgerDetails,
} from "../../../services/studentFeeLedgerService";
import { loadDuesAndRemindersData, DEFAULT_REMINDER_TEMPLATES } from "../../../services/duesRemindersService";
import type {
  StudentFeeSummary,
  StudentFeeSummaryMetrics,
  StudentFeeFilterOptions,
  StudentFeeStatus,
} from "../../../types/studentFeeLedger";
import type {
  StudentInvoice,
  InvoiceSummaryMetrics,
  InvoiceFilters,
  FeeTerm,
} from "../../../types/fees";

// Modals and Drawers
import { CreateInvoiceDrawer } from "../../../components/admin/fees/CreateInvoiceDrawer";
import { BulkGenerateModal } from "../../../components/admin/fees/BulkGenerateModal";
import { ImportInvoicesModal } from "../../../components/admin/fees/ImportInvoicesModal";
import { InvoiceDetailsModal } from "../../../components/admin/fees/InvoiceDetailsModal";
import { CancelInvoiceModal } from "../../../components/admin/fees/CancelInvoiceModal";
import { CollectFeeDrawer } from "../../../components/admin/fees/CollectFeeDrawer";
import { SendRemindersDrawer } from "../../../components/admin/fees/SendRemindersDrawer";
import { StudentFeeLedgerDrawer } from "../../../components/admin/fees/StudentFeeLedgerDrawer";

function getTodayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function formatINR(paise: number): string {
  const rupees = Math.round(paise / 100);
  return "₹" + rupees.toLocaleString("en-IN");
}

function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const raw = dateStr.split("T")[0];
    const parts = raw.split("-");
    if (parts.length === 3) {
      const [y, m, d] = parts;
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthName = months[parseInt(m, 10) - 1] || m;
      return `${d.padStart(2, "0")} ${monthName} ${y}`;
    }
    return dateStr;
  } catch {
    return dateStr || "—";
  }
}

function getInitials(name: string): string {
  if (!name) return "ST";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ST";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_BG_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-purple-100 text-purple-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-indigo-100 text-indigo-700",
  "bg-teal-100 text-teal-700",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_BG_COLORS[Math.abs(hash) % AVATAR_BG_COLORS.length];
}

export default function InvoicesPage() {
  const { school, profile } = useAuth() as any;
  const navigate = useNavigate();
  const schoolId = school?.id || "";
  const schoolName = school?.name || "School";

  // Tab: 'student-wise' vs 'invoice-wise' (Student-wise is active default)
  const [activeTab, setActiveTab] = useState<"student-wise" | "invoice-wise">("student-wise");

  // ───────────────────────────────────────────────────────────────────────────
  // STUDENT-WISE STATE
  // ───────────────────────────────────────────────────────────────────────────
  const [students, setStudents] = useState<StudentFeeSummary[]>([]);
  const [allFilteredStudents, setAllFilteredStudents] = useState<StudentFeeSummary[]>([]);
  const [studentMetrics, setStudentMetrics] = useState<StudentFeeSummaryMetrics>({
    total_students_with_records: 0,
    total_fees_paise: 0,
    total_collected_paise: 0,
    total_pending_paise: 0,
    total_overdue_paise: 0,
    fully_paid_count: 0,
    with_dues_count: 0,
    partially_paid_count: 0,
    upcoming_count: 0,
    overdue_count: 0,
    total_students_count: 0,
    collection_percentage: 0,
    pending_percentage: 0,
    overdue_percentage: 0,
    fully_paid_percentage: 0,
    with_dues_percentage: 0,
  });
  const [studentLoading, setStudentLoading] = useState<boolean>(true);

  // Student Filtering Controls
  const [studentSearch, setStudentSearch] = useState<string>("");
  const [studentClassId, setStudentClassId] = useState<string>("all");
  const [studentSectionId, setStudentSectionId] = useState<string>("all");
  const [studentFeeStatus, setStudentFeeStatus] = useState<string>("all");
  const [studentTransport, setStudentTransport] = useState<"all" | "transport_only" | "non_transport">("all");
  const [quickPill, setQuickPill] = useState<"all" | "with_dues" | "overdue" | "fully_paid" | "partially_paid" | "upcoming">("all");
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
  const [dueDateFrom, setDueDateFrom] = useState<string>("");
  const [dueDateTo, setDueDateTo] = useState<string>("");

  // Student Table Pagination
  const [studentPage, setStudentPage] = useState<number>(1);
  const [studentPageSize, setStudentPageSize] = useState<number>(8);
  const [studentTotalCount, setStudentTotalCount] = useState<number>(0);
  const [studentTotalPages, setStudentTotalPages] = useState<number>(1);

  // Student Row Selection
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Active Dropdown Menus
  const [activeStudentMenuId, setActiveStudentMenuId] = useState<string | null>(null);
  const [isBulkActionsDropdownOpen, setIsBulkActionsDropdownOpen] = useState(false);

  // Modal / Drawer state for Student-wise
  const [drawerStudentId, setDrawerStudentId] = useState<string | null>(null);
  const [isCollectDrawerOpen, setIsCollectDrawerOpen] = useState(false);
  const [collectStudentId, setCollectStudentId] = useState<string | undefined>(undefined);
  const [isSendRemindersOpen, setIsSendRemindersOpen] = useState(false);
  const [reminderRows, setReminderRows] = useState<any[]>([]);

  // ───────────────────────────────────────────────────────────────────────────
  // INVOICE-WISE STATE (Existing preserved)
  // ───────────────────────────────────────────────────────────────────────────
  const [invoices, setInvoices] = useState<StudentInvoice[]>([]);
  const [invoiceMetrics, setInvoiceMetrics] = useState<InvoiceSummaryMetrics>({
    totalInvoicedPaise: 0,
    totalPaidPaise: 0,
    outstandingPaise: 0,
    overdueCount: 0,
    overduePaise: 0,
    invoiceCount: 0,
    paidCount: 0,
    pendingCount: 0,
  });
  const [invoiceLoading, setInvoiceLoading] = useState<boolean>(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [invoiceSearch, setInvoiceSearch] = useState<string>("");
  const [invoiceClassId, setInvoiceClassId] = useState<string>("all");
  const [invoiceSectionId, setInvoiceSectionId] = useState<string>("all");
  const [invoiceStatus, setInvoiceStatus] = useState<string>("all");
  const [invoiceTermId, setInvoiceTermId] = useState<string>("all");
  const [invoicePage, setInvoicePage] = useState<number>(1);
  const [invoicePageSize, setInvoicePageSize] = useState<number>(8);
  const [invoiceTotalCount, setInvoiceTotalCount] = useState<number>(0);
  const [invoiceTotalPages, setInvoiceTotalPages] = useState<number>(1);

  // Modals for Invoices
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<StudentInvoice | null>(null);
  const [invoiceToCancel, setInvoiceToCancel] = useState<StudentInvoice | null>(null);

  // Common Metadata
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [terms, setTerms] = useState<FeeTerm[]>([]);

  // Global Alerts
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<string | null>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside() {
      setActiveStudentMenuId(null);
      setIsBulkActionsDropdownOpen(false);
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Load Metadata (Classes, Sections, Academic Years, Terms)
  useEffect(() => {
    if (!schoolId) return;

    // Academic Years
    let storedYears = typeof localStorage !== "undefined"
      ? JSON.parse(localStorage.getItem(`myzkool_academic_years_${schoolId}`) || "[]")
      : [];
    setAcademicYears(storedYears);
    const currentYear = storedYears.find((y: any) => y.is_current) || storedYears[0];
    if (currentYear && !selectedYearId) {
      setSelectedYearId(currentYear.id);
    }

    // Classes & Sections
    getClassesWithSections(schoolId)
      .then(({ classes: cls }) => {
        setClasses(cls || []);
        const allSecs = (cls || []).flatMap((c: any) => c.sections || []);
        setSections(allSecs);
      })
      .catch((err) => console.error("Failed to load classes", err));

    // Fee Terms
    getFeeTerms(schoolId, selectedYearId || undefined)
      .then(({ terms: t }) => setTerms(t || []))
      .catch(() => {});
  }, [schoolId, selectedYearId]);

  // ───────────────────────────────────────────────────────────────────────────
  // FETCH STUDENT-WISE FEE SUMMARIES
  // ───────────────────────────────────────────────────────────────────────────
  const loadStudentFeeSummaries = useCallback(async () => {
    if (!schoolId) return;
    setStudentLoading(true);

    const filters: StudentFeeFilterOptions = {
      academic_year_id: selectedYearId || undefined,
      class_id: studentClassId !== "all" ? studentClassId : undefined,
      section_id: studentSectionId !== "all" ? studentSectionId : undefined,
      fee_status: studentFeeStatus !== "all" ? studentFeeStatus : undefined,
      transport_filter: studentTransport,
      quick_pill: quickPill,
      search: studentSearch.trim() || undefined,
      due_date_from: dueDateFrom || undefined,
      due_date_to: dueDateTo || undefined,
      page: studentPage,
      pageSize: studentPageSize,
    };

    try {
      const res = await getStudentFeeSummaries(schoolId, filters);
      setStudents(res.students);
      setAllFilteredStudents(res.allFilteredStudents);
      setStudentMetrics(res.metrics);
      setStudentTotalCount(res.totalCount);
      setStudentTotalPages(res.totalPages);
    } catch (err) {
      console.error("Error loading student fee summaries:", err);
    } finally {
      setStudentLoading(false);
    }
  }, [
    schoolId,
    selectedYearId,
    studentClassId,
    studentSectionId,
    studentFeeStatus,
    studentTransport,
    quickPill,
    studentSearch,
    dueDateFrom,
    dueDateTo,
    studentPage,
    studentPageSize,
  ]);

  useEffect(() => {
    if (activeTab === "student-wise") {
      loadStudentFeeSummaries();
    }
  }, [activeTab, loadStudentFeeSummaries]);

  // ───────────────────────────────────────────────────────────────────────────
  // FETCH INVOICE-WISE RECORDS
  // ───────────────────────────────────────────────────────────────────────────
  const loadInvoices = useCallback(async () => {
    if (!schoolId) return;
    setInvoiceLoading(true);

    const filters: InvoiceFilters = {
      academic_year_id: selectedYearId || undefined,
      class_id: invoiceClassId !== "all" ? invoiceClassId : undefined,
      section_id: invoiceSectionId !== "all" ? invoiceSectionId : undefined,
      term_id: invoiceTermId !== "all" ? invoiceTermId : undefined,
      status: invoiceStatus !== "all" ? (invoiceStatus as any) : undefined,
      search: invoiceSearch.trim() || undefined,
      page: invoicePage,
      pageSize: invoicePageSize,
    };

    try {
      const res = await getSchoolInvoices(schoolId, filters);
      setInvoices(res.invoices);
      setInvoiceMetrics(res.metrics);
      setInvoiceTotalCount(res.totalCount);
      setInvoiceTotalPages(res.totalPages);
    } catch (err) {
      console.error("Error loading invoices:", err);
    } finally {
      setInvoiceLoading(false);
    }
  }, [
    schoolId,
    selectedYearId,
    invoiceClassId,
    invoiceSectionId,
    invoiceStatus,
    invoiceTermId,
    invoiceSearch,
    invoicePage,
    invoicePageSize,
  ]);

  useEffect(() => {
    if (activeTab === "invoice-wise") {
      loadInvoices();
    }
  }, [activeTab, loadInvoices]);

  // Load reminder rows for SendRemindersDrawer
  const handleOpenReminders = async () => {
    try {
      const data = await loadDuesAndRemindersData(schoolId, { academicYearId: selectedYearId });
      setReminderRows(data.rows || []);
      setIsSendRemindersOpen(true);
    } catch (e) {
      setIsSendRemindersOpen(true);
    }
  };

  // Student Selection checkbox
  const handleSelectAllStudents = (checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(new Set(students.map((s) => s.student_id)));
    } else {
      setSelectedStudentIds(new Set());
    }
  };

  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // CSV Export for Student Dues
  const handleExportStudentCSV = () => {
    const targetList =
      selectedStudentIds.size > 0
        ? allFilteredStudents.filter((s) => selectedStudentIds.has(s.student_id))
        : allFilteredStudents.length > 0
        ? allFilteredStudents
        : students;

    const csvData = exportStudentFeeCSV(targetList);
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `student_fee_dues_${getTodayIST()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setAlertSuccess(`Exported fee ledger for ${targetList.length} students.`);
    setTimeout(() => setAlertSuccess(null), 3000);
  };

  // Status Badge Rendering for Student-wise
  const renderStudentStatusBadge = (status: StudentFeeStatus) => {
    switch (status) {
      case "fully_paid":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E6F4EA] text-[#137333] border border-emerald-200/50">
            Fully Paid
          </span>
        );
      case "overdue":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FCE8E6] text-[#C5221F] border border-rose-200/60">
            Overdue
          </span>
        );
      case "partially_paid":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF7E0] text-[#B06000] border border-amber-200/50">
            Partially Paid
          </span>
        );
      case "upcoming":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Upcoming
          </span>
        );
      case "no_dues":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
            No Dues
          </span>
        );
      case "pending":
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFF0D4] text-[#8C5200] border border-amber-200/50">
            Pending
          </span>
        );
    }
  };

  // Open Collect Drawer for specific student
  const handleOpenCollect = (studentId?: string) => {
    setCollectStudentId(studentId);
    setIsCollectDrawerOpen(true);
  };

  if (!schoolId) {
    return (
      <div className="min-h-[60vh] bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">School Context Required</h2>
        <p className="text-sm text-slate-500 max-w-md">
          Please select or log into an authenticated school context to view and manage invoices.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto py-6 px-4 sm:px-6 space-y-5">
      {/* ── 1. Top Bar: Breadcrumb, Academic Year, Notifications, Profile ──────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Breadcrumb & Title */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1 font-medium">
            <span>Admin</span>
            <span className="text-slate-400">/</span>
            <span>Fees</span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-800 font-semibold">Invoices</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Student Fee Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">View student-wise fee status, collect payments, and manage dues.</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleOpenReminders}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-slate-500" />
            <span>Send Reminders</span>
          </button>

          {/* Bulk Actions Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsBulkActionsDropdownOpen(!isBulkActionsDropdownOpen);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <span>Bulk Actions</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {isBulkActionsDropdownOpen && (
              <div
                className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBulkActionsDropdownOpen(false);
                      setIsBulkModalOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    Bulk Generate Invoices
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBulkActionsDropdownOpen(false);
                      setIsImportModalOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-400" />
                    Import Records
                  </button>
                </div>
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBulkActionsDropdownOpen(false);
                      handleExportStudentCSV();
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    Export Filtered (CSV)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBulkActionsDropdownOpen(false);
                      handleOpenReminders();
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    Send Bulk Reminders
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleOpenCollect()}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#047857] text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Collect Payment</span>
          </button>
        </div>
      </div>

      {/* ── 2. Primary Tab Switcher: Student-wise vs Invoice-wise ──────────── */}
      <div className="flex items-center gap-6 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("student-wise")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "student-wise"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Student-wise
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("invoice-wise")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "invoice-wise"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Invoice-wise
        </button>
      </div>

      {/* Global Toast Alert */}
      {alertSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{alertSuccess}</span>
          </div>
          <button onClick={() => setAlertSuccess(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ─── TAB 1: STUDENT-WISE VIEW (PRIMARY UPGRADE) ───────────────────────── */}
      {activeTab === "student-wise" && (
        <div className="space-y-5">
          {/* ── 7 Financial Summary Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* Card 1: Total Students with Fee Records */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                <Users className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-slate-900 tabular-nums font-display">
                {studentMetrics.total_students_with_records}
              </div>
              <div className="text-xs font-semibold text-slate-800">Total Students</div>
              <div className="text-[11px] text-slate-400">with fee records</div>
            </div>

            {/* Card 2: Total Fees for Academic Year */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                <IndianRupee className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-slate-900 tabular-nums font-display">
                {formatINR(studentMetrics.total_fees_paise)}
              </div>
              <div className="text-xs font-semibold text-slate-800">Total Fees</div>
              <div className="text-[11px] text-slate-400">for 2026–2027</div>
            </div>

            {/* Card 3: Total Collected */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-2">
                <Receipt className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-slate-900 tabular-nums font-display">
                {formatINR(studentMetrics.total_collected_paise)}
              </div>
              <div className="text-xs font-semibold text-slate-800">Total Collected</div>
              <div className="text-[11px] text-emerald-600 font-medium">
                {studentMetrics.collection_percentage}% of total
              </div>
            </div>

            {/* Card 4: Total Pending */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-slate-900 tabular-nums font-display">
                {formatINR(studentMetrics.total_pending_paise)}
              </div>
              <div className="text-xs font-semibold text-slate-800">Total Pending</div>
              <div className="text-[11px] text-amber-600 font-medium">
                {studentMetrics.pending_percentage}% of total
              </div>
            </div>

            {/* Card 5: Overdue Amount */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-2">
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-slate-900 tabular-nums font-display">
                {formatINR(studentMetrics.total_overdue_paise)}
              </div>
              <div className="text-xs font-semibold text-slate-800">Overdue Amount</div>
              <div className="text-[11px] text-rose-600 font-medium">
                {studentMetrics.overdue_percentage}% of total
              </div>
            </div>

            {/* Card 6: Fully Paid */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-slate-900 tabular-nums font-display">
                {studentMetrics.fully_paid_count}
              </div>
              <div className="text-xs font-semibold text-slate-800">Fully Paid</div>
              <div className="text-[11px] text-purple-600 font-medium">
                {studentMetrics.fully_paid_percentage}% of students
              </div>
            </div>

            {/* Card 7: Students with Dues */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-2">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold text-slate-900 tabular-nums font-display">
                {studentMetrics.with_dues_count}
              </div>
              <div className="text-xs font-semibold text-slate-800">Students with Dues</div>
              <div className="text-[11px] text-rose-600 font-medium">
                {studentMetrics.with_dues_percentage}% of students
              </div>
            </div>
          </div>

          {/* ── Filters Bar ── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by student name, admission no., parent name or phone..."
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setStudentPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
                {studentSearch && (
                  <button
                    onClick={() => setStudentSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Class Filter */}
              <div className="flex items-center gap-2">
                <select
                  value={studentClassId}
                  onChange={(e) => {
                    setStudentClassId(e.target.value);
                    setStudentPage(1);
                  }}
                  className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="all">All Classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Section Filter */}
                <select
                  value={studentSectionId}
                  onChange={(e) => {
                    setStudentSectionId(e.target.value);
                    setStudentPage(1);
                  }}
                  className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="all">All Sections</option>
                  {sections
                    .filter((s) => studentClassId === "all" || s.class_id === studentClassId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>

                {/* Fee Status Filter */}
                <select
                  value={studentFeeStatus}
                  onChange={(e) => {
                    setStudentFeeStatus(e.target.value);
                    setStudentPage(1);
                  }}
                  className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="overdue">Overdue</option>
                  <option value="pending">Pending</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="fully_paid">Fully Paid</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="with_dues">With Dues</option>
                </select>

                {/* Transport Filter */}
                <select
                  value={studentTransport}
                  onChange={(e) => {
                    setStudentTransport(e.target.value as any);
                    setStudentPage(1);
                  }}
                  className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="all">All Students</option>
                  <option value="transport_only">Transport Users</option>
                  <option value="non_transport">Non-Transport</option>
                </select>

                {/* More Filters Toggle */}
                <button
                  type="button"
                  onClick={() => setIsMoreFiltersOpen(!isMoreFiltersOpen)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                    isMoreFiltersOpen || dueDateFrom || dueDateTo
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>More Filters</span>
                </button>
              </div>
            </div>

            {/* Extended More Filters Popover / Bar */}
            {isMoreFiltersOpen && (
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Due Date From:</span>
                  <input
                    type="date"
                    value={dueDateFrom}
                    onChange={(e) => setDueDateFrom(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">To:</span>
                  <input
                    type="date"
                    value={dueDateTo}
                    onChange={(e) => setDueDateTo(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                {(dueDateFrom || dueDateTo) && (
                  <button
                    onClick={() => {
                      setDueDateFrom("");
                      setDueDateTo("");
                    }}
                    className="text-xs text-rose-600 font-medium hover:underline"
                  >
                    Reset Date Filters
                  </button>
                )}
              </div>
            )}

            {/* Quick Status Pills Matching Reference */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  setQuickPill("all");
                  setStudentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  quickPill === "all"
                    ? "bg-blue-50 text-blue-700 border border-blue-200 font-bold"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent"
                }`}
              >
                <span>All Students</span>
                <span className="px-1.5 py-0.2 rounded-md bg-white/80 text-[11px] font-bold">
                  {studentMetrics.total_students_with_records}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setQuickPill("with_dues");
                  setStudentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  quickPill === "with_dues"
                    ? "bg-amber-50 text-amber-700 border border-amber-200 font-bold"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent"
                }`}
              >
                <span>With Dues</span>
                <span className="px-1.5 py-0.2 rounded-md bg-white/80 text-[11px] font-bold">
                  {studentMetrics.with_dues_count}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setQuickPill("overdue");
                  setStudentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  quickPill === "overdue"
                    ? "bg-rose-50 text-rose-700 border border-rose-200 font-bold"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent"
                }`}
              >
                <span>Overdue</span>
                <span className="px-1.5 py-0.2 rounded-md bg-white/80 text-[11px] font-bold text-rose-600">
                  {studentMetrics.overdue_count}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setQuickPill("fully_paid");
                  setStudentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  quickPill === "fully_paid"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent"
                }`}
              >
                <span>Fully Paid</span>
                <span className="px-1.5 py-0.2 rounded-md bg-white/80 text-[11px] font-bold text-emerald-700">
                  {studentMetrics.fully_paid_count}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setQuickPill("partially_paid");
                  setStudentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  quickPill === "partially_paid"
                    ? "bg-amber-50 text-amber-700 border border-amber-200 font-bold"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent"
                }`}
              >
                <span>Partially Paid</span>
                <span className="px-1.5 py-0.2 rounded-md bg-white/80 text-[11px] font-bold">
                  {studentMetrics.partially_paid_count}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setQuickPill("upcoming");
                  setStudentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  quickPill === "upcoming"
                    ? "bg-sky-50 text-sky-700 border border-sky-200 font-bold"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent"
                }`}
              >
                <span>Upcoming</span>
                <span className="px-1.5 py-0.2 rounded-md bg-white/80 text-[11px] font-bold">
                  {studentMetrics.upcoming_count}
                </span>
              </button>
            </div>
          </div>

          {/* ── Student Summary Table ── */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={students.length > 0 && selectedStudentIds.size === students.length}
                        onChange={(e) => handleSelectAllStudents(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="py-3.5 px-4 font-bold text-slate-600">Student</th>
                    <th className="py-3.5 px-4 font-bold text-slate-600">Class / Section</th>
                    <th className="py-3.5 px-4 font-bold text-slate-600">Parent / Contact</th>
                    <th className="py-3.5 px-4 font-bold text-slate-600">Total Fee</th>
                    <th className="py-3.5 px-4 font-bold text-slate-600">Paid</th>
                    <th className="py-3.5 px-4 font-bold text-slate-600">Pending</th>
                    <th className="py-3.5 px-4 font-bold text-slate-600">Overdue</th>
                    <th className="py-3.5 px-4 font-bold text-slate-600">Next Due Date</th>
                    <th className="py-3.5 px-4 font-bold text-slate-600">Status</th>
                    <th className="py-3.5 px-4 font-bold text-slate-600 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {studentLoading ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                        <span>Loading student fee records...</span>
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-500">
                        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <div className="font-semibold text-slate-700">No students found matching your criteria.</div>
                        <p className="text-xs text-slate-400 mt-1">Try modifying your search or clearing active filters.</p>
                      </td>
                    </tr>
                  ) : (
                    students.map((std) => {
                      const isSelected = selectedStudentIds.has(std.student_id);
                      const avatarCls = getAvatarColor(std.student_name);

                      return (
                        <tr
                          key={std.student_id}
                          className={`hover:bg-slate-50/70 transition-colors group ${
                            isSelected ? "bg-blue-50/40" : ""
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3.5 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectStudent(std.student_id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>

                          {/* Student Info */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${avatarCls}`}
                              >
                                {std.avatar_url ? (
                                  <img
                                    src={std.avatar_url}
                                    alt={std.student_name}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  getInitials(std.student_name)
                                )}
                              </div>
                              <div>
                                <div
                                  onClick={() => setDrawerStudentId(std.student_id)}
                                  className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer transition-colors"
                                >
                                  {std.student_name}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                  {std.admission_no}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Class / Section */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">{std.class_name}</div>
                            <div className="text-[11px] text-slate-500">{std.section_name}</div>
                          </td>

                          {/* Parent / Contact */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">{std.parent_name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{std.parent_phone}</div>
                          </td>

                          {/* Total Fee */}
                          <td className="py-3.5 px-4 font-bold text-slate-900 tabular-nums">
                            {formatINR(std.total_applicable_paise)}
                          </td>

                          {/* Paid */}
                          <td className="py-3.5 px-4 font-semibold text-emerald-600 tabular-nums">
                            {formatINR(std.total_paid_paise)}
                          </td>

                          {/* Pending */}
                          <td className="py-3.5 px-4 font-bold text-amber-600 tabular-nums">
                            {formatINR(std.total_pending_paise)}
                          </td>

                          {/* Overdue */}
                          <td className="py-3.5 px-4 tabular-nums">
                            {std.total_overdue_paise > 0 ? (
                              <span className="font-bold text-rose-600">
                                {formatINR(std.total_overdue_paise)}
                              </span>
                            ) : (
                              <span className="text-slate-500 font-medium">₹0</span>
                            )}
                          </td>

                          {/* Next Due Date */}
                          <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                            {formatDateDisplay(std.next_due_date)}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {renderStudentStatusBadge(std.fee_status)}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 relative">
                              <button
                                type="button"
                                onClick={() => setDrawerStudentId(std.student_id)}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                              >
                                View
                              </button>

                              {/* Three-dots menu */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveStudentMenuId(
                                      activeStudentMenuId === std.student_id ? null : std.student_id
                                    );
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>

                                {activeStudentMenuId === std.student_id && (
                                  <div
                                    className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 divide-y divide-slate-100 text-left animate-in fade-in zoom-in-95 duration-100"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="py-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveStudentMenuId(null);
                                          handleOpenCollect(std.student_id);
                                        }}
                                        className="w-full px-3 py-1.5 text-xs text-blue-600 font-semibold hover:bg-blue-50 flex items-center gap-2"
                                      >
                                        <CreditCard className="w-3.5 h-3.5" />
                                        Collect Fee
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveStudentMenuId(null);
                                          setDrawerStudentId(std.student_id);
                                        }}
                                        className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                                        View Full Ledger
                                      </button>
                                    </div>
                                    <div className="py-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveStudentMenuId(null);
                                          const encoded = getWhatsAppFeeMessage(std, schoolName);
                                          const cleanPhone = std.parent_phone.replace(/[^0-9]/g, "");
                                          window.open(
                                            cleanPhone
                                              ? `https://wa.me/91${cleanPhone}?text=${encoded}`
                                              : `https://wa.me/?text=${encoded}`,
                                            "_blank"
                                          );
                                        }}
                                        className="w-full px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"
                                      >
                                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                        WhatsApp Reminder
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer Matching Mockup */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-200 text-xs text-slate-500 gap-3">
              <div>
                Showing {(studentPage - 1) * studentPageSize + 1}–
                {Math.min(studentPage * studentPageSize, studentTotalCount)} of {studentTotalCount} students
              </div>

              <div className="flex items-center gap-2">
                {/* Previous */}
                <button
                  type="button"
                  disabled={studentPage <= 1}
                  onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page Number Chips */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((p) => {
                    if (p > studentTotalPages) return null;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setStudentPage(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors ${
                          studentPage === p
                            ? "bg-blue-600 text-white font-bold"
                            : "hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  {studentTotalPages > 5 && (
                    <>
                      <span className="px-1 text-slate-400">...</span>
                      <button
                        type="button"
                        onClick={() => setStudentPage(studentTotalPages)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors ${
                          studentPage === studentTotalPages
                            ? "bg-blue-600 text-white font-bold"
                            : "hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        {studentTotalPages}
                      </button>
                    </>
                  )}
                </div>

                {/* Next */}
                <button
                  type="button"
                  disabled={studentPage >= studentTotalPages}
                  onClick={() => setStudentPage((p) => Math.min(studentTotalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Page Size Select */}
                <select
                  value={studentPageSize}
                  onChange={(e) => {
                    setStudentPageSize(Number(e.target.value));
                    setStudentPage(1);
                  }}
                  className="ml-2 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
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
      )}

      {/* ─── TAB 2: INVOICE-WISE VIEW (PRESERVED) ─────────────────────────────── */}
      {activeTab === "invoice-wise" && (
        <div className="space-y-5">
          {/* Invoice Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="text-xl font-bold text-slate-900 tabular-nums font-display">
                {formatINR(invoiceMetrics.totalInvoicedPaise)}
              </div>
              <div className="text-xs font-semibold text-slate-800">Total Invoiced</div>
              <div className="text-[11px] text-slate-400">{invoiceMetrics.invoiceCount} invoices</div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="text-xl font-bold text-emerald-700 tabular-nums font-display">
                {formatINR(invoiceMetrics.totalPaidPaise)}
              </div>
              <div className="text-xs font-semibold text-slate-800">Total Collected</div>
              <div className="text-[11px] text-emerald-600">{invoiceMetrics.paidCount} fully paid</div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="text-xl font-bold text-amber-700 tabular-nums font-display">
                {formatINR(invoiceMetrics.outstandingPaise)}
              </div>
              <div className="text-xs font-semibold text-slate-800">Total Outstanding</div>
              <div className="text-[11px] text-amber-600">{invoiceMetrics.pendingCount} pending</div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="text-xl font-bold text-rose-700 tabular-nums font-display">
                {formatINR(invoiceMetrics.overduePaise)}
              </div>
              <div className="text-xs font-semibold text-slate-800">Total Overdue</div>
              <div className="text-[11px] text-rose-600">{invoiceMetrics.overdueCount} overdue</div>
            </div>
          </div>

          {/* Invoices Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search invoice number, student name, admission number..."
                  value={invoiceSearch}
                  onChange={(e) => {
                    setInvoiceSearch(e.target.value);
                    setInvoicePage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <select
                value={invoiceClassId}
                onChange={(e) => {
                  setInvoiceClassId(e.target.value);
                  setInvoicePage(1);
                }}
                className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-700"
              >
                <option value="all">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={invoiceStatus}
                onChange={(e) => {
                  setInvoiceStatus(e.target.value);
                  setInvoicePage(1);
                }}
                className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-700"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="partial">Partially Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Invoice No</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Billing Period</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Paid</th>
                    <th className="py-3 px-4">Balance</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoiceLoading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                        <span>Loading invoices...</span>
                      </td>
                    </tr>
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500">
                        No invoices found.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-bold text-slate-900">{inv.invoice_no}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{inv.student_name}</td>
                        <td className="py-3 px-4 text-slate-600">{inv.class_name}</td>
                        <td className="py-3 px-4 text-slate-600">{inv.billing_period}</td>
                        <td className="py-3 px-4 text-slate-600">{inv.due_date}</td>
                        <td className="py-3 px-4 font-bold tabular-nums">{formatPaise(inv.total_paise)}</td>
                        <td className="py-3 px-4 font-semibold text-emerald-600 tabular-nums">{formatPaise(inv.paid_paise)}</td>
                        <td className="py-3 px-4 font-bold text-amber-600 tabular-nums">{formatPaise(inv.balance_paise)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              inv.status === "paid"
                                ? "bg-emerald-100 text-emerald-700"
                                : inv.status === "overdue"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceForDetail(inv)}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Slide-over Drawer: Student Fee Ledger ─────────────────────────────── */}
      <StudentFeeLedgerDrawer
        isOpen={!!drawerStudentId}
        onClose={() => setDrawerStudentId(null)}
        studentId={drawerStudentId}
        schoolId={schoolId}
        schoolName={schoolName}
        onCollectPayment={(stdId) => {
          setDrawerStudentId(null);
          handleOpenCollect(stdId);
        }}
      />

      {/* ── Collect Fee Drawer (Quick Payment Workflow) ────────────────────────── */}
      <CollectFeeDrawer
        isOpen={isCollectDrawerOpen}
        onClose={() => {
          setIsCollectDrawerOpen(false);
          setCollectStudentId(undefined);
        }}
        onSuccess={(rcptNo) => {
          setIsCollectDrawerOpen(false);
          setCollectStudentId(undefined);
          setAlertSuccess(`Payment recorded successfully! Receipt #${rcptNo} generated.`);
          loadStudentFeeSummaries();
          loadInvoices();
        }}
        initialStudentId={collectStudentId}
        academicYearId={selectedYearId}
      />

      {/* ── Send Reminders Drawer ────────────────────────────────────────────── */}
      <SendRemindersDrawer
        isOpen={isSendRemindersOpen}
        onClose={() => setIsSendRemindersOpen(false)}
        rows={reminderRows}
        templates={DEFAULT_REMINDER_TEMPLATES as any}
        schoolId={schoolId}
        schoolName={schoolName}
        onSuccess={() => {
          setIsSendRemindersOpen(false);
          setAlertSuccess("Fee reminders successfully dispatched.");
          loadStudentFeeSummaries();
        }}
        onOpenTemplates={() => {}}
      />

      {/* ── Modals: Bulk Generate, Import, Details, Cancel ───────────────────── */}
      <BulkGenerateModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        schoolId={schoolId}
        academicYears={academicYears}
        selectedYearId={selectedYearId}
        classes={classes}
        terms={terms}
        onGenerationComplete={() => {
          setIsBulkModalOpen(false);
          setAlertSuccess("Invoices generated successfully.");
          loadStudentFeeSummaries();
          loadInvoices();
        }}
      />

      <ImportInvoicesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        schoolId={schoolId}
        onImportComplete={() => {
          setIsImportModalOpen(false);
          setAlertSuccess("Fee records imported successfully.");
          loadStudentFeeSummaries();
          loadInvoices();
        }}
      />

      {selectedInvoiceForDetail && (
        <InvoiceDetailsModal
          isOpen={!!selectedInvoiceForDetail}
          invoice={selectedInvoiceForDetail}
          schoolBranding={{ name: schoolName }}
          onClose={() => setSelectedInvoiceForDetail(null)}
          onCollectPayment={(inv) => {
            setSelectedInvoiceForDetail(null);
            handleOpenCollect(inv.student_id);
          }}
          onCancelInvoice={(inv) => {
            setSelectedInvoiceForDetail(null);
            setInvoiceToCancel(inv);
          }}
        />
      )}

      {invoiceToCancel && (
        <CancelInvoiceModal
          isOpen={!!invoiceToCancel}
          invoice={invoiceToCancel}
          onClose={() => setInvoiceToCancel(null)}
          onConfirmCancel={async (invoiceId, reason) => {
            await cancelInvoice(schoolId, invoiceId, reason);
            setInvoiceToCancel(null);
            setAlertSuccess("Invoice voided successfully.");
            loadStudentFeeSummaries();
            loadInvoices();
          }}
        />
      )}
    </div>
  );
}
