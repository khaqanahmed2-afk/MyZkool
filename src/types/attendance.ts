/**
 * Attendance Management System - Type Definitions
 * Covers sessions, student records, audit logs, reports, and settings.
 */

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export type AttendanceSource = 'manual' | 'qr_scan' | 'admin_override';

export type AttendanceSessionStatus = 'draft' | 'submitted' | 'finalized';

export interface AttendanceSession {
  id: string;
  school_id: string;
  academic_year_id: string;
  class_id: string;
  section_id?: string | null;
  date: string; // YYYY-MM-DD
  session_name: string;
  status: AttendanceSessionStatus;
  taken_by?: string | null;
  total_students: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  leave_count: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;

  // Joined presentation fields
  class_name?: string;
  section_name?: string;
}

export interface StudentAttendanceRecord {
  id: string;
  school_id: string;
  session_id: string;
  student_id: string;
  enrollment_id?: string | null;
  academic_year_id: string;
  class_id: string;
  section_id?: string | null;
  date: string; // YYYY-MM-DD
  session_name: string;
  status: AttendanceStatus;
  source: AttendanceSource;
  remarks?: string | null;
  marked_by?: string | null;
  marked_at: string;
  created_at: string;
  updated_at: string;

  // Joined fields
  student_name?: string;
  admission_no?: string;
  roll_no?: string | null;
  photo_path?: string | null;
  class_name?: string;
  section_name?: string;
}

export interface AttendanceCorrectionLog {
  id: string;
  school_id: string;
  attendance_record_id: string;
  student_id: string;
  previous_status: AttendanceStatus;
  new_status: AttendanceStatus;
  reason: string;
  changed_by?: string | null;
  changed_by_name?: string | null;
  created_at: string;

  // Joined fields
  student_name?: string;
  admission_no?: string;
  date?: string;
}

export interface AttendanceSettings {
  id: string;
  school_id: string;
  default_status: 'present' | 'absent' | 'unmarked';
  allow_late_marking: boolean;
  late_cutoff_time: string; // HH:mm:ss
  require_leave_reason: boolean;
  prevent_past_edit_days: number;
  created_at: string;
  updated_at: string;
}

export interface AttendanceStudentItem {
  student_id: string;
  enrollment_id: string;
  admission_no: string;
  roll_no?: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  photo_path?: string | null;
  status: AttendanceStatus;
  remarks?: string;
  record_id?: string; // existing attendance record ID if already recorded
}

export interface AttendanceDashboardSummary {
  total_students: number;
  present_students: number;
  absent_students: number;
  late_students: number;
  leave_students: number;
  attendance_percentage: number;
  sessions_recorded_today: number;
  total_sections_count: number;
}

export interface ClassAttendanceOverview {
  class_id: string;
  class_name: string;
  section_id?: string | null;
  section_name?: string | null;
  is_recorded: boolean;
  session_id?: string | null;
  total_students: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  leave_count: number;
  attendance_percentage: number;
}

export interface AttendanceHistoryFilter {
  startDate?: string;
  endDate?: string;
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  studentId?: string;
  status?: AttendanceStatus | 'all';
  search?: string;
}

export interface QRAttendanceScanResult {
  success: boolean;
  code?: string;
  message: string;
  already_recorded?: boolean;
  is_new?: boolean;
  student_id?: string;
  student_name?: string;
  admission_no?: string;
  roll_no?: string | null;
  class_name?: string;
  section_name?: string | null;
  status?: AttendanceStatus;
  photo_path?: string | null;
}

export interface DailyAttendanceReport {
  date: string;
  total_students: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  leave_count: number;
  overall_percentage: number;
  class_summaries: ClassAttendanceOverview[];
}

export interface MonthlyAttendanceStudentReport {
  student_id: string;
  student_name: string;
  admission_no: string;
  roll_no?: string | null;
  class_name: string;
  section_name?: string | null;
  total_working_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  leave_days: number;
  percentage: number;
}

export interface IndividualStudentAttendanceReport {
  student_id: string;
  student_name: string;
  admission_no: string;
  roll_no?: string | null;
  class_name: string;
  section_name?: string | null;
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  leave_days: number;
  percentage: number;
  history: Array<{
    date: string;
    status: AttendanceStatus;
    remarks?: string | null;
    source: AttendanceSource;
  }>;
}
