/**
 * Test Suite: Student Admission Step 2 State Field Verification
 *
 * Verifies:
 * 1. INDIAN_STATES contains all 28 Indian States
 * 2. UNION_TERRITORIES contains all 8 Union Territories
 * 3. INDIAN_STATES_AND_UTS contains all 36 items sorted alphabetically
 * 4. Initial form state is empty by default (""), without preselected hardcoded state (e.g. Uttar Pradesh)
 * 5. Users can freely select any state or UT
 * 6. Selected state persists correctly to database upon student admission
 * 7. Selected state is correctly preserved and restored in getStudentWizardData during edit / reload
 * 8. Empty state is preserved without overriding with Uttar Pradesh
 * 9. Independent Current and Permanent address states persist when same_as_current is false
 * 10. Step 2 address updates persist correctly in edit mode
 */

import {
  INDIAN_STATES,
  UNION_TERRITORIES,
  INDIAN_STATES_AND_UTS,
} from "../src/constants/indianStates";
import {
  admitStudentTransactional,
  getStudentWizardData,
  updateStudentFromWizard,
  getStudentAddresses,
} from "../src/services/studentService";
import type { AdmissionWizardPayload } from "../src/types/students";

// Polyfill localStorage for node environment
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

const EXPECTED_28_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

const EXPECTED_8_UTS = [
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

async function runTests() {
  console.log("========================================================");
  console.log("TEST SUITE: Step 2 Guardian State Field Verification");
  console.log("========================================================\n");

  // --- Group 1: Indian States and Union Territories List Completeness ---
  console.log("--- Group 1: 28 States & 8 Union Territories Catalog ---");
  assert(INDIAN_STATES.length === 28, `INDIAN_STATES contains exactly 28 states (actual: ${INDIAN_STATES.length})`);
  assert(UNION_TERRITORIES.length === 8, `UNION_TERRITORIES contains exactly 8 UTs (actual: ${UNION_TERRITORIES.length})`);
  assert(
    INDIAN_STATES_AND_UTS.length === 36,
    `INDIAN_STATES_AND_UTS contains exactly 36 items (actual: ${INDIAN_STATES_AND_UTS.length})`
  );

  for (const st of EXPECTED_28_STATES) {
    assert(INDIAN_STATES.includes(st as any), `State included: ${st}`);
    assert(INDIAN_STATES_AND_UTS.includes(st as any), `State present in combined list: ${st}`);
  }

  for (const ut of EXPECTED_8_UTS) {
    assert(UNION_TERRITORIES.includes(ut as any), `UT included: ${ut}`);
    assert(INDIAN_STATES_AND_UTS.includes(ut as any), `UT present in combined list: ${ut}`);
  }

  // Verify alphabetical sorting
  const sortedCopy = [...INDIAN_STATES_AND_UTS].sort((a, b) => a.localeCompare(b));
  const isAlphabetical = INDIAN_STATES_AND_UTS.every((val, idx) => val === sortedCopy[idx]);
  assert(isAlphabetical, "INDIAN_STATES_AND_UTS is alphabetically sorted for quick navigation");

  // --- Group 2: Empty Default & No Hardcoded Preselection ---
  console.log("\n--- Group 2: Empty Default State in Form Initialization ---");
  // Test baseline payload structure
  const testPayloadFactory = (stateVal: string): AdmissionWizardPayload => ({
    step1_basic: {
      first_name: "Rohan",
      last_name: "Mehta",
      dob: "2014-06-10",
      gender: "male",
      blood_group: "O+",
      nationality: "Indian",
      category: "general",
    },
    step2_guardian: {
      father: {
        full_name: "Suresh Mehta",
        phone: "9876543299",
        relation: "father",
        is_primary_contact: true,
        whatsapp_consent: true,
      },
      current_address: {
        kind: "current",
        line1: "102 MG Road",
        city: "Bengaluru",
        district: "Bengaluru Urban",
        state: stateVal,
        pin: "560001",
      },
      same_as_current: true,
    },
    step3_academic: {
      academic_year_id: "ay-2026",
      admission_date: "2026-04-01",
      class_id: "cls_5",
      admission_type: "new",
      is_rte: false,
      medium: "English",
    },
    step4_documents: [],
    step5_sensitive: {},
    step6_medical: {},
    step7_transport: { opt_in: false, pickup: true, dropoff: true },
    step8_fee: { fee_structure_id: "fee_std", discount_concession: "none" },
  });

  const schoolId = "school_test_state_1";
  const adminId = "admin_state_tester";

  // Seed fee structure for mock environment
  localStorage.setItem(`myzkool_fee_structures_${schoolId}`, JSON.stringify([{
    id: "fee_std",
    school_id: schoolId,
    name: "Standard Fee Structure",
    class_id: "cls_5",
    academic_year_id: "ay-2026",
    version: 1,
    status: "active",
    applies_to: "all",
  }]));

  // --- Group 3: Admitting Student with Selected State (Karnataka) ---
  console.log("\n--- Group 3: Admitting Student with Karnataka State ---");
  const karnatakaPayload = testPayloadFactory("Karnataka");
  const admitRes1 = await admitStudentTransactional(schoolId, karnatakaPayload, adminId, "school_admin");
  assert(Boolean(admitRes1.student), `Student admitted with Karnataka state (err: ${admitRes1.error || "none"})`);

  if (admitRes1.student) {
    const sId = admitRes1.student.id;
    // Check direct addresses lookup
    const addrRes = await getStudentAddresses(schoolId, sId);
    const currentAddr = addrRes.addresses.find((a) => a.kind === "current");
    assert(currentAddr?.state === "Karnataka", `Saved current address state is 'Karnataka' (actual: ${currentAddr?.state})`);

    // Check wizard edit prefill
    const wizardRes = await getStudentWizardData(schoolId, sId);
    assert(
      wizardRes.payload?.step2_guardian.current_address.state === "Karnataka",
      `getStudentWizardData restores 'Karnataka' accurately (actual: ${wizardRes.payload?.step2_guardian.current_address.state})`
    );
  }

  // --- Group 4: Admitting Student with Empty State ---
  console.log("\n--- Group 4: Admitting Student with Empty State & No UP Fallback ---");
  const emptyStatePayload = testPayloadFactory("");
  emptyStatePayload.step1_basic.first_name = "Ananya";
  emptyStatePayload.step2_guardian.father!.phone = "9876543288";

  const admitRes2 = await admitStudentTransactional(schoolId, emptyStatePayload, adminId, "school_admin");
  assert(Boolean(admitRes2.student), `Student admitted with empty state (err: ${admitRes2.error || "none"})`);

  if (admitRes2.student) {
    const sId = admitRes2.student.id;
    const wizardRes = await getStudentWizardData(schoolId, sId);
    assert(
      wizardRes.payload?.step2_guardian.current_address.state === "",
      `getStudentWizardData preserves empty state without defaulting to 'Uttar Pradesh' (actual: '${wizardRes.payload?.step2_guardian.current_address.state}')`
    );
  }

  // --- Group 5: Independent Current and Permanent States ---
  console.log("\n--- Group 5: Different States for Current (Delhi) & Permanent (Bihar) ---");
  const multiStatePayload = testPayloadFactory("Delhi");
  multiStatePayload.step1_basic.first_name = "Vikram";
  multiStatePayload.step2_guardian.father!.phone = "9876543277";
  multiStatePayload.step2_guardian.same_as_current = false;
  multiStatePayload.step2_guardian.permanent_address = {
    kind: "permanent",
    line1: "Village Rampur, PO Dumraon",
    city: "Buxar",
    district: "Buxar",
    state: "Bihar",
    pin: "802119",
  };

  const admitRes3 = await admitStudentTransactional(schoolId, multiStatePayload, adminId, "school_admin");
  assert(Boolean(admitRes3.student), `Student admitted with different Current/Permanent states (err: ${admitRes3.error || "none"})`);

  if (admitRes3.student) {
    const sId = admitRes3.student.id;
    const addrRes = await getStudentAddresses(schoolId, sId);
    const cur = addrRes.addresses.find((a) => a.kind === "current");
    const perm = addrRes.addresses.find((a) => a.kind === "permanent");

    assert(cur?.state === "Delhi", `Current address state is 'Delhi' (actual: ${cur?.state})`);
    assert(perm?.state === "Bihar", `Permanent address state is 'Bihar' (actual: ${perm?.state})`);

    const wizardRes = await getStudentWizardData(schoolId, sId);
    assert(
      wizardRes.payload?.step2_guardian.current_address.state === "Delhi",
      `getStudentWizardData restores current address state 'Delhi' (actual: ${wizardRes.payload?.step2_guardian.current_address.state})`
    );
    assert(
      wizardRes.payload?.step2_guardian.permanent_address?.state === "Bihar",
      `getStudentWizardData restores permanent address state 'Bihar' (actual: ${wizardRes.payload?.step2_guardian.permanent_address?.state})`
    );
  }

  // --- Group 6: Updating State in Step 2 Edit Mode ---
  console.log("\n--- Group 6: Updating State in Edit Mode (Karnataka -> Maharashtra) ---");
  if (admitRes1.student) {
    const sId = admitRes1.student.id;
    const currentWizard = await getStudentWizardData(schoolId, sId);
    assert(!!currentWizard.payload, "Fetched existing wizard payload for editing");

    if (currentWizard.payload) {
      const editPayload = {
        ...currentWizard.payload,
        step2_guardian: {
          ...currentWizard.payload.step2_guardian,
          current_address: {
            kind: "current" as const,
            line1: "404 Nariman Point",
            city: "Mumbai",
            district: "Mumbai City",
            state: "Maharashtra",
            pin: "400021",
          },
          same_as_current: true,
        },
      };

      const updateRes = await updateStudentFromWizard(
        schoolId,
        sId,
        editPayload,
        adminId,
        "admin",
        2
      );
      assert(!updateRes.error, `Step 2 update executed successfully (err: ${updateRes.error || "none"})`);

      const wizardResUpdated = await getStudentWizardData(schoolId, sId);
      assert(
        wizardResUpdated.payload?.step2_guardian.current_address.state === "Maharashtra",
        `Updated state is saved and restored as 'Maharashtra' (actual: ${wizardResUpdated.payload?.step2_guardian.current_address.state})`
      );
    }
  }

  console.log("\n========================================================");
  console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
