/**
 * Test Suite: MyZkool Final Onboarding Completion & Full Pipeline Test
 * Onboarding Step 8 of 8 - Route: /onboarding/complete -> /admin
 */

import {
  saveSchoolProfile,
  getSchoolForCurrentUser,
  completeOnboarding,
} from "../src/services/schoolService";
import {
  saveAcademicSetup,
  getCurrentAcademicYear,
} from "../src/services/academicService";
import {
  createClass,
  getClassesWithSections,
  saveClassesSetupProgress,
} from "../src/services/classSectionService";
import {
  createSubject,
  assignSubjectToClass,
  getSubjects,
  saveSubjectsSetupProgress,
} from "../src/services/subjectService";
import {
  selectSubscriptionPlan,
  getSchoolSubscription,
  saveSubscriptionProgress,
} from "../src/services/subscriptionService";
import {
  initializeSchoolWebsite,
  getSchoolWebsite,
  saveWebsiteSetupProgress,
  formatSchoolWebsiteUrl,
  formatParentPortalUrl,
} from "../src/services/websiteService";
import {
  createStaff,
  getStaff,
  saveStaffSetupProgress,
} from "../src/services/staffService";

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

async function runOnboardingCompleteTests() {
  console.log("\n==========================================================");
  console.log("MYZKOOL: FULL ONBOARDING PIPELINE & COMPLETION TEST SUITE");
  console.log("==========================================================\n");

  localStorage.clear();

  const userId = "admin-user-complete-001";
  const userEmail = "principal@heritage.edu";

  // -----------------------------------------------------------------
  // Phase 1: End-to-End Onboarding Stages 1 through 8 Progression
  // -----------------------------------------------------------------
  console.log("1. Full Pipeline Progression (Steps 1 -> 8):");

  // Step 1: School Profile
  const schoolProfileRes = await saveSchoolProfile({
    userId,
    userEmail,
    profileInput: {
      name: "Heritage Valley International School",
      subdomain: "heritage-valley",
      school_type: "k12",
      affiliation_board: "CBSE",
      official_email: userEmail,
      contact_phone: "+91 98765 43210",
      address: "100 Education Lane",
      city: "Bangalore",
      state: "Karnataka",
      pin_code: "560001",
    },
  });

  assert(schoolProfileRes.success && Boolean(schoolProfileRes.school), "Step 1: Creates school profile");
  const school = schoolProfileRes.school!;
  assert(school.onboarding_step === 2, "Step 1 completes: advances onboarding_step to 2");
  assert(school.onboarding_completed === false, "onboarding_completed is false during setup");

  // Step 2: Academic Setup
  const academicRes = await saveAcademicSetup({
    schoolId: school.id,
    userId,
    input: {
      start_year: 2026,
      end_year: 2027,
      label: "Academic Year 2026-2027",
      start_date: "2026-06-01",
      end_date: "2027-05-31",
      is_current: true,
    },
  });

  assert(academicRes.success && Boolean(academicRes.academicYear), "Step 2: Saves academic year");
  const academicYear = academicRes.academicYear!;

  // Step 3: Classes & Sections
  const classRes = await createClass({
    schoolId: school.id,
    academicYearId: academicYear.id,
    input: {
      name: "Grade 10",
      initial_sections: ["A", "B"],
    },
  });

  assert(classRes.success && Boolean(classRes.classRecord), "Step 3: Creates Grade 10 with 2 sections");
  const schoolClass = classRes.classRecord!;

  await saveClassesSetupProgress({
    schoolId: school.id,
    userId,
    academicYearId: academicYear.id,
  });

  // Step 4: Subjects / Curriculum
  const subjectRes = await createSubject({
    schoolId: school.id,
    academicYearId: academicYear.id,
    input: {
      name: "Mathematics",
      code: "MATH-10",
      subject_type: "core",
    },
  });

  assert(subjectRes.success && Boolean(subjectRes.subject), "Step 4: Creates Mathematics subject");
  const subject = subjectRes.subject!;

  await assignSubjectToClass({
    schoolId: school.id,
    academicYearId: academicYear.id,
    classId: schoolClass.id,
    subjectId: subject.id,
  });

  await saveSubjectsSetupProgress({
    schoolId: school.id,
    userId,
    academicYearId: academicYear.id,
    classIds: [schoolClass.id],
  });

  // Step 5: Subscription & Plan Selection
  const subRes = await selectSubscriptionPlan({
    schoolId: school.id,
    userId,
    planSlug: "pro",
    billingCycle: "yearly",
  });

  assert(subRes.success, "Step 5: Selects Pro subscription plan with 14-day trial");

  // Step 6: Website Setup & Initialization
  const webInitRes = await initializeSchoolWebsite({
    school,
  });

  assert(Boolean(webInitRes.website), "Step 6: Initializes public school website");

  await saveWebsiteSetupProgress({
    schoolId: school.id,
    userId,
  });

  // Step 7: Staff Setup
  const staffRes = await createStaff({
    schoolId: school.id,
    input: {
      first_name: "Anita",
      last_name: "Sharma",
      role: "teacher",
      designation: "Head of Science",
      employee_code: "TCH-001",
      email: "anita@heritage.edu",
    },
    userRole: "school_admin",
  });

  assert(staffRes.success, "Step 7: Adds initial teacher to staff directory");

  await saveStaffSetupProgress({
    schoolId: school.id,
    userId,
  });

  const schoolAfterStep7 = await getSchoolForCurrentUser(userId);
  assert(
    schoolAfterStep7.school?.onboarding_step === 8,
    "Step 7 completes: advances onboarding_step to 8"
  );

  // -----------------------------------------------------------------
  // Phase 2: Onboarding Completion Execution
  // -----------------------------------------------------------------
  console.log("\n2. Onboarding Completion Execution (Step 8):");

  const completionRes = await completeOnboarding({
    schoolId: school.id,
    userId,
  });

  assert(completionRes.success, "completeOnboarding returns success: true");
  assert(
    completionRes.school?.onboarding_completed === true,
    "Sets schools.onboarding_completed = true"
  );
  assert(
    completionRes.school?.onboarding_step === 8,
    "Keeps schools.onboarding_step = 8"
  );

  // -----------------------------------------------------------------
  // Phase 3: Comprehensive Non-Regression Verification
  // -----------------------------------------------------------------
  console.log("\n3. Non-Regression Verification:");

  // Re-saving Website Setup should NOT reset onboarding_completed or regress step
  await saveWebsiteSetupProgress({
    schoolId: school.id,
    userId,
  });

  const checkSchoolAfterWebSave = await getSchoolForCurrentUser(userId);
  assert(
    checkSchoolAfterWebSave.school?.onboarding_completed === true,
    "Non-regression: onboarding_completed remains true after re-saving Website Setup"
  );
  assert(
    checkSchoolAfterWebSave.school?.onboarding_step === 8,
    "Non-regression: onboarding_step remains 8 after re-saving Website Setup"
  );

  // Re-saving Staff Setup should NOT reset onboarding_completed or regress step
  await saveStaffSetupProgress({
    schoolId: school.id,
    userId,
  });

  const checkSchoolAfterStaffSave = await getSchoolForCurrentUser(userId);
  assert(
    checkSchoolAfterStaffSave.school?.onboarding_completed === true,
    "Non-regression: onboarding_completed remains true after re-saving Staff Setup"
  );
  assert(
    checkSchoolAfterStaffSave.school?.onboarding_step === 8,
    "Non-regression: onboarding_step remains 8 after re-saving Staff Setup"
  );

  // -----------------------------------------------------------------
  // Phase 4: Tenant Data Integrity & Real Onboarding Summary Loading
  // -----------------------------------------------------------------
  console.log("\n4. Onboarding Data Integrity for Complete Page:");

  // Verify Academic Year retrieval
  const { academicYear: activeYear } = await getCurrentAcademicYear(school.id);
  assert(Boolean(activeYear), "Retrieves active academic year for completion summary");
  assert(activeYear?.start_year === 2026, "Active year start_year is 2026");

  // Verify Classes and Sections count
  const { classes: schoolClasses } = await getClassesWithSections(school.id, activeYear!.id);
  assert(schoolClasses.length === 1, "Retrieves classes for completion summary");
  assert(
    (schoolClasses[0].sections?.length || 0) === 2,
    "Retrieves sections for completion summary"
  );

  // Verify Subjects
  const { subjects: schoolSubjects } = await getSubjects(school.id, activeYear!.id);
  assert(schoolSubjects.length === 1, "Retrieves subjects for completion summary");

  // Verify Subscription
  const { subscription: schoolSub } = await getSchoolSubscription(school.id);
  assert(Boolean(schoolSub), "Retrieves subscription for completion summary");
  assert(schoolSub?.status === "trialing", "Subscription status is trialing");

  // Verify Website
  const { website: schoolWeb } = await getSchoolWebsite(school.id);
  assert(Boolean(schoolWeb), "Retrieves website for completion summary");
  assert(
    formatSchoolWebsiteUrl(school.subdomain) === "https://heritage-valley.myzkool.com",
    "Website URL properly formatted"
  );
  assert(
    formatParentPortalUrl(school.subdomain) === "https://heritage-valley.myzkool.com/parent-login",
    "Parent portal URL properly formatted"
  );

  // Verify Staff
  const { staff: schoolStaff } = await getStaff(school.id);
  assert(schoolStaff.length === 1, "Retrieves staff members for completion summary");
  assert(schoolStaff[0].first_name === "Anita", "Staff member name matches");

  // -----------------------------------------------------------------
  // Phase 5: Multi-Tenant Segregation Across Full Stack
  // -----------------------------------------------------------------
  console.log("\n5. Multi-Tenant Segregation Across Full Stack:");

  const schoolId2 = "tenant-002";
  const user2 = "user-002";

  // Check that Tenant 2 gets 0 staff from Tenant 1
  const tenant2Staff = await getStaff(schoolId2);
  assert(tenant2Staff.staff.length === 0, "Tenant 2 sees 0 staff from Tenant 1");

  // Check that Tenant 2 gets 0 classes from Tenant 1
  const tenant2Classes = await getClassesWithSections(schoolId2, activeYear!.id);
  assert(tenant2Classes.classes.length === 0, "Tenant 2 sees 0 classes from Tenant 1");

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

runOnboardingCompleteTests().catch((err) => {
  console.error("Completion test fatal error:", err);
  process.exit(1);
});
