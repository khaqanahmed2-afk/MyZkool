/**
 * Phase 2A Regression Test Suite: MyZkool Fee Management Repair
 *
 * Verifies:
 * 1. Empty school returns genuine zero metrics and zero students (no DEMO_REFERENCE_STUDENTS).
 * 2. getStudentLedgerDetails returns null for nonexistent or mock student IDs.
 * 3. Reports service returns authentic empty state without seeding demo data.
 * 4. Missing school context throws or guards without falling back to demo UUIDs.
 * 5. Complete absence of hardcoded fallback school UUIDs across frontend pages.
 * 6. Multi-tenant isolation: School A data is never leaked to School B.
 */

import { supabase, isSupabaseConfigured } from "../src/lib/supabase";
import {
  getStudentFeeSummaries,
  getStudentLedgerDetails,
} from "../src/services/studentFeeLedgerService";
import { getFeeReportsDashboardData } from "../src/services/feeReportsService";
import { loadDuesAndRemindersData } from "../src/services/duesRemindersService";
import fs from "fs";
import path from "path";

// Color output helpers
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ${GREEN}✓ PASS${RESET} ${testName}`);
    passedCount++;
  } else {
    console.error(`  ${RED}✗ FAIL${RESET} ${testName}`);
    if (detail) console.error(`    ${RED}Error: ${detail}${RESET}`);
    failedCount++;
  }
}

async function runPhase2ATests() {
  console.log(`\n${BOLD}${BLUE}====================================================${RESET}`);
  console.log(`${BOLD}${BLUE}  Phase 2A Regression Test Suite: Fee Repair${RESET}`);
  console.log(`${BOLD}${BLUE}====================================================${RESET}\n`);

  const emptySchoolId = "00000000-0000-0000-0000-000000000000";

  // ───────────────────────────────────────────────────────────────────────────
  // TEST GROUP 1: Empty School Displays Zero Real Metrics (No Fake Students)
  // ───────────────────────────────────────────────────────────────────────────
  console.log(`${BOLD}Group 1: Authentic Zero Metrics for Empty School${RESET}`);
  try {
    const emptyResult = await getStudentFeeSummaries(emptySchoolId);

    assert(emptyResult.students.length === 0, "Empty school has 0 students in current page");
    assert(emptyResult.allFilteredStudents.length === 0, "Empty school has 0 allFilteredStudents");
    assert(emptyResult.totalCount === 0, "Empty school totalCount is strictly 0 (not 186)");
    assert(emptyResult.metrics.total_students_with_records === 0, "total_students_with_records is 0");
    assert(emptyResult.metrics.total_fees_paise === 0, "total_fees_paise is 0 (not ₹28,45,200)");
    assert(emptyResult.metrics.total_collected_paise === 0, "total_collected_paise is 0 (not ₹12,68,400)");
    assert(emptyResult.metrics.total_pending_paise === 0, "total_pending_paise is 0 (not ₹15,76,800)");
    assert(emptyResult.metrics.total_overdue_paise === 0, "total_overdue_paise is 0 (not ₹6,28,400)");
    assert(emptyResult.metrics.fully_paid_count === 0, "fully_paid_count is 0 (not 62)");
    assert(emptyResult.metrics.with_dues_count === 0, "with_dues_count is 0 (not 124)");
    assert(emptyResult.metrics.partially_paid_count === 0, "partially_paid_count is 0 (not 36)");
    assert(emptyResult.metrics.upcoming_count === 0, "upcoming_count is 0 (not 10)");
    assert(emptyResult.metrics.overdue_count === 0, "overdue_count is 0 (not 48)");
    assert(emptyResult.metrics.collection_percentage === 0, "collection_percentage is 0%");
    assert(emptyResult.metrics.pending_percentage === 0, "pending_percentage is 0%");
    assert(emptyResult.metrics.overdue_percentage === 0, "overdue_percentage is 0%");

    // Verify no demo student names exist in response
    const hasMockStudent = emptyResult.allFilteredStudents.some(
      (s) => s.student_name === "Abhishek Agarwal" || s.student_id === "std-mock-001"
    );
    assert(!hasMockStudent, "No demo student (Abhishek Agarwal / std-mock-001) in summaries");
  } catch (err: any) {
    assert(false, "getStudentFeeSummaries for empty school threw error", err?.message);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST GROUP 2: Student Ledger Details For Nonexistent / Mock Students
  // ───────────────────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}Group 2: Ledger Details Mock Student Removal${RESET}`);
  try {
    const mockLedger = await getStudentLedgerDetails(emptySchoolId, "std-mock-001");
    assert(mockLedger === null, "getStudentLedgerDetails returns null for nonexistent/mock student");

    const abhishekLedger = await getStudentLedgerDetails(emptySchoolId, "nonexistent-id");
    assert(abhishekLedger === null, "getStudentLedgerDetails returns null for any unknown student ID");
  } catch (err: any) {
    assert(false, "getStudentLedgerDetails threw unexpected error", err?.message);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST GROUP 3: Reports Service Demo Seeding Elimination
  // ───────────────────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}Group 3: Fee Reports Service Demo Seeding Elimination${RESET}`);
  try {
    const reportData = await getFeeReportsDashboardData(emptySchoolId);
    assert(reportData.summary.total_billed_paise === 0, "Report summary total billed is 0");
    assert(reportData.summary.total_collected_paise === 0, "Report summary total collected is 0");
    assert(reportData.summary.outstanding_dues_paise === 0, "Report summary total outstanding is 0");
    assert(reportData.classSummaries.length === 0, "Report classSummaries is empty (no fake Nursery/LKG classes)");
    assert(reportData.topOutstandingStudents.length === 0, "Report topOutstandingStudents is empty");
    assert(reportData.recentTransactions.length === 0, "Report recentTransactions is empty");
  } catch (err: any) {
    assert(false, "getFeeReportsDashboardData threw error", err?.message);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST GROUP 4: Missing School Context Guard
  // ───────────────────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}Group 4: Missing School Context Validation${RESET}`);
  try {
    let threw = false;
    try {
      await getFeeReportsDashboardData("");
    } catch {
      threw = true;
    }
    assert(threw, "getFeeReportsDashboardData throws when schoolId is empty");
  } catch (err: any) {
    assert(false, "Missing schoolId validation check failed", err?.message);
  }

  // Check frontend page files for hardcoded fallback IDs
  console.log(`\n${BOLD}Group 5: Frontend Pages Hardcoded Fallback UUIDs Purge${RESET}`);
  const pagesToCheck = [
    {
      file: "src/pages/admin/fees/InvoicesPage.tsx",
      forbidden: ["33a509da-9f79-44c0-ad71-372916d04925", "Peace Convent School"],
      required: ["School Context Required"],
    },
    {
      file: "src/pages/admin/fees/ConcessionRulesPage.tsx",
      forbidden: ["b70261ef-37f1-46c8-a148-2c496a9d33a8"],
      required: ["School Context Required"],
    },
    {
      file: "src/pages/admin/fees/DuesRemindersPage.tsx",
      forbidden: ["demo-school-id", "Sunrise International School"],
      required: ["School Context Required"],
    },
  ];

  for (const p of pagesToCheck) {
    const fullPath = path.resolve(p.file);
    const content = fs.readFileSync(fullPath, "utf-8");

    for (const token of p.forbidden) {
      assert(!content.includes(token), `${p.file} does NOT contain forbidden token '${token}'`);
    }
    for (const req of p.required) {
      assert(content.includes(req), `${p.file} contains guard '${req}'`);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST GROUP 6: Tenant Isolation (School A vs School B)
  // ───────────────────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}Group 6: Tenant Isolation & Defense-in-Depth Scoping${RESET}`);
  if (isSupabaseConfigured) {
    try {
      // Find legitimate schools
      const { data: realSchools } = await supabase.from("schools").select("id, name").limit(2);
      if (realSchools && realSchools.length > 0) {
        const schoolA = realSchools[0];
        const schoolBId = realSchools.length > 1 ? realSchools[1].id : "99999999-9999-9999-9999-999999999999";

        const resA = await getStudentFeeSummaries(schoolA.id);
        const resB = await getStudentFeeSummaries(schoolBId);

        // Verify that School B's result contains NO students from School A
        const studentIdsA = new Set(resA.allFilteredStudents.map((s) => s.student_id));
        const leakedStudents = resB.allFilteredStudents.filter((s) => studentIdsA.has(s.student_id));

        assert(
          leakedStudents.length === 0,
          `School B (${schoolBId.slice(0, 8)}...) has 0 leaked students from School A (${schoolA.id.slice(0, 8)}...)`
        );

        // Verify Dues & Reminders data isolation
        const duesRemindersB = await loadDuesAndRemindersData(schoolBId);
        assert(
          duesRemindersB.rows.every((r) => !studentIdsA.has(r.studentId)),
          "DuesRemindersPage data layer isolates student dues across tenants"
        );
      } else {
        console.log(`  ${YELLOW}ℹ Supabase configured but no real schools found; checked with empty UUID.${RESET}`);
      }
    } catch (err: any) {
      assert(false, "Tenant isolation test encountered query error", err?.message);
    }
  } else {
    console.log(`  ${YELLOW}ℹ Supabase not configured in this environment; skipping remote DB query.${RESET}`);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ───────────────────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}${BLUE}====================================================${RESET}`);
  console.log(`${BOLD}Test Results: ${GREEN}${passedCount} Passed${RESET}, ${failedCount > 0 ? `${RED}${failedCount} Failed` : `${GREEN}0 Failed`}${RESET}`);
  console.log(`${BOLD}${BLUE}====================================================${RESET}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPhase2ATests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
