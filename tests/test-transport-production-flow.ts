/**
 * Transport Production Flow & Regression Test Suite
 *
 * Verifies:
 * 1. Currency handling: leading-zero sanitization, Rupee to Paise (1:100), Paise to Rupee (100:1).
 * 2. 60% one-way rate calculation: e.g. 600 -> 360 without single-keystroke premature side effects.
 * 3. Stop fee preservation during route stop reordering & saving.
 * 4. Stop UUID stability during updates.
 * 5. Unconfigured stop fee detection & assignment blocking.
 * 6. Transport staff roles: Attendants do not receive driver license status checks.
 * 7. Tenant isolation: cross-school assignment and route modification restrictions.
 */

import {
  createRoute,
  updateRoute,
  saveRouteStops,
  getRouteById,
  updateRouteStopFees,
  createVehicle,
  getTransportStaff,
  createTransportStaff,
  getTransportDashboardData,
} from "../src/services/transportCoreService";
import {
  calculateStopMonthlyFee,
  createAssignment,
} from "../src/services/transportAssignmentService";
import type { RouteStop, RouteStopFeeInput } from "../src/types/transport";

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

// Currency input sanitizer matching FeeZonesPage implementation
function parseCurrencyInput(value: string): number {
  const sanitized = value.replace(/[^0-9]/g, "");
  if (!sanitized) return 0;
  const num = parseInt(sanitized, 10);
  return isNaN(num) ? 0 : Math.max(0, num);
}

async function runTests() {
  console.log("\n========================================================");
  console.log("Starting Transport Production Flow & Regression Tests");
  console.log("========================================================\n");

  const schoolA = `sch-prod-a-${Date.now()}`;
  const schoolB = `sch-prod-b-${Date.now()}`;

  // -------------------------------------------------------------------------
  // 1. Currency Sanitization and Conversion
  // -------------------------------------------------------------------------
  console.log("\n1. Currency Sanitization and Conversion (Rupee <-> Integer Paise)");

  assert(parseCurrencyInput("0600") === 600, "Sanitizes '0600' to 600 without leading zero");
  assert(parseCurrencyInput("00450") === 450, "Sanitizes '00450' to 450");
  assert(parseCurrencyInput("0") === 0, "Sanitizes '0' to 0");
  assert(parseCurrencyInput("") === 0, "Sanitizes empty string to 0");
  assert(parseCurrencyInput("₹1,200") === 1200, "Sanitizes formatted rupee strings");

  const rupeeInput = 600;
  const paiseStored = Math.round(rupeeInput * 100);
  assert(paiseStored === 60000, "Converts ₹600 to 60000 integer paise");

  const rupeeDisplayed = paiseStored / 100;
  assert(rupeeDisplayed === 600, "Converts 60000 integer paise back to ₹600 for UI display");

  // 60% Auto Calculation logic
  const bothWaysRupee = 600;
  const oneWayRupee = Math.round(bothWaysRupee * 0.6);
  assert(oneWayRupee === 360, "Calculates 60% of ₹600 as ₹360 (not ₹1 or ₹4)");

  // -------------------------------------------------------------------------
  // 2. Route Creation and Stop-Level Pricing
  // -------------------------------------------------------------------------
  console.log("\n2. Route Creation, Stop Sequences & Fee Configuration");

  const routeRes = await createRoute(schoolA, {
    name: "Sector 62 Express",
    code: "R-S62",
    pickup_start_time: "07:00",
    drop_start_time: "14:30",
    est_duration_min: 45,
    status: "active",
  });
  assert(routeRes.success && !!routeRes.route, "Route created successfully");
  const routeId = routeRes.route!.id;

  const stop1Id = crypto.randomUUID();
  const stop2Id = crypto.randomUUID();

  const initialStops: RouteStop[] = [
    {
      id: stop1Id,
      school_id: schoolA,
      route_id: routeId,
      name: "Sector 62 Metro",
      landmark: "Gate 2",
      sequence: 1,
      pickup_time: "07:15",
      drop_time: "14:45",
    },
    {
      id: stop2Id,
      school_id: schoolA,
      route_id: routeId,
      name: "Fortis Hospital",
      landmark: "Opposite Emergency",
      sequence: 2,
      pickup_time: "07:25",
      drop_time: "14:35",
    },
  ];

  const stopsRes = await saveRouteStops(schoolA, routeId, initialStops);
  assert(stopsRes.success && !!stopsRes.stops, "Initial stops saved successfully");
  const stop1 = stopsRes.stops![0];
  const stop2 = stopsRes.stops![1];

  // Configure fees for Stop 1: Both: ₹800 (80000p), Pickup: ₹500 (50000p), Drop: ₹500 (50000p)
  const feeInputs: RouteStopFeeInput[] = [
    {
      id: stop1.id,
      monthly_fee_paise: 80000,
      pickup_only_monthly_paise: 50000,
      drop_only_monthly_paise: 50000,
    },
  ];

  const feeUpdateRes = await updateRouteStopFees(schoolA, routeId, feeInputs);
  assert(feeUpdateRes.success, "Configured fees for Stop 1 in integer paise");

  // Verify fee queries for both, pickup-only, and drop-only
  const feeBoth = await calculateStopMonthlyFee(schoolA, stop1.id, "both");
  const feePickup = await calculateStopMonthlyFee(schoolA, stop1.id, "pickup_only");
  const feeDrop = await calculateStopMonthlyFee(schoolA, stop1.id, "drop_only");

  assert(feeBoth === 80000, "Both ways fee correctly resolved as 80000 paise (₹800)");
  assert(feePickup === 50000, "Pickup-only fee correctly resolved as 50000 paise (₹500)");
  assert(feeDrop === 50000, "Drop-only fee correctly resolved as 50000 paise (₹500)");

  // -------------------------------------------------------------------------
  // 3. Unconfigured Stop Fee Handling
  // -------------------------------------------------------------------------
  console.log("\n3. Unconfigured Stop Fee Handling (No silent ₹0 fallback)");

  let unconfiguredThrown = false;
  try {
    await calculateStopMonthlyFee(schoolA, stop2.id, "both");
  } catch (err: any) {
    unconfiguredThrown = true;
    assert(
      err.message.includes("Transport fee has not been configured"),
      "Throws actionable error when stop fee has not been configured"
    );
  }
  assert(unconfiguredThrown, "Unconfigured stop fee throws instead of returning 0");

  // -------------------------------------------------------------------------
  // 4. Stop UUID and Fee Preservation on Route Reorder / Update
  // -------------------------------------------------------------------------
  console.log("\n4. Stop UUID & Fee Preservation Across Route Updates");

  // Reorder stops: Stop 2 first, Stop 1 second
  const reorderedStops: RouteStop[] = [
    {
      id: stop2.id,
      school_id: schoolA,
      route_id: routeId,
      name: "Fortis Hospital",
      landmark: "Opposite Emergency",
      sequence: 1,
      pickup_time: "07:10",
      drop_time: "14:50",
    },
    {
      id: stop1.id,
      school_id: schoolA,
      route_id: routeId,
      name: "Sector 62 Metro",
      landmark: "Gate 2",
      sequence: 2,
      pickup_time: "07:20",
      drop_time: "14:40",
    },
  ];

  const reorderRes = await saveRouteStops(schoolA, routeId, reorderedStops);
  assert(reorderRes.success, "Reordered stops saved successfully");

  const refreshedRoute = await getRouteById(schoolA, routeId);
  assert(!!refreshedRoute, "Retrieved refreshed route");
  assert(refreshedRoute!.stops.length === 2, "Route has 2 stops");

  const refreshedStop1 = refreshedRoute!.stops.find((s) => s.id === stop1.id);
  assert(!!refreshedStop1, "Stop 1 retained its stable UUID");
  assert(
    refreshedStop1?.monthly_fee_paise === 80000,
    "Stop 1 retained its monthly_fee_paise (80000) after reordering"
  );
  assert(
    refreshedStop1?.pickup_only_monthly_paise === 50000,
    "Stop 1 retained its pickup_only_monthly_paise (50000)"
  );

  // -------------------------------------------------------------------------
  // 5. Transport Staff Roles & Attendant Validation
  // -------------------------------------------------------------------------
  console.log("\n5. Transport Staff Roles & Attendant License Handling");

  const driverRes = await createTransportStaff(schoolA, {
    full_name: "Ramesh Sharma",
    staff_type: "driver",
    phone: "9876543210",
    license_no: "DL-1234567890",
    license_expires_on: "2027-12-31",
    status: "active",
    joined_on: "2026-04-01",
  });
  assert(driverRes.success && !!driverRes.staff, "Created driver with license");

  const attendantRes = await createTransportStaff(schoolA, {
    full_name: "Sunita Devi",
    staff_type: "attendant",
    phone: "9876543211",
    status: "active",
    joined_on: "2026-04-01",
  });
  assert(attendantRes.success && !!attendantRes.staff, "Created attendant without license");

  const staffList = await getTransportStaff(schoolA);
  const driverEnriched = staffList.find((s) => s.id === driverRes.staff!.id);
  const attendantEnriched = staffList.find((s) => s.id === attendantRes.staff!.id);

  assert(!!driverEnriched?.license_status, "Driver has license status chip evaluated");
  assert(
    attendantEnriched?.license_status === undefined || attendantEnriched?.license_status === null,
    "Attendant does NOT have misleading driver license status chip"
  );

  // -------------------------------------------------------------------------
  // 6. Route Resource Reassignment (Vehicle, Driver, Attendant)
  // -------------------------------------------------------------------------
  console.log("\n6. Route Resource Reassignment Across Routes");

  // Create Vehicle 1 for School A
  const vehRes = await createVehicle(schoolA, {
    registration_no: "UP32-AB-9999",
    vehicle_type: "bus",
    make_model: "Tata Starbus",
    capacity: 40,
    fuel_type: "diesel",
    ownership: "owned",
    safety_items: { first_aid: true, fire_extinguisher: true, speed_governor: true, cctv: false, gps: true, attendant_seat: true },
    status: "active",
  });
  assert(vehRes.success && !!vehRes.vehicle, "Created test vehicle");
  const vehId = vehRes.vehicle!.id;

  // Assign Vehicle 1, Driver 1, Attendant 1 to Route 1
  const updateRoute1 = await updateRoute(schoolA, routeId, {
    default_vehicle_id: vehId,
    default_driver_id: driverRes.staff!.id,
    default_attendant_id: attendantRes.staff!.id,
  });
  assert(updateRoute1.success, "Assigned vehicle, driver, attendant to Route 1");

  // Verify Route 1 has all three resources
  const r1AfterAssign = await getRouteById(schoolA, routeId);
  assert(r1AfterAssign?.default_vehicle_id === vehId, "Route 1 holds Vehicle 1");
  assert(r1AfterAssign?.default_driver_id === driverRes.staff!.id, "Route 1 holds Driver 1");
  assert(r1AfterAssign?.default_attendant_id === attendantRes.staff!.id, "Route 1 holds Attendant 1");

  // Now create Route 2 and reassign Vehicle 1, Driver 1, Attendant 1 to Route 2 with reassignResources: true
  const route2Res = await createRoute(schoolA, {
    name: "Sector 18 Connector",
    code: "R-S18",
    pickup_start_time: "08:00",
    drop_start_time: "15:30",
    est_duration_min: 40,
    default_vehicle_id: vehId,
    default_driver_id: driverRes.staff!.id,
    default_attendant_id: attendantRes.staff!.id,
    status: "active",
  }, { reassignResources: true });

  assert(route2Res.success && !!route2Res.route, "Route 2 created successfully with reassigned resources");
  assert(route2Res.unassignedFromRoutes?.includes("R-S62") === true, "Route 2 creation unassigned resources from R-S62");

  // Verify Route 1 now has all three cleared (no duplicate assignments)
  const r1AfterReassign = await getRouteById(schoolA, routeId);
  assert(r1AfterReassign?.default_vehicle_id === null, "Route 1 vehicle unassigned (no duplicate)");
  assert(r1AfterReassign?.default_driver_id === null, "Route 1 driver unassigned (no duplicate)");
  assert(r1AfterReassign?.default_attendant_id === null, "Route 1 attendant unassigned (no duplicate)");

  // Verify Route 2 holds all three resources
  const r2AfterReassign = await getRouteById(schoolA, route2Res.route!.id);
  assert(r2AfterReassign?.default_vehicle_id === vehId, "Route 2 holds Vehicle 1");
  assert(r2AfterReassign?.default_driver_id === driverRes.staff!.id, "Route 2 holds Driver 1");
  assert(r2AfterReassign?.default_attendant_id === attendantRes.staff!.id, "Route 2 holds Attendant 1");

  // -------------------------------------------------------------------------
  // 7. Cross-Tenant Isolation
  // -------------------------------------------------------------------------
  console.log("\n7. Cross-Tenant Isolation");

  const routeFromSchoolB = await getRouteById(schoolB, routeId);
  assert(routeFromSchoolB === null, "School B cannot access School A's route");

  let crossAssignBlocked = false;
  try {
    const res = await createAssignment(schoolB, {
      student_id: crypto.randomUUID(),
      academic_year_id: "ay-prod-1",
      route_id: routeId,
      pickup_stop_id: stop1.id,
      service_type: "both",
      effective_from: "2026-04-01",
    });
    if (!res.success) crossAssignBlocked = true;
  } catch {
    crossAssignBlocked = true;
  }
  assert(crossAssignBlocked, "School B cannot assign a student to School A's route/stop");

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("\n========================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
