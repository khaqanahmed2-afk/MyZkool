/**
 * Comprehensive Verification Test Suite: Student ID Card Studio
 * Tests Themes, Customization Engine, Local QR Generation,
 * Verification Tokens, Tenant Isolation, and Public Identity Portal Safety.
 */

import {
  fetchEnrichedStudentIdCards,
  getIdCardCustomization,
  saveIdCardCustomization,
  DEFAULT_CUSTOMIZATION,
  generateQrCodeDataUrl,
  generateRandomToken,
  updateStudentCardStatus,
  verifyStudentCardToken,
  EnrichedStudentIdCard,
} from "../src/services/idCardService";
import { ID_CARD_THEMES, getThemeDefinition, THEME_LIST } from "../src/components/admin/students/id-cards/themeRegistry";
import type { Student, StudentEnrollment, Parent, StudentParent, StudentAddress } from "../src/types/students";

// Mock localStorage for headless Node/tsx test runner
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => store.get(key) || null,
  setItem: (key: string, value: string) => {
    store.set(key, value);
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

async function runStudioTests() {
  console.log("========================================================");
  console.log("TEST SUITE: Student ID Card Studio Comprehensive Verification");
  console.log("========================================================");

  const schoolA = "sch_alpha_01";
  const schoolB = "sch_beta_02";

  // 1. Setup School Profiles
  localStorage.setItem(
    `myzkool_school_profile_school_${schoolA}`,
    JSON.stringify({
      id: schoolA,
      name: "Peace Convent School",
      address: "123 Educational Blvd",
      city: "Ayodhya",
      state: "Uttar Pradesh",
      pin_code: "224117",
      contact_phone: "+91 8400404002",
      official_email: "office@peaceconvent.edu",
      logo_url: "https://myzkool.com/assets/peace-convent.png",
    })
  );

  localStorage.setItem(
    `myzkool_school_profile_school_${schoolB}`,
    JSON.stringify({
      id: schoolB,
      name: "St. Xavier Academy",
      address: "456 Academy Road",
      city: "Lucknow",
      state: "Uttar Pradesh",
      pin_code: "226001",
      contact_phone: "+91 9999999999",
      official_email: "principal@stxavier.edu",
      logo_url: "https://myzkool.com/assets/stxavier.png",
    })
  );

  // 2. Setup Classes & Sections for School A
  const classesA = [
    { id: "cls_10", school_id: schoolA, name: "Class 10" },
    { id: "cls_11", school_id: schoolA, name: "Class 11" },
  ];
  localStorage.setItem(`myzkool_classes_${schoolA}`, JSON.stringify(classesA));

  const sectionsA = [
    { id: "sec_10a", school_id: schoolA, class_id: "cls_10", name: "Section A" },
    { id: "sec_11b", school_id: schoolA, class_id: "cls_11", name: "Section B" },
  ];
  localStorage.setItem(`myzkool_sections_${schoolA}`, JSON.stringify(sectionsA));

  // 3. Setup Students for School A
  const student1: Student = {
    id: "std_01_saanvi",
    school_id: schoolA,
    admission_no: "ADM-2026-0001",
    first_name: "Saanvi",
    middle_name: "K.",
    last_name: "Meena",
    dob: "2010-08-15",
    gender: "female",
    blood_group: "O+",
    photo_path: "https://myzkool.com/photos/saanvi.jpg",
    status: "enrolled",
    admission_date: "2026-04-01",
    admission_type: "new",
    nationality: "Indian",
    is_rte: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const student2: Student = {
    id: "std_02_arjun",
    school_id: schoolA,
    admission_no: "ADM-2026-0002",
    first_name: "Arjun",
    last_name: "Kapoor",
    dob: "2011-03-22",
    gender: "male",
    blood_group: null, // Test missing optional blood group
    photo_path: null, // Test missing student photo
    status: "enrolled",
    admission_date: "2026-04-05",
    admission_type: "new",
    nationality: "Indian",
    is_rte: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  localStorage.setItem(`myzkool_students_${schoolA}`, JSON.stringify([student1, student2]));

  // Setup Enrollments (with roll_no)
  const enrollmentsA: StudentEnrollment[] = [
    {
      id: "enr_01",
      school_id: schoolA,
      student_id: student1.id,
      academic_year_id: "ay_2026_27",
      class_id: "cls_10",
      section_id: "sec_10a",
      roll_no: "14",
      status: "active",
      enrolled_on: "2026-04-01",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "enr_02",
      school_id: schoolA,
      student_id: student2.id,
      academic_year_id: "ay_2026_27",
      class_id: "cls_11",
      section_id: "sec_11b",
      roll_no: null, // Test missing roll number
      status: "active",
      enrolled_on: "2026-04-05",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  localStorage.setItem(`myzkool_student_enrollments_${schoolA}`, JSON.stringify(enrollmentsA));

  // Setup Student Addresses
  const address1: StudentAddress = {
    id: "addr_01",
    school_id: schoolA,
    student_id: student1.id,
    kind: "current",
    line1: "Flat 402, Lotus Enclave",
    line2: "Civil Lines",
    city: "Ayodhya",
    district: "Ayodhya",
    state: "Uttar Pradesh",
    pin: "224001",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  localStorage.setItem(`myzkool_student_addresses_${schoolA}`, JSON.stringify([address1]));

  // Setup Parents & Links
  const parent1: Parent = {
    id: "par_01",
    school_id: schoolA,
    full_name: "Dr. Rajesh Meena",
    phone: "9876500001",
    email: "rajesh.meena@example.com",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  localStorage.setItem(`myzkool_parents_${schoolA}`, JSON.stringify([parent1]));

  const studentParentsA: StudentParent[] = [
    {
      id: "sp_01",
      school_id: schoolA,
      student_id: student1.id,
      parent_id: parent1.id,
      relation: "father",
      is_primary_contact: true,
      is_fee_payer: true,
      is_emergency_contact: true,
      can_pickup: true,
      lives_with: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  localStorage.setItem(`myzkool_student_parents_${schoolA}`, JSON.stringify(studentParentsA));

  // ----------------------------------------------------
  // TEST GROUP 1: Enriched ID Card Data Fetching
  // ----------------------------------------------------
  console.log("\n--- Group 1: Enriched ID Card Data Retrieval ---");
  const enrichedList = await fetchEnrichedStudentIdCards(schoolA);
  assert(enrichedList.length === 2, `Fetched exactly 2 students for School A (actual: ${enrichedList.length})`);

  const card1 = enrichedList.find((c) => c.student_id === student1.id)!;
  assert(Boolean(card1), "Card 1 for Saanvi Meena was found");
  assert(card1.full_name === "Saanvi K. Meena", `Full name formatted with middle name (actual: ${card1.full_name})`);
  assert(card1.admission_no === "ADM-2026-0001", "Admission number correct");
  assert(card1.roll_no === "14", `Roll number extracted from enrollment (actual: ${card1.roll_no})`);
  assert(card1.class_name === "Class 10", `Class name resolved (actual: ${card1.class_name})`);
  assert(card1.section_name === "Section A", `Section name resolved (actual: ${card1.section_name})`);
  assert(card1.blood_group === "O+", `Blood group present (actual: ${card1.blood_group})`);
  assert(card1.dob === "2010-08-15", `DOB preserved (actual: ${card1.dob})`);
  assert(card1.photo_url === "https://myzkool.com/photos/saanvi.jpg", "Photo URL preserved");
  assert(card1.father_name === "Dr. Rajesh Meena", "Father name resolved");
  assert(card1.guardian_phone === "9876500001", "Guardian phone resolved");
  assert(card1.student_address?.includes("Lotus Enclave"), `Address correctly mapped (actual: ${card1.student_address})`);
  assert(card1.school_name === "Peace Convent School", `School name retrieved (actual: ${card1.school_name})`);
  assert(card1.card_status === "active", `Initial card status is active (actual: ${card1.card_status})`);

  // ----------------------------------------------------
  // TEST GROUP 2: Missing Optional Fields Graceful Handling
  // ----------------------------------------------------
  console.log("\n--- Group 2: Missing Photo and Optional Fields Handling ---");
  const card2 = enrichedList.find((c) => c.student_id === student2.id)!;
  assert(card2.photo_url === null, "Missing student photo returns null gracefully");
  assert(card2.blood_group === null, "Missing blood group returns null without error");
  assert(card2.roll_no === null, "Missing roll number returns null gracefully");
  assert(card2.student_address !== undefined, "Student with no address record receives fallback address notice");

  // ----------------------------------------------------
  // TEST GROUP 3: QR Code Generation & Tokens
  // ----------------------------------------------------
  console.log("\n--- Group 3: Local QR Code Generation & Security Tokens ---");
  assert(Boolean(card1.verification_token), `Card has unique verification token: ${card1.verification_token}`);
  assert(card1.verification_url.includes(card1.verification_token), "Verification URL encodes unique token");
  assert(!card1.verification_url.includes(card1.guardian_phone), "QR URL NEVER exposes private phone number");
  assert(!card1.verification_url.includes("Lotus Enclave"), "QR URL NEVER exposes private residential address");

  // Generate QR image data URL locally with qrcode package
  const qrImage = await generateQrCodeDataUrl(card1.verification_url);
  assert(qrImage.startsWith("data:image/png;base64,"), "Locally generates base64 PNG QR code with qrcode package");
  assert(qrImage.length > 500, `QR data URL is valid high-resolution payload (bytes: ${qrImage.length})`);

  // ----------------------------------------------------
  // TEST GROUP 4: Public Verification Portal Security
  // ----------------------------------------------------
  console.log("\n--- Group 4: Safe Public Verification Endpoint ---");
  const verifyResult = await verifyStudentCardToken(card1.verification_token);
  assert(verifyResult.is_valid === true, "Token verified as valid active card");
  assert(verifyResult.student_name === "Saanvi Meena" || verifyResult.student_name?.includes("Saanvi"), `Student name verified (actual: ${verifyResult.student_name})`);
  assert(verifyResult.admission_no === "ADM-2026-0001", "Admission number verified");
  assert(verifyResult.school_name === "Peace Convent School", "School identity verified");
  assert((verifyResult as any).guardian_phone === undefined, "CRITICAL: Guardian phone is NOT returned in public verification");
  assert((verifyResult as any).student_address === undefined, "CRITICAL: Private student address is NOT returned in public verification");

  // ----------------------------------------------------
  // TEST GROUP 5: Card Status Lifecycle (Active -> Inactive -> Revoked)
  // ----------------------------------------------------
  console.log("\n--- Group 5: Card Status Management & Revocation ---");
  // 1. Mark Inactive
  await updateStudentCardStatus(schoolA, student1.id, "inactive");
  let statusCheck = await verifyStudentCardToken(card1.verification_token);
  assert(statusCheck.is_valid === false, "Inactive card reports is_valid = false");
  assert(statusCheck.card_status === "inactive", "Status reports inactive");

  // 2. Mark Revoked with Reason
  const revokeReason = "Card reported stolen on school bus 4; replacement card issued.";
  await updateStudentCardStatus(schoolA, student1.id, "revoked", revokeReason);
  statusCheck = await verifyStudentCardToken(card1.verification_token);
  assert(statusCheck.is_valid === false, "Revoked card reports is_valid = false");
  assert(statusCheck.card_status === "revoked", "Status reports revoked");
  assert(statusCheck.revocation_reason === revokeReason, "Revocation reason accurately conveyed");

  // 3. Reinstate Active
  await updateStudentCardStatus(schoolA, student1.id, "active");
  statusCheck = await verifyStudentCardToken(card1.verification_token);
  assert(statusCheck.is_valid === true, "Reinstated card is valid again");

  // ----------------------------------------------------
  // TEST GROUP 6: Invalid / Fabricated Token Rejection
  // ----------------------------------------------------
  console.log("\n--- Group 6: Invalid Token Rejection ---");
  const badTokenResult = await verifyStudentCardToken("invalid_fake_token_12345");
  assert(badTokenResult.is_valid === false, "Fabricated token is rejected gracefully");
  assert(Boolean(badTokenResult.error), "Clear verification error returned");

  // ----------------------------------------------------
  // TEST GROUP 7: Customization Engine & Registry
  // ----------------------------------------------------
  console.log("\n--- Group 7: Customization Settings & Theme Registry ---");
  const defaultCustom = getIdCardCustomization(schoolA);
  assert(defaultCustom.themeId === "modern_blue_yellow", "Default theme is Modern Blue & Yellow");
  assert(defaultCustom.primaryColor === "#1E3A8A", "Default primary color is Royal Blue");
  assert(defaultCustom.showSchoolLogo === true, "School logo enabled by default");

  // Save new customization
  saveIdCardCustomization(schoolA, {
    themeId: "minimal_blue_white",
    photoShape: "circle",
    showBarcode: true,
  });

  const updatedCustom = getIdCardCustomization(schoolA);
  assert(updatedCustom.themeId === "minimal_blue_white", "Theme updated to Minimal Blue & White");
  assert(updatedCustom.photoShape === "circle", "Photo shape updated to circle");
  assert(updatedCustom.showBarcode === true, "Barcode toggle persisted");

  // Theme Registry Tests
  assert(THEME_LIST.length >= 2, `Theme registry has at least 2 themes (actual: ${THEME_LIST.length})`);
  assert(Boolean(ID_CARD_THEMES.modern_blue_yellow), "Modern Blue & Yellow theme registered");
  assert(Boolean(ID_CARD_THEMES.minimal_blue_white), "Minimal Blue & White theme registered");
  const def1 = getThemeDefinition("modern_blue_yellow");
  assert(def1.supportsCustomColors === true, "Modern theme supports custom color accents");
  const def2 = getThemeDefinition("minimal_blue_white");
  assert(def2.category === "minimal", "Minimal theme categorized as minimal");

  // Unknown theme fallback
  const fallbackDef = getThemeDefinition("non_existent_future_theme");
  assert(fallbackDef.id === "modern_blue_yellow", "Unknown theme ID falls back to default safely");

  // ----------------------------------------------------
  // TEST GROUP 8: Multi-Tenant Isolation
  // ----------------------------------------------------
  console.log("\n--- Group 8: Multi-Tenant Isolation ---");
  const schoolBCards = await fetchEnrichedStudentIdCards(schoolB);
  assert(schoolBCards.length === 0, `School B has 0 cards, no leak from School A (actual: ${schoolBCards.length})`);

  console.log("\n========================================================");
  console.log(`ALL TESTS COMPLETE: ${passed} passed, ${failed} failed`);
  console.log("========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runStudioTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
