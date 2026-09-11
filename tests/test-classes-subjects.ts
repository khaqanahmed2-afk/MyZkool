/**
 * Test Suite: MyZkool Step 5 (Classes & Sections) + Step 6 (Subjects & Curriculum)
 */

import {
  getClassesWithSections,
  createClass,
  updateClass,
  deleteClass,
  reorderClasses,
  createSection,
  updateSection,
  deleteSection,
  applyClassTemplate,
  saveClassesSetupProgress,
} from "../src/services/classSectionService";
import {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getClassSubjects,
  assignSubjectToClass,
  removeSubjectFromClass,
  assignSubjectToMultipleClasses,
  saveSubjectsSetupProgress,
} from "../src/services/subjectService";

// Mock localStorage if in Node environment
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
  console.log("MYZKOOL STEPS 5 & 6: CLASSES, SECTIONS & SUBJECTS TEST SUITE");
  console.log("==========================================================\n");

  const schoolA = "school-uuid-tenant-a";
  const academicYearA1 = "ay-uuid-2026-2027";
  const academicYearA2 = "ay-uuid-2027-2028";
  const userAdminA = "user-uuid-admin-a";

  const schoolB = "school-uuid-tenant-b";
  const academicYearB = "ay-uuid-school-b";
  const userAdminB = "user-uuid-admin-b";

  // 1. CLASS CREATION & MANAGEMENT
  console.log("1. Classes Creation & Validation:");

  // Create Class 1
  const resC1 = await createClass({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    userId: userAdminA,
    input: {
      name: "Class 1",
      initial_sections: ["A", "B"],
    },
  });
  assert(resC1.success === true, "Creates Class 1 successfully");
  assert(resC1.classRecord?.name === "Class 1", "Class name matches input");
  assert(resC1.classRecord?.sections?.length === 2, "Creates initial sections A and B");
  assert(resC1.classRecord?.school_id === schoolA, "Links class to school_id");
  assert(resC1.classRecord?.academic_year_id === academicYearA1, "Links class to academic_year_id");

  // Create Class 2
  const resC2 = await createClass({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    userId: userAdminA,
    input: {
      name: "Class 2",
      initial_sections: ["A"],
    },
  });
  assert(resC2.success === true, "Creates Class 2 successfully");
  assert(resC2.classRecord?.sort_order === 2, "Auto-increments sort_order for Class 2");

  // Duplicate class rejection within same school & academic year
  const resDupClass = await createClass({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    userId: userAdminA,
    input: { name: "class 1" }, // case-insensitive
  });
  assert(
    resDupClass.success === false && resDupClass.error?.includes("already exists"),
    "Rejects duplicate class name (case-insensitive) within same school and academic year"
  );

  // Same class allowed in a DIFFERENT academic year for same school
  const resC1DiffYear = await createClass({
    schoolId: schoolA,
    academicYearId: academicYearA2,
    userId: userAdminA,
    input: { name: "Class 1" },
  });
  assert(
    resC1DiffYear.success === true,
    "Allows same class name in a different academic year (2027-2028)"
  );

  // Same class allowed in a DIFFERENT school
  const resC1DiffSchool = await createClass({
    schoolId: schoolB,
    academicYearId: academicYearB,
    userId: userAdminB,
    input: { name: "Class 1" },
  });
  assert(
    resC1DiffSchool.success === true,
    "Allows same class name in a different school tenant"
  );

  // Update class
  const class1Id = resC1.classRecord!.id;
  const resUpdate = await updateClass({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    classId: class1Id,
    input: { name: "Grade 1" },
  });
  assert(resUpdate.success === true, "Updates class name to 'Grade 1'");
  assert(resUpdate.classRecord?.name === "Grade 1", "Updated name reflected in record");

  // Duplicate check on update
  const resDupUpdate = await updateClass({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    classId: class1Id,
    input: { name: "Class 2" }, // already exists
  });
  assert(
    resDupUpdate.success === false,
    "Rejects renaming class to an existing class name in the same academic year"
  );

  // Rename back to Class 1
  await updateClass({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    classId: class1Id,
    input: { name: "Class 1" },
  });

  // Reorder classes
  const class2Id = resC2.classRecord!.id;
  const resReorder = await reorderClasses({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    classIds: [class2Id, class1Id],
  });
  assert(resReorder.success === true, "Reorders classes");

  const reorderedClasses = await getClassesWithSections(schoolA, academicYearA1);
  assert(
    reorderedClasses.classes[0].id === class2Id && reorderedClasses.classes[1].id === class1Id,
    "Persists new sort_order order (Class 2 first, Class 1 second)"
  );

  // Reorder back
  await reorderClasses({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    classIds: [class1Id, class2Id],
  });

  // 2. SECTION MANAGEMENT
  console.log("\n2. Sections Creation & Validation:");

  // Create Section C in Class 1
  const resSecC = await createSection({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    classId: class1Id,
    input: { name: "C" },
  });
  assert(resSecC.success === true, "Adds Section C to Class 1");
  assert(resSecC.sectionRecord?.name === "C", "Section name matches input");

  // Duplicate section in same class rejected
  const resDupSec = await createSection({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    classId: class1Id,
    input: { name: "c" }, // case-insensitive
  });
  assert(
    resDupSec.success === false && resDupSec.error?.includes("already exists"),
    "Rejects duplicate section 'C' within the same class"
  );

  // Same section name allowed in a DIFFERENT class
  const resSecCInClass2 = await createSection({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    classId: class2Id,
    input: { name: "C" },
  });
  assert(
    resSecCInClass2.success === true,
    "Allows same section name 'C' in a different class (Class 2)"
  );

  // Update section name
  const secCId = resSecC.sectionRecord!.id;
  const resUpdateSec = await updateSection({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    classId: class1Id,
    sectionId: secCId,
    input: { name: "Gamma" },
  });
  assert(resUpdateSec.success === true, "Updates section name to 'GAMMA'");

  // Delete section
  const resDelSec = await deleteSection({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    sectionId: secCId,
  });
  assert(resDelSec.success === true, "Deletes section safely");

  const checkClass1Sections = await getClassesWithSections(schoolA, academicYearA1);
  const updatedC1 = checkClass1Sections.classes.find((c) => c.id === class1Id);
  assert(
    updatedC1?.sections?.some((s) => s.id === secCId) === false,
    "Deleted section no longer appears in Class 1 sections list"
  );

  // 3. CLASS DELETION (SAFE CASCADING)
  console.log("\n3. Class Deletion Safety:");
  // Create temporary class 99
  const resTempClass = await createClass({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    userId: userAdminA,
    input: { name: "Temp Class", initial_sections: ["A", "B"] },
  });
  const tempClassId = resTempClass.classRecord!.id;

  const resDelClass = await deleteClass({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    classId: tempClassId,
  });
  assert(resDelClass.success === true, "Deletes temporary class");

  const afterDelList = await getClassesWithSections(schoolA, academicYearA1);
  assert(
    afterDelList.classes.some((c) => c.id === tempClassId) === false,
    "Deleted class removed from active classes"
  );

  // 4. QUICK SETUP TEMPLATES
  console.log("\n4. Quick Setup Templates:");
  const testSchoolTemplate = "school-uuid-template-test";
  const testAYTemplate = "ay-uuid-template-test";

  const templateRes = await applyClassTemplate({
    schoolId: testSchoolTemplate,
    academicYearId: testAYTemplate,
    userId: userAdminA,
    templateId: "primary_1_5",
  });
  assert(templateRes.success === true, "Applies 'Primary Wing (1–5)' template");
  assert(templateRes.createdCount === 5, "Creates 5 grade classes");

  const templateClasses = await getClassesWithSections(testSchoolTemplate, testAYTemplate);
  assert(templateClasses.classes.length === 5, "All 5 classes exist");
  assert(
    templateClasses.classes.every((c) => (c.sections?.length || 0) >= 2),
    "Every templated class has default sections A and B"
  );

  // 5. SUBJECTS MANAGEMENT
  console.log("\n5. Subjects Creation & Validation:");

  // Create Mathematics
  const resMath = await createSubject({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    input: {
      name: "Mathematics",
      code: "MAT",
      subject_type: "core",
    },
  });
  assert(resMath.success === true, "Creates Subject 'Mathematics'");
  assert(resMath.subject?.code === "MAT", "Subject code stored uppercase");

  // Create English
  const resEng = await createSubject({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    input: {
      name: "English",
      code: "ENG",
      subject_type: "core",
    },
  });
  assert(resEng.success === true, "Creates Subject 'English'");

  // Create Science
  const resSci = await createSubject({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    input: {
      name: "Science",
      code: "SCI",
      subject_type: "core",
    },
  });
  assert(resSci.success === true, "Creates Subject 'Science'");

  // Duplicate subject rejection (case-insensitive)
  const resDupSub = await createSubject({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    input: {
      name: "mathematics", // case-insensitive
    },
  });
  assert(
    resDupSub.success === false && resDupSub.error?.includes("already exists"),
    "Rejects duplicate subject name (case-insensitive)"
  );

  // Update subject
  const mathId = resMath.subject!.id;
  const resUpdateSub = await updateSubject({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    subjectId: mathId,
    input: {
      name: "Advanced Mathematics",
      code: "AMAT",
    },
  });
  assert(resUpdateSub.success === true, "Updates subject name and code");
  assert(resUpdateSub.subject?.name === "Advanced Mathematics", "Updated name reflected");

  // Update back
  await updateSubject({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    subjectId: mathId,
    input: { name: "Mathematics", code: "MAT" },
  });

  // 6. CLASS-SUBJECT ASSOCIATIONS & REUSE
  console.log("\n6. Class-Subject Assignments & Reusability:");
  const engId = resEng.subject!.id;

  // Assign Mathematics to Class 1
  const resAssign1 = await assignSubjectToClass({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    classId: class1Id,
    subjectId: mathId,
  });
  assert(resAssign1.success === true, "Assigns Mathematics to Class 1");

  // Assign Mathematics to Class 2 (Reusability)
  const resAssign2 = await assignSubjectToClass({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    classId: class2Id,
    subjectId: mathId,
  });
  assert(
    resAssign2.success === true,
    "Reuses the same Mathematics subject record in Class 2"
  );

  // Duplicate assignment within same class rejected
  const resDupAssign = await assignSubjectToClass({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    classId: class1Id,
    subjectId: mathId,
  });
  assert(
    resDupAssign.success === false && resDupAssign.error?.includes("already assigned"),
    "Prevents duplicate assignment of same subject to same class"
  );

  // Batch assign English to both Class 1 and Class 2
  const batchAssignRes = await assignSubjectToMultipleClasses({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    subjectId: engId,
    classIds: [class1Id, class2Id],
  });
  assert(
    batchAssignRes.success === true && batchAssignRes.count === 2,
    "Batch assigns English across multiple classes"
  );

  // Remove assignment
  const resRemoveAssign = await removeSubjectFromClass({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    classId: class2Id,
    subjectId: mathId,
  });
  assert(resRemoveAssign.success === true, "Removes Mathematics assignment from Class 2");

  const csList = await getClassSubjects(schoolA, academicYearA1);
  const mathInClass2 = csList.classSubjects.some(
    (cs) => cs.class_id === class2Id && cs.subject_id === mathId
  );
  assert(mathInClass2 === false, "Mathematics no longer assigned to Class 2");

  // Subject is STILL assigned to Class 1
  const mathInClass1 = csList.classSubjects.some(
    (cs) => cs.class_id === class1Id && cs.subject_id === mathId
  );
  assert(mathInClass1 === true, "Mathematics remains intact in Class 1");

  // Re-assign Science to Class 2 so every class has a subject
  await assignSubjectToClass({
    schoolId: schoolA,
    academicYearId: academicYearA1,
    classId: class2Id,
    subjectId: resSci.subject!.id,
  });

  // 7. MULTI-TENANT ISOLATION
  console.log("\n7. Multi-Tenant Isolation:");
  const schoolAClasses = await getClassesWithSections(schoolA, academicYearA1);
  const schoolBClasses = await getClassesWithSections(schoolB, academicYearB);

  assert(
    schoolAClasses.classes.length === 2 && schoolBClasses.classes.length === 1,
    "School A and School B have completely isolated class sets"
  );
  assert(
    schoolAClasses.classes.every((c) => c.school_id === schoolA),
    "All School A classes belong strictly to Tenant A"
  );
  assert(
    schoolBClasses.classes.every((c) => c.school_id === schoolB),
    "All School B classes belong strictly to Tenant B"
  );

  const schoolASubjects = await getSubjects(schoolA, academicYearA1);
  const schoolBSubjects = await getSubjects(schoolB, academicYearB);
  assert(
    schoolBSubjects.subjects.length === 0,
    "School B subject library is initially empty and independent of School A"
  );

  // 8. ONBOARDING STEP PROGRESSION & NON-REGRESSION
  console.log("\n8. Onboarding Step Progression & Non-Regression:");

  // Mock school profile in storage for user A
  localStorage.setItem(
    `myzkool_school_profile_${userAdminA}`,
    JSON.stringify({
      id: schoolA,
      name: "St. Jude Academy",
      onboarding_step: 3,
    })
  );

  // Progress Step 3 (Classes) -> Step 4 (Subjects)
  const saveClassesStep = await saveClassesSetupProgress({
    schoolId: schoolA,
    userId: userAdminA,
    academicYearId: academicYearA1,
  });
  assert(saveClassesStep.success === true, "Step 3 (Classes) saves progress");

  let cachedSchool = JSON.parse(
    localStorage.getItem(`myzkool_school_profile_${userAdminA}`)!
  );
  assert(
    cachedSchool.onboarding_step === 4,
    "Advances school onboarding_step from Step 3 to Step 4"
  );

  // Progress Step 4 (Subjects) -> Step 5 (Subscription)
  const saveSubjectsStep = await saveSubjectsSetupProgress({
    schoolId: schoolA,
    userId: userAdminA,
    academicYearId: academicYearA1,
    classIds: [class1Id, class2Id],
  });
  assert(saveSubjectsStep.success === true, "Step 4 (Subjects) saves progress");

  cachedSchool = JSON.parse(
    localStorage.getItem(`myzkool_school_profile_${userAdminA}`)!
  );
  assert(
    cachedSchool.onboarding_step === 5,
    "Advances school onboarding_step from Step 4 to Step 5"
  );

  // Non-regression: if user returns to Step 3 while on Step 5, does NOT regress step back to 3
  await saveClassesSetupProgress({
    schoolId: schoolA,
    userId: userAdminA,
    academicYearId: academicYearA1,
  });

  cachedSchool = JSON.parse(
    localStorage.getItem(`myzkool_school_profile_${userAdminA}`)!
  );
  assert(
    cachedSchool.onboarding_step === 5,
    "Preserves higher onboarding_step (5) when re-saving Step 3 (non-regression)"
  );

  // 9. RESUME BEHAVIOR WITHOUT DUPLICATION
  console.log("\n9. Resume Behavior & Record Identity:");
  const reloadedA = await getClassesWithSections(schoolA, academicYearA1);
  assert(
    reloadedA.classes.length === 2,
    "Resumed class list matches exact count without duplicate items"
  );
  assert(
    reloadedA.classes[0].id === class1Id,
    "Resumed class retains permanent UUID"
  );

  const reloadedSub = await getSubjects(schoolA, academicYearA1);
  assert(
    reloadedSub.subjects.length === 3,
    "Resumed subjects library contains exact count without duplicate items"
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
