import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Plus,
  Upload,
  Phone,
  MessageSquare,
  AlertCircle,
  RotateCcw,
  AlertTriangle,
  Download,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  X,
  CheckCircle2,
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
  const [academicYearLabel, setAcademicYearLabel] = useState("2026–27");

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

  const [activeSummaryFilter, setActiveSummaryFilter] = useState<string>(() => {
    return searchParams.get("metric") || "all";
  });

  // Server-side Pagination State
  const [page, setPage] = useState<number>(() => {
    const p = Number(searchParams.get("page"));
    return !isNaN(p) && p > 0 ? p : 1;
  });
  const [pageSize, setPageSize] = useState<number>(() => {
    const ps = Number(searchParams.get("page_size"));
    return !isNaN(ps) && [25, 50, 100, 200].includes(ps) ? ps : 50;
  });
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Data & Request States
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Summary Metrics State
  const [summaryData, setSummaryData] = useState<StudentSummaryData>({
    totalStudents: 0,
    enrolledCount: 0,
    newAdmissionsCount: 0,
    feePendingCount: 0,
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
        setAcademicYearLabel(activeAy.label || activeAy.name || "2026–27");
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
      // No class selected: clear sections immediately
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
    if (activeSummaryFilter && activeSummaryFilter !== "all") {
      params.set("metric", activeSummaryFilter);
    }
    if (page > 1) params.set("page", String(page));
    if (pageSize !== 50) params.set("page_size", String(pageSize));

    setSearchParams(params, { replace: true });
  }, [debouncedSearch, filters, activeSummaryFilter, page, pageSize, setSearchParams]);

  // Summary strip filter handler
  const handleSummaryFilter = (key: string) => {
    setActiveSummaryFilter(key);
    setPage(1);
    setSelectedStudentIds(new Set());

    if (key === "all") {
      setFilters((prev) => ({
        ...prev,
        status: undefined,
        has_dues: undefined,
        is_new_admission: undefined,
      }));
    } else if (key === "active") {
      setFilters((prev) => ({
        ...prev,
        status: "enrolled",
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
    } else if (key === "fee_pending") {
      setFilters((prev) => ({
        ...prev,
        status: undefined,
        has_dues: true,
        is_new_admission: undefined,
      }));
    }
  };

  // Filter change handler
  const handleFilterChange = (newFilters: StudentFilterState) => {
    setFilters(newFilters);
    setActiveSummaryFilter("");
    setPage(1);
    setSelectedStudentIds(new Set());
  };

  // Clear all filters handler
  const handleClearAllFilters = () => {
    setSearchQuery("");
    setActiveSummaryFilter("all");
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

  const hasActiveFiltersOrSearch = Boolean(
    searchQuery ||
    filters.class_id ||
    filters.section_id ||
    (filters.status && filters.status !== "enrolled") ||
    filters.has_dues ||
    filters.is_new_admission
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-top-4 duration-150">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">
              Students
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#2158E0]/10 text-[#2158E0] border border-[#2158E0]/20">
              AY {academicYearLabel}
            </span>
          </div>
          {draftCount > 0 && (
            <button
              type="button"
              onClick={() => navigate("/admin/students/new")}
              className="text-xs font-semibold text-[#2158E0] hover:underline mt-1 cursor-pointer block text-left"
            >
              Continue draft ({draftCount})
            </button>
          )}
        </div>

        {/* Primary Actions: Add Student, Import Students, Export */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            aria-label="Export student records as CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{isExporting ? "Exporting..." : "Export"}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/students/import")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer shadow-2xs"
            aria-label="Import students via spreadsheet"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import Students</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/students/new")}
            disabled={planLimits?.is_blocked}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs ${
              planLimits?.is_blocked
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-[#2158E0] hover:bg-[#1A46B8] text-white"
            }`}
            aria-label="Add new student"
          >
            <Plus className="w-4 h-4" />
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

      {/* 2. Essential Student Statistics */}
      <StudentSummaryStrip
        data={summaryData}
        activeFilter={activeSummaryFilter}
        onFilterClick={handleSummaryFilter}
        loading={summaryLoading}
        error={summaryError}
        onRetry={loadSummaryMetrics}
      />

      {/* 3. Search Bar and Dependent Filter Row */}
      <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Bar across Name, Admission No, Parent Name, Parent Phone */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              aria-label="Search student directory"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by student name, admission no, parent name, or phone..."
              className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 border border-[#E6EAF3] rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2158E0] focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Clear search"
                aria-label="Clear search input"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Dependent Filters: Class -> Section, Student Status */}
        <StudentFilterChips
          filters={filters}
          classes={classes}
          sections={sections}
          isLoadingSections={isLoadingSections}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearAllFilters}
        />
      </div>

      {/* 4. Student Directory Content States */}
      {loading ? (
        // Loading State: Skeleton Table
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 space-y-4 shadow-2xs">
          <div className="h-8 bg-slate-100 rounded-xl animate-pulse w-full" />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="animate-pulse flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-200" />
                <div className="space-y-1.5">
                  <div className="w-36 h-3.5 bg-slate-200 rounded-sm" />
                  <div className="w-24 h-2.5 bg-slate-100 rounded-sm" />
                </div>
              </div>
              <div className="w-24 h-4 bg-slate-200 rounded-sm hidden md:block" />
              <div className="w-28 h-4 bg-slate-200 rounded-sm hidden md:block" />
              <div className="w-20 h-5 bg-slate-200 rounded-full hidden md:block" />
              <div className="w-16 h-5 bg-slate-200 rounded-full" />
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
          {/* Desktop & Tablet Data Table */}
          <div className="hidden sm:block bg-white border border-[#E6EAF3] rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" aria-label="Student Directory Table">
                <thead>
                  <tr className="border-b border-[#E6EAF3] bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th scope="col" className="py-3.5 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.size === students.length && students.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-[#2158E0] focus:ring-[#2158E0] cursor-pointer"
                        aria-label="Select all students on this page"
                      />
                    </th>
                    <th scope="col" className="py-3.5 px-4">Student</th>
                    <th scope="col" className="py-3.5 px-4">Class & Section</th>
                    <th scope="col" className="py-3.5 px-4">Primary Parent</th>
                    <th scope="col" className="py-3.5 px-4">Status</th>
                    <th scope="col" className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EAF3] text-xs">
                  {students.map((student) => {
                    const isSelected = selectedStudentIds.has(student.id);

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
                        className={`hover:bg-slate-50/90 transition-colors cursor-pointer ${
                          isSelected ? "bg-blue-50/50" : ""
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

                        {/* Student Name & Avatar */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-50 text-[#2158E0] flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-slate-200">
                              {student.photo_path ? (
                                <img
                                  src={student.photo_path}
                                  alt={student.first_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                `${student.first_name[0] || ""}${student.last_name[0] || ""}`.toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 hover:text-[#2158E0] transition-colors">
                                {student.first_name} {student.last_name}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {student.admission_no}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Class & Section */}
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-semibold text-[11px] border border-slate-200/80">
                            {student.class_name || "Grade"}
                            {student.section_name ? ` - ${student.section_name}` : ""}
                          </span>
                        </td>

                        {/* Primary Parent & Contact */}
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          {student.primary_parent_phone ? (
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="font-medium text-slate-800">
                                  {student.primary_parent_name || "Guardian"}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {student.primary_parent_phone}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 ml-1">
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
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Not set</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize border ${
                              student.status === "enrolled"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : student.status === "inactive"
                                ? "bg-slate-100 text-slate-600 border-slate-200"
                                : student.status === "transferred"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {student.status.replace("_", " ")}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/students/${student.id}`)}
                              className="text-xs font-semibold text-[#2158E0] hover:underline px-2 py-1 cursor-pointer"
                            >
                              View
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
            {students.map((student) => {
              const isSelected = selectedStudentIds.has(student.id);

              return (
                <div
                  key={student.id}
                  className={`bg-white border rounded-2xl p-4 space-y-3 shadow-2xs transition-colors ${
                    isSelected ? "border-[#2158E0] ring-1 ring-[#2158E0] bg-blue-50/20" : "border-[#E6EAF3]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-1 -ml-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelectRow(student.id, e as unknown as React.MouseEvent)}
                          className="rounded border-slate-300 text-[#2158E0] focus:ring-[#2158E0] cursor-pointer"
                          aria-label={`Select ${student.first_name}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuickViewStudent(student)}
                        className="flex items-center gap-3 text-left cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-[#2158E0] flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-slate-200">
                          {student.photo_path ? (
                            <img
                              src={student.photo_path}
                              alt={student.first_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            `${student.first_name[0] || ""}${student.last_name[0] || ""}`.toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm group-hover:text-[#2158E0] transition-colors">
                            {student.first_name} {student.last_name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {student.admission_no}
                          </div>
                        </div>
                      </button>
                    </div>

                    <div>
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
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-semibold text-[11px] border border-slate-200/80">
                      {student.class_name || "Grade"}
                      {student.section_name ? ` - ${student.section_name}` : ""}
                    </span>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                        student.status === "enrolled"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : student.status === "inactive"
                          ? "bg-slate-100 text-slate-600 border-slate-200"
                          : student.status === "transferred"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
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
                          title="WhatsApp parent"
                          aria-label="WhatsApp parent"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`tel:${student.primary_parent_phone}`}
                          className="w-7 h-7 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center hover:bg-blue-100 transition-colors"
                          title="Call parent"
                          aria-label="Call parent"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Floating Mobile Add Button */}
            <button
              type="button"
              onClick={() => navigate("/admin/students/new")}
              className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#2158E0] text-white shadow-xl flex items-center justify-center hover:bg-[#1A46B8] cursor-pointer active:scale-95 transition-transform"
              aria-label="Add Student"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {/* 5. Scalable Server-Side Pagination & Count Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 text-xs text-slate-500 border-t border-slate-200/80">
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-700">
                  {Math.min(page * pageSize, totalCount)}
                </span>{" "}
                of <span className="font-semibold text-slate-700">{totalCount}</span> students
              </div>

              <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
                <span className="text-slate-500">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newLimit = Number(e.target.value);
                    setPageSize(newLimit);
                    setPage(1);
                  }}
                  aria-label="Rows per page"
                  className="px-2 py-1 bg-white border border-[#E6EAF3] rounded-md font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#2158E0] cursor-pointer"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1.5">
              {/* First Page */}
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded-lg border border-[#E6EAF3] bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                className="p-1.5 rounded-lg border border-[#E6EAF3] bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
                aria-label="Go to previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Page Number Indicator */}
              <span className="px-3 py-1 font-semibold text-slate-700 bg-slate-50 border border-slate-200/80 rounded-lg text-xs">
                Page {page} of {Math.max(1, totalPages)}
              </span>

              {/* Next Page */}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="p-1.5 rounded-lg border border-[#E6EAF3] bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                className="p-1.5 rounded-lg border border-[#E6EAF3] bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Last Page"
                aria-label="Go to last page"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
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
              <h3 className="font-bold text-slate-900 text-sm">
                Change Status for {selectedStudentIds.size} Students
              </h3>
              <button
                type="button"
                onClick={() => setIsBulkStatusModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
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
                  className="w-full bg-white border border-[#E6EAF3] rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-[#2158E0]"
                >
                  <option value="enrolled">Enrolled / Active</option>
                  <option value="inactive">Inactive</option>
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
                  className="w-full bg-slate-50 border border-[#E6EAF3] rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-[#2158E0] focus:bg-white"
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
                  className="px-4 py-2 bg-[#2158E0] hover:bg-[#1A46B8] text-white rounded-xl font-semibold cursor-pointer shadow-xs disabled:opacity-50"
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
