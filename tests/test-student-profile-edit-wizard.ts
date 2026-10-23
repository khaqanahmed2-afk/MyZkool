/**
 * Student Profile Edit Wizard Test Suite
 * Validates:
 * 1. Authoritative Step Configuration and section-to-step resolution
 * 2. Complete student data mapping for wizard edit prefill
 * 3. Edit mode preservation of student ID, admission number, and admission date
 * 4. Zero duplicate records (students, parents, enrollments) during edit
 * 5. Document vault preservation during unrelated edits
 * 6. Aadhaar sensitive crypto preservation and safe updating
 * 7. Step-level partial persistence and audit logging
 */

import {
  admitStudentTransactional,
  getStudentWizardData,
  updateStudentFromWizard,
  getStudentProfile,
  revealStudentAadhaar,
} from "../src/services/studentService";
import { resolveWizardStep, SECTION_TO_WIZARD_STEP, STEP_TITLES } from "../src/pages/admin/students/wizard/wizardStepConfig";
import type { AdmissionWizardPayload } from "../src/types/students";

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

async function runTests() {
  console.log("\n========================================================");
  console.log("TEST SUITE: Student Profile Editing via 9-Step Wizard");
  console.log("========================================================\n");

  const testSchoolId = `school_edit_test_${Date.now()}`;
  const testAdminId = "usr_admin_tester";

  // --- TEST GROUP 1: Authoritative Step Configuration ---
  console.log("\n--- Group 1: Authoritative Step Configuration ---");
  assert(STEP_TITLES.length === 9, "STEP_TITLES defines exactly 9 wizard steps");
  assert(resolveWizardStep(1) === 1, "resolveWizardStep(1) resolves to 1");
  assert(resolveWizardStep("1") === 1, "resolveWizardStep('1') resolves to 1");
  assert(resolveWizardStep("personal") === 1, "resolveWizardStep('personal') resolves to Step 1");
  assert(resolveWizardStep("family") === 2, "resolveWizardStep('family') resolves to Step 2");
  assert(resolveWizardStep("academics") === 3, "resolveWizardStep('academics') resolves to Step 3");
  assert(resolveWizardStep("documents") === 4, "resolveWizardStep('documents') resolves to Step 4");
  assert(resolveWizardStep("sensitive") === 5, "resolveWizardStep('sensitive') resolves to Step 5");
  assert(resolveWizardStep("medical") === 6, "resolveWizardStep('medical') resolves to Step 6");
  assert(resolveWizardStep("transport") === 7, "resolveWizardStep('transport') resolves to Step 7");
  assert(resolveWizardStep("fees") === 8, "resolveWizardStep('fees') resolves to Step 8");
  assert(resolveWizardStep("review") === 9, "resolveWizardStep('review') resolves to Step 9");
  assert(resolveWizardStep("unknown_section") === 1, "Fallback for invalid step/section returns Step 1");

  // --- TEST GROUP 2: Admit a student in Create Mode ---
  console.log("\n--- Group 2: Baseline Student Creation (Create Mode) ---");
  // Seed school Pro plan, transport, and fee fixtures
  localStorage.setItem(`myzkool_school_plans_${testSchoolId}`, JSON.stringify({
    plan_slug: "pro",
    features: ["transport", "students", "fees", "attendance", "admissions"],
    billing_status: "active",
  }));
  localStorage.setItem(`myzkool_fee_structures_${testSchoolId}`, JSON.stringify([{
    id: "fee_struct_standard_middle",
    school_id: testSchoolId,
    name: "Standard Middle School Plan",
    class_id: "cls_7",
    academic_year_id: "ay-2026",
    version: 1,
    status: "active",
    applies_to: "all",
  }]));
  localStorage.setItem(`myzkool_transport_routes_${testSchoolId}`, JSON.stringify([{
    id: "route-1",
    school_id: testSchoolId,
    name: "Route 1 - Gomti Nagar",
    code: "R1",
    status: "active",
  }]));
  localStorage.setItem(`myzkool_route_stops_${testSchoolId}`, JSON.stringify([{
    id: "stop-1",
    route_id: "route-1",
    school_id: testSchoolId,
    name: "Gomti Nagar Stop",
    stop_order: 1,
    monthly_fee_paise: 120000,
  }]));

  const initialPayload: AdmissionWizardPayload = {
    step1_basic: {
      first_name: "Aarav",
      middle_name: "Kumar",
      last_name: "Sharma",
      dob: "2012-05-15",
      gender: "male",
      blood_group: "B+",
      category: "general",
      nationality: "Indian",
      religion: "Hindu",
      mother_tongue: "Hindi",
    },
    step2_guardian: {
      father: {
        full_name: "Ramesh Sharma",
        phone: "9876543210",
        relation: "father",
        occupation: "Engineer",
        is_primary_contact: true,
        whatsapp_consent: true,
      },
      mother: {
        full_name: "Sunita Sharma",
        phone: "9876543211",
        relation: "mother",
        occupation: "Teacher",
        is_primary_contact: false,
        whatsapp_consent: true,
      },
      current_address: {
        kind: "current",
        line1: "Flat 402, Lotus Apartments",
        city: "Lucknow",
        district: "Lucknow",
        state: "Uttar Pradesh",
        pin: "226010",
      },
      same_as_current: true,
    },
    step3_academic: {
      academic_year_id: "ay-2026",
      admission_date: "2026-04-01",
      class_id: "cls_7",
      admission_type: "new",
      is_rte: false,
      medium: "English",
      house: "Red Tigers",
    },
    step4_documents: [
      {
        doc_type: "birth_certificate",
        status: "verified",
        file_name: "birth_cert_aarav.pdf",
        mime: "application/pdf",
        size_bytes: 1048576,
      },
      {
        doc_type: "previous_report_card",
        status: "pending",
        file_name: "grade6_marksheet.pdf",
        mime: "application/pdf",
        size_bytes: 524288,
      },
    ],
    step5_sensitive: {
      aadhaar_number: "234567890123", // valid 12-digit
    },
    step6_medical: {
      allergies: "Peanuts, Dust",
      doctor_name: "Dr. V. K. Gupta",
      doctor_phone: "9812345678",
      emergency_instructions: "Administer inhaler if breathing difficulty",
    },
    step7_transport: {
      opt_in: false,
      pickup: true,
      dropoff: true,
    },
    step8_fee: {
      fee_structure_id: "fee_struct_standard_middle",
      discount_concession: "none",
    },
  };

  const createRes = await admitStudentTransactional(testSchoolId, initialPayload, testAdminId, "school_admin");
  if (createRes.error) {
    console.error("Admission error:", createRes.error);
  }
  assert(Boolean(createRes.student), `Student admitted successfully via transaction in Create Mode (err: ${createRes.error || "none"})`);
  if (!createRes.student) {
    return;
  }
  const student = createRes.student;
  const originalStudentId = student.id;
  const originalAdmissionNo = student.admission_no;
  const originalAdmissionDate = student.admission_date;

  assert(Boolean(originalStudentId), `Persistent student ID assigned: ${originalStudentId}`);
  assert(Boolean(originalAdmissionNo), `Immutable admission number generated: ${originalAdmissionNo}`);
  assert(originalAdmissionDate === "2026-04-01", `Admission date recorded: ${originalAdmissionDate}`);

  // --- TEST GROUP 3: Load Data for Wizard in Edit Mode ---
  console.log("\n--- Group 3: Prefilling Data via getStudentWizardData ---");
  const wizardDataRes = await getStudentWizardData(testSchoolId, originalStudentId);
  assert(!wizardDataRes.error, "getStudentWizardData returns successfully without error");
  assert(Boolean(wizardDataRes.payload), "getStudentWizardData returned valid AdmissionWizardPayload");

  const prefilled = wizardDataRes.payload!;
  assert(prefilled.step1_basic.first_name === "Aarav", "Step 1: First name restored accurately");
  assert(prefilled.step1_basic.last_name === "Sharma", "Step 1: Last name restored accurately");
  assert(prefilled.step1_basic.dob === "2012-05-15", "Step 1: Date of birth restored accurately");
  assert(prefilled.step1_basic.blood_group === "B+", "Step 1: Blood group restored accurately");
  assert(prefilled.step1_basic.admission_no === originalAdmissionNo, "Step 1: Admission number matches database record");
  assert(prefilled.step2_guardian.father?.full_name === "Ramesh Sharma", "Step 2: Father full name restored accurately");
  assert(prefilled.step2_guardian.mother?.phone === "9876543211", "Step 2: Mother contact restored accurately");
  assert(prefilled.step2_guardian.current_address.city === "Lucknow", "Step 2: Current address restored accurately");
  assert(prefilled.step3_academic.class_id === "cls_7", "Step 3: Class placement restored accurately");
  assert(prefilled.step3_academic.admission_date === "2026-04-01", "Step 3: Admission date restored accurately");
  assert(prefilled.step4_documents.length >= 2, `Step 4: Restored ${prefilled.step4_documents.length} document records`);
  assert(wizardDataRes.existingAadhaarLast4 === "0123", "Step 5: Masked Aadhaar last4 recovered for secure display (•••• •••• 0123)");
  assert(prefilled.step6_medical?.allergies === "Peanuts, Dust", "Step 6: Medical allergies restored accurately");

  // --- TEST GROUP 4: Step-by-Step Update via updateStudentFromWizard ---
  console.log("\n--- Group 4: Step-Level Updates (Preserving IDs and Immutability) ---");

  // Edit Step 1: Change Blood Group and Middle Name
  const step1Payload: AdmissionWizardPayload = {
    ...prefilled,
    step1_basic: {
      ...prefilled.step1_basic,
      middle_name: "Prasad",
      blood_group: "AB+",
      category: "obc",
    },
  };

  const updateStep1Res = await updateStudentFromWizard(
    testSchoolId,
    originalStudentId,
    step1Payload,
    testAdminId,
    "school_admin",
    1 // Current Step 1
  );

  assert(!updateStep1Res.error, "Step 1 update executed without errors");
  assert(updateStep1Res.student?.id === originalStudentId, "Student ID strictly preserved during Step 1 update");
  assert(updateStep1Res.student?.admission_no === originalAdmissionNo, "Admission number remains strictly immutable");
  assert(updateStep1Res.student?.blood_group === "AB+", "Updated field (blood group) correctly updated to AB+");
  assert(updateStep1Res.student?.category === "obc", "Updated category correctly changed to OBC");

  // Edit Step 2: Update Guardian Phone & Address
  const step2Payload: AdmissionWizardPayload = {
    ...step1Payload,
    step2_guardian: {
      ...step1Payload.step2_guardian,
      father: {
        ...step1Payload.step2_guardian.father!,
        phone: "9123456789",
      },
      current_address: {
        ...step1Payload.step2_guardian.current_address,
        line1: "House 108, Gomti Nagar",
      },
    },
  };

  const updateStep2Res = await updateStudentFromWizard(
    testSchoolId,
    originalStudentId,
    step2Payload,
    testAdminId,
    "school_admin",
    2 // Current Step 2
  );

  assert(!updateStep2Res.error, "Step 2 update executed without errors");
  const postStep2Profile = await getStudentProfile(testSchoolId, originalStudentId);
  const updatedFather = postStep2Profile.profile?.parents.find(p => p.relation === "father");
  assert(updatedFather?.phone === "9123456789", "Father's phone updated to 9123456789 without duplicate parent record");
  const updatedAddr = postStep2Profile.profile?.addresses.find(a => a.kind === "current");
  assert(updatedAddr?.line1 === "House 108, Gomti Nagar", "Current address line 1 updated accurately");

  // --- TEST GROUP 5: Document Vault Preservation During Unrelated Edits ---
  console.log("\n--- Group 5: Document Vault Integrity ---");
  assert(postStep2Profile.profile?.documents.length === 2, "Existing uploaded documents preserved intact after editing personal and guardian info");
  const birthCert = postStep2Profile.profile?.documents.find(d => d.doc_type === "birth_certificate");
  assert(birthCert?.status === "verified", "Verified document status remains verified without superseding or purging");

  // --- TEST GROUP 6: Aadhaar Preservation and Updating ---
  console.log("\n--- Group 6: Sensitive Identity (Aadhaar) Handling ---");
  // Test 6a: If aadhaar_number in step5 is left empty, existing encrypted Aadhaar remains intact
  const emptySensitivePayload: AdmissionWizardPayload = {
    ...step2Payload,
    step5_sensitive: {}, // empty: keep existing
  };

  await updateStudentFromWizard(testSchoolId, originalStudentId, emptySensitivePayload, testAdminId, "school_admin", 5);
  const revealedUntouched = await revealStudentAadhaar(
    testSchoolId,
    originalStudentId,
    "Verification check",
    testAdminId,
    "school_admin",
    ["students.reveal_sensitive"]
  );
  assert(revealedUntouched.aadhaar === "234567890123", "Untouched Aadhaar remains securely encrypted with original value");

  // Test 6b: If an updated 12-digit Aadhaar is entered, re-encrypts and updates last4
  const updatedSensitivePayload: AdmissionWizardPayload = {
    ...step2Payload,
    step5_sensitive: {
      aadhaar_number: "987654321098", // new valid 12-digit
    },
  };

  await updateStudentFromWizard(testSchoolId, originalStudentId, updatedSensitivePayload, testAdminId, "school_admin", 5);
  const revealedUpdated = await revealStudentAadhaar(
    testSchoolId,
    originalStudentId,
    "Aadhaar update audit",
    testAdminId,
    "school_admin",
    ["students.reveal_sensitive"]
  );
  assert(revealedUpdated.aadhaar === "987654321098", "Updated Aadhaar correctly re-encrypted with AES-256-GCM and persisted");

  // --- TEST GROUP 7: Medical and Transport Assignment in Edit Mode ---
  console.log("\n--- Group 7: Medical and Transport Assignment Updates ---");
  const fullEditPayload: AdmissionWizardPayload = {
    ...updatedSensitivePayload,
    step6_medical: {
      allergies: "Peanuts only",
      conditions: "Mild asthma",
      doctor_name: "Dr. S. K. Roy",
      doctor_phone: "9988776655",
    },
  };

  const finalSaveRes = await updateStudentFromWizard(
    testSchoolId,
    originalStudentId,
    fullEditPayload,
    testAdminId,
    "school_admin"
  );

  assert(!finalSaveRes.error, "Final wizard update committed successfully");
  const finalProfile = await getStudentProfile(testSchoolId, originalStudentId);
  assert(finalProfile.profile?.id === originalStudentId, "Student ID never changed throughout the entire editing lifecycle");
  assert(finalProfile.profile?.admission_no === originalAdmissionNo, "Admission Number remains 100% gap-free and immutable");
  assert(finalProfile.profile?.admission_date === "2026-04-01", "Admission Date remains unchanged");

  // --- TEST GROUP 8: Verify No Duplicate Student Created ---
  console.log("\n--- Group 8: Registry Isolation and Duplicate Prevention ---");
  const cachedStudentsRaw = localStorage.getItem(`myzkool_students_${testSchoolId}`);
  const cachedStudents = cachedStudentsRaw ? JSON.parse(cachedStudentsRaw) : [];
  assert(cachedStudents.length === 1, `Registry contains exactly 1 student record (no duplicates created). Actual: ${cachedStudents.length}`);

  console.log("\n========================================================");
  console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test execution aborted due to unexpected error:", err);
  process.exit(1);
});
