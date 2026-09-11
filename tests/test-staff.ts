/**
 * Test Suite: MyZkool Step 9 (Staff Setup)
 * Onboarding Step 7 of 8 - Route: /onboarding/staff
 */

import {
  getStaff,
  getStaffMember,
  createStaff,
  updateStaff,
  updateStaffStatus,
  archiveStaff,
  deleteStaff,
  saveStaffSetupProgress,
  generateEmployeeCode,
  isValidEmail,
  STAFF_CACHE_KEY_PREFIX,
} from "../src/services/staffService";
import type { StaffInput } from "../src/types/staff";

// Polyfill localStorage in Node test environment
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] || null,
    get length() {
      return store.size;
    },
  } as Storage;
}

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

async function runStaffTests() {
  console.log("\n==========================================================");
  console.log("MYZKOOL STEP 9: STAFF SETUP TEST SUITE");
  console.log("==========================================================\n");

  const schoolId1 = "school-tenant-001";
  const schoolId2 = "school-tenant-002";
  const adminUserId1 = "user-admin-001";

  // Clean cache for test isolation
  localStorage.clear();

  // -----------------------------------------------------------------
  // 1. Validation & Utility Helpers
  // -----------------------------------------------------------------
  console.log("1. Validation & Utility Helpers:");

  assert(isValidEmail("teacher@school.edu"), "Validates valid email format");
  assert(isValidEmail("faculty.name@sub.domain.org"), "Validates complex valid email");
  assert(!isValidEmail("not-an-email"), "Rejects invalid email format without @");
  assert(!isValidEmail("missing@domain"), "Rejects incomplete email domain");
  assert(!isValidEmail(""), "Rejects empty email string");
  assert(!isValidEmail(null), "Rejects null email");

  assert(
    generateEmployeeCode("teacher", 0) === "TCH-001",
    "Generates teacher employee code TCH-001 for index 0"
  );
  assert(
    generateEmployeeCode("accountant", 1) === "ACC-002",
    "Generates accountant employee code ACC-002 for index 1"
  );

  // -----------------------------------------------------------------
  // 2. Staff Creation & Field Validations
  // -----------------------------------------------------------------
  console.log("\n2. Staff Creation & Field Validations:");

  // Test: First name required
  const missingNameRes = await createStaff({
    schoolId: schoolId1,
    input: {
      first_name: "",
      role: "teacher",
    },
    userRole: "school_admin",
  });
  assert(
    !missingNameRes.success && Boolean(missingNameRes.error),
    "Rejects staff creation without first name",
    missingNameRes.error
  );

  // Test: Role must be teacher or accountant
  const invalidRoleRes = await createStaff({
    schoolId: schoolId1,
    input: {
      first_name: "John",
      // @ts-expect-error testing invalid role
      role: "super_admin",
    },
    userRole: "school_admin",
  });
  assert(
    !invalidRoleRes.success,
    "Rejects invalid staff role (e.g. super_admin via staff form)",
    invalidRoleRes.error
  );

  // Test: School Admin creation through staff form should be rejected
  const adminRoleRes = await createStaff({
    schoolId: schoolId1,
    input: {
      first_name: "Admin",
      // @ts-expect-error testing invalid role
      role: "school_admin",
    },
    userRole: "school_admin",
  });
  assert(
    !adminRoleRes.success,
    "School Admin cannot be created casually through staff setup form"
  );

  // Test: Malformed email rejection
  const invalidEmailRes = await createStaff({
    schoolId: schoolId1,
    input: {
      first_name: "Ramesh",
      role: "teacher",
      email: "not-an-email",
    },
    userRole: "school_admin",
  });
  assert(
    !invalidEmailRes.success,
    "Rejects staff member with malformed email",
    invalidEmailRes.error
  );

  // Test: Successful creation of a Teacher
  const teacherInput: StaffInput = {
    first_name: "Anita",
    last_name: "Sharma",
    email: "anita.sharma@greenwood.edu",
    phone: "+91 98765 11111",
    role: "teacher",
    designation: "Mathematics Teacher",
    employee_code: "TCH-001",
    joining_date: "2026-06-01",
    status: "active",
  };

  const teacherRes = await createStaff({
    schoolId: schoolId1,
    input: teacherInput,
    userRole: "school_admin",
  });

  assert(teacherRes.success && Boolean(teacherRes.staffMember), "Creates teacher successfully");
  const teacher = teacherRes.staffMember!;
  assert(teacher.first_name === "Anita", "Preserves teacher first name");
  assert(teacher.last_name === "Sharma", "Preserves teacher last name");
  assert(teacher.role === "teacher", "Preserves role as teacher");
  assert(teacher.employee_code === "TCH-001", "Preserves employee code");
  assert(teacher.school_id === schoolId1, "Associates staff strictly with school_id");
  assert(teacher.status === "active", "Sets default status to active");
  assert(teacher.user_id === null, "Separates auth credentials: user_id is null on onboarding");

  // Test: Successful creation of an Accountant
  const accountantInput: StaffInput = {
    first_name: "Vikram",
    last_name: "Singhania",
    email: "vikram.accounts@greenwood.edu",
    phone: "+91 98765 22222",
    role: "accountant",
    designation: "Senior Accountant",
    employee_code: "ACC-001",
    joining_date: "2026-06-01",
    status: "active",
  };

  const accountantRes = await createStaff({
    schoolId: schoolId1,
    input: accountantInput,
    userRole: "school_admin",
  });

  assert(accountantRes.success && Boolean(accountantRes.staffMember), "Creates accountant successfully");
  const accountant = accountantRes.staffMember!;
  assert(accountant.role === "accountant", "Preserves role as accountant");
  assert(accountant.designation === "Senior Accountant", "Preserves accountant designation");

  // -----------------------------------------------------------------
  // 3. Duplicate Prevention (Code & Email within School)
  // -----------------------------------------------------------------
  console.log("\n3. Duplicate Prevention:");

  // Duplicate employee code check (case-insensitive)
  const dupCodeRes = await createStaff({
    schoolId: schoolId1,
    input: {
      first_name: "Pooja",
      role: "teacher",
      employee_code: "tch-001", // duplicate of TCH-001
    },
    userRole: "school_admin",
  });
  assert(!dupCodeRes.success, "Blocks duplicate employee code in same school");

  // Duplicate email check (case-insensitive)
  const dupEmailRes = await createStaff({
    schoolId: schoolId1,
    input: {
      first_name: "Pooja",
      role: "teacher",
      email: "ANITA.SHARMA@greenwood.edu", // duplicate of Anita's email
      employee_code: "TCH-002",
    },
    userRole: "school_admin",
  });
  assert(!dupEmailRes.success, "Blocks duplicate official email in same school");

  // -----------------------------------------------------------------
  // 4. Staff Retrieval Operations
  // -----------------------------------------------------------------
  console.log("\n4. Staff Retrieval Operations:");

  const listRes = await getStaff(schoolId1);
  assert(listRes.success, "getStaff executes successfully");
  assert(listRes.staff.length === 2, "Returns exactly 2 staff members for School 1");

  const singleRes = await getStaffMember(schoolId1, teacher.id);
  assert(singleRes.success && Boolean(singleRes.staffMember), "getStaffMember fetches member by ID");
  assert(singleRes.staffMember?.first_name === "Anita", "Fetched correct staff record");

  const nonExistentRes = await getStaffMember(schoolId1, "invalid-staff-id");
  assert(!nonExistentRes.success, "Returns error when staff member does not exist");

  // -----------------------------------------------------------------
  // 5. Staff Updates & Status Management
  // -----------------------------------------------------------------
  console.log("\n5. Staff Updates & Status Management:");

  const updateRes = await updateStaff({
    schoolId: schoolId1,
    staffId: teacher.id,
    input: {
      designation: "Head of Mathematics",
      phone: "+91 99999 88888",
    },
    userRole: "school_admin",
  });

  assert(updateRes.success, "Updates staff member successfully");
  assert(
    updateRes.staffMember?.designation === "Head of Mathematics",
    "Persists updated designation"
  );
  assert(
    updateRes.staffMember?.phone === "+91 99999 88888",
    "Persists updated phone number"
  );

  // Attempt updating to conflicting employee code
  const conflictUpdateRes = await updateStaff({
    schoolId: schoolId1,
    staffId: teacher.id,
    input: {
      employee_code: "ACC-001", // belongs to Vikram
    },
    userRole: "school_admin",
  });
  assert(
    !conflictUpdateRes.success,
    "Blocks updating staff member to an employee code already taken by another"
  );

  // Archive staff member
  const archiveRes = await archiveStaff({
    schoolId: schoolId1,
    staffId: accountant.id,
    userRole: "school_admin",
  });
  assert(archiveRes.success, "Archives staff member successfully");

  const checkArchiveRes = await getStaffMember(schoolId1, accountant.id);
  assert(
    checkArchiveRes.staffMember?.status === "archived",
    "Staff status updated to 'archived'"
  );

  // Delete staff member
  const deleteRes = await deleteStaff({
    schoolId: schoolId1,
    staffId: accountant.id,
    userRole: "school_admin",
  });
  assert(deleteRes.success, "Deletes staff member successfully");

  const postDeleteList = await getStaff(schoolId1);
  assert(postDeleteList.staff.length === 1, "Roster count reduced to 1 after deletion");
  assert(
    postDeleteList.staff[0].id === teacher.id,
    "Remaining member is the teacher"
  );

  // -----------------------------------------------------------------
  // 6. Role-Based Access Control (RBAC)
  // -----------------------------------------------------------------
  console.log("\n6. Role-Based Access Control:");

  // Teacher cannot create staff
  const teacherCreateRes = await createStaff({
    schoolId: schoolId1,
    input: {
      first_name: "Illegal",
      role: "teacher",
    },
    userRole: "teacher",
  });
  assert(!teacherCreateRes.success, "Rejects teacher attempt to create staff record");

  // Accountant cannot update staff
  const accountantUpdateRes = await updateStaff({
    schoolId: schoolId1,
    staffId: teacher.id,
    input: { first_name: "Tampered" },
    userRole: "accountant",
  });
  assert(!accountantUpdateRes.success, "Rejects accountant attempt to update staff record");

  // Parent cannot delete staff
  const parentDeleteRes = await deleteStaff({
    schoolId: schoolId1,
    staffId: teacher.id,
    userRole: "parent",
  });
  assert(!parentDeleteRes.success, "Rejects parent attempt to delete staff record");

  // -----------------------------------------------------------------
  // 7. Strict Multi-Tenant Isolation
  // -----------------------------------------------------------------
  console.log("\n7. Strict Multi-Tenant Isolation:");

  // Add staff for School 2
  const school2StaffRes = await createStaff({
    schoolId: schoolId2,
    input: {
      first_name: "Suresh",
      last_name: "Patel",
      role: "teacher",
      designation: "Physics Teacher",
      employee_code: "TCH-001", // same code as School 1, but different school!
      email: "suresh@school2.edu",
    },
    userRole: "school_admin",
  });

  assert(school2StaffRes.success, "Allows same employee code in different school tenant");

  const school1Staff = await getStaff(schoolId1);
  const school2Staff = await getStaff(schoolId2);

  assert(
    school1Staff.staff.length === 1 && school1Staff.staff[0].first_name === "Anita",
    "School 1 staff directory only contains School 1 staff"
  );
  assert(
    school2Staff.staff.length === 1 && school2Staff.staff[0].first_name === "Suresh",
    "School 2 staff directory only contains School 2 staff"
  );

  // Cross-tenant access: School 2 cannot view or mutate School 1 staff
  const crossTenantGet = await getStaffMember(schoolId2, teacher.id);
  assert(!crossTenantGet.success, "Cross-tenant staff retrieval blocked");

  const crossTenantUpdate = await updateStaff({
    schoolId: schoolId2,
    staffId: teacher.id,
    input: { first_name: "Hacked" },
    userRole: "school_admin",
  });
  assert(!crossTenantUpdate.success, "Cross-tenant staff update blocked");

  // -----------------------------------------------------------------
  // 8. Onboarding Progression & Non-Regression
  // -----------------------------------------------------------------
  console.log("\n8. Onboarding Progression & Non-Regression:");

  const schoolKey1 = `myzkool_school_profile_${adminUserId1}`;
  const mockSchool1 = {
    id: schoolId1,
    name: "Greenwood Academy",
    subdomain: "greenwood",
    onboarding_step: 7,
    onboarding_completed: false,
    created_by: adminUserId1,
  };
  localStorage.setItem(schoolKey1, JSON.stringify(mockSchool1));

  const progressRes = await saveStaffSetupProgress({
    schoolId: schoolId1,
    userId: adminUserId1,
  });

  assert(progressRes.success, "Saves staff setup progress successfully");

  const cachedSchool = JSON.parse(localStorage.getItem(schoolKey1) || "{}");
  assert(
    cachedSchool.onboarding_step === 8,
    "Advances onboarding_step to 8 (Complete page)"
  );

  // Non-regression: If school already completed, step does not decrease
  cachedSchool.onboarding_step = 8;
  localStorage.setItem(schoolKey1, JSON.stringify(cachedSchool));

  await saveStaffSetupProgress({
    schoolId: schoolId1,
    userId: adminUserId1,
  });

  const nonRegSchool = JSON.parse(localStorage.getItem(schoolKey1) || "{}");
  assert(
    nonRegSchool.onboarding_step === 8,
    "Non-regression: onboarding_step does not regress below 8"
  );

  // -----------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------
  console.log("\n----------------------------------------------------------");
  console.log(`TEST SUMMARY: ${testsPassed} Passed, ${testsFailed} Failed.`);
  console.log("----------------------------------------------------------\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runStaffTests().catch((err) => {
  console.error("Staff test fatal error:", err);
  process.exit(1);
});
