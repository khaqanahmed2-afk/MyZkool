import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Download,
  Eye,
  Send,
  CreditCard,
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
  Wallet,
  Filter,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { getClassesWithSections } from "../../../services/classSectionService";
import { getFeeTerms } from "../../../services/feeSetupService";
import {
  getStudentFeeSummaries,
  exportStudentFeeCSV,
  getWhatsAppFeeMessage,
} from "../../../services/studentFeeLedgerService";
import { loadDuesAndRemindersData, DEFAULT_REMINDER_TEMPLATES } from "../../../services/duesRemindersService";
import type {
  StudentFeeSummary,
  StudentFeeSummaryMetrics,
  StudentFeeFilterOptions,
  StudentFeeStatus,
} from "../../../types/studentFeeLedger";
import type { FeeTerm } from "../../../types/fees";

// Modals and Drawers
import { BulkGenerateModal } from "../../../components/admin/fees/BulkGenerateModal";
import { ImportInvoicesModal } from "../../../components/admin/fees/ImportInvoicesModal";
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
  const navigate = useNavigate();
  const { school } = useAuth() as any;
  const schoolId = school?.id || "";
  const schoolName = school?.name || "School";

  // ───────────────────────────────────────────────────────────────────────────
  // STUDENT-WISE FEE MANAGEMENT STATE
  // ───────────────────────────────────────────────────────────────────────────
  const [students, setStudents] = useState<StudentFeeSummary[]>([]);
  const allFilteredStudentsRef = useRef<StudentFeeSummary[]>([]);
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

  // Filtering Controls
  const [studentSearch, setStudentSearch] = useState<string>("");
  const [studentClassId, setStudentClassId] = useState<string>("all");
  const [studentSectionId, setStudentSectionId] = useState<string>("all");
  const [studentFeeStatus, setStudentFeeStatus] = useState<string>("all");
  const [studentTransport, setStudentTransport] = useState<"all" | "transport_only" | "non_transport">("all");
  const [quickPill, setQuickPill] = useState<"all" | "structure_assigned" | "with_invoices" | "with_dues" | "overdue" | "fully_paid" | "partially_paid" | "upcoming" | "transport_only">("with_invoices");
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
  const [dueDateFrom, setDueDateFrom] = useState<string>("");
  const [dueDateTo, setDueDateTo] = useState<string>("");

  // Pagination
  const [studentPage, setStudentPage] = useState<number>(1);
  const [studentPageSize, setStudentPageSize] = useState<number>(8);
  const [studentTotalCount, setStudentTotalCount] = useState<number>(0);
  const [studentTotalPages, setStudentTotalPages] = useState<number>(1);

  // Row Selection
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Active Dropdown Menus
  const [activeStudentMenuId, setActiveStudentMenuId] = useState<string | null>(null);
  const [isBulkActionsDropdownOpen, setIsBulkActionsDropdownOpen] = useState(false);

  // Modals / Drawers state
  const [drawerStudentId, setDrawerStudentId] = useState<string | null>(null);
  const [isCollectDrawerOpen, setIsCollectDrawerOpen] = useState(false);
  const [collectStudentId, setCollectStudentId] = useState<string | undefined>(undefined);
  const [isSendRemindersOpen, setIsSendRemindersOpen] = useState(false);
  const [reminderRows, setReminderRows] = useState<any[]>([]);

  // Bulk Modals
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Common Metadata
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [terms, setTerms] = useState<FeeTerm[]>([]);

  // Global Alerts
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);

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
    const storedYears = typeof localStorage !== "undefined"
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
      .catch(() => { });
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
      allFilteredStudentsRef.current = res.allFilteredStudents;
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
    loadStudentFeeSummaries();
  }, [loadStudentFeeSummaries]);

  // Load reminder rows for SendRemindersDrawer
  const handleOpenReminders = async () => {
    try {
      const data = await loadDuesAndRemindersData(schoolId, { academicYearId: selectedYearId });
      setReminderRows(data.rows || []);
      setIsSendRemindersOpen(true);
    } catch {
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
  const handleExportCSV = () => {
    const targetList =
      selectedStudentIds.size > 0
        ? allFilteredStudentsRef.current.filter((s) => selectedStudentIds.has(s.student_id))
        : allFilteredStudentsRef.current.length > 0
          ? allFilteredStudentsRef.current
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
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setAlertSuccess(`Exported fee records for ${targetList.length} students.`);
    setTimeout(() => setAlertSuccess(null), 3000);
  };

  // Status Badge Rendering
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

  // Open Collect Fee Counter for specific student (Full-page counter)
  const handleOpenCollect = (studentId?: string) => {
    if (studentId) {
      navigate(`/admin/fees/collect?student=${encodeURIComponent(studentId)}`);
    } else {
      navigate("/admin/fees/collect");
    }
  };

  if (!schoolId) {
    return (
      <div className="min-h-[60vh] bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">School Context Required</h2>
        <p className="text-sm text-slate-500 max-w-md">
          Please select or log into an authenticated school context to view and manage student fees.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto py-6 px-4 sm:px-6 space-y-5">
      {/* ── 1. Page Header: Breadcrumb, Title & Primary Actions ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1 font-medium">
            <span>Admin</span>
            <span className="text-slate-400">/</span>
            <span>Fees</span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-800 font-semibold">Student Fee Management</span>
          </div>
          {/* Main Title & Description */}
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Student Fee Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage student fee dues, generate term invoices, track payments, and issue receipts.</p>
        </div>

        {/* Primary Action Buttons */}
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
                      handleExportCSV();
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

          {/* Primary Blue Collect Fee Button */}
          <button
            type="button"
            onClick={() => handleOpenCollect()}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Collect Fee</span>
          </button>
        </div>
      </div>

      {/* Global Toast Alert */}
      {alertSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{alertSuccess}</span>
          </div>
          <button aria-label="Close" onClick={() => setAlertSuccess(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── 2. 7 Financial Summary KPI Cards Directly Below Header ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Card 1: Total Enrolled Students */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
            <Users className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-slate-900 tabular-nums font-display">
            {studentMetrics.total_enrolled_count ?? studentMetrics.total_students_count}
          </div>
          <div className="text-xs font-semibold text-slate-800">Total Enrolled</div>
          <div className="text-[11px] text-slate-400">across all classes</div>
        </div>

        {/* Card 2: Structure Assigned (Fee-Eligible) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-slate-900 tabular-nums font-display">
            {studentMetrics.structure_assigned_count ?? 0}
          </div>
          <div className="text-xs font-semibold text-slate-800">Structure Assigned</div>
          <div className="text-[11px] text-indigo-600 font-medium">active fee structures</div>
        </div>

        {/* Card 3: Total Billed / Fees */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
            <IndianRupee className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-slate-900 tabular-nums font-display">
            {formatINR(studentMetrics.total_fees_paise)}
          </div>
          <div className="text-xs font-semibold text-slate-800">Total Billed</div>
          <div className="text-[11px] text-slate-400">
            {studentMetrics.students_with_invoices_count ?? studentMetrics.total_students_with_records} with invoices
          </div>
        </div>

        {/* Card 4: Total Collected */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
            <Wallet className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-slate-900 tabular-nums font-display">
            {formatINR(studentMetrics.total_collected_paise)}
          </div>
          <div className="text-xs font-semibold text-slate-800">Total Collected</div>
          <div className="text-[11px] text-emerald-600 font-medium">
            {studentMetrics.collection_percentage}% collection
          </div>
        </div>

        {/* Card 5: Total Pending */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-2">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-slate-900 tabular-nums font-display">
            {formatINR(studentMetrics.total_pending_paise)}
          </div>
          <div className="text-xs font-semibold text-slate-800">Total Pending</div>
          <div className="text-[11px] text-amber-600 font-medium">
            {studentMetrics.with_dues_count} with dues
          </div>
        </div>

        {/* Card 6: Overdue Amount */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-slate-900 tabular-nums font-display">
            {formatINR(studentMetrics.total_overdue_paise)}
          </div>
          <div className="text-xs font-semibold text-slate-800">Overdue Amount</div>
          <div className="text-[11px] text-rose-600 font-medium">
            {studentMetrics.overdue_count} overdue
          </div>
        </div>

        {/* Card 7: Students with Dues */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
            <Users className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-slate-900 tabular-nums font-display">
            {studentMetrics.with_dues_count}
          </div>
          <div className="text-xs font-semibold text-slate-800">Students with Dues</div>
          <div className="text-[11px] text-purple-600 font-medium">
            {studentMetrics.with_dues_percentage}% of total
          </div>
        </div>
      </div>

      {/* ── 3. Filters Bar ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              aria-label="Search students"
              type="text"
              placeholder="Search by student name, admission no., parent name or phone..."
              value={studentSearch}
              onChange={(e) => {
                setStudentSearch(e.target.value);
                setStudentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors placeholder:text-slate-400"
            />
            {studentSearch && (
              <button
                aria-label="Clear search"
                onClick={() => {
                  setStudentSearch("");
                  setStudentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Class, Section, Status, Transport Selectors & Filters button */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Class Filter */}
            <select
              aria-label="Class Filter"
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
              aria-label="Section Filter"
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
              aria-label="Fee Status Filter"
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
              aria-label="Transport Filter"
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
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${isMoreFiltersOpen || dueDateFrom || dueDateTo
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Extended More Filters Popover / Bar */}
        {isMoreFiltersOpen && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Due Date From:</span>
              <input
                aria-label="Select date from"
                type="date"
                value={dueDateFrom}
                onChange={(e) => {
                  setDueDateFrom(e.target.value);
                  setStudentPage(1);
                }}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">To:</span>
              <input
                aria-label="Select date to"
                type="date"
                value={dueDateTo}
                onChange={(e) => {
                  setDueDateTo(e.target.value);
                  setStudentPage(1);
                }}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
            {(dueDateFrom || dueDateTo) && (
              <button
                onClick={() => {
                  setDueDateFrom("");
                  setDueDateTo("");
                  setStudentPage(1);
                }}
                className="text-xs text-rose-600 font-medium hover:underline"
              >
                Reset Date Filters
              </button>
            )}
          </div>
        )}

        {/* Quick Status Pills Matching Reference UI */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => {
              setQuickPill("with_invoices");
              setStudentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${quickPill === "with_invoices"
                ? "bg-blue-50 text-blue-700 border border-blue-200 font-bold"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent"
              }`}
          >
            <span>With Invoices</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[11px] font-bold ${quickPill === "with_invoices" ? "bg-white text-blue-700 shadow-2xs" : "bg-white/80 text-slate-600"
                }`}
            >
              {studentMetrics.students_with_invoices_count || studentMetrics.total_students_with_records}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setQuickPill("structure_assigned");
              setStudentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${quickPill === "structure_assigned"
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent"
              }`}
          >
            <span>Structure Assigned</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[11px] font-bold ${quickPill === "structure_assigned" ? "bg-white text-indigo-700 shadow-2xs" : "bg-white/80 text-indigo-700"
                }`}
            >
              {studentMetrics.structure_assigned_count}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setQuickPill("transport_only");
              setStudentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${quickPill === "transport_only"
                ? "bg-amber-50 text-amber-700 border border-amber-200 font-bold"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent"
              }`}
          >
            <span>Transport Only</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[11px] font-bold ${quickPill === "transport_only" ? "bg-white text-amber-700 shadow-2xs" : "bg-white/80 text-amber-700"
                }`}
            >
              {studentMetrics.transport_only_count}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setQuickPill("with_dues");
              setStudentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${quickPill === "with_dues"
                ? "bg-amber-50 text-amber-700 border border-amber-200 font-bold"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent"
              }`}
          >
            <span>With Dues</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[11px] font-bold ${quickPill === "with_dues" ? "bg-white text-amber-700 shadow-2xs" : "bg-white/80 text-rose-600"
                }`}
            >
              {studentMetrics.with_dues_count}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setQuickPill("overdue");
              setStudentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${quickPill === "overdue"
                ? "bg-rose-50 text-rose-700 border border-rose-200 font-bold"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent"
              }`}
          >
            <span>Overdue</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[11px] font-bold ${quickPill === "overdue" ? "bg-white text-rose-700 shadow-2xs" : "bg-white/80 text-rose-600"
                }`}
            >
              {studentMetrics.overdue_count}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setQuickPill("fully_paid");
              setStudentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${quickPill === "fully_paid"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent"
              }`}
          >
            <span>Fully Paid</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[11px] font-bold ${quickPill === "fully_paid" ? "bg-white text-emerald-700 shadow-2xs" : "bg-white/80 text-emerald-700"
                }`}
            >
              {studentMetrics.fully_paid_count}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setQuickPill("all");
              setStudentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${quickPill === "all"
                ? "bg-slate-200 text-slate-800 border border-slate-300 font-bold"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent"
              }`}
          >
            <span>All Enrolled</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[11px] font-bold ${quickPill === "all" ? "bg-white text-slate-800 shadow-2xs" : "bg-white/80 text-slate-600"
                }`}
            >
              {studentMetrics.total_enrolled_count || studentMetrics.total_students_count}
            </span>
          </button>
        </div>
      </div>

      {/* ── 4. Student Summary Table ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-3 w-10">
                  <input
                    aria-label="Select all students"
                    type="checkbox"
                    checked={students.length > 0 && selectedStudentIds.size === students.length}
                    onChange={(e) => handleSelectAllStudents(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="py-3.5 px-3 font-bold text-slate-600">Student</th>
                <th className="py-3.5 px-3 font-bold text-slate-600">Class / Section</th>
                <th className="py-3.5 px-3 font-bold text-slate-600">Academic Year & Structure</th>
                <th className="py-3.5 px-3 font-bold text-slate-600 text-right">Total Billed</th>
                <th className="py-3.5 px-3 font-bold text-slate-600 text-right">Discounts</th>
                <th className="py-3.5 px-3 font-bold text-slate-600 text-right">Amount Paid</th>
                <th className="py-3.5 px-3 font-bold text-slate-600 text-right">Outstanding</th>
                <th className="py-3.5 px-3 font-bold text-slate-600 text-right">Overdue</th>
                <th className="py-3.5 px-3 font-bold text-slate-600 text-center">Next Due Date</th>
                <th className="py-3.5 px-3 font-bold text-slate-600 text-center">Status</th>
                <th className="py-3.5 px-3 font-bold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {studentLoading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Loading student fee records...</span>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div className="font-semibold text-slate-700">No students found matching your criteria.</div>
                    <p className="text-xs text-slate-400 mt-1">Try modifying your search or clearing active filters.</p>
                  </td>
                </tr>
              ) : (
                students.map((std) => {
                  const isSelected = selectedStudentIds.has(std.student_id);
                  const avatarCls = getAvatarColor(std.student_name);
                  const grossBilled = std.total_billed_paise || std.total_applicable_paise;
                  const discounts = std.total_concession_paise || 0;

                  return (
                    <tr
                      key={std.student_id}
                      className={`hover:bg-slate-50/70 transition-colors group ${isSelected ? "bg-blue-50/40" : ""
                        }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-3">
                        <input
                          aria-label="Select student"
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectStudent(std.student_id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>

                      {/* Student Info */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${avatarCls}`}
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
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  (e.currentTarget as HTMLElement).click();
                                }
                              }}
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
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-800">{std.class_name}</div>
                        <div className="text-[11px] text-slate-500">{std.section_name}</div>
                      </td>

                      {/* Academic Year & Fee Structure */}
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-800 text-[11px]">
                          {std.academic_year_name || "2026–2027"}
                        </div>
                        {std.has_fee_structure ? (
                          <div
                            className="text-[11px] text-blue-700 font-medium truncate max-w-[170px]"
                            title={std.applicable_fee_structure_name}
                          >
                            {std.applicable_fee_structure_name}
                          </div>
                        ) : std.is_transport_only ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Transport Only
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            {std.applicable_fee_structure_name || "No Structure"}
                          </span>
                        )}
                      </td>

                      {/* Total Billed */}
                      <td className="py-3.5 px-3 font-bold text-slate-900 tabular-nums text-right">
                        {formatINR(grossBilled)}
                      </td>

                      {/* Discounts & Adjustments */}
                      <td className="py-3.5 px-3 font-semibold text-purple-700 tabular-nums text-right">
                        {discounts > 0 ? (
                          <span>-{formatINR(discounts)}</span>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>

                      {/* Amount Paid */}
                      <td className="py-3.5 px-3 font-semibold text-emerald-600 tabular-nums text-right">
                        {formatINR(std.total_paid_paise)}
                      </td>

                      {/* Outstanding Balance */}
                      <td className="py-3.5 px-3 tabular-nums text-right">
                        <div
                          className={`font-bold ${std.total_pending_paise > 0 ? "text-amber-700" : "text-slate-600"
                            }`}
                        >
                          {formatINR(std.total_pending_paise)}
                        </div>
                        {(std.advance_credit_paise || 0) > 0 && (
                          <div
                            className="text-[10px] text-sky-600 font-semibold"
                            title="Unallocated advance credit available"
                          >
                            -{formatINR(std.advance_credit_paise || 0)} credit
                          </div>
                        )}
                      </td>

                      {/* Overdue Balance */}
                      <td className="py-3.5 px-3 tabular-nums text-right">
                        {std.total_overdue_paise > 0 ? (
                          <span className="font-bold text-rose-600">
                            {formatINR(std.total_overdue_paise)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">₹0</span>
                        )}
                      </td>

                      {/* Next Due Date */}
                      <td className="py-3.5 px-3 text-slate-700 whitespace-nowrap text-center">
                        {std.total_pending_paise === 0 ? (
                          <span className="text-[11px] text-emerald-600 font-semibold">Cleared</span>
                        ) : (
                          formatDateDisplay(std.next_due_date)
                        )}
                      </td>

                      {/* Current Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-center">
                        {renderStudentStatusBadge(std.fee_status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 relative">
                          <button
                            type="button"
                            onClick={() => setDrawerStudentId(std.student_id)}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-blue-100/60"
                            title="Open Student Fee Ledger"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>

                          {/* Three-dots menu */}
                          <div className="relative">
                            <button
                              aria-label="More actions"
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

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-200 text-xs text-slate-500 gap-3">
          <div>
            Showing {(studentPage - 1) * studentPageSize + 1}–
            {Math.min(studentPage * studentPageSize, studentTotalCount)} of {studentTotalCount} students
          </div>

          <div className="flex items-center gap-2">
            <button
              aria-label="Previous page"
              type="button"
              disabled={studentPage <= 1}
              onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((p) => {
                if (p > studentTotalPages) return null;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setStudentPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors ${studentPage === p
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
                    className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors ${studentPage === studentTotalPages
                        ? "bg-blue-600 text-white font-bold"
                        : "hover:bg-slate-100 text-slate-700"
                      }`}
                  >
                    {studentTotalPages}
                  </button>
                </>
              )}
            </div>

            <button
              aria-label="Next page"
              type="button"
              disabled={studentPage >= studentTotalPages}
              onClick={() => setStudentPage((p) => Math.min(studentTotalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <select
              aria-label="Page Size Select"
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

      {/* ── Slide-over Drawer: Student Fee Ledger ── */}
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



      {/* ── Send Reminders Drawer ── */}
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
        onOpenTemplates={() => { }}
      />

      {/* ── Bulk Actions Modals ── */}
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
        }}
      />
    </div>
  );
}
