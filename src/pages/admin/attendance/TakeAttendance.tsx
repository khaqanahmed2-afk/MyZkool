import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarOff,
  Save,
  Search,
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  Sparkles,
  Info,
  Check,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { AttendanceNavHeader } from "../../../components/admin/attendance/AttendanceNavHeader";
import {
  getTodayDateString,
  getEnrolledStudentsForAttendance,
  saveClassAttendance,
} from "../../../services/attendanceService";
import { getClassesWithSections } from "../../../services/classSectionService";
import { getAcademicYearsForSchool } from "../../../services/academicService";
import type { AttendanceStudentItem, AttendanceStatus, AttendanceSession } from "../../../types/attendance";
import type { AcademicYear } from "../../../types/academic";

export function TakeAttendance() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { school, currentAcademicYear } = useAuth();

  // URL / Filter State
  const initialDate = searchParams.get("date") || getTodayDateString();
  const initialClassId = searchParams.get("classId") || "";
  const initialSectionId = searchParams.get("sectionId") || "";

  const [date, setDate] = useState<string>(initialDate);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>(
    currentAcademicYear?.id || ""
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [selectedSectionId, setSelectedSectionId] = useState<string>(initialSectionId);

  // Metadata State
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string; sections: Array<{ id: string; name: string }> }>>([]);

  // Attendance Students State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<AttendanceStudentItem[]>([]);
  const [existingSession, setExistingSession] = useState<AttendanceSession | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Load Academic Years & Classes
  useEffect(() => {
    if (!school?.id) return;
    const fetchMetadata = async () => {
      try {
        const [yearsRes, classesRes] = await Promise.all([
          getAcademicYearsForSchool(school.id),
          getClassesWithSections(school.id, selectedAcademicYearId || currentAcademicYear?.id),
        ]);
        setAcademicYears(yearsRes);
        setClasses(classesRes);

        // Auto-select first class if none selected
        if (!selectedClassId && classesRes.length > 0) {
          setSelectedClassId(classesRes[0].id);
          if (classesRes[0].sections.length > 0) {
            setSelectedSectionId(classesRes[0].sections[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load metadata for attendance:", err);
      }
    };
    fetchMetadata();
  }, [school?.id, selectedAcademicYearId, currentAcademicYear?.id]);

  // Update sections when class changes
  const activeClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId);
  }, [classes, selectedClassId]);

  const availableSections = activeClass?.sections || [];

  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    const cls = classes.find((c) => c.id === newClassId);
    if (cls && cls.sections.length > 0) {
      setSelectedSectionId(cls.sections[0].id);
    } else {
      setSelectedSectionId("");
    }
  };

  // Load Students for Selected Class & Date
  const loadStudents = useCallback(async () => {
    if (!school?.id || !selectedClassId || !date) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await getEnrolledStudentsForAttendance({
        schoolId: school.id,
        academicYearId: selectedAcademicYearId || currentAcademicYear?.id || "",
        classId: selectedClassId,
        sectionId: selectedSectionId || null,
        date,
      });

      setStudents(res.students);
      setExistingSession(res.session);
      setNotes(res.session?.notes || "");

      if (res.session) {
        setStatusMessage({
          type: "info",
          text: `Attendance for this class was previously recorded on ${date}. You can review or edit it below.`,
        });
      }
    } catch (err: any) {
      console.error("Failed to load students:", err);
      setStatusMessage({
        type: "error",
        text: err?.message || "Failed to load students for this class.",
      });
    } finally {
      setLoading(false);
    }
  }, [school?.id, selectedAcademicYearId, currentAcademicYear?.id, selectedClassId, selectedSectionId, date]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Bulk actions
  const handleMarkAll = (newStatus: AttendanceStatus) => {
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        status: newStatus,
      }))
    );
  };

  // Single student toggle
  const handleStatusChange = (studentId: string, newStatus: AttendanceStatus) => {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, status: newStatus } : s))
    );
  };

  // Single student remarks
  const handleRemarksChange = (studentId: string, remarks: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, remarks } : s))
    );
  };

  // Derived counts
  const counts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let leave = 0;

    students.forEach((s) => {
      if (s.status === "present") present++;
      else if (s.status === "absent") absent++;
      else if (s.status === "late") late++;
      else if (s.status === "leave") leave++;
    });

    const total = students.length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 0;

    return { present, absent, late, leave, total, rate };
  }, [students]);

  // Save attendance
  const handleSave = async () => {
    if (!school?.id || !selectedClassId || !date) return;
    if (students.length === 0) {
      setStatusMessage({ type: "error", text: "No students to save attendance for." });
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      const recordsPayload = students.map((s) => ({
        student_id: s.student_id,
        enrollment_id: s.enrollment_id,
        status: s.status,
        remarks: s.remarks,
      }));

      const res = await saveClassAttendance({
        schoolId: school.id,
        academicYearId: selectedAcademicYearId || currentAcademicYear?.id || "",
        classId: selectedClassId,
        sectionId: selectedSectionId || null,
        date,
        records: recordsPayload,
        notes,
      });

      if (res.success) {
        setStatusMessage({
          type: "success",
          text: res.message || "Attendance saved successfully!",
        });
        // Reload session state
        loadStudents();
      } else {
        setStatusMessage({
          type: "error",
          text: res.message || "Failed to save attendance.",
        });
      }
    } catch (err: any) {
      console.error("Save error:", err);
      setStatusMessage({
        type: "error",
        text: err?.message || "An unexpected error occurred while saving.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Filtered student list for search
  const filteredStudents = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admission_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.roll_no && s.roll_no.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <AttendanceNavHeader
        title="Take Attendance"
        subtitle="Mark, verify, and submit student attendance class-wise"
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
              onClick={handleSave}
              disabled={saving || loading || students.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2158E0] text-white text-xs sm:text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : existingSession ? "Update Attendance" : "Save Attendance"}
            </button>
          </div>
        }
      />

      {/* Step 1: Select Attendance Details Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#E6EAF3] p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Academic Year */}
          <div>
            <label className="block text-xs font-semibold text-[#5B6478] mb-1.5">
              Academic Year
            </label>
            <select
              value={selectedAcademicYearId}
              onChange={(e) => setSelectedAcademicYearId(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#E6EAF3] text-[#141A2E] bg-white focus:outline-none focus:border-[#2158E0]"
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.label} {ay.is_current ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Attendance Date */}
          <div>
            <label className="block text-xs font-semibold text-[#5B6478] mb-1.5">
              Attendance Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#E6EAF3] text-[#141A2E] bg-white focus:outline-none focus:border-[#2158E0]"
              />
            </div>
          </div>

          {/* Class */}
          <div>
            <label className="block text-xs font-semibold text-[#5B6478] mb-1.5">
              Class
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#E6EAF3] text-[#141A2E] bg-white focus:outline-none focus:border-[#2158E0]"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="block text-xs font-semibold text-[#5B6478] mb-1.5">
              Section
            </label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              disabled={availableSections.length === 0}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#E6EAF3] text-[#141A2E] bg-white focus:outline-none focus:border-[#2158E0] disabled:bg-slate-50 disabled:text-[#8C95A8]"
            >
              {availableSections.length === 0 ? (
                <option value="">No Sections</option>
              ) : (
                availableSections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    Section {sec.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Status Notification Banner */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : statusMessage.type === "info"
                ? "bg-blue-50 text-blue-800 border-blue-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            {statusMessage.type === "success" && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />}
            {statusMessage.type === "info" && <Info className="w-4 h-4 shrink-0 text-blue-600" />}
            {statusMessage.type === "error" && <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* Summary Counters & Quick Action Controls */}
      <div className="bg-white rounded-2xl border border-[#E6EAF3] p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Live Counters */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-5 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#5B6478]">Total:</span>
            <span className="font-bold text-sm text-[#141A2E]">{counts.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-emerald-700">Present:</span>
            <span className="font-bold text-sm text-emerald-700">{counts.present}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-xs font-semibold text-rose-700">Absent:</span>
            <span className="font-bold text-sm text-rose-700">{counts.absent}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-xs font-semibold text-amber-700">Late:</span>
            <span className="font-bold text-sm text-amber-700">{counts.late}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="text-xs font-semibold text-purple-700">Leave:</span>
            <span className="font-bold text-sm text-purple-700">{counts.leave}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#2158E0]">Rate:</span>
            <span className="font-bold text-sm text-[#2158E0]">{counts.rate}%</span>
          </div>
        </div>

        {/* Quick Bulk Marking Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <span className="text-xs font-medium text-[#5B6478] hidden lg:inline">Mark All:</span>
          <button
            onClick={() => handleMarkAll("present")}
            disabled={students.length === 0}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
          >
            All Present
          </button>
          <button
            onClick={() => handleMarkAll("absent")}
            disabled={students.length === 0}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
          >
            All Absent
          </button>
          <button
            onClick={() => handleMarkAll("late")}
            disabled={students.length === 0}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
          >
            All Late
          </button>
        </div>
      </div>

      {/* Student List Table */}
      <div className="bg-white rounded-2xl border border-[#E6EAF3] shadow-2xs overflow-hidden">
        {/* Search & Class Header */}
        <div className="p-4 sm:p-5 border-b border-[#E6EAF3] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#141A2E] font-heading">
              {activeClass?.name} {availableSections.find((s) => s.id === selectedSectionId)?.name ? `• Section ${availableSections.find((s) => s.id === selectedSectionId)?.name}` : ""}
            </h2>
            <p className="text-xs text-[#5B6478]">
              {students.length} students enrolled • Click a status to toggle attendance
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6478]" />
            <input
              type="text"
              placeholder="Search by name, roll, admission..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#E6EAF3] text-[#141A2E] placeholder-[#8C95A8] focus:outline-none focus:border-[#2158E0]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-[#E6EAF3] text-[11px] font-semibold text-[#5B6478] uppercase tracking-wider">
                <th className="py-3 px-4 w-16 text-center">Roll</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Admission No</th>
                <th className="py-3 px-4 text-center">Attendance Status</th>
                <th className="py-3 px-4">Remarks (Optional)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6EAF3] text-xs">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="py-4 px-4">
                      <div className="h-5 bg-slate-100 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#5B6478]">
                    No enrolled students found for the selected class and section.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const isPresent = s.status === "present";
                  const isAbsent = s.status === "absent";
                  const isLate = s.status === "late";
                  const isLeave = s.status === "leave";

                  return (
                    <tr
                      key={s.student_id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      {/* Roll Number */}
                      <td className="py-3 px-4 text-center font-bold text-[#141A2E]">
                        {s.roll_no || "—"}
                      </td>

                      {/* Student Details (Photo + Name) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-[#2158E0] font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                            {s.photo_path ? (
                              <img
                                src={s.photo_path}
                                alt={s.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              s.first_name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-[#141A2E]">{s.full_name}</div>
                          </div>
                        </div>
                      </td>

                      {/* Admission Number */}
                      <td className="py-3 px-4 font-mono text-[11px] text-[#5B6478]">
                        {s.admission_no}
                      </td>

                      {/* Attendance Status Buttons */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Present */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.student_id, "present")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                              isPresent
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-slate-100 text-[#5B6478] hover:bg-emerald-50 hover:text-emerald-700"
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Present
                          </button>

                          {/* Absent */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.student_id, "absent")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                              isAbsent
                                ? "bg-rose-600 text-white shadow-xs"
                                : "bg-slate-100 text-[#5B6478] hover:bg-rose-50 hover:text-rose-700"
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Absent
                          </button>

                          {/* Late */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.student_id, "late")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                              isLate
                                ? "bg-amber-600 text-white shadow-xs"
                                : "bg-slate-100 text-[#5B6478] hover:bg-amber-50 hover:text-amber-700"
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            Late
                          </button>

                          {/* Leave */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.student_id, "leave")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                              isLeave
                                ? "bg-purple-600 text-white shadow-xs"
                                : "bg-slate-100 text-[#5B6478] hover:bg-purple-50 hover:text-purple-700"
                            }`}
                          >
                            <CalendarOff className="w-3.5 h-3.5" />
                            Leave
                          </button>
                        </div>
                      </td>

                      {/* Remarks */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="e.g. Doctor appointment, arrived 9:15"
                          value={s.remarks || ""}
                          onChange={(e) => handleRemarksChange(s.student_id, e.target.value)}
                          className="w-full px-2.5 py-1 text-xs rounded border border-[#E6EAF3] text-[#141A2E] placeholder-[#8C95A8] focus:outline-none focus:border-[#2158E0]"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Session Notes & Save Action Bar */}
        <div className="p-4 sm:p-5 border-t border-[#E6EAF3] bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-1/2">
            <label className="block text-xs font-semibold text-[#5B6478] mb-1">
              Session Notes / Teacher Remarks (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Conducted by Principal substitute, rainy day low attendance"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E6EAF3] bg-white text-[#141A2E] focus:outline-none focus:border-[#2158E0]"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={handleSave}
              disabled={saving || loading || students.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2158E0] text-white text-xs sm:text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving Records..." : existingSession ? "Save Updates" : "Submit Attendance"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TakeAttendance;
