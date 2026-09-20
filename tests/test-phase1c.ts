/**
 * Phase 1c: Comprehensive Operations Test Suite
 * 
 * Tests:
 * 1. Bulk import: 500 valid rows commit in under 15 seconds (Spec A4.5, A10)
 * 2. Bulk import rollback: allowed ONLY before dependent records exist (Spec A4.5, A10)
 * 3. Promotion: 1,000 students background execution, preview counts equal committed counts (Spec A4.6, A10)
 * 4. 24-hour promotion undo window (Spec A4.6, Decision A4.6)
 * 5. Plan limit enforcement: LIMIT_REACHED on student 801 for Basic on creation and re-admission (Spec 1.5, A10)
 * 6. Student Re-admission: reuses admission number, status -> enrolled, timeline & audit (Spec A5.4, Decision)
 * 7. Masked & audited export: masks Aadhaar, excludes staff notes, writes audit rows (Spec A4.1, A5.8)
 * 8. ID card print sheet data: 86 x 54 mm format, QR payload (Spec A4.10)
 */

import {
  setSchoolPlan,
  getSchoolPlanTier,
  checkSchoolStudentLimit,
  parseAndValidateImportCSV,
  commitImportBatch,
  rollbackImportBatch,
  getPromotionPreview,
  executePromotion,
  undoPromotion,
  changeStudentStatus,
  issueTransferCertificate,
  issueDuplicateTransferCertificate,
  getTransferCertificates,
  reAdmitStudent,
  exportStudentData,
  exportStudentsList,
  getStudentIdCardData,
} from "../src/services/studentOperationsService";
import {
  admitStudentTransactional,
  getStudentProfile,
  logAudit,
} from "../src/services/studentService";
import { feeService } from "../src/services/feeService";
import { transportService } from "../src/services/transportService";
import type {
  AdmissionWizardPayload,
  PromotionConfig,
  Student,
  Parent,
  StudentEnrollment,
} from "../src/types/students";

// In-memory localStorage polyfill for testing
const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (key: string) => store.get(key) || null,
  setItem: (key: string, value: string) => {
    store.set(key, String(value));
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => {
    store.clear();
  },
  key: (index: number) => Array.from(store.keys())[index] || null,
  get length() {
    return store.size;
  },
} as Storage;

const rawLog = console.log;
console.log = (...args: any[]) => {
  if (
    typeof args[0] === "string" &&
    (args[0].startsWith("[StubFeeService]") || args[0].startsWith("[StubTransportService]"))
  ) {
    return;
  }
  rawLog(...args);
};

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

function cleanLocalStorage() {
  if (typeof localStorage !== "undefined") {
    localStorage.clear();
  }
}

function makeStudent(
  id: string,
  schoolId: string,
  firstName: string,
  lastName: string,
  admissionNo: string,
  status: "enrolled" | "inactive" | "withdrawn" | "transferred" | "passed_out" = "enrolled"
): Student {
  const now = new Date().toISOString();
  return {
    id,
    school_id: schoolId,
    admission_no: admissionNo,
    first_name: firstName,
    last_name: lastName,
    dob: "2015-01-01",
    gender: "male",
    nationality: "Indian",
    category: "general",
    is_rte: false,
    admission_date: "2026-04-01",
    admission_type: "new",
    status,
    deleted_at: null,
    created_at: now,
    updated_at: now,
  };
}

async function runPhase1cTests() {
  console.log("==========================================================");
  console.log("MYZKOOL PHASE 1c: STUDENT OPERATIONS TEST SUITE");
  console.log("==========================================================\n");

  cleanLocalStorage();
  const schoolId = "school-phase1c-test";
  const actorId = "user-admin-1";

  // -------------------------------------------------------------------------
  // 1. Bulk Import 500 Rows Under 15 Seconds (Spec A4.5, A10)
  // -------------------------------------------------------------------------
  console.log("1. Bulk Import: 500 rows committed in under 15 seconds (Spec A4.5, A10):");
  await setSchoolPlan(schoolId, "Pro"); // Up to 1,800 students

  // Generate 500 valid rows CSV
  const csvHeaders = "First Name,Last Name,Date of Birth,Gender,Class,Section,Father Name,Father Phone,Mother Name,Mother Phone";
  const rows: string[] = [csvHeaders];
  for (let i = 1; i <= 500; i++) {
    const classNum = (i % 5) + 1;
    // Sibling test: every 10th student shares parent phone with previous student
    const phone = i % 10 === 0 ? `9811${String(i - 1).padStart(6, "0")}` : `9811${String(i).padStart(6, "0")}`;
    rows.push(`Student${i},TestFamily,2015-06-15,male,Class ${classNum},Section A,Father${i},${phone},Mother${i},9822${String(i).padStart(6, "0")}`);
  }
  const csvContent = rows.join("\n");

  // Validate CSV
  const valStart = Date.now();
  const validation = await parseAndValidateImportCSV(schoolId, csvContent);
  const valDuration = (Date.now() - valStart) / 1000;

  assert(validation.total_rows === 500, `Validated 500 rows in ${valDuration.toFixed(3)}s`);
  assert(validation.valid_rows_count === 500, "All 500 rows are valid");
  assert(validation.invalid_rows_count === 0, "Zero validation errors");

  // Commit batch and measure time
  const commitStart = Date.now();
  const commitRes = await commitImportBatch(schoolId, actorId, "students_500.csv", validation.rows);
  const commitDuration = (Date.now() - commitStart) / 1000;

  assert(commitRes.status === "committed", "500-row batch committed successfully");
  assert(commitRes.created_rows === 500, "500 students imported");
  assert(commitDuration < 15, `500-row commit took ${commitDuration.toFixed(3)}s (Requirement: < 15 seconds)`);

  const batch500Id = commitRes.batch_id;

  // -------------------------------------------------------------------------
  // 2. Rollback Allowed ONLY Before Dependent Records Exist (Spec A4.5, A10)
  // -------------------------------------------------------------------------
  console.log("\n2. Rollback Rules: Allowed ONLY before dependent records exist (Spec A4.5, A10):");

  // Test 2a: Clean batch without dependent records rolls back successfully
  const rbRes = await rollbackImportBatch(schoolId, batch500Id, actorId);
  assert(rbRes.success === true, "Clean batch rolls back successfully");
  assert(rbRes.rolled_back_count === 500, "All 500 students soft-deleted on rollback");

  // Verify soft-delete
  const sRaw = localStorage.getItem(`myzkool_students_${schoolId}`);
  const sList: Student[] = sRaw ? JSON.parse(sRaw) : [];
  const allDeleted = sList.slice(0, 500).every((s) => s.deleted_at !== null);
  assert(allDeleted, "All 500 students have deleted_at timestamp set");

  // Helper to create small test batch
  async function createSmallBatch(batchSuffix: string) {
    const numStr = batchSuffix.replace(/\D/g, "").padEnd(6, "0").slice(0, 6);
    const smallCSV = [
      csvHeaders,
      `DepStd1_${batchSuffix},DepTest,2015-01-01,male,Class 1,Section A,DepFather1,9991${numStr},DepMother1,9992${numStr}`,
      `DepStd2_${batchSuffix},DepTest,2015-01-01,female,Class 1,Section A,DepFather2,9993${numStr},DepMother2,9994${numStr}`,
    ].join("\n");
    const smallVal = await parseAndValidateImportCSV(schoolId, smallCSV);
    return commitImportBatch(schoolId, actorId, `batch_${batchSuffix}.csv`, smallVal.rows);
  }

  // Test 2b: Batch with student that has fee balance
  const feeBatch = await createSmallBatch("1001");
  assert(feeBatch.created_rows === 2, "Fee test batch committed with 2 students");

  const originalGetBalance = feeService.getStudentBalance;
  feeService.getStudentBalance = async (sid: string) => {
    if (sid === feeBatch.created_student_ids[0]) return { balance: 500000 }; // 5000 Rs dues
    return { balance: 0 };
  };

  let feeBlocked = false;
  try {
    await rollbackImportBatch(schoolId, feeBatch.batch_id, actorId);
  } catch (e: any) {
    feeBlocked = true;
    assert(e.message.includes("fee") || e.message.includes("receipt"), `Rollback blocked when student has fee balance: "${e.message}"`);
  }
  assert(feeBlocked, "Rollback strictly BLOCKED when dependent fee record exists");
  feeService.getStudentBalance = originalGetBalance;

  // Test 2c: Batch with student that has transport assignment
  const transBatch = await createSmallBatch("2002");
  assert(transBatch.created_rows === 2, "Transport test batch committed with 2 students");

  const originalGetTransport = transportService.getStudentTransport;
  transportService.getStudentTransport = async (sid: string) => {
    if (sid === transBatch.created_student_ids[0]) {
      return { assignment: { id: "trans-assign-1", route_id: "route-1" } } as any;
    }
    return { assignment: null };
  };

  let transportBlocked = false;
  try {
    await rollbackImportBatch(schoolId, transBatch.batch_id, actorId);
  } catch (e: any) {
    transportBlocked = true;
    assert(e.message.includes("transport"), `Rollback blocked when student has transport assignment: "${e.message}"`);
  }
  assert(transportBlocked, "Rollback strictly BLOCKED when dependent transport record exists");
  transportService.getStudentTransport = originalGetTransport;

  // Test 2d: Batch with student that had post-import edits
  const editBatch = await createSmallBatch("3003");
  assert(editBatch.created_rows === 2, "Edit test batch committed with 2 students");

  const allCurrentStudents: Student[] = JSON.parse(localStorage.getItem(`myzkool_students_${schoolId}`) || "[]");
  const targetStd = allCurrentStudents.find((s) => s.id === editBatch.created_student_ids[0]);
  if (targetStd) {
    targetStd.updated_at = new Date(Date.now() + 60000).toISOString(); // 1 min later
    localStorage.setItem(`myzkool_students_${schoolId}`, JSON.stringify(allCurrentStudents));
  }

  let editBlocked = false;
  try {
    await rollbackImportBatch(schoolId, editBatch.batch_id, actorId);
  } catch (e: any) {
    editBlocked = true;
    assert(e.message.includes("modification") || e.message.includes("modified") || e.message.includes("edit"), `Rollback blocked when student has later edits: "${e.message}"`);
  }
  assert(editBlocked, "Rollback strictly BLOCKED when student was modified after import");

  // -------------------------------------------------------------------------
  // 3. Promotion of 1,000 Students: Preview Equals Commit (Spec A4.6, A10)
  // -------------------------------------------------------------------------
  console.log("\n3. Promotion Pipeline: 1,000 students preview equals commit (Spec A4.6, A10):");

  cleanLocalStorage();
  const promoSchoolId = "school-promo-1000";
  await setSchoolPlan(promoSchoolId, "Pro");

  // Create 1,000 active students and enrollments in fromYear (ay-2025)
  const promoStudents: Student[] = [];
  const promoEnrollments: StudentEnrollment[] = [];
  const nowStr = new Date().toISOString();

  // Distribute across classes:
  // Class 1: 300 students
  // Class 2: 300 students
  // Class 3: 200 students
  // Class 4: 200 students (Class 4 is highest -> maps to "Passed Out")
  for (let i = 1; i <= 1000; i++) {
    const sId = `promo-${i}`;
    let classId = "Class 1";
    if (i > 300 && i <= 600) classId = "Class 2";
    else if (i > 600 && i <= 800) classId = "Class 3";
    else if (i > 800) classId = "Class 4";

    promoStudents.push(makeStudent(sId, promoSchoolId, `Student${i}`, "Promoted", `ADM-PROMO-${i}`));
    promoEnrollments.push({
      id: `enr-${i}`,
      school_id: promoSchoolId,
      student_id: sId,
      academic_year_id: "ay-2025",
      class_id: classId,
      section_id: "sec-a",
      roll_no: String((i % 50) + 1),
      status: "active",
      enrolled_on: "2025-04-01",
      created_at: nowStr,
      updated_at: nowStr,
    });
  }

  localStorage.setItem(`myzkool_students_${promoSchoolId}`, JSON.stringify(promoStudents));
  localStorage.setItem(`myzkool_student_enrollments_${promoSchoolId}`, JSON.stringify(promoEnrollments));

  // Configure promotion with overrides:
  // Detain 20 students in Class 1
  // Leave 10 students in Class 2
  const overrides: Record<string, { action: "promote" | "detain" | "leave" | "pass_out" }> = {};
  for (let i = 1; i <= 20; i++) {
    overrides[`promo-${i}`] = { action: "detain" };
  }
  for (let i = 301; i <= 310; i++) {
    overrides[`promo-${i}`] = { action: "leave" };
  }

  const promoConfig: PromotionConfig = {
    from_year_id: "ay-2025",
    to_year_id: "ay-2026",
    section_distribution: "keep_letter",
    overrides,
  };

  // Run Preview
  const previewStart = Date.now();
  const preview = await getPromotionPreview(promoSchoolId, "ay-2025", "ay-2026", promoConfig);
  const previewDuration = (Date.now() - previewStart) / 1000;

  assert(preview.total_eligible === 1000, `Preview processed 1,000 eligible students in ${previewDuration.toFixed(3)}s`);
  assert(preview.detain_count === 20, "Preview recorded 20 detained overrides");
  assert(preview.leave_count === 10, "Preview recorded 10 leave overrides");
  assert(preview.pass_out_count === 200, "Preview mapped 200 Class 4 students to Passed Out");
  assert(preview.promote_count === (1000 - 20 - 10 - 200), `Preview calculated ${preview.promote_count} students to promote`);

  // Run Commit
  const promoExecStart = Date.now();
  const promoResult = await executePromotion(promoSchoolId, actorId, promoConfig);
  const promoExecDuration = (Date.now() - promoExecStart) / 1000;

  assert(Boolean(promoResult.batch_id), `Promotion of 1,000 students executed in ${promoExecDuration.toFixed(3)}s`);
  assert(promoResult.total_processed === preview.total_eligible, "Total processed equals preview count (1,000)");
  assert(promoResult.promoted_count === preview.promote_count, `Promoted count (${promoResult.promoted_count}) exactly equals preview (${preview.promote_count})`);
  assert(promoResult.detained_count === preview.detain_count, `Detained count (${promoResult.detained_count}) exactly equals preview (${preview.detain_count})`);
  assert(promoResult.passed_out_count === preview.pass_out_count, `Passed out count (${promoResult.passed_out_count}) exactly equals preview (${preview.pass_out_count})`);
  assert(promoResult.left_count === preview.leave_count, `Leave count (${promoResult.left_count}) exactly equals preview (${preview.leave_count})`);

  // -------------------------------------------------------------------------
  // 4. Promotion 24-Hour Undo Window (Spec A4.6, Decision A4.6)
  // -------------------------------------------------------------------------
  console.log("\n4. Promotion 24-Hour Undo Window (Spec A4.6, Decision):");

  const undoRes = await undoPromotion(promoSchoolId, promoResult.batch_id, actorId);
  assert(undoRes.success === true, "Undo promotion succeeded within 24-hour window");

  const restoredEnrollments: StudentEnrollment[] = JSON.parse(
    localStorage.getItem(`myzkool_student_enrollments_${promoSchoolId}`) || "[]"
  );
  const newYearEnrCount = restoredEnrollments.filter((e) => e.academic_year_id === "ay-2026").length;
  assert(newYearEnrCount === 0, "Target year (ay-2026) enrollments completely removed on undo");

  const oldYearActive = restoredEnrollments.filter((e) => e.academic_year_id === "ay-2025" && e.status === "active").length;
  assert(oldYearActive === 1000, "All 1,000 students in ay-2025 restored to 'active' status");

  // -------------------------------------------------------------------------
  // 5. Plan Limit Enforcement: LIMIT_REACHED on Student 801 for Basic (Spec 1.5, A10)
  // -------------------------------------------------------------------------
  console.log("\n5. Plan Limit Enforcement: LIMIT_REACHED on student 801 for Basic (Spec 1.5, A10):");

  cleanLocalStorage();
  const limitSchoolId = "school-limit-test";
  await setSchoolPlan(limitSchoolId, "Basic"); // Max 800

  // Populate exactly 800 enrolled students
  const limitStudents: Student[] = [];
  for (let i = 1; i <= 800; i++) {
    limitStudents.push(makeStudent(`s-${i}`, limitSchoolId, `Student${i}`, "Limit", `ADM-LIM-${i}`, "enrolled"));
  }
  localStorage.setItem(`myzkool_students_${limitSchoolId}`, JSON.stringify(limitStudents));

  const limitStatus = await checkSchoolStudentLimit(limitSchoolId);
  assert(limitStatus.active_count === 800, "Active student count is 800");
  assert(limitStatus.max_allowed === 800, "Max allowed on Basic is 800");
  assert(limitStatus.is_blocked === true, "is_blocked is true at 800 students");
  assert(limitStatus.is_warning === true, "is_warning is true (>= 720)");

  // Attempt creation of student 801 via admitStudentTransactional
  let create801Blocked = false;
  try {
    const dummyPayload: AdmissionWizardPayload = {
      step1_basic: { first_name: "Student", last_name: "801", dob: "2015-01-01", gender: "male" },
      step2_guardian: {
        father: { full_name: "Father", phone: "9876500801", relation: "father" },
        current_address: { kind: "current", line1: "123", city: "City", district: "Dist", state: "State", pin: "123456" },
      },
      step3_academic: { academic_year_id: "ay-2026", admission_date: "2026-04-01", class_id: "Class 1", admission_type: "new", is_rte: false },
      step4_documents: [],
    };
    const admitRes = await admitStudentTransactional(limitSchoolId, dummyPayload, actorId, "admin");
    if (admitRes.error && admitRes.error.includes("LIMIT_REACHED")) {
      create801Blocked = true;
    }
  } catch (err: any) {
    if (err.message.includes("LIMIT_REACHED")) {
      create801Blocked = true;
    }
  }
  assert(create801Blocked, "Creation of student 801 on Basic is strictly blocked with LIMIT_REACHED");

  // Attempt re-admission at 800 cap
  // Add an inactive student to the database
  const inactiveStudent = makeStudent("s-inactive-1", limitSchoolId, "Inactive", "Student", "ADM-INACT-001", "withdrawn");
  limitStudents.push(inactiveStudent);
  localStorage.setItem(`myzkool_students_${limitSchoolId}`, JSON.stringify(limitStudents));

  let readmit801Blocked = false;
  try {
    await reAdmitStudent(limitSchoolId, inactiveStudent.id, actorId, {
      academic_year_id: "ay-2026",
      class_id: "Class 2",
      admission_date: "2026-04-10",
      reason: "Family returned",
    });
  } catch (err: any) {
    readmit801Blocked = true;
    assert(err.message.includes("LIMIT_REACHED"), `Re-admission at 800 cap throws LIMIT_REACHED: "${err.message}"`);
  }
  assert(readmit801Blocked, "Re-admission at 800 cap on Basic is strictly blocked with LIMIT_REACHED");

  // Upgrade to Pro plan (up to 1,800)
  await setSchoolPlan(limitSchoolId, "Pro");
  const proLimitStatus = await checkSchoolStudentLimit(limitSchoolId);
  assert(proLimitStatus.plan_tier === "Pro", "Upgraded plan tier is Pro");
  assert(proLimitStatus.max_allowed === 1800, "Pro tier allows up to 1,800 active students");
  assert(proLimitStatus.is_blocked === false, "Pro tier with 800 students is not blocked");

  // Re-admission now succeeds!
  const readmitSuccess = await reAdmitStudent(limitSchoolId, inactiveStudent.id, actorId, {
    academic_year_id: "ay-2026",
    class_id: "Class 2",
    admission_date: "2026-04-10",
    reason: "Family returned after upgrade",
  });
  assert(readmitSuccess.success === true, "Re-admission succeeds after upgrading to Pro");
  assert(readmitSuccess.student.status === "enrolled", "Re-admitted student status is 'enrolled'");
  assert(readmitSuccess.student.admission_no === "ADM-INACT-001", "Re-admission reuses original admission number");
  assert(readmitSuccess.enrollment.class_id === "Class 2", "New enrollment created for Class 2");

  // -------------------------------------------------------------------------
  // 6. Student Re-admission Detailed Rules (Spec A5.4, Decision)
  // -------------------------------------------------------------------------
  console.log("\n6. Student Re-admission Rules (Spec A5.4, Decision):");

  // Re-admitting an already enrolled student fails
  let alreadyEnrolledBlocked = false;
  try {
    await reAdmitStudent(limitSchoolId, inactiveStudent.id, actorId, {
      academic_year_id: "ay-2026",
      class_id: "Class 3",
      admission_date: "2026-04-15",
    });
  } catch (err: any) {
    alreadyEnrolledBlocked = true;
    assert(err.message.includes("already active/enrolled"), `Already enrolled student blocked from re-admission: "${err.message}"`);
  }
  assert(alreadyEnrolledBlocked, "Cannot re-admit an already enrolled student");

  // Check timeline events and audit trail
  const eventsKey = `myzkool_student_events_${limitSchoolId}`;
  const events = JSON.parse(localStorage.getItem(eventsKey) || "[]");
  const readmitEvent = events.find((e: any) => e.student_id === inactiveStudent.id && e.kind === "readmitted");
  assert(Boolean(readmitEvent), "Timeline event recorded with kind: 'readmitted'");

  const auditKey = `myzkool_audit_logs_${limitSchoolId}`;
  const auditLogs = JSON.parse(localStorage.getItem(auditKey) || "[]");
  const readmitAudit = auditLogs.find((a: any) => a.entity_id === inactiveStudent.id && a.action === "student_readmitted");
  assert(Boolean(readmitAudit), "Audit log row recorded with action: 'student_readmitted'");
  assert(readmitAudit.before.status === "withdrawn", "Audit log records previous status: 'withdrawn'");
  assert(readmitAudit.after.status === "enrolled", "Audit log records new status: 'enrolled'");

  // -------------------------------------------------------------------------
  // 7. Masked & Audited Student Export (Spec A4.1, A5.8)
  // -------------------------------------------------------------------------
  console.log("\n7. Masked & Audited Export (Spec A4.1, A5.8):");

  // Single student export
  const exportProfile = await exportStudentData(limitSchoolId, inactiveStudent.id, actorId);
  assert(exportProfile.admission_no === "ADM-INACT-001", "Export returns student profile");
  assert(exportProfile.masked_aadhaar === null || exportProfile.masked_aadhaar.includes("****"), "Aadhaar is masked, never raw number or hash");
  assert((exportProfile as any).aadhaar_enc === undefined, "Encrypted Aadhaar bytes omitted from export");
  assert((exportProfile as any).aadhaar_hash === undefined, "Aadhaar hash omitted from export");
  assert((exportProfile as any).staff_notes === undefined, "Staff notes excluded from student export");

  // Check single export audit row
  const updatedAuditLogs = JSON.parse(localStorage.getItem(auditKey) || "[]");
  const exportAudit = updatedAuditLogs.find((a: any) => a.entity_id === inactiveStudent.id && a.action === "student_exported");
  assert(Boolean(exportAudit), "Audit row logged for student export (Spec A5.8)");

  // Bulk CSV export
  const bulkExport = await exportStudentsList(limitSchoolId, actorId, { status: "enrolled" });
  assert(bulkExport.count > 0, `Bulk export generated ${bulkExport.count} student rows`);
  assert(bulkExport.csv.includes("Admission No,First Name,Middle Name,Last Name"), "CSV contains standard headers");
  assert(bulkExport.csv.includes("Aadhaar (Masked)"), "CSV contains masked Aadhaar header");
  assert(bulkExport.filename.endsWith(".csv"), `Filename formatted correctly: ${bulkExport.filename}`);

  const finalAuditLogs = JSON.parse(localStorage.getItem(auditKey) || "[]");
  const bulkAudit = finalAuditLogs.find((a: any) => a.action === "students_bulk_exported");
  assert(Boolean(bulkAudit), "Audit row logged for bulk students export");

  // -------------------------------------------------------------------------
  // 8. ID Card Print Sheet Data (Spec A4.10)
  // -------------------------------------------------------------------------
  console.log("\n8. ID Card Print Sheet Data (Spec A4.10):");

  const idCards = await getStudentIdCardData(limitSchoolId, { studentId: inactiveStudent.id });
  assert(idCards.length === 1, "ID card data retrieved for student");
  const card = idCards[0];
  assert(card.admission_no === "ADM-INACT-001", "Card displays admission number");
  assert(card.full_name === "Inactive Student", "Card displays student full name");
  assert(card.class_name === "Class 2", "Card displays enrolled class");
  assert(card.qr_payload.startsWith("MYZKOOL:STUDENT:"), `Card QR payload encoded: ${card.qr_payload}`);

  // Summary
  console.log("\n----------------------------------------------------------");
  console.log(`PHASE 1c TEST SUMMARY: ${passed} Passed, ${failed} Failed.`);
  console.log("----------------------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase1cTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
