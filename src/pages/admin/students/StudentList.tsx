import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Plus,
  Upload,
  Phone,
  MessageSquare,
  AlertCircle,
  RotateCcw,
  Sparkles,
  FileText,
  AlertTriangle,
  Download,
  CreditCard,
  Bus,
  ChevronRight,
  X,
  FileBadge,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import type { StudentListItem, StudentStatus, PlanLimitsStatus } from "../../../types/students";
import type { SchoolClass, SchoolSection } from "../../../types/curriculum";
import { listStudents, getStudentDraft } from "../../../services/studentService";
import { checkSchoolStudentLimit, exportStudentsList } from "../../../services/studentOperationsService";
import { getClassesWithSections } from "../../../services/classSectionService";
import { getCurrentAcademicYear } from "../../../services/academicService";
import { StudentSummaryStrip, type StudentSummaryData } from "./StudentSummaryStrip";
import { StudentFilterChips, type StudentFilterState } from "./StudentFilterChips";
import { StudentColumnChooser, type ColumnVisibility, DEFAULT_COLUMN_VISIBILITY } from "./StudentColumnChooser";
import { StudentBulkActions } from "./StudentBulkActions";
import { StudentRowActions } from "./StudentRowActions";
import { StudentQuickViewDrawer } from "./StudentQuickViewDrawer";
import { DeleteStudentModal } from "./DeleteStudentModal";

export default function StudentList() {
  const navigate = useNavigate();
  const { schoolId: authSchoolId, profile, user } = useAuth();
  const [searchParams] = useSearchParams();

  // State
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [transportMap, setTransportMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(50);

  // Search with 300ms debounce
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filters & Saved Views
  const [filters, setFilters] = useState<StudentFilterState>({
    status: (searchParams.get("status") as StudentStatus) || "enrolled",
    class_id: searchParams.get("class_id") || undefined,
    section_id: searchParams.get("section_id") || undefined,
  });
  const [savedView, setSavedView] = useState("active");
  const [activeSummaryFilter, setActiveSummaryFilter] = useState<string>("active");

  // Selection & Modals / Drawers
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [quickViewStudent, setQuickViewStudent] = useState<StudentListItem | null>(null);
  const [deleteTargetStudent, setDeleteTargetStudent] = useState<StudentListItem | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Metadata
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<SchoolSection[]>([]);
  const [academicYearLabel, setAcademicYearLabel] = useState("2026–27");
  const [draftCount, setDraftCount] = useState(0);
  const [planLimits, setPlanLimits] = useState<PlanLimitsStatus | null>(null);

  // Column visibility
  const [columns, setColumns] = useState<ColumnVisibility>(DEFAULT_COLUMN_VISIBILITY);

  const schoolId = authSchoolId || "";

  // Load classes, sections, academic year, and drafts
  useEffect(() => {
    if (!schoolId) return;

    getCurrentAcademicYear(schoolId).then((res) => {
      const activeAy = (res as any).year || (res as any).academicYear;
      if (activeAy) {
        setAcademicYearLabel(activeAy.label);
      }
      getClassesWithSections(schoolId, activeAy?.id || undefined).then((clsRes) => {
        if (clsRes.classes) {
          setClasses(clsRes.classes);
          const allSections = clsRes.classes.flatMap((c) => c.sections || []);
          setSections(allSections);
        }
      });
    });

    if (user?.id) {
      getStudentDraft(schoolId, user.id)
        .then((draftRes) => {
          if (draftRes.draft) {
            setDraftCount(1);
          } else {
            setDraftCount(0);
          }
        })
        .catch(() => {
          setDraftCount(0);
        });
    }

    checkSchoolStudentLimit(schoolId).then(setPlanLimits).catch(() => {});
  }, [schoolId, user?.id]);

  // Fetch students
  const fetchStudents = useCallback(
    async (cursor?: string) => {
      if (!schoolId) {
        setLoading(false);
        return;
      }
      if (!cursor) {
        setLoading(true);
      }
      setError(null);

      const res = await listStudents(schoolId, {
        search: debouncedSearch || undefined,
        class_id: filters.class_id,
        section_id: filters.section_id,
        status: filters.status,
        gender: filters.gender,
        category: filters.category,
        is_rte: filters.is_rte,
        documents_pending: filters.documents_pending,
        has_dues: filters.has_dues,
        uses_transport: filters.uses_transport,
        cursor,
        limit: pageSize,
        userRole: profile?.role,
      });

      if (res.error) {
        setError(res.error);
      } else if (res.response) {
        setStudents((prev) => (cursor ? [...prev, ...res.response!.data] : res.response!.data));
        setNextCursor(res.response.next_cursor || null);
        setTotalCount(res.response.total_estimate || res.response.data.length);

        // Load transport mapping for quick badges
        try {
          const assigns = JSON.parse(
            localStorage.getItem(`myzkool_transport_assignments_${schoolId}`) || "[]"
          );
          const rts = JSON.parse(localStorage.getItem(`myzkool_transport_routes_${schoolId}`) || "[]");
          const rMap = new Map(rts.map((r: any) => [r.id, r.name]));
          const tMap: Record<string, string> = {};
          assigns
            .filter((a: any) => a.status === "active")
            .forEach((a: any) => {
              tMap[a.student_id] = (rMap.get(a.route_id) as string) || "Transport Route";
            });
          setTransportMap(tMap);
        } catch {}
      }
      setLoading(false);
    },
    [schoolId, debouncedSearch, filters, profile?.role, pageSize]
  );

  useEffect(() => {
    if (!schoolId) return;
    fetchStudents();
  }, [fetchStudents, schoolId]);

  // Saved view handler
  const handleSelectSavedView = (viewKey: string) => {
    setSavedView(viewKey);
    setActiveSummaryFilter(viewKey);

    if (viewKey === "all_students") {
      setFilters({});
    } else if (viewKey === "active") {
      setFilters({ status: "enrolled" });
    } else if (viewKey === "new_admissions") {
      setFilters({ status: "enrolled" });
    } else if (viewKey === "docs_pending") {
      setFilters({ status: "enrolled", documents_pending: true });
    } else if (viewKey === "fee_pending") {
      setFilters({ status: "enrolled", has_dues: true });
    } else if (viewKey === "transport") {
      setFilters({ status: "enrolled", uses_transport: true });
    } else if (viewKey === "left_school") {
      setFilters({ status: "transferred" });
    }
  };

  // Summary strip filter click handler
  const handleSummaryFilter = (key: string) => {
    setActiveSummaryFilter(key);
    if (key === "all") {
      setSavedView("all_students");
      setFilters({});
    } else if (key === "active") {
      setSavedView("active");
      setFilters({ status: "enrolled" });
    } else if (key === "new_admissions") {
      setSavedView("new_admissions");
      setFilters({ status: "enrolled" });
    } else if (key === "boys") {
      setSavedView("");
      setFilters({ status: "enrolled", gender: "male" });
    } else if (key === "girls") {
      setSavedView("");
      setFilters({ status: "enrolled", gender: "female" });
    } else if (key === "docs_pending") {
      setSavedView("docs_pending");
      setFilters({ status: "enrolled", documents_pending: true });
    } else if (key === "fee_pending") {
      setSavedView("fee_pending");
      setFilters({ status: "enrolled", has_dues: true });
    } else if (key === "transport") {
      setSavedView("transport");
      setFilters({ status: "enrolled", uses_transport: true });
    }
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

  // Summary stats computation
  const summaryData: StudentSummaryData = useMemo(() => {
    const boysCount = students.filter((s) => s.gender === "male").length;
    const girlsCount = students.filter((s) => s.gender === "female").length;
    const enrolledCount = students.filter((s) => s.status === "enrolled").length;
    const documentsPending = students.filter((s) => (s.documents_pending_count || 0) > 0).length;
    const feePendingCount = students.filter(
      (s) => s.fee_status === "overdue" || s.fee_status === "pending"
    ).length;
    const transportCount = students.filter(
      (s) => Boolean(s.transport_route) || Boolean(transportMap[s.id])
    ).length;

    return {
      totalStudents: totalCount || students.length,
      enrolledCount: enrolledCount || totalCount,
      newAdmissionsCount: totalCount || students.length,
      boysCount,
      girlsCount,
      documentsPending,
      feePendingCount,
      transportCount,
    };
  }, [students, totalCount, transportMap]);

  // Export CSV handler
  const [isExporting, setIsExporting] = useState(false);
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const actorId = profile?.id || "admin";
      const result = await exportStudentsList(
        schoolId,
        actorId,
        {
          class_id: filters.class_id,
          section_id: filters.section_id,
          status: filters.status,
          search: searchQuery || undefined,
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

  // Clear all filters handler
  const handleClearAllFilters = () => {
    setSearchQuery("");
    setSavedView("all_students");
    setActiveSummaryFilter("all");
    setFilters({});
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4">
      {/* 1. Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              className="text-xs font-semibold text-[#2158E0] hover:underline mt-1 cursor-pointer block"
            >
              Continue draft ({draftCount})
            </button>
          )}
        </div>

        {/* Right-side Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => navigate("/admin/students/import")}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import Students</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/students/promotion")}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Promote Students</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/students/tc")}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            <FileBadge className="w-3.5 h-3.5 text-slate-500" />
            <span>TC Register</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/students/id-cards")}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            <CreditCard className="w-3.5 h-3.5 text-slate-500" />
            <span>ID Cards</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{isExporting ? "Exporting..." : "Export"}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/students/new")}
            disabled={planLimits?.is_blocked}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs ${
              planLimits?.is_blocked
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-[#2158E0] hover:bg-[#1A46B8] text-white"
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{planLimits?.is_blocked ? "Limit reached" : "+ Add Student"}</span>
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

      {/* 2. Summary Metric Cards */}
      <StudentSummaryStrip
        data={summaryData}
        activeFilter={activeSummaryFilter}
        onFilterClick={handleSummaryFilter}
      />

      {/* 3. Search and Filters Card */}
      <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Trigram Search Box */}
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, admission no, parent name, phone, SR no..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-[#E6EAF3] rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2158E0] focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right side controls: Column visibility chooser */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <StudentColumnChooser columns={columns} onChange={setColumns} />
          </div>
        </div>

        {/* Saved Views and Filters */}
        <StudentFilterChips
          filters={filters}
          classes={classes}
          sections={sections}
          onFilterChange={(newFilters) => {
            setFilters(newFilters);
            setSavedView("");
            setActiveSummaryFilter("");
          }}
          onClearFilters={handleClearAllFilters}
          savedView={savedView}
          onSelectSavedView={handleSelectSavedView}
        />
      </div>

      {/* 4. Table & Responsive Card States */}
      {loading ? (
        // Skeleton Loader
        <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 space-y-4 shadow-2xs">
          <div className="h-8 bg-slate-100 rounded-lg animate-pulse w-full" />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="animate-pulse flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200" />
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
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="text-sm font-semibold text-rose-900">Unable to load student directory</h3>
          <p className="text-xs text-rose-600 max-w-sm mx-auto">
            Please check your connection or retry fetching the student records.
          </p>
          <button
            type="button"
            onClick={() => fetchStudents()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer shadow-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      ) : students.length === 0 ? (
        searchQuery || Object.keys(filters).length > 0 ? (
          // Empty State: Search / Filter No Results
          <div className="bg-white border border-[#E6EAF3] rounded-2xl p-12 text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 font-display">
              No students match your criteria
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search terms or clearing one or more active filters to view all students.
            </p>
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 cursor-pointer transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          // Empty State: Brand New School
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
                className="px-4 py-2 bg-[#2158E0] text-white rounded-xl text-xs font-semibold hover:bg-[#1A46B8] cursor-pointer shadow-xs"
              >
                + Add Student
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin/students/import")}
                className="px-4 py-2 bg-white border border-[#E6EAF3] text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer shadow-2xs"
              >
                Import class list
              </button>
            </div>
          </div>
        )
      ) : (
        <>
          {/* Desktop Data Table (Hidden on Mobile) */}
          <div className="hidden md:block bg-white border border-[#E6EAF3] rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E6EAF3] bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.size === students.length && students.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-[#2158E0] focus:ring-[#2158E0] cursor-pointer"
                        aria-label="Select all students"
                      />
                    </th>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Class & Section</th>
                    {columns.roll_no && <th className="py-3.5 px-4">Roll No.</th>}
                    {columns.parent_phone && <th className="py-3.5 px-4">Primary Parent</th>}
                    {columns.gender && <th className="py-3.5 px-4">Gender</th>}
                    {columns.category && <th className="py-3.5 px-4">Category</th>}
                    {columns.transport && <th className="py-3.5 px-4">Transport</th>}
                    {columns.fee_status && <th className="py-3.5 px-4">Fee Status</th>}
                    {columns.documents && <th className="py-3.5 px-4">Documents</th>}
                    {columns.dob && <th className="py-3.5 px-4">DOB</th>}
                    {columns.admission_date && <th className="py-3.5 px-4">Admission Date</th>}
                    {columns.sr_no && <th className="py-3.5 px-4">SR No.</th>}
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EAF3] text-xs">
                  {students.map((student) => {
                    const isSelected = selectedStudentIds.has(student.id);
                    const route = student.transport_route || transportMap[student.id];

                    return (
                      <tr
                        key={student.id}
                        onClick={() => setQuickViewStudent(student)}
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
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-semibold text-[11px] border border-slate-200/80">
                            {student.class_name || "Grade"}
                            {student.section_name ? ` - ${student.section_name}` : ""}
                          </span>
                        </td>

                        {/* Roll No */}
                        {columns.roll_no && (
                          <td className="py-3.5 px-4 font-mono text-slate-600">—</td>
                        )}

                        {/* Primary Parent */}
                        {columns.parent_phone && (
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
                                <div className="flex items-center gap-1">
                                  <a
                                    href={`https://wa.me/91${student.primary_parent_phone.replace(/\D/g, "")}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors"
                                    title="WhatsApp parent"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </a>
                                  <a
                                    href={`tel:${student.primary_parent_phone}`}
                                    className="w-6 h-6 rounded-md bg-blue-50 text-[#2158E0] hover:bg-blue-100 flex items-center justify-center transition-colors"
                                    title="Call parent"
                                  >
                                    <Phone className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Not set</span>
                            )}
                          </td>
                        )}

                        {/* Gender */}
                        {columns.gender && (
                          <td className="py-3.5 px-4 capitalize text-slate-700">
                            {student.gender}
                          </td>
                        )}

                        {/* Category */}
                        {columns.category && (
                          <td className="py-3.5 px-4 uppercase text-slate-700">
                            {student.category || "—"}
                          </td>
                        )}

                        {/* Transport */}
                        {columns.transport && (
                          <td className="py-3.5 px-4">
                            {route ? (
                              <div className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-md">
                                <Bus className="w-3 h-3 shrink-0 text-cyan-600" />
                                <span className="truncate max-w-[120px]">{route}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        )}

                        {/* Fee Status */}
                        {columns.fee_status && (
                          <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/fees/collect?student=${student.id}`)}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                              title="Click to collect fee"
                            >
                              Paid up
                            </button>
                          </td>
                        )}

                        {/* Documents */}
                        {columns.documents && (
                          <td className="py-3.5 px-4">
                            {(student.documents_pending_count || 0) > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                {student.documents_pending_count} Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                                Verified
                              </span>
                            )}
                          </td>
                        )}

                        {/* Optional Columns */}
                        {columns.dob && <td className="py-3.5 px-4 text-slate-700">{student.dob}</td>}
                        {columns.admission_date && (
                          <td className="py-3.5 px-4 text-slate-700">—</td>
                        )}
                        {columns.sr_no && <td className="py-3.5 px-4 text-slate-700 font-mono">—</td>}

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
                          <div className="flex items-center justify-end gap-1">
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
                              onEdit={(s) => navigate(`/admin/students/${s.id}?edit=true`)}
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

          {/* Mobile Card List (< 768px) */}
          <div className="md:hidden space-y-3">
            {students.map((student) => {
              const isSelected = selectedStudentIds.has(student.id);
              const route = student.transport_route || transportMap[student.id];

              return (
                <div
                  key={student.id}
                  onClick={() => setQuickViewStudent(student)}
                  className={`bg-white border rounded-2xl p-4 space-y-3 shadow-2xs cursor-pointer active:scale-[0.99] transition-all ${
                    isSelected ? "border-[#2158E0] ring-1 ring-[#2158E0] bg-blue-50/20" : "border-[#E6EAF3]"
                  }`}
                >
                  {/* Top Line: Avatar + Student info + Action Menu */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        onClick={(e) => toggleSelectRow(student.id, e)}
                        className="p-1 -ml-1 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-slate-300 text-[#2158E0] focus:ring-[#2158E0]"
                        />
                      </div>
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-[#2158E0] flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                        {student.photo_path ? (
                          <img
                            src={student.photo_path}
                            alt={student.first_name}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          `${student.first_name[0] || ""}${student.last_name[0] || ""}`.toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">
                          {student.first_name} {student.last_name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {student.admission_no}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {student.class_name || "Grade"}
                        {student.section_name ? ` - ${student.section_name}` : ""}
                      </span>
                      <StudentRowActions
                        student={student}
                        onView={(s) => navigate(`/admin/students/${s.id}`)}
                        onEdit={(s) => navigate(`/admin/students/${s.id}?edit=true`)}
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

                  {/* Parent Line */}
                  <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <span className="truncate max-w-[180px]">
                      Parent: <span className="font-medium text-slate-800">{student.primary_parent_name || "Guardian"}</span>
                    </span>
                    {student.primary_parent_phone && (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <a
                          href={`https://wa.me/91${student.primary_parent_phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"
                          title="WhatsApp parent"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`tel:${student.primary_parent_phone}`}
                          className="w-7 h-7 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center font-mono text-[11px] font-semibold"
                          title="Call parent"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Badges line: Fee, Route, Status */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                        student.status === "enrolled"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {student.status}
                    </span>

                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Paid up
                    </span>

                    {route && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-200">
                        <Bus className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[120px]">{route}</span>
                      </span>
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

          {/* Unified Pagination & Count Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 text-xs text-slate-500 border-t border-slate-200/80">
            <div className="flex items-center gap-3">
              <div>
                Showing <span className="font-semibold text-slate-700">{students.length}</span> of{" "}
                <span className="font-semibold text-slate-700">{totalCount}</span> students
              </div>
              <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
                <span className="text-slate-500">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newLimit = Number(e.target.value);
                    setPageSize(newLimit);
                  }}
                  className="px-2 py-1 bg-white border border-[#E6EAF3] rounded-md font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#2158E0] cursor-pointer"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={500}>All (500)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {nextCursor ? (
                <button
                  type="button"
                  onClick={() => fetchStudents(nextCursor)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E6EAF3] bg-white hover:bg-slate-50 font-semibold text-slate-700 hover:text-slate-900 shadow-2xs cursor-pointer transition-colors"
                >
                  <span>Load more ({Math.max(0, totalCount - students.length)} remaining)</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : students.length > 0 && totalCount > students.length ? (
                <span className="text-slate-400 italic">
                  All {students.length} matching students loaded
                </span>
              ) : null}
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
          alert(`Assign transport route for ${selectedStudentIds.size} students`);
        }}
        onChangeStatus={() => {
          alert(`Change status for ${selectedStudentIds.size} students`);
        }}
        onSendWhatsApp={(templateKey) => {
          alert(`Sending WhatsApp (${templateKey}) to ${selectedStudentIds.size} students`);
        }}
        onDeleteSelected={() => setIsBulkDeleteModalOpen(true)}
      />

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
          }}
        />
      )}
    </div>
  );
}
