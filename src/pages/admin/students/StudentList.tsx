import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Plus,
  Upload,
  MoreVertical,
  Phone,
  MessageSquare,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import type { StudentListItem, StudentStatus, PlanLimitsStatus } from "../../../types/students";
import type { SchoolClass, SchoolSection } from "../../../types/curriculum";
import { listStudents, getStudentDraft } from "../../../services/studentService";
import { checkSchoolStudentLimit } from "../../../services/studentOperationsService";
import { getClassesWithSections } from "../../../services/classSectionService";
import { getCurrentAcademicYear } from "../../../services/academicService";
import { StudentSummaryStrip } from "./StudentSummaryStrip";
import { StudentFilterChips, type StudentFilterState } from "./StudentFilterChips";
import { StudentColumnChooser, type ColumnVisibility } from "./StudentColumnChooser";
import { StudentBulkActions } from "./StudentBulkActions";
import { StudentQuickViewDrawer } from "./StudentQuickViewDrawer";

export default function StudentList() {
  const navigate = useNavigate();
  const { schoolId: authSchoolId, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [filters, setFilters] = useState<StudentFilterState>({
    status: (searchParams.get("status") as StudentStatus) || "enrolled",
    class_id: searchParams.get("class_id") || undefined,
    section_id: searchParams.get("section_id") || undefined,
  });
  const [savedView, setSavedView] = useState("all_active");

  // Selection & Drawer
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [quickViewStudent, setQuickViewStudent] = useState<StudentListItem | null>(null);

  // Metadata
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<SchoolSection[]>([]);
  const [academicYearLabel, setAcademicYearLabel] = useState("2026–27");
  const [draftCount, setDraftCount] = useState(0);
  const [planLimits, setPlanLimits] = useState<PlanLimitsStatus | null>(null);

  // Column visibility
  const [columns, setColumns] = useState<ColumnVisibility>({
    gender: false,
    dob: false,
    category: false,
    admission_date: false,
    house: false,
    sr_no: false,
  });

  const schoolId = authSchoolId || "default-school";

  // Load classes, sections, academic year, and drafts
  useEffect(() => {
    if (!schoolId) return;

    getCurrentAcademicYear(schoolId).then(res => {
      if (res.academicYear) {
        setAcademicYearLabel(res.academicYear.label);
        getClassesWithSections(schoolId, res.academicYear.id).then(clsRes => {
          if (clsRes.classes) {
            setClasses(clsRes.classes);
            const allSections = clsRes.classes.flatMap(c => c.sections || []);
            setSections(allSections);
          }
        });
      }
    });

    getStudentDraft(schoolId, profile?.id || "user-draft").then(draftRes => {
      if (draftRes.draft) setDraftCount(1);
    });

    checkSchoolStudentLimit(schoolId).then(setPlanLimits).catch(() => {});
  }, [schoolId, profile?.id]);

  // Fetch students
  const fetchStudents = useCallback(async (cursor?: string) => {
    setLoading(true);
    setError(null);

    const res = await listStudents(schoolId, {
      search: searchQuery || undefined,
      class_id: filters.class_id,
      section_id: filters.section_id,
      status: filters.status,
      gender: filters.gender,
      category: filters.category,
      is_rte: filters.is_rte,
      documents_pending: filters.documents_pending,
      cursor,
      limit: 50,
      userRole: profile?.role,
    });

    if (res.error) {
      setError(res.error);
    } else if (res.response) {
      setStudents(res.response.data);
      setNextCursor(res.response.next_cursor || null);
      setTotalCount(res.response.total_estimate || res.response.data.length);
    }
    setLoading(false);
  }, [schoolId, searchQuery, filters, profile?.role]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Saved view selector
  const handleSelectSavedView = (viewKey: string) => {
    setSavedView(viewKey);
    if (viewKey === "all_active") {
      setFilters({ status: "enrolled" });
    } else if (viewKey === "docs_pending") {
      setFilters({ status: "enrolled", documents_pending: true });
    } else if (viewKey === "new_this_month") {
      setFilters({ status: "enrolled" });
    } else if (viewKey === "left_this_year") {
      setFilters({ status: "transferred" });
    }
  };

  // Summary strip filter shortcut click
  const handleSummaryFilter = (key: string) => {
    if (key === "all") {
      setFilters({ status: "enrolled" });
    } else if (key === "girls") {
      setFilters({ status: "enrolled", gender: "female" });
    } else if (key === "boys") {
      setFilters({ status: "enrolled", gender: "male" });
    } else if (key === "new_admissions") {
      setFilters({ status: "enrolled" });
    } else if (key === "docs_pending") {
      setFilters({ status: "enrolled", documents_pending: true });
    }
  };

  // Row selection helpers
  const toggleSelectAll = () => {
    if (selectedStudentIds.size === students.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(students.map(s => s.id)));
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

  // Calculate summary stats
  const girlsCount = students.filter(s => s.gender === "female").length;
  const boysCount = students.filter(s => s.gender === "male").length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4">
      {/* 1. Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 font-display">Students</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#2158E0] border border-blue-200">
              {academicYearLabel}
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

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => navigate("/admin/students/import")}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/students/promotion")}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Promotion</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/students/tc")}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E6EAF3] rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>TC Register</span>
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
            <span>{planLimits?.is_blocked ? "Limit reached" : "Add student"}</span>
          </button>
        </div>
      </div>

      {/* Plan Limits Warning / Block Banner (Spec 1.5, A10) */}
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
                  : "You are approaching your plan limit. Consider upgrading to the Pro plan for up to 1,800 active students."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/onboarding/subscription")}
            className="px-3 py-1.5 bg-white border border-current rounded-lg text-xs font-bold shadow-xs whitespace-nowrap"
          >
            Upgrade Subscription
          </button>
        </div>
      )}

      {/* 2. Summary Strip */}
      <StudentSummaryStrip
        data={{
          totalEnrolled: totalCount,
          girlsCount,
          boysCount,
          admittedThisYear: totalCount,
          documentsPending: 0,
        }}
        onFilterClick={handleSummaryFilter}
      />

      {/* 3. Search and Filters */}
      <div className="bg-white border border-[#E6EAF3] rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Trigram Search Box */}
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, admission no, parent phone, SR no..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-[#E6EAF3] rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2158E0] focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <StudentColumnChooser columns={columns} onChange={setColumns} />
          </div>
        </div>

        {/* Filter Chips */}
        <StudentFilterChips
          filters={filters}
          classes={classes}
          sections={sections}
          onFilterChange={setFilters}
          onClearFilters={() => {
            setSearchQuery("");
            setFilters({ status: "enrolled" });
          }}
          savedView={savedView}
          onSelectSavedView={handleSelectSavedView}
        />
      </div>

      {/* 4. Table & Mobile Card States */}
      {loading ? (
        // Skeleton State
        <div className="bg-white border border-[#E6EAF3] rounded-xl p-4 space-y-3 shadow-2xs">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="animate-pulse flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200" />
                <div className="space-y-1.5">
                  <div className="w-32 h-3.5 bg-slate-200 rounded-sm" />
                  <div className="w-20 h-2.5 bg-slate-100 rounded-sm" />
                </div>
              </div>
              <div className="w-24 h-4 bg-slate-200 rounded-sm" />
              <div className="w-28 h-4 bg-slate-200 rounded-sm" />
              <div className="w-16 h-5 bg-slate-200 rounded-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        // Error State
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="text-sm font-semibold text-rose-900">Failed to load student list</h3>
          <p className="text-xs text-rose-600 max-w-sm mx-auto">{error}</p>
          <button
            type="button"
            onClick={() => fetchStudents()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      ) : students.length === 0 ? (
        searchQuery || Object.keys(filters).length > 1 ? (
          // No results state
          <div className="bg-white border border-[#E6EAF3] rounded-xl p-12 text-center space-y-3 shadow-2xs">
            <Search className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-semibold text-slate-800 font-display">No students match your criteria</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search terms or clearing one or more active filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setFilters({ status: "enrolled" });
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : (
          // Brand New Empty State
          <div className="bg-white border border-[#E6EAF3] rounded-2xl p-12 text-center space-y-4 shadow-2xs">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-[#2158E0] flex items-center justify-center mx-auto">
              <Plus className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-display">Add your first student</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Admit students one by one using the comprehensive 8-step wizard, or import entire class rosters at once via Excel.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate("/admin/students/new")}
                className="px-4 py-2 bg-[#2158E0] text-white rounded-xl text-xs font-semibold hover:bg-[#1A46B8] cursor-pointer"
              >
                Add student
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin/students/import")}
                className="px-4 py-2 bg-white border border-[#E6EAF3] text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Import class list
              </button>
            </div>
          </div>
        )
      ) : (
        <>
          {/* Desktop Data Table */}
          <div className="hidden md:block bg-white border border-[#E6EAF3] rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E6EAF3] bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.size === students.length && students.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded-sm border-slate-300 text-[#2158E0] focus:ring-[#2158E0] cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Class & Section</th>
                  <th className="py-3 px-4">Primary parent</th>
                  <th className="py-3 px-4">Fee status</th>
                  <th className="py-3 px-4">Documents</th>
                  <th className="py-3 px-4">Status</th>
                  {columns.gender && <th className="py-3 px-4">Gender</th>}
                  {columns.dob && <th className="py-3 px-4">DOB</th>}
                  {columns.category && <th className="py-3 px-4">Category</th>}
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EAF3] text-xs">
                {students.map(student => {
                  const isSelected = selectedStudentIds.has(student.id);
                  return (
                    <tr
                      key={student.id}
                      onClick={() => setQuickViewStudent(student)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        isSelected ? "bg-blue-50/40" : ""
                      }`}
                    >
                      <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={e => toggleSelectRow(student.id, e as unknown as React.MouseEvent)}
                          className="rounded-sm border-slate-300 text-[#2158E0] focus:ring-[#2158E0] cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-50 text-[#2158E0] flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-slate-200">
                            {student.photo_path ? (
                              <img src={student.photo_path} alt={student.first_name} className="w-full h-full object-cover" />
                            ) : (
                              `${student.first_name[0] || ""}${student.last_name[0] || ""}`.toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {student.first_name} {student.last_name}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {student.admission_no}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {student.class_name || "Grade"} {student.section_name ? `- ${student.section_name}` : ""}
                      </td>
                      <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                        {student.primary_parent_phone ? (
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-medium text-slate-800">{student.primary_parent_name || "Guardian"}</div>
                              <div className="text-[11px] text-slate-500">{student.primary_parent_phone}</div>
                            </div>
                            <a
                              href={`https://wa.me/91${student.primary_parent_phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors"
                              title="Message parent on WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Not set</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Paid up
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-600 text-xs">Verified</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-[#2158E0] border border-blue-200 capitalize">
                          {student.status.replace("_", " ")}
                        </span>
                      </td>
                      {columns.gender && <td className="py-3 px-4 capitalize text-slate-700">{student.gender}</td>}
                      {columns.dob && <td className="py-3 px-4 text-slate-700">{student.dob}</td>}
                      {columns.category && <td className="py-3 px-4 uppercase text-slate-700">{student.category || "—"}</td>}
                      <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/students/${student.id}`)}
                          className="text-xs font-semibold text-[#2158E0] hover:underline px-2 py-1"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List (<768px) */}
          <div className="md:hidden space-y-3">
            {students.map(student => (
              <div
                key={student.id}
                onClick={() => setQuickViewStudent(student)}
                className="bg-white border border-[#E6EAF3] rounded-xl p-4 space-y-2.5 shadow-2xs cursor-pointer active:scale-[0.99] transition-transform"
              >
                {/* Line 1: Name and class */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-[#2158E0] flex items-center justify-center font-bold text-xs shrink-0">
                      {student.first_name[0]}
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
                  <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                    {student.class_name || "Grade"}
                  </span>
                </div>

                {/* Line 2: Parent phone */}
                <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
                  <span>Parent: {student.primary_parent_name || "Guardian"}</span>
                  {student.primary_parent_phone && (
                    <a
                      href={`tel:${student.primary_parent_phone}`}
                      onClick={e => e.stopPropagation()}
                      className="text-blue-600 font-mono font-medium flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" /> {student.primary_parent_phone}
                    </a>
                  )}
                </div>

                {/* Chips below */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-blue-50 text-[#2158E0]">
                    {student.status}
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                    Paid up
                  </span>
                </div>
              </div>
            ))}

            {/* Mobile Floating Add Button */}
            <button
              type="button"
              onClick={() => navigate("/admin/students/new")}
              className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#2158E0] text-white shadow-xl flex items-center justify-center hover:bg-[#1A46B8] cursor-pointer"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {/* Cursor Pagination */}
          <div className="flex items-center justify-between pt-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-700">{students.length}</span> of ~{totalCount} students
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!nextCursor}
                onClick={() => fetchStudents(nextCursor || undefined)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E6EAF3] bg-white hover:bg-slate-50 font-medium text-slate-700 disabled:opacity-50 cursor-pointer"
              >
                <span>Next page</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Quick View Drawer */}
      <StudentQuickViewDrawer
        student={quickViewStudent}
        schoolId={schoolId}
        onClose={() => setQuickViewStudent(null)}
      />

      {/* Bulk Action Bar */}
      <StudentBulkActions
        selectedCount={selectedStudentIds.size}
        onClearSelection={() => setSelectedStudentIds(new Set())}
        onSendWhatsApp={templateKey => {
          alert(`Sending WhatsApp (${templateKey}) to ${selectedStudentIds.size} students`);
        }}
        onAssignSection={() => {
          alert("Assign section to selected students");
        }}
        onExportSelected={() => {
          alert(`Exporting ${selectedStudentIds.size} students`);
        }}
        onPrintIdCards={() => {
          alert(`Printing ID cards for ${selectedStudentIds.size} students`);
        }}
        onMarkDocumentsRequested={() => {
          alert(`Requested pending documents for ${selectedStudentIds.size} students`);
        }}
      />
    </div>
  );
}
