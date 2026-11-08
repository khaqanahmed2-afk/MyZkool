import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Users,
  Search,
  Plus,
  Upload,
  Download,
  Phone,
  MessageSquare,
  AlertCircle,
  RotateCcw,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  X,
  CheckCircle2,
  Eye,
  Edit2,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import type { StudentListItem, StudentStatus, PlanLimitsStatus } from "../../../types/students";
import type { SchoolClass, SchoolSection } from "../../../types/curriculum";
import {
  listStudents,
  getStudentDraft,
  getStudentSummaryMetrics,
} from "../../../services/studentService";
import {
  checkSchoolStudentLimit,
  exportStudentsList,
  bulkChangeStudentStatus,
} from "../../../services/studentOperationsService";
import { getClassesWithSections, getSectionsForClass } from "../../../services/classSectionService";
import { getCurrentAcademicYear } from "../../../services/academicService";
import { StudentSummaryStrip, type StudentSummaryData } from "./StudentSummaryStrip";
import { StudentFilterChips, type StudentFilterState } from "./StudentFilterChips";
import { StudentsByClassChart } from "./StudentsByClassChart";
import { StudentOverviewChart } from "./StudentOverviewChart";
import { StudentBulkActions } from "./StudentBulkActions";
import { StudentRowActions } from "./StudentRowActions";
import { StudentQuickViewDrawer } from "./StudentQuickViewDrawer";
import { DeleteStudentModal } from "./DeleteStudentModal";

export default function StudentList() {
  const navigate = useNavigate();
  const { schoolId: authSchoolId, profile, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const schoolId = authSchoolId || "";

  // Academic year metadata
  const [academicYearId, setAcademicYearId] = useState<string | undefined>();
  const [academicYearStartDate, setAcademicYearStartDate] = useState<string | undefined>();
  const [academicYearLabel, setAcademicYearLabel] = useState("2026–2027");

  // Metadata
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<SchoolSection[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [draftCount, setDraftCount] = useState(0);
  const [planLimits, setPlanLimits] = useState<PlanLimitsStatus | null>(null);

  // Search with debounce
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Essential Filters: Class, Section, Student Status, Has Dues, New Admissions
  const [filters, setFilters] = useState<StudentFilterState>(() => {
    const rawStatus = searchParams.get("status");
    const hasDues = searchParams.get("has_dues") === "true";
    const isNewAdm = searchParams.get("new_admissions") === "true";

    return {
      status: rawStatus ? (rawStatus as StudentStatus) : undefined,
      class_id: searchParams.get("class_id") || undefined,
      section_id: searchParams.get("section_id") || undefined,
      has_dues: hasDues || undefined,
      is_new_admission: isNewAdm || undefined,
    };
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    const metricParam = searchParams.get("metric");
    if (metricParam) return metricParam;
    if (searchParams.get("has_dues") === "true") return "pending_fees";
    if (searchParams.get("status") === "enrolled") return "enrolled";
    if (searchParams.get("status") === "inactive") return "on_hold";
    if (searchParams.get("status") === "transferred") return "transferred";
    return "all";
  });

  // Server-side Pagination State (default 10 to match SaaS reference image)
  const [page, setPage] = useState<number>(() => {
    const p = Number(searchParams.get("page"));
    return !isNaN(p) && p > 0 ? p : 1;
  });
  const [pageSize, setPageSize] = useState<number>(() => {
    const ps = Number(searchParams.get("page_size"));
    return !isNaN(ps) && [10, 25, 50, 100].includes(ps) ? ps : 10;
  });
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Data & Request States
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Summary Metrics & Analytics State
  const [summaryData, setSummaryData] = useState<StudentSummaryData>({
    totalStudents: 0,
    enrolledCount: 0,
    newAdmissionsCount: 0,
    feePendingCount: 0,
    onHoldCount: 0,
    transferredCount: 0,
    leftInactiveCount: 0,
    classStrength: [],
  });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Selection & Modals / Drawers
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [quickViewStudent, setQuickViewStudent] = useState<StudentListItem | null>(null);
  const [deleteTargetStudent, setDeleteTargetStudent] = useState<StudentListItem | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Bulk Status Change Modal State
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [bulkTargetStatus, setBulkTargetStatus] = useState<StudentStatus>("enrolled");
  const [bulkStatusReason, setBulkStatusReason] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Export State
  const [isExporting, setIsExporting] = useState(false);

  // Active query sequence guard (to ignore stale responses)
  const currentQueryId = useRef(0);
  const sectionAbortController = useRef<AbortController | null>(null);

  // 1. Initial Load: Academic Year, Classes, Limits, Drafts
  useEffect(() => {
    if (!schoolId) return;

    getCurrentAcademicYear(schoolId).then((res) => {
      const activeAy = (res as any).year || (res as any).academicYear;
      if (activeAy) {
        setAcademicYearLabel(activeAy.label || activeAy.name || "2026–2027");
        setAcademicYearId(activeAy.id);
        setAcademicYearStartDate(activeAy.start_date);
      }
      getClassesWithSections(schoolId, activeAy?.id || undefined).then((clsRes) => {
        if (clsRes.classes) {
          setClasses(clsRes.classes);
        }
      });
    });

    if (user?.id) {
      getStudentDraft(schoolId, user.id)
        .then((draftRes) => {
          setDraftCount(draftRes.draft ? 1 : 0);
        })
        .catch(() => setDraftCount(0));
    }

    checkSchoolStudentLimit(schoolId).then(setPlanLimits).catch(() => {});
  }, [schoolId, user?.id]);

  // 2. Fetch Summary Statistics Scoped to School & Active Academic Year
  const loadSummaryMetrics = useCallback(async () => {
    if (!schoolId) return;
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const res = await getStudentSummaryMetrics(
        schoolId,
        academicYearId,
        academicYearStartDate
      );
      if (res.error) {
        setSummaryError(res.error);
      } else if (res.metrics) {
        setSummaryData(res.metrics);
      }
    } catch (err: any) {
      setSummaryError(err.message || "Failed to load summary statistics");
    } finally {
      setSummaryLoading(false);
    }
  }, [schoolId, academicYearId, academicYearStartDate]);

  useEffect(() => {
    if (!schoolId) return;
    loadSummaryMetrics();
  }, [loadSummaryMetrics, schoolId]);

  // 3. Dependent Section Loading: Load sections strictly for selected class
  useEffect(() => {
    if (!schoolId) return;

    if (!filters.class_id) {
      setSections([]);
      setIsLoadingSections(false);
      return;
    }

    if (sectionAbortController.current) {
      sectionAbortController.current.abort();
    }
    const controller = new AbortController();
    sectionAbortController.current = controller;

    setIsLoadingSections(true);

    getSectionsForClass(schoolId, filters.class_id, controller.signal)
      .then((res) => {
        if (!controller.signal.aborted) {
          setSections(res.sections || []);
        }
      })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          setSections([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingSections(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [schoolId, filters.class_id]);

  // 4. Fetch Students with Server-Side Pagination, Filtering, and Stale Guard
  const fetchStudents = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    const queryId = ++currentQueryId.current;
    setLoading(true);
    setError(null);

    try {
      const res = await listStudents(schoolId, {
        search: debouncedSearch || undefined,
        class_id: filters.class_id,
        section_id: filters.section_id,
        status: filters.status,
        has_dues: filters.has_dues,
        is_new_admission: filters.is_new_admission,
        academic_year_id: academicYearId,
        academic_year_start_date: academicYearStartDate,
        page,
        limit: pageSize,
        userRole: profile?.role || "school_admin",
      });

      // Ignore stale responses from superseded requests
      if (queryId !== currentQueryId.current) return;

      if (res.error) {
        setError(res.error);
        setStudents([]);
        setTotalCount(0);
        setTotalPages(1);
      } else if (res.response) {
        setStudents(res.response.data);
        const count = res.response.total ?? res.response.total_estimate ?? res.response.data.length;
        setTotalCount(count);
        setTotalPages(res.response.total_pages || Math.max(1, Math.ceil(count / pageSize)));
      }
    } catch (err: any) {
      if (queryId === currentQueryId.current) {
        setError(err?.message || "Failed to fetch student directory");
        setStudents([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } finally {
      if (queryId === currentQueryId.current) {
        setLoading(false);
      }
    }
  }, [
    schoolId,
    debouncedSearch,
    filters,
    academicYearId,
    academicYearStartDate,
    page,
    pageSize,
    profile?.role,
  ]);

  useEffect(() => {
    if (!schoolId) return;
    fetchStudents();
  }, [fetchStudents, schoolId]);

  // 5. Synchronize Filter, Search & Pagination State with URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filters.class_id) params.set("class_id", filters.class_id);
    if (filters.section_id) params.set("section_id", filters.section_id);
    if (filters.status) params.set("status", filters.status);
    if (filters.has_dues) params.set("has_dues", "true");
    if (filters.is_new_admission) params.set("new_admissions", "true");
    if (activeTab && activeTab !== "all") {
      params.set("metric", activeTab);
    }
    if (page > 1) params.set("page", String(page));
    if (pageSize !== 10) params.set("page_size", String(pageSize));

    setSearchParams(params, { replace: true });
  }, [debouncedSearch, filters, activeTab, page, pageSize, setSearchParams]);

  // Tab change handler
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setPage(1);
    setSelectedStudentIds(new Set());

    if (key === "all") {
      setFilters((prev) => ({
        ...prev,
        status: undefined,
        has_dues: undefined,
        is_new_admission: undefined,
      }));
    } else if (key === "enrolled") {
      setFilters((prev) => ({
        ...prev,
        status: "enrolled",
        has_dues: undefined,
        is_new_admission: undefined,
      }));
    } else if (key === "pending_fees" || key === "fee_pending") {
      setFilters((prev) => ({
        ...prev,
        status: undefined,
        has_dues: true,
        is_new_admission: undefined,
      }));
    } else if (key === "on_hold") {
      setFilters((prev) => ({
        ...prev,
        status: "inactive",
        has_dues: undefined,
        is_new_admission: undefined,
      }));
    } else if (key === "transferred") {
      setFilters((prev) => ({
        ...prev,
        status: "transferred",
        has_dues: undefined,
        is_new_admission: undefined,
      }));
    } else if (key === "new_admissions") {
      setFilters((prev) => ({
        ...prev,
        status: undefined,
        has_dues: undefined,
        is_new_admission: true,
      }));
    }
  };

  // Top metric card click handler
  const handleSummaryMetricClick = (key: string) => {
    if (key === "all") handleTabChange("all");
    else if (key === "active") handleTabChange("enrolled");
    else if (key === "new_admissions") handleTabChange("new_admissions");
    else if (key === "fee_pending") handleTabChange("pending_fees");
  };

  // Filter change handler
  const handleFilterChange = (newFilters: StudentFilterState) => {
    setFilters(newFilters);
    setPage(1);
    setSelectedStudentIds(new Set());
  };

  // Clear all filters handler
  const handleClearAllFilters = () => {
    setSearchQuery("");
    setActiveTab("all");
    setFilters({});
    setPage(1);
    setSelectedStudentIds(new Set());
  };

  // Row selection helpers
  const toggleSelectAll = () => {
    if (selectedStudentIds.size === students.length && students.length > 0) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(students.map((s) => s.id)));
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedStudentIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedStudentIds(next);
  };

  // Export CSV handler
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const actorId = profile?.id || user?.id || "admin";
      const selectedIds: string[] | undefined =
        selectedStudentIds.size > 0 ? Array.from<string>(selectedStudentIds) : undefined;

      const result = await exportStudentsList(
        schoolId,
        actorId,
        {
          class_id: filters.class_id,
          section_id: filters.section_id,
          status: filters.status,
          search: searchQuery || undefined,
          student_ids: selectedIds,
          has_dues: filters.has_dues,
        },
        profile?.role || "admin"
      );

      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", result.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setToastMessage(`Exported ${result.count || students.length} student records successfully.`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(`Export failed: ${err.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Bulk Status Update Submission
  const handleBulkStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentIds.size === 0) return;

    setIsUpdatingStatus(true);
    try {
      const actorId = user?.id || (profile as any)?.id || "admin";
      const actorRole = (profile?.role || "admin").toLowerCase().trim().replace(/[\s-]+/g, "_");

      const res = await bulkChangeStudentStatus(
        schoolId,
        Array.from(selectedStudentIds),
        bulkTargetStatus,
        bulkStatusReason || "Bulk status change from admin portal",
        actorId,
        actorRole
      );

      if (!res.success && res.errors.length > 0) {
        alert(`Status update completed with issues:\n${res.errors.join("\n")}`);
      } else {
        setToastMessage(`Successfully updated status for ${res.updatedCount} students.`);
        setTimeout(() => setToastMessage(null), 4000);
      }

      setIsBulkStatusModalOpen(false);
      setSelectedStudentIds(new Set());
      fetchStudents();
      loadSummaryMetrics();
    } catch (err: any) {
      alert(`Bulk status change failed: ${err.message || err}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // WhatsApp bulk notification
  const handleSendWhatsAppBulk = (templateKey: string) => {
    setToastMessage(`WhatsApp notification (${templateKey}) queued for ${selectedStudentIds.size} students.`);
    setTimeout(() => setToastMessage(null), 4000);
    setSelectedStudentIds(new Set());
  };

  // Pagination page numbers generator
  const paginationPages = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (page >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  }, [page, totalPages]);

  // Initial avatar helper
  const getInitials = (first?: string, last?: string) => {
    const f = first?.[0] || "";
    const l = last?.[0] || "";
    return (f + l).toUpperCase() || "ST";
  };

  const hasActiveFiltersOrSearch = Boolean(
    searchQuery ||
    filters.class_id ||
    filters.section_id ||
    (filters.status && filters.status !== "enrolled") ||
    filters.has_dues ||
    filters.is_new_admission ||
    activeTab !== "all"
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-5 w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-top-4 duration-150">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header: Icon, Title, Subtitle, and Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2158E0] shrink-0 shadow-2xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-display">
              Students
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage all student records, enrollment, and class information.
            </p>
            {draftCount > 0 && (
              <button
                type="button"
                onClick={() => navigate("/admin/students/new")}
                className="text-xs font-semibold text-[#2158E0] hover:underline mt-1 cursor-pointer block text-left"
              >
                Continue draft application ({draftCount})
              </button>
            )}
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => navigate("/admin/students/import")}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
            aria-label="Import students"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Import Students</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            aria-label="Export student records as CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>{isExporting ? "Exporting..." : "Export"}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/students/new")}
            disabled={planLimits?.is_blocked}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs ${
              planLimits?.is_blocked
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-[#2158E0] hover:bg-[#1A46B8] text-white shadow-blue-500/10"
            }`}
            aria-label="Add new student"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{planLimits?.is_blocked ? "Limit reached" : "Add Student"}</span>
          </button>
        </div>
      </div>

      {/* Plan Limits Warning / Capacity Notice */}
      {planLimits && (planLimits.is_warning || planLimits.is_blocked) && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-4 text-sm shadow-xs ${
            planLimits.is_blocked
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold">
                {planLimits.is_blocked
                  ? `Plan Limit Reached (${planLimits.active_count}/${planLimits.max_allowed} Active Students)`
                  : `Plan Capacity Notice (${planLimits.active_count}/${planLimits.max_allowed} Active Students - 90% Capacity)`}
              </p>
              <p className="text-xs mt-0.5 opacity-90">
                {planLimits.is_blocked
                  ? "Your school has reached the maximum student limit for this tier. New admissions and bulk imports are blocked until upgraded."
                  : "You are approaching your plan limit. Consider upgrading to accommodate more active students."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/onboarding/subscription")}
            className="px-3 py-1.5 bg-white border border-current rounded-lg text-xs font-bold shadow-xs whitespace-nowrap cursor-pointer hover:bg-slate-50"
          >
            Upgrade Plan
          </button>
        </div>
      )}

      {/* 2. Four Compact Metric Cards */}
      <StudentSummaryStrip
        data={summaryData}
        activeFilter={activeTab}
        onFilterClick={handleSummaryMetricClick}
        loading={summaryLoading}
        error={summaryError}
        onRetry={loadSummaryMetrics}
      />

      {/* 3. Analytics Row: Students by Class + Student Overview (Expanded across full width) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <StudentsByClassChart
          data={summaryData.classStrength || []}
          selectedClassId={filters.class_id}
          onSelectClass={(clsId) => {
            handleFilterChange({
              ...filters,
              class_id: clsId,
              section_id: undefined,
            });
          }}
          loading={summaryLoading}
        />

        <StudentOverviewChart
          totalCount={summaryData.totalStudents}
          enrolledCount={summaryData.enrolledCount}
          onHoldCount={summaryData.onHoldCount}
          transferredCount={summaryData.transferredCount}
          leftInactiveCount={summaryData.leftInactiveCount}
          activeStatusFilter={filters.status}
          onSelectStatus={(status) => {
            handleFilterChange({
              ...filters,
              status,
            });
            if (status === "enrolled") setActiveTab("enrolled");
            else if (status === "inactive") setActiveTab("on_hold");
            else if (status === "transferred") setActiveTab("transferred");
            else if (!status) setActiveTab("all");
          }}
          loading={summaryLoading}
        />
      </div>

      {/* 4. Structured Filters: Status Tabs + Class / Section / Status Dropdowns + Search (Full width) */}
      <StudentFilterChips
        filters={filters}
        classes={classes}
        sections={sections}
        isLoadingSections={isLoadingSections}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearAllFilters}
        totalCount={summaryData.totalStudents}
        enrolledCount={summaryData.enrolledCount}
        feePendingCount={summaryData.feePendingCount}
        onHoldCount={summaryData.onHoldCount}
        transferredCount={summaryData.transferredCount}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
      />

      {/* 5. Student Table / Directory Content (Full width) */}
      {loading ? (
        // Skeleton Loader
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-5 space-y-4 shadow-2xs">
          <div className="h-9 bg-slate-100 rounded-xl animate-pulse w-full" />
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className="animate-pulse flex items-center justify-between py-3.5 border-b border-slate-100 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200" />
                <div className="space-y-1.5">
                  <div className="w-36 h-3.5 bg-slate-200 rounded" />
                  <div className="w-24 h-2.5 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="w-28 h-5 bg-slate-100 rounded-lg hidden md:block" />
              <div className="w-32 h-4 bg-slate-200 rounded hidden md:block" />
              <div className="w-20 h-5 bg-slate-200 rounded-full hidden sm:block" />
              <div className="w-16 h-5 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>
      ) : error ? (
        // Error State with Retry
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-rose-900 font-display">
              Unable to load student directory
            </h3>
            <p className="text-xs text-rose-600 max-w-md mx-auto mt-1">{error}</p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => fetchStudents()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      ) : students.length === 0 ? (
        hasActiveFiltersOrSearch ? (
          // Empty State: Search or Filters Returned No Results
          <div className="bg-white border border-[#E6EAF3] rounded-2xl p-12 text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 font-display">
              No students match your criteria
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search terms or clearing active filters to view all students.
            </p>
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear filters</span>
            </button>
          </div>
        ) : (
          // Empty State: Brand New School (No Students Enrolled)
          <div className="bg-white border border-[#E6EAF3] rounded-2xl p-12 text-center space-y-4 shadow-2xs">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-[#2158E0] flex items-center justify-center mx-auto shadow-2xs">
              <Plus className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-display">
                No students enrolled yet
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Admit students one by one using the comprehensive admission wizard, or import entire class rosters at once via Excel.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate("/admin/students/new")}
                className="px-4 py-2 bg-[#2158E0] text-white rounded-xl text-xs font-semibold hover:bg-[#1A46B8] cursor-pointer shadow-xs transition-colors"
              >
                + Add Student
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin/students/import")}
                className="px-4 py-2 bg-white border border-[#E6EAF3] text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer shadow-2xs transition-colors"
              >
                Import class list
              </button>
            </div>
          </div>
        )
      ) : (
        <>
          {/* Desktop & Tablet Data Table (Spanning Full Available Width) */}
          <div className="hidden sm:block bg-white border border-[#E6EAF3] rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" aria-label="Student Directory Table">
                <thead>
                  <tr className="border-b border-[#E6EAF3] bg-slate-50/60 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th scope="col" className="py-3.5 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.size === students.length && students.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-[#2158E0] focus:ring-[#2158E0] cursor-pointer"
                        aria-label="Select all students on this page"
                      />
                    </th>
                    <th scope="col" className="py-3.5 px-3 w-12 text-slate-400 font-normal">#</th>
                    <th scope="col" className="py-3.5 px-4">Student</th>
                    <th scope="col" className="py-3.5 px-4">Class &amp; Section</th>
                    <th scope="col" className="py-3.5 px-4">Parent / Guardian</th>
                    <th scope="col" className="py-3.5 px-4">Status</th>
                    <th scope="col" className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EAF3] text-xs">
                  {students.map((student, index) => {
                    const isSelected = selectedStudentIds.has(student.id);
                    const rowIndex = (page - 1) * pageSize + index + 1;
                    const initials = getInitials(student.first_name, student.last_name);

                    return (
                      <tr
                        key={student.id}
                        onClick={() => setQuickViewStudent(student)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setQuickViewStudent(student);
                          }
                        }}
                        className={`hover:bg-slate-50/90 transition-colors cursor-pointer group ${
                          isSelected ? "bg-blue-50/40" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => toggleSelectRow(student.id, e as unknown as React.MouseEvent)}
                            className="rounded border-slate-300 text-[#2158E0] focus:ring-[#2158E0] cursor-pointer"
                            aria-label={`Select ${student.first_name} ${student.last_name}`}
                          />
                        </td>

                        {/* Row Index */}
                        <td className="py-3.5 px-3 text-slate-400 font-medium text-[11px]">
                          {rowIndex}
                        </td>

                        {/* Student Avatar, Name & Admission No */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-[#2158E0] flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-blue-100/80 shadow-2xs">
                              {student.photo_path ? (
                                <img
                                  src={student.photo_path}
                                  alt={student.first_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                initials
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 group-hover:text-[#2158E0] transition-colors">
                                {student.first_name} {student.last_name}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                Adm. No. {student.admission_no}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Class & Section Badge */}
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          <span className="inline-flex items-center px-3 py-1 rounded-lg bg-slate-50 text-slate-700 font-semibold text-[11px] border border-slate-200/80">
                            {student.class_name || "Class"}
                            {student.section_name ? ` - ${student.section_name}` : ""}
                          </span>
                        </td>

                        {/* Parent / Guardian & Contact */}
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          {student.primary_parent_name || student.primary_parent_phone ? (
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="font-semibold text-slate-800">
                                  {student.primary_parent_name || "Guardian"}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                  {student.primary_parent_phone ? `+91 ${student.primary_parent_phone.replace(/^\+?91/, "").trim()}` : "No phone"}
                                </div>
                              </div>
                              {student.primary_parent_phone && (
                                <div className="flex items-center gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <a
                                    href={`https://wa.me/91${student.primary_parent_phone.replace(/\D/g, "")}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors"
                                    title="WhatsApp parent"
                                    aria-label="WhatsApp parent"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </a>
                                  <a
                                    href={`tel:${student.primary_parent_phone}`}
                                    className="w-6 h-6 rounded-md bg-blue-50 text-[#2158E0] hover:bg-blue-100 flex items-center justify-center transition-colors"
                                    title="Call parent"
                                    aria-label="Call parent"
                                  >
                                    <Phone className="w-3 h-3" />
                                  </a>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Not provided</span>
                          )}
                        </td>

                        {/* Status with colored indicator dot */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize border ${
                              student.status === "enrolled"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : student.status === "inactive"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : student.status === "transferred"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                student.status === "enrolled"
                                  ? "bg-emerald-500"
                                  : student.status === "inactive"
                                  ? "bg-blue-500"
                                  : student.status === "transferred"
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              }`}
                            />
                            {student.status.replace("_", " ")}
                          </span>
                        </td>

                        {/* Action Icons: View, Edit, More (3-dots) */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/students/${student.id}`)}
                              className="p-1.5 text-slate-400 hover:text-[#2158E0] rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                              title="View profile"
                              aria-label="View profile"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => navigate(`/admin/students/${student.id}/edit`)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Edit student"
                              aria-label="Edit student"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <StudentRowActions
                              student={student}
                              onView={(s) => navigate(`/admin/students/${s.id}`)}
                              onEdit={(s) => navigate(`/admin/students/${s.id}/edit`)}
                              onGenerateIdCard={(s) => navigate(`/admin/students/id-cards?student=${s.id}`)}
                              onViewDocuments={(s) => navigate(`/admin/students/${s.id}?tab=documents`)}
                              onViewFees={(s) => navigate(`/admin/fees/collect?student=${s.id}`)}
                              onViewAttendance={(s) => navigate(`/admin/attendance?student=${s.id}`)}
                              onViewTransport={(s) => navigate(`/admin/transport?student=${s.id}`)}
                              onPromote={(s) => navigate(`/admin/students/promotion?student=${s.id}`)}
                              onTransfer={(s) => navigate(`/admin/students/tc?student=${s.id}`)}
                              onDeactivate={(s) => setDeleteTargetStudent(s)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List (< 640px) */}
          <div className="sm:hidden space-y-3">
            {students.map((student, index) => {
              const isSelected = selectedStudentIds.has(student.id);
              const rowIndex = (page - 1) * pageSize + index + 1;
              const initials = getInitials(student.first_name, student.last_name);

              return (
                <div
                  key={student.id}
                  className={`bg-white border rounded-2xl p-4 space-y-3 shadow-2xs transition-colors ${
                    isSelected ? "border-[#2158E0] ring-1 ring-[#2158E0] bg-blue-50/20" : "border-[#E6EAF3]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleSelectRow(student.id, e as unknown as React.MouseEvent)}
                        className="rounded border-slate-300 text-[#2158E0] focus:ring-[#2158E0] cursor-pointer"
                        aria-label={`Select ${student.first_name}`}
                      />
                      <button
                        type="button"
                        onClick={() => setQuickViewStudent(student)}
                        className="flex items-center gap-3 text-left cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-[#2158E0] flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-blue-100">
                          {student.photo_path ? (
                            <img
                              src={student.photo_path}
                              alt={student.first_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            initials
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm group-hover:text-[#2158E0] transition-colors">
                            <span className="text-slate-400 font-normal mr-1.5">#{rowIndex}</span>
                            {student.first_name} {student.last_name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Adm. No. {student.admission_no}
                          </div>
                        </div>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/students/${student.id}`)}
                        className="p-1 text-slate-400 hover:text-[#2158E0]"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <StudentRowActions
                        student={student}
                        onView={(s) => navigate(`/admin/students/${s.id}`)}
                        onEdit={(s) => navigate(`/admin/students/${s.id}/edit`)}
                        onGenerateIdCard={(s) => navigate(`/admin/students/id-cards?student=${s.id}`)}
                        onViewDocuments={(s) => navigate(`/admin/students/${s.id}?tab=documents`)}
                        onViewFees={(s) => navigate(`/admin/fees/collect?student=${s.id}`)}
                        onViewAttendance={(s) => navigate(`/admin/attendance?student=${s.id}`)}
                        onViewTransport={(s) => navigate(`/admin/transport?student=${s.id}`)}
                        onPromote={(s) => navigate(`/admin/students/promotion?student=${s.id}`)}
                        onTransfer={(s) => navigate(`/admin/students/tc?student=${s.id}`)}
                        onDeactivate={(s) => setDeleteTargetStudent(s)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-semibold text-[11px] border border-slate-200/80">
                      {student.class_name || "Grade"}
                      {student.section_name ? ` - ${student.section_name}` : ""}
                    </span>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        student.status === "enrolled"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : student.status === "inactive"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : student.status === "transferred"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {student.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <span className="truncate max-w-[180px]">
                      Parent: <span className="font-medium text-slate-800">{student.primary_parent_name || "Guardian"}</span>
                    </span>
                    {student.primary_parent_phone && (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <a
                          href={`https://wa.me/91${student.primary_parent_phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors"
                          title="WhatsApp"
                          aria-label="WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`tel:${student.primary_parent_phone}`}
                          className="w-7 h-7 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center hover:bg-blue-100 transition-colors"
                          title="Call"
                          aria-label="Call"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 5. Scalable Server-Side Pagination & Count Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 text-xs text-slate-500">
            {/* Left: Showing X to Y of Z students */}
            <div className="text-slate-600 font-medium">
              Showing{" "}
              <span className="font-bold text-slate-900">
                {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-bold text-slate-900">
                {Math.min(page * pageSize, totalCount)}
              </span>{" "}
              of <span className="font-bold text-slate-900">{totalCount}</span> students
            </div>

            {/* Center / Right Controls: Rows per page and Page numbers */}
            <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-end">
              {/* Rows per page dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Rows per page</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newLimit = Number(e.target.value);
                    setPageSize(newLimit);
                    setPage(1);
                  }}
                  aria-label="Rows per page"
                  className="px-2.5 py-1.5 bg-white border border-[#E6EAF3] rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2158E0] cursor-pointer shadow-2xs"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Pagination Buttons: << < 1 2 3 ... 11 > >> */}
              <div className="flex items-center gap-1">
                {/* First Page */}
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  disabled={page <= 1 || loading}
                  className="p-1.5 rounded-lg border border-[#E6EAF3] bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                  title="First Page"
                  aria-label="Go to first page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>

                {/* Previous Page */}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="p-1.5 rounded-lg border border-[#E6EAF3] bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                  title="Previous Page"
                  aria-label="Go to previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {/* Page Numbers */}
                {paginationPages.map((pageNum, idx) => {
                  if (pageNum === "...") {
                    return (
                      <span key={`dots-${idx}`} className="px-2 py-1 text-slate-400">
                        ...
                      </span>
                    );
                  }
                  const pNum = Number(pageNum);
                  const isCurrent = page === pNum;

                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setPage(pNum)}
                      className={`min-w-[32px] h-8 rounded-xl font-semibold text-xs flex items-center justify-center transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-[#2158E0] text-white shadow-xs"
                          : "bg-white border border-[#E6EAF3] text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs"
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}

                {/* Next Page */}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="p-1.5 rounded-lg border border-[#E6EAF3] bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                  title="Next Page"
                  aria-label="Go to next page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {/* Last Page */}
                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages || loading}
                  className="p-1.5 rounded-lg border border-[#E6EAF3] bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                  title="Last Page"
                  aria-label="Go to last page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Quick View Drawer */}
      {quickViewStudent && (
        <StudentQuickViewDrawer
          student={quickViewStudent}
          schoolId={schoolId}
          onClose={() => setQuickViewStudent(null)}
          onDelete={(s) => setDeleteTargetStudent(s)}
        />
      )}

      {/* Contextual Bulk Action Bar */}
      <StudentBulkActions
        selectedCount={selectedStudentIds.size}
        onClearSelection={() => setSelectedStudentIds(new Set())}
        onPromoteSelected={() => {
          navigate(`/admin/students/promotion?selected=${Array.from(selectedStudentIds).join(",")}`);
        }}
        onGenerateIdCards={() => {
          navigate(`/admin/students/id-cards?selected=${Array.from(selectedStudentIds).join(",")}`);
        }}
        onExportSelected={handleExportCSV}
        onAssignTransport={() => {
          navigate(`/admin/transport?selected=${Array.from(selectedStudentIds).join(",")}`);
        }}
        onChangeStatus={() => setIsBulkStatusModalOpen(true)}
        onSendWhatsApp={handleSendWhatsAppBulk}
        onDeleteSelected={() => setIsBulkDeleteModalOpen(true)}
      />

      {/* Bulk Status Change Modal */}
      {isBulkStatusModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm font-display">
                Change Status for {selectedStudentIds.size} Students
              </h3>
              <button
                type="button"
                onClick={() => setIsBulkStatusModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label="Close status modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBulkStatusSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select New Status</label>
                <select
                  value={bulkTargetStatus}
                  onChange={(e) => setBulkTargetStatus(e.target.value as StudentStatus)}
                  className="w-full bg-white border border-[#E6EAF3] rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-[#2158E0] focus:outline-none cursor-pointer"
                >
                  <option value="enrolled">Enrolled / Active</option>
                  <option value="inactive">On Hold / Inactive</option>
                  <option value="transferred">Transferred</option>
                  <option value="withdrawn">Withdrawn</option>
                  <option value="passed_out">Passed out</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reason for Status Change</label>
                <textarea
                  rows={3}
                  value={bulkStatusReason}
                  onChange={(e) => setBulkStatusReason(e.target.value)}
                  placeholder="e.g., Annual enrollment review / batch transfer..."
                  required
                  className="w-full bg-slate-50 border border-[#E6EAF3] rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-[#2158E0] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBulkStatusModalOpen(false)}
                  className="px-4 py-2 border border-[#E6EAF3] text-slate-700 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-4 py-2 bg-[#2158E0] hover:bg-[#1A46B8] text-white rounded-xl font-semibold cursor-pointer shadow-xs disabled:opacity-50 transition-colors"
                >
                  {isUpdatingStatus ? "Updating..." : `Update ${selectedStudentIds.size} Students`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {isBulkDeleteModalOpen && (
        <DeleteStudentModal
          isOpen={isBulkDeleteModalOpen}
          onClose={() => setIsBulkDeleteModalOpen(false)}
          schoolId={schoolId}
          bulkStudents={students
            .filter((s) => selectedStudentIds.has(s.id))
            .map((s) => ({
              id: s.id,
              name: `${s.first_name} ${s.last_name}`,
              admission_no: s.admission_no,
              class_name: s.class_name || undefined,
            }))}
          onSuccess={() => {
            setSelectedStudentIds(new Set());
            fetchStudents();
            loadSummaryMetrics();
          }}
        />
      )}

      {/* Single Student Delete Modal */}
      {deleteTargetStudent && (
        <DeleteStudentModal
          isOpen={Boolean(deleteTargetStudent)}
          onClose={() => setDeleteTargetStudent(null)}
          schoolId={schoolId}
          student={{
            id: deleteTargetStudent.id,
            name: `${deleteTargetStudent.first_name} ${deleteTargetStudent.last_name}`,
            admission_no: deleteTargetStudent.admission_no,
            class_name: deleteTargetStudent.class_name || undefined,
          }}
          onSuccess={() => {
            setDeleteTargetStudent(null);
            if (quickViewStudent?.id === deleteTargetStudent.id) {
              setQuickViewStudent(null);
            }
            fetchStudents();
            loadSummaryMetrics();
          }}
        />
      )}
    </div>
  );
}
