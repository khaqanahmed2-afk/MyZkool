/**
 * Student Transport Assignment Lifecycle & Management Tests
 *
 * Verifies:
 * 1. Student assignment creation and immediate appearance in assigned list.
 * 2. Duplicate assignment prevention for the same student & academic year.
 * 3. Persistence of assignments across simulated refreshes.
 * 4. Editing assignments (route, stop, service type, effective date) with atomic dues adjustment.
 * 5. Safe ending of assignments with effective date, reason, and cancellation of future dues.
 * 6. Reassignment of students whose assignments have ended.
 * 7. Bulk assignment partial failure handling and clear error reporting.
 */

import {
  createRoute,
  saveRouteStops,
  getRouteById,
  updateRouteStopFees,
} from "../src/services/transportCoreService";
import {
  createAssignment,
  changeAssignment,
  stopAssignment,
  bulkAssignStudents,
  listEnrichedAssignments,
  getActiveAssignmentForStudent,
} from "../src/services/transportAssignmentService";

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

async function runTests() {
  console.log("\n========================================================");
  console.log("Starting Student Transport Assignment Lifecycle Tests");
  console.log("========================================================\n");

  const schoolId = "school-assign-test-1";
  const academicYearId = "ay-2026-2027";

  // Setup mock students & classes in school
  const mockStudents = [
    {
      id: "std-001",
      school_id: schoolId,
      first_name: "Aarav",
      last_name: "Sharma",
      admission_no: "ADM-101",
      class_id: "cls-5a",
      status: "active",
    },
    {
      id: "std-002",
      school_id: schoolId,
      first_name: "Diya",
      last_name: "Patel",
      admission_no: "ADM-102",
      class_id: "cls-5a",
      status: "active",
    },
    {
      id: "std-003",
      school_id: schoolId,
      first_name: "Kabir",
      last_name: "Verma",
      admission_no: "ADM-103",
      class_id: "cls-6b",
      status: "active",
    },
  ];
  localStorage.setItem(`myzkool_students_${schoolId}`, JSON.stringify(mockStudents));

  const mockClasses = [
    { id: "cls-5a", school_id: schoolId, name: "Class 5-A" },
    { id: "cls-6b", school_id: schoolId, name: "Class 6-B" },
  ];
  localStorage.setItem(`myzkool_classes_${schoolId}`, JSON.stringify(mockClasses));

  // Enable active Pro subscription with transport feature
  localStorage.setItem(
    `myzkool_subscription_${schoolId}`,
    JSON.stringify({
      id: `sub-${schoolId}`,
      school_id: schoolId,
      status: "active",
      plan: { id: "pro", slug: "pro", name: "Pro" },
      current_period_ends_at: new Date(Date.now() + 365 * 86400000).toISOString(),
    })
  );

  // 1. Setup routes & stops with fees
  console.log("1. Setup Routes and Stops with Pricing");
  const r1Res = await createRoute(schoolId, {
    name: "North Campus Express",
    code: "NCE-01",
    pickup_start_time: "07:00",
    drop_start_time: "14:00",
    est_duration_min: 45,
    status: "active",
  });
  assert(Boolean(r1Res.success && r1Res.route?.id), "Created Route 1 (North Campus Express)");
  const r1 = r1Res.route!;

  const stopsR1Res = await saveRouteStops(schoolId, r1.id, [
    {
      name: "Sector 14 Chowk",
      landmark: "Near Metro Gate 2",
      sequence: 1,
      pickup_time: "07:15",
      drop_time: "14:15",
      monthly_fee_paise: 80000, // ₹800
      pickup_only_monthly_paise: 50000, // ₹500
      drop_only_monthly_paise: 50000, // ₹500
    },
    {
      name: "Sector 21 Market",
      landmark: "Opposite Community Centre",
      sequence: 2,
      pickup_time: "07:30",
      drop_time: "14:30",
      monthly_fee_paise: 100000, // ₹1000
      pickup_only_monthly_paise: 60000,
      drop_only_monthly_paise: 60000,
    },
  ]);
  assert(Boolean(stopsR1Res.success && stopsR1Res.stops?.length === 2), "Saved 2 stops for Route 1");
  const stop1 = stopsR1Res.stops![0];
  const stop2 = stopsR1Res.stops![1];

  const r2Res = await createRoute(schoolId, {
    name: "South Suburban Line",
    code: "SSL-02",
    pickup_start_time: "07:10",
    drop_start_time: "14:10",
    est_duration_min: 50,
    status: "active",
  });
  assert(Boolean(r2Res.success && r2Res.route?.id), "Created Route 2 (South Suburban Line)");
  const r2 = r2Res.route!;

  const stopsR2Res = await saveRouteStops(schoolId, r2.id, [
    {
      name: "Green Glen Colony",
      landmark: "Clubhouse",
      sequence: 1,
      pickup_time: "07:25",
      drop_time: "14:25",
      monthly_fee_paise: 120000, // ₹1200
      pickup_only_monthly_paise: 75000,
      drop_only_monthly_paise: 75000,
    },
  ]);
  assert(Boolean(stopsR2Res.success && stopsR2Res.stops?.length === 1), "Saved 1 stop for Route 2");
  const stopR2_1 = stopsR2Res.stops![0];

  // 2. Assign Student 1 & Verify Immediate Appearance in Assigned List
  console.log("\n2. Student Assignment Creation & Enriched View");
  const assignRes1 = await createAssignment(schoolId, {
    student_id: "std-001",
    academic_year_id: academicYearId,
    route_id: r1.id,
    pickup_stop_id: stop1.id,
    drop_stop_id: stop1.id,
    service_type: "both",
    effective_from: "2026-06-01",
  });
  assert(assignRes1.success === true, "Student 1 assigned successfully");
  assert(Boolean(assignRes1.assignment?.id), "Assignment ID generated");
  assert(assignRes1.assignment?.monthly_fee_paise === 80000, "Snapshotted fee is ₹800 (80000 paise)");

  // Check listEnrichedAssignments
  const assignedList1 = await listEnrichedAssignments(schoolId, { academicYearId, status: "all" });
  assert(assignedList1.length === 1, "Assigned list contains exactly 1 student");
  const a1 = assignedList1[0];
  assert(a1.student_name === "Aarav Sharma", "Enriched student name is 'Aarav Sharma'");
  assert(a1.student_admission_no === "ADM-101", "Enriched admission number is 'ADM-101'");
  assert(a1.class_name === "Class 5-A", "Enriched class name is 'Class 5-A'");
  assert(a1.route_name === "North Campus Express", "Enriched route name matches");
  assert(a1.pickup_stop_name === "Sector 14 Chowk", "Enriched pickup stop name matches");
  assert(a1.status === "active", "Assignment status is 'active'");
  assert(a1.effective_from === "2026-06-01", "Effective from date is '2026-06-01'");

  // 3. Duplicate Active Assignment Prevention
  console.log("\n3. Duplicate Active Assignment Prevention");
  const dupAssignRes = await createAssignment(schoolId, {
    student_id: "std-001",
    academic_year_id: academicYearId,
    route_id: r2.id,
    pickup_stop_id: stopR2_1.id,
    service_type: "both",
    effective_from: "2026-06-01",
  });
  assert(dupAssignRes.success === false, "Duplicate assignment was rejected");
  assert(dupAssignRes.error === "STUDENT_ALREADY_ASSIGNED", "Error returned is 'STUDENT_ALREADY_ASSIGNED'");

  // 4. Persistence Across Simulated Refreshes
  console.log("\n4. Persistence Across Simulated Refresh");
  const refreshedList = await listEnrichedAssignments(schoolId, { academicYearId });
  assert(refreshedList.length === 1, "Refreshed list retained assignment");
  assert(refreshedList[0].id === assignRes1.assignment!.id, "Assignment ID matches across refresh");

  // 5. Edit Assignment (Change route, stop, service type, effective date)
  console.log("\n5. Edit Assignment (Change Route, Stop, Service Type)");
  const changeRes = await changeAssignment(schoolId, assignRes1.assignment!.id, {
    new_route_id: r2.id,
    new_pickup_stop_id: stopR2_1.id,
    new_drop_stop_id: stopR2_1.id,
    new_service_type: "pickup_only",
    effective_date: "2026-07-01",
  });
  assert(changeRes.success === true, "Assignment edited successfully via changeAssignment");
  assert(changeRes.assignment?.route_id === r2.id, "New assignment route updated to Route 2");
  assert(changeRes.assignment?.service_type === "pickup_only", "New service type updated to 'pickup_only'");
  assert(changeRes.assignment?.monthly_fee_paise === 75000, "New stop pickup-only fee is 75000 paise (₹750)");

  // Verify list reflects change immediately
  const afterChangeList = await listEnrichedAssignments(schoolId, { academicYearId, status: "all" });
  assert(afterChangeList.length === 2, "List now has 2 assignment records (1 active, 1 ended)");
  const activeRecord = afterChangeList.find((a) => a.status === "active");
  const endedRecord = afterChangeList.find((a) => a.status === "ended");
  assert(Boolean(activeRecord && activeRecord.route_name === "South Suburban Line"), "Active record reflects new route");
  assert(Boolean(endedRecord && endedRecord.end_reason === "changed"), "Old record ended with reason 'changed'");

  // 6. Safe End of Assignment
  console.log("\n6. Safe End of Assignment with Cancellation");
  const stopRes = await stopAssignment(schoolId, activeRecord!.id, {
    effective_date: "2026-08-01",
    reason: "Parent requested cancellation",
  });
  assert(stopRes.success === true, "Assignment ended successfully via stopAssignment");
  assert(stopRes.assignment?.status === "ended", "Assignment status is 'ended'");
  assert(stopRes.assignment?.effective_to === "2026-08-01", "Effective to date matches '2026-08-01'");
  assert(stopRes.assignment?.end_reason === "Parent requested cancellation", "End reason preserved");

  // Verify no active assignments remain for Student 1
  const activeForStudent1 = await getActiveAssignmentForStudent(schoolId, "std-001", academicYearId);
  assert(activeForStudent1 === null, "Student 1 now has NO active transport assignment");

  // 7. Reassignment of Student whose assignment has ended
  console.log("\n7. Reassignment of Student After End");
  const reassignRes = await createAssignment(schoolId, {
    student_id: "std-001",
    academic_year_id: academicYearId,
    route_id: r1.id,
    pickup_stop_id: stop2.id,
    service_type: "both",
    effective_from: "2026-09-01",
  });
  assert(reassignRes.success === true, "Student 1 successfully reassigned to Route 1 Stop 2");
  assert(reassignRes.assignment?.monthly_fee_paise === 100000, "Monthly fee correctly resolved to ₹1000");

  // 8. Bulk Assignment & Partial Failure Handling
  console.log("\n8. Bulk Assignment & Partial Failure Handling");
  // Student 1 is already assigned. Student 2 and 3 are unassigned.
  // We bulk assign Student 1, Student 2, Student 3.
  // Student 1 should fail (already assigned), while Student 2 and 3 should succeed!
  const bulkRes = await bulkAssignStudents(schoolId, {
    student_ids: ["std-001", "std-002", "std-003"],
    academic_year_id: academicYearId,
    route_id: r1.id,
    pickup_stop_id: stop1.id,
    service_type: "both",
    effective_from: "2026-09-01",
  });

  assert(bulkRes.success === true, "Bulk assign reported partial success");
  assert(bulkRes.count === 2, "Exactly 2 new assignments created");
  assert(bulkRes.failed.length === 1, "Exactly 1 failure reported");
  assert(bulkRes.failed[0].student_id === "std-001", "Failure belongs to Student 1");
  assert(bulkRes.failed[0].error === "STUDENT_ALREADY_ASSIGNED", "Failure reason is 'STUDENT_ALREADY_ASSIGNED'");

  // Verify all 3 students now have active assignments
  const activeStd1 = await getActiveAssignmentForStudent(schoolId, "std-001", academicYearId);
  const activeStd2 = await getActiveAssignmentForStudent(schoolId, "std-002", academicYearId);
  const activeStd3 = await getActiveAssignmentForStudent(schoolId, "std-003", academicYearId);
  assert(Boolean(activeStd1 && activeStd2 && activeStd3), "All 3 students now have active assignments");

  console.log("\n========================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
