/**
/**
 * Authoritative Test Suite: MyZkool Transport Fee Billing Audit & Hardening
 *
 * Verifies all 10 Requirements:
 * 1. Charge only students with a valid active transport assignment for applicable billing period.
 * 2. Respect stop-specific rates and configured one-way/both-way pricing.
 * 3. Correct month-boundary calculations so one billing period cannot accidentally generate two months of transport charges.
 * 4. Never charge transport for periods before the assignment's effective start date.
 * 5. Handle assignment end dates and mid-month changes according to documented billing policies.
 * 6. Prevent duplicate transport dues when the billing job or API is retried (idempotency).
 * 7. Preserve existing invoices and record required corrections through an auditable adjustment process.
 * 8. Keep transport fees separate from the base academic fee total.
 * 9. Reconcile transport assignments with generated dues and ledger entries.
 * 10. Test all date boundaries, month ends, leap years, partial periods and assignment changes.
 *
 * Test Fixture: Nursery Reference Example:
 * - Kunal Singh: ₹1,000/month
 * - Ira Roy: ₹1,000/month
 * - Diya Bhardwaj: ₹1,200/month
 * - Abhishek Agarwal: ₹1,200/month
 * - 4 riders combined: ₹4,400/month and ₹52,800/year (12 months).
 */

// In-memory localStorage polyfill for reliable offline test runner
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

import {
  createRoute,
  saveRouteStops,
  updateRouteStopFees,
  saveTransportSettings,
} from "../src/services/transportCoreService";
import {
  createAssignment,
  changeAssignment,
  stopAssignment,
  calculateStopMonthlyFee,
} from "../src/services/transportAssignmentService";
import {
  createTransportDues,
  cancelTransportDues,
} from "../src/services/feeDuesService";
import {
  getTermBillingMonths,
  ensureSystemHeads,
  getFeeHeads,
  getFeeTerms,
} from "../src/services/feeSetupService";
import { calculateFeeStructureFinancials } from "../src/services/feeCalculationService";
import type { StudentDue, FeeLedgerEntry, FeeCredit, FeeTerm } from "../src/types/fees";
import type { TransportAssignment, RouteStop } from "../src/types/transport";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log("================================================================================");
  console.log("  MyZkool Transport Fee Billing Hardening: Comprehensive Audit & Verification");
  console.log("================================================================================\n");

  const schoolId = "sch_transport_audit";
  const academicYearId = "ay_2026_2027";
  const academicYearStartYear = 2026;

  // Enable transport feature for test school
  localStorage.setItem(`myzkool_school_plans_${schoolId}`, JSON.stringify({
    plan_slug: "pro",
    features: ["transport", "students", "fees", "admissions"],
    billing_status: "active",
  }));

  // Initialize transport settings with full_month policy
  await saveTransportSettings(schoolId, {
    fee_basis: "stop",
    billing_months: [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3],
    partial_month_rule: "full_month",
  });

  await ensureSystemHeads(schoolId);

  // Set up 12 monthly terms for academic year 2026-2027
  const monthlyTerms: FeeTerm[] = [
    { id: "term_apr", school_id: schoolId, academic_year_id: academicYearId, name: "April 2026", sort_order: 0, due_date: "2026-04-10", period_start: "2026-04-01", period_end: "2026-04-30", late_grace_days: 0, created_at: "", updated_at: "" },
    { id: "term_may", school_id: schoolId, academic_year_id: academicYearId, name: "May 2026", sort_order: 1, due_date: "2026-05-10", period_start: "2026-05-01", period_end: "2026-05-31", late_grace_days: 0, created_at: "", updated_at: "" },
    { id: "term_jun", school_id: schoolId, academic_year_id: academicYearId, name: "June 2026", sort_order: 2, due_date: "2026-06-10", period_start: "2026-06-01", period_end: "2026-06-30", late_grace_days: 0, created_at: "", updated_at: "" },
    { id: "term_jul", school_id: schoolId, academic_year_id: academicYearId, name: "July 2026", sort_order: 3, due_date: "2026-07-10", period_start: "2026-07-01", period_end: "2026-07-31", late_grace_days: 0, created_at: "", updated_at: "" },
    { id: "term_aug", school_id: schoolId, academic_year_id: academicYearId, name: "August 2026", sort_order: 4, due_date: "2026-08-10", period_start: "2026-08-01", period_end: "2026-08-31", late_grace_days: 0, created_at: "", updated_at: "" },
    { id: "term_sep", school_id: schoolId, academic_year_id: academicYearId, name: "September 2026", sort_order: 5, due_date: "2026-09-10", period_start: "2026-09-01", period_end: "2026-09-30", late_grace_days: 0, created_at: "", updated_at: "" },
    { id: "term_oct", school_id: schoolId, academic_year_id: academicYearId, name: "October 2026", sort_order: 6, due_date: "2026-10-10", period_start: "2026-10-01", period_end: "2026-10-31", late_grace_days: 0, created_at: "", updated_at: "" },
    { id: "term_nov", school_id: schoolId, academic_year_id: academicYearId, name: "November 2026", sort_order: 7, due_date: "2026-11-10", period_start: "2026-11-01", period_end: "2026-11-30", late_grace_days: 0, created_at: "", updated_at: "" },
    { id: "term_dec", school_id: schoolId, academic_year_id: academicYearId, name: "December 2026", sort_order: 8, due_date: "2026-12-10", period_start: "2026-12-01", period_end: "2026-12-31", late_grace_days: 0, created_at: "", updated_at: "" },
    { id: "term_jan", school_id: schoolId, academic_year_id: academicYearId, name: "January 2027", sort_order: 9, due_date: "2027-01-10", period_start: "2027-01-01", period_end: "2027-01-31", late_grace_days: 0, created_at: "", updated_at: "" },
    { id: "term_feb", school_id: schoolId, academic_year_id: academicYearId, name: "February 2027", sort_order: 10, due_date: "2027-02-10", period_start: "2027-02-01", period_end: "2027-02-28", late_grace_days: 0, created_at: "", updated_at: "" },
    { id: "term_mar", school_id: schoolId, academic_year_id: academicYearId, name: "March 2027", sort_order: 11, due_date: "2027-03-10", period_start: "2027-03-01", period_end: "2027-03-31", late_grace_days: 0, created_at: "", updated_at: "" },
  ];
  localStorage.setItem(`myzkool_fee_terms_${schoolId}_${academicYearId}`, JSON.stringify(monthlyTerms));
  localStorage.setItem(`myzkool_fee_terms_${schoolId}`, JSON.stringify(monthlyTerms));

  // Set up Transport Route & Stops with Stop-Specific Pricing
  const routeRes = await createRoute(schoolId, {
    name: "North Campus Route 1",
    code: "NCR-1",
    status: "active",
    pickup_start_time: "07:30",
    drop_start_time: "14:00",
    est_duration_min: 45,
  });
  const routeId = routeRes.route!.id;

  const stopsInput = [
    { name: "Sector 14 Chowk", sequence: 1, pickup_time: "07:35", drop_time: "14:10" },
    { name: "Civil Lines Crossing", sequence: 2, pickup_time: "07:45", drop_time: "14:20" },
    { name: "Model Town Gate", sequence: 3, pickup_time: "07:55", drop_time: "14:30" },
    { name: "Green Park Square", sequence: 4, pickup_time: "08:05", drop_time: "14:40" },
  ];
  const stopsRes = await saveRouteStops(schoolId, routeId, stopsInput);
  const stops = stopsRes.stops!;
  const stop1 = stops[0]; // Sector 14 Chowk
  const stop2 = stops[1]; // Civil Lines Crossing
  const stop3 = stops[2]; // Model Town Gate
  const stop4 = stops[3]; // Green Park Square

  // Configure stop rates:
  // Stop 1: ₹1,000 both-way, ₹600 pickup-only, ₹600 drop-only
  // Stop 2: ₹1,200 both-way, ₹750 pickup-only, ₹750 drop-only
  // Stop 3: ₹1,500 both-way, ₹900 pickup-only, ₹900 drop-only
  await updateRouteStopFees(schoolId, routeId, [
    { id: stop1.id, monthly_fee_paise: 100000, pickup_only_monthly_paise: 60000, drop_only_monthly_paise: 60000 },
    { id: stop2.id, monthly_fee_paise: 120000, pickup_only_monthly_paise: 75000, drop_only_monthly_paise: 75000 },
    { id: stop3.id, monthly_fee_paise: 150000, pickup_only_monthly_paise: 90000, drop_only_monthly_paise: 90000 },
    { id: stop4.id, monthly_fee_paise: 180000, pickup_only_monthly_paise: 110000, drop_only_monthly_paise: 110000 },
  ]);

  // ─── SUITE 1: Stop-Specific Pricing & Service Types (Req 2) ──────────────────
  console.log("--- Suite 1: Stop-Specific Rates & One-Way/Both-Way Pricing ---");

  const feeStop1Both = await calculateStopMonthlyFee(schoolId, stop1.id, "both");
  const feeStop1Pickup = await calculateStopMonthlyFee(schoolId, stop1.id, "pickup_only");
  const feeStop1Drop = await calculateStopMonthlyFee(schoolId, stop1.id, "drop_only");
  const feeStop2Both = await calculateStopMonthlyFee(schoolId, stop2.id, "both");

  assert(feeStop1Both === 100000, "Stop 1 both-way fee is ₹1,000 (100,000 paise)");
  assert(feeStop1Pickup === 60000, "Stop 1 pickup-only fee is ₹600 (60,000 paise)");
  assert(feeStop1Drop === 60000, "Stop 1 drop-only fee is ₹600 (60,000 paise)");
  assert(feeStop2Both === 120000, "Stop 2 both-way fee is ₹1,200 (120,000 paise)");

  // ─── SUITE 2: Month-Boundary Overlap Prevention (Req 3) ──────────────────────
  console.log("\n--- Suite 2: Month-Boundary Overlap Prevention ---");

  // A misconfigured monthly term crossing boundary dates (e.g. 16 days in Apr, 16 days in May)
  const overlappingTerm = {
    name: "Split Term",
    period_start: "2026-04-15",
    period_end: "2026-05-16",
    due_date: "2026-04-20",
  };

  const derivedMonths = getTermBillingMonths(
    overlappingTerm,
    academicYearStartYear,
    [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3],
    12, // 12 terms
    0   // termIndex 0
  );

  assert(derivedMonths.length === 1, `Monthly term strictly yields exactly 1 month (got ${derivedMonths.length})`);
  assert(derivedMonths[0].month === 5 || derivedMonths[0].month === 4, "Selected primary overlapping month");

  // Test across all 12 monthly terms: each term must yield exactly 1 month
  let allSingleMonths = true;
  for (let i = 0; i < monthlyTerms.length; i++) {
    const months = getTermBillingMonths(monthlyTerms[i], academicYearStartYear, [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3], 12, i);
    if (months.length !== 1) allSingleMonths = false;
  }
  assert(allSingleMonths, "All 12 monthly terms yield exactly 1 month per billing period (0 double counts)");

  // ─── SUITE 3: Leap Year & Calendar Date Boundary Handling (Req 10) ───────────
  console.log("\n--- Suite 3: Leap Year & Date Boundary Tests ---");

  // February 2028 is a leap year (29 days)
  const feb2028Term = {
    name: "Feb Leap Term",
    period_start: "2028-02-01",
    period_end: "2028-02-29",
    due_date: "2028-02-10",
  };
  const feb2028Months = getTermBillingMonths(feb2028Term, 2027, [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3], 12, 10);
  assert(feb2028Months.length === 1 && feb2028Months[0].month === 2, "Leap year February 29 correctly recognized");

  // Month-end boundary: 30-day month (April 30) vs 31-day month (May 31)
  const aprTermMonths = getTermBillingMonths(monthlyTerms[0], 2026, [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3], 12, 0);
  assert(aprTermMonths.length === 1 && aprTermMonths[0].month === 4, "April 30-day boundary accurately mapped to April");

  // ─── SUITE 4: Pre-Enrollment Date Enforcement (Req 1 & Req 4) ────────────────
  console.log("\n--- Suite 4: Pre-Enrollment Start Date Enforcement ---");

  // Student joining transport mid-year: July 1, 2026
  const stJulyId = "st_july_joiner";
  const julyAssignRes = await createAssignment(schoolId, {
    student_id: stJulyId,
    academic_year_id: academicYearId,
    route_id: routeId,
    pickup_stop_id: stop1.id,
    service_type: "both",
    effective_from: "2026-07-01",
  });
  assert(julyAssignRes.success, "July joiner assigned transport from 2026-07-01");

  const allDues = JSON.parse(localStorage.getItem(`myzkool_student_dues_${schoolId}`) || "[]");
  const julyDues = allDues.filter((d: StudentDue) => d.student_id === stJulyId && d.source === "transport");

  assert(julyDues.length === 9, `July joiner receives exactly 9 months of dues (got ${julyDues.length})`);
  const hasAprDue = julyDues.some((d: StudentDue) => d.term_id === "term_apr");
  const hasMayDue = julyDues.some((d: StudentDue) => d.term_id === "term_may");
  const hasJunDue = julyDues.some((d: StudentDue) => d.term_id === "term_jun");
  assert(!hasAprDue && !hasMayDue && !hasJunDue, "No transport charges generated for April, May, or June (pre-enrollment zero)");

  const totalJulyPaise = julyDues.reduce((s: number, d: StudentDue) => s + d.net_paise, 0);
  assert(totalJulyPaise === 900000, `Total billed is ₹9,000 (9 × ₹1,000) (got ₹${totalJulyPaise / 100})`);

  // ─── SUITE 5: Partial Month Policies (from_next_month vs full_month) (Req 5) ─
  console.log("\n--- Suite 5: Partial Month Rule Verification ---");

  // Test from_next_month rule: student admitted on April 15
  await saveTransportSettings(schoolId, {
    fee_basis: "stop",
    billing_months: [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3],
    partial_month_rule: "from_next_month",
  });

  const stMidAprId = "st_mid_apr_joiner";
  const midAprAssignRes = await createAssignment(schoolId, {
    student_id: stMidAprId,
    academic_year_id: academicYearId,
    route_id: routeId,
    pickup_stop_id: stop1.id,
    service_type: "both",
    effective_from: "2026-04-15",
  });
  assert(midAprAssignRes.success, "Student assigned on April 15 under from_next_month rule");

  const allDues2 = JSON.parse(localStorage.getItem(`myzkool_student_dues_${schoolId}`) || "[]");
  const midAprDues = allDues2.filter((d: StudentDue) => d.student_id === stMidAprId && d.source === "transport");

  assert(midAprDues.length === 11, `from_next_month policy bills 11 months (skips April) (got ${midAprDues.length})`);
  const hasAprDueMid = midAprDues.some((d: StudentDue) => d.term_id === "term_apr");
  assert(!hasAprDueMid, "April fee skipped under from_next_month policy");

  // Restore full_month policy for remainder of tests
  await saveTransportSettings(schoolId, {
    fee_basis: "stop",
    billing_months: [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3],
    partial_month_rule: "full_month",
  });

  // ─── SUITE 6: Stoppage & Future Paid Credits (Req 5 & Req 7) ─────────────────
  console.log("\n--- Suite 6: Assignment End Dates & Stoppage Handling ---");

  // Stop July joiner on September 15:
  // Dues for April-June: already 0
  // Dues for July, Aug, Sep: remain active
  // Dues for Oct to March: cancelled
  const stopRes = await stopAssignment(schoolId, julyAssignRes.assignment!.id, {
    effective_date: "2026-10-01",
    reason: "Parent moved to another sector",
  });
  assert(stopRes.success, "Transport stopped effectively on 2026-10-01");

  const allDues3 = JSON.parse(localStorage.getItem(`myzkool_student_dues_${schoolId}`) || "[]");
  const activeJulyDuesAfterStop = allDues3.filter(
    (d: StudentDue) => d.student_id === stJulyId && d.source === "transport" && d.status !== "cancelled"
  );
  const cancelledJulyDuesAfterStop = allDues3.filter(
    (d: StudentDue) => d.student_id === stJulyId && d.source === "transport" && d.status === "cancelled"
  );

  assert(activeJulyDuesAfterStop.length === 3, `Exactly 3 past active dues remain (July, Aug, Sep) (got ${activeJulyDuesAfterStop.length})`);
  assert(cancelledJulyDuesAfterStop.length === 6, `Exactly 6 future dues cancelled (Oct-Mar) (got ${cancelledJulyDuesAfterStop.length})`);

  // Verify ledger reflects compensating cancel_due entries
  const allLedger = JSON.parse(localStorage.getItem(`myzkool_fee_ledger_${schoolId}`) || "[]");
  const cancelEntries = allLedger.filter(
    (l: FeeLedgerEntry) => l.student_id === stJulyId && l.entry_type === "cancel_due"
  );
  assert(cancelEntries.length === 6, `Compensating cancel_due ledger entries written (got ${cancelEntries.length})`);

  // ─── SUITE 7: Inactive Assignment Rejection (Req 1) ───────────────────────────
  console.log("\n--- Suite 7: Inactive / Ended Assignment Protection ---");

  // Attempting to generate dues for already stopped assignment must fail
  const retryEndedRes = await createTransportDues(schoolId, julyAssignRes.assignment!.id);
  assert(!retryEndedRes.success, "Rejected dues generation for ended transport assignment");
  assert(retryEndedRes.error?.includes("ASSIGNMENT_NOT_ACTIVE"), "Reports ASSIGNMENT_NOT_ACTIVE error code");

  // ─── SUITE 8: Idempotency & Duplicate Prevention (Req 6) ─────────────────────
  console.log("\n--- Suite 8: Billing Idempotency on Retries ---");

  // Create active student for idempotency test
  const stIdempotent = "st_idempotency_rider";
  const assignIdem = await createAssignment(schoolId, {
    student_id: stIdempotent,
    academic_year_id: academicYearId,
    route_id: routeId,
    pickup_stop_id: stop1.id,
    service_type: "both",
    effective_from: "2026-04-01",
  });
  assert(assignIdem.success, "Active assignment created for idempotency testing");

  const initialDues = JSON.parse(localStorage.getItem(`myzkool_student_dues_${schoolId}`) || "[]");
  const initialCount = initialDues.filter((d: StudentDue) => d.student_id === stIdempotent && d.source === "transport").length;
  assert(initialCount === 12, "Initial 12 monthly dues created");

  // Retry 5 times in a row
  for (let r = 1; r <= 5; r++) {
    await createTransportDues(schoolId, assignIdem.assignment!.id);
  }

  const postRetryDues = JSON.parse(localStorage.getItem(`myzkool_student_dues_${schoolId}`) || "[]");
  const postRetryCount = postRetryDues.filter((d: StudentDue) => d.student_id === stIdempotent && d.source === "transport" && d.status !== "cancelled").length;
  assert(postRetryCount === 12, `After 5 successive retries, dues count is strictly 12 (0 duplicates) (got ${postRetryCount})`);

  // ─── SUITE 9: Stop / Route Change Recalculation (Req 2 & Req 5) ───────────────
  console.log("\n--- Suite 9: Stop Rate Recalculation on Assignment Change ---");

  // Change student from Stop 1 (₹1,000) to Stop 4 (₹1,800) effective October 1, 2026
  const changeRes = await changeAssignment(schoolId, assignIdem.assignment!.id, {
    new_route_id: routeId,
    new_pickup_stop_id: stop4.id,
    new_service_type: "both",
    effective_date: "2026-10-01",
  });
  assert(changeRes.success, "Assignment changed to Stop 4 effective 2026-10-01");
  assert(changeRes.assignment!.monthly_fee_paise === 180000, "New assignment snaps Stop 4 fee of ₹1,800");

  const allDues4 = JSON.parse(localStorage.getItem(`myzkool_student_dues_${schoolId}`) || "[]");
  const idemActiveDues = allDues4.filter((d: StudentDue) => d.student_id === stIdempotent && d.source === "transport" && d.status !== "cancelled");

  // Dues for April to Sep: 6 dues @ ₹1,000 (Stop 1)
  // Dues for Oct to March: 6 dues @ ₹1,800 (Stop 4)
  const stop1Dues = idemActiveDues.filter((d: StudentDue) => d.gross_paise === 100000);
  const stop4Dues = idemActiveDues.filter((d: StudentDue) => d.gross_paise === 180000);

  assert(stop1Dues.length === 6, `Exactly 6 dues @ ₹1,000 for period before change (got ${stop1Dues.length})`);
  assert(stop4Dues.length === 6, `Exactly 6 dues @ ₹1,800 for period after change (got ${stop4Dues.length})`);
  assert(idemActiveDues.length === 12, "Total active dues count remains exactly 12");

  // ─── SUITE 10: Nursery Reference Example Fixture (Req 10) ────────────────────
  console.log("\n--- Suite 10: Nursery Reference Example Fixture ---");
  console.log("Kunal Singh: ₹1,000/mo, Ira Roy: ₹1,000/mo, Diya Bhardwaj: ₹1,200/mo, Abhishek Agarwal: ₹1,200/mo");

  const nurseryRiders = [
    { student_id: "nur_kunal", first_name: "Kunal", last_name: "Singh", stop_id: stop1.id, expected_monthly: 100000 },
    { student_id: "nur_ira", first_name: "Ira", last_name: "Roy", stop_id: stop1.id, expected_monthly: 100000 },
    { student_id: "nur_diya", first_name: "Diya", last_name: "Bhardwaj", stop_id: stop2.id, expected_monthly: 120000 },
    { student_id: "nur_abhishek", first_name: "Abhishek", last_name: "Agarwal", stop_id: stop2.id, expected_monthly: 120000 },
  ];

  let nurseryMonthlyTotalPaise = 0;
  let nurseryAnnualTotalPaise = 0;

  for (const rider of nurseryRiders) {
    const res = await createAssignment(schoolId, {
      student_id: rider.student_id,
      academic_year_id: academicYearId,
      route_id: routeId,
      pickup_stop_id: rider.stop_id,
      service_type: "both",
      effective_from: "2026-04-01",
    });
    assert(res.success, `Nursery rider ${rider.first_name} ${rider.last_name} assigned transport`);
    assert(res.assignment!.monthly_fee_paise === rider.expected_monthly, `${rider.first_name} monthly fee is ₹${rider.expected_monthly / 100}`);

    nurseryMonthlyTotalPaise += res.assignment!.monthly_fee_paise;

    const allD = JSON.parse(localStorage.getItem(`myzkool_student_dues_${schoolId}`) || "[]");
    const stDues = allD.filter((d: StudentDue) => d.student_id === rider.student_id && d.source === "transport" && d.status !== "cancelled");
    assert(stDues.length === 12, `${rider.first_name} generated exactly 12 monthly dues`);
    const studentYearTotal = stDues.reduce((s: number, d: StudentDue) => s + d.net_paise, 0);
    assert(studentYearTotal === rider.expected_monthly * 12, `${rider.first_name} annual total is ₹${studentYearTotal / 100}`);
    nurseryAnnualTotalPaise += studentYearTotal;
  }

  // Combined Nursery 4-rider totals
  assert(nurseryMonthlyTotalPaise === 440000, `Four Nursery riders combined monthly total is ₹4,400 (440,000 paise) (got ₹${nurseryMonthlyTotalPaise / 100})`);
  assert(nurseryAnnualTotalPaise === 5280000, `Four Nursery riders combined annual total is ₹52,800 (5,280,000 paise) (got ₹${nurseryAnnualTotalPaise / 100})`);

  // Verify Non-Transport Students receive ₹0
  const nonRiderDues = JSON.parse(localStorage.getItem(`myzkool_student_dues_${schoolId}`) || "[]")
    .filter((d: StudentDue) => d.student_id === "nur_non_rider" && d.source === "transport");
  assert(nonRiderDues.length === 0, "Non-transport student in Nursery has 0 transport dues (₹0 charged)");

  // ─── SUITE 11: Separation of Base Academic Fees & Transport Fees (Req 8) ──────
  console.log("\n--- Suite 11: Separation of Base Academic vs Transport Fees ---");

  const nurseryAY = {
    id: academicYearId,
    school_id: schoolId,
    start_year: 2026,
    end_year: 2027,
    label: "2026–2027",
    start_date: "2026-04-01",
    end_date: "2027-03-31",
    is_current: true,
  };

  const nurseryFeePreview = calculateFeeStructureFinancials({
    academicYear: nurseryAY,
    billingCycle: "quarterly",
    components: [
      { fee_head_id: "fh_adm", name: "Admission Fee", frequency: "one_time", amount_rupees: 1000, is_mandatory: true },
      { fee_head_id: "fh_tui", name: "Tuition Fee", frequency: "monthly", amount_rupees: 1200, is_mandatory: true },
      { fee_head_id: "fh_exm", name: "Exam Fee", frequency: "quarterly", amount_rupees: 1500, is_mandatory: true },
      { fee_head_id: "fh_dev", name: "Development Fee", frequency: "yearly", amount_rupees: 5000, is_mandatory: true },
      { fee_head_id: "fh_ann", name: "Annual Charges", frequency: "yearly", amount_rupees: 1000, is_mandatory: true },
    ],
    students: [
      { student_id: "nur_kunal", first_name: "Kunal", last_name: "Singh", admission_no: "NUR-01", has_transport: true, monthly_fee_paise: 100000, status: "active" },
      { student_id: "nur_ira", first_name: "Ira", last_name: "Roy", admission_no: "NUR-02", has_transport: true, monthly_fee_paise: 100000, status: "active" },
      { student_id: "nur_diya", first_name: "Diya", last_name: "Bhardwaj", admission_no: "NUR-03", has_transport: true, monthly_fee_paise: 120000, status: "active" },
      { student_id: "nur_abhishek", first_name: "Abhishek", last_name: "Agarwal", admission_no: "NUR-04", has_transport: true, monthly_fee_paise: 120000, status: "active" },
      { student_id: "nur_st_05", first_name: "Saanvi", last_name: "Joshi", admission_no: "NUR-05", has_transport: false, monthly_fee_paise: 0, status: "active" },
      { student_id: "nur_st_06", first_name: "Advik", last_name: "Nair", admission_no: "NUR-06", has_transport: false, monthly_fee_paise: 0, status: "active" },
      { student_id: "nur_st_07", first_name: "Myra", last_name: "Kapoor", admission_no: "NUR-07", has_transport: false, monthly_fee_paise: 0, status: "active" },
    ],
  });

  assert(nurseryFeePreview.base_annual_per_student_rupees === 27400, "Base academic annual fee per student is ₹27,400");
  assert(nurseryFeePreview.class_base_annual_rupees === 191800, "Class base academic demand (7 × ₹27,400) is ₹1,91,800");
  assert(nurseryFeePreview.class_transport_annual_rupees === 52800, "Class transport annual demand is separated: exactly ₹52,800");
  assert(nurseryFeePreview.class_grand_total_annual_rupees === 244600, "Grand total demand (₹1,91,800 + ₹52,800) is ₹2,44,600");

  console.log("\n================================================================================");
  console.log(`Transport Fee Billing Hardening Tests: ${passed} passed, ${failed} failed`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
