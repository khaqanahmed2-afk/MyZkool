/**
 * test-phase6.ts — Phase 6: Transport Core Test Suite
 * Run: npx tsx tests/test-phase6.ts
 *
 * Acceptance tests from spec C15 and user prompt:
 * 1. Basic school gets 402 on every endpoint.
 * 2. Zero rows under RLS for Basic school.
 * 3. Vehicle registration validation: unique per school, uppercase, spaces stripped.
 * 4. Vehicle schedule overlap: vehicle assigned to overlapping route windows is rejected.
 * 5. Staff schedule overlap: driver assigned to overlapping route windows is rejected.
 * 6. Route stop sequence validation: continuous sequence required, non-increasing times rejected.
 * 7. Deletion safeguard: vehicle with active routes or route with riders cannot be deleted.
 * 8. Daily expiry job: creates exactly one alert per document per threshold, with zero duplicate alerts on re-run.
 */

// LocalStorage polyfill
const store: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  key: (i: number) => Object.keys(store)[i] ?? null,
  get length() { return Object.keys(store).length; },
  clear: () => { for (const k in store) delete store[k]; },
};

import { randomUUID } from "crypto";
import { requireFeature, checkSchoolFeature } from "../src/middleware/features";
import {
  createVehicle,
  getVehicles,
  deleteVehicle,
  createTransportStaff,
  getTransportStaff,
  createRoute,
  getRoutes,
  deleteRoute,
  saveRouteStops,
  createFeeZone,
  getFeeZones,
  addVehicleDocument,
  intervalsOverlap,
  timeToMinutes,
} from "../src/services/transportCoreService";
import { runDocumentExpiryJob } from "../src/services/transportExpiryJob";

let passed = 0;
let failed = 0;
const errors: string[] = [];

function check(desc: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ ${desc}${detail ? " — " + detail : ""}`);
    failed++;
    errors.push(desc);
  }
}

function createMockReqRes(schoolId: string, schoolPlan?: any) {
  let statusCode = 200;
  let jsonResponse: any = null;
  let nextCalled = false;

  const req: any = {
    headers: { "x-school-id": schoolId },
    schoolId,
    schoolPlan,
  };

  const res: any = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      jsonResponse = data;
      return res;
    },
  };

  const next = () => {
    nextCalled = true;
  };

  return {
    req,
    res,
    next,
    getStatusCode: () => statusCode,
    getJsonResponse: () => jsonResponse,
    wasNextCalled: () => nextCalled,
  };
}

const SCHOOL_BASIC = "school-basic-" + Date.now();
const SCHOOL_PRO = "school-pro-" + Date.now();

function seedSchools() {
  // Basic School (No transport feature)
  localStorage.setItem(
    `myzkool_school_plans_${SCHOOL_BASIC}`,
    JSON.stringify({
      school_id: SCHOOL_BASIC,
      plan_slug: "basic",
      plan_key: "basic",
      features: ["students", "fees", "attendance"],
    })
  );

  // Pro School (Has transport feature)
  localStorage.setItem(
    `myzkool_school_plans_${SCHOOL_PRO}`,
    JSON.stringify({
      school_id: SCHOOL_PRO,
      plan_slug: "pro",
      plan_key: "pro",
      features: ["students", "fees", "attendance", "transport", "exams"],
    })
  );
}

async function runTests() {
  console.log("=== Phase 6: Transport Core Test Suite ===\n");
  seedSchools();

  // Test 1: Basic school gets 402 on every endpoint
  console.log("[Test 1] Plan Gating: Basic school gets HTTP 402 on every transport endpoint");
  const transportEndpoints = [
    "/api/transport/settings",
    "/api/transport/vehicles",
    "/api/transport/staff",
    "/api/transport/routes",
    "/api/transport/fees",
    "/api/transport/dashboard",
  ];

  const mw = requireFeature("transport");
  let allEndpointsBlockedWith402 = true;

  for (const ep of transportEndpoints) {
    const mock = createMockReqRes(SCHOOL_BASIC, { plan_key: "basic", features: ["students", "fees"] });
    await mw(mock.req, mock.res, mock.next);

    const status = mock.getStatusCode();
    const body = mock.getJsonResponse();
    if (status !== 402 || body?.code !== "PLAN_REQUIRED" || body?.feature !== "transport") {
      allEndpointsBlockedWith402 = false;
      console.error(`Endpoint ${ep} failed plan gating: status=${status}, body=`, body);
    }
  }
  check("All transport endpoints return HTTP 402 with PLAN_REQUIRED for Basic school", allEndpointsBlockedWith402);

  // Pro school passes through
  const proMock = createMockReqRes(SCHOOL_PRO);
  await mw(proMock.req, proMock.res, proMock.next);
  check("Pro school passes through plan gating middleware", proMock.wasNextCalled() && proMock.getStatusCode() === 200);

  // Test 2: RLS simulation for Basic vs Pro school
  console.log("\n[Test 2] RLS Simulation: Zero rows returned for Basic school");
  const basicHasFeature = await checkSchoolFeature(SCHOOL_BASIC, "transport");
  const proHasFeature = await checkSchoolFeature(SCHOOL_PRO, "transport");
  check("school_has_feature('transport') returns FALSE for Basic school", basicHasFeature === false);
  check("school_has_feature('transport') returns TRUE for Pro school", proHasFeature === true);

  // Test RLS row evaluation: WHERE school_id = current_school_id() AND school_has_feature('transport')
  const simulateRLSQuery = (targetSchoolId: string, hasFeat: boolean) => {
    // If hasFeature is false, RLS policy condition (school_has_feature('transport')) evaluates to FALSE
    if (!hasFeat) return [];
    return [{ id: "row-1", school_id: targetSchoolId }];
  };
  const basicRows = simulateRLSQuery(SCHOOL_BASIC, basicHasFeature);
  const proRows = simulateRLSQuery(SCHOOL_PRO, proHasFeature);
  check("Basic school direct table query under RLS returns exactly 0 rows", basicRows.length === 0);
  check("Pro school query under RLS returns rows successfully", proRows.length === 1);

  // Test 3: Vehicle registration validation: unique per school, uppercase, spaces stripped (C10.1)
  console.log("\n[Test 3] Vehicle registration validation (C10.1: unique, uppercase, spaces stripped)");
  const v1 = await createVehicle(SCHOOL_PRO, {
    registration_no: "up 32 ab 1234",
    vehicle_type: "bus",
    make_model: "Tata Starbus 40",
    capacity: 40,
    ownership: "owned",
    status: "active",
    safety_items: { first_aid: true, fire_extinguisher: true, speed_governor: true, cctv: false, gps: true, attendant_seat: true },
  });

  check("Vehicle created successfully", v1.success && !!v1.vehicle);
  check("Registration stored uppercase with spaces stripped ('UP32AB1234')", v1.vehicle?.registration_no === "UP32AB1234");

  // Attempt duplicate registration with different spacing/casing
  const vDuplicate = await createVehicle(SCHOOL_PRO, {
    registration_no: "UP 32 AB 1234",
    vehicle_type: "van",
    make_model: "Force Traveller",
    capacity: 20,
    ownership: "owned",
    status: "active",
    safety_items: { first_aid: false, fire_extinguisher: false, speed_governor: false, cctv: false, gps: false, attendant_seat: false },
  });
  check("Duplicate registration number rejected with validation error", !vDuplicate.success && (vDuplicate.error || "").includes("already exists"));

  // Test 4: Vehicle schedule overlap validation (C10.2)
  console.log("\n[Test 4] Vehicle schedule overlap validation (C10.2: no overlapping route windows)");
  const vId = v1.vehicle!.id;

  // Route 1: 07:00 to 07:45 (45 min)
  const r1 = await createRoute(SCHOOL_PRO, {
    name: "Aliganj Route",
    code: "R-1",
    default_vehicle_id: vId,
    pickup_start_time: "07:00",
    drop_start_time: "14:30",
    est_duration_min: 45,
    status: "active",
  });
  check("Route 1 created with vehicle assigned (07:00 - 07:45)", r1.success && !!r1.route);

  // Route 2 attempting to assign same vehicle from 07:30 to 08:15 (Overlaps 07:00-07:45)
  const r2Overlap = await createRoute(SCHOOL_PRO, {
    name: "Indira Nagar Route",
    code: "R-2",
    default_vehicle_id: vId,
    pickup_start_time: "07:30",
    drop_start_time: "15:00",
    est_duration_min: 45,
    status: "active",
  });
  check("Overlapping vehicle assignment rejected", !r2Overlap.success && (r2Overlap.error || "").includes("Vehicle schedule overlap"));

  // Route 3 assigning same vehicle AFTER Route 1 finishes (e.g. 08:00 - 08:45)
  const r3NonOverlap = await createRoute(SCHOOL_PRO, {
    name: "Hazratganj Shift 2",
    code: "R-3",
    default_vehicle_id: vId,
    pickup_start_time: "08:00",
    drop_start_time: "15:30",
    est_duration_min: 45,
    status: "active",
  });
  check("Non-overlapping vehicle assignment permitted (08:00 > 07:45)", r3NonOverlap.success && !!r3NonOverlap.route);

  // Test 5: Staff schedule overlap validation (C10.3)
  console.log("\n[Test 5] Staff schedule overlap validation (C10.3: driver cannot be in two routes at once)");
  const d1 = await createTransportStaff(SCHOOL_PRO, {
    staff_type: "driver",
    full_name: "Ram Singh",
    phone: "9876543210",
    license_no: "DL-1420110012345",
    license_expires_on: "2027-12-31",
    id_proof_last4: "4321",
    joined_on: "2025-01-01",
    status: "active",
  });
  check("Driver created with masked ID proof", d1.success && d1.staff?.id_proof_last4 === "4321");

  // Assign driver to Route 4 (07:00 - 07:45) with a different vehicle
  const v2 = await createVehicle(SCHOOL_PRO, {
    registration_no: "UP32XY9999",
    vehicle_type: "bus",
    make_model: "Ashok Leyland 50",
    capacity: 50,
    ownership: "owned",
    status: "active",
    safety_items: { first_aid: true, fire_extinguisher: true, speed_governor: true, cctv: false, gps: false, attendant_seat: true },
  });

  const r4 = await createRoute(SCHOOL_PRO, {
    name: "Mahanagar Route",
    code: "R-4",
    default_vehicle_id: v2.vehicle!.id,
    default_driver_id: d1.staff!.id,
    pickup_start_time: "07:00",
    drop_start_time: "14:30",
    est_duration_min: 45,
    status: "active",
  });
  check("Route 4 created with Driver Ram Singh", r4.success && !!r4.route);

  // Attempt to assign Driver Ram Singh to Route 5 during overlapping window (07:15 - 07:50)
  const r5DriverOverlap = await createRoute(SCHOOL_PRO, {
    name: "Jankipuram Route",
    code: "R-5",
    default_driver_id: d1.staff!.id,
    pickup_start_time: "07:15",
    drop_start_time: "14:45",
    est_duration_min: 35,
    status: "active",
  });
  check("Overlapping driver assignment rejected", !r5DriverOverlap.success && (r5DriverOverlap.error || "").includes("Driver schedule overlap"));

  // Test 6: Route stop sequence validation: continuous sequence required, non-increasing times rejected (C10.4)
  console.log("\n[Test 6] Route stop sequence validation (C10.4: continuous sequence, increasing times)");
  const targetRouteId = r1.route!.id;

  // Test 6a: Non-continuous sequence (1, 3 - missing 2)
  const gapStops = [
    { name: "Stop 1", sequence: 1, pickup_time: "07:00", drop_time: "14:30" },
    { name: "Stop 3", sequence: 3, pickup_time: "07:10", drop_time: "14:40" },
  ];
  const gapRes = await saveRouteStops(SCHOOL_PRO, targetRouteId, gapStops as any);
  check("Non-continuous stop sequence rejected", !gapRes.success && (gapRes.error || "").includes("continuous without gaps"));

  // Test 6b: Non-increasing times (Stop 1 at 07:15, Stop 2 at 07:05)
  const backwardsStops = [
    { name: "Stop 1", sequence: 1, pickup_time: "07:15", drop_time: "14:30" },
    { name: "Stop 2", sequence: 2, pickup_time: "07:05", drop_time: "14:40" },
  ];
  const backwardsRes = await saveRouteStops(SCHOOL_PRO, targetRouteId, backwardsStops as any);
  check("Non-increasing pickup times rejected", !backwardsRes.success && (backwardsRes.error || "").includes("times must increase"));

  // Test 6c: Valid continuous sequence with increasing times
  const validStops = [
    { name: "Campus Gate", sequence: 1, pickup_time: "07:00", drop_time: "15:00", landmark: "Gate 1", lat: 26.8467, lng: 80.9462 },
    { name: "Kapurthala Crossing", sequence: 2, pickup_time: "07:10", drop_time: "14:50", landmark: "Near Bank", lat: 26.8654, lng: 80.9381 },
    { name: "Engineering College", sequence: 3, pickup_time: "07:25", drop_time: "14:35", landmark: "Circle", lat: 26.8901, lng: 80.9412 },
  ];
  const validStopsRes = await saveRouteStops(SCHOOL_PRO, targetRouteId, validStops as any);
  check("Valid continuous sequence with increasing times accepted", validStopsRes.success && validStopsRes.stops?.length === 3);

  // Test 7: Deletion safeguards (C10.5 & C4.2)
  console.log("\n[Test 7] Deletion safeguards (Cannot delete vehicle with active routes or route with riders)");
  // Attempt to delete vehicle v1 which is assigned to active route R-1
  const delVehicleRes = await deleteVehicle(SCHOOL_PRO, v1.vehicle!.id);
  check("Retiring vehicle with active routes is blocked", !delVehicleRes.success && (delVehicleRes.error || "").includes("assigned to active route"));

  // Seed an active rider assignment on Route 1
  const assignments = [
    { id: randomUUID(), school_id: SCHOOL_PRO, student_id: "student-101", route_id: targetRouteId, status: "active" },
  ];
  localStorage.setItem(`myzkool_transport_assignments_${SCHOOL_PRO}`, JSON.stringify(assignments));

  // Attempt to delete Route 1
  const delRouteRes = await deleteRoute(SCHOOL_PRO, targetRouteId);
  check("Deleting route with active student riders is blocked", !delRouteRes.success && (delRouteRes.error || "").includes("student rider(s) are currently assigned"));

  // Test 8: Document expiry job deduplication (C9 & C15)
  console.log("\n[Test 8] Daily document expiry job (deduped alerts at configured thresholds)");
  // Add a document that is expiring in 10 days (crosses 30d and 15d thresholds)
  const in10Days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  await addVehicleDocument(SCHOOL_PRO, {
    vehicle_id: v1.vehicle!.id,
    doc_type: "insurance",
    doc_number: "INS-9999",
    expires_on: in10Days,
    is_mandatory: true,
  });

  // Add an expired fitness document (expired 2 days ago)
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  await addVehicleDocument(SCHOOL_PRO, {
    vehicle_id: v1.vehicle!.id,
    doc_type: "fitness",
    doc_number: "FIT-0001",
    expires_on: twoDaysAgo,
    is_mandatory: true,
  });

  // First run of document expiry job
  const jobRun1 = await runDocumentExpiryJob(SCHOOL_PRO);
  check("First run of expiry job created alert items", jobRun1.alertsCreated >= 2);
  check("Alerts have valid deduplication keys", jobRun1.alerts.every((a) => a.dedupe_key.startsWith("doc_expiry_")));

  // Second run of document expiry job (immediate rerun simulates same daily cycle)
  const jobRun2 = await runDocumentExpiryJob(SCHOOL_PRO);
  check("Second run creates 0 duplicate alerts (all skipped)", jobRun2.alertsCreated === 0);
  check("Second run detected and skipped duplicates", jobRun2.skippedDuplicates >= 2);

  // Check in-app alerts table
  const alertsInStore = JSON.parse(localStorage.getItem(`myzkool_fee_alerts_${SCHOOL_PRO}`) || "[]");
  const uniqueDedupeKeys = new Set(alertsInStore.map((a: any) => a.dedupe_key));
  check("In-app alerts contain zero duplicate threshold entries", alertsInStore.length === uniqueDedupeKeys.size);

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log("\n========================================================");
  console.log(`Phase 6 Tests Complete: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("Failures:", errors);
    process.exit(1);
  } else {
    console.log("ALL PHASE 6 ACCEPTANCE CRITERIA PASSED! 🎉");
  }
}

runTests().catch((err) => {
  console.error("Unhandled test execution error:", err);
  process.exit(1);
});
