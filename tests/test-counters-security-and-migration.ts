/**
 * Test Suite: Counter Security, Authorization & Forward Migration Verification
 * Verifies:
 * 1. Migration 020 immutability and Forward Migration 20261016080000 completeness
 * 2. Invalid parameter rejection for counter RPC functions
 * 3. Authorized tenant counter increments & consecutive reservations
 * 4. Cross-school isolation (School A vs School B)
 * 5. Concurrency safety (no duplicate numbers under parallel calls)
 * 6. Bulk-import admission number standardized formatting (ADM-YYYY-####)
 */

import fs from "fs";
import path from "path";
import { getNextCounter, reserveCounters, formatAdmissionNumber } from "../src/services/studentService";
import { commitImportBatch } from "../src/services/studentOperationsService";

// Mock localStorage if in pure node environment
if (typeof localStorage === "undefined") {
  const store = new Map<string, string>();
  (global as any).localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, val: string) => store.set(key, val),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };
}

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedCount++;
  }
}

async function runTests() {
  console.log("==========================================================");
  console.log("COUNTER SECURITY & MIGRATION VERIFICATION SUITE");
  console.log("==========================================================\n");

  // -------------------------------------------------------------------------
  // 1. Migration File Integrity & Forward Migration Check
  // -------------------------------------------------------------------------
  console.log("1. Migration File Integrity & Forward Migration Verification:");

  const migration020Path = path.join(process.cwd(), "supabase", "migrations", "020_student_bulk_import_rpc.sql");
  const forwardMigrationPath = path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "20261016080000_secure_counters_and_standardize_admission_no.sql"
  );

  assert(fs.existsSync(migration020Path), "Original migration 020 exists");
  const migration020Content = fs.readFileSync(migration020Path, "utf-8");
  assert(
    migration020Content.includes("v_admission_no := 'ADM/' || v_current_year || '/' || LPAD"),
    "Migration 020 restored to original immutable state with slash format intact"
  );

  assert(fs.existsSync(forwardMigrationPath), "Forward migration 20261016080000 exists");
  const forwardMigrationContent = fs.readFileSync(forwardMigrationPath, "utf-8");

  assert(
    forwardMigrationContent.includes("CREATE OR REPLACE FUNCTION public.get_next_counter"),
    "Forward migration replaces get_next_counter"
  );
  assert(
    forwardMigrationContent.includes("CREATE OR REPLACE FUNCTION public.reserve_counters"),
    "Forward migration replaces reserve_counters"
  );
  assert(
    forwardMigrationContent.includes("CREATE OR REPLACE FUNCTION public.commit_student_import_batch"),
    "Forward migration replaces commit_student_import_batch"
  );

  assert(
    forwardMigrationContent.includes("is_school_member(p_school_id)") &&
      forwardMigrationContent.includes("is_school_admin(p_school_id)"),
    "Forward migration includes multi-tenant authorization check in counter functions"
  );

  assert(
    forwardMigrationContent.includes("v_admission_no := 'ADM-' || v_current_year || '-' || LPAD"),
    "Forward migration standardizes generated admission numbers to hyphenated ADM-YYYY-#### format"
  );

  assert(
    forwardMigrationContent.includes("SET search_path = public"),
    "All replaced functions restrict search_path to public (safe against search_path hijack)"
  );
  assert(
    forwardMigrationContent.includes("SECURITY DEFINER"),
    "Functions maintain SECURITY DEFINER attribute"
  );
  assert(
    forwardMigrationContent.includes("GRANT EXECUTE ON FUNCTION public.commit_student_import_batch") &&
      forwardMigrationContent.includes("GRANT EXECUTE ON FUNCTION public.get_next_counter") &&
      forwardMigrationContent.includes("GRANT EXECUTE ON FUNCTION public.reserve_counters"),
    "Appropriate execute grants preserved for authenticated role"
  );

  // -------------------------------------------------------------------------
  // 2. Invalid Parameters Validation
  // -------------------------------------------------------------------------
  console.log("\n2. Invalid Parameters Validation:");

  const nullSchoolRes = await getNextCounter("", "admission_no");
  assert(nullSchoolRes.value === 0 && Boolean(nullSchoolRes.error), "Empty school_id rejected by getNextCounter");

  const nullKeyRes = await getNextCounter("school-123", "");
  assert(nullKeyRes.value === 0 && Boolean(nullKeyRes.error), "Empty key rejected by getNextCounter");

  const zeroReserveRes = await reserveCounters("school-123", "admission_no", 0);
  assert(zeroReserveRes.startValue === 0 && Boolean(zeroReserveRes.error), "Zero count rejected by reserveCounters");

  const negReserveRes = await reserveCounters("school-123", "admission_no", -5);
  assert(negReserveRes.startValue === 0 && Boolean(negReserveRes.error), "Negative count rejected by reserveCounters");

  const emptyKeyReserveRes = await reserveCounters("school-123", "", 5);
  assert(emptyKeyReserveRes.startValue === 0 && Boolean(emptyKeyReserveRes.error), "Empty key rejected by reserveCounters");

  // -------------------------------------------------------------------------
  // 3. Authorized Tenant Counter Allocation & Block Reservation
  // -------------------------------------------------------------------------
  console.log("\n3. Authorized Tenant Counter Allocation & Block Reservation:");

  const schoolA = `test-school-auth-${Date.now()}`;
  localStorage.removeItem(`myzkool_counters_${schoolA}`);

  const val1 = await getNextCounter(schoolA, "admission_no");
  assert(val1.value === 1, "First getNextCounter returns 1");

  const val2 = await getNextCounter(schoolA, "admission_no");
  assert(val2.value === 2, "Second getNextCounter returns 2");

  // Reserve block of 5 numbers (should return startValue = 3)
  const blockRes = await reserveCounters(schoolA, "admission_no", 5);
  assert(blockRes.startValue === 3, "reserveCounters block starts at 3");

  // Next single counter after reserving 5 (3, 4, 5, 6, 7) must be 8
  const val3 = await getNextCounter(schoolA, "admission_no");
  assert(val3.value === 8, "Next getNextCounter after block reservation of 5 starts at 8");

  // -------------------------------------------------------------------------
  // 4. Cross-School Multi-Tenant Isolation
  // -------------------------------------------------------------------------
  console.log("\n4. Cross-School Multi-Tenant Isolation:");

  const schoolB = `test-school-isolated-b-${Date.now()}`;
  localStorage.removeItem(`myzkool_counters_${schoolB}`);

  const valSchoolB = await getNextCounter(schoolB, "admission_no");
  assert(valSchoolB.value === 1, "School B counter starts at 1 independently of School A");

  const nextValSchoolA = await getNextCounter(schoolA, "admission_no");
  assert(nextValSchoolA.value === 9, "School A counter advances independently to 9 without interference from School B");

  // Different counter key within same school
  const tcVal1 = await getNextCounter(schoolA, "student_tc_no");
  assert(tcVal1.value === 1, "Distinct counter key (student_tc_no) starts independently at 1");

  // -------------------------------------------------------------------------
  // 5. Counter Concurrency & Collision Freedom
  // -------------------------------------------------------------------------
  console.log("\n5. Counter Concurrency & Collision Freedom:");

  const schoolConcurrent = `test-school-concurrent-${Date.now()}`;
  localStorage.removeItem(`myzkool_counters_${schoolConcurrent}`);

  const concurrentCalls = 30;
  const promises: Promise<number>[] = [];

  for (let i = 0; i < concurrentCalls; i++) {
    promises.push(
      getNextCounter(schoolConcurrent, "seq_key").then((r) => r.value)
    );
  }

  const results = await Promise.all(promises);
  const uniqueResults = new Set(results);

  assert(
    results.length === concurrentCalls,
    `Executed ${concurrentCalls} parallel counter requests`
  );
  assert(
    uniqueResults.size === concurrentCalls,
    `All ${concurrentCalls} counter values are strictly unique (no collisions)`
  );
  assert(
    Math.min(...results) >= 1 && Math.max(...results) <= concurrentCalls,
    `Allocated values cover range 1 to ${concurrentCalls}`
  );

  // -------------------------------------------------------------------------
  // 6. Bulk Import Admission Number Formatting Standard
  // -------------------------------------------------------------------------
  console.log("\n6. Bulk Import Standard Admission Number Formatting:");

  const currentYear = new Date().getFullYear();
  const formattedSample = formatAdmissionNumber(currentYear, 42);
  assert(
    formattedSample === `ADM-${currentYear}-0042`,
    `formatAdmissionNumber generates hyphenated format: ${formattedSample}`
  );

  const importSchoolId = `test-school-import-fmt-${Date.now()}`;
  localStorage.removeItem(`myzkool_counters_${importSchoolId}`);
  localStorage.removeItem(`myzkool_students_${importSchoolId}`);

  const importBatchRes = await commitImportBatch(
    importSchoolId,
    "admin-actor",
    "students.csv",
    [
      {
        row_index: 0,
        is_valid: true,
        errors: [],
        data: {
          first_name: "Rahul",
          last_name: "Dravid",
          dob: "2015-01-11",
          gender: "male",
          parent_name: "Sharad Dravid",
          parent_phone: "9876543210",
        },
      },
      {
        row_index: 1,
        is_valid: true,
        errors: [],
        data: {
          first_name: "Sourav",
          last_name: "Ganguly",
          dob: "2015-07-08",
          gender: "male",
          parent_name: "Chandidas Ganguly",
          parent_phone: "9876543211",
        },
      },
    ],
    "ay-2026"
  );

  assert(importBatchRes.created_rows === 2, "Bulk import committed 2 students");

  const studentsKey = `myzkool_students_${importSchoolId}`;
  const importedStudents: any[] = JSON.parse(localStorage.getItem(studentsKey) || "[]");
  const adm1 = importedStudents[0]?.admission_no;
  const adm2 = importedStudents[1]?.admission_no;

  assert(
    adm1 === `ADM-${currentYear}-0001`,
    `First imported student has standardized admission number ADM-${currentYear}-0001 (got ${adm1})`
  );
  assert(
    adm2 === `ADM-${currentYear}-0002`,
    `Second imported student has standardized admission number ADM-${currentYear}-0002 (got ${adm2})`
  );
  assert(
    !adm1?.includes("/") && !adm2?.includes("/"),
    "Zero forward slashes in generated bulk-import admission numbers"
  );

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("\n----------------------------------------------------------");
  console.log(`SECURITY & MIGRATION TEST SUMMARY: ${passedCount} Passed, ${failedCount} Failed.`);
  console.log("----------------------------------------------------------\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
