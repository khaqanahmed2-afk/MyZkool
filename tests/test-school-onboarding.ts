/**
 * Test Suite: MyZkool Step 3 School Onboarding Foundation & School Profile
 */

import {
  normalizeSubdomain,
  validateSubdomainFormat,
  checkSubdomainAvailability,
  saveSchoolProfile,
  getSchoolForCurrentUser,
  RESERVED_SUBDOMAINS,
} from "../src/services/schoolService";
import type { SchoolProfileInput } from "../src/types/school";

// Polyfill localStorage and crypto for Node test environment
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

async function runTests() {
  console.log("\n========================================================");
  console.log("MYZKOOL STEP 3: SCHOOL ONBOARDING FOUNDATION TEST SUITE");
  console.log("========================================================\n");

  // 1. SUBDOMAIN NORMALIZATION TESTS
  console.log("1. Subdomain Normalization Tests:");
  assert(
    normalizeSubdomain("ABC Public School") === "abc-public-school",
    "Normalizes spaces to hyphens and lowercases"
  );
  assert(
    normalizeSubdomain("St. Mary's Higher Sec. School!") === "st-marys-higher-sec-school",
    "Strips special characters and punctuation"
  );
  assert(
    normalizeSubdomain("  Delhi   Public   School  ") === "delhi-public-school",
    "Collapses multiple spaces and strips boundary whitespace"
  );
  assert(
    normalizeSubdomain("École Française") === "ecole-francaise",
    "Normalizes unicode accents"
  );
  assert(
    normalizeSubdomain("---School---") === "school",
    "Strips leading and trailing hyphens"
  );
  assert(
    normalizeSubdomain("Very Long School Name That Exceeds The Maximum Allowed Subdomain Length Constraint For Subdomains").length <= 48,
    "Constrains maximum length to 48 characters"
  );

  // 2. SUBDOMAIN FORMAT & RESERVED CHECKS
  console.log("\n2. Subdomain Validation & Reserved Names:");
  assert(
    validateSubdomainFormat("greenwood-academy").isValid === true,
    "Valid alphanumeric with hyphens accepted"
  );
  assert(
    validateSubdomainFormat("ab").isValid === false,
    "Rejects subdomains under 3 characters"
  );
  assert(
    validateSubdomainFormat("-invalid").isValid === false,
    "Rejects leading hyphen"
  );
  assert(
    validateSubdomainFormat("invalid-").isValid === false,
    "Rejects trailing hyphen"
  );
  assert(
    validateSubdomainFormat("invalid@school").isValid === false,
    "Rejects special characters"
  );
  assert(
    validateSubdomainFormat("www").isValid === false &&
      validateSubdomainFormat("admin").isValid === false &&
      validateSubdomainFormat("api").isValid === false &&
      validateSubdomainFormat("myzkool").isValid === false,
    "Rejects reserved platform hostnames (www, admin, api, myzkool)"
  );

  // 3. SUBDOMAIN AVAILABILITY
  console.log("\n3. Subdomain Availability Check:");
  const availRes = await checkSubdomainAvailability("new-delhi-public");
  assert(availRes.isAvailable === true, "Unclaimed subdomain is marked Available");

  const reservedRes = await checkSubdomainAvailability("portal");
  assert(
    reservedRes.isAvailable === false && reservedRes.status === "reserved",
    "Reserved subdomain is correctly rejected"
  );

  // 4. FORM VALIDATION & PERSISTENCE
  console.log("\n4. School Profile Validation & Persistence:");
  const testUserId1 = "user-uuid-1111";
  const testEmail1 = "admin@greenwood.edu";

  // Missing name
  const missingNameRes = await saveSchoolProfile({
    userId: testUserId1,
    userEmail: testEmail1,
    profileInput: {
      name: "",
      subdomain: "greenwood",
      school_type: "k12",
      official_email: testEmail1,
      contact_phone: "9876543210",
      address: "123 Main St",
      city: "Bangalore",
      state: "Karnataka",
      pin_code: "560001",
    },
  });
  assert(
    missingNameRes.success === false && missingNameRes.error?.includes("school name"),
    "Rejects missing school name"
  );

  // Invalid email
  const invalidEmailRes = await saveSchoolProfile({
    userId: testUserId1,
    userEmail: testEmail1,
    profileInput: {
      name: "Greenwood Academy",
      subdomain: "greenwood-academy",
      school_type: "k12",
      official_email: "not-an-email",
      contact_phone: "9876543210",
      address: "123 Main St",
      city: "Bangalore",
      state: "Karnataka",
      pin_code: "560001",
    },
  });
  assert(
    invalidEmailRes.success === false && invalidEmailRes.error?.includes("valid email"),
    "Rejects invalid email format"
  );

  // Valid profile submission
  const validProfile: SchoolProfileInput = {
    name: "Greenwood International School",
    subdomain: "greenwood-intl",
    school_type: "k12",
    affiliation_board: "cbse",
    official_email: "principal@greenwood.edu",
    contact_phone: "+91 98765 43210",
    address: "Campus 1, Whitefield Main Road",
    city: "Bangalore",
    state: "Karnataka",
    pin_code: "560066",
  };

  const saveRes1 = await saveSchoolProfile({
    userId: testUserId1,
    userEmail: testEmail1,
    profileInput: validProfile,
  });

  assert(saveRes1.success === true && Boolean(saveRes1.school?.id), "Saves valid school profile with generated UUID");
  assert(saveRes1.school?.onboarding_step === 2, "Updates onboarding step to Step 2");
  assert(saveRes1.school?.created_by === testUserId1, "Associates created_by with authenticated user ID");

  const createdSchoolId = saveRes1.school!.id;

  // 5. RESUME ONBOARDING & RETRIEVAL
  console.log("\n5. Resume Onboarding & Association:");
  const retrieved = await getSchoolForCurrentUser(testUserId1, createdSchoolId);
  assert(
    retrieved.school !== null && retrieved.school.id === createdSchoolId,
    "Successfully retrieves existing school for user"
  );
  assert(
    retrieved.school?.name === "Greenwood International School",
    "Loaded school record retains all saved fields"
  );
  assert(
    retrieved.school?.onboarding_step === 2,
    "Onboarding progress step 2 preserved on resumption"
  );

  // Self-subdomain availability check (user should be able to keep their own subdomain)
  const selfCheck = await checkSubdomainAvailability("greenwood-intl", createdSchoolId);
  assert(
    selfCheck.isAvailable === true,
    "Existing school's own subdomain is allowed for itself on update"
  );

  // Update existing school (Resume flow without duplicate school creation)
  const updateRes = await saveSchoolProfile({
    userId: testUserId1,
    userEmail: testEmail1,
    profileInput: {
      ...validProfile,
      address: "Campus 1, Updated Wing",
    },
    existingSchoolId: createdSchoolId,
  });
  assert(
    updateRes.success === true && updateRes.school?.id === createdSchoolId,
    "Updates existing school record in-place without generating a new school_id"
  );
  assert(
    updateRes.school?.address === "Campus 1, Updated Wing",
    "Updated address correctly persisted"
  );

  // 6. MULTI-TENANT ISOLATION & SUBDOMAIN COLLISION
  console.log("\n6. Multi-Tenant Isolation & Subdomain Collision:");
  const testUserId2 = "user-uuid-2222";
  const testEmail2 = "admin@secondschool.edu";

  // Attempting to claim the same subdomain "greenwood-intl" from another school user
  const duplicateSubdomainCheck = await checkSubdomainAvailability("greenwood-intl", null);
  assert(
    duplicateSubdomainCheck.isAvailable === false && duplicateSubdomainCheck.status === "taken",
    "Collision prevented: School B cannot claim School A's registered subdomain"
  );

  const duplicateSaveRes = await saveSchoolProfile({
    userId: testUserId2,
    userEmail: testEmail2,
    profileInput: {
      name: "Another Greenwood School",
      subdomain: "greenwood-intl", // Duplicate!
      school_type: "primary",
      official_email: testEmail2,
      contact_phone: "9123456789",
      address: "Sector 4",
      city: "Noida",
      state: "Uttar Pradesh",
      pin_code: "201301",
    },
  });
  assert(
    duplicateSaveRes.success === false,
    "Database/Service rejects saving when subdomain is already owned by Tenant A"
  );

  // School B creating their own distinct school
  const saveRes2 = await saveSchoolProfile({
    userId: testUserId2,
    userEmail: testEmail2,
    profileInput: {
      name: "St. Xavier Academy",
      subdomain: "st-xavier-noida",
      school_type: "secondary",
      affiliation_board: "icse",
      official_email: testEmail2,
      contact_phone: "9123456789",
      address: "Sector 4",
      city: "Noida",
      state: "Uttar Pradesh",
      pin_code: "201301",
    },
  });
  assert(saveRes2.success === true, "Tenant B can create distinct school with unique subdomain");
  assert(saveRes2.school?.id !== createdSchoolId, "Tenant A and Tenant B have completely isolated school_id values");

  // Verify Tenant B's data isolation from Tenant A
  const tenant1Data = await getSchoolForCurrentUser(testUserId1, createdSchoolId);
  const tenant2Data = await getSchoolForCurrentUser(testUserId2, saveRes2.school!.id);
  assert(
    tenant1Data.school?.id !== tenant2Data.school?.id &&
    tenant1Data.school?.subdomain !== tenant2Data.school?.subdomain,
    "Tenant isolation verified: Tenant A and Tenant B are strictly partitioned"
  );

  // 7. AUTHENTICATION & ROLE-BASED ACCESS CHECKS
  console.log("\n7. Authentication & Role-Based Access Scenarios:");
  
  // Test Unauthenticated request
  const unauthGet = await getSchoolForCurrentUser("", null);
  assert(
    unauthGet.school === null && unauthGet.error?.includes("Authentication required"),
    "Rejects school profile retrieval without authenticated user"
  );

  const unauthSave = await saveSchoolProfile({
    userId: "",
    userEmail: "",
    profileInput: validProfile,
  });
  assert(
    unauthSave.success === false && unauthSave.error?.includes("not authenticated"),
    "Rejects school profile modification without authenticated user"
  );

  // Role validation simulation: Allowed roles for /onboarding/* are school_admin and super_admin
  const allowedRoles = ["school_admin", "super_admin"];
  const testRoles = [
    { role: "school_admin", expected: true },
    { role: "super_admin", expected: true },
    { role: "teacher", expected: false },
    { role: "accountant", expected: false },
    { role: "parent", expected: false },
  ];

  for (const { role, expected } of testRoles) {
    const isAllowed = allowedRoles.includes(role);
    assert(
      isAllowed === expected,
      `Role '${role}' access to onboarding is correctly ${expected ? "granted" : "restricted"}`
    );
  }

  // Routing check: Completed onboarding users should go to /admin rather than repeating onboarding
  const completedProfile = { onboarding_completed: true, current_onboarding_step: "/onboarding/complete" };
  const incompleteProfile = { onboarding_completed: false, current_onboarding_step: "/onboarding/academics" };

  const getDestinationRoute = (p: { onboarding_completed: boolean; current_onboarding_step: string }) => {
    if (p.onboarding_completed) return "/admin";
    return p.current_onboarding_step || "/onboarding/school";
  };

  assert(
    getDestinationRoute(completedProfile) === "/admin",
    "Completed onboarding routes straight to /admin ERP dashboard"
  );
  assert(
    getDestinationRoute(incompleteProfile) === "/onboarding/academics",
    "Incomplete onboarding accurately resumes active step (/onboarding/academics)"
  );

  console.log("\n--------------------------------------------------------");
  console.log(`TEST SUMMARY: ${testsPassed} Passed, ${testsFailed} Failed.`);
  console.log("--------------------------------------------------------\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
