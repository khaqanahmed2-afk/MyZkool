import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Calendar,
  Users,
  Download,
  Printer,
  Search,
  Filter,
  ArrowLeft,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarOff,
  Percent,
  FileSpreadsheet,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { AttendanceNavHeader } from "../../../components/admin/attendance/AttendanceNavHeader";
import {
  getDailyAttendanceReport,
  getMonthlyAttendanceReport,
  getStudentAttendanceReport,
  getTodayDateString,
} from "../../../services/attendanceService";
import { getClassesWithSections } from "../../../services/classSectionService";
import { getAcademicYearsForSchool } from "../../../services/academicService";
import type {
  DailyAttendanceReport,
  MonthlyAttendanceStudentReport,
  IndividualStudentAttendanceReport,
} from "../../../types/attendance";
import type { AcademicYear } from "../../../types/academic";

export function AttendanceReports() {
  const { school, currentAcademicYear } = useAuth();

  // Tab State: 'daily' | 'monthly' | 'student'
  const [activeTab, setActiveTab] = useState<"daily" | "monthly" | "student">("daily");

  // Daily Report State
  const [dailyDate, setDailyDate] = useState<string>(getTodayDateString());
  const [dailyData, setDailyData] = useState<DailyAttendanceReport | null>(null);

  // Monthly Report State
  const now = new Date();
  const [monthYear, setMonthYear] = useState<number>(now.getFullYear());
  const [monthMonth, setMonthMonth] = useState<number>(now.getMonth() + 1);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [monthlyStudents, setMonthlyStudents] = useState<MonthlyAttendanceStudentReport[]>([]);

  // Student Report State
  const [searchStudentQuery, setSearchStudentQuery] = useState("");
  const [studentReport, setStudentReport] = useState<IndividualStudentAttendanceReport | null>(null);

  // Metadata
  const [classes, setClasses] = useState<
    Array<{ id: string; name: string; sections: Array<{ id: string; name: string }> }>
  >([]);
  const [loading, setLoading] = useState(false);

  // Load Classes
  useEffect(() => {
    if (!school?.id) return;
    const fetchClasses = async () => {
      try {
        const cls = await getClassesWithSections(school.id, currentAcademicYear?.id);
        setClasses(cls);
        if (cls.length > 0 && !selectedClassId) {
          setSelectedClassId(cls[0].id);
          if (cls[0].sections.length > 0) {
            setSelectedSectionId(cls[0].sections[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load classes:", err);
      }
    };
    fetchClasses();
  }, [school?.id, currentAcademicYear?.id]);

  const activeClass = classes.find((c) => c.id === selectedClassId);
  const availableSections = activeClass?.sections || [];

  // Load Daily Report
  const loadDailyReport = useCallback(async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const data = await getDailyAttendanceReport({
        schoolId: school.id,
        date: dailyDate,
        academicYearId: currentAcademicYear?.id,
      });
      setDailyData(data);
    } catch (err) {
      console.error("Daily report error:", err);
    } finally {
      setLoading(false);
    }
  }, [school?.id, dailyDate, currentAcademicYear?.id]);

  // Load Monthly Report
  const loadMonthlyReport = useCallback(async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const data = await getMonthlyAttendanceReport({
        schoolId: school.id,
        year: monthYear,
        month: monthMonth,
        academicYearId: currentAcademicYear?.id,
        classId: selectedClassId || undefined,
        sectionId: selectedSectionId || undefined,
      });
      setMonthlyStudents(data);
    } catch (err) {
      console.error("Monthly report error:", err);
    } finally {
      setLoading(false);
    }
  }, [school?.id, monthYear, monthMonth, selectedClassId, selectedSectionId, currentAcademicYear?.id]);

  useEffect(() => {
    if (activeTab === "daily") {
      loadDailyReport();
    } else if (activeTab === "monthly") {
      loadMonthlyReport();
    }
  }, [activeTab, loadDailyReport, loadMonthlyReport]);

  // CSV Export Helper
  const exportCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportDaily = () => {
    if (!dailyData) return;
    const headers = [
      "Class",
      "Section",
      "Total Students",
      "Present",
      "Absent",
      "Late",
      "Leave",
      "Attendance Percentage",
    ];
    const rows = dailyData.class_summaries.map((c) => [
      c.class_name,
      c.section_name || "N/A",
      c.total_students,
      c.present_count,
      c.absent_count,
      c.late_count,
      c.leave_count,
      `${c.attendance_percentage}%`,
    ]);
    exportCSV(`Daily_Attendance_Report_${dailyDate}`, headers, rows);
  };

  const handleExportMonthly = () => {
    if (monthlyStudents.length === 0) return;
    const headers = [
      "Roll No",
      "Student Name",
      "Admission No",
      "Class",
      "Section",
      "Working Days",
      "Present Days",
      "Absent Days",
      "Late Days",
      "Leave Days",
      "Attendance %",
    ];
    const rows = monthlyStudents.map((s) => [
      s.roll_no || "",
      s.student_name,
      s.admission_no,
      s.class_name,
      s.section_name || "",
      s.total_working_days,
      s.present_days,
      s.absent_days,
      s.late_days,
      s.leave_days,
      `${s.percentage}%`,
    ]);
    exportCSV(`Monthly_Attendance_${monthYear}_${monthMonth}`, headers, rows);
  };

  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <div className="space-y-6">
      <AttendanceNavHeader
        title="Attendance Reports"
        subtitle="Comprehensive daily summaries, monthly registers, and student audit reports"
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
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E6EAF3] bg-white text-xs sm:text-sm font-semibold text-[#5B6478] hover:text-[#141A2E] hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Printer className="w-4 h-4" />
              Print Report
            </button>
          </div>
        }
      />

      {/* Report Type Selector Tabs */}
      <div className="flex items-center gap-2 bg-white border border-[#E6EAF3] p-1.5 rounded-2xl w-fit shadow-2xs">
        <button
          onClick={() => setActiveTab("daily")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === "daily"
              ? "bg-[#2158E0] text-white shadow-xs"
              : "text-[#5B6478] hover:text-[#141A2E]"
          }`}
        >
          Daily School Report
        </button>
        <button
          onClick={() => setActiveTab("monthly")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === "monthly"
              ? "bg-[#2158E0] text-white shadow-xs"
              : "text-[#5B6478] hover:text-[#141A2E]"
          }`}
        >
          Monthly Class Register
        </button>
      </div>

      {/* ─── TAB 1: DAILY REPORT ────────────────────────────────────────────── */}
      {activeTab === "daily" && (
        <div className="space-y-6">
          {/* Daily Filter Bar */}
          <div className="bg-white rounded-2xl border border-[#E6EAF3] p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div>
                <label className="block text-[11px] font-semibold text-[#5B6478] uppercase mb-1">
                  Report Date
                </label>
                <input
                  type="date"
                  value={dailyDate}
                  onChange={(e) => setDailyDate(e.target.value)}
                  className="px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-[#E6EAF3] bg-white text-[#141A2E] focus:outline-none focus:border-[#2158E0]"
                />
              </div>
            </div>

            <button
              onClick={handleExportDaily}
              disabled={loading || !dailyData}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs sm:text-sm font-semibold hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Daily CSV
            </button>
          </div>

          {/* Daily Summary Cards */}
          {dailyData && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <div className="bg-white rounded-2xl border border-[#E6EAF3] p-4 shadow-2xs">
                <span className="text-xs font-medium text-[#5B6478]">Total Students</span>
                <div className="mt-1 text-2xl font-bold text-[#141A2E] font-heading">
                  {dailyData.total_students}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-[#E6EAF3] p-4 shadow-2xs">
                <span className="text-xs font-medium text-emerald-700">Present</span>
                <div className="mt-1 text-2xl font-bold text-emerald-700 font-heading">
                  {dailyData.present_count}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-[#E6EAF3] p-4 shadow-2xs">
                <span className="text-xs font-medium text-rose-700">Absent</span>
                <div className="mt-1 text-2xl font-bold text-rose-700 font-heading">
                  {dailyData.absent_count}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-[#E6EAF3] p-4 shadow-2xs">
                <span className="text-xs font-medium text-amber-700">Late</span>
                <div className="mt-1 text-2xl font-bold text-amber-700 font-heading">
                  {dailyData.late_count}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-[#E6EAF3] p-4 shadow-2xs">
                <span className="text-xs font-medium text-purple-700">Leave</span>
                <div className="mt-1 text-2xl font-bold text-purple-700 font-heading">
                  {dailyData.leave_count}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-[#E6EAF3] p-4 shadow-2xs">
                <span className="text-xs font-medium text-[#2158E0]">Daily Rate</span>
                <div className="mt-1 text-2xl font-bold text-[#2158E0] font-heading">
                  {dailyData.overall_percentage}%
                </div>
              </div>
            </div>
          )}

          {/* Daily Class-wise Breakdown Table */}
          <div className="bg-white rounded-2xl border border-[#E6EAF3] shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#E6EAF3]">
              <h3 className="text-sm sm:text-base font-bold text-[#141A2E] font-heading">
                Class-Wise Summary ({dailyDate})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E6EAF3] text-[11px] font-semibold text-[#5B6478] uppercase">
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Section</th>
                    <th className="py-3 px-4 text-center">Enrolled</th>
                    <th className="py-3 px-4 text-center text-emerald-700">Present</th>
                    <th className="py-3 px-4 text-center text-rose-700">Absent</th>
                    <th className="py-3 px-4 text-center text-amber-700">Late</th>
                    <th className="py-3 px-4 text-center text-purple-700">Leave</th>
                    <th className="py-3 px-4 text-right">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EAF3]">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#5B6478]">
                        Loading daily report...
                      </td>
                    </tr>
                  ) : !dailyData || dailyData.class_summaries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#5B6478]">
                        No data available for this date.
                      </td>
                    </tr>
                  ) : (
                    dailyData.class_summaries.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-semibold text-[#141A2E]">{c.class_name}</td>
                        <td className="py-3 px-4 text-[#5B6478]">{c.section_name || "—"}</td>
                        <td className="py-3 px-4 text-center font-medium">{c.total_students}</td>
                        <td className="py-3 px-4 text-center text-emerald-700 font-semibold">
                          {c.is_recorded ? c.present_count : "—"}
                        </td>
                        <td className="py-3 px-4 text-center text-rose-700 font-semibold">
                          {c.is_recorded ? c.absent_count : "—"}
                        </td>
                        <td className="py-3 px-4 text-center text-amber-700 font-semibold">
                          {c.is_recorded ? c.late_count : "—"}
                        </td>
                        <td className="py-3 px-4 text-center text-purple-700 font-semibold">
                          {c.is_recorded ? c.leave_count : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-[#141A2E]">
                          {c.is_recorded ? `${c.attendance_percentage}%` : "Not Recorded"}
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

      {/* ─── TAB 2: MONTHLY CLASS REGISTER ─────────────────────────────────── */}
      {activeTab === "monthly" && (
        <div className="space-y-6">
          {/* Monthly Filter Bar */}
          <div className="bg-white rounded-2xl border border-[#E6EAF3] p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Month */}
              <div>
                <label className="block text-[11px] font-semibold text-[#5B6478] uppercase mb-1">
                  Month
                </label>
                <select
                  value={monthMonth}
                  onChange={(e) => setMonthMonth(parseInt(e.target.value, 10))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E6EAF3] text-[#141A2E] bg-white focus:outline-none focus:border-[#2158E0]"
                >
                  {MONTHS.map((m, idx) => (
                    <option key={idx} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div>
                <label className="block text-[11px] font-semibold text-[#5B6478] uppercase mb-1">
                  Year
                </label>
                <input
                  type="number"
                  value={monthYear}
                  onChange={(e) => setMonthYear(parseInt(e.target.value, 10))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E6EAF3] text-[#141A2E] bg-white focus:outline-none focus:border-[#2158E0]"
                />
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
                    const c = classes.find((cl) => cl.id === e.target.value);
                    if (c && c.sections.length > 0) {
                      setSelectedSectionId(c.sections[0].id);
                    } else {
                      setSelectedSectionId("");
                    }
                  }}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E6EAF3] text-[#141A2E] bg-white focus:outline-none focus:border-[#2158E0]"
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
                <label className="block text-[11px] font-semibold text-[#5B6478] uppercase mb-1">
                  Section
                </label>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  disabled={availableSections.length === 0}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E6EAF3] text-[#141A2E] bg-white focus:outline-none focus:border-[#2158E0] disabled:bg-slate-50"
                >
                  <option value="">All Sections</option>
                  {availableSections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      Section {sec.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E6EAF3] flex justify-end">
              <button
                onClick={handleExportMonthly}
                disabled={loading || monthlyStudents.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export Monthly CSV Register
              </button>
            </div>
          </div>

          {/* Monthly Student-wise Register Table */}
          <div className="bg-white rounded-2xl border border-[#E6EAF3] shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#E6EAF3]">
              <h3 className="text-sm sm:text-base font-bold text-[#141A2E] font-heading">
                Monthly Attendance Register — {MONTHS[monthMonth - 1]} {monthYear} (
                {activeClass?.name || "Class"}
                {selectedSectionId && availableSections.find((s) => s.id === selectedSectionId)?.name
                  ? ` Sec ${availableSections.find((s) => s.id === selectedSectionId)?.name}`
                  : ""}
                )
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E6EAF3] text-[11px] font-semibold text-[#5B6478] uppercase">
                    <th className="py-3 px-4 w-14 text-center">Roll</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Adm No</th>
                    <th className="py-3 px-4 text-center">Working Days</th>
                    <th className="py-3 px-4 text-center text-emerald-700">Present</th>
                    <th className="py-3 px-4 text-center text-rose-700">Absent</th>
                    <th className="py-3 px-4 text-center text-amber-700">Late</th>
                    <th className="py-3 px-4 text-center text-purple-700">Leave</th>
                    <th className="py-3 px-4 text-right">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EAF3]">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-[#5B6478]">
                        Loading monthly attendance register...
                      </td>
                    </tr>
                  ) : monthlyStudents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-[#5B6478]">
                        No enrolled students or attendance recorded for this month.
                      </td>
                    </tr>
                  ) : (
                    monthlyStudents.map((s, i) => (
                      <tr key={s.student_id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 text-center font-bold text-[#141A2E]">
                          {s.roll_no || "—"}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#141A2E]">
                          {s.student_name}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#5B6478]">
                          {s.admission_no}
                        </td>
                        <td className="py-3 px-4 text-center font-medium">
                          {s.total_working_days}
                        </td>
                        <td className="py-3 px-4 text-center text-emerald-700 font-semibold">
                          {s.present_days}
                        </td>
                        <td className="py-3 px-4 text-center text-rose-700 font-semibold">
                          {s.absent_days}
                        </td>
                        <td className="py-3 px-4 text-center text-amber-700 font-semibold">
                          {s.late_days}
                        </td>
                        <td className="py-3 px-4 text-center text-purple-700 font-semibold">
                          {s.leave_days}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`font-bold ${
                              s.percentage >= 75
                                ? "text-emerald-700"
                                : s.percentage >= 60
                                ? "text-amber-700"
                                : "text-rose-700"
                            }`}
                          >
                            {s.percentage}%
                          </span>
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
    </div>
  );
}

export default AttendanceReports;
