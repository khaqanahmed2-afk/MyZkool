import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  History,
  Filter,
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarOff,
  Edit2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { AttendanceNavHeader } from "../../../components/admin/attendance/AttendanceNavHeader";
import {
  getAttendanceHistory,
  updateStudentAttendanceRecord,
  getAttendanceCorrectionsLog,
  getTodayDateString,
} from "../../../services/attendanceService";
import { getClassesWithSections } from "../../../services/classSectionService";
import { getAcademicYearsForSchool } from "../../../services/academicService";
import type {
  StudentAttendanceRecord,
  AttendanceStatus,
  AttendanceCorrectionLog,
} from "../../../types/attendance";
import type { AcademicYear } from "../../../types/academic";

export function AttendanceHistory() {
  const { school, currentAcademicYear, user } = useAuth();

  // Filters State
  const [startDate, setStartDate] = useState<string>(getTodayDateString());
  const [endDate, setEndDate] = useState<string>(getTodayDateString());
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>(
    currentAcademicYear?.id || ""
  );
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Metadata
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<
    Array<{ id: string; name: string; sections: Array<{ id: string; name: string }> }>
  >([]);

  // Records & Pagination
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<StudentAttendanceRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Edit Correction Modal State
  const [editingRecord, setEditingRecord] = useState<StudentAttendanceRecord | null>(null);
  const [editNewStatus, setEditNewStatus] = useState<AttendanceStatus>("present");
  const [editReason, setEditReason] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Audit Logs Slide-over State
  const [viewingAuditRecord, setViewingAuditRecord] = useState<StudentAttendanceRecord | null>(null);
  const [auditLogs, setAuditLogs] = useState<AttendanceCorrectionLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Load Metadata
  useEffect(() => {
    if (!school?.id) return;
    const loadMeta = async () => {
      try {
        const [years, clss] = await Promise.all([
          getAcademicYearsForSchool(school.id),
          getClassesWithSections(school.id, selectedAcademicYearId || currentAcademicYear?.id),
        ]);
        setAcademicYears(years);
        setClasses(clss);
      } catch (err) {
        console.error("Failed to load metadata for history:", err);
      }
    };
    loadMeta();
  }, [school?.id, selectedAcademicYearId, currentAcademicYear?.id]);

  const activeClass = classes.find((c) => c.id === selectedClassId);
  const availableSections = activeClass?.sections || [];

  // Fetch History Records
  const loadRecords = useCallback(async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const res = await getAttendanceHistory({
        schoolId: school.id,
        filters: {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          academicYearId: selectedAcademicYearId || undefined,
          classId: selectedClassId || undefined,
          sectionId: selectedSectionId || undefined,
          status: selectedStatus,
          search: searchQuery || undefined,
        },
        page: currentPage,
        pageSize,
      });

      setRecords(res.records);
      setTotalCount(res.totalCount);
    } catch (err) {
      console.error("Failed to load attendance history records:", err);
    } finally {
      setLoading(false);
    }
  }, [
    school?.id,
    startDate,
    endDate,
    selectedAcademicYearId,
    selectedClassId,
    selectedSectionId,
    selectedStatus,
    searchQuery,
    currentPage,
  ]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Open Edit Modal
  const handleOpenEdit = (record: StudentAttendanceRecord) => {
    setEditingRecord(record);
    setEditNewStatus(record.status);
    setEditReason("");
    setEditError(null);
  };

  // Submit Edit Correction
  const handleSaveCorrection = async () => {
    if (!school?.id || !editingRecord) return;
    if (!editReason.trim()) {
      setEditError("Please enter a mandatory reason for this correction.");
      return;
    }

    setEditSaving(true);
    setEditError(null);
    try {
      const res = await updateStudentAttendanceRecord({
        schoolId: school.id,
        recordId: editingRecord.id,
        newStatus: editNewStatus,
        reason: editReason.trim(),
        changedBy: user?.id,
      });

      if (res.success) {
        setEditingRecord(null);
        loadRecords();
      } else {
        setEditError(res.message);
      }
    } catch (err: any) {
      setEditError(err?.message || "Failed to save correction.");
    } finally {
      setEditSaving(false);
    }
  };

  // View Audit Logs
  const handleViewAudit = async (record: StudentAttendanceRecord) => {
    if (!school?.id) return;
    setViewingAuditRecord(record);
    setAuditLoading(true);
    try {
      const logs = await getAttendanceCorrectionsLog({
        schoolId: school.id,
        recordId: record.id,
      });
      setAuditLogs(logs);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setAuditLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Filtered by client search query if needed
  const filteredRecords = records.filter(
    (r) =>
      r.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.admission_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.roll_no && r.roll_no.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <AttendanceNavHeader
        title="Attendance History & Audit"
        subtitle="Search, review, filter, and audit past attendance records"
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/admin/attendance"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E6EAF3] bg-white text-xs sm:text-sm font-semibold text-[#5B6478] hover:text-[#141A2E] hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <button
              onClick={loadRecords}
              disabled={loading}
              title="Refresh records"
              className="p-2 border border-[#E6EAF3] rounded-lg bg-white text-[#5B6478] hover:text-[#141A2E] hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        }
      />

      {/* Comprehensive Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#E6EAF3] p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-semibold text-[#5B6478] uppercase mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E6EAF3] text-[#141A2E] bg-white focus:outline-none focus:border-[#2158E0]"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-semibold text-[#5B6478] uppercase mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E6EAF3] text-[#141A2E] bg-white focus:outline-none focus:border-[#2158E0]"
            />
          </div>

          {/* Academic Year */}
          <div>
            <label className="block text-[11px] font-semibold text-[#5B6478] uppercase mb-1">
              Academic Year
            </label>
            <select
              value={selectedAcademicYearId}
              onChange={(e) => {
                setSelectedAcademicYearId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E6EAF3] text-[#141A2E] bg-white focus:outline-none focus:border-[#2158E0]"
            >
              <option value="">All Years</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.label}
                </option>
              ))}
            </select>
          </div>

          {/* Class */}
          <div>
            <label className="block text-[11px] font-semibold text-[#5B6478] uppercase mb-1">
              Class
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedSectionId("");
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E6EAF3] text-[#141A2E] bg-white focus:outline-none focus:border-[#2158E0]"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="block text-[11px] font-semibold text-[#5B6478] uppercase mb-1">
              Section
            </label>
            <select
              value={selectedSectionId}
              onChange={(e) => {
                setSelectedSectionId(e.target.value);
                setCurrentPage(1);
              }}
              disabled={availableSections.length === 0}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E6EAF3] text-[#141A2E] bg-white focus:outline-none focus:border-[#2158E0] disabled:bg-slate-50 disabled:text-[#8C95A8]"
            >
              <option value="">All Sections</option>
              {availableSections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  Section {sec.name}
                </option>
              ))}
            </select>
          </div>

          {/* Attendance Status */}
          <div>
            <label className="block text-[11px] font-semibold text-[#5B6478] uppercase mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E6EAF3] text-[#141A2E] bg-white focus:outline-none focus:border-[#2158E0]"
            >
              <option value="all">All Statuses</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="leave">On Leave</option>
            </select>
          </div>
        </div>

        {/* Live Search & Summary */}
        <div className="pt-3 border-t border-[#E6EAF3] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6478]" />
            <input
              type="text"
              placeholder="Search student name or admission no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#E6EAF3] text-[#141A2E] placeholder-[#8C95A8] focus:outline-none focus:border-[#2158E0]"
            />
          </div>

          <div className="text-xs text-[#5B6478] flex items-center gap-3">
            <span>
              Showing <strong>{filteredRecords.length}</strong> of <strong>{totalCount}</strong> records
            </span>
          </div>
        </div>
      </div>

      {/* History Records Table */}
      <div className="bg-white rounded-2xl border border-[#E6EAF3] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-[#E6EAF3] text-[11px] font-semibold text-[#5B6478] uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Admission No</th>
                <th className="py-3 px-4">Class & Section</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Remarks</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6EAF3] text-xs">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="py-4 px-4">
                      <div className="h-5 bg-slate-100 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#5B6478]">
                    No attendance records match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const statusColors: Record<string, string> = {
                    present: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    absent: "bg-rose-50 text-rose-700 border-rose-200",
                    late: "bg-amber-50 text-amber-700 border-amber-200",
                    leave: "bg-purple-50 text-purple-700 border-purple-200",
                  };

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-[#141A2E] whitespace-nowrap">
                        {r.date}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#141A2E]">{r.student_name}</div>
                        {r.roll_no && (
                          <div className="text-[10px] text-[#5B6478]">Roll: {r.roll_no}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#5B6478]">
                        {r.admission_no}
                      </td>
                      <td className="py-3 px-4 text-[#141A2E]">
                        {r.class_name} {r.section_name ? `(${r.section_name})` : ""}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`capitalize px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            statusColors[r.status] || "bg-slate-100 text-[#5B6478]"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize text-[11px] text-[#5B6478] bg-slate-100 px-2 py-0.5 rounded-md">
                          {r.source.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-[#5B6478] max-w-xs truncate">
                        {r.remarks || "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(r)}
                            className="p-1.5 rounded-md hover:bg-blue-50 text-[#2158E0] transition-colors"
                            title="Edit attendance status"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleViewAudit(r)}
                            className="p-1.5 rounded-md hover:bg-slate-100 text-[#5B6478] transition-colors"
                            title="View correction audit history"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#E6EAF3] flex items-center justify-between text-xs text-[#5B6478]">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-[#E6EAF3] disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-[#E6EAF3] disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Attendance Modal with Mandatory Audit Trail Reason */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#E6EAF3] shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6EAF3]">
              <div>
                <h3 className="text-base font-bold text-[#141A2E] font-heading">
                  Correct Attendance Record
                </h3>
                <p className="text-xs text-[#5B6478]">
                  {editingRecord.student_name} • {editingRecord.date}
                </p>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-1 text-[#8C95A8] hover:text-[#141A2E]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center gap-2 border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#5B6478] mb-1.5">
                  Current Status
                </label>
                <span className="capitalize px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-[#141A2E]">
                  {editingRecord.status}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5B6478] mb-1.5">
                  New Status
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["present", "absent", "late", "leave"] as AttendanceStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEditNewStatus(st)}
                      className={`capitalize py-2 rounded-lg text-xs font-semibold border transition-all ${
                        editNewStatus === st
                          ? "bg-[#2158E0] text-white border-[#2158E0] shadow-xs"
                          : "bg-white text-[#5B6478] border-[#E6EAF3] hover:bg-slate-50"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5B6478] mb-1.5">
                  Correction Reason (Mandatory Audit Trail)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Student arrived late with parent note; medical leave approved."
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E6EAF3] text-[#141A2E] placeholder-[#8C95A8] focus:outline-none focus:border-[#2158E0]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#E6EAF3] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-3.5 py-2 rounded-lg border border-[#E6EAF3] text-xs font-semibold text-[#5B6478] hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCorrection}
                disabled={editSaving || !editReason.trim()}
                className="px-4 py-2 rounded-lg bg-[#2158E0] text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {editSaving ? "Saving..." : "Save Correction"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit History Slide-over / Modal */}
      {viewingAuditRecord && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#E6EAF3] shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6EAF3]">
              <div>
                <h3 className="text-base font-bold text-[#141A2E] font-heading flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#2158E0]" />
                  Correction Audit Trail
                </h3>
                <p className="text-xs text-[#5B6478]">
                  {viewingAuditRecord.student_name} • Date: {viewingAuditRecord.date}
                </p>
              </div>
              <button
                onClick={() => setViewingAuditRecord(null)}
                className="p-1 text-[#8C95A8] hover:text-[#141A2E]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-3 text-xs">
              {auditLoading ? (
                <div className="py-8 text-center text-[#5B6478]">Loading audit trail...</div>
              ) : auditLogs.length === 0 ? (
                <div className="py-8 text-center text-[#5B6478]">
                  No administrative corrections recorded for this entry.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl border border-[#E6EAF3] bg-slate-50/50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="capitalize font-bold text-rose-700">
                          {log.previous_status}
                        </span>
                        <span className="text-[#8C95A8]">→</span>
                        <span className="capitalize font-bold text-emerald-700">
                          {log.new_status}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#8C95A8]">
                        {new Date(log.created_at).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <p className="text-[#141A2E] font-medium bg-white p-2 rounded border border-[#E6EAF3]">
                      Reason: &ldquo;{log.reason}&rdquo;
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-[#E6EAF3] text-right">
              <button
                onClick={() => setViewingAuditRecord(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold text-[#141A2E] hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttendanceHistory;
