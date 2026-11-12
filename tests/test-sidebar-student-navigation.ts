/**
 * Test Suite: Sidebar Student & Admission Active Navigation Verification
 *
 * Verifies:
 * 1. Exact route matching for /admin/students/new (Only Admissions is active, Students is not active)
 * 2. Exact route matching for /admin/students (Only Students is active, Admissions is not active)
 * 3. Exact route matching handles query parameters and trailing slashes (/admin/students/new?step=2, /admin/students/new/)
 * 4. Parent / nested route conflict prevention: parent route (/admin/students) never conflicts with nested route (/admin/students/new)
 * 5. Related student routes (/admin/students/import, /admin/students/promotion, /admin/students/tc, /admin/students/id-cards, /admin/students/:id) do not incorrectly trigger Admissions or cause multiple highlights
 * 6. Sibling and unrelated routes (/admin, /admin/attendance, /admin/settings/classes, /admin/exams) function correctly with exact matching
 */

import {
  isNavItemActive,
  normalizePath,
  NAVIGATION_GROUPS,
  ALL_NAV_HREFS,
  type NavItem,
} from "../src/components/admin/Sidebar";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ""}`);
    failed++;
  }
}

// Helper to find a NavItem by label
function findNavItem(label: string): NavItem {
  for (const group of NAVIGATION_GROUPS) {
    const found = group.items.find((item) => item.label === label);
    if (found) return found;
  }
  throw new Error(`NavItem with label "${label}" not found in NAVIGATION_GROUPS`);
}

async function runTestSuite() {
  console.log("==================================================================");
  console.log("TEST SUITE: SIDEBAR NAVIGATION & ROUTE CONFLICT RESOLUTION");
  console.log("==================================================================\n");

  const studentsItem = findNavItem("Students");
  const admissionsItem = findNavItem("Admissions");
  const dashboardItem = findNavItem("Dashboard");
  const academicsItem = findNavItem("Academics");
  const attendanceItem = findNavItem("Attendance");
  const examsItem = findNavItem("Examinations");

  // ─── 1. Primary Bug Verification: /admin/students/new ───────────────────
  console.log("1. Verification on /admin/students/new (New Student Admission):");
  {
    const path = "/admin/students/new";
    const admissionsActive = isNavItemActive(admissionsItem, path, ALL_NAV_HREFS);
    const studentsActive = isNavItemActive(studentsItem, path, ALL_NAV_HREFS);

    assert(
      admissionsActive === true,
      "Admissions nav item is active on /admin/students/new"
    );
    assert(
      studentsActive === false,
      "Students nav item is NOT active on /admin/students/new (no dual blue highlight)"
    );

    // Verify exactly one item in the sidebar is active on this route
    const allActiveItems = NAVIGATION_GROUPS.flatMap((g) => g.items).filter((item) =>
      isNavItemActive(item, path, ALL_NAV_HREFS)
    );
    assert(
      allActiveItems.length === 1 && allActiveItems[0].label === "Admissions",
      "Only Admissions is active on /admin/students/new (single highlight guaranteed)"
    );
  }

  // ─── 2. Verification on /admin/students (Student Directory) ─────────────
  console.log("\n2. Verification on /admin/students (Students List):");
  {
    const path = "/admin/students";
    const admissionsActive = isNavItemActive(admissionsItem, path, ALL_NAV_HREFS);
    const studentsActive = isNavItemActive(studentsItem, path, ALL_NAV_HREFS);

    assert(
      studentsActive === true,
      "Students nav item is active on /admin/students"
    );
    assert(
      admissionsActive === false,
      "Admissions nav item is NOT active on /admin/students"
    );

    const allActiveItems = NAVIGATION_GROUPS.flatMap((g) => g.items).filter((item) =>
      isNavItemActive(item, path, ALL_NAV_HREFS)
    );
    assert(
      allActiveItems.length === 1 && allActiveItems[0].label === "Students",
      "Only Students is active on /admin/students (single highlight guaranteed)"
    );
  }

  // ─── 3. Query Parameters & Trailing Slash Normalization ────────────────
  console.log("\n3. Query String & Trailing Slash Normalization:");
  {
    // /admin/students/new with query parameters
    assert(
      isNavItemActive(admissionsItem, "/admin/students/new?step=1", ALL_NAV_HREFS) === true,
      "Admissions is active on /admin/students/new?step=1"
    );
    assert(
      isNavItemActive(studentsItem, "/admin/students/new?step=1", ALL_NAV_HREFS) === false,
      "Students is NOT active on /admin/students/new?step=1"
    );

    assert(
      isNavItemActive(admissionsItem, "/admin/students/new?step=4&edit=false", ALL_NAV_HREFS) === true,
      "Admissions is active on /admin/students/new?step=4&edit=false"
    );
    assert(
      isNavItemActive(studentsItem, "/admin/students/new?step=4&edit=false", ALL_NAV_HREFS) === false,
      "Students is NOT active on /admin/students/new?step=4&edit=false"
    );

    // /admin/students/new with trailing slash
    assert(
      isNavItemActive(admissionsItem, "/admin/students/new/", ALL_NAV_HREFS) === true,
      "Admissions is active on /admin/students/new/"
    );
    assert(
      isNavItemActive(studentsItem, "/admin/students/new/", ALL_NAV_HREFS) === false,
      "Students is NOT active on /admin/students/new/"
    );

    // /admin/students with query params and trailing slash
    assert(
      isNavItemActive(studentsItem, "/admin/students?tab=all&page=2", ALL_NAV_HREFS) === true,
      "Students is active on /admin/students?tab=all&page=2"
    );
    assert(
      isNavItemActive(admissionsItem, "/admin/students?tab=all&page=2", ALL_NAV_HREFS) === false,
      "Admissions is NOT active on /admin/students?tab=all&page=2"
    );

    assert(
      isNavItemActive(studentsItem, "/admin/students/", ALL_NAV_HREFS) === true,
      "Students is active on /admin/students/"
    );
    assert(
      isNavItemActive(admissionsItem, "/admin/students/", ALL_NAV_HREFS) === false,
      "Admissions is NOT active on /admin/students/"
    );
  }

  // ─── 4. Related Student & Admission Routes ─────────────────────────────
  console.log("\n4. Testing Related Student & Admission Routes:");
  {
    const relatedRoutes = [
      "/admin/students/import",
      "/admin/students/promotion",
      "/admin/students/tc",
      "/admin/students/id-cards",
      "/admin/students/stu_01j7x8a9",
      "/admin/students/stu_01j7x8a9/edit",
      "/admin/students/stu_01j7x8a9?tab=documents",
    ];

    for (const route of relatedRoutes) {
      const admissionsActive = isNavItemActive(admissionsItem, route, ALL_NAV_HREFS);
      assert(
        admissionsActive === false,
        `Admissions is NOT falsely highlighted on related route ${route}`
      );
    }
  }

  // ─── 5. Other Sidebar Routes Exact Matching ────────────────────────────
  console.log("\n5. Testing Other Sidebar Routes (Dashboard, Academics, Attendance, Exams):");
  {
    // Dashboard (/admin)
    assert(
      isNavItemActive(dashboardItem, "/admin", ALL_NAV_HREFS) === true,
      "Dashboard is active on /admin"
    );
    assert(
      isNavItemActive(dashboardItem, "/admin/students", ALL_NAV_HREFS) === false,
      "Dashboard is NOT active on /admin/students"
    );
    assert(
      isNavItemActive(dashboardItem, "/admin/students/new", ALL_NAV_HREFS) === false,
      "Dashboard is NOT active on /admin/students/new"
    );

    // Academics (/admin/settings/classes)
    assert(
      isNavItemActive(academicsItem, "/admin/settings/classes", ALL_NAV_HREFS) === true,
      "Academics is active on /admin/settings/classes"
    );
    assert(
      isNavItemActive(academicsItem, "/admin/students/new", ALL_NAV_HREFS) === false,
      "Academics is NOT active on /admin/students/new"
    );

    // Attendance (/admin/attendance)
    assert(
      isNavItemActive(attendanceItem, "/admin/attendance", ALL_NAV_HREFS) === true,
      "Attendance is active on /admin/attendance"
    );
    assert(
      isNavItemActive(attendanceItem, "/admin/students/new", ALL_NAV_HREFS) === false,
      "Attendance is NOT active on /admin/students/new"
    );

    // Exams (/admin/exams)
    assert(
      isNavItemActive(examsItem, "/admin/exams", ALL_NAV_HREFS) === true,
      "Examinations is active on /admin/exams"
    );
    assert(
      isNavItemActive(examsItem, "/admin/students/new", ALL_NAV_HREFS) === false,
      "Examinations is NOT active on /admin/students/new"
    );
  }

  // ─── 6. Parent vs Nested Route Conflict Resolution Logic ───────────────
  console.log("\n6. Parent vs Nested Route Conflict Resolution Logic:");
  {
    // Test that when a parent nav item does not specify exact: true,
    // it STILL will not match when a more specific sibling route exists
    const mockParentItem: NavItem = {
      label: "Parent Students",
      href: "/admin/students",
      icon: () => null,
      exact: false, // Intentionally testing prefix mode
    };

    const mockAdmissionsItem: NavItem = {
      label: "Admissions",
      href: "/admin/students/new",
      icon: () => null,
      exact: true,
    };

    const mockHrefs = ["/admin/students", "/admin/students/new"];

    // On /admin/students/new:
    // Even if parent item is exact: false, conflict resolution must prevent it from being active
    const parentActiveOnNested = isNavItemActive(mockParentItem, "/admin/students/new", mockHrefs);
    assert(
      parentActiveOnNested === false,
      "Parent item (/admin/students) avoids conflict and yields to nested nav item (/admin/students/new)"
    );

    // On /admin/students/import (no sibling item):
    const parentActiveOnImport = isNavItemActive(mockParentItem, "/admin/students/import", mockHrefs);
    assert(
      parentActiveOnImport === true,
      "Parent item (/admin/students with exact: false) matches /admin/students/import when no specific sibling exists"
    );
  }

  // ─── 7. Path Normalization Utility Verification ─────────────────────────
  console.log("\n7. Path Normalization Utility Verification:");
  {
    assert(normalizePath("/admin/students/new/") === "/admin/students/new", "Strips trailing slash");
    assert(normalizePath("/admin/students/new///") === "/admin/students/new", "Strips multiple trailing slashes");
    assert(normalizePath("/admin/students/new?step=2") === "/admin/students/new", "Strips query string");
    assert(normalizePath("/admin/students/new#section") === "/admin/students/new", "Strips hash");
    assert(normalizePath("/admin/students/new/?step=2#section") === "/admin/students/new", "Strips trailing slash, query, and hash");
    assert(normalizePath("/") === "/", "Normalizes root / cleanly");
    assert(normalizePath("///") === "/", "Normalizes multiple slashes to root /");
  }

  console.log("\n==================================================================");
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("==================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Unhandled error in test suite:", err);
  process.exit(1);
});
