/**
 * Phase 2 Integration Test Suite: Admission Number and Student Lifecycle Integration
 * 
 * Verifies:
 * 1. Admission Number Generation & Uniqueness:
 *    - Auto-generation format ADM-YYYY-#### for createStudent, admission wizard, and bulk import
 *    - Preservation of custom admission numbers
 *    - Strict duplicate prevention across wizard, normal creation, and bulk import
 *    - Uniqueness collision prevention against pre-existing and soft-deleted students
 *    - Counter-cache handling: robustly parses arrays, dictionaries, and nested formats
 *    - Rollback safety: failed transactions never decrement or corrupt sequence counters
 * 
 * 2. Withdrawal & Transfer Lifecycle Integration with Fee Dues:
 *    - changeStudentStatus triggers transport assignment termination and future academic dues cancellation
 *    - Pending future academic dues: cancelled with negative cancel_due ledger entry
 *    - Partially paid future academic dues: unpaid balance cancelled, collected fee converted to FeeCredit
 *    - Fully paid / prepaid future academic dues: receipts/payments preserved, converted to FeeCredit
 *    - Past academic dues: strictly preserved (never cancelled)
 *    - Transport dues: ended via transport service, past transport dues preserved, no duplicate cancellation
 *    - Complete ledger audit integrity and student timeline event tracking
 */

import {
  createStudent,
  admitStudentTransactional,
  parseCountersCache,
  formatAdmissionNumber,
  getNextCounter,
  reserveCounters,
} from "../src/services/studentService";
import {
  changeStudentStatus,
  parseAndValidateImportCSV,
  commitImportBatch,
} from "../src/services/studentOperationsService";
import {
  cancelFutureDues,
  cancelTransportDues,
  getStudentDues,
} from "../src/services/feeDuesService";
import { createFeeService } from "../src/services/feeService";
import type { AdmissionWizardPayload, Student } from "../src/types/students";
import type { StudentDue, FeeLedgerEntry, FeeCredit } from "../src/types/fees";
import type { TransportAssignment } from "../src/types/transport";

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

function resetEnvironment() {
  store.clear();
}

async function runPhase2Tests() {
  console.log("==========================================================");
  console.log("MYZKOOL PHASE 2: ADMISSION NUMBER & LIFECYCLE TEST SUITE");
  console.log("==========================================================");

  const schoolId = "school-p2-test-001";
  const actorId = "user-admin-001";
  const currentYear = new Date().getFullYear();

  // -------------------------------------------------------------------------
  // 1. Counter Cache Robustness: Array vs Dictionary Handling
  // -------------------------------------------------------------------------
  console.log("\n1. Counter Cache Dictionary & Legacy Array Parsing:");
  resetEnvironment();

  // Test parsing when cache is null
  const nullParsed = parseCountersCache(null);
  assert(Object.keys(nullParsed).length === 0, "Null cache returns empty dictionary");

  // Test parsing when cache is an array (legacy representation)
  const legacyArray = JSON.stringify([
    { key: "admission_no", next_value: 12 },
    { name: "student_tc_no", value: 5 },
    { id: "fee_receipt", count: 101 },
  ]);
  const arrayParsed = parseCountersCache(legacyArray);
  assert(arrayParsed["admission_no"] === 12, "Legacy array with next_value parsed correctly");
  assert(arrayParsed["student_tc_no"] === 5, "Legacy array with value parsed correctly");
  assert(arrayParsed["fee_receipt"] === 101, "Legacy array with count parsed correctly");

  // Test parsing when cache is a standard dictionary
  const standardDict = JSON.stringify({
    admission_no: 25,
    student_tc_no: 8,
  });
  const dictParsed = parseCountersCache(standardDict);
  assert(dictParsed["admission_no"] === 25, "Standard dictionary parsed correctly");
  assert(dictParsed["student_tc_no"] === 8, "Standard dictionary student_tc_no parsed correctly");

  // Test parsing when cache has nested object values
  const nestedDict = JSON.stringify({
    admission_no: { next_value: 30 },
  });
  const nestedParsed = parseCountersCache(nestedDict);
  assert(nestedParsed["admission_no"] === 30, "Dictionary with nested object value parsed correctly");

  // Verify getNextCounter reads legacy array and writes back dictionary
  localStorage.setItem(`myzkool_counters_${schoolId}`, legacyArray);
  const nextRes = await getNextCounter(schoolId, "admission_no");
  assert(nextRes.value === 12, "getNextCounter returns expected sequence value from legacy array");
  
  const savedCache = localStorage.getItem(`myzkool_counters_${schoolId}`);
  assert(savedCache !== null && !savedCache.startsWith("["), "Cache was updated to dictionary format");
  const parsedAfter = JSON.parse(savedCache!);
  assert(parsedAfter["admission_no"] === 13, "Next counter sequence incremented to 13");

  // -------------------------------------------------------------------------
  // 2. Admission Number Generation Across All Paths
  // -------------------------------------------------------------------------
  console.log("\n2. Admission Number Generation Across All Paths:");
  resetEnvironment();

  // A. createStudent (Direct creation)
  const createRes1 = await createStudent(
    schoolId,
    {
      first_name: "Aarav",
      last_name: "Sharma",
      dob: "2018-05-15",
      gender: "male",
      admission_date: "2026-04-01",
      admission_type: "new",
    },
    actorId,
    "admin"
  );
  assert(!createRes1.error && !!createRes1.student, "createStudent succeeds");
  const s1Adm = createRes1.student!.admission_no;
  assert(s1Adm === `ADM-${currentYear}-0001`, `createStudent generates format ADM-YYYY-0001 (got ${s1Adm})`);

  // B. Consecutive student creation increments counter
  const createRes2 = await createStudent(
    schoolId,
    {
      first_name: "Diya",
      last_name: "Patel",
      dob: "2018-08-20",
      gender: "female",
      admission_date: "2026-04-01",
      admission_type: "new",
    },
    actorId,
    "admin"
  );
  assert(!createRes2.error && !!createRes2.student, "Second createStudent succeeds");
  const s2Adm = createRes2.student!.admission_no;
  assert(s2Adm === `ADM-${currentYear}-0002`, `Second student receives consecutive ADM-YYYY-0002 (got ${s2Adm})`);

  // C. Custom admission number preservation in createStudent
  const createResCustom = await createStudent(
    schoolId,
    {
      first_name: "Karan",
      last_name: "Verma",
      dob: "2018-02-10",
      gender: "male",
      admission_date: "2026-04-01",
      admission_type: "new",
      admission_no: "CUSTOM-2026-999",
    },
    actorId,
    "admin"
  );
  assert(createResCustom.student?.admission_no === "CUSTOM-2026-999", "Custom admission number preserved in createStudent");

  // D. Admission Wizard (admitStudentTransactional)
  const wizardPayload: AdmissionWizardPayload = {
    step1_basic: {
      first_name: "Rohan",
      last_name: "Gupta",
      dob: "2018-06-12",
      gender: "male",
    },
    step2_guardian: {
      father: {
        full_name: "Rajesh Gupta",
        phone: "9876543210",
        relation: "father",
        whatsapp_consent: true,
      },
      current_address: {
        kind: "current",
        line1: "123 Park Avenue",
        city: "Mumbai",
        district: "Mumbai",
        state: "Maharashtra",
        pin: "400001",
      },
    },
    step3_academic: {
      academic_year_id: "ay-2026",
      class_id: "class-1",
      section_id: "sec-a",
      admission_date: "2026-04-01",
      admission_type: "new",
      is_rte: false,
    },
    step4_documents: [],
  };

  const wizardRes = await admitStudentTransactional(schoolId, wizardPayload, actorId, "admin");
  assert(!wizardRes.error && !!wizardRes.student, "admitStudentTransactional succeeds");
  const wizardAdm = wizardRes.student!.admission_no;
  assert(wizardAdm === `ADM-${currentYear}-0003`, `Wizard generates consecutive ADM-YYYY-0003 (got ${wizardAdm})`);

  // E. Bulk Import Auto-Generation
  const csvContent = [
    "first_name,last_name,dob,gender,class_name,section_name,parent_name,parent_phone",
    "Ishaan,Mehta,2018-04-10,male,Class 1,A,Vikram Mehta,9811122233",
    "Meera,Kapoor,2018-09-15,female,Class 1,A,Anil Kapoor,9822233344",
  ].join("\n");

  const validationRes = await parseAndValidateImportCSV(
    schoolId,
    csvContent,
    {
      first_name: "0",
      last_name: "1",
      dob: "2",
      gender: "3",
      class_name: "4",
      section_name: "5",
      parent_name: "6",
      parent_phone: "7",
    },
    [{ name: "Class 1" }]
  );
  assert(validationRes.valid_rows_count === 2, "Bulk import validation identified 2 valid rows");

  const commitRes = await commitImportBatch(
    schoolId,
    actorId,
    "test.csv",
    validationRes.rows.filter((r) => r.is_valid)
  );
  assert(commitRes.status === "committed", "Bulk import committed successfully");

  // Inspect the imported students in localStorage
  const allStudents: Student[] = JSON.parse(localStorage.getItem(`myzkool_students_${schoolId}`) || "[]");
  const ishaan = allStudents.find((s) => s.first_name === "Ishaan");
  const meera = allStudents.find((s) => s.first_name === "Meera");

  assert(ishaan?.admission_no === `ADM-${currentYear}-0004`, `Bulk import first student received ADM-YYYY-0004 (got ${ishaan?.admission_no})`);
  assert(meera?.admission_no === `ADM-${currentYear}-0005`, `Bulk import second student received ADM-YYYY-0005 (got ${meera?.admission_no})`);

  // -------------------------------------------------------------------------
  // 3. Duplicate Prevention & Constraint Enforcement
  // -------------------------------------------------------------------------
  console.log("\n3. Duplicate Prevention & Collision Protection:");

  // A. Duplicate admission number in createStudent is rejected
  const dupCreateRes = await createStudent(
    schoolId,
    {
      first_name: "Duplicate",
      last_name: "Attempt",
      dob: "2018-05-15",
      gender: "male",
      admission_date: "2026-04-01",
      admission_type: "new",
      admission_no: s1Adm, // already allocated to Aarav
    },
    actorId,
    "admin"
  );
  assert(!!dupCreateRes.error, "createStudent with duplicate admission number is blocked");
  assert(dupCreateRes.error?.includes("already exists") === true, "Error message states student already exists");

  // B. Duplicate admission number in wizard is rejected
  const dupWizardPayload: AdmissionWizardPayload = {
    ...wizardPayload,
    step1_basic: {
      ...wizardPayload.step1_basic,
      admission_no: s1Adm, // already allocated
    },
  };
  const dupWizardRes = await admitStudentTransactional(schoolId, dupWizardPayload, actorId, "admin");
  assert(dupWizardRes.rolledBack === true, "Wizard with duplicate admission number rolls back");
  assert(dupWizardRes.error?.includes("already exists") === true, "Wizard reports duplicate admission number error");

  // C. Uniqueness collision with soft-deleted student
  // Soft-delete Karan Verma (admission_no: "CUSTOM-2026-999")
  const studentList: Student[] = JSON.parse(localStorage.getItem(`myzkool_students_${schoolId}`) || "[]");
  const karan = studentList.find((s) => s.admission_no === "CUSTOM-2026-999");
  if (karan) {
    karan.deleted_at = new Date().toISOString();
    karan.delete_reason = "Left school";
    localStorage.setItem(`myzkool_students_${schoolId}`, JSON.stringify(studentList));
  }

  // Attempt to reuse Karan's admission number
  const reuseAdmRes = await createStudent(
    schoolId,
    {
      first_name: "New",
      last_name: "Student",
      dob: "2018-01-01",
      gender: "male",
      admission_date: "2026-04-01",
      admission_type: "new",
      admission_no: "CUSTOM-2026-999",
    },
    actorId,
    "admin"
  );
  assert(!!reuseAdmRes.error, "Reusing admission number of soft-deleted student is blocked (database constraint uniqueness)");

  // -------------------------------------------------------------------------
  // 4. Counter Gap Safety on Mid-Transaction Failure
  // -------------------------------------------------------------------------
  console.log("\n4. Counter Gap Safety on Mid-Transaction Failure:");

  // Read current counter before failure
  const counterBefore = parseCountersCache(localStorage.getItem(`myzkool_counters_${schoolId}`))["admission_no"];

  // Execute wizard forced to fail at outbox step
  const failPayload: AdmissionWizardPayload = {
    ...wizardPayload,
    step1_basic: {
      first_name: "FailStudent",
      last_name: "RollbackTest",
      dob: "2018-03-03",
      gender: "male",
    },
  };

  const forcedFailRes = await admitStudentTransactional(schoolId, failPayload, actorId, "admin", {
    forceFailAtStep: "outbox",
  });
  assert(forcedFailRes.rolledBack === true, "Transaction caught forced failure and rolled back");

  // In standard accounting/financial and database sequence design:
  // Counters MUST NOT be decremented on rollback (avoids race conditions with concurrent requests)
  const counterAfter = parseCountersCache(localStorage.getItem(`myzkool_counters_${schoolId}`))["admission_no"];
  assert(counterAfter === counterBefore + 1, "Counter sequence is not decremented unsafely on failure/rollback");

  // Verify next admission cleanly gets the next sequence number without collision
  const nextAdmitRes = await admitStudentTransactional(schoolId, wizardPayload, actorId, "admin");
  assert(!nextAdmitRes.error && !!nextAdmitRes.student, "Subsequent admission succeeds after previous rollback");
  assert(
    nextAdmitRes.student!.admission_no === formatAdmissionNumber(currentYear, counterAfter),
    `Next admission gets next clean sequence number (${nextAdmitRes.student!.admission_no})`
  );

  // -------------------------------------------------------------------------
  // 5. Withdrawal & Transfer with Fee Dues Integration
  // -------------------------------------------------------------------------
  console.log("\n5. Withdrawal & Transfer Lifecycle Integration with Fee Dues:");
  resetEnvironment();

  // Setup: Create a student with pending, partially paid, fully paid, and past dues
  const studentWithdrawId = "student-withdrawal-test";
  const withdrawStudent: Student = {
    id: studentWithdrawId,
    school_id: schoolId,
    admission_no: `ADM-${currentYear}-0100`,
    first_name: "Tara",
    last_name: "Deshmukh",
    dob: "2018-07-22",
    gender: "female",
    nationality: "Indian",
    is_rte: false,
    admission_date: "2026-04-01",
    admission_type: "new",
    status: "enrolled",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  localStorage.setItem(`myzkool_students_${schoolId}`, JSON.stringify([withdrawStudent]));

  // Create academic fee dues for Tara:
  // Due 1: Past Due (due_date: 2026-04-10, effective withdrawal: 2026-07-01) -> MUST NOT BE CANCELLED
  // Due 2: Future Pending Due (due_date: 2026-07-10, unpaid) -> MUST BE CANCELLED
  // Due 3: Future Partially Paid Due (due_date: 2026-10-10, gross: 5000, paid: 2000, bal: 3000) -> CANCEL BAL, CREDIT 2000
  // Due 4: Future Fully Paid Due (due_date: 2027-01-10, gross: 5000, paid: 5000, bal: 0) -> CREDIT 5000
  const duesList: StudentDue[] = [
    {
      id: "due-past-unpaid",
      school_id: schoolId,
      student_id: studentWithdrawId,
      academic_year_id: "ay-2026",
      fee_head_id: "head-tuition",
      term_id: "term-q1",
      gross_paise: 500000,
      concession_paise: 0,
      net_paise: 500000,
      paid_paise: 0,
      balance_paise: 500000,
      status: "pending",
      due_date: "2026-04-10",
      source: "structure",
      source_ref: "struct-1",
      created_at: "2026-04-01T00:00:00Z",
      updated_at: "2026-04-01T00:00:00Z",
    },
    {
      id: "due-future-pending",
      school_id: schoolId,
      student_id: studentWithdrawId,
      academic_year_id: "ay-2026",
      fee_head_id: "head-tuition",
      term_id: "term-q2",
      gross_paise: 500000,
      concession_paise: 0,
      net_paise: 500000,
      paid_paise: 0,
      balance_paise: 500000,
      status: "pending",
      due_date: "2026-07-10",
      source: "structure",
      source_ref: "struct-1",
      created_at: "2026-04-01T00:00:00Z",
      updated_at: "2026-04-01T00:00:00Z",
    },
    {
      id: "due-future-partial",
      school_id: schoolId,
      student_id: studentWithdrawId,
      academic_year_id: "ay-2026",
      fee_head_id: "head-tuition",
      term_id: "term-q3",
      gross_paise: 500000,
      concession_paise: 0,
      net_paise: 500000,
      paid_paise: 200000,
      balance_paise: 300000,
      status: "partial",
      due_date: "2026-10-10",
      source: "structure",
      source_ref: "struct-1",
      created_at: "2026-04-01T00:00:00Z",
      updated_at: "2026-04-01T00:00:00Z",
    },
    {
      id: "due-future-paid",
      school_id: schoolId,
      student_id: studentWithdrawId,
      academic_year_id: "ay-2026",
      fee_head_id: "head-tuition",
      term_id: "term-q4",
      gross_paise: 500000,
      concession_paise: 0,
      net_paise: 500000,
      paid_paise: 500000,
      balance_paise: 0,
      status: "paid",
      due_date: "2027-01-10",
      source: "structure",
      source_ref: "struct-1",
      created_at: "2026-04-01T00:00:00Z",
      updated_at: "2026-04-01T00:00:00Z",
    },
  ];
  localStorage.setItem(`myzkool_student_dues_${schoolId}`, JSON.stringify(duesList));

  // Initial ledger entries for the dues
  const initialLedger: FeeLedgerEntry[] = duesList.map((d) => ({
    id: `ledger-create-${d.id}`,
    school_id: schoolId,
    student_id: studentWithdrawId,
    academic_year_id: "ay-2026",
    due_id: d.id,
    receipt_id: null,
    entry_type: "due_created",
    amount_paise: d.gross_paise,
    note: `Initial due created for ${d.id}`,
    created_by: actorId,
    created_at: "2026-04-01T00:00:00Z",
  }));
  localStorage.setItem(`myzkool_fee_ledger_${schoolId}`, JSON.stringify(initialLedger));

  // Setup Transport:
  // Add an active transport assignment for Tara
  const transportAssignment: TransportAssignment = {
    id: "assign-tara-transport",
    school_id: schoolId,
    student_id: studentWithdrawId,
    academic_year_id: "ay-2026",
    route_id: "route-north",
    pickup_stop_id: "stop-north-1",
    drop_stop_id: "stop-north-1",
    service_type: "both",
    status: "active",
    effective_from: "2026-04-01",
    effective_to: null,
    end_reason: null,
    monthly_fee_paise: 150000,
    requires_guardian_handover: false,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  };
  localStorage.setItem(`myzkool_transport_assignments_${schoolId}`, JSON.stringify([transportAssignment]));

  // Transport dues:
  // 1. Past transport due (April 2026, unpaid) -> MUST NOT BE CANCELLED
  // 2. Future transport due (July 2026, unpaid) -> MUST BE CANCELLED
  const transportDues: StudentDue[] = [
    {
      id: "due-transport-past",
      school_id: schoolId,
      student_id: studentWithdrawId,
      academic_year_id: "ay-2026",
      fee_head_id: "head-transport",
      term_id: "term-apr",
      gross_paise: 150000,
      concession_paise: 0,
      net_paise: 150000,
      paid_paise: 0,
      balance_paise: 150000,
      status: "pending",
      due_date: "2026-04-05",
      source: "transport",
      source_ref: transportAssignment.id,
      created_at: "2026-04-01T00:00:00Z",
      updated_at: "2026-04-01T00:00:00Z",
    },
    {
      id: "due-transport-future",
      school_id: schoolId,
      student_id: studentWithdrawId,
      academic_year_id: "ay-2026",
      fee_head_id: "head-transport",
      term_id: "term-jul",
      gross_paise: 150000,
      concession_paise: 0,
      net_paise: 150000,
      paid_paise: 0,
      balance_paise: 150000,
      status: "pending",
      due_date: "2026-07-05",
      source: "transport",
      source_ref: transportAssignment.id,
      created_at: "2026-04-01T00:00:00Z",
      updated_at: "2026-04-01T00:00:00Z",
    },
  ];
  localStorage.setItem(
    `myzkool_student_dues_${schoolId}`,
    JSON.stringify([...duesList, ...transportDues])
  );

  // Enable transport feature in school settings for test
  localStorage.setItem(
    `myzkool_subscription_${schoolId}`,
    JSON.stringify({ plan_tier: "pro", status: "active", features: ["transport"] })
  );

  // Execute changeStudentStatus to 'withdrawn' effective 2026-07-01
  const withdrawEffectiveDate = "2026-07-01";
  const updatedStudent = await changeStudentStatus(
    schoolId,
    studentWithdrawId,
    actorId,
    "admin",
    {
      new_status: "withdrawn",
      effective_date: withdrawEffectiveDate,
      reason: "Family relocated to Bengaluru",
      end_transport: true,
    }
  );

  assert(updatedStudent.status === "withdrawn", "Student status updated to withdrawn");
  assert(updatedStudent.status_changed_on === withdrawEffectiveDate, "status_changed_on recorded");

  // Inspect dues after withdrawal
  const afterDues: StudentDue[] = JSON.parse(localStorage.getItem(`myzkool_student_dues_${schoolId}`) || "[]");
  const pastAcademicDue = afterDues.find((d) => d.id === "due-past-unpaid");
  const futurePendingDue = afterDues.find((d) => d.id === "due-future-pending");
  const futurePartialDue = afterDues.find((d) => d.id === "due-future-partial");
  const futurePaidDue = afterDues.find((d) => d.id === "due-future-paid");
  const pastTransportDue = afterDues.find((d) => d.id === "due-transport-past");
  const futureTransportDue = afterDues.find((d) => d.id === "due-transport-future");

  // Verify Past Academic Due is NOT cancelled
  assert(pastAcademicDue?.status === "pending", "Past academic due remains pending");
  assert(pastAcademicDue?.balance_paise === 500000, "Past academic due balance is intact (₹5,000)");

  // Verify Future Pending Due is cancelled
  assert(futurePendingDue?.status === "cancelled", "Future pending due marked as cancelled");
  assert(futurePendingDue?.balance_paise === 0, "Future pending due balance set to 0");

  // Verify Future Partially Paid Due
  assert(futurePartialDue?.status === "cancelled", "Future partially paid due marked as cancelled");
  assert(futurePartialDue?.balance_paise === 0, "Future partially paid due balance set to 0");
  assert(futurePartialDue?.paid_paise === 200000, "Collected payment (₹2,000) not erased");

  // Verify Future Fully Paid Due
  assert(futurePaidDue?.status === "cancelled", "Future fully paid due marked as cancelled");
  assert(futurePaidDue?.balance_paise === 0, "Future fully paid due balance set to 0");
  assert(futurePaidDue?.paid_paise === 500000, "Collected payment (₹5,000) not erased");

  // Verify FeeCredits created for collected future fees (₹2,000 + ₹5,000 = ₹7,000 = 700,000 paise)
  const credits: FeeCredit[] = JSON.parse(localStorage.getItem(`myzkool_fee_credits_${schoolId}`) || "[]");
  const totalCreditAmount = credits.reduce((sum, c) => sum + c.amount_paise, 0);
  assert(credits.length === 2, "Created 2 FeeCredit records for partially paid and prepaid future dues");
  assert(totalCreditAmount === 700000, `Total FeeCredit balance is ₹7,000 (700,000 paise) (got ${totalCreditAmount})`);

  // Verify Transport Assignment Termination
  const assignments: TransportAssignment[] = JSON.parse(
    localStorage.getItem(`myzkool_transport_assignments_${schoolId}`) || "[]"
  );
  const taraAssignment = assignments.find((a) => a.id === transportAssignment.id);
  assert(taraAssignment?.status === "ended", "Transport assignment marked as ended");
  assert(taraAssignment?.effective_to === withdrawEffectiveDate, "Transport end date recorded");

  // Verify Transport Dues:
  // Past transport due must NOT be cancelled
  assert(pastTransportDue?.status === "pending", "Past transport due is preserved (not cancelled)");
  assert(pastTransportDue?.balance_paise === 150000, "Past transport due balance intact (₹1,500)");

  // Future transport due must be cancelled
  assert(futureTransportDue?.status === "cancelled", "Future transport due marked as cancelled");
  assert(futureTransportDue?.balance_paise === 0, "Future transport due balance set to 0");

  // Verify Ledger Entries Integrity
  const finalLedger: FeeLedgerEntry[] = JSON.parse(localStorage.getItem(`myzkool_fee_ledger_${schoolId}`) || "[]");
  
  // cancel_due entries should exist for:
  // - due-future-pending (-500,000 paise)
  // - due-future-partial unpaid balance (-300,000 paise)
  // - due-transport-future (-150,000 paise)
  const cancelEntries = finalLedger.filter((l) => l.entry_type === "cancel_due");
  assert(cancelEntries.length === 3, `Recorded exactly 3 cancel_due ledger entries (got ${cancelEntries.length})`);
  
  const pendingCancel = cancelEntries.find((l) => l.due_id === "due-future-pending");
  assert(pendingCancel?.amount_paise === -500000, "cancel_due for future pending due reduces ledger by ₹5,000");

  const partialCancel = cancelEntries.find((l) => l.due_id === "due-future-partial");
  assert(partialCancel?.amount_paise === -300000, "cancel_due for partial due cancels unpaid balance of ₹3,000");

  const transportCancel = cancelEntries.find((l) => l.due_id === "due-transport-future");
  assert(transportCancel?.amount_paise === -150000, "cancel_due for future transport cancels balance of ₹1,500");

  // adjustment entries should exist for advance conversions
  const adjustmentEntries = finalLedger.filter((l) => l.entry_type === "adjustment");
  assert(adjustmentEntries.length >= 2, "Adjustment entries recorded for credit advance conversions");

  // Verify Student Timeline Event recorded
  const events = JSON.parse(localStorage.getItem(`myzkool_student_events_${schoolId}`) || "[]");
  const statusEvent = events.find((e: any) => e.kind === "status_changed");
  assert(statusEvent !== undefined, "Timeline event recorded for status change");
  assert(statusEvent?.summary?.includes("withdrawn") === true, "Timeline event mentions withdrawn status");

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("\n----------------------------------------------------------");
  console.log(`PHASE 2 TEST SUMMARY: ${passed} Passed, ${failed} Failed.`);
  console.log("----------------------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
