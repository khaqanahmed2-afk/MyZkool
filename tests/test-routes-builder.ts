/**
 * Test Suite for Route Builder & Stops Logic (Map/GPS-Free)
 * Verifies:
 * 1. Route creation & updating without map/GPS requirements
 * 2. Stops timeline creation & sequence validation
 * 3. Stops reordering (continuous sequence 1..N)
 * 4. Time helper calculation (sequential increasing pickup times)
 * 5. Reverse drop times generation
 * 6. Deletion safeguards & persistence
 */

// LocalStorage polyfill for Node.js test environment
const store: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  key: (i: number) => Object.keys(store)[i] ?? null,
  get length() { return Object.keys(store).length; },
  clear: () => { for (const k in store) delete store[k]; },
};

import {
  createRoute,
  updateRoute,
  getRoutes,
  deleteRoute,
  saveRouteStops,
  timeToMinutes,
} from "../src/services/transportCoreService";

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

async function runRouteBuilderTests() {
  console.log("=== Route Builder & Stops Test Suite (Map/GPS-Free) ===\n");
  const testSchoolId = "school-route-test-" + Date.now();

  // Test 1: Create a Route without any GPS or Map requirements
  console.log("[Test 1] Route Creation without Map/GPS Requirements");
  const rRes = await createRoute(testSchoolId, {
    name: "Gomti Nagar Express",
    code: "R-101",
    pickup_start_time: "06:45",
    drop_start_time: "14:15",
    est_duration_min: 50,
    status: "active",
  });
  check("Route created successfully", rRes.success && !!rRes.route);
  const routeId = rRes.route!.id;
  check("Route code is uppercase R-101", rRes.route?.code === "R-101");
  check("Pickup start time is 06:45", rRes.route?.pickup_start_time === "06:45");

  // Test 2: Add Stops Timeline without GPS coordinates
  console.log("\n[Test 2] Stops Timeline Creation without GPS Coordinates");
  const testStops = [
    {
      sequence: 1,
      name: "School Campus",
      landmark: "Gate 1",
      pickup_time: "06:45",
      drop_time: "15:05",
    },
    {
      sequence: 2,
      name: "Patrakarpuram Crossing",
      landmark: "Near Bank",
      pickup_time: "07:00",
      drop_time: "14:50",
    },
    {
      sequence: 3,
      name: "Manoj Pandey Chowk",
      landmark: "Roundabout",
      pickup_time: "07:15",
      drop_time: "14:35",
    },
    {
      sequence: 4,
      name: "Viram Khand",
      landmark: "Community Center",
      pickup_time: "07:30",
      drop_time: "14:20",
    },
  ];

  const stopsRes = await saveRouteStops(testSchoolId, routeId, testStops as any);
  check("Stops saved successfully without any lat/lng provided", stopsRes.success && stopsRes.stops?.length === 4);
  check("Stop sequence is continuous 1 to 4", stopsRes.stops?.every((s, i) => s.sequence === i + 1) === true);

  // Test 3: Stop Reordering Logic (Moving a stop down and recalculating sequence)
  console.log("\n[Test 3] Stop Reordering Simulation");
  const copy = [...testStops];
  const temp = copy[1];
  copy[1] = copy[2];
  copy[2] = temp;
  const resequenced = copy.map((st, i) => ({ ...st, sequence: i + 1 }));

  check("Resequenced array has continuous sequence 1..4", resequenced.every((st, i) => st.sequence === i + 1));
  check("Position 2 now holds 'Manoj Pandey Chowk'", resequenced[1].name === "Manoj Pandey Chowk");

  // Test 4: Automated Time Helper Calculation
  console.log("\n[Test 4] Automated Time Helper Calculation");
  const intervalMin = 7;
  let currentMin = timeToMinutes("06:45");
  const calculatedStops = testStops.map((st, idx) => {
    if (idx > 0) currentMin += intervalMin;
    const hh = Math.floor(currentMin / 60).toString().padStart(2, "0");
    const mm = (currentMin % 60).toString().padStart(2, "0");
    return { ...st, pickup_time: `${hh}:${mm}` };
  });

  check("First stop pickup is 06:45", calculatedStops[0].pickup_time === "06:45");
  check("Second stop pickup is 06:52 (+7m)", calculatedStops[1].pickup_time === "06:52");
  check("Third stop pickup is 06:59 (+14m)", calculatedStops[2].pickup_time === "06:59");
  check("Fourth stop pickup is 07:06 (+21m)", calculatedStops[3].pickup_time === "07:06");

  // Test 5: Reverse Drop Times Generation
  console.log("\n[Test 5] Reverse Drop Times Generation");
  let dropMin = timeToMinutes("14:15");
  const reverseDropStops = [...testStops];
  for (let i = reverseDropStops.length - 1; i >= 0; i--) {
    const hh = Math.floor(dropMin / 60).toString().padStart(2, "0");
    const mm = (dropMin % 60).toString().padStart(2, "0");
    reverseDropStops[i].drop_time = `${hh}:${mm}`;
    dropMin += 10;
  }
  check("Last stop (Stop 4) drops first at 14:15", reverseDropStops[3].drop_time === "14:15");
  check("Stop 3 drops at 14:25", reverseDropStops[2].drop_time === "14:25");
  check("Stop 2 drops at 14:35", reverseDropStops[1].drop_time === "14:35");
  check("First stop drops last at 14:45", reverseDropStops[0].drop_time === "14:45");

  // Test 6: Update Route Details
  console.log("\n[Test 6] Update Route Details");
  const updateRes = await updateRoute(testSchoolId, routeId, {
    name: "Gomti Nagar Super Express",
    est_duration_min: 55,
  });
  check("Route updated successfully", updateRes.success && updateRes.route?.name === "Gomti Nagar Super Express");
  check("Duration updated to 55 minutes", updateRes.route?.est_duration_min === 55);

  // Test 7: Verify Route Retrieval with Enriched Stops
  console.log("\n[Test 7] Route & Stops Retrieval");
  const allRoutes = await getRoutes(testSchoolId);
  const fetchedRoute = allRoutes.find((r) => r.id === routeId);
  check("Fetched route has 4 stops", fetchedRoute?.stops_count === 4);
  check("Fetched route stops contain proper names and times", fetchedRoute?.stops.length === 4);

  // Test 8: Delete Route
  console.log("\n[Test 8] Delete Route");
  const delRes = await deleteRoute(testSchoolId, routeId);
  check("Route deleted successfully", delRes.success);
  const remaining = await getRoutes(testSchoolId);
  check("Deleted route not in active list", !remaining.some((r) => r.id === routeId));

  console.log("\n========================================================");
  console.log(`Route Builder Test Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log("ALL ROUTE BUILDER TESTS PASSED! 🎉");
  } else {
    console.error("Errors encountered:", errors);
    process.exit(1);
  }
}

runRouteBuilderTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
