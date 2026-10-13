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
  AlertTriangle,
  Download,
  ChevronRight,
  X,
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

  // Essential Filters: Class, Section, Student Status
  const [filters, setFilters] = useState<StudentFilterState>({
    status: (searchParams.get("status") as StudentStatus) || "enrolled",
    class_id: searchParams.get("class_id") || undefined,
    section_id: searchParams.get("section_id") || undefined,
  });
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
        has_dues: filters.has_dues,
        cursor,
        limit: pageSize,
        userRole: profile?.role || "school_admin",
      });

      if (res.error) {
        setError(res.error);
      } else if (res.response) {
        setStudents((prev) => (cursor ? [...prev, ...res.response!.data] : res.response!.data));
        setNextCursor(res.response.next_cursor || null);
        setTotalCount(res.response.total_estimate || res.response.data.length);
      }
      setLoading(false);
    },
    [schoolId, debouncedSearch, filters, profile?.role, pageSize]
  );

  useEffect(() => {
    if (!schoolId) return;
    fetchStudents();
  }, [fetchStudents, schoolId]);

  // Summary strip filter click handler
  const handleSummaryFilter = (key: string) => {
    setActiveSummaryFilter(key);
    if (key === "all") {
      setFilters((prev) => ({ ...prev, status: undefined, has_dues: undefined }));
    } else if (key === "active") {
      setFilters((prev) => ({ ...prev, status: "enrolled", has_dues: undefined }));
    } else if (key === "new_admissions") {
      setFilters((prev) => ({ ...prev, status: "enrolled", has_dues: undefined }));
    } else if (key === "fee_pending") {
      setFilters((prev) => ({ ...prev, status: undefined, has_dues: true }));
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
    const enrolledCount = students.filter((s) => s.status === "enrolled").length;
    const feePendingCount = students.filter(
      (s) => s.fee_status === "overdue" || s.fee_status === "pending"
    ).length;

    return {
      totalStudents: totalCount || students.length,
      enrolledCount: enrolledCount || totalCount,
      newAdmissionsCount: totalCount || students.length,
      feePendingCount,
    };
  }, [students, totalCount]);

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
    setActiveSummaryFilter("all");
    setFilters({});
  };

  const hasActiveFiltersOrSearch = Boolean(
    searchQuery ||
    filters.class_id ||
    filters.section_id ||
    (filters.status && filters.status !== "enrolled") ||
    filters.has_dues
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4">
      {/* 1. Compact Header */}
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
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{isExporting ? "Exporting..." : "Export"}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/students/import")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer shadow-2xs"
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

      {/* 2. Essential Student Statistics (Total Students, Active Students, New Admissions, Pending Fees) */}
      <StudentSummaryStrip
        data={summaryData}
        activeFilter={activeSummaryFilter}
        onFilterClick={handleSummaryFilter}
      />

      {/* 3. Search Bar and Compact Filter Row */}
      <div className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Simple Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, admission no, parent name, or phone..."
              className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 border border-[#E6EAF3] rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2158E0] focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Compact Essential Filters: Class, Section, Student Status */}
        <StudentFilterChips
          filters={filters}
          classes={classes}
          sections={sections}
          onFilterChange={(newFilters) => {
            setFilters(newFilters);
            setActiveSummaryFilter("");
          }}
          onClearFilters={handleClearAllFilters}
        />
      </div>

      {/* 4. Student Directory Content States */}
      {loading ? (
        // Loading State: Clean Skeleton Table
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
        // Error State with Functional Retry Button
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-rose-900 font-display">
              Unable to load student directory
            </h3>
            <p className="text-xs text-rose-600 max-w-md mx-auto mt-1">
              {error}
            </p>
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
          {/* Desktop & Tablet Data Table (Hidden on Small Mobile) */}
          <div className="hidden sm:block bg-white border border-[#E6EAF3] rounded-2xl overflow-hidden shadow-2xs">
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
                    <th className="py-3.5 px-4">Primary Parent</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EAF3] text-xs">
                  {students.map((student) => {
                    const isSelected = selectedStudentIds.has(student.id);

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

          {/* Mobile Card List (< 640px) */}
          <div className="sm:hidden space-y-3">
            {students.map((student) => {
              const isSelected = selectedStudentIds.has(student.id);

              return (
                <div
                  key={student.id}
                  onClick={() => setQuickViewStudent(student)}
                  className={`bg-white border rounded-2xl p-4 space-y-3 shadow-2xs cursor-pointer active:scale-[0.99] transition-all ${
                    isSelected ? "border-[#2158E0] ring-1 ring-[#2158E0] bg-blue-50/20" : "border-[#E6EAF3]"
                  }`}
                >
                  {/* Top Line: Avatar + Student info + Actions */}
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
                          className="rounded border-slate-300 text-[#2158E0] focus:ring-[#2158E0] cursor-pointer"
                          aria-label={`Select ${student.first_name}`}
                        />
                      </div>
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
                        <div className="font-semibold text-slate-900 text-sm">
                          {student.first_name} {student.last_name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {student.admission_no}
                        </div>
                      </div>
                    </div>

                    <div onClick={(e) => e.stopPropagation()}>
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

                  {/* Class and Status Badges */}
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

                  {/* Parent Line */}
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
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`tel:${student.primary_parent_phone}`}
                          className="w-7 h-7 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center hover:bg-blue-100 transition-colors"
                          title="Call parent"
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

          {/* Pagination & Count Bar */}
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
