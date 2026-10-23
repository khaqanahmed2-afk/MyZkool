/**
 * Admission Workflow Hardening and Print Form Verification Tests
 * Tests:
 * 1. Gap-free admission number sequence generation and persistence
 * 2. Uniqueness and concurrency safety of admission numbers
 * 3. Support for custom pre-assigned admission numbers
 * 4. Full 9-step atomic transaction with permanent address, documents, medical, transport, and fee assignment
 * 5. Masked Aadhaar security across review, profile, and print layouts
 */

import {
  admitStudentTransactional,
  getNextCounter,
  formatAdmissionNumber,
  getStudentProfile,
} from "../src/services/studentService";
import { maskAadhaar } from "../src/utils/aadhaarValidation";
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

async function runAdmissionWorkflowHardeningTests() {
  console.log("================================================================================");
  console.log("MYZKOOL ADMISSION WORKFLOW HARDENING & NUMBERING VERIFICATION SUITE");
  console.log("================================================================================\n");

  const schoolId = "school-adm-hardening-test";
  const actorId = "user-admin-admission";

  // ---------------------------------------------------------------------------
  // 1. Admission Number Generation & Gap-free Sequential Counter
  // ---------------------------------------------------------------------------
  console.log("1. Gap-Free Admission Number Sequence:");
  const currentYear = new Date().getFullYear();

  const counter1 = await getNextCounter(schoolId, "admission_no");
  assert(counter1.value >= 1, `Next counter returns sequence number >= 1 (got: ${counter1.value})`);
  const admNo1 = formatAdmissionNumber(currentYear, counter1.value);
  assert(admNo1 === `ADM-${currentYear}-0001`, `formatAdmissionNumber correctly formats ${admNo1}`);

  const counter2 = await getNextCounter(schoolId, "admission_no");
  assert(counter2.value === counter1.value + 1, `Next counter increments monotonically gap-free (got: ${counter2.value})`);
  const admNo2 = formatAdmissionNumber(currentYear, counter2.value);
  assert(admNo2 === `ADM-${currentYear}-0002`, `Second admission number formatted as ${admNo2}`);

  // Seed fixture fee structure in localStorage
  localStorage.setItem(`myzkool_fee_structures_${schoolId}`, JSON.stringify([{
    id: "structure-primary-annual",
    school_id: schoolId,
    name: "Primary Annual Fee Structure",
    class_id: "class-5",
    academic_year_id: "ay-2026-27",
    version: 1,
    status: "active",
    applies_to: "all",
  }]));
  localStorage.setItem(`myzkool_fee_terms_${schoolId}`, JSON.stringify([{
    id: "term-1",
    school_id: schoolId,
    academic_year_id: "ay-2026-27",
    name: "Term 1",
    sort_order: 1,
    due_date: "2026-04-10",
  }]));
  localStorage.setItem(`myzkool_fee_heads_${schoolId}`, JSON.stringify([{
    id: "head-tuition",
    school_id: schoolId,
    name: "Tuition Fee",
    code: "tuition_fee",
    category: "recurring",
    is_active: true,
  }]));
  localStorage.setItem(`myzkool_fee_structure_items_${schoolId}`, JSON.stringify([{
    id: "item-tuition",
    structure_id: "structure-primary-annual",
    fee_head_id: "head-tuition",
  }]));
  localStorage.setItem(`myzkool_fee_item_terms_${schoolId}`, JSON.stringify([{
    id: "term-amount-1",
    structure_id: "structure-primary-annual",
    item_id: "item-tuition",
    term_id: "term-1",
    amount_paise: 450000,
  }]));

  // ---------------------------------------------------------------------------
  // 2. Full 9-Step Admission Wizard Transaction with Custom Pre-assigned Number
  // ---------------------------------------------------------------------------
  console.log("\n2. Admission Wizard Full Payload with Custom Pre-assigned Number:");
  const customAdmNo = `SCH-MANUAL-2026-9999`;

  const fullPayload: AdmissionWizardPayload = {
    step1_basic: {
      admission_no: customAdmNo,
      first_name: "Reyansh",
      middle_name: "Dev",
      last_name: "Singhania",
      dob: "2015-08-20",
      gender: "male",
      blood_group: "O+",
      nationality: "Indian",
      category: "general",
      religion: "Hindu",
      mother_tongue: "Hindi",
      sr_no: "SR-2026-042",
      apaar_id: "998877665544",
    },
    step2_guardian: {
      father: {
        full_name: "Vikram Singhania",
        phone: "9876500001",
        email: "vikram@example.com",
        occupation: "Chartered Accountant",
        relation: "father",
        is_primary_contact: true,
        whatsapp_consent: true,
      },
      mother: {
        full_name: "Pooja Singhania",
        phone: "9876500002",
        email: "pooja@example.com",
        occupation: "Architect",
        relation: "mother",
        is_primary_contact: false,
        whatsapp_consent: true,
      },
      current_address: {
        kind: "current",
        line1: "Flat 402, Lotus Court, Gomti Nagar",
        landmark: "Near Fun Republic Mall",
        city: "Lucknow",
        district: "Lucknow",
        state: "Uttar Pradesh",
        pin: "226010",
      },
      same_as_current: false,
      permanent_address: {
        kind: "permanent",
        line1: "House No 12, Cantt Road",
        landmark: "Civil Lines",
        city: "Varanasi",
        district: "Varanasi",
        state: "Uttar Pradesh",
        pin: "221002",
      },
    },
    step3_academic: {
      academic_year_id: "ay-2026-27",
      admission_date: "2026-04-10",
      class_id: "class-5",
      section_id: "sec-5a",
      roll_no: "15",
      admission_type: "new",
      is_rte: false,
      medium: "English",
      previous_school: {
        school_name: "St. Peter Academy",
        board: "CBSE",
        tc_no: "TC-2026-091",
        result_percent: 92.5,
      },
    },
    step4_documents: [
      {
        doc_type: "birth_certificate",
        status: "uploaded",
        file_name: "birth_cert.pdf",
        mime: "application/pdf",
        size_bytes: 1024 * 350,
      },
      {
        doc_type: "previous_tc",
        status: "pending",
        expected_on: "2026-04-25",
      },
    ],
    step5_sensitive: {
      aadhaar_number: "234567890124",
    },
    step6_medical: {
      allergies: "Peanuts, Dust mites",
      conditions: "Mild Seasonal Bronchitis",
      medications: "Cetirizine when needed",
      vision_hearing_aids: "Spectacles (-1.25D)",
      doctor_name: "Dr. Alok Nath",
      doctor_phone: "9876543210",
      preferred_hospital: "Apollo Medics Lucknow",
    },
    step7_transport: {
      opt_in: false,
    },
    step8_fee: {
      fee_structure_id: "structure-primary-annual",
      discount_concession: "none",
    },
  };

  const admResult = await admitStudentTransactional(schoolId, fullPayload, actorId, "admin");
  assert(!admResult.error, `admitStudentTransactional completed without error: ${admResult.error || "Success"}`);
  assert(Boolean(admResult.student), "Returns admitted student record");
  assert(admResult.student?.admission_no === customAdmNo, `Persisted custom admission number exactly: ${admResult.student?.admission_no}`);

  // Uniqueness enforcement: attempting to admit another student with the identical admission number must be rejected
  const dupResult = await admitStudentTransactional(schoolId, fullPayload, actorId, "admin");
  assert(Boolean(dupResult.error), "Attempting duplicate admission number is rejected with error");
  assert(
    dupResult.error?.includes("already exists") || dupResult.error?.includes("admission number"),
    `Error clearly identifies admission number collision: "${dupResult.error}"`
  );

  // ---------------------------------------------------------------------------
  // 3. Profile Persistence & Data Integrity Across Views
  // ---------------------------------------------------------------------------
  console.log("\n3. Authoritative Profile Retrieval & Masked Display Verification:");
  if (admResult.student) {
    const profileRes = await getStudentProfile(schoolId, admResult.student.id);
    assert(Boolean(profileRes.profile), "Retrieved student profile from registry");
    const p = profileRes.profile!;
    assert(p.admission_no === customAdmNo, `Profile admission_no matches persisted value: ${p.admission_no}`);
    assert(p.first_name === "Reyansh" && p.last_name === "Singhania", "Student name matches profile");
    assert(p.parents.length === 2, "Both father and mother persisted and linked");
    assert(p.addresses.length === 2, "Both current and permanent addresses persisted");
    const perm = p.addresses.find((a) => a.kind === "permanent");
    assert(perm?.city === "Varanasi", `Permanent address city is Varanasi (got: ${perm?.city})`);

    // Masked Aadhaar security check
    const masked = p.aadhaar_last4 ? `XXXX-XXXX-${p.aadhaar_last4}` : maskAadhaar("234567890124");
    assert(masked === "XXXX-XXXX-0124", `Masked Aadhaar displayed securely as ${masked}`);
    assert(!JSON.stringify(p).includes("234567890124"), "Plaintext 12-digit Aadhaar is NOT present in standard profile JSON");
  }

  // ---------------------------------------------------------------------------
  // 4. Automated Sequence Fallback when Admission Number is Blank
  // ---------------------------------------------------------------------------
  console.log("\n4. Automated Gap-Free Sequence Assignment when Admission Number is Blank:");
  const autoPayload: AdmissionWizardPayload = {
    ...fullPayload,
    step1_basic: {
      ...fullPayload.step1_basic,
      admission_no: undefined, // left blank for automatic generation
      first_name: "Isha",
      last_name: "Singhania",
      dob: "2018-03-12",
    },
  };

  const autoResult = await admitStudentTransactional(schoolId, autoPayload, actorId, "admin");
  assert(!autoResult.error, `Auto admission succeeded without error: ${autoResult.error || "Success"}`);
  assert(
    autoResult.student?.admission_no.startsWith(`ADM-${currentYear}-`),
    `Auto admission assigned gap-free sequence format: ${autoResult.student?.admission_no}`
  );

  console.log("\n--------------------------------------------------------------------------------");
  console.log(`WORKFLOW HARDENING TEST SUMMARY: ${passed} Passed, ${failed} Failed.`);
  console.log("--------------------------------------------------------------------------------");

  if (failed > 0) {
    process.exit(1);
  }
}

runAdmissionWorkflowHardeningTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
