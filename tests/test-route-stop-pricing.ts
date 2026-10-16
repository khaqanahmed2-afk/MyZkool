/**
 * Route-Wise Stop Transport Pricing Test Suite
 *
 * Verifies all requirements from prompt:
 * 1. Different prices for five stops on the same route.
 * 2. Correct both-way, pickup-only, and drop-only fee selection.
 * 3. Correct stop-ID validation (database UUID, not stop name).
 * 4. Missing pricing and invalid fee handling (clear error, no silent fallbacks).
 * 5. Route changes and stop changes with correct pricing recalculation.
 * 6. Academic year and billing-month handling.
 * 7. Duplicate assignment and duplicate dues prevention (idempotency).
 * 8. Cross-school access restrictions.
 * 9. Historical and paid fee preservation.
 * 10. Student Admission integration with stop-specific pricing.
 */

import {
  createRoute,
  saveRouteStops,
  getRouteById,
  updateRouteStopFees,
  saveTransportSettings,
} from "../src/services/transportCoreService";
import {
  calculateStopMonthlyFee,
  createAssignment,
  changeAssignment,
  stopAssignment,
} from "../src/services/transportAssignmentService";
import { createFeeService } from "../src/services/feeService";
import { admitStudentTransactional } from "../src/services/studentService";
import type { RouteStop, RouteStopFeeInput } from "../src/types/transport";
import type { StudentDue, FeeLedgerEntry } from "../src/types/fees";

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

function cleanLocalStorage() {
  if (typeof localStorage !== "undefined") {
    localStorage.clear();
  }
}

async function runTestSuite() {
  console.log("==========================================================");
  console.log("MYZKOOL ROUTE-WISE STOP TRANSPORT PRICING TEST SUITE");
  console.log("==========================================================\n");

  cleanLocalStorage();

  const schoolA = "school-test-route-pricing-a";
  const schoolB = "school-test-route-pricing-b";
  const academicYearId = "ay-2026-2027";
  const actorId = "admin-user-1";

  // Enable transport feature for both schools
  localStorage.setItem(`myzkool_school_plans_${schoolA}`, JSON.stringify({
    plan_slug: "pro",
    features: ["transport", "students", "fees", "admissions"],
    billing_status: "active",
  }));
  localStorage.setItem(`myzkool_school_plans_${schoolB}`, JSON.stringify({
    plan_slug: "pro",
    features: ["transport", "students", "fees", "admissions"],
    billing_status: "active",
  }));

  // Setup transport settings: 10 billing months (Apr-Jan)
  await saveTransportSettings(schoolA, {
    fee_basis: "stop",
    billing_months: [4, 5, 6, 7, 8, 9, 10, 11, 12, 1], // 10 months
  });

  // Setup fee terms for School A
  localStorage.setItem(`myzkool_fee_terms_${schoolA}_${academicYearId}`, JSON.stringify([
    { id: "term-1", name: "Term 1", due_date: "2026-04-10", sort_order: 1 },
    { id: "term-2", name: "Term 2", due_date: "2026-09-10", sort_order: 2 },
  ]));

  console.log("1. Setting up Route with 5 Stops on the Same Route:");
  const routeRes = await createRoute(schoolA, {
    name: "Route 1 - Gomti Express",
    code: "R101",
    pickup_start_time: "07:00",
    drop_start_time: "14:00",
    est_duration_min: 50,
    status: "active",
  });

  assert(routeRes.success && Boolean(routeRes.route?.id), "Route 1 created successfully");
  const routeId = routeRes.route!.id;

  // Create 5 stops along the route with sequential pickup times
  const stopsInput = [
    { name: "Hazratganj Chauraha", sequence: 1, pickup_time: "07:05", drop_time: "14:45" },
    { name: "Charbagh Station", sequence: 2, pickup_time: "07:15", drop_time: "14:35" },
    { name: "Alambagh Bus Stand", sequence: 3, pickup_time: "07:25", drop_time: "14:25" },
    { name: "Krishna Nagar", sequence: 4, pickup_time: "07:35", drop_time: "14:15" },
    { name: "Transport Nagar", sequence: 5, pickup_time: "07:45", drop_time: "14:05" },
  ];

  const stopsRes = await saveRouteStops(schoolA, routeId, stopsInput);
  assert(stopsRes.success && stopsRes.stops?.length === 5, "5 stops saved with continuous sequence");
  const createdStops = stopsRes.stops!;
  const [stop1, stop2, stop3, stop4, stop5] = createdStops;

  console.log("\n2. Configuring Distinct Monthly Fees for Every Stop on Route 1:");
  // Configure different rates for all 5 stops
  const feeConfigs: RouteStopFeeInput[] = [
    { id: stop1.id, monthly_fee_paise: 100000, pickup_only_monthly_paise: 60000, drop_only_monthly_paise: 60000 }, // ₹1,000 / ₹600
    { id: stop2.id, monthly_fee_paise: 120000, pickup_only_monthly_paise: 75000, drop_only_monthly_paise: 75000 }, // ₹1,200 / ₹750
    { id: stop3.id, monthly_fee_paise: 150000, pickup_only_monthly_paise: 90000, drop_only_monthly_paise: 90000 }, // ₹1,500 / ₹900
    { id: stop4.id, monthly_fee_paise: 180000, pickup_only_monthly_paise: 110000, drop_only_monthly_paise: 110000 }, // ₹1,800 / ₹1,100
    { id: stop5.id, monthly_fee_paise: 220000, pickup_only_monthly_paise: 135000, drop_only_monthly_paise: 135000 }, // ₹2,200 / ₹1,350
  ];

  const updateRes = await updateRouteStopFees(schoolA, routeId, feeConfigs);
  assert(updateRes.success, "updateRouteStopFees succeeds");

  const reloadedRoute = await getRouteById(schoolA, routeId);
  const reloadedStops = reloadedRoute?.stops || [];

  assert(reloadedStops.find((s) => s.id === stop1.id)?.monthly_fee_paise === 100000, "Stop 1 fee is ₹1,000 (100,000 paise)");
  assert(reloadedStops.find((s) => s.id === stop2.id)?.monthly_fee_paise === 120000, "Stop 2 fee is ₹1,200 (120,000 paise)");
  assert(reloadedStops.find((s) => s.id === stop3.id)?.monthly_fee_paise === 150000, "Stop 3 fee is ₹1,500 (150,000 paise)");
  assert(reloadedStops.find((s) => s.id === stop4.id)?.monthly_fee_paise === 180000, "Stop 4 fee is ₹1,800 (180,000 paise)");
  assert(reloadedStops.find((s) => s.id === stop5.id)?.monthly_fee_paise === 220000, "Stop 5 fee is ₹2,200 (220,000 paise)");

  console.log("\n3. Testing Service Type Calculations (Both-way, Pickup-only, Drop-only):");
  const stop3Both = await calculateStopMonthlyFee(schoolA, stop3.id, "both");
  const stop3Pickup = await calculateStopMonthlyFee(schoolA, stop3.id, "pickup_only");
  const stop3Drop = await calculateStopMonthlyFee(schoolA, stop3.id, "drop_only");

  assert(stop3Both === 150000, "Both-way service receives ₹1,500 monthly fee");
  assert(stop3Pickup === 90000, "Pickup-only service receives ₹900 monthly fee");
  assert(stop3Drop === 90000, "Drop-only service receives ₹900 monthly fee");

  console.log("\n4. Stop Database ID Validation & Non-existent Stop Protection:");
  let nonExistentFailed = false;
  try {
    await calculateStopMonthlyFee(schoolA, "non-existent-stop-uuid", "both");
  } catch (err: any) {
    nonExistentFailed = true;
    assert(err.message.includes("not found"), "Error thrown when stop ID does not exist");
  }
  assert(nonExistentFailed, "Non-existent stop ID throws an error instead of returning fallback money");

  // Attempt to assign with invalid stop
  const invalidAssign = await createAssignment(schoolA, {
    student_id: "student-invalid-stop",
    academic_year_id: academicYearId,
    route_id: routeId,
    pickup_stop_id: "non-existent-stop-uuid",
    service_type: "both",
    effective_from: "2026-04-01",
  });
  assert(!invalidAssign.success, "createAssignment rejected when stop ID is not on route");

  console.log("\n5. Missing Stop Pricing & Invalid Fee Validation:");
  // Create a 6th stop with 0 fee
  const stop6Input = [
    ...stopsInput,
    { name: "Unpriced Stop Near Bypass", sequence: 6, pickup_time: "07:55", drop_time: "13:55" },
  ];
  const stops6Res = await saveRouteStops(schoolA, routeId, stop6Input);
  const stop6 = stops6Res.stops!.find((s) => s.sequence === 6)!;

  let missingPriceFailed = false;
  try {
    await calculateStopMonthlyFee(schoolA, stop6.id, "both");
  } catch (err: any) {
    missingPriceFailed = true;
    assert(err.message.includes("not been configured"), "Clear error thrown when stop fee is missing or 0");
  }
  assert(missingPriceFailed, "Missing stop fee does NOT silently charge zero or fallback to route start");

  // Attempt assigning student to unpriced stop
  const unpricedAssign = await createAssignment(schoolA, {
    student_id: "student-unpriced-stop",
    academic_year_id: academicYearId,
    route_id: routeId,
    pickup_stop_id: stop6.id,
    service_type: "both",
    effective_from: "2026-04-01",
  });
  assert(!unpricedAssign.success, "createAssignment fails safely when assigned stop has unconfigured fee");
  assert(unpricedAssign.error?.includes("configured"), "Reports informative error to configure stop fee first");

  // Reject negative fees
  const negativeFeeRes = await updateRouteStopFees(schoolA, routeId, [
    { id: stop1.id, monthly_fee_paise: -500 },
  ]);
  assert(!negativeFeeRes.success, "Negative stop fee rejected by updateRouteStopFees validation");

  console.log("\n6. Assigning Students & Generating Correct Transport Dues:");
  // Student A at Stop 2 (Charbagh: ₹1,200)
  const assignA = await createAssignment(schoolA, {
    student_id: "student-aarav",
    academic_year_id: academicYearId,
    route_id: routeId,
    pickup_stop_id: stop2.id,
    service_type: "both",
    effective_from: "2026-04-01",
    actor_id: actorId,
  });
  assert(assignA.success && Boolean(assignA.assignment), "Student Aarav assigned to Stop 2");
  assert(assignA.assignment?.monthly_fee_paise === 120000, "Aarav assignment snapshot fee is 120,000 paise (₹1,200)");

  // Student B at Stop 5 (Transport Nagar: ₹2,200, Pickup Only: ₹1,350)
  const assignB = await createAssignment(schoolA, {
    student_id: "student-bhavya",
    academic_year_id: academicYearId,
    route_id: routeId,
    pickup_stop_id: stop5.id,
    service_type: "pickup_only",
    effective_from: "2026-04-01",
    actor_id: actorId,
  });
  assert(assignB.success && Boolean(assignB.assignment), "Student Bhavya assigned to Stop 5 (Pickup Only)");
  assert(assignB.assignment?.monthly_fee_paise === 135000, "Bhavya assignment snapshot fee is 135,000 paise (₹1,350)");

  // Verify dues created
  const duesCached = localStorage.getItem(`myzkool_student_dues_${schoolA}`);
  const dues: StudentDue[] = duesCached ? JSON.parse(duesCached) : [];
  const aaravDues = dues.filter((d) => d.student_id === "student-aarav" && d.source === "transport");
  const bhavyaDues = dues.filter((d) => d.student_id === "student-bhavya" && d.source === "transport");

  assert(aaravDues.length > 0, "Transport dues created for Aarav");
  assert(bhavyaDues.length > 0, "Transport dues created for Bhavya");

  // Total active months = 10. Across 2 terms = 5 months each term
  // Aarav term due = 1200 * 5 = ₹6,000 (600,000 paise)
  assert(aaravDues[0].gross_paise === 600000, "Aarav Term 1 due reflects ₹6,000 (5 months * ₹1,200 stop fee)");
  // Bhavya term due = 1350 * 5 = ₹6,750 (675,000 paise)
  assert(bhavyaDues[0].gross_paise === 675000, "Bhavya Term 1 due reflects ₹6,750 (5 months * ₹1,350 pickup fee)");

  console.log("\n7. Idempotency & Duplicate Prevention:");
  // Attempt assigning already active student
  const dupAssign = await createAssignment(schoolA, {
    student_id: "student-aarav",
    academic_year_id: academicYearId,
    route_id: routeId,
    pickup_stop_id: stop2.id,
    service_type: "both",
    effective_from: "2026-04-01",
  });
  assert(!dupAssign.success, "Duplicate active assignment for same student in same year blocked");
  assert(dupAssign.error === "STUDENT_ALREADY_ASSIGNED", "Returns STUDENT_ALREADY_ASSIGNED error code");

  // Call createTransportDues again for same assignment
  const feeService = createFeeService(schoolA);
  const initialDuesCount = dues.length;
  await feeService.createTransportDues(assignA.assignment!.id);
  const duesAfterRetry: StudentDue[] = JSON.parse(localStorage.getItem(`myzkool_student_dues_${schoolA}`) || "[]");
  assert(duesAfterRetry.length === initialDuesCount, "Repeated dues creation does not create duplicate dues (idempotent)");

  console.log("\n8. Stop Change & Recalculation Flow:");
  // Change Aarav from Stop 2 (₹1,200) to Stop 4 (Krishna Nagar: ₹1,800) starting 2026-07-01
  const changeRes = await changeAssignment(schoolA, assignA.assignment!.id, {
    new_route_id: routeId,
    new_pickup_stop_id: stop4.id,
    new_service_type: "both",
    effective_date: "2026-07-01",
  });

  assert(changeRes.success, "Assignment change executes successfully");
  assert(changeRes.assignment?.monthly_fee_paise === 180000, "New assignment snaps Stop 4 fee of ₹1,800 (180,000 paise)");
  assert(changeRes.assignment?.pickup_stop_id === stop4.id, "New assignment stores Stop 4 database ID");

  console.log("\n9. Historical & Paid Fee Preservation on Stop Fee Edits:");
  // Simulate payment of Aarav's Term 1 due
  const duesForPay: StudentDue[] = JSON.parse(localStorage.getItem(`myzkool_student_dues_${schoolA}`) || "[]");
  const targetDue = duesForPay.find((d) => d.student_id === "student-aarav" && d.status === "pending");
  if (targetDue) {
    targetDue.paid_paise = targetDue.gross_paise;
    targetDue.balance_paise = 0;
    targetDue.status = "paid";
    localStorage.setItem(`myzkool_student_dues_${schoolA}`, JSON.stringify(duesForPay));
  }

  // School updates Stop 2 rate from ₹1,200 to ₹1,400
  await updateRouteStopFees(schoolA, routeId, [
    { id: stop2.id, monthly_fee_paise: 140000, pickup_only_monthly_paise: 85000, drop_only_monthly_paise: 85000 },
  ]);

  // Verify historical paid due was NOT overwritten
  const freshDues: StudentDue[] = JSON.parse(localStorage.getItem(`myzkool_student_dues_${schoolA}`) || "[]");
  const paidDue = freshDues.find((d) => d.id === targetDue?.id);
  assert(paidDue?.status === "paid" && paidDue?.gross_paise === 600000, "Historical paid transport due amount and status are completely preserved");

  console.log("\n10. Cross-Tenant Isolation Enforcement:");
  // School B attempts to update School A's route stops
  const crossTenantRes = await updateRouteStopFees(schoolB, routeId, [
    { id: stop1.id, monthly_fee_paise: 999999 },
  ]);
  assert(!crossTenantRes.success, "Cross-school attempt to modify route stops is blocked");

  console.log("\n11. Student Admission Wizard Integration Flow:");
  // Admit student Kabir with transport opted-in to Stop 1 (₹1,000)
  const admissionRes = await admitStudentTransactional(schoolA, {
    step1_basic: {
      first_name: "Kabir",
      last_name: "Verma",
      dob: "2018-05-10",
      gender: "male",
    },
    step2_guardian: {
      father: {
        relation: "father",
        full_name: "Ramesh Verma",
        phone: "9876543210",
        is_primary_contact: true,
      },
      current_address: {
        kind: "current",
        line1: "123 Park Road",
        city: "Lucknow",
        district: "Lucknow",
        state: "Uttar Pradesh",
        pin: "226001",
      },
    },
    step3_academic: {
      admission_date: "2026-04-01",
      academic_year_id: academicYearId,
      class_id: "class-1-a",
      admission_type: "new",
      is_rte: false,
    },
    step4_documents: [],
    step7_transport: {
      opt_in: true,
      route_id: routeId,
      stop_id: stop1.id, // Stop 1 (Hazratganj)
      pickup: true,
      dropoff: true,
    },
  }, actorId, "admin");

  if (!admissionRes.student) {
    console.error("admissionRes error:", admissionRes.error);
  }
  assert(admissionRes.student !== undefined, "Student Kabir admitted via admission wizard");
  const kabirAssigns = JSON.parse(localStorage.getItem(`myzkool_transport_assignments_${schoolA}`) || "[]");
  const kabirAssignment = kabirAssigns.find((a: any) => a.student_id === admissionRes.student?.id);

  assert(kabirAssignment !== undefined, "Transport assignment automatically created on admission");
  assert(kabirAssignment?.pickup_stop_id === stop1.id, "Assignment stores exact stop database UUID");
  assert(kabirAssignment?.monthly_fee_paise === 100000, "Assignment snapshot receives Stop 1 monthly fee of ₹1,000");

  const kabirDues: StudentDue[] = JSON.parse(localStorage.getItem(`myzkool_student_dues_${schoolA}`) || "[]")
    .filter((d: any) => d.student_id === admissionRes.student?.id && d.source === "transport");
  assert(kabirDues.length > 0, "Transport dues generated for newly admitted student");
  assert(kabirDues[0].gross_paise === 500000, "Kabir Term 1 due is ₹5,000 (5 months * ₹1,000 stop rate)");

  console.log("\n----------------------------------------------------------");
  console.log(`TEST RESULTS: ${passed} Passed, ${failed} Failed.`);
  console.log("----------------------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Unhandled test suite error:", err);
  process.exit(1);
});
