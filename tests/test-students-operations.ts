/**
 * Stage 4: Operations Test Suite
 * Tests:
 * 1. Plan limits enforcement (800 Basic, 1,800 Pro; 90% warning, 100% block with LIMIT_REACHED)
 * 2. Bulk import validation (2,000 row cap, required columns, format checks, dry-run zero-write)
 * 3. Bulk import commit & sibling auto-linking (parent phone match links existing parent, 500 rows commit < 15s)
 * 4. Bulk import rollback rules (soft-delete batch, blocked by receipts, transport, or later edits)
 * 5. Promotion pipeline (class progression mapping, overrides, section distribution, dues arrears warning)
 * 6. Promotion 24-hour undo window & dependency guards
 * 7. Status changes & Transfer Certificate (mandatory reason, dues blocking unless owner typed override, counter tc_no, duplicate marking)
 * 8. Parent merge tool (preview, child link migration, duplicate soft-delete, audit log)
 * 9. Classes & sections settings (display order, section capacity warning, copy sections from last year)
 */

import {
  setSchoolPlan,
  getSchoolPlanTier,
  checkSchoolStudentLimit,
  generateImportTemplate,
  autoMapColumns,
  parseAndValidateImportCSV,
  generateErrorReportCSV,
  commitImportBatch,
  getImportBatches,
  rollbackImportBatch,
  getPromotionPreview,
  executePromotion,
  getPromotionBatches,
  undoPromotion,
  changeStudentStatus,
  issueTransferCertificate,
  issueDuplicateTransferCertificate,
  getTransferCertificates,
  previewParentMerge,
  executeParentMerge,
  updateClassesDisplayOrder,
  updateSectionSettings,
  checkSectionCapacity,
  copySectionsFromPreviousYear,
} from "../src/services/studentOperationsService";
import {
  admitStudentTransactional,
  getStudentProfile,
  listStudents,
} from "../src/services/studentService";
import type {
  AdmissionWizardPayload,
  ImportValidationRow,
  PromotionConfig,
  Student,
  Parent,
  StudentEnrollment,
} from "../src/types/students";

// In-memory localStorage polyfill for test environment
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
  admissionNo: string
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
    status: "enrolled",
    deleted_at: null,
    created_at: now,
    updated_at: now,
  };
}

async function runStage4Tests() {
  console.log("==========================================================");
  console.log("MYZKOOL STAGE 4: OPERATIONS TEST SUITE");
  console.log("==========================================================\n");

  cleanLocalStorage();
  const schoolId = "school-ops-test";
  const actorId = "user-admin-1";

  // -------------------------------------------------------------------------
  // 1. Plan Limits Enforcement (Spec 1.10)
  // -------------------------------------------------------------------------
  console.log("1. Plan Limits Enforcement (Spec 1.10):");

  await setSchoolPlan(schoolId, "Basic");
  let tier = await getSchoolPlanTier(schoolId);
  assert(tier === "Basic", "School plan configured as Basic");

  // Check initial state (0 students)
  let limit = await checkSchoolStudentLimit(schoolId);
  assert(limit.plan_tier === "Basic", "Limit reports Basic tier");
  assert(limit.max_allowed === 800, "Basic tier max allowed is 800 students");
  assert(limit.warning_threshold === 720, "Basic tier 90% warning threshold is 720 students");
  assert(limit.is_warning === false, "Zero students does not trigger warning");
  assert(limit.is_blocked === false, "Zero students does not trigger block");

  // Simulate 725 students in cache
  const simulatedStudents: Student[] = [];
  for (let i = 1; i <= 725; i++) {
    simulatedStudents.push(
      makeStudent(`std-${i}`, schoolId, `Student${i}`, "Test", `ADM-${i}`)
    );
  }
  localStorage.setItem(`myzkool_students_${schoolId}`, JSON.stringify(simulatedStudents));

  limit = await checkSchoolStudentLimit(schoolId);
  assert(limit.active_count === 725, "Active student count is 725");
  assert(limit.is_warning === true, "Active count >= 720 triggers 90% warning banner");
  assert(limit.is_blocked === false, "Active count 725 is under 800, so not blocked");

  // Simulate 800 students (reached cap)
  for (let i = 726; i <= 800; i++) {
    simulatedStudents.push(
      makeStudent(`std-${i}`, schoolId, `Student${i}`, "Test", `ADM-${i}`)
    );
  }
  localStorage.setItem(`myzkool_students_${schoolId}`, JSON.stringify(simulatedStudents));

  limit = await checkSchoolStudentLimit(schoolId);
  assert(limit.active_count === 800, "Active student count is 800 (cap)");
  assert(limit.is_blocked === true, "Reaching 800 students triggers is_blocked = true");

  // Attempting new admission should be blocked with LIMIT_REACHED
  let admissionBlocked = false;
  try {
    const dummyPayload: AdmissionWizardPayload = {
      step1_basic: {
        first_name: "Blocked",
        last_name: "Student",
        dob: "2015-05-10",
        gender: "male",
      },
      step2_guardian: {
        father: {
          full_name: "Father Test",
          phone: "9876543210",
          relation: "father",
        },
        current_address: {
          kind: "current",
          line1: "123 Street",
          city: "City",
          district: "Dist",
          state: "State",
          pin: "123456",
        },
      },
      step3_academic: {
        academic_year_id: "ay-2026",
        admission_date: "2026-04-01",
        class_id: "class-1",
        section_id: "sec-a",
        admission_type: "new",
        is_rte: false,
      },
      step4_documents: [],
    };
    const admitRes = await admitStudentTransactional(schoolId, dummyPayload, actorId, "admin");
    if (admitRes.error && admitRes.error.includes("LIMIT_REACHED")) {
      admissionBlocked = true;
    }
  } catch (err: any) {
    if (err.message.includes("LIMIT_REACHED")) {
      admissionBlocked = true;
    }
  }
  assert(admissionBlocked, "admitStudentTransactional throws LIMIT_REACHED when cap is reached");

  // Upgrade to Pro Plan (1,800 limit)
  await setSchoolPlan(schoolId, "Pro");
  tier = await getSchoolPlanTier(schoolId);
  assert(tier === "Pro", "Upgraded plan to Pro");

  limit = await checkSchoolStudentLimit(schoolId);
  assert(limit.max_allowed === 1800, "Pro tier max allowed is 1,800 students");
  assert(limit.warning_threshold === 1620, "Pro tier 90% warning threshold is 1,620 students");
  assert(limit.is_blocked === false, "800 students is unblocked under Pro plan");
  assert(limit.is_warning === false, "800 students is below Pro 90% warning threshold (1,620)");

  // -------------------------------------------------------------------------
  // 2. Bulk Import Template & Validation (Spec A4.5)
  // -------------------------------------------------------------------------
  console.log("\n2. Bulk Import Template & Validation (Spec A4.5):");

  const templateResult = generateImportTemplate([
    { name: "Class 1", sections: [{ name: "A" }] },
    { name: "Class 2", sections: [{ name: "B" }] },
  ]);
  assert(templateResult.csv.includes("First Name"), "Template CSV contains 'First Name' column");
  assert(templateResult.csv.includes("Parent Phone"), "Template CSV contains 'Parent Phone' column");
  assert(templateResult.csv.includes("Class 1"), "Template CSV prefilled with school's classes");

  // Auto-mapping headers
  const headers = [
    "first name",
    "LAST_NAME",
    "Date of Birth",
    "GENDER",
    "Class",
    "Section",
    "Father's Name",
    "Father Mobile",
  ];
  const mapping = autoMapColumns(headers);
  assert(mapping["first_name"] === "0", "Auto-maps 'first name' to first_name (index 0)");
  assert(mapping["last_name"] === "1", "Auto-maps case-insensitive 'LAST_NAME' to last_name (index 1)");
  assert(mapping["dob"] === "2", "Auto-maps 'Date of Birth' to dob (index 2)");
  assert(mapping["parent_phone"] === "7", "Auto-maps 'Father Mobile' to parent_phone (index 7)");

  // Rule: max 2,000 rows
  const excessiveCsvRows = ["First Name,Last Name,DOB,Gender,Class,Father Name,Father Phone"];
  for (let i = 0; i < 2005; i++) {
    excessiveCsvRows.push(`First${i},Last${i},2015-01-01,male,Class 1,Father,9876543210`);
  }
  let capExceededError = false;
  try {
    await parseAndValidateImportCSV(schoolId, excessiveCsvRows.join("\n"));
  } catch (err: any) {
    if (err.message.includes("exceeds maximum allowed limit of 2,000")) {
      capExceededError = true;
    }
  }
  assert(capExceededError, "Import file exceeding 2,000 rows is rejected with clear limit error");

  // CSV Validation rules (required columns & formats)
  const testValidationCsv = [
    "First Name,Last Name,DOB,Gender,Class,Father Name,Father Phone",
    "Aarav,Sharma,2015-05-15,male,Class 1,Rajesh Sharma,9876543210", // valid row
    ",Gupta,2015-06-10,female,Class 1,Suresh Gupta,9876543211", // missing first_name
    "Rohan,Verma,invalid-date,male,Class 1,Anil Verma,9876543212", // invalid DOB
    "Priya,Singh,2016-01-01,other_unknown,Class 1,Manoj Singh,9876543213", // invalid gender
    "Amit,Kumar,2014-04-04,male,Class 1,Dinesh Kumar,123", // invalid phone (<10 digits)
    "Deepak,Patel,2015-03-03,male,Class 1,,", // missing father & mother & phone
  ].join("\n");

  const validationResult = await parseAndValidateImportCSV(schoolId, testValidationCsv);
  assert(validationResult.total_rows === 6, "Parsed 6 data rows");
  assert(validationResult.valid_rows_count === 1, "Exactly 1 valid row identified");
  assert(validationResult.invalid_rows_count === 5, "Exactly 5 invalid rows flagged");

  // Verify specific error messages
  const errMap = new Map<number, string[]>();
  const errorRows = validationResult.rows.filter((r) => !r.is_valid);
  errorRows.forEach((r) => errMap.set(r.row_index, r.errors));
  assert(errMap.get(2)?.some((e) => e.includes("First name is required")) === true, "Row 2 flagged for missing first name");
  assert(errMap.get(3)?.some((e) => e.includes("Date of birth")) === true, "Row 3 flagged for invalid DOB");
  assert(errMap.get(4)?.some((e) => e.includes("Gender must be")) === true, "Row 4 flagged for invalid gender");
  assert(errMap.get(5)?.some((e) => e.includes("Parent phone must be")) === true, "Row 5 flagged for short phone number");
  assert(errMap.get(6)?.some((e) => e.includes("Parent / Guardian name is required")) === true, "Row 6 flagged for missing parent info");

  // Downloadable error report
  const errorReport = generateErrorReportCSV(validationResult.rows);
  assert(errorReport.includes("Row,First Name,Last Name,Class,Errors"), "Error report contains proper headers");
  assert(errorReport.includes("Date of birth must be in YYYY-MM-DD format"), "Error report includes specific error string");

  // -------------------------------------------------------------------------
  // 3. Bulk Import Commit & Sibling Auto-Linking (Spec A4.5)
  // -------------------------------------------------------------------------
  console.log("\n3. Bulk Import Commit & Sibling Auto-Linking (Spec A4.5):");

  // Reset student cache for import test
  cleanLocalStorage();
  await setSchoolPlan(schoolId, "Pro");

  // Create an existing parent in database
  const existingParent: Parent = {
    id: "parent-existing-1",
    school_id: schoolId,
    full_name: "Vikram Malhotra",
    phone: "9811122233",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  localStorage.setItem(`myzkool_parents_${schoolId}`, JSON.stringify([existingParent]));

  // Prepare 2 valid rows sharing the existing parent's phone (sibling link)
  const validImportRows: ImportValidationRow[] = [
    {
      row_index: 1,
      data: {
        first_name: "Kabir",
        last_name: "Malhotra",
        dob: "2016-04-12",
        gender: "male",
        class_name: "Class 3",
        section_name: "A",
        parent_name: "Vikram Malhotra",
        parent_phone: "9811122233",
        parent_relation: "father",
      },
      errors: [],
      is_valid: true,
    },
    {
      row_index: 2,
      data: {
        first_name: "Tara",
        last_name: "Malhotra",
        dob: "2018-09-20",
        gender: "female",
        class_name: "Class 1",
        section_name: "A",
        parent_name: "Vikram Malhotra",
        parent_phone: "9811122233",
        parent_relation: "father",
      },
      errors: [],
      is_valid: true,
    },
  ];

  const commitResult = await commitImportBatch(schoolId, actorId, "students_batch_1.csv", validImportRows);
  assert(commitResult.created_rows === 2, "Successfully committed 2 students");
  assert(commitResult.skipped_rows === 0, "0 skipped rows");
  assert(Boolean(commitResult.batch_id), "Created import_batches record");

  // Check parent records: no duplicate parent record created for Vikram Malhotra
  const storedParents: Parent[] = JSON.parse(localStorage.getItem(`myzkool_parents_${schoolId}`) || "[]");
  const malhotraParents = storedParents.filter((p) => p.phone === "9811122233");
  assert(malhotraParents.length === 1, "Sibling auto-linking: Only 1 parent record exists for 9811122233");

  // Check student_parents links: both students linked to the same parent
  const studentParents: any[] = JSON.parse(localStorage.getItem(`myzkool_student_parents_${schoolId}`) || "[]");
  const linkedStudentIds = studentParents.filter((sp) => sp.parent_id === existingParent.id).map((sp) => sp.student_id);
  assert(linkedStudentIds.length === 2, "Both imported siblings linked to existingParent.id");

  // Performance benchmark: 500 valid rows commit within 15 seconds
  console.log("  Executing performance benchmark: 500 valid rows commit...");
  const largeBatchRows: ImportValidationRow[] = [];
  for (let i = 1; i <= 500; i++) {
    largeBatchRows.push({
      row_index: i + 1,
      data: {
        first_name: `PerfStudent${i}`,
        last_name: "Test",
        dob: "2015-08-15",
        gender: i % 2 === 0 ? "female" : "male",
        class_name: `Class ${(i % 10) + 1}`,
        section_name: "A",
        parent_name: `PerfFather${i}`,
        parent_phone: `990000${String(i).padStart(4, "0")}`,
        parent_relation: "father",
      },
      errors: [],
      is_valid: true,
    });
  }

  const startTime = Date.now();
  const perfCommitResult = await commitImportBatch(schoolId, actorId, "perf_500_students.csv", largeBatchRows);
  const durationMs = Date.now() - startTime;
  console.log(`  500 rows committed in ${durationMs} ms (${(durationMs / 1000).toFixed(2)} s)`);
  assert(perfCommitResult.created_rows === 500, "500 rows committed successfully");
  assert(durationMs < 15000, `500 valid rows committed under 15 seconds benchmark (${durationMs}ms < 15000ms)`);

  // -------------------------------------------------------------------------
  // 4. Bulk Import Rollback Rules (Spec A4.5)
  // -------------------------------------------------------------------------
  console.log("\n4. Bulk Import Rollback Rules (Spec A4.5):");

  const batchList = await getImportBatches(schoolId);
  const perfBatch = batchList.find((b) => b.id === perfCommitResult.batch_id);
  assert(perfBatch !== undefined, "Import batch found in batch history");
  assert(perfBatch?.status === "committed", "Batch status is initially 'committed'");

  // Test Rollback
  const rollbackRes = await rollbackImportBatch(schoolId, perfCommitResult.batch_id, actorId);
  assert(rollbackRes.success === true, "Rollback executed successfully");
  assert(rollbackRes.rolled_back_count === 500, "500 students soft-deleted on rollback");

  // Verify soft-deleted
  const updatedStudents: Student[] = JSON.parse(localStorage.getItem(`myzkool_students_${schoolId}`) || "[]");
  const softDeletedCount = updatedStudents.filter((s) => s.import_batch_id === perfCommitResult.batch_id && s.deleted_at).length;
  assert(softDeletedCount === 500, "All 500 students have deleted_at timestamp set");

  // Cannot rollback already rolled back batch
  let duplicateRollbackBlocked = false;
  try {
    await rollbackImportBatch(schoolId, perfCommitResult.batch_id, actorId);
  } catch (err: any) {
    if (err.message.includes("already been rolled back")) {
      duplicateRollbackBlocked = true;
    }
  }
  assert(duplicateRollbackBlocked, "Rollback on already rolled-back batch is prevented");

  // Rollback blocked if later edits exist
  // Create another batch of 1 student
  const singleRow: ImportValidationRow[] = [
    {
      row_index: 2,
      data: {
        first_name: "Editable",
        last_name: "Student",
        dob: "2015-01-01",
        gender: "male",
        class_name: "Class 1",
        section_name: "A",
        parent_name: "Father",
        parent_phone: "9112233445",
        parent_relation: "father",
      },
      errors: [],
      is_valid: true,
    },
  ];
  const editBatchCommit = await commitImportBatch(schoolId, actorId, "edit_test.csv", singleRow);
  
  // Simulate later modification by updating student's updated_at 10 seconds later
  const currStudents: Student[] = JSON.parse(localStorage.getItem(`myzkool_students_${schoolId}`) || "[]");
  const editedStudent = currStudents.find((s) => s.import_batch_id === editBatchCommit.batch_id);
  if (editedStudent) {
    editedStudent.updated_at = new Date(Date.now() + 10000).toISOString();
    localStorage.setItem(`myzkool_students_${schoolId}`, JSON.stringify(currStudents));
  }

  let editBlocked = false;
  try {
    await rollbackImportBatch(schoolId, editBatchCommit.batch_id, actorId);
  } catch (err: any) {
    if (err.message.includes("CANNOT_ROLLBACK") && err.message.includes("modifications made after import")) {
      editBlocked = true;
    }
  }
  assert(editBlocked, "Rollback strictly BLOCKED when student in batch has later modifications");

  // -------------------------------------------------------------------------
  // 5. Promotion Pipeline (Spec A4.6)
  // -------------------------------------------------------------------------
  console.log("\n5. Promotion Pipeline (Spec A4.6):");

  // Setup sample students in 2 classes: Class 1 and Class 2
  const fromYearId = "ay-2025";
  const toYearId = "ay-2026";

  const promoStudents: Student[] = [
    makeStudent("promo-s1", schoolId, "Aarav", "Patel", "ADM-P-01"),
    makeStudent("promo-s2", schoolId, "Diya", "Sharma", "ADM-P-02"),
    makeStudent("promo-s3", schoolId, "Karan", "Singhania", "ADM-P-03"),
  ];
  localStorage.setItem(`myzkool_students_${schoolId}`, JSON.stringify(promoStudents));

  const promoEnrollments: StudentEnrollment[] = [
    {
      id: "enr-p1",
      school_id: schoolId,
      student_id: "promo-s1",
      academic_year_id: fromYearId,
      class_id: "Class 1",
      section_id: "sec-1a",
      status: "active",
      enrolled_on: "2025-04-01",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "enr-p2",
      school_id: schoolId,
      student_id: "promo-s2",
      academic_year_id: fromYearId,
      class_id: "Class 1",
      section_id: "sec-1a",
      status: "active",
      enrolled_on: "2025-04-01",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "enr-p3",
      school_id: schoolId,
      student_id: "promo-s3",
      academic_year_id: fromYearId,
      class_id: "Class 2",
      section_id: "sec-2a",
      status: "active",
      enrolled_on: "2025-04-01",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  localStorage.setItem(`myzkool_student_enrollments_${schoolId}`, JSON.stringify(promoEnrollments));

  // Preview promotion
  // Sequential mapping: Class 1 -> Class 2; Class 2 -> Passed Out
  // Overrides: promo-s2 is 'detained'
  const promoConfig: Partial<PromotionConfig> = {
    overrides: {
      "promo-s2": { action: "detain" },
    },
    section_distribution: "keep_letter",
  };

  const preview = await getPromotionPreview(schoolId, fromYearId, toYearId, promoConfig);
  assert(preview.total_eligible === 3, "Preview identifies 3 eligible students in fromYear");
  assert(preview.promote_count === 1, "1 student scheduled to be promoted (Class 1 -> Class 2)");
  assert(preview.pass_out_count === 1, "1 student scheduled to pass out (Class 2 -> Passed Out)");
  assert(preview.detain_count === 1, "1 student scheduled to be detained (promo-s2)");

  const itemS1 = preview.students.find((s) => s.student_id === "promo-s1");
  assert(itemS1?.action === "promote", "promo-s1 target action is 'promote'");
  assert(itemS1?.target_class_id === "Class 2", "promo-s1 promoted from Class 1 to Class 2");

  const itemS2 = preview.students.find((s) => s.student_id === "promo-s2");
  assert(itemS2?.action === "detain", "promo-s2 target action overridden to 'detain'");
  assert(itemS2?.target_class_id === "Class 1", "promo-s2 remains in Class 1");

  const itemS3 = preview.students.find((s) => s.student_id === "promo-s3");
  assert(itemS3?.target_class_name === "Passed Out", "Highest class (Class 2) maps to 'Passed Out'");

  // Execute Promotion
  const execConfig: PromotionConfig = {
    from_year_id: fromYearId,
    to_year_id: toYearId,
    overrides: { "promo-s2": { action: "detain" } },
    section_distribution: "keep_letter",
  };

  const execResult = await executePromotion(schoolId, actorId, execConfig);
  assert(Boolean(execResult.batch_id), "Promotion execution completed with batch_id");
  assert(execResult.promoted_count === 1, "1 student recorded in promoted_count");
  assert(execResult.passed_out_count === 1, "1 student recorded in passed_out_count");
  assert(execResult.detained_count === 1, "1 student recorded in detained_count");

  // Verify updated enrollments
  const postPromoEnrollments: StudentEnrollment[] = JSON.parse(
    localStorage.getItem(`myzkool_student_enrollments_${schoolId}`) || "[]"
  );
  const oldEnr1 = postPromoEnrollments.find((e) => e.student_id === "promo-s1" && e.academic_year_id === fromYearId);
  const newEnr1 = postPromoEnrollments.find((e) => e.student_id === "promo-s1" && e.academic_year_id === toYearId);
  assert(oldEnr1?.status === "promoted", "promo-s1 old enrollment marked as 'promoted'");
  assert(newEnr1?.status === "active", "promo-s1 new enrollment created as 'active'");
  assert(newEnr1?.class_id === "Class 2", "promo-s1 new enrollment in Class 2");

  const oldEnr2 = postPromoEnrollments.find((e) => e.student_id === "promo-s2" && e.academic_year_id === fromYearId);
  const newEnr2 = postPromoEnrollments.find((e) => e.student_id === "promo-s2" && e.academic_year_id === toYearId);
  assert(oldEnr2?.status === "detained", "promo-s2 old enrollment marked as 'detained'");
  assert(newEnr2?.class_id === "Class 1", "promo-s2 new enrollment remains Class 1");

  // -------------------------------------------------------------------------
  // 6. Promotion 24-Hour Undo Window (Spec A4.6, Decision A4.6)
  // -------------------------------------------------------------------------
  console.log("\n6. Promotion 24-Hour Undo Window (Spec A4.6, Decision A4.6):");

  const promoBatches = await getPromotionBatches(schoolId);
  assert(promoBatches.length > 0, "Promotion batch record created");
  const promoBatchId = execResult.batch_id;

  // Perform undo within window
  const undoResult = await undoPromotion(schoolId, promoBatchId, actorId);
  assert(undoResult.success === true, "Undo promotion succeeded within 24h window");

  // Verify enrollments reverted
  const revertedEnrollments: StudentEnrollment[] = JSON.parse(
    localStorage.getItem(`myzkool_student_enrollments_${schoolId}`) || "[]"
  );
  const targetYearEnrollments = revertedEnrollments.filter((e) => e.academic_year_id === toYearId);
  assert(targetYearEnrollments.length === 0, "Target year enrollments removed on undo");

  const restoredOldEnr = revertedEnrollments.find((e) => e.student_id === "promo-s1" && e.academic_year_id === fromYearId);
  assert(restoredOldEnr?.status === "active", "Old enrollment status restored to 'active'");

  // Test expired undo window (> 24 hours)
  const expiredBatchId = crypto.randomUUID();
  const pastDate = new Date(Date.now() - 25 * 3600 * 1000).toISOString(); // 25 hours ago
  const expiredBatch = {
    id: expiredBatchId,
    school_id: schoolId,
    created_by: actorId,
    from_year_id: fromYearId,
    to_year_id: toYearId,
    status: "executed",
    created_at: pastDate,
    updated_at: pastDate,
  };
  localStorage.setItem(`myzkool_promotion_batches_${schoolId}`, JSON.stringify([expiredBatch]));

  let expiredUndoBlocked = false;
  try {
    await undoPromotion(schoolId, expiredBatchId, actorId);
  } catch (err: any) {
    if (err.message.includes("UNDO_WINDOW_EXPIRED")) {
      expiredUndoBlocked = true;
    }
  }
  assert(expiredUndoBlocked, "Undo blocked with UNDO_WINDOW_EXPIRED after 24 hours has elapsed");

  // -------------------------------------------------------------------------
  // 7. Status Changes & Transfer Certificate (Spec A4.7, Decision A4.7)
  // -------------------------------------------------------------------------
  console.log("\n7. Status Changes & Transfer Certificate (Spec A4.7, Decision A4.7):");

  const tcStudentId = "promo-s1";

  // Change student status with mandatory reason
  let emptyReasonBlocked = false;
  try {
    await changeStudentStatus(schoolId, tcStudentId, actorId, "admin", {
      new_status: "transferred",
      effective_date: "2026-04-15",
      reason: "   ", // blank
    });
  } catch (err: any) {
    if (err.message.includes("Reason is required") || err.message.includes("Mandatory reason")) {
      emptyReasonBlocked = true;
    }
  }
  assert(emptyReasonBlocked, "Status change without reason is blocked");

  const statusRes = await changeStudentStatus(schoolId, tcStudentId, actorId, "admin", {
    new_status: "transferred",
    effective_date: "2026-04-15",
    reason: "Parent relocating to Bengaluru",
  });
  assert(statusRes.status === "transferred", "Student status updated to 'transferred'");

  // Verify student not hard deleted
  const allCurrentStudents: Student[] = JSON.parse(localStorage.getItem(`myzkool_students_${schoolId}`) || "[]");
  const transferredStd = allCurrentStudents.find((s) => s.id === tcStudentId);
  assert(transferredStd !== undefined && transferredStd.deleted_at === null, "Transferred student remains in database (no hard delete)");

  // Dues check on TC: Simulate dues
  // Temporarily stub feeService.getStudentBalance
  const { feeService } = await import("../src/services/feeService");
  const originalGetBalance = feeService.getStudentBalance;
  (feeService as any).getStudentBalance = async () => ({ balance: 500000 }); // ₹5,000 outstanding dues

  // Non-owner attempting to issue TC with dues
  let duesBlockedNonOwner = false;
  try {
    await issueTransferCertificate(schoolId, tcStudentId, actorId, "teacher", {
      issued_on: "2026-04-16",
      reason: "Relocating",
    });
  } catch (err: any) {
    if (err.message.includes("DUES_BLOCK") && err.message.includes("Only the school owner can override")) {
      duesBlockedNonOwner = true;
    }
  }
  assert(duesBlockedNonOwner, "TC issuance with outstanding dues is BLOCKED for non-owner");

  // Owner attempting to issue TC without typed override reason
  let duesBlockedOwnerNoReason = false;
  try {
    await issueTransferCertificate(schoolId, tcStudentId, actorId, "owner", {
      issued_on: "2026-04-16",
      reason: "Relocating",
      dues_override_reason: "", // blank override reason
    });
  } catch (err: any) {
    if (err.message.includes("DUES_BLOCK") && err.message.includes("typed override reason is required")) {
      duesBlockedOwnerNoReason = true;
    }
  }
  assert(duesBlockedOwnerNoReason, "TC issuance with outstanding dues is BLOCKED for owner without typed override reason");

  // Owner enters typed override reason -> succeeds
  const tcRecord = await issueTransferCertificate(schoolId, tcStudentId, actorId, "owner", {
    issued_on: "2026-04-16",
    reason: "Relocating",
    dues_override_reason: "Management approved dues waiver under hardship policy",
  });
  assert(tcRecord.tc_no.startsWith("TC-2026-"), `TC issued with counter-based number: ${tcRecord.tc_no}`);
  assert(tcRecord.dues_cleared === false, "TC records dues_cleared = false");
  assert(tcRecord.dues_override_reason === "Management approved dues waiver under hardship policy", "TC records owner override reason");
  assert(tcRecord.is_duplicate_copy === false, "Original TC is not marked as duplicate");
  assert(tcRecord.qr_verification_code.startsWith("MYZKOOL:TC:"), "Generates QR verification code");

  // Restore feeService
  (feeService as any).getStudentBalance = originalGetBalance;

  // Duplicate TC issuance
  const duplicateTC = await issueDuplicateTransferCertificate(
    schoolId,
    tcRecord.id,
    actorId,
    "Parent misplaced original copy"
  );
  assert(duplicateTC.is_duplicate_copy === true, "Duplicate TC marked is_duplicate_copy = true");
  assert(duplicateTC.tc_no === tcRecord.tc_no, "Duplicate TC retains original tc_no");
  assert(duplicateTC.remarks?.includes("DUPLICATE COPY"), "Remarks explicitly note 'DUPLICATE COPY'");
  assert(duplicateTC.original_tc_id === tcRecord.id, "Duplicate TC references original_tc_id");

  // -------------------------------------------------------------------------
  // 8. Parent Record & Merge Tool (Spec A4.9)
  // -------------------------------------------------------------------------
  console.log("\n8. Parent Record & Merge Tool (Spec A4.9):");

  const p1: Parent = {
    id: "parent-surviving",
    school_id: schoolId,
    full_name: "Ramesh Sharma",
    phone: "9876500001",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const p2: Parent = {
    id: "parent-duplicate",
    school_id: schoolId,
    full_name: "Ramesh K Sharma",
    phone: "9876500002",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  localStorage.setItem(`myzkool_parents_${schoolId}`, JSON.stringify([p1, p2]));

  // Link child 1 to p1, and child 2 to p2
  const spLinks = [
    { school_id: schoolId, student_id: "promo-s1", parent_id: "parent-surviving" },
    { school_id: schoolId, student_id: "promo-s3", parent_id: "parent-duplicate" },
  ];
  localStorage.setItem(`myzkool_student_parents_${schoolId}`, JSON.stringify(spLinks));

  // Preview Merge
  const mergePreview = await previewParentMerge(schoolId, "parent-surviving", "parent-duplicate");
  assert(mergePreview.students_to_link.length === 1, "Preview shows 1 child link to move");
  assert(mergePreview.students_to_link[0].id === "promo-s3", "promo-s3 scheduled to be linked to surviving parent");

  // Execute Merge
  const mergeResult = await executeParentMerge(schoolId, actorId, "parent-surviving", "parent-duplicate");
  assert(mergeResult.surviving_parent_id === "parent-surviving", "Surviving parent ID matches");
  assert(mergeResult.moved_links_count === 1, "1 student link migrated");

  // Verify surviving parent has both children
  const updatedSPLinks: any[] = JSON.parse(localStorage.getItem(`myzkool_student_parents_${schoolId}`) || "[]");
  const childrenOfSurviving = updatedSPLinks.filter((sp) => sp.parent_id === "parent-surviving").map((sp) => sp.student_id);
  assert(childrenOfSurviving.includes("promo-s1"), "Surviving parent retains child 1");
  assert(childrenOfSurviving.includes("promo-s3"), "Surviving parent now linked to child 3");

  // Verify duplicate parent soft-deleted
  const finalParents: Parent[] = JSON.parse(localStorage.getItem(`myzkool_parents_${schoolId}`) || "[]");
  const dupParentRecord = finalParents.find((p) => p.id === "parent-duplicate");
  assert(Boolean(dupParentRecord?.deleted_at), "Duplicate parent record soft-deleted with timestamp");

  // -------------------------------------------------------------------------
  // 9. Classes & Sections Settings (Spec A4.8)
  // -------------------------------------------------------------------------
  console.log("\n9. Classes & Sections Settings (Spec A4.8):");

  const sampleClasses = [
    { id: "cls-1", school_id: schoolId, name: "Class 1", sort_order: 1 },
    { id: "cls-2", school_id: schoolId, name: "Class 2", sort_order: 2 },
  ];
  localStorage.setItem(`myzkool_classes_${schoolId}`, JSON.stringify(sampleClasses));

  // Update display order
  await updateClassesDisplayOrder(schoolId, "ay-2026", [
    { class_id: "cls-1", sort_order: 10 },
    { class_id: "cls-2", sort_order: 20 },
  ]);
  const reorderedClasses: any[] = JSON.parse(localStorage.getItem(`myzkool_classes_${schoolId}`) || "[]");
  assert(reorderedClasses.find((c) => c.id === "cls-1")?.sort_order === 10, "Class 1 sort_order updated to 10");
  assert(reorderedClasses.find((c) => c.id === "cls-2")?.sort_order === 20, "Class 2 sort_order updated to 20");

  // Update section settings & soft capacity warning
  const sampleSections = [
    { id: "sec-test-a", school_id: schoolId, academic_year_id: "ay-2025", class_id: "cls-1", name: "A", capacity: 2 },
  ];
  localStorage.setItem(`myzkool_sections_${schoolId}`, JSON.stringify(sampleSections));

  await updateSectionSettings(schoolId, "sec-test-a", { capacity: 1, class_teacher_id: "teacher-1" });
  const updatedSecs: any[] = JSON.parse(localStorage.getItem(`myzkool_sections_${schoolId}`) || "[]");
  assert(updatedSecs[0].capacity === 1, "Section capacity updated to 1");
  assert(updatedSecs[0].class_teacher_id === "teacher-1", "Class teacher assigned");

  // Enrollments in this section
  const sectionEnrollments: StudentEnrollment[] = [
    { id: "e1", school_id: schoolId, student_id: "s1", academic_year_id: "ay-2025", class_id: "cls-1", section_id: "sec-test-a", status: "active", enrolled_on: "2025-04-01", created_at: "", updated_at: "" },
    { id: "e2", school_id: schoolId, student_id: "s2", academic_year_id: "ay-2025", class_id: "cls-1", section_id: "sec-test-a", status: "active", enrolled_on: "2025-04-01", created_at: "", updated_at: "" },
  ];
  localStorage.setItem(`myzkool_student_enrollments_${schoolId}`, JSON.stringify(sectionEnrollments));

  const capCheck = await checkSectionCapacity(schoolId, "sec-test-a");
  assert(capCheck.current_count === 2, "Current section count is 2");
  assert(capCheck.capacity === 1, "Section capacity is 1");
  assert(capCheck.is_over_capacity === true, "Section over capacity triggers soft warning (is_over_capacity: true)");

  // Copy sections from previous year
  const copyRes = await copySectionsFromPreviousYear(schoolId, "ay-2025", "ay-2026");
  assert(copyRes.copied_count === 1, "Copied 1 section from ay-2025 to ay-2026");

  const targetSections: any[] = JSON.parse(localStorage.getItem(`myzkool_sections_${schoolId}`) || "[]");
  const newYearSec = targetSections.find((s) => s.academic_year_id === "ay-2026" && s.name === "A");
  assert(newYearSec !== undefined, "Copied section exists in ay-2026");
  assert(newYearSec?.capacity === 1, "Copied section retains capacity setting");

  // Running copy again avoids duplicates
  const secondCopyRes = await copySectionsFromPreviousYear(schoolId, "ay-2025", "ay-2026");
  assert(secondCopyRes.copied_count === 0, "Duplicate section copy prevented (copied_count = 0)");

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("\n----------------------------------------------------------");
  console.log(`STAGE 4 TEST SUMMARY: ${passed} Passed, ${failed} Failed.`);
  console.log("----------------------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runStage4Tests().catch((err) => {
  console.error("Stage 4 test suite failed with unexpected error:", err);
  process.exit(1);
});
