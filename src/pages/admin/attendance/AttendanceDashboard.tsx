import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarOff,
  Percent,
  Calendar,
  AlertCircle,
  ArrowRight,
  ClipboardCheck,
  QrCode,
  History,
  BarChart3,
  RefreshCw,
  Search,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { AttendanceNavHeader } from "../../../components/admin/attendance/AttendanceNavHeader";
import {
  getAttendanceDashboardSummary,
  getClassAttendanceOverview,
  getTodayDateString,
  getAttendanceHistory,
} from "../../../services/attendanceService";
import type {
  AttendanceDashboardSummary,
  ClassAttendanceOverview,
  StudentAttendanceRecord,
} from "../../../types/attendance";

export function AttendanceDashboard() {
  const navigate = useNavigate();
  const { school, currentAcademicYear } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AttendanceDashboardSummary | null>(null);
  const [classOverview, setClassOverview] = useState<ClassAttendanceOverview[]>([]);
  const [recentRecords, setRecentRecords] = useState<StudentAttendanceRecord[]>([]);
  const [filterClassQuery, setFilterClassQuery] = useState("");

  const loadDashboardData = useCallback(async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const [sum, classes, history] = await Promise.all([
        getAttendanceDashboardSummary({
          schoolId: school.id,
          date: selectedDate,
          academicYearId: currentAcademicYear?.id,
        }),
        getClassAttendanceOverview({
          schoolId: school.id,
          date: selectedDate,
          academicYearId: currentAcademicYear?.id,
        }),
        getAttendanceHistory({
          schoolId: school.id,
          filters: {
            startDate: selectedDate,
            endDate: selectedDate,
            academicYearId: currentAcademicYear?.id,
          },
          page: 1,
          pageSize: 10,
        }),
      ]);

      setSummary(sum);
      setClassOverview(classes);
      setRecentRecords(history.records);
    } catch (err) {
      console.error("Failed to load attendance dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, [school?.id, selectedDate, currentAcademicYear?.id]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Derived metrics
  const safeOverview = Array.isArray(classOverview) ? classOverview : [];
  const unrecordedClasses = safeOverview.filter((c) => !c.is_recorded && c.total_students > 0);
  const recordedClasses = safeOverview.filter((c) => c.is_recorded);

  const filteredOverview = safeOverview.filter(
    (c) =>
      (c.class_name || "").toLowerCase().includes((filterClassQuery || "").toLowerCase()) ||
      ((c.section_name || "").toLowerCase().includes((filterClassQuery || "").toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <AttendanceNavHeader
        title="Attendance Dashboard"
        subtitle={`Student attendance monitoring & daily overview • ${
          currentAcademicYear?.label || "Current Academic Year"
        }`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-white border border-[#E6EAF3] rounded-lg px-3 py-1.5 shadow-2xs">
              <Calendar className="w-4 h-4 text-[#5B6478]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs sm:text-sm font-medium text-[#141A2E] bg-transparent outline-none cursor-pointer"
              />
            </div>
            <button
              onClick={loadDashboardData}
              disabled={loading}
              title="Refresh attendance data"
              className="p-2 border border-[#E6EAF3] rounded-lg bg-white text-[#5B6478] hover:text-[#141A2E] hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              to={`/admin/attendance/take?date=${selectedDate}`}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2158E0] text-white text-xs sm:text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors"
            >
              <ClipboardCheck className="w-4 h-4" />
              Take Attendance
            </Link>
          </div>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Students */}
        <div className="bg-white rounded-2xl border border-[#E6EAF3] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#5B6478]">Total Students</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-[#141A2E] font-heading">
            {loading ? "..." : summary?.total_students ?? 0}
          </div>
          <p className="mt-1 text-[11px] text-[#5B6478]">Enrolled students</p>
        </div>

        {/* Present Students */}
        <div className="bg-white rounded-2xl border border-[#E6EAF3] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700">Present</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700 font-heading">
            {loading ? "..." : summary?.present_students ?? 0}
          </div>
          <p className="mt-1 text-[11px] text-[#5B6478]">Recorded present</p>
        </div>

        {/* Absent Students */}
        <div className="bg-white rounded-2xl border border-[#E6EAF3] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-700">Absent</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-700 font-heading">
            {loading ? "..." : summary?.absent_students ?? 0}
          </div>
          <p className="mt-1 text-[11px] text-[#5B6478]">Not in school</p>
        </div>

        {/* Late Students */}
        <div className="bg-white rounded-2xl border border-[#E6EAF3] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700">Late</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700 font-heading">
            {loading ? "..." : summary?.late_students ?? 0}
          </div>
          <p className="mt-1 text-[11px] text-[#5B6478]">Arrived late</p>
        </div>

        {/* On Leave */}
        <div className="bg-white rounded-2xl border border-[#E6EAF3] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-purple-700">On Leave</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <CalendarOff className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-700 font-heading">
            {loading ? "..." : summary?.leave_students ?? 0}
          </div>
          <p className="mt-1 text-[11px] text-[#5B6478]">Approved leaves</p>
        </div>

        {/* Attendance Percentage */}
        <div className="bg-white rounded-2xl border border-[#E6EAF3] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#2158E0]">Attendance Rate</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-[#2158E0] font-heading">
            {loading ? "..." : `${summary?.attendance_percentage ?? 0}%`}
          </div>
          <p className="mt-1 text-[11px] text-[#5B6478]">
            {summary?.sessions_recorded_today || 0} of {summary?.total_sections_count || 0} sessions
          </p>
        </div>
      </div>

      {/* Quick Action Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link
          to={`/admin/attendance/take?date=${selectedDate}`}
          className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-2xs hover:border-[#2158E0] transition-colors group flex items-start gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2158E0] flex items-center justify-center shrink-0 group-hover:bg-[#2158E0] group-hover:text-white transition-colors">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#141A2E] group-hover:text-[#2158E0] transition-colors">
              Take Attendance
            </h3>
            <p className="text-xs text-[#5B6478] mt-0.5">
              Mark student attendance class-wise for {selectedDate}
            </p>
          </div>
        </Link>

        <Link
          to={`/admin/attendance/qr?date=${selectedDate}`}
          className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-2xs hover:border-[#2158E0] transition-colors group flex items-start gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <QrCode className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#141A2E] group-hover:text-[#2158E0] transition-colors">
              QR Attendance
            </h3>
            <p className="text-xs text-[#5B6478] mt-0.5">
              Scan student ID card QR codes via camera
            </p>
          </div>
        </Link>

        <Link
          to="/admin/attendance/history"
          className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-2xs hover:border-[#2158E0] transition-colors group flex items-start gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <History className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#141A2E] group-hover:text-[#2158E0] transition-colors">
              Attendance History
            </h3>
            <p className="text-xs text-[#5B6478] mt-0.5">
              Review previously saved logs & make corrections
            </p>
          </div>
        </Link>

        <Link
          to="/admin/attendance/reports"
          className="bg-white border border-[#E6EAF3] rounded-2xl p-4 shadow-2xs hover:border-[#2158E0] transition-colors group flex items-start gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#141A2E] group-hover:text-[#2158E0] transition-colors">
              Attendance Reports
            </h3>
            <p className="text-xs text-[#5B6478] mt-0.5">
              Daily, monthly & student-wise register exports
            </p>
          </div>
        </Link>
      </div>

      {/* Classes Not Yet Recorded Alert (if any) */}
      {!loading && unrecordedClasses.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-amber-900 font-heading">
                    {unrecordedClasses.length} {unrecordedClasses.length === 1 ? "Class" : "Classes"} with Attendance Not Yet Recorded Today
                  </h3>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Attendance has not been submitted for these classes on {selectedDate}.
                  </p>
                </div>
                <Link
                  to={`/admin/attendance/take?date=${selectedDate}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 text-white text-xs font-medium hover:bg-amber-800 transition-colors w-fit"
                >
                  Mark Missing Classes
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {unrecordedClasses.slice(0, 10).map((c, idx) => (
                  <button
                    key={`${c.class_id}_${c.section_id || idx}`}
                    onClick={() =>
                      navigate(
                        `/admin/attendance/take?date=${selectedDate}&classId=${c.class_id}${
                          c.section_id ? `&sectionId=${c.section_id}` : ""
                        }`
                      )
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-amber-300 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                  >
                    <span>
                      {c.class_name} {c.section_name ? `(${c.section_name})` : ""}
                    </span>
                    <span className="text-[10px] text-amber-600 font-normal">
                      • {c.total_students} students
                    </span>
                  </button>
                ))}
                {unrecordedClasses.length > 10 && (
                  <span className="text-xs text-amber-700 self-center">
                    +{unrecordedClasses.length - 10} more
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Class Overview Table + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class-Wise Overview (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E6EAF3] shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#E6EAF3] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#141A2E] font-heading">
                Class-Wise Attendance Overview
              </h2>
              <p className="text-xs text-[#5B6478]">
                Real-time status across all classes for {selectedDate}
              </p>
            </div>
            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6478]" />
              <input
                type="text"
                placeholder="Filter class/section..."
                value={filterClassQuery}
                onChange={(e) => setFilterClassQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#E6EAF3] text-[#141A2E] placeholder-[#8C95A8] focus:outline-none focus:border-[#2158E0]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-[#E6EAF3] text-[11px] font-semibold text-[#5B6478] uppercase tracking-wider">
                  <th className="py-3 px-4">Class & Section</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Total</th>
                  <th className="py-3 px-4 text-center text-emerald-700">Present</th>
                  <th className="py-3 px-4 text-center text-rose-700">Absent</th>
                  <th className="py-3 px-4 text-center text-amber-700">Late</th>
                  <th className="py-3 px-4 text-center">Attendance %</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EAF3] text-xs">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={8} className="py-4 px-4">
                        <div className="h-4 bg-slate-100 rounded w-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredOverview.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#5B6478]">
                      No classes found.
                    </td>
                  </tr>
                ) : (
                  filteredOverview.map((row) => (
                    <tr key={`${row.class_id}_${row.section_id}`} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#141A2E]">
                        {row.class_name} {row.section_name ? `• Sec ${row.section_name}` : ""}
                      </td>
                      <td className="py-3 px-4">
                        {row.is_recorded ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Recorded
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-[#5B6478]">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Not Recorded
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-[#141A2E]">
                        {row.total_students}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-emerald-700">
                        {row.is_recorded ? row.present_count : "—"}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-rose-700">
                        {row.is_recorded ? row.absent_count : "—"}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-amber-700">
                        {row.is_recorded ? row.late_count : "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {row.is_recorded ? (
                          <span className="font-bold text-[#141A2E]">{row.attendance_percentage}%</span>
                        ) : (
                          <span className="text-[#8C95A8]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/admin/attendance/take?date=${selectedDate}&classId=${row.class_id}${
                            row.section_id ? `&sectionId=${row.section_id}` : ""
                          }`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-[#2158E0] hover:bg-blue-50 transition-colors"
                        >
                          {row.is_recorded ? "Edit" : "Mark"}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Attendance Activity Feed (1 Column) */}
        <div className="bg-white rounded-2xl border border-[#E6EAF3] shadow-2xs p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E6EAF3]">
              <div>
                <h3 className="text-sm font-bold text-[#141A2E] font-heading">Recent Attendance Logs</h3>
                <p className="text-xs text-[#5B6478]">Latest student records marked today</p>
              </div>
              <Link
                to="/admin/attendance/history"
                className="text-xs font-semibold text-[#2158E0] hover:underline"
              >
                View All
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : recentRecords.length === 0 ? (
                <div className="py-12 text-center text-[#5B6478] text-xs">
                  No attendance records marked yet today.
                </div>
              ) : (
                recentRecords.slice(0, 8).map((r) => {
                  const statusColors: Record<string, string> = {
                    present: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    absent: "bg-rose-50 text-rose-700 border-rose-200",
                    late: "bg-amber-50 text-amber-700 border-amber-200",
                    leave: "bg-purple-50 text-purple-700 border-purple-200",
                  };
                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-[#E6EAF3] hover:bg-slate-50/50 transition-colors text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-[#141A2E] truncate">{r.student_name}</div>
                        <div className="text-[11px] text-[#5B6478]">
                          {r.class_name} {r.section_name ? `(${r.section_name})` : ""} • Adm: {r.admission_no}
                        </div>
                      </div>
                      <span
                        className={`capitalize px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                          statusColors[r.status] || "bg-slate-100 text-[#5B6478]"
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E6EAF3] mt-4">
            <Link
              to="/admin/attendance/qr"
              className="w-full py-2 px-3 rounded-lg border border-[#2158E0] text-[#2158E0] hover:bg-blue-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <QrCode className="w-4 h-4" />
              Launch QR ID Scanner
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
export default AttendanceDashboard;
