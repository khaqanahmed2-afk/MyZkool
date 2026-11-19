/**
 * E2E Verification Test Suite: Admin Attendance Management System
 * Covers:
 * - Multi-tenant isolation & data boundary enforcement
 * - Manual class-wise student enrollment loading and attendance marking
 * - Automatic DB trigger session count synchronization
 * - Audit trail logging for administrative corrections
 * - QR code scanning and token validation against student_id_cards
 * - Duplicate scan protection and idempotency
 * - Daily and Monthly report aggregation accuracy
 * - School attendance settings persistence
 */

import "dotenv/config";
import {
  getAttendanceDashboardSummary,
  getClassAttendanceOverview,
  getEnrolledStudentsForAttendance,
  saveClassAttendance,
  getAttendanceHistory,
  updateStudentAttendanceRecord,
  getAttendanceCorrectionsLog,
  scanQRAttendance,
  getDailyAttendanceReport,
  getMonthlyAttendanceReport,
  getStudentAttendanceReport,
  getAttendanceSettings,
  updateAttendanceSettings,
  getTodayDateString,
} from "../src/services/attendanceService";
import { supabase } from "../src/lib/supabase";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log("========================================================");
  console.log("TEST SUITE: Admin Attendance Management System");
  console.log("========================================================");

  // Authenticate as School Admin
  console.log("Step 0: Authenticating with Supabase Auth...");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: "myzkool.official@gmail.com",
    password: "R@shid12",
  });

  if (authErr || !authData?.session) {
    console.error("Auth failed:", authErr?.message);
    process.exit(1);
  }
  console.log("  ✓ Authenticated successfully as:", authData.user?.email);

  const schoolId = "b70261ef-37f1-46c8-a148-2c496a9d33a8"; // Peace Convent School
  const fakeSchoolId = "00000000-0000-0000-0000-000000000999";
  const academicYearId = "a0171c28-e12c-4485-ac27-e0b010607e1f";
  const testDate = "2026-11-19";

  // ─── Group 1: Enrolled Students Retrieval for Class ───────────────────────
  console.log("\n--- Group 1: Enrolled Students Retrieval for Attendance ---");

  // Fetch an enrolled student's class to test
  const { data: enrollmentSample } = await supabase
    .from("student_enrollments")
    .select("class_id, classes!student_enrollments_class_id_fkey(name)")
    .eq("school_id", schoolId)
    .eq("status", "active")
    .limit(1)
    .single();

  assert(!!enrollmentSample, "Found active student enrollment in school");
  const testClassId = enrollmentSample!.class_id;
  const testClassName = (enrollmentSample!.classes as any)?.name || "Test Class";

  const enrolledRes = await getEnrolledStudentsForAttendance({
    schoolId,
    academicYearId,
    classId: testClassId,
    date: testDate,
  });

  assert(Array.isArray(enrolledRes.students), "Returns array of students");
  console.log(`  Loaded ${enrolledRes.students.length} students for ${testClassName}`);
  if (enrolledRes.students.length > 0) {
    const s0 = enrolledRes.students[0];
    assert(!!s0.student_id, "Student has valid student_id");
    assert(!!s0.full_name, `Student has full name: ${s0.full_name}`);
    assert(!!s0.admission_no, `Student has admission_no: ${s0.admission_no}`);
    assert(["present", "absent", "late", "leave"].includes(s0.status), "Student has valid attendance status");
  }

  // ─── Group 2: Manual Attendance Marking & Saving ──────────────────────────
  console.log("\n--- Group 2: Manual Attendance Marking & Session Sync ---");

  if (enrolledRes.students.length > 0) {
    // Mark first student present, second absent (if exists), third late (if exists)
    const recordsToSave = enrolledRes.students.map((s, idx) => {
      let st: "present" | "absent" | "late" | "leave" = "present";
      if (idx === 1) st = "absent";
      if (idx === 2) st = "late";
      return {
        student_id: s.student_id,
        enrollment_id: s.enrollment_id,
        status: st,
        remarks: `Test automated mark index ${idx}`,
      };
    });

    const saveRes = await saveClassAttendance({
      schoolId,
      academicYearId,
      classId: testClassId,
      date: testDate,
      records: recordsToSave,
      notes: "E2E automated test run session",
    });

    assert(saveRes.success === true, `Class attendance saved successfully: ${saveRes.message}`);
    assert(!!saveRes.session_id, `Created session ID: ${saveRes.session_id}`);

    // Verify session in database
    const { data: sessionInDb } = await supabase
      .from("attendance_sessions")
      .select("*")
      .eq("id", saveRes.session_id!)
      .single();

    assert(!!sessionInDb, "Attendance session exists in database");
    assert(sessionInDb.total_students === recordsToSave.length, `Session total_students = ${sessionInDb.total_students}`);
    assert(sessionInDb.present_count >= 1, `Session present_count = ${sessionInDb.present_count}`);
    if (recordsToSave.length > 1) {
      assert(sessionInDb.absent_count >= 1, `Session absent_count = ${sessionInDb.absent_count}`);
    }
    if (recordsToSave.length > 2) {
      assert(sessionInDb.late_count >= 1, `Session late_count = ${sessionInDb.late_count}`);
    }
  }

  // ─── Group 3: Attendance History & Query Filters ──────────────────────────
  console.log("\n--- Group 3: Attendance History & Filtering ---");

  const historyRes = await getAttendanceHistory({
    schoolId,
    filters: {
      startDate: testDate,
      endDate: testDate,
      academicYearId,
      classId: testClassId,
    },
    page: 1,
    pageSize: 10,
  });

  assert(historyRes.totalCount >= 1, `Found ${historyRes.totalCount} saved history records`);
  assert(historyRes.records.length >= 1, "Returned page contains records");
  const firstRecord = historyRes.records[0];
  assert(firstRecord.class_id === testClassId, "Record belongs to queried class");
  assert(firstRecord.date === testDate, `Record date matches testDate ${testDate}`);

  // ─── Group 4: Administrative Correction & Audit Trail ─────────────────────
  console.log("\n--- Group 4: Administrative Correction & Audit Trail ---");

  const targetRecord = historyRes.records[0];
  const originalStatus = targetRecord.status;
  const newTargetStatus = originalStatus === "present" ? "absent" : "present";
  const correctionReason = "Doctor prescription received post-session - medical verification";

  const updateRes = await updateStudentAttendanceRecord({
    schoolId,
    recordId: targetRecord.id,
    newStatus: newTargetStatus,
    reason: correctionReason,
  });

  assert(updateRes.success === true, `Attendance record corrected: ${updateRes.message}`);

  // Verify record in DB has new status
  const { data: updatedRecInDb } = await supabase
    .from("student_attendance_records")
    .select("status, source")
    .eq("id", targetRecord.id)
    .single();

  assert(updatedRecInDb?.status === newTargetStatus, `DB status updated to ${newTargetStatus}`);
  assert(updatedRecInDb?.source === "admin_override", "DB source updated to admin_override");

  // Verify Audit Log entry
  const logs = await getAttendanceCorrectionsLog({
    schoolId,
    recordId: targetRecord.id,
  });

  assert(logs.length >= 1, `Found ${logs.length} audit trail log entries`);
  assert(logs[0].previous_status === originalStatus, `Audit previous_status is ${logs[0].previous_status}`);
  assert(logs[0].new_status === newTargetStatus, `Audit new_status is ${logs[0].new_status}`);
  assert(logs[0].reason === correctionReason, `Audit reason captured: "${logs[0].reason}"`);

  // ─── Group 5: QR Code Attendance Scanning & Token Validation ──────────────
  console.log("\n--- Group 5: QR Code Attendance Scanning ---");

  // Fetch an existing active student card token
  const { data: cardData } = await supabase
    .from("student_id_cards")
    .select("verification_token, student_id, card_status")
    .eq("school_id", schoolId)
    .eq("card_status", "active")
    .limit(1);

  assert(!!cardData && cardData.length > 0, "Found active student_id_card");
  const testToken = cardData![0].verification_token;

  // 1. Initial QR scan
  const scan1 = await scanQRAttendance({
    schoolId,
    verificationToken: testToken,
    date: testDate,
    status: "present",
  });

  assert(scan1.success === true, `QR Scan 1 successful: ${scan1.message}`);
  assert(!!scan1.student_name, `Scanned student name: ${scan1.student_name}`);
  assert(!!scan1.admission_no, `Scanned student adm: ${scan1.admission_no}`);

  // 2. Duplicate QR scan with same status -> should report already_recorded without error
  const scan2 = await scanQRAttendance({
    schoolId,
    verificationToken: testToken,
    date: testDate,
    status: "present",
  });

  assert(scan2.success === true, "Duplicate QR scan handled gracefully");
  assert(scan2.already_recorded === true, "Duplicate QR scan flags already_recorded=true");

  // 3. QR scan with altered status (e.g. marked Late on re-scan)
  const scan3 = await scanQRAttendance({
    schoolId,
    verificationToken: testToken,
    date: testDate,
    status: "late",
  });

  assert(scan3.success === true, `Re-scan with new status succeeded: ${scan3.message}`);
  assert(scan3.status === "late", "Status updated to late");

  // 4. Invalid QR token
  const invalidScan = await scanQRAttendance({
    schoolId,
    verificationToken: "totally_invalid_non_existent_token_12345",
    date: testDate,
    status: "present",
  });

  assert(invalidScan.success === false, "Invalid QR token correctly rejected");
  assert(invalidScan.code === "INVALID_TOKEN", `Invalid token code: ${invalidScan.code}`);

  // ─── Group 6: Multi-Tenant Isolation & Cross-School Security ──────────────
  console.log("\n--- Group 6: Multi-Tenant Isolation & Cross-School Security ---");

  // School B cannot access School A's records
  const fakeSchoolHistory = await getAttendanceHistory({
    schoolId: fakeSchoolId,
    filters: {
      startDate: testDate,
      endDate: testDate,
    },
  });

  assert(fakeSchoolHistory.records.length === 0, "Fake school cannot access School A records (actual: 0)");
  assert(fakeSchoolHistory.totalCount === 0, "Fake school totalCount is 0");

  // Cross-tenant QR scan: Fake school tries to scan School A's token
  const crossTenantScan = await scanQRAttendance({
    schoolId: fakeSchoolId,
    verificationToken: testToken,
    date: testDate,
  });

  assert(crossTenantScan.success === false, "Cross-tenant QR scan rejected");
  assert(crossTenantScan.code === "INVALID_TOKEN", "Cross-tenant token unrecognized under other school");

  // ─── Group 7: Dashboard Summary & Class-Wise Overview ─────────────────────
  console.log("\n--- Group 7: Dashboard Summary & Overview ---");

  const summary = await getAttendanceDashboardSummary({
    schoolId,
    date: testDate,
    academicYearId,
  });

  assert(summary.total_students > 0, `Total enrolled students count: ${summary.total_students}`);
  assert(summary.sessions_recorded_today >= 1, `Recorded sessions today: ${summary.sessions_recorded_today}`);
  assert(summary.attendance_percentage >= 0 && summary.attendance_percentage <= 100, `Attendance %: ${summary.attendance_percentage}%`);

  const classOverview = await getClassAttendanceOverview({
    schoolId,
    date: testDate,
    academicYearId,
  });

  assert(classOverview.length > 0, `Class overview returned ${classOverview.length} classes`);
  const recordedSession = classOverview.find((c) => c.is_recorded);
  assert(!!recordedSession, `Identified recorded session in overview: ${recordedSession?.class_name}`);

  // ─── Group 8: Daily & Monthly Reports ─────────────────────────────────────
  console.log("\n--- Group 8: Daily & Monthly Reports ---");

  const dailyReport = await getDailyAttendanceReport({
    schoolId,
    date: testDate,
    academicYearId,
  });

  assert(dailyReport.date === testDate, "Daily report has matching date");
  assert(dailyReport.class_summaries.length > 0, "Daily report includes class summaries");

  const monthlyReport = await getMonthlyAttendanceReport({
    schoolId,
    year: 2026,
    month: 11,
    academicYearId,
    classId: testClassId,
  });

  assert(Array.isArray(monthlyReport), "Monthly report returns array of students");
  if (monthlyReport.length > 0) {
    const ms0 = monthlyReport[0];
    assert(!!ms0.student_name, `Monthly student name: ${ms0.student_name}`);
    assert(typeof ms0.percentage === "number", `Monthly attendance %: ${ms0.percentage}%`);
  }

  // ─── Group 9: Attendance Settings ─────────────────────────────────────────
  console.log("\n--- Group 9: Attendance Settings ---");

  const initialSettings = await getAttendanceSettings(schoolId);
  assert(!!initialSettings, "Fetched attendance settings");
  assert(typeof initialSettings.allow_late_marking === "boolean", "Settings has allow_late_marking");

  const updateSettingsRes = await updateAttendanceSettings({
    schoolId,
    settings: {
      default_status: "present",
      allow_late_marking: true,
      late_cutoff_time: "08:45:00",
      prevent_past_edit_days: 45,
    },
  });

  assert(updateSettingsRes.success === true, `Settings updated: ${updateSettingsRes.message}`);

  const refreshedSettings = await getAttendanceSettings(schoolId);
  assert(refreshedSettings.late_cutoff_time === "08:45:00", "Updated late_cutoff_time persisted");
  assert(refreshedSettings.prevent_past_edit_days === 45, "Updated prevent_past_edit_days persisted");

  console.log("\n========================================================");
  console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log("========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
