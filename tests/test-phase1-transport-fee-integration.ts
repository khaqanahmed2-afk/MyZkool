/**
 * Phase 1 Integration Test Suite: Student Admission -> Transport & Fee Integration
 * 
 * Verifies:
 * 1. Admission with transport creates a valid assignment with the correct stop ID and dues
 * 2. Admission with fee structure selection creates the assignment and generates the correct fee dues for the actual class
 * 3. Admission rollback cleans up transport assignments, transport dues, fee assignments, and fee dues without leaving orphans
 * 4. Admission without transport succeeds and does not create transport records
 * 5. Missing transport parameters when opted-in returns clear validation error
 */

import { admitStudentTransactional, listStudents } from "../src/services/studentService";
import type { AdmissionWizardPayload } from "../src/types/students";
import type { TransportAssignment } from "../src/types/transport";
import type { StudentDue, StudentFeeAssignment, FeeLedgerEntry } from "../src/types/fees";

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

async function runTests() {
  console.log("==========================================================");
  console.log("MYZKOOL PHASE 1: TRANSPORT & FEE INTEGRATION TEST SUITE");
  console.log("==========================================================\n");

  cleanLocalStorage();
  const schoolId = "school-test-integ-1";
  const actorId = "user-admin-integ-1";
  const academicYearId = "ay-2026-integ";

  // ── Setup Common School Environment Fixtures ──────────────────────────────
  localStorage.setItem(`myzkool_school_plans_${schoolId}`, JSON.stringify({
    plan_slug: "pro",
    features: ["transport", "students", "fees", "attendance", "admissions"],
    billing_status: "active",
  }));

  // Route and Stop
  const routeId = "route-integ-101";
  const stopId = "stop-integ-pickup-999";
  localStorage.setItem(`myzkool_transport_routes_${schoolId}`, JSON.stringify([{
    id: routeId,
    school_id: schoolId,
    name: "Route 101 - Gomti Express",
    code: "G101",
    status: "active",
  }]));

  localStorage.setItem(`myzkool_route_stops_${schoolId}`, JSON.stringify([{
    id: stopId,
    route_id: routeId,
    school_id: schoolId,
    name: "Manoj Pandey Chauraha",
    stop_order: 1,
    monthly_fee_paise: 150000, // ₹1,500/month
  }]));

  // Fee Structure, Terms, Heads, and Items for Class 5
  const structureId = "struct-class-5-standard";
  const classId = "class-5";

  localStorage.setItem(`myzkool_fee_structures_${schoolId}`, JSON.stringify([{
    id: structureId,
    school_id: schoolId,
    name: "Standard Class 5 Fee Structure",
    class_id: classId,
    academic_year_id: academicYearId,
    version: 1,
    status: "active",
    applies_to: "all",
  }]));

  localStorage.setItem(`myzkool_fee_terms_${schoolId}_${academicYearId}`, JSON.stringify([
    {
      id: "term-q1",
      school_id: schoolId,
      academic_year_id: academicYearId,
      name: "Quarter 1",
      sort_order: 1,
      due_date: "2026-04-15",
    },
    {
      id: "term-q2",
      school_id: schoolId,
      academic_year_id: academicYearId,
      name: "Quarter 2",
      sort_order: 2,
      due_date: "2026-07-15",
    },
  ]));

  localStorage.setItem(`myzkool_fee_heads_${schoolId}`, JSON.stringify([
    {
      id: "head-tuition-5",
      school_id: schoolId,
      name: "Tuition Fee",
      code: "tuition_fee",
      category: "recurring",
      is_active: true,
      rte_waivable: true,
    },
  ]));

  localStorage.setItem(`myzkool_fee_structure_items_${schoolId}`, JSON.stringify([{
    id: "item-t5",
    structure_id: structureId,
    fee_head_id: "head-tuition-5",
  }]));

  localStorage.setItem(`myzkool_fee_structure_item_terms_${schoolId}`, JSON.stringify([
    {
      id: "amt-q1",
      structure_id: structureId,
      item_id: "item-t5",
      term_id: "term-q1",
      amount_paise: 600000, // ₹6,000
    },
    {
      id: "amt-q2",
      structure_id: structureId,
      item_id: "item-t5",
      term_id: "term-q2",
      amount_paise: 600000, // ₹6,000
    },
  ]));

  // -------------------------------------------------------------------------
  // 1. Admission with Transport & Fee Structure Selection
  // -------------------------------------------------------------------------
  console.log("1. Admission with Transport & Fee Structure Selection:");

  const payloadWithAll: AdmissionWizardPayload = {
    step1_basic: {
      first_name: "Kabir",
      last_name: "Mehta",
      dob: "2015-08-10",
      gender: "male",
    },
    step2_guardian: {
      father: {
        relation: "father",
        full_name: "Rajeev Mehta",
        phone: "9876541234",
        is_primary_contact: true,
      },
      current_address: {
        kind: "current",
        line1: "45 Gomti Greens",
        city: "Lucknow",
        district: "Lucknow",
        state: "Uttar Pradesh",
        pin: "226010",
      },
    },
    step3_academic: {
      academic_year_id: academicYearId,
      admission_date: "2026-04-01",
      class_id: classId,
      section_id: "sec-5a",
      roll_no: "501",
      admission_type: "new",
      is_rte: false,
    },
    step4_documents: [],
    step7_transport: {
      opt_in: true,
      route_id: routeId,
      stop_id: stopId,
      pickup: true,
      dropoff: true,
    },
    step8_fee: {
      fee_structure_id: structureId,
    },
  };

  const admitRes = await admitStudentTransactional(schoolId, payloadWithAll, actorId, "admin");
  assert(admitRes.error === undefined, "Student admission executes without errors");
  assert(admitRes.student !== undefined, "Returns admitted student record");

  const student = admitRes.student!;
  assert(student.first_name === "Kabir", "Student first_name is Kabir");
  assert(student.status === "enrolled", "Student status is enrolled");

  // Verify transport assignment
  const assignmentsCached = localStorage.getItem(`myzkool_transport_assignments_${schoolId}`);
  const assignments: TransportAssignment[] = assignmentsCached ? JSON.parse(assignmentsCached) : [];
  const studentAssignment = assignments.find((a) => a.student_id === student.id);

  assert(studentAssignment !== undefined, "Transport assignment created for student");
  assert(studentAssignment?.route_id === routeId, "Transport assignment has correct route_id");
  assert(studentAssignment?.pickup_stop_id === stopId, "Transport assignment stores actual stop.id (not stop name)");
  assert(studentAssignment?.drop_stop_id === stopId, "Transport assignment stores drop_stop_id");
  assert(studentAssignment?.service_type === "both", "Transport service_type is 'both'");
  assert(studentAssignment?.status === "active", "Transport assignment status is active");
  assert(studentAssignment?.academic_year_id === academicYearId, "Transport assignment references correct academic year");

  // Verify transport fee dues
  const duesCached = localStorage.getItem(`myzkool_student_dues_${schoolId}`);
  const dues: StudentDue[] = duesCached ? JSON.parse(duesCached) : [];
  const transportDues = dues.filter((d) => d.student_id === student.id && d.source === "transport");

  assert(transportDues.length > 0, "Transport fee dues automatically created for the assignment");
  assert(transportDues[0].source_ref === studentAssignment?.id, "Transport due references the created assignment ID");
  assert(transportDues[0].balance_paise > 0, "Transport due has positive balance");

  // Verify transport ledger entry
  const ledgerCached = localStorage.getItem(`myzkool_fee_ledger_${schoolId}`);
  const ledger: FeeLedgerEntry[] = ledgerCached ? JSON.parse(ledgerCached) : [];
  const transportLedger = ledger.filter((l) => l.student_id === student.id && transportDues.some((d) => d.id === l.due_id));
  assert(transportLedger.length > 0, "Fee ledger entry created for transport due");

  // Verify fee structure assignment
  const feeAssignCached = localStorage.getItem(`myzkool_fee_assignments_${schoolId}`);
  const feeAssignments: StudentFeeAssignment[] = feeAssignCached ? JSON.parse(feeAssignCached) : [];
  const studentFeeAssign = feeAssignments.find((fa) => fa.student_id === student.id);

  assert(studentFeeAssign !== undefined, "Student fee structure assignment record created");
  assert(studentFeeAssign?.structure_id === structureId, "Assigned structure ID matches Step 8 selection");
  assert(studentFeeAssign?.academic_year_id === academicYearId, "Fee assignment references correct academic session");
  assert(studentFeeAssign?.status === "active", "Fee assignment status is active");

  // Verify academic fee dues generated
  const academicDues = dues.filter((d) => d.student_id === student.id && d.source === "structure");
  assert(academicDues.length === 2, "Generated 2 fee dues for Quarter 1 and Quarter 2");
  assert(academicDues.every((d) => d.gross_paise === 600000), "Each due reflects structure gross of ₹6,000 (600,000 paise)");
  assert(academicDues.every((d) => d.source_ref === studentFeeAssign?.id), "Academic dues link to student fee assignment ID");

  // Verify academic fee ledger entries
  const academicLedger = ledger.filter((l) => l.student_id === student.id && academicDues.some((d) => d.id === l.due_id));
  assert(academicLedger.length === 2, "Fee ledger entries recorded for each academic fee due");

  // -------------------------------------------------------------------------
  // 2. Admission without Transport (Opt-out)
  // -------------------------------------------------------------------------
  console.log("\n2. Admission without Transport (Opt-out):");

  const payloadNoTransport: AdmissionWizardPayload = {
    ...payloadWithAll,
    step1_basic: {
      ...payloadWithAll.step1_basic,
      first_name: "Diya",
      last_name: "Sen",
    },
    step2_guardian: {
      ...payloadWithAll.step2_guardian,
      father: {
        ...payloadWithAll.step2_guardian.father!,
        phone: "9876549999",
      },
    },
    step7_transport: {
      opt_in: false,
    },
    step8_fee: {
      fee_structure_id: structureId,
    },
  };

  const admitNoTransportRes = await admitStudentTransactional(schoolId, payloadNoTransport, actorId, "admin");
  assert(admitNoTransportRes.error === undefined, "Admission without transport executes successfully");
  const diyaStudent = admitNoTransportRes.student!;
  assert(diyaStudent.first_name === "Diya", "Student Diya admitted");

  // Verify NO transport assignment exists for Diya
  const allAssignsNow: TransportAssignment[] = JSON.parse(localStorage.getItem(`myzkool_transport_assignments_${schoolId}`) || "[]");
  const diyaAssign = allAssignsNow.find((a) => a.student_id === diyaStudent.id);
  assert(diyaAssign === undefined, "Zero transport assignments created when student opted out");

  // Verify NO transport dues for Diya
  const allDuesNow: StudentDue[] = JSON.parse(localStorage.getItem(`myzkool_student_dues_${schoolId}`) || "[]");
  const diyaTransportDues = allDuesNow.filter((d) => d.student_id === diyaStudent.id && d.source === "transport");
  assert(diyaTransportDues.length === 0, "Zero transport dues created when student opted out");

  // Verify Diya still got fee dues
  const diyaAcademicDues = allDuesNow.filter((d) => d.student_id === diyaStudent.id && d.source === "structure");
  assert(diyaAcademicDues.length === 2, "Diya received academic fee dues as expected");

  // -------------------------------------------------------------------------
  // 3. Rollback Stack & Zero Orphans on Mid-Transaction Failure
  // -------------------------------------------------------------------------
  console.log("\n3. Rollback Stack & Zero Orphans on Mid-Transaction Failure:");

  const beforeStudentsCount = (await listStudents(schoolId)).response?.data.length || 0;
  const beforeAssignsCount: number = JSON.parse(localStorage.getItem(`myzkool_transport_assignments_${schoolId}`) || "[]").length;
  const beforeDuesCount: number = JSON.parse(localStorage.getItem(`myzkool_student_dues_${schoolId}`) || "[]").length;
  const beforeLedgerCount: number = JSON.parse(localStorage.getItem(`myzkool_fee_ledger_${schoolId}`) || "[]").length;
  const beforeFeeAssignsCount: number = JSON.parse(localStorage.getItem(`myzkool_fee_assignments_${schoolId}`) || "[]").length;

  const failPayload: AdmissionWizardPayload = {
    ...payloadWithAll,
    step1_basic: {
      ...payloadWithAll.step1_basic,
      first_name: "FailedStudent",
      last_name: "RollbackTest",
    },
    step2_guardian: {
      ...payloadWithAll.step2_guardian,
      father: {
        ...payloadWithAll.step2_guardian.father!,
        phone: "9876548888",
      },
    },
  };

  // Force failure at outbox step (after transport and fee have already executed)
  const failRes = await admitStudentTransactional(schoolId, failPayload, actorId, "admin", {
    forceFailAtStep: "outbox",
  });

  assert(failRes.rolledBack === true, "Admission transaction caught failure at outbox and rolled back");
  assert(failRes.error?.includes("outbox") === true, "Failure reported at outbox step");

  // Verify no orphaned student row
  const afterStudentsCount = (await listStudents(schoolId)).response?.data.length || 0;
  assert(afterStudentsCount === beforeStudentsCount, "Student table rolled back without orphans");

  // Verify no orphaned transport assignment
  const afterAssigns: TransportAssignment[] = JSON.parse(localStorage.getItem(`myzkool_transport_assignments_${schoolId}`) || "[]");
  assert(afterAssigns.length === beforeAssignsCount, "Transport assignments rolled back without orphans");

  // Verify no orphaned fee assignments
  const afterFeeAssigns: StudentFeeAssignment[] = JSON.parse(localStorage.getItem(`myzkool_fee_assignments_${schoolId}`) || "[]");
  assert(afterFeeAssigns.length === beforeFeeAssignsCount, "Student fee assignments rolled back without orphans");

  // Verify no orphaned dues
  const afterDues: StudentDue[] = JSON.parse(localStorage.getItem(`myzkool_student_dues_${schoolId}`) || "[]");
  assert(afterDues.length === beforeDuesCount, "Student dues rolled back without orphans");

  // Verify no orphaned ledger entries
  const afterLedger: FeeLedgerEntry[] = JSON.parse(localStorage.getItem(`myzkool_fee_ledger_${schoolId}`) || "[]");
  assert(afterLedger.length === beforeLedgerCount, "Fee ledger entries rolled back without orphans");

  // -------------------------------------------------------------------------
  // 4. Missing Transport Route / Stop Validation
  // -------------------------------------------------------------------------
  console.log("\n4. Missing Transport Route / Stop Validation:");

  const invalidTransportPayload: AdmissionWizardPayload = {
    ...payloadWithAll,
    step1_basic: {
      ...payloadWithAll.step1_basic,
      first_name: "InvalidStop",
    },
    step7_transport: {
      opt_in: true,
      route_id: "", // missing route_id
      stop_id: "",  // missing stop_id
    },
  };

  const invalidRes = await admitStudentTransactional(schoolId, invalidTransportPayload, actorId, "admin");
  assert(invalidRes.rolledBack === true, "Missing transport parameters causes atomic rollback");
  assert(invalidRes.error?.includes("Transport route and stop are required") === true, "Returns clear validation error");

  // -------------------------------------------------------------------------
  // 5. RTE Exemption on Fee Structure Assignment
  // -------------------------------------------------------------------------
  console.log("\n5. RTE Exemption on Fee Structure Assignment:");

  const rtePayload: AdmissionWizardPayload = {
    ...payloadWithAll,
    step1_basic: {
      ...payloadWithAll.step1_basic,
      first_name: "RTEChild",
      last_name: "Kumar",
    },
    step2_guardian: {
      ...payloadWithAll.step2_guardian,
      father: {
        ...payloadWithAll.step2_guardian.father!,
        phone: "9876547777",
      },
    },
    step3_academic: {
      ...payloadWithAll.step3_academic,
      is_rte: true, // RTE Child
    },
    step7_transport: {
      opt_in: false,
    },
    step8_fee: {
      fee_structure_id: structureId,
    },
  };

  const rteRes = await admitStudentTransactional(schoolId, rtePayload, actorId, "admin");
  assert(rteRes.error === undefined, "RTE student admitted successfully");
  const rteStudent = rteRes.student!;

  const duesAfterRte: StudentDue[] = JSON.parse(localStorage.getItem(`myzkool_student_dues_${schoolId}`) || "[]");
  const rteDues = duesAfterRte.filter((d) => d.student_id === rteStudent.id && d.source === "structure");

  assert(rteDues.length === 2, "Created 2 fee dues for RTE child");
  assert(rteDues.every((d) => d.concession_paise === d.gross_paise), "RTE child received 100% concession on waivable fee head");
  assert(rteDues.every((d) => d.net_paise === 0), "RTE child net payable is 0");
  assert(rteDues.every((d) => d.status === "waived"), "RTE child due status marked as waived");

  console.log("\n----------------------------------------------------------");
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed.`);
  console.log("----------------------------------------------------------");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
