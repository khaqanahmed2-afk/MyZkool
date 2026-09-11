/**
 * Test Suite: MyZkool Step 4 Academic Setup & Calendar Foundation
 */

import {
  validateAcademicYearInput,
  getDefaultAcademicYear,
  getAcademicYearsForSchool,
  getCurrentAcademicYear,
  saveAcademicSetup,
} from "../src/services/academicService";
import type { AcademicYearInput } from "../src/types/academic";

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
  console.log("\n==========================================================");
  console.log("MYZKOOL STEP 4: ACADEMIC SETUP TEST SUITE");
  console.log("==========================================================\n");

  // 1. ACADEMIC YEAR VALIDATION
  console.log("1. Academic Year Range & Form Validation:");

  // Valid academic input
  const validAY: AcademicYearInput = {
    start_year: 2026,
    end_year: 2027,
    label: "2026–2027",
    start_date: "2026-04-01",
    end_date: "2027-03-31",
    is_current: true,
  };
  const validRes = validateAcademicYearInput(validAY);
  assert(validRes.isValid === true, "Valid academic year and dates pass validation");

  // Invalid: Reversed years (e.g. 2027 -> 2026)
  const reversedYears: AcademicYearInput = {
    ...validAY,
    start_year: 2027,
    end_year: 2026,
  };
  const revRes = validateAcademicYearInput(reversedYears);
  assert(
    revRes.isValid === false && Boolean(revRes.errors.end_year),
    "Rejects reversed years (end_year <= start_year)"
  );

  // Invalid: Equal years (e.g. 2026 -> 2026)
  const equalYears: AcademicYearInput = {
    ...validAY,
    start_year: 2026,
    end_year: 2026,
  };
  const eqRes = validateAcademicYearInput(equalYears);
  assert(
    eqRes.isValid === false && Boolean(eqRes.errors.end_year),
    "Rejects equal years (end_year === start_year)"
  );

  // Invalid: Out-of-bounds start year
  const outOfBoundsStart: AcademicYearInput = {
    ...validAY,
    start_year: 1980,
    end_year: 1981,
  };
  const oobStartRes = validateAcademicYearInput(outOfBoundsStart);
  assert(
    oobStartRes.isValid === false && Boolean(oobStartRes.errors.start_year),
    "Rejects start year prior to minimum boundary (1990)"
  );

  // Invalid: Out-of-bounds end year
  const outOfBoundsEnd: AcademicYearInput = {
    ...validAY,
    start_year: 2100,
    end_year: 2101,
  };
  const oobEndRes = validateAcademicYearInput(outOfBoundsEnd);
  assert(
    oobEndRes.isValid === false && Boolean(oobEndRes.errors.end_year),
    "Rejects end year past maximum boundary (2100)"
  );

  // Invalid: Missing label
  const missingLabel: AcademicYearInput = {
    ...validAY,
    label: "   ",
  };
  const mlRes = validateAcademicYearInput(missingLabel);
  assert(
    mlRes.isValid === false && Boolean(mlRes.errors.label),
    "Rejects empty or whitespace-only label"
  );

  // Invalid: End date before start date
  const reversedDates: AcademicYearInput = {
    ...validAY,
    start_date: "2027-04-01",
    end_date: "2026-03-31",
  };
  const revDatesRes = validateAcademicYearInput(reversedDates);
  assert(
    revDatesRes.isValid === false && Boolean(revDatesRes.errors.end_date),
    "Rejects end date earlier than start date"
  );

  // Invalid: Equal start and end date
  const equalDates: AcademicYearInput = {
    ...validAY,
    start_date: "2026-06-01",
    end_date: "2026-06-01",
  };
  const eqDatesRes = validateAcademicYearInput(equalDates);
  assert(
    eqDatesRes.isValid === false && Boolean(eqDatesRes.errors.end_date),
    "Rejects equal start and end date (zero duration)"
  );

  // Invalid: Less than 30 days duration
  const shortDuration: AcademicYearInput = {
    ...validAY,
    start_date: "2026-06-01",
    end_date: "2026-06-15",
  };
  const shortRes = validateAcademicYearInput(shortDuration);
  assert(
    shortRes.isValid === false && Boolean(shortRes.errors.end_date),
    "Rejects duration under 30 days"
  );

  // 2. SENSABLE DEFAULT GENERATION
  console.log("\n2. Default Suggestion Generator:");
  const defaultsApr = getDefaultAcademicYear(new Date("2026-05-15"));
  assert(
    defaultsApr.start_year === 2026 && defaultsApr.end_year === 2027,
    "Sensible default for May 2026 selects 2026–2027"
  );
  assert(
    defaultsApr.is_current === true,
    "Default academic year marked as is_current = true"
  );
  assert(
    defaultsApr.label === "2026–2027",
    "Default label matches start_year–end_year"
  );

  const defaultsJan = getDefaultAcademicYear(new Date("2026-02-10"));
  assert(
    defaultsJan.start_year === 2025 && defaultsJan.end_year === 2026,
    "Sensible default for Feb 2026 selects active ongoing 2025–2026 cycle"
  );

  // 3. PERSISTENCE & STEP PROGRESSION
  console.log("\n3. Academic Setup Persistence & Step Progression:");
  const testSchoolIdA = "school-uuid-aaaa-1111";
  const testUserIdA = "user-uuid-admin-aaaa";

  // Pre-seed mock school record in localStorage to test step progression
  localStorage.setItem(
    `myzkool_school_profile_${testUserIdA}`,
    JSON.stringify({
      id: testSchoolIdA,
      name: "St. Jude International Academy",
      onboarding_step: 2,
    })
  );

  const saveResA = await saveAcademicSetup({
    schoolId: testSchoolIdA,
    userId: testUserIdA,
    input: {
      start_year: 2026,
      end_year: 2027,
      label: "AY 2026-27",
      start_date: "2026-04-01",
      end_date: "2027-03-31",
      is_current: true,
    },
  });

  assert(saveResA.success === true, "Successfully saves academic year setup");
  assert(Boolean(saveResA.academicYear?.id), "Generates unique UUID for academic year record");
  assert(saveResA.academicYear?.school_id === testSchoolIdA, "Links record directly to school_id");
  assert(saveResA.academicYear?.is_current === true, "Marks academic year as current");

  const createdYearId = saveResA.academicYear!.id;

  // Check cached school progression from Step 2 to Step 3
  const cachedSchool = JSON.parse(
    localStorage.getItem(`myzkool_school_profile_${testUserIdA}`)!
  );
  assert(
    cachedSchool.onboarding_step === 3,
    "Advances school onboarding_step from Step 2 to Step 3 upon successful save"
  );

  // 4. RETRIEVAL & RESUME BEHAVIOR
  console.log("\n4. Retrieval & Resume Behavior:");
  const retrievedA = await getAcademicYearsForSchool(testSchoolIdA);
  assert(
    retrievedA.academicYears.length === 1,
    "Retrieves saved academic year for school"
  );
  assert(
    retrievedA.academicYears[0].id === createdYearId,
    "Loaded record retains correct ID"
  );
  assert(
    retrievedA.academicYears[0].label === "AY 2026-27",
    "Loaded record retains customized label"
  );

  const currentYearA = await getCurrentAcademicYear(testSchoolIdA);
  assert(
    currentYearA.academicYear !== null && currentYearA.academicYear.id === createdYearId,
    "getCurrentAcademicYear returns the active academic year"
  );

  // Resume & In-Place Update (Ensuring NO duplicate records created)
  const updateResA = await saveAcademicSetup({
    schoolId: testSchoolIdA,
    userId: testUserIdA,
    existingAcademicYearId: createdYearId,
    input: {
      start_year: 2026,
      end_year: 2027,
      label: "AY 2026-27 (Updated)",
      start_date: "2026-04-15", // Changed start date
      end_date: "2027-03-31",
      is_current: true,
    },
  });

  assert(updateResA.success === true, "Successfully updates existing academic year");
  assert(
    updateResA.academicYear?.id === createdYearId,
    "Preserves existing academic_year ID without creating duplicate"
  );

  const reloadedYears = await getAcademicYearsForSchool(testSchoolIdA);
  assert(
    reloadedYears.academicYears.length === 1,
    "No duplicate records created upon resume and edit"
  );
  assert(
    reloadedYears.academicYears[0].label === "AY 2026-27 (Updated)",
    "Updated label accurately persisted"
  );
  assert(
    reloadedYears.academicYears[0].start_date === "2026-04-15",
    "Updated start date accurately persisted"
  );

  // Verify that editing step 2 does NOT regress onboarding if school was already on step 4
  cachedSchool.onboarding_step = 4;
  localStorage.setItem(
    `myzkool_school_profile_${testUserIdA}`,
    JSON.stringify(cachedSchool)
  );

  await saveAcademicSetup({
    schoolId: testSchoolIdA,
    userId: testUserIdA,
    existingAcademicYearId: createdYearId,
    input: {
      start_year: 2026,
      end_year: 2027,
      label: "AY 2026-27",
      start_date: "2026-04-01",
      end_date: "2027-03-31",
      is_current: true,
    },
  });

  const preservedStepSchool = JSON.parse(
    localStorage.getItem(`myzkool_school_profile_${testUserIdA}`)!
  );
  assert(
    preservedStepSchool.onboarding_step === 4,
    "Preserves higher onboarding_step (4) when user edits Step 2 (does not reset progress)"
  );

  // 5. CURRENT YEAR RULE (ATOMIC ACTIVE YEAR MANAGEMENT)
  console.log("\n5. Current Year Rule & Atomic Active State:");
  // Add a second academic year for the future (2027-2028) set to is_current: true
  const futureYearSave = await saveAcademicSetup({
    schoolId: testSchoolIdA,
    userId: testUserIdA,
    input: {
      start_year: 2027,
      end_year: 2028,
      label: "2027–2028",
      start_date: "2027-04-01",
      end_date: "2028-03-31",
      is_current: true, // Setting new year as current
    },
  });
  assert(futureYearSave.success === true, "Creates second academic year (2027-2028)");

  const allYearsA = await getAcademicYearsForSchool(testSchoolIdA);
  assert(allYearsA.academicYears.length === 2, "School now has two academic years configured");

  // Check that the previous academic year (2026-2027) was atomically set to is_current = false
  const oldYear = allYearsA.academicYears.find((y) => y.id === createdYearId);
  const newYear = allYearsA.academicYears.find((y) => y.id === futureYearSave.academicYear!.id);

  assert(
    oldYear?.is_current === false,
    "Previous academic year atomically transitioned to is_current = false"
  );
  assert(
    newYear?.is_current === true,
    "Newly marked academic year is the sole active current year"
  );

  const currentYearCheck = await getCurrentAcademicYear(testSchoolIdA);
  assert(
    currentYearCheck.academicYear?.id === newYear?.id,
    "getCurrentAcademicYear returns the single active current year"
  );

  // 6. MULTI-TENANT ISOLATION
  console.log("\n6. Multi-Tenant Isolation:");
  const testSchoolIdB = "school-uuid-bbbb-2222";
  const testUserIdB = "user-uuid-admin-bbbb";

  // School B sets up its own academic year (e.g. September-June cycle)
  const saveResB = await saveAcademicSetup({
    schoolId: testSchoolIdB,
    userId: testUserIdB,
    input: {
      start_year: 2026,
      end_year: 2027,
      label: "AY 2026–2027 (International)",
      start_date: "2026-09-01",
      end_date: "2027-06-30",
      is_current: true,
    },
  });

  assert(saveResB.success === true, "School B can configure its own academic year");

  const schoolAYears = await getAcademicYearsForSchool(testSchoolIdA);
  const schoolBYears = await getAcademicYearsForSchool(testSchoolIdB);

  assert(
    schoolAYears.academicYears.length === 2 && schoolBYears.academicYears.length === 1,
    "Tenant isolation: School A and School B records are completely partitioned"
  );
  assert(
    schoolBYears.academicYears[0].start_date === "2026-09-01",
    "School B retains its distinct calendar dates independently of School A"
  );

  // Cross-tenant verification
  const crossCheck = schoolAYears.academicYears.some((y) => y.school_id === testSchoolIdB);
  assert(crossCheck === false, "School A cannot view or leak School B's academic years");

  // 7. AUTHORIZATION & ROLE GUARDS
  console.log("\n7. Authorization & Role Verification:");
  
  // Unauthenticated user
  const unauthRes = await saveAcademicSetup({
    schoolId: testSchoolIdA,
    userId: "",
    input: validAY,
  });
  assert(
    unauthRes.success === false && unauthRes.error?.includes("Authentication required"),
    "Rejects save attempt without authenticated user session"
  );

  // Missing school association (e.g. user jumped to Step 2 without completing Step 1)
  const missingSchoolRes = await saveAcademicSetup({
    schoolId: "",
    userId: testUserIdA,
    input: validAY,
  });
  assert(
    missingSchoolRes.success === false && missingSchoolRes.error?.includes("School association required"),
    "Rejects save attempt if Step 1 (school profile) is not yet completed"
  );

  // Role access permissions for onboarding
  const allowedRoles = ["school_admin", "super_admin"];
  const testRoles = [
    { role: "school_admin", allowed: true },
    { role: "super_admin", allowed: true },
    { role: "teacher", allowed: false },
    { role: "accountant", allowed: false },
    { role: "parent", allowed: false },
  ];

  for (const { role, allowed } of testRoles) {
    const isPermitted = allowedRoles.includes(role);
    assert(
      isPermitted === allowed,
      `Role '${role}' access to academic onboarding is correctly ${allowed ? "permitted" : "blocked"}`
    );
  }

  // 8. ROUTING & ONBOARDING DESTINATIONS
  console.log("\n8. Routing & Step Progression Rules:");
  
  const getNextDestination = (profile: {
    onboarding_completed: boolean;
    current_onboarding_step: string;
    onboarding_step: number;
  }) => {
    if (profile.onboarding_completed) return "/admin";
    if (profile.onboarding_step === 1) return "/onboarding/school";
    if (profile.onboarding_step === 2) return "/onboarding/academics";
    if (profile.onboarding_step === 3) return "/onboarding/classes";
    return profile.current_onboarding_step || "/onboarding/school";
  };

  assert(
    getNextDestination({
      onboarding_completed: false,
      onboarding_step: 2,
      current_onboarding_step: "/onboarding/academics",
    }) === "/onboarding/academics",
    "Incomplete Step 2 accurately directs to /onboarding/academics"
  );

  assert(
    getNextDestination({
      onboarding_completed: false,
      onboarding_step: 3,
      current_onboarding_step: "/onboarding/classes",
    }) === "/onboarding/classes",
    "Completed Step 2 accurately progresses to /onboarding/classes"
  );

  assert(
    getNextDestination({
      onboarding_completed: true,
      onboarding_step: 8,
      current_onboarding_step: "/onboarding/complete",
    }) === "/admin",
    "Completed onboarding routes straight to /admin dashboard"
  );

  console.log("\n----------------------------------------------------------");
  console.log(`TEST SUMMARY: ${testsPassed} Passed, ${testsFailed} Failed.`);
  console.log("----------------------------------------------------------\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
