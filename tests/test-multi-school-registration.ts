/**
 * Multi-School Registration & Session Preservation Test Suite
 *
 * Verifies that an authenticated admin registering an additional school via
 * `/onboarding/new-school` creates a distinct school tenant and progresses
 * through onboarding without overwriting their primary school or corrupting
 * their active admin session.
 *
 * Run with: npx tsx tests/test-multi-school-registration.ts
 */

// Polyfill localStorage and crypto for Node test environment BEFORE importing services
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

import {
  buildOnboardingUrl,
  parseOnboardingSearchParams,
} from "../src/utils/onboardingRoute";
import {
  saveSchoolProfile,
  getSchoolForCurrentUser,
  completeOnboarding,
  updateCachedSchoolOnboardingStep,
} from "../src/services/schoolService";
import type { SchoolProfileInput } from "../src/types/school";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${label}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${label}`);
  }
}

async function runTests() {
  console.log("=== Running Multi-School Registration Tests ===\n");
  globalThis.localStorage.clear();

  // 1. Route helper round-trip tests
  console.log("1. Onboarding Route Helper Round-Trips");
  const urlStep2 = buildOnboardingUrl("/onboarding/academics", {
    isNewSchool: true,
    schoolId: "school-b-123",
  });
  assert(
    urlStep2 === "/onboarding/academics?mode=new&schoolId=school-b-123",
    "buildOnboardingUrl encodes mode=new and schoolId cleanly"
  );

  const parsedStep2 = parseOnboardingSearchParams(
    new URLSearchParams(urlStep2.split("?")[1])
  );
  assert(
    parsedStep2.isNewSchoolMode === true &&
      parsedStep2.targetSchoolId === "school-b-123",
    "parseOnboardingSearchParams restores isNewSchoolMode and targetSchoolId"
  );

  const parsedForcedNew = parseOnboardingSearchParams(
    new URLSearchParams("schoolId=   "),
    true
  );
  assert(
    parsedForcedNew.isNewSchoolMode === true &&
      parsedForcedNew.targetSchoolId === null,
    "parseOnboardingSearchParams honors forceNewSchool=true and trims empty schoolId"
  );

  const urlStandard = buildOnboardingUrl("/onboarding/academics", {
    isNewSchool: false,
    schoolId: null,
  });
  assert(
    urlStandard === "/onboarding/academics",
    "buildOnboardingUrl omits query string for standard primary onboarding"
  );

  // 2. Primary school creation & completion
  console.log("\n2. Primary School A Creation & Active Admin Session Setup");
  const adminUserId = "admin-user-multi-1";
  const adminEmail = "principal@schoola.edu";

  const schoolAInput: SchoolProfileInput = {
    name: "Alpha Public School",
    subdomain: "alpha-public",
    school_type: "k12",
    affiliation_board: "cbse",
    official_email: "info@alpha.edu",
    contact_phone: "+91 9876543210",
    address: "1 Alpha Road",
    city: "Bengaluru",
    district: "Bengaluru Urban",
    state: "Karnataka",
    pin_code: "560001",
  };

  const resA = await saveSchoolProfile({
    userId: adminUserId,
    userEmail: adminEmail,
    profileInput: schoolAInput,
  });
  assert(
    resA.success && Boolean(resA.school?.id),
    "Primary School A created successfully"
  );

  const schoolAId = resA.school!.id;
  const completeARes = await completeOnboarding({
    schoolId: schoolAId,
    userId: adminUserId,
  });
  assert(
    completeARes.success && completeARes.school?.onboarding_completed === true,
    "Primary School A completed onboarding"
  );

  // Simulate active admin session pinned to School A
  globalThis.localStorage.setItem("myzkool_active_school_id", schoolAId);

  // 3. Register New School B while preserving admin session & School A
  console.log("\n3. Register New School B Without Overwriting School A");
  const schoolBInput: SchoolProfileInput = {
    name: "Beta International Academy",
    subdomain: "beta-intl",
    school_type: "senior_secondary",
    affiliation_board: "icse",
    official_email: "admissions@beta.edu",
    contact_phone: "+91 9876500000",
    address: "2 Beta Avenue",
    city: "Mysuru",
    district: "Mysuru",
    state: "Karnataka",
    pin_code: "570001",
  };

  const resB = await saveSchoolProfile({
    userId: adminUserId,
    userEmail: adminEmail,
    profileInput: schoolBInput,
    isNewSchool: true,
    preserveProfileSession: true,
  });

  assert(
    resB.success && Boolean(resB.school?.id),
    "New School B created successfully in new-school mode"
  );
  const schoolBId = resB.school!.id;

  assert(
    schoolBId !== schoolAId,
    "New School B received a distinct school ID from Primary School A"
  );
  assert(
    resB.school!.onboarding_completed === false &&
      resB.school!.onboarding_step === 2,
    "New School B starts uncompleted at onboarding_step 2"
  );
  assert(
    globalThis.localStorage.getItem("myzkool_active_school_id") === schoolAId,
    "Active school selection in localStorage remains School A during registration"
  );

  // Verify School A cache was NOT overwritten
  const { school: fetchedA } = await getSchoolForCurrentUser(
    adminUserId,
    schoolAId
  );
  assert(
    fetchedA?.id === schoolAId &&
      fetchedA?.name === "Alpha Public School" &&
      fetchedA?.onboarding_completed === true &&
      fetchedA?.onboarding_step === 6,
    "Primary School A remains intact and completed"
  );

  // Verify default lookup without schoolId still points to primary profile cache (School A)
  const { school: fetchedDefault } =
    await getSchoolForCurrentUser(adminUserId);
  assert(
    fetchedDefault?.id === schoolAId &&
      fetchedDefault?.onboarding_completed === true,
    "Primary user cache key still preserves Primary School A"
  );

  // Verify targeted lookup by newSchoolId returns School B
  const { school: fetchedB } = await getSchoolForCurrentUser(
    adminUserId,
    schoolBId
  );
  assert(
    fetchedB?.id === schoolBId && fetchedB?.name === "Beta International Academy",
    "getSchoolForCurrentUser(userId, schoolBId) retrieves New School B"
  );

  // 4. Intermediate onboarding step updates for School B
  console.log("\n4. Intermediate Onboarding Step Isolation for School B");
  updateCachedSchoolOnboardingStep(adminUserId, schoolBId, 4, false);

  const { school: fetchedBAfterStep } = await getSchoolForCurrentUser(
    adminUserId,
    schoolBId
  );
  const { school: fetchedAAfterStep } = await getSchoolForCurrentUser(
    adminUserId,
    schoolAId
  );
  assert(
    fetchedBAfterStep?.onboarding_step === 4 &&
      fetchedBAfterStep?.onboarding_completed === false,
    "updateCachedSchoolOnboardingStep advances School B to step 4"
  );
  assert(
    fetchedAAfterStep?.onboarding_step === 6 &&
      fetchedAAfterStep?.onboarding_completed === true,
    "Primary School A onboarding_step/completed unaffected by School B progress"
  );

  // Verify isolated cache keys
  const cacheKeyB = `myzkool_school_profile_school_${schoolBId}`;
  assert(
    Boolean(globalThis.localStorage.getItem(cacheKeyB)),
    "School B is stored under its own school-scoped cache key"
  );

  // 5. Complete onboarding for School B with preserveAdminSession: true
  console.log("\n5. Complete Onboarding for School B (preserveAdminSession: true)");
  const completeBRes = await completeOnboarding({
    schoolId: schoolBId,
    userId: adminUserId,
    preserveAdminSession: true,
  });

  assert(
    completeBRes.success &&
      completeBRes.school?.id === schoolBId &&
      completeBRes.school?.onboarding_completed === true &&
      completeBRes.school?.onboarding_step === 6,
    "completeOnboarding marks School B completed with step 6"
  );

  const { school: fetchedAFinal } = await getSchoolForCurrentUser(
    adminUserId,
    schoolAId
  );
  assert(
    fetchedAFinal?.id === schoolAId &&
      fetchedAFinal?.name === "Alpha Public School" &&
      fetchedAFinal?.onboarding_completed === true,
    "Primary School A remains untouched after completing School B"
  );

  console.log(
    `\n=== Test Results: ${passed} Passed, ${failed} Failed ===`
  );
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
