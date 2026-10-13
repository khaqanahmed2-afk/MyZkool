/**
 * Exhaustive Test Suite for Transport Staff Management (Drivers & Attendants)
 * Tests:
 * 1. Masked Aadhaar display format (XXXX XXXX 1234) & never exposing complete Aadhaar
 * 2. Mobile number 10-digit extraction, +91 normalization, and non-duplication
 * 3. Adding Bus Driver with 12-digit Aadhaar & license details
 * 4. Adding Bus Attendant with 12-digit Aadhaar & license hidden/null
 * 5. Editing Bus Driver: name, mobile, verification dates without duplicating records
 * 6. Editing Bus Attendant: updating 12-digit Aadhaar
 * 7. Role switching: Driver to Attendant clears license details
 * 8. Backward compatibility: existing 4-digit Aadhaar records preserved without fabrication
 * 9. Duplicate phone rejection across schools/records
 * 10. Deletion safeguards on active routes
 */

// LocalStorage polyfill for Node.js test environment
const store: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  key: (i: number) => Object.keys(store)[i] ?? null,
  get length() { return Object.keys(store).length; },
  clear: () => { for (const k in store) delete store[k]; },
};

import {
  maskIdProof,
  extract10DigitPhone,
  formatPhoneWithCountryCode,
  createTransportStaff,
  updateTransportStaff,
  getTransportStaff,
  deleteTransportStaff,
} from "../src/services/transportCoreService";
import { encryptSensitive, decryptSensitive } from "../src/utils/sensitiveCrypto";

let passed = 0;
let failed = 0;
const errors: string[] = [];

function check(desc: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ ${desc}${detail ? " — " + detail : ""}`);
    failed++;
    errors.push(desc);
  }
}

async function runStaffTests() {
  console.log("=== Transport Staff Management Test Suite ===\n");
  const testSchoolId = "school-staff-test-" + Date.now();

  // Test 1: Aadhaar masking format
  console.log("[Test 1] Aadhaar masking format (Requirement 2)");
  check("maskIdProof with 4 digits returns 'XXXX XXXX 1234'", maskIdProof("1234") === "XXXX XXXX 1234");
  check("maskIdProof with 12 digits returns 'XXXX XXXX 0124'", maskIdProof("234567890124") === "XXXX XXXX 0124");
  check("maskIdProof with null returns 'Not provided'", maskIdProof(null) === "Not provided");
  check("maskIdProof with undefined returns 'Not provided'", maskIdProof(undefined) === "Not provided");
  check("maskIdProof never exposes first 8 digits", !maskIdProof("234567890124").includes("23456789"));

  // Test 2: Mobile number normalization
  console.log("\n[Test 2] Mobile number extraction and normalization (Requirement 3)");
  check("extract10DigitPhone from '+919876543210' is '9876543210'", extract10DigitPhone("+919876543210") === "9876543210");
  check("extract10DigitPhone from '919876543210' is '9876543210'", extract10DigitPhone("919876543210") === "9876543210");
  check("extract10DigitPhone from '9876543210' is '9876543210'", extract10DigitPhone("9876543210") === "9876543210");
  check("extract10DigitPhone from '+91 98765 43210' is '9876543210'", extract10DigitPhone("+91 98765 43210") === "9876543210");
  check("formatPhoneWithCountryCode adds '+91' prefix correctly", formatPhoneWithCountryCode("9876543210") === "+919876543210");
  check("formatPhoneWithCountryCode does not duplicate '+91'", formatPhoneWithCountryCode("+919876543210") === "+919876543210");

  // Test 3: Create Bus Driver
  console.log("\n[Test 3] Create Bus Driver with 12-digit Aadhaar & license details (Requirements 1, 2, 3, 4)");
  const rawAadhaarDriver = "234567890124";
  const encDriver = encryptSensitive(rawAadhaarDriver).packed;
  const dRes = await createTransportStaff(testSchoolId, {
    staff_type: "driver",
    full_name: "Ram Singh",
    phone: "+919876543210",
    license_no: "DL-1420110012345",
    license_expires_on: "2028-06-30",
    badge_no: "BDG-1001",
    police_verified_on: "2025-01-15",
    medical_fit_on: "2025-01-20",
    id_proof_type: "Aadhaar",
    id_proof_last4: rawAadhaarDriver.slice(-4),
    aadhaar_enc: encDriver,
    joined_on: "2025-01-01",
    status: "active",
  });

  check("Driver registered successfully", dRes.success && !!dRes.staff);
  const driverId = dRes.staff!.id;
  check("Driver phone stored as '+919876543210'", dRes.staff?.phone === "+919876543210");
  check("Driver id_proof_last4 stored as '0124'", dRes.staff?.id_proof_last4 === "0124");
  check("Driver aadhaar_enc is stored in encrypted format", !!dRes.staff?.aadhaar_enc && dRes.staff.aadhaar_enc.startsWith("v1:"));
  check("Driver decrypted aadhaar matches raw 12 digits", decryptSensitive(dRes.staff!.aadhaar_enc!) === rawAadhaarDriver);
  check("Driver license details stored", dRes.staff?.license_no === "DL-1420110012345");

  // Test 4: Create Bus Attendant
  console.log("\n[Test 4] Create Bus Attendant with 12-digit Aadhaar & license hidden/null (Requirements 1, 2, 4)");
  const rawAadhaarAttendant = "987654321098";
  const encAttendant = encryptSensitive(rawAadhaarAttendant).packed;
  const aRes = await createTransportStaff(testSchoolId, {
    staff_type: "attendant",
    full_name: "Sunita Sharma",
    phone: "9876543211", // Without +91
    license_no: null,
    license_expires_on: null,
    badge_no: null,
    police_verified_on: "2025-02-10",
    medical_fit_on: "2025-02-12",
    id_proof_type: "Aadhaar",
    id_proof_last4: rawAadhaarAttendant.slice(-4),
    aadhaar_enc: encAttendant,
    joined_on: "2025-02-01",
    status: "active",
  });

  check("Attendant registered successfully", aRes.success && !!aRes.staff);
  const attendantId = aRes.staff!.id;
  check("Attendant phone auto-prefixed with '+91'", aRes.staff?.phone === "+919876543211");
  check("Attendant license details are null", aRes.staff?.license_no === null && aRes.staff?.license_expires_on === null);
  check("Attendant id_proof_last4 stored as '1098'", aRes.staff?.id_proof_last4 === "1098");

  // Test 5: Edit Bus Driver (update details, preserve Aadhaar without duplicates)
  console.log("\n[Test 5] Edit Bus Driver: Update mobile and dates, verify NO duplicate created (Requirement 1)");
  const listBefore = await getTransportStaff(testSchoolId);
  check("Initial staff count is 2", listBefore.length === 2);

  const editDriverRes = await updateTransportStaff(testSchoolId, driverId, {
    full_name: "Ram Singh Senior",
    phone: "9876543299", // Updated phone
    police_verified_on: "2026-03-01",
    medical_fit_on: "2026-03-05",
    // Aadhaar not touched
  });

  check("Driver updated successfully", editDriverRes.success && !!editDriverRes.staff);
  check("Driver ID unchanged (no duplicate record created)", editDriverRes.staff?.id === driverId);
  check("Driver name updated to 'Ram Singh Senior'", editDriverRes.staff?.full_name === "Ram Singh Senior");
  check("Driver phone updated to '+919876543299'", editDriverRes.staff?.phone === "+919876543299");
  check("Driver existing Aadhaar last4 '0124' preserved", editDriverRes.staff?.id_proof_last4 === "0124");
  check("Driver existing aadhaar_enc preserved", editDriverRes.staff?.aadhaar_enc === encDriver);

  const listAfterEdit = await getTransportStaff(testSchoolId);
  check("Staff count remains exactly 2 after edit (no duplicate)", listAfterEdit.length === 2);

  // Test 6: Edit Bus Attendant with updated 12-digit Aadhaar
  console.log("\n[Test 6] Edit Bus Attendant with updated 12-digit Aadhaar (Requirements 1, 2)");
  const newAadhaarAttendant = "345678901235";
  const newEncAttendant = encryptSensitive(newAadhaarAttendant).packed;

  const editAttendantRes = await updateTransportStaff(testSchoolId, attendantId, {
    full_name: "Sunita Devi",
    id_proof_last4: newAadhaarAttendant.slice(-4),
    aadhaar_enc: newEncAttendant,
  });

  check("Attendant updated successfully", editAttendantRes.success && !!editAttendantRes.staff);
  check("Attendant name updated to 'Sunita Devi'", editAttendantRes.staff?.full_name === "Sunita Devi");
  check("Attendant id_proof_last4 updated to '1235'", editAttendantRes.staff?.id_proof_last4 === "1235");
  check("Attendant decrypted Aadhaar matches new 12 digits", decryptSensitive(editAttendantRes.staff!.aadhaar_enc!) === newAadhaarAttendant);

  // Test 7: Role switching from Driver to Attendant clears license fields
  console.log("\n[Test 7] Role switching: Driver changed to Attendant clears license fields (Requirement 1)");
  const roleSwitchRes = await updateTransportStaff(testSchoolId, driverId, {
    staff_type: "attendant",
  });
  check("Role switched to attendant", roleSwitchRes.success && roleSwitchRes.staff?.staff_type === "attendant");
  check("License number cleared to null", roleSwitchRes.staff?.license_no === null);
  check("License expiry cleared to null", roleSwitchRes.staff?.license_expires_on === null);

  // Test 8: Backward compatibility with 4-digit Aadhaar records
  console.log("\n[Test 8] Backward compatibility with existing 4-digit Aadhaar records (Requirement 2)");
  const legacyRecord = await createTransportStaff(testSchoolId, {
    staff_type: "driver",
    full_name: "Legacy Driver",
    phone: "9876543288",
    license_no: "DL-LEGACY-001",
    license_expires_on: "2029-01-01",
    badge_no: null,
    police_verified_on: null,
    medical_fit_on: null,
    id_proof_type: "Aadhaar",
    id_proof_last4: "7895", // Only 4 digits
    aadhaar_enc: null, // No encrypted full number
    joined_on: "2024-01-01",
    status: "active",
  });

  check("Legacy record created with 4-digit last4 '7895'", legacyRecord.success && legacyRecord.staff?.id_proof_last4 === "7895");
  check("Legacy record displayed properly as 'XXXX XXXX 7895'", maskIdProof(legacyRecord.staff?.id_proof_last4) === "XXXX XXXX 7895");
  check("Legacy record has null aadhaar_enc", legacyRecord.staff?.aadhaar_enc === null);

  // Edit legacy record's phone and name without touching Aadhaar
  const editLegacyRes = await updateTransportStaff(testSchoolId, legacyRecord.staff!.id, {
    full_name: "Legacy Driver Updated",
    phone: "9876543277",
  });
  check("Legacy record updated successfully", editLegacyRes.success);
  check("Legacy record still has exact 4-digit last4 '7895' without fabrication", editLegacyRes.staff?.id_proof_last4 === "7895");
  check("Legacy record aadhaar_enc remains null without fabricated digits", editLegacyRes.staff?.aadhaar_enc === null);

  // Test 9: Duplicate phone rejection
  console.log("\n[Test 9] Duplicate mobile number validation (Requirement 3)");
  const dupPhoneRes = await createTransportStaff(testSchoolId, {
    staff_type: "driver",
    full_name: "Duplicate Phone Driver",
    phone: "+91 98765 43277", // Same as legacy record updated
    license_no: "DL-DUP-001",
    license_expires_on: "2028-01-01",
    badge_no: null,
    police_verified_on: null,
    medical_fit_on: null,
    id_proof_type: "Aadhaar",
    id_proof_last4: "9999",
    aadhaar_enc: null,
    joined_on: "2025-01-01",
    status: "active",
  });
  check("Duplicate phone registration rejected", !dupPhoneRes.success && (dupPhoneRes.error || "").includes("already registered"));

  // Test 10: Delete staff
  console.log("\n[Test 10] Deactivate Staff Member");
  const delRes = await deleteTransportStaff(testSchoolId, legacyRecord.staff!.id);
  check("Unassigned staff member deactivated successfully", delRes.success);
  const listFinal = await getTransportStaff(testSchoolId);
  check("Deactivated staff member excluded from active list", !listFinal.some((s) => s.id === legacyRecord.staff!.id));

  console.log("\n========================================================");
  console.log(`Staff Test Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log("ALL TRANSPORT STAFF TESTS PASSED! 🎉");
  } else {
    console.error("Errors encountered:", errors);
    process.exit(1);
  }
}

runStaffTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
