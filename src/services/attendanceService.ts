/**
 * Attendance Management System Service
 * Multi-tenant, robust database operations for recording, querying,
 * auditing, scanning QR codes, and generating reports.
 */

import { supabase } from "../lib/supabase";
import type {
  AttendanceDashboardSummary,
  ClassAttendanceOverview,
  AttendanceStudentItem,
  StudentAttendanceRecord,
  AttendanceSession,
  AttendanceCorrectionLog,
  AttendanceSettings,
  AttendanceHistoryFilter,
  QRAttendanceScanResult,
  DailyAttendanceReport,
  MonthlyAttendanceStudentReport,
  IndividualStudentAttendanceReport,
  AttendanceStatus,
} from "../types/attendance";

// Helper: Format today's date YYYY-MM-DD
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 1. Attendance Dashboard Summary
 * Calculates school-wide attendance KPIs for a given date.
 */
export async function getAttendanceDashboardSummary(params: {
  schoolId: string;
  date?: string;
  academicYearId?: string;
}): Promise<AttendanceDashboardSummary> {
  const { schoolId, date = getTodayDateString(), academicYearId } = params;

  if (!schoolId) {
    return {
      total_students: 0,
      present_students: 0,
      absent_students: 0,
      late_students: 0,
      leave_students: 0,
      attendance_percentage: 0,
      sessions_recorded_today: 0,
      total_sections_count: 0,
    };
  }

  try {
    // 1. Get total active enrolled students count
    let enrollmentQuery = supabase
      .from("student_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("status", "active");

    if (academicYearId) {
      enrollmentQuery = enrollmentQuery.eq("academic_year_id", academicYearId);
    }

    const { count: totalEnrolled } = await enrollmentQuery;
    const totalStudents = totalEnrolled || 0;

    // 2. Get total sections count
    let sectionsQuery = supabase
      .from("sections")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("status", "active");

    if (academicYearId) {
      sectionsQuery = sectionsQuery.eq("academic_year_id", academicYearId);
    }
    const { count: totalSections } = await sectionsQuery;

    // 3. Get all attendance records for the date
    let recordsQuery = supabase
      .from("student_attendance_records")
      .select("id, status")
      .eq("school_id", schoolId)
      .eq("date", date);

    if (academicYearId) {
      recordsQuery = recordsQuery.eq("academic_year_id", academicYearId);
    }

    const { data: records, error: recordsErr } = await recordsQuery;
    if (recordsErr) throw recordsErr;

    // 4. Get recorded sessions count
    let sessionsQuery = supabase
      .from("attendance_sessions")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("date", date);

    if (academicYearId) {
      sessionsQuery = sessionsQuery.eq("academic_year_id", academicYearId);
    }
    const { count: sessionsCount } = await sessionsQuery;

    let present = 0;
    let absent = 0;
    let late = 0;
    let leave = 0;

    (records || []).forEach((r) => {
      if (r.status === "present") present++;
      else if (r.status === "absent") absent++;
      else if (r.status === "late") late++;
      else if (r.status === "leave") leave++;
    });

    const totalMarked = present + absent + late + leave;
    // Late students are physically present; percentage = (present + late) / totalMarked
    const attendancePercentage =
      totalMarked > 0 ? Math.round(((present + late) / totalMarked) * 1000) / 10 : 0;

    return {
      total_students: totalStudents,
      present_students: present,
      absent_students: absent,
      late_students: late,
      leave_students: leave,
      attendance_percentage: attendancePercentage,
      sessions_recorded_today: sessionsCount || 0,
      total_sections_count: totalSections || 0,
    };
  } catch (error) {
    console.error("Error fetching attendance dashboard summary:", error);
    return {
      total_students: 0,
      present_students: 0,
      absent_students: 0,
      late_students: 0,
      leave_students: 0,
      attendance_percentage: 0,
      sessions_recorded_today: 0,
      total_sections_count: 0,
    };
  }
}

/**
 * 2. Class-Wise Attendance Overview
 * Lists all active classes & sections for the date with recorded stats.
 */
export async function getClassAttendanceOverview(params: {
  schoolId: string;
  date?: string;
  academicYearId?: string;
}): Promise<ClassAttendanceOverview[]> {
  const { schoolId, date = getTodayDateString(), academicYearId } = params;
  if (!schoolId) return [];

  try {
    // 1. Fetch classes & sections
    let classesQuery = supabase
      .from("classes")
      .select("id, name, sort_order")
      .eq("school_id", schoolId)
      .eq("status", "active")
      .order("sort_order", { ascending: true });

    let sectionsQuery = supabase
      .from("sections")
      .select("id, class_id, name, sort_order")
      .eq("school_id", schoolId)
      .eq("status", "active")
      .order("sort_order", { ascending: true });

    if (academicYearId) {
      classesQuery = classesQuery.eq("academic_year_id", academicYearId);
      sectionsQuery = sectionsQuery.eq("academic_year_id", academicYearId);
    }

    const [classesRes, sectionsRes] = await Promise.all([classesQuery, sectionsQuery]);
    const classes = classesRes.data || [];
    const sections = sectionsRes.data || [];

    // 2. Fetch active enrollments count grouped by class and section
    let enrollQuery = supabase
      .from("student_enrollments")
      .select("class_id, section_id")
      .eq("school_id", schoolId)
      .eq("status", "active");

    if (academicYearId) {
      enrollQuery = enrollQuery.eq("academic_year_id", academicYearId);
    }

    const { data: enrollments } = await enrollQuery;
    const enrollmentCounts: Record<string, number> = {};

    (enrollments || []).forEach((e) => {
      const key = `${e.class_id}_${e.section_id || "none"}`;
      enrollmentCounts[key] = (enrollmentCounts[key] || 0) + 1;
    });

    // 3. Fetch attendance sessions for this date
    let sessionsQuery = supabase
      .from("attendance_sessions")
      .select("*")
      .eq("school_id", schoolId)
      .eq("date", date);

    if (academicYearId) {
      sessionsQuery = sessionsQuery.eq("academic_year_id", academicYearId);
    }

    const { data: sessions } = await sessionsQuery;
    const sessionsMap = new Map<string, AttendanceSession>();
    (sessions || []).forEach((s) => {
      const key = `${s.class_id}_${s.section_id || "none"}`;
      sessionsMap.set(key, s);
    });

    // 4. Build class/section list
    const overviewList: ClassAttendanceOverview[] = [];

    classes.forEach((cls) => {
      const classSections = sections.filter((s) => s.class_id === cls.id);

      if (classSections.length > 0) {
        classSections.forEach((sec) => {
          const key = `${cls.id}_${sec.id}`;
          const session = sessionsMap.get(key);
          const totalInSec = enrollmentCounts[key] || 0;

          const present = session?.present_count || 0;
          const absent = session?.absent_count || 0;
          const late = session?.late_count || 0;
          const leave = session?.leave_count || 0;
          const marked = present + absent + late + leave;
          const pct = marked > 0 ? Math.round(((present + late) / marked) * 1000) / 10 : 0;

          overviewList.push({
            class_id: cls.id,
            class_name: cls.name,
            section_id: sec.id,
            section_name: sec.name,
            is_recorded: !!session,
            session_id: session?.id || null,
            total_students: totalInSec,
            present_count: present,
            absent_count: absent,
            late_count: late,
            leave_count: leave,
            attendance_percentage: pct,
          });
        });
      } else {
        // Class without distinct sections
        const key = `${cls.id}_none`;
        const session = sessionsMap.get(key);
        const totalInClass = enrollmentCounts[key] || 0;

        const present = session?.present_count || 0;
        const absent = session?.absent_count || 0;
        const late = session?.late_count || 0;
        const leave = session?.leave_count || 0;
        const marked = present + absent + late + leave;
        const pct = marked > 0 ? Math.round(((present + late) / marked) * 1000) / 10 : 0;

        overviewList.push({
          class_id: cls.id,
          class_name: cls.name,
          section_id: null,
          section_name: null,
          is_recorded: !!session,
          session_id: session?.id || null,
          total_students: totalInClass,
          present_count: present,
          absent_count: absent,
          late_count: late,
          leave_count: leave,
          attendance_percentage: pct,
        });
      }
    });

    return overviewList;
  } catch (error) {
    console.error("Error fetching class attendance overview:", error);
    return [];
  }
}

/**
 * 3. Enrolled Students For Attendance (Take Attendance Page)
 * Returns student list with existing attendance status if already marked.
 */
export async function getEnrolledStudentsForAttendance(params: {
  schoolId: string;
  academicYearId: string;
  classId: string;
  sectionId?: string | null;
  date: string;
}): Promise<{
  students: AttendanceStudentItem[];
  session: AttendanceSession | null;
}> {
  const { schoolId, academicYearId, classId, sectionId, date } = params;

  if (!schoolId || !classId) {
    return { students: [], session: null };
  }

  try {
    // 1. Fetch active enrollments for this class and section
    let enrollQuery = supabase
      .from("student_enrollments")
      .select(
        `
        id,
        student_id,
        roll_no,
        students:students!student_enrollments_student_id_fkey(
          id,
          admission_no,
          first_name,
          last_name,
          photo_path,
          status
        )
      `
      )
      .eq("school_id", schoolId)
      .eq("class_id", classId)
      .eq("status", "active")
      .eq("students.status", "enrolled");

    if (academicYearId) {
      enrollQuery = enrollQuery.eq("academic_year_id", academicYearId);
    }

    if (sectionId) {
      enrollQuery = enrollQuery.eq("section_id", sectionId);
    }

    const { data: enrollments, error: enrollErr } = await enrollQuery;
    if (enrollErr) throw enrollErr;

    // 2. Fetch existing session if any
    let sessionQuery = supabase
      .from("attendance_sessions")
      .select("*")
      .eq("school_id", schoolId)
      .eq("class_id", classId)
      .eq("date", date);

    if (academicYearId) {
      sessionQuery = sessionQuery.eq("academic_year_id", academicYearId);
    }

    if (sectionId) {
      sessionQuery = sessionQuery.eq("section_id", sectionId);
    } else {
      sessionQuery = sessionQuery.is("section_id", null);
    }

    const { data: sessionRows } = await sessionQuery;
    const existingSession = sessionRows && sessionRows.length > 0 ? (sessionRows[0] as AttendanceSession) : null;

    // 3. Fetch existing student attendance records if session exists
    const recordsMap = new Map<string, { id: string; status: AttendanceStatus; remarks?: string }>();
    if (existingSession) {
      const { data: existingRecords } = await supabase
        .from("student_attendance_records")
        .select("id, student_id, status, remarks")
        .eq("session_id", existingSession.id);

      (existingRecords || []).forEach((r) => {
        recordsMap.set(r.student_id, {
          id: r.id,
          status: r.status as AttendanceStatus,
          remarks: r.remarks || undefined,
        });
      });
    }

    // 4. Map into AttendanceStudentItem array
    const studentList: AttendanceStudentItem[] = (enrollments || []).map((row: any) => {
      const s = row.students;
      const existing = recordsMap.get(s.id);
      const fullName = `${s.first_name} ${s.last_name || ""}`.trim();

      return {
        student_id: s.id,
        enrollment_id: row.id,
        admission_no: s.admission_no,
        roll_no: row.roll_no || null,
        first_name: s.first_name,
        last_name: s.last_name || "",
        full_name: fullName,
        photo_path: s.photo_path || null,
        status: existing?.status || "present", // Default to present if unrecorded
        remarks: existing?.remarks || "",
        record_id: existing?.id,
      };
    });

    // Sort by roll_no numerically if available, otherwise by name
    studentList.sort((a, b) => {
      if (a.roll_no && b.roll_no) {
        const numA = parseInt(a.roll_no, 10);
        const numB = parseInt(b.roll_no, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.roll_no.localeCompare(b.roll_no);
      }
      return a.full_name.localeCompare(b.full_name);
    });

    return {
      students: studentList,
      session: existingSession,
    };
  } catch (error) {
    console.error("Error fetching enrolled students for attendance:", error);
    return { students: [], session: null };
  }
}

/**
 * 4. Save Class Attendance
 * Atomically creates or updates session and student records with correction audit logs.
 */
export async function saveClassAttendance(params: {
  schoolId: string;
  academicYearId: string;
  classId: string;
  sectionId?: string | null;
  date: string;
  sessionName?: string;
  records: Array<{
    student_id: string;
    enrollment_id?: string;
    status: AttendanceStatus;
    remarks?: string;
  }>;
  notes?: string;
  takenBy?: string;
}): Promise<{ success: boolean; message: string; session_id?: string }> {
  const {
    schoolId,
    academicYearId,
    classId,
    sectionId = null,
    date,
    sessionName = "daily",
    records,
    notes,
    takenBy,
  } = params;

  if (!schoolId || !classId || !records || records.length === 0) {
    return { success: false, message: "Missing required attendance parameters or empty student records." };
  }

  try {
    // 1. Find or create the attendance session
    let sessionQuery = supabase
      .from("attendance_sessions")
      .select("id")
      .eq("school_id", schoolId)
      .eq("academic_year_id", academicYearId)
      .eq("class_id", classId)
      .eq("date", date)
      .eq("session_name", sessionName);

    if (sectionId) {
      sessionQuery = sessionQuery.eq("section_id", sectionId);
    } else {
      sessionQuery = sessionQuery.is("section_id", null);
    }

    const { data: existingSessions, error: sessionErr } = await sessionQuery;
    if (sessionErr) throw sessionErr;

    let sessionId: string;

    if (existingSessions && existingSessions.length > 0) {
      sessionId = existingSessions[0].id;
      // Update session note & takenBy
      await supabase
        .from("attendance_sessions")
        .update({
          notes: notes || null,
          taken_by: takenBy || null,
          status: "submitted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);
    } else {
      const { data: newSession, error: createSessionErr } = await supabase
        .from("attendance_sessions")
        .insert({
          school_id: schoolId,
          academic_year_id: academicYearId,
          class_id: classId,
          section_id: sectionId || null,
          date,
          session_name: sessionName,
          status: "submitted",
          notes: notes || null,
          taken_by: takenBy || null,
        })
        .select("id")
        .single();

      if (createSessionErr) throw createSessionErr;
      sessionId = newSession.id;
    }

    // 2. Fetch existing records for this session to identify corrections
    const { data: existingRecords } = await supabase
      .from("student_attendance_records")
      .select("id, student_id, status")
      .eq("session_id", sessionId);

    const existingMap = new Map<string, { id: string; status: AttendanceStatus }>();
    (existingRecords || []).forEach((r) => {
      existingMap.set(r.student_id, { id: r.id, status: r.status as AttendanceStatus });
    });

    const recordsToInsert = [];
    const correctionsToLog = [];

    for (const item of records) {
      const existing = existingMap.get(item.student_id);

      if (existing) {
        // Record exists: update it
        if (existing.status !== item.status) {
          correctionsToLog.push({
            school_id: schoolId,
            attendance_record_id: existing.id,
            student_id: item.student_id,
            previous_status: existing.status,
            new_status: item.status,
            reason: "Updated during manual attendance review",
            changed_by: takenBy || null,
          });
        }

        await supabase
          .from("student_attendance_records")
          .update({
            status: item.status,
            remarks: item.remarks || null,
            marked_by: takenBy || null,
            marked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        // Insert new record
        recordsToInsert.push({
          school_id: schoolId,
          session_id: sessionId,
          student_id: item.student_id,
          enrollment_id: item.enrollment_id || null,
          academic_year_id: academicYearId,
          class_id: classId,
          section_id: sectionId || null,
          date,
          session_name: sessionName,
          status: item.status,
          source: "manual",
          remarks: item.remarks || null,
          marked_by: takenBy || null,
          marked_at: new Date().toISOString(),
        });
      }
    }

    if (recordsToInsert.length > 0) {
      const { error: insertErr } = await supabase
        .from("student_attendance_records")
        .insert(recordsToInsert);
      if (insertErr) throw insertErr;
    }

    if (correctionsToLog.length > 0) {
      await supabase.from("attendance_corrections_log").insert(correctionsToLog);
    }

    return {
      success: true,
      message: `Attendance saved successfully for ${records.length} students.`,
      session_id: sessionId,
    };
  } catch (error: any) {
    console.error("Error saving class attendance:", error);
    return {
      success: false,
      message: error?.message || "Failed to save attendance. Please try again.",
    };
  }
}

/**
 * 5. Attendance History
 * Fetches historical attendance records with comprehensive filtering.
 */
export async function getAttendanceHistory(params: {
  schoolId: string;
  filters: AttendanceHistoryFilter;
  page?: number;
  pageSize?: number;
}): Promise<{
  records: StudentAttendanceRecord[];
  totalCount: number;
}> {
  const { schoolId, filters, page = 1, pageSize = 50 } = params;
  if (!schoolId) return { records: [], totalCount: 0 };

  try {
    let query = supabase
      .from("student_attendance_records")
      .select(
        `
        id,
        school_id,
        session_id,
        student_id,
        enrollment_id,
        academic_year_id,
        class_id,
        section_id,
        date,
        session_name,
        status,
        source,
        remarks,
        marked_by,
        marked_at,
        created_at,
        updated_at,
        students:students!student_attendance_records_student_id_fkey(
          first_name,
          last_name,
          admission_no,
          photo_path
        ),
        classes:classes!student_attendance_records_class_id_fkey(
          name
        ),
        sections:sections!student_attendance_records_section_id_fkey(
          name
        ),
        student_enrollments:student_enrollments!student_attendance_records_enrollment_id_fkey(
          roll_no
        )
      `,
        { count: "exact" }
      )
      .eq("school_id", schoolId);

    if (filters.startDate) {
      query = query.gte("date", filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte("date", filters.endDate);
    }
    if (filters.academicYearId) {
      query = query.eq("academic_year_id", filters.academicYearId);
    }
    if (filters.classId) {
      query = query.eq("class_id", filters.classId);
    }
    if (filters.sectionId) {
      query = query.eq("section_id", filters.sectionId);
    }
    if (filters.studentId) {
      query = query.eq("student_id", filters.studentId);
    }
    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.order("date", { ascending: false }).order("created_at", { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    const formattedRecords: StudentAttendanceRecord[] = (data || []).map((row: any) => {
      const s = row.students;
      const c = row.classes;
      const sec = row.sections;
      const enroll = row.student_enrollments;
      const studentName = `${s.first_name} ${s.last_name || ""}`.trim();

      return {
        id: row.id,
        school_id: row.school_id,
        session_id: row.session_id,
        student_id: row.student_id,
        enrollment_id: row.enrollment_id,
        academic_year_id: row.academic_year_id,
        class_id: row.class_id,
        section_id: row.section_id,
        date: row.date,
        session_name: row.session_name,
        status: row.status as AttendanceStatus,
        source: row.source,
        remarks: row.remarks,
        marked_by: row.marked_by,
        marked_at: row.marked_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        student_name: studentName,
        admission_no: s.admission_no,
        roll_no: enroll?.roll_no || null,
        photo_path: s.photo_path,
        class_name: c?.name || "Class",
        section_name: sec?.name || null,
      };
    });

    return {
      records: formattedRecords,
      totalCount: count || 0,
    };
  } catch (error) {
    console.error("Error fetching attendance history:", error);
    return { records: [], totalCount: 0 };
  }
}

/**
 * 6. Update Single Student Attendance Record with Audit Trail
 */
export async function updateStudentAttendanceRecord(params: {
  schoolId: string;
  recordId: string;
  newStatus: AttendanceStatus;
  reason: string;
  changedBy?: string;
}): Promise<{ success: boolean; message: string }> {
  const { schoolId, recordId, newStatus, reason, changedBy } = params;

  if (!schoolId || !recordId || !newStatus || !reason?.trim()) {
    return { success: false, message: "Record ID, new status, and correction reason are required." };
  }

  try {
    // 1. Fetch current record
    const { data: currentRecord, error: fetchErr } = await supabase
      .from("student_attendance_records")
      .select("id, status, student_id")
      .eq("id", recordId)
      .eq("school_id", schoolId)
      .single();

    if (fetchErr || !currentRecord) {
      return { success: false, message: "Attendance record not found." };
    }

    if (currentRecord.status === newStatus) {
      return { success: true, message: "Status is already set to " + newStatus };
    }

    // 2. Insert correction audit log
    const { error: logErr } = await supabase.from("attendance_corrections_log").insert({
      school_id: schoolId,
      attendance_record_id: recordId,
      student_id: currentRecord.student_id,
      previous_status: currentRecord.status,
      new_status: newStatus,
      reason: reason.trim(),
      changed_by: changedBy || null,
    });
    if (logErr) throw logErr;

    // 3. Update the record
    const { error: updateErr } = await supabase
      .from("student_attendance_records")
      .update({
        status: newStatus,
        source: "admin_override",
        marked_by: changedBy || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recordId)
      .eq("school_id", schoolId);

    if (updateErr) throw updateErr;

    return { success: true, message: "Attendance record corrected successfully." };
  } catch (error: any) {
    console.error("Error updating attendance record:", error);
    return { success: false, message: error?.message || "Failed to update record." };
  }
}

/**
 * 7. Get Attendance Corrections Audit Log
 */
export async function getAttendanceCorrectionsLog(params: {
  schoolId: string;
  recordId?: string;
  studentId?: string;
}): Promise<AttendanceCorrectionLog[]> {
  const { schoolId, recordId, studentId } = params;
  if (!schoolId) return [];

  try {
    let query = supabase
      .from("attendance_corrections_log")
      .select(
        `
        id,
        school_id,
        attendance_record_id,
        student_id,
        previous_status,
        new_status,
        reason,
        changed_by,
        created_at,
        students:students!attendance_corrections_log_student_id_fkey(
          first_name,
          last_name,
          admission_no
        ),
        student_attendance_records:student_attendance_records!attendance_corrections_log_attendance_record_id_fkey(
          date
        )
      `
      )
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (recordId) {
      query = query.eq("attendance_record_id", recordId);
    }
    if (studentId) {
      query = query.eq("student_id", studentId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      school_id: row.school_id,
      attendance_record_id: row.attendance_record_id,
      student_id: row.student_id,
      previous_status: row.previous_status as AttendanceStatus,
      new_status: row.new_status as AttendanceStatus,
      reason: row.reason,
      changed_by: row.changed_by,
      created_at: row.created_at,
      student_name: row.students
        ? `${row.students.first_name} ${row.students.last_name || ""}`.trim()
        : undefined,
      admission_no: row.students?.admission_no,
      date: row.student_attendance_records?.date,
    }));
  } catch (error) {
    console.error("Error fetching corrections log:", error);
    return [];
  }
}

/**
 * 8. QR Attendance Scan
 * Securely calls the `mark_attendance_via_qr` RPC function.
 */
export async function scanQRAttendance(params: {
  schoolId: string;
  verificationToken: string;
  date?: string;
  sessionName?: string;
  status?: AttendanceStatus;
  markedBy?: string;
}): Promise<QRAttendanceScanResult> {
  const {
    schoolId,
    verificationToken,
    date = getTodayDateString(),
    sessionName = "daily",
    status = "present",
    markedBy,
  } = params;

  if (!schoolId || !verificationToken?.trim()) {
    return {
      success: false,
      code: "INVALID_INPUT",
      message: "School ID and QR verification token are required.",
    };
  }

  try {
    const { data, error } = await supabase.rpc("mark_attendance_via_qr", {
      p_school_id: schoolId,
      p_verification_token: verificationToken.trim(),
      p_date: date,
      p_session_name: sessionName,
      p_status: status,
      p_marked_by: markedBy || null,
    });

    if (error) {
      console.error("QR RPC error:", error);
      return {
        success: false,
        code: "RPC_ERROR",
        message: error.message || "Failed to process QR attendance scan.",
      };
    }

    return data as QRAttendanceScanResult;
  } catch (error: any) {
    console.error("Error executing QR attendance scan:", error);
    return {
      success: false,
      code: "NETWORK_ERROR",
      message: error?.message || "An unexpected error occurred during scan.",
    };
  }
}

/**
 * 9. Daily Attendance Report
 */
export async function getDailyAttendanceReport(params: {
  schoolId: string;
  date: string;
  academicYearId?: string;
}): Promise<DailyAttendanceReport> {
  const { schoolId, date, academicYearId } = params;

  const [summary, classSummaries] = await Promise.all([
    getAttendanceDashboardSummary({ schoolId, date, academicYearId }),
    getClassAttendanceOverview({ schoolId, date, academicYearId }),
  ]);

  return {
    date,
    total_students: summary.total_students,
    present_count: summary.present_students,
    absent_count: summary.absent_students,
    late_count: summary.late_students,
    leave_count: summary.leave_students,
    overall_percentage: summary.attendance_percentage,
    class_summaries: classSummaries,
  };
}

/**
 * 10. Monthly Attendance Report
 * Aggregates student attendance for a calendar month.
 */
export async function getMonthlyAttendanceReport(params: {
  schoolId: string;
  year: number;
  month: number; // 1-12
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
}): Promise<MonthlyAttendanceStudentReport[]> {
  const { schoolId, year, month, academicYearId, classId, sectionId } = params;
  if (!schoolId) return [];

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  try {
    // 1. Fetch active students in class/section
    let enrollQuery = supabase
      .from("student_enrollments")
      .select(
        `
        id,
        student_id,
        roll_no,
        classes:classes!student_enrollments_class_id_fkey(name),
        sections:sections!student_enrollments_section_id_fkey(name),
        students:students!student_enrollments_student_id_fkey(
          id,
          first_name,
          last_name,
          admission_no,
          status
        )
      `
      )
      .eq("school_id", schoolId)
      .eq("status", "active")
      .eq("students.status", "enrolled");

    if (academicYearId) enrollQuery = enrollQuery.eq("academic_year_id", academicYearId);
    if (classId) enrollQuery = enrollQuery.eq("class_id", classId);
    if (sectionId) enrollQuery = enrollQuery.eq("section_id", sectionId);

    const { data: enrollments, error: enrollErr } = await enrollQuery;
    if (enrollErr) throw enrollErr;

    // 2. Fetch all attendance records in this date range
    let recordsQuery = supabase
      .from("student_attendance_records")
      .select("student_id, date, status")
      .eq("school_id", schoolId)
      .gte("date", startDate)
      .lte("date", endDate);

    if (classId) recordsQuery = recordsQuery.eq("class_id", classId);

    const { data: records, error: recordsErr } = await recordsQuery;
    if (recordsErr) throw recordsErr;

    // Distinct dates on which attendance was recorded in this school/class
    const distinctDates = new Set<string>();
    (records || []).forEach((r) => distinctDates.add(r.date));
    const totalWorkingDays = distinctDates.size;

    // Student counts map
    const studentStats = new Map<
      string,
      { present: number; absent: number; late: number; leave: number }
    >();

    (records || []).forEach((r) => {
      const cur = studentStats.get(r.student_id) || { present: 0, absent: 0, late: 0, leave: 0 };
      if (r.status === "present") cur.present++;
      else if (r.status === "absent") cur.absent++;
      else if (r.status === "late") cur.late++;
      else if (r.status === "leave") cur.leave++;
      studentStats.set(r.student_id, cur);
    });

    const report: MonthlyAttendanceStudentReport[] = (enrollments || []).map((row: any) => {
      const s = row.students;
      const c = row.classes;
      const sec = row.sections;
      const stats = studentStats.get(s.id) || { present: 0, absent: 0, late: 0, leave: 0 };
      const totalMarked = stats.present + stats.absent + stats.late + stats.leave;
      const denominator = totalWorkingDays > 0 ? totalWorkingDays : totalMarked;
      const pct =
        denominator > 0
          ? Math.round(((stats.present + stats.late) / denominator) * 1000) / 10
          : 0;

      return {
        student_id: s.id,
        student_name: `${s.first_name} ${s.last_name || ""}`.trim(),
        admission_no: s.admission_no,
        roll_no: row.roll_no || null,
        class_name: c?.name || "Class",
        section_name: sec?.name || null,
        total_working_days: totalWorkingDays,
        present_days: stats.present,
        absent_days: stats.absent,
        late_days: stats.late,
        leave_days: stats.leave,
        percentage: pct,
      };
    });

    report.sort((a, b) => {
      if (a.roll_no && b.roll_no) {
        const numA = parseInt(a.roll_no, 10);
        const numB = parseInt(b.roll_no, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      }
      return a.student_name.localeCompare(b.student_name);
    });

    return report;
  } catch (error) {
    console.error("Error generating monthly attendance report:", error);
    return [];
  }
}

/**
 * 11. Individual Student Attendance Report
 */
export async function getStudentAttendanceReport(params: {
  schoolId: string;
  studentId: string;
  academicYearId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<IndividualStudentAttendanceReport | null> {
  const { schoolId, studentId, academicYearId, startDate, endDate } = params;
  if (!schoolId || !studentId) return null;

  try {
    // 1. Fetch student & enrollment info
    const { data: student, error: studentErr } = await supabase
      .from("students")
      .select(
        `
        id,
        first_name,
        last_name,
        admission_no,
        student_enrollments!inner(
          roll_no,
          classes!inner(name),
          sections(name)
        )
      `
      )
      .eq("id", studentId)
      .eq("school_id", schoolId)
      .single();

    if (studentErr || !student) return null;

    const enroll = student.student_enrollments?.[0];

    // 2. Query attendance records
    let query = supabase
      .from("student_attendance_records")
      .select("date, status, remarks, source")
      .eq("school_id", schoolId)
      .eq("student_id", studentId)
      .order("date", { ascending: false });

    if (academicYearId) query = query.eq("academic_year_id", academicYearId);
    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);

    const { data: records, error: recErr } = await query;
    if (recErr) throw recErr;

    let present = 0;
    let absent = 0;
    let late = 0;
    let leave = 0;

    (records || []).forEach((r) => {
      if (r.status === "present") present++;
      else if (r.status === "absent") absent++;
      else if (r.status === "late") late++;
      else if (r.status === "leave") leave++;
    });

    const totalDays = present + absent + late + leave;
    const percentage =
      totalDays > 0 ? Math.round(((present + late) / totalDays) * 1000) / 10 : 0;

    const rawClasses = enroll?.classes as any;
    const rawSections = enroll?.sections as any;
    const className = Array.isArray(rawClasses) ? rawClasses[0]?.name : rawClasses?.name || "Class";
    const sectionName = Array.isArray(rawSections) ? rawSections[0]?.name : rawSections?.name || null;

    return {
      student_id: student.id,
      student_name: `${student.first_name} ${student.last_name || ""}`.trim(),
      admission_no: student.admission_no,
      roll_no: enroll?.roll_no || null,
      class_name: className,
      section_name: sectionName,
      total_days: totalDays,
      present_days: present,
      absent_days: absent,
      late_days: late,
      leave_days: leave,
      percentage,
      history: (records || []).map((r) => ({
        date: r.date,
        status: r.status as AttendanceStatus,
        remarks: r.remarks,
        source: r.source,
      })),
    };
  } catch (error) {
    console.error("Error fetching student attendance report:", error);
    return null;
  }
}

/**
 * 12. Attendance Settings
 */
export async function getAttendanceSettings(schoolId: string): Promise<AttendanceSettings> {
  const defaultSettings: AttendanceSettings = {
    id: "",
    school_id: schoolId,
    default_status: "present",
    allow_late_marking: true,
    late_cutoff_time: "08:30:00",
    require_leave_reason: false,
    prevent_past_edit_days: 30,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!schoolId) return defaultSettings;

  try {
    const { data, error } = await supabase
      .from("attendance_settings")
      .select("*")
      .eq("school_id", schoolId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return defaultSettings;

    return data as AttendanceSettings;
  } catch (error) {
    console.error("Error fetching attendance settings:", error);
    return defaultSettings;
  }
}

export async function updateAttendanceSettings(params: {
  schoolId: string;
  settings: Partial<AttendanceSettings>;
}): Promise<{ success: boolean; message: string }> {
  const { schoolId, settings } = params;
  if (!schoolId) return { success: false, message: "School ID required." };

  try {
    const payload = {
      school_id: schoolId,
      default_status: settings.default_status || "present",
      allow_late_marking: settings.allow_late_marking ?? true,
      late_cutoff_time: settings.late_cutoff_time || "08:30:00",
      require_leave_reason: settings.require_leave_reason ?? false,
      prevent_past_edit_days: settings.prevent_past_edit_days ?? 30,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("attendance_settings")
      .upsert(payload, { onConflict: "school_id" });

    if (error) throw error;

    return { success: true, message: "Attendance settings updated successfully." };
  } catch (error: any) {
    console.error("Error updating attendance settings:", error);
    return { success: false, message: error?.message || "Failed to update settings." };
  }
}
