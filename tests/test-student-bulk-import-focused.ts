/**
 * Focused Production Verification Test Suite for Student Bulk Import
 * Tests all 13 core requirements specified in Section 14:
 * 
 * 1. Valid CSV parsing & atomic commit
 * 2. Missing required field validation (first name, last name, dob, gender, class, parent name, parent phone)
 * 3. Invalid phone validation (length, non-digits, non-Indian mobile format)
 * 4. Invalid DOB validation (future date, malformed date, invalid calendar dates)
 * 5. Invalid class validation (class not configured in school)
 * 6. Duplicate CSV row detection (in-file deduplication for identity & admission no)
 * 7. Existing duplicate student in database (matches active student in same school)
 * 8. Parent / sibling auto-linking by phone
 * 9. 2,000-row limit enforcement
 * 10. Empty CSV handling (empty content or headers only)
 * 11. Malformed CSV handling (unbalanced quotes, broken formatting)
 * 12. Cross-tenant protection (school isolation, no cross-school parent/student leaks)
 * 13. Failed transaction & safe rollback integrity
 */

import {
  setSchoolPlan,
  checkSchoolStudentLimit,
  generateImportTemplate,
  autoMapColumns,
  parseAndValidateImportCSV,
  generateErrorReportCSV,
  commitImportBatch,
  getImportBatches,
  rollbackImportBatch,
} from "../src/services/studentOperationsService";
import type {
  Parent,
  Student,
} from "../src/types/students";

// In-memory localStorage polyfill for test environment
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

function cleanStore() {
  store.clear();
}

async function runTestSuite() {
  console.log("==========================================================");
  console.log("MYZKOOL FOCUSED STUDENT BULK IMPORT TEST SUITE");
  console.log("==========================================================");

  const schoolA = "school-tenant-alpha-111";
  const schoolB = "school-tenant-beta-222";
  const actorA = "actor-admin-alpha";
  const availableClassesA = [
    { name: "Class 1", sections: [{ name: "A" }, { name: "B" }] },
    { name: "Class 2", sections: [{ name: "A" }] },
  ];

  cleanStore();
  await setSchoolPlan(schoolA, "Pro");
  await setSchoolPlan(schoolB, "Pro");

  // Mock classes in cache for schools
  localStorage.setItem(`myzkool_classes_${schoolA}_ay-default`, JSON.stringify([
    { id: "c1-a", name: "Class 1", school_id: schoolA },
    { id: "c2-a", name: "Class 2", school_id: schoolA },
  ]));
  localStorage.setItem(`myzkool_sections_${schoolA}_ay-default`, JSON.stringify([
    { id: "s1-a", class_id: "c1-a", name: "A", school_id: schoolA },
    { id: "s2-a", class_id: "c1-a", name: "B", school_id: schoolA },
    { id: "s3-a", class_id: "c2-a", name: "A", school_id: schoolA },
  ]));

  // -------------------------------------------------------------
  // Test 1: Valid CSV parsing & import
  // -------------------------------------------------------------
  console.log("\n1. Valid CSV Parsing & Import:");
  const validCsv = [
    "First Name,Last Name,Date of Birth,Gender,Class,Section,Parent Name,Parent Phone,Admission No",
    "Aryan,Gupta,2018-05-15,male,Class 1,A,Sanjay Gupta,9811122233,ADM-001",
    "Ananya,Sen,2017-09-20,female,Class 2,A,Debashis Sen,9822233344,ADM-002",
  ].join("\n");

  const map1 = autoMapColumns([
    "First Name", "Last Name", "Date of Birth", "Gender", "Class", "Section", "Parent Name", "Parent Phone", "Admission No"
  ]);
  const res1 = await parseAndValidateImportCSV(schoolA, validCsv, map1, availableClassesA);
  assert(res1.total_rows === 2, "Valid CSV parsed exactly 2 rows");
  assert(res1.valid_rows_count === 2, "Both rows marked valid");
  assert(res1.invalid_rows_count === 0, "Zero errors reported on valid CSV");

  const commitRes1 = await commitImportBatch(schoolA, actorA, "valid_students.csv", res1.rows.filter(r => r.is_valid));
  assert(commitRes1.created_rows === 2, "Successfully committed 2 students to database");
  assert(commitRes1.status === "committed", "Batch status is 'committed'");

  // -------------------------------------------------------------
  // Test 2: Missing required field validation
  // -------------------------------------------------------------
  console.log("\n2. Missing Required Field Validation:");
  const missingFieldsCsv = [
    "First Name,Last Name,Date of Birth,Gender,Class,Parent Name,Parent Phone",
    ",Sharma,2018-01-01,male,Class 1,Parent One,9876543210",       // missing first name
    "Rohan,,2018-01-01,male,Class 1,Parent Two,9876543210",         // missing last name
    "Rohan,Sharma,,male,Class 1,Parent Three,9876543210",            // missing DOB
    "Rohan,Sharma,2018-01-01,,Class 1,Parent Four,9876543210",       // missing gender
    "Rohan,Sharma,2018-01-01,male,,Parent Five,9876543210",          // missing class
    "Rohan,Sharma,2018-01-01,male,Class 1,,9876543210",              // missing parent name
    "Rohan,Sharma,2018-01-01,male,Class 1,Parent Seven,",            // missing parent phone
  ].join("\n");

  const map2 = autoMapColumns(["First Name", "Last Name", "Date of Birth", "Gender", "Class", "Parent Name", "Parent Phone"]);
  const res2 = await parseAndValidateImportCSV(schoolA, missingFieldsCsv, map2, availableClassesA);
  assert(res2.invalid_rows_count === 7, "All 7 rows with missing required fields flagged as invalid");
  assert(res2.rows[0].errors.some(e => e.toLowerCase().includes("first name")), "Row 1 flagged for missing first name");
  assert(res2.rows[1].errors.some(e => e.toLowerCase().includes("last name")), "Row 2 flagged for missing last name");
  assert(res2.rows[2].errors.some(e => e.toLowerCase().includes("date of birth")), "Row 3 flagged for missing DOB");
  assert(res2.rows[3].errors.some(e => e.toLowerCase().includes("gender")), "Row 4 flagged for missing gender");
  assert(res2.rows[4].errors.some(e => e.toLowerCase().includes("class")), "Row 5 flagged for missing class");
  assert(res2.rows[5].errors.some(e => e.toLowerCase().includes("parent")), "Row 6 flagged for missing parent name");
  assert(res2.rows[6].errors.some(e => e.toLowerCase().includes("phone")), "Row 7 flagged for missing parent phone");

  // -------------------------------------------------------------
  // Test 3: Invalid phone numbers
  // -------------------------------------------------------------
  console.log("\n3. Invalid Phone Number Validation:");
  const invalidPhoneCsv = [
    "First Name,Last Name,Date of Birth,Gender,Class,Parent Name,Parent Phone",
    "A1,User,2018-01-01,male,Class 1,P1,98765",         // too short (5 digits)
    "A2,User,2018-01-01,male,Class 1,P2,987654321099",   // too long (12 digits)
    "A3,User,2018-01-01,male,Class 1,P3,98765ABCD0",     // alphanumeric
    "A4,User,2018-01-01,male,Class 1,P4,1234567890",     // invalid Indian starting digit (not 6,7,8,9)
  ].join("\n");

  const res3 = await parseAndValidateImportCSV(schoolA, invalidPhoneCsv, map2, availableClassesA);
  assert(res3.invalid_rows_count === 4, "All 4 invalid phone rows flagged as invalid");
  assert(res3.rows[0].errors.some(e => e.toLowerCase().includes("phone")), "Short phone flagged");
  assert(res3.rows[1].errors.some(e => e.toLowerCase().includes("phone")), "Oversized phone flagged");
  assert(res3.rows[2].errors.some(e => e.toLowerCase().includes("phone")), "Alphanumeric phone flagged");
  assert(res3.rows[3].errors.some(e => e.toLowerCase().includes("phone")), "Non-standard starting digit flagged");

  // -------------------------------------------------------------
  // Test 4: Invalid DOB (future date, malformed, invalid calendar)
  // -------------------------------------------------------------
  console.log("\n4. Invalid DOB Validation:");
  const invalidDobCsv = [
    "First Name,Last Name,Date of Birth,Gender,Class,Parent Name,Parent Phone",
    "B1,User,2099-01-01,male,Class 1,P1,9876543210",       // future date
    "B2,User,not-a-date,male,Class 1,P2,9876543210",       // non-date string
    "B3,User,2020-02-31,male,Class 1,P3,9876543210",       // impossible calendar date
  ].join("\n");

  const res4 = await parseAndValidateImportCSV(schoolA, invalidDobCsv, map2, availableClassesA);
  assert(res4.invalid_rows_count === 3, "All 3 invalid DOB rows flagged as invalid");
  assert(res4.rows[0].errors.some(e => e.toLowerCase().includes("future") || e.toLowerCase().includes("birth")), "Future DOB rejected");
  assert(res4.rows[1].errors.some(e => e.toLowerCase().includes("format") || e.toLowerCase().includes("birth")), "Malformed DOB rejected");
  assert(res4.rows[2].errors.some(e => e.toLowerCase().includes("invalid") || e.toLowerCase().includes("birth")), "Impossible calendar date rejected");

  // -------------------------------------------------------------
  // Test 5: Invalid class (class not present in current school)
  // -------------------------------------------------------------
  console.log("\n5. Invalid Class Validation:");
  const invalidClassCsv = [
    "First Name,Last Name,Date of Birth,Gender,Class,Parent Name,Parent Phone",
    "C1,User,2018-01-01,male,Class 12th Sci,P1,9876543210",  // non-existent class
  ].join("\n");

  const res5 = await parseAndValidateImportCSV(schoolA, invalidClassCsv, map2, availableClassesA);
  assert(res5.invalid_rows_count === 1, "Non-existent class flagged as invalid");
  assert(res5.rows[0].errors.some(e => e.toLowerCase().includes("does not exist") || e.toLowerCase().includes("not found")), "Error message specifies class not found/does not exist");

  // -------------------------------------------------------------
  // Test 6: Duplicate CSV row within uploaded file
  // -------------------------------------------------------------
  console.log("\n6. Duplicate CSV Rows Detection (In-File):");
  const inDupCsv = [
    "First Name,Last Name,Date of Birth,Gender,Class,Parent Name,Parent Phone,Admission No",
    "Kunal,Verma,2018-03-01,male,Class 1,P1,9876543210,ADM-900",
    "Kunal,Verma,2018-03-01,male,Class 1,P1,9876543210,ADM-901",  // duplicate name+dob
    "Other,Student,2018-04-01,male,Class 1,P2,9876543211,ADM-900", // duplicate admission_no
  ].join("\n");

  const map6 = autoMapColumns(["First Name", "Last Name", "Date of Birth", "Gender", "Class", "Parent Name", "Parent Phone", "Admission No"]);
  const res6 = await parseAndValidateImportCSV(schoolA, inDupCsv, map6, availableClassesA);
  assert(res6.rows[1].errors.some(e => e.toLowerCase().includes("duplicate student")), "In-file duplicate name+DOB flagged on row 2");
  assert(res6.rows[2].errors.some(e => e.toLowerCase().includes("duplicate admission number")), "In-file duplicate admission number flagged on row 3");

  // -------------------------------------------------------------
  // Test 7: Existing duplicate student in database
  // -------------------------------------------------------------
  console.log("\n7. Existing Duplicate Student in Database:");
  // Res1 already committed 'Aryan Gupta', '2018-05-15' into schoolA
  const dbDupCsv = [
    "First Name,Last Name,Date of Birth,Gender,Class,Parent Name,Parent Phone",
    "Aryan,Gupta,2018-05-15,male,Class 1,Sanjay Gupta,9811122233",
  ].join("\n");

  const res7 = await parseAndValidateImportCSV(schoolA, dbDupCsv, map2, availableClassesA);
  assert(res7.rows[0].is_duplicate_db === true, "Row flagged as matching existing student in database");
  assert(res7.rows[0].warnings?.some(w => w.toLowerCase().includes("already registered") || w.toLowerCase().includes("matches")) === true, "Detailed warning generated for database duplicate");

  // -------------------------------------------------------------
  // Test 8: Parent / sibling linking by phone
  // -------------------------------------------------------------
  console.log("\n8. Parent & Sibling Linking:");
  // Commit sibling of Aryan Gupta with same parent phone (9811122233)
  const siblingCsv = [
    "First Name,Last Name,Date of Birth,Gender,Class,Parent Name,Parent Phone",
    "Tara,Gupta,2020-07-10,female,Class 1,Sanjay Gupta,9811122233",
  ].join("\n");

  const res8 = await parseAndValidateImportCSV(schoolA, siblingCsv, map2, availableClassesA);
  assert(res8.valid_rows_count === 1, "Sibling row is valid");
  await commitImportBatch(schoolA, actorA, "sibling.csv", res8.rows.filter(r => r.is_valid));

  const allParentsRaw = localStorage.getItem(`myzkool_parents_${schoolA}`);
  const allParents: Parent[] = allParentsRaw ? JSON.parse(allParentsRaw) : [];
  const sanjayList = allParents.filter(p => p.phone === "9811122233");
  assert(sanjayList.length === 1, "Only 1 parent record exists for phone 9811122233 (reused, not duplicated)");

  // -------------------------------------------------------------
  // Test 9: 2,000-row limit enforcement
  // -------------------------------------------------------------
  console.log("\n9. 2,000-Row Limit Enforcement:");
  const headerLine = "First Name,Last Name,Date of Birth,Gender,Class,Parent Name,Parent Phone\n";
  const dummyRow = "Test,User,2018-01-01,male,Class 1,Parent,9876543210\n";
  const oversizedCsv = headerLine + dummyRow.repeat(2001);

  let limitErrorThrown = false;
  try {
    await parseAndValidateImportCSV(schoolA, oversizedCsv, map2, availableClassesA);
  } catch (err: any) {
    if (err.message.includes("2,000")) {
      limitErrorThrown = true;
    }
  }
  assert(limitErrorThrown, "Files exceeding 2,000 rows rejected with explicit limit error");

  // -------------------------------------------------------------
  // Test 10: Empty CSV handling
  // -------------------------------------------------------------
  console.log("\n10. Empty CSV Handling:");
  const emptyRes = await parseAndValidateImportCSV(schoolA, "", map2, availableClassesA);
  assert(emptyRes.total_rows === 0 && emptyRes.can_commit === false, "Completely empty CSV safely returns 0 rows and cannot commit");

  const headersOnlyRes = await parseAndValidateImportCSV(
    schoolA,
    "First Name,Last Name,Date of Birth,Gender,Class,Parent Name,Parent Phone\n",
    map2,
    availableClassesA
  );
  assert(headersOnlyRes.total_rows === 0, "Headers-only CSV reports 0 rows without crashing");

  // -------------------------------------------------------------
  // Test 11: Malformed CSV handling (unbalanced quotes)
  // -------------------------------------------------------------
  console.log("\n11. Malformed CSV Handling:");
  const malformedCsv = [
    'First Name,Last Name,Date of Birth,Gender,Class,Parent Name,Parent Phone',
    'Rohan,"Unclosed quote,2018-01-01,male,Class 1,Parent,9876543210',
    'Normal,Student,2018-02-02,female,Class 1,Parent,9876543210',
  ].join("\n");

  const res11 = await parseAndValidateImportCSV(schoolA, malformedCsv, map2, availableClassesA);
  assert(res11 !== null, "Malformed CSV parsed safely without crashing");

  // -------------------------------------------------------------
  // Test 12: Cross-tenant protection
  // -------------------------------------------------------------
  console.log("\n12. Cross-Tenant Protection:");
  // School B imports a student with the same phone (9811122233)
  const schoolBCsv = [
    "First Name,Last Name,Date of Birth,Gender,Class,Parent Name,Parent Phone",
    "Bina,Gupta,2018-05-15,female,Class 1,Sanjay Gupta,9811122233",
  ].join("\n");

  // Configure Class 1 for School B
  localStorage.setItem(`myzkool_classes_${schoolB}_ay-default`, JSON.stringify([
    { id: "c1-b", name: "Class 1", school_id: schoolB },
  ]));

  const res12 = await parseAndValidateImportCSV(schoolB, schoolBCsv, map2, [{ name: "Class 1" }]);
  await commitImportBatch(schoolB, "actor-admin-beta", "school_b.csv", res12.rows.filter(r => r.is_valid));

  // Check parent records in School B vs School A
  const parentsSchoolA: Parent[] = JSON.parse(localStorage.getItem(`myzkool_parents_${schoolA}`) || "[]");
  const parentsSchoolB: Parent[] = JSON.parse(localStorage.getItem(`myzkool_parents_${schoolB}`) || "[]");
  assert(parentsSchoolA.every(p => p.school_id === schoolA), "All School A parents belong exclusively to School A");
  assert(parentsSchoolB.every(p => p.school_id === schoolB), "All School B parents belong exclusively to School B");
  assert(parentsSchoolA[0].id !== parentsSchoolB[0].id, "Parent IDs between schools are isolated (no cross-tenant reuse)");

  // Students in School A vs School B
  const studentsA: Student[] = JSON.parse(localStorage.getItem(`myzkool_students_${schoolA}`) || "[]");
  const studentsB: Student[] = JSON.parse(localStorage.getItem(`myzkool_students_${schoolB}`) || "[]");
  assert(studentsA.every(s => s.school_id === schoolA), "All School A students belong exclusively to School A");
  assert(studentsB.every(s => s.school_id === schoolB), "All School B students belong exclusively to School B");

  // -------------------------------------------------------------
  // Test 13: Failed transaction & safe rollback integrity
  // -------------------------------------------------------------
  console.log("\n13. Failed Transaction & Safe Rollback Integrity:");
  // Test plan capacity exceeded blocks batch commit atomically
  await setSchoolPlan(schoolA, "Basic"); // cap is 800
  // Fill schoolA to 799 students
  const curStudents = JSON.parse(localStorage.getItem(`myzkool_students_${schoolA}`) || "[]");
  while (curStudents.length < 799) {
    curStudents.push({
      id: `std-fill-${curStudents.length}`,
      school_id: schoolA,
      first_name: "Fill",
      last_name: "Student",
      admission_no: `ADM-${curStudents.length}`,
      status: "active",
      created_at: new Date().toISOString(),
    });
  }
  localStorage.setItem(`myzkool_students_${schoolA}`, JSON.stringify(curStudents));

  let commitBlocked = false;
  try {
    // Attempting to commit 2 students when only 1 capacity remains
    await commitImportBatch(schoolA, actorA, "overflow.csv", res1.rows.filter(r => r.is_valid));
  } catch (err: any) {
    if (err.message.includes("LIMIT_REACHED")) {
      commitBlocked = true;
    }
  }
  assert(commitBlocked, "Commit exceeding capacity is rejected atomically with LIMIT_REACHED");

  // Verify rollback on a valid committed batch
  const batches = await getImportBatches(schoolA);
  const targetBatch = batches.find(b => b.status === "committed");
  assert(!!targetBatch, "Found committed batch for rollback verification");
  if (targetBatch) {
    const rbRes = await rollbackImportBatch(schoolA, targetBatch.id, actorA);
    assert(rbRes.success === true, "Batch successfully rolled back");
    assert(rbRes.rolled_back_count > 0, "Imported students soft-deleted on rollback");
    const updatedBatches = await getImportBatches(schoolA);
    const rolledBackBatch = updatedBatches.find(b => b.id === targetBatch.id);
    assert(rolledBackBatch?.status === "rolled_back", "Batch record status updated to 'rolled_back'");
  }

  console.log("\n----------------------------------------------------------");
  console.log(`FOCUSED TEST RESULTS: ${passed} Passed, ${failed} Failed.`);
  console.log("----------------------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
