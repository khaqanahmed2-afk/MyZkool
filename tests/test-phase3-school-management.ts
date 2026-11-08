/**
 * Automated Verification Suite: Phase 3 — School & Institution Management
 */

import {
  getMasterAdminSchools,
  getMasterAdminSchoolDetail,
  registerMasterAdminSchool,
  updateMasterAdminSchoolStatus,
} from "../src/services/masterAdminSchoolService";
import { getPlatformAuditLogs } from "../src/services/masterAdminAuditService";

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ""}`);
    testsFailed++;
  }
}

async function runPhase3Tests() {
  console.log("\n==========================================================");
  console.log("PHASE 3: SCHOOL & INSTITUTION MANAGEMENT TEST SUITE");
  console.log("==========================================================\n");

  // ─── Test Group 1: Directory Listing & Pagination ─────────────────────────
  console.log("Group 1: School Directory & Search Filters");

  {
    const result = await getMasterAdminSchools({ page: 1, limit: 10 });
    assert(result.schools.length > 0, "Directory returns non-empty array of schools");
    assert(result.total >= result.schools.length, "Total schools count is greater than or equal to page length");
    assert(Boolean(result.schools[0].id), "School summary contains unique id");
    assert(Boolean(result.schools[0].subdomain), "School summary contains subdomain slug");
  }

  {
    // Search filter
    const searchRes = await getMasterAdminSchools({ search: "Peace" });
    assert(searchRes.schools.length > 0, "Search by name 'Peace' returns matching schools");
    assert(searchRes.schools[0].name.includes("Peace"), "First result matches search query");
  }

  {
    // Board filter
    const boardRes = await getMasterAdminSchools({ board: "icse" });
    assert(boardRes.schools.length > 0, "Board filter for 'icse' returns matching schools");
    assert(boardRes.schools.every((s) => s.affiliation_board === "icse"), "All results have ICSE affiliation");
  }

  // ─── Test Group 2: School Registration & Subdomain Validation ─────────────
  console.log("\nGroup 2: School Registration Workflow");

  {
    // Valid registration
    const regResult = await registerMasterAdminSchool({
      name: "Delhi Public Global School",
      subdomain: "dpgs-delhi",
      schoolType: "k12",
      affiliationBoard: "cbse",
      officialEmail: "admin@dpgs.edu.in",
      contactPhone: "+919988776655",
      address: "Sector 14, Rohini",
      city: "New Delhi",
      district: "North West Delhi",
      state: "Delhi",
      pinCode: "110085",
      initialPlanSlug: "pro",
      adminEmail: "super@myzkool.com",
    });

    assert(regResult.success, "New school successfully registered");
    assert(regResult.school?.subdomain === "dpgs-delhi", "Subdomain correctly stored");
    assert(regResult.school?.current_plan_slug === "pro", "Initial plan correctly assigned");

    // Verify audit log generated
    const auditLogs = await getPlatformAuditLogs({ action: "school.register" });
    assert(auditLogs.length > 0, "Audit log created for school.register");
    assert(auditLogs[0].admin_email === "super@myzkool.com", "Audit log records registering admin email");
  }

  {
    // Invalid subdomain with special characters
    const invalidReg = await registerMasterAdminSchool({
      name: "Bad Subdomain School",
      subdomain: "bad_subdomain!@#",
      officialEmail: "test@bad.com",
      contactPhone: "+919988776655",
      address: "Main Road",
      city: "Lucknow",
      state: "UP",
      pinCode: "226001",
      adminEmail: "super@myzkool.com",
    });

    assert(!invalidReg.success, "Invalid subdomain with special characters is rejected");
    assert(invalidReg.error?.includes("Subdomain must be"), "Error explains subdomain format constraint");
  }

  // ─── Test Group 3: Institutional Status Management (Suspension & Audit) ───
  console.log("\nGroup 3: Institutional Lifecycle Status Changes");

  const testSchoolId = "0ae1f768-8ced-43aa-a6c5-9b53e4ab63fa";

  {
    const suspendResult = await updateMasterAdminSchoolStatus(
      testSchoolId,
      "suspended",
      "Annual renewal subscription invoice unpaid past grace period.",
      "super@myzkool.com"
    );

    assert(suspendResult.success, "School suspension executed successfully");

    const schoolDetail = await getMasterAdminSchoolDetail(testSchoolId);
    assert(schoolDetail?.status === "suspended", "School status reflects 'suspended'");

    // Audit log check
    const auditLogs = await getPlatformAuditLogs({ action: "school.suspend" });
    assert(auditLogs.length > 0, "Audit log generated for school.suspend");
    assert(
      (auditLogs[0].details as any)?.reason?.includes("Annual renewal"),
      "Audit log preserves mandatory operational reason"
    );
  }

  {
    // Reactivation
    const reactivateResult = await updateMasterAdminSchoolStatus(
      testSchoolId,
      "active",
      "Offline RTGS wire payment confirmed by account team.",
      "super@myzkool.com"
    );

    assert(reactivateResult.success, "School reactivation executed successfully");
    const schoolDetail = await getMasterAdminSchoolDetail(testSchoolId);
    assert(schoolDetail?.status === "active", "School status restored to 'active'");
  }

  // ─── Test Group 4: Student PII Shielding ───────────────────────────────────
  console.log("\nGroup 4: DPDP Privacy Compliance Verification");

  {
    const detail = await getMasterAdminSchoolDetail(testSchoolId);
    assert(detail !== null, "Detail is non-null");
    // Ensure no raw student records or sensitive columns exist on the school summary
    assert(!("aadhaar" in (detail as any)), "Aadhaar is not present in Master Admin school view");
    assert(!("parent_phone" in (detail as any)), "Parent personal phone is not exposed");
    assert(typeof detail?.student_count === "number", "Student presence is purely aggregate headcount");
  }

  console.log("\n==========================================================");
  console.log(`PHASE 3 SUMMARY: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log("==========================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase3Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

