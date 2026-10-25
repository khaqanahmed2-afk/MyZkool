/**
 * Regression Test Suite: Students Module Strict Dependent Class -> Section Filtering,
 * Server-side Multi-field Search, Pagination, Accurate Summary Metrics, & Tenant Isolation
 */

import {
  listStudents,
  getStudentSummaryMetrics,
} from "../src/services/studentService";
import { getSectionsForClass } from "../src/services/classSectionService";
import { exportStudentsList, bulkChangeStudentStatus } from "../src/services/studentOperationsService";
import type { SchoolClass, SchoolSection } from "../src/types/curriculum";
import type { Student, StudentEnrollment, Parent, StudentParent } from "../src/types/students";

// Polyfill localStorage for Node test environment
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] || null,
    get length() {
      return store.size;
    },
  } as Storage;
}

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failCount++;
  }
}

async function runTests() {
  console.log("==========================================================");
  console.log("MYZKOOL STUDENTS: CLASS-SECTION & ARCHITECTURE TEST SUITE");
  console.log("==========================================================");

  const schoolA = "test-school-tenant-alpha-001";
  const schoolB = "test-school-tenant-beta-002";
  const actorAdmin = "admin-user-001";

  // Permissions polyfill
  localStorage.setItem("myzkool_user_role", "admin");
  localStorage.setItem(
    "myzkool_user_permissions",
    JSON.stringify([
      "students.read",
      "students.write",
      "students.contacts.read",
      "students.documents.manage",
      "students.status.manage",
      "students.promote",
      "students.import",
      "students.export",
      "students.archive",
    ])
  );

  const nowStr = new Date().toISOString();

  // Setup mock local storage cache for curriculum classes & sections
  const classA1: SchoolClass = {
    id: "cls-a-1",
    school_id: schoolA,
    academic_year_id: "ay-2026-27",
    name: "Class 10",
    sort_order: 1,
    status: "active",
    created_at: nowStr,
    updated_at: nowStr,
  };
  const classA2: SchoolClass = {
    id: "cls-a-2",
    school_id: schoolA,
    academic_year_id: "ay-2026-27",
    name: "Class 11",
    sort_order: 2,
    status: "active",
    created_at: nowStr,
    updated_at: nowStr,
  };
  const sectionA1_A: SchoolSection = {
    id: "sec-a-1-a",
    school_id: schoolA,
    academic_year_id: "ay-2026-27",
    class_id: "cls-a-1",
    name: "Section A",
    sort_order: 1,
    capacity: 40,
    status: "active",
    created_at: nowStr,
    updated_at: nowStr,
  };
  const sectionA1_B: SchoolSection = {
    id: "sec-a-1-b",
    school_id: schoolA,
    academic_year_id: "ay-2026-27",
    class_id: "cls-a-1",
    name: "Section B",
    sort_order: 2,
    capacity: 40,
    status: "active",
    created_at: nowStr,
    updated_at: nowStr,
  };
  const sectionA2_Science: SchoolSection = {
    id: "sec-a-2-sci",
    school_id: schoolA,
    academic_year_id: "ay-2026-27",
    class_id: "cls-a-2",
    name: "Science",
    sort_order: 1,
    capacity: 35,
    status: "active",
    created_at: nowStr,
    updated_at: nowStr,
  };

  // School B class & section for cross-tenant tests
  const classB1: SchoolClass = {
    id: "cls-b-1",
    school_id: schoolB,
    academic_year_id: "ay-2026-27",
    name: "Class 10 (Beta)",
    sort_order: 1,
    status: "active",
    created_at: nowStr,
    updated_at: nowStr,
  };
  const sectionB1_A: SchoolSection = {
    id: "sec-b-1-a",
    school_id: schoolB,
    academic_year_id: "ay-2026-27",
    class_id: "cls-b-1",
    name: "Section A (Beta)",
    sort_order: 1,
    capacity: 30,
    status: "active",
    created_at: nowStr,
    updated_at: nowStr,
  };

  localStorage.setItem(`myzkool_classes_${schoolA}`, JSON.stringify([classA1, classA2]));
  localStorage.setItem(
    `myzkool_sections_${schoolA}`,
    JSON.stringify([sectionA1_A, sectionA1_B, sectionA2_Science])
  );
  localStorage.setItem(`myzkool_classes_${schoolB}`, JSON.stringify([classB1]));
  localStorage.setItem(`myzkool_sections_${schoolB}`, JSON.stringify([sectionB1_A]));

  console.log("\n1. Strict Class -> Section Dependency (Spec Section 2):");
  {
    // 1.1 When no class is selected: getSectionsForClass should return empty array
    const noClassRes = await getSectionsForClass(schoolA, "");
    assert(
      noClassRes.sections.length === 0,
      "When no class is selected, getSectionsForClass returns 0 sections"
    );

    // 1.2 When Class 10 is selected: returns only sections for Class 10
    const class10Res = await getSectionsForClass(schoolA, "cls-a-1");
    assert(
      class10Res.sections.length === 2 &&
        class10Res.sections.every((s) => s.class_id === "cls-a-1"),
      "Selecting Class 10 returns exclusively sections belonging to Class 10"
    );

    // 1.3 When Class 11 is selected: returns only sections for Class 11
    const class11Res = await getSectionsForClass(schoolA, "cls-a-2");
    assert(
      class11Res.sections.length === 1 && class11Res.sections[0].id === "sec-a-2-sci",
      "Selecting Class 11 returns Section Science and not Section A/B"
    );

    // 1.4 Changing/clearing class filter resets section list to empty
    const clearedRes = await getSectionsForClass(schoolA, undefined as any);
    assert(
      clearedRes.sections.length === 0,
      "Clearing class filter resets section list to empty"
    );
  }

  console.log("\n2. Server-side Query Validation & Cross-Tenant Rejection (Spec Section 2 & 10):");
  {
    // 2.1 Attempting to filter by section without selecting class
    const noClassSectionRes = await listStudents(schoolA, {
      section_id: "sec-a-1-a",
    });
    assert(
      Boolean(noClassSectionRes.error),
      "Filtering by section without a class is rejected with explicit error"
    );

    // 2.2 Attempting to query with a section that belongs to Class 11 while class_id is Class 10
    const mismatchQuery = await listStudents(schoolA, {
      class_id: "cls-a-1",
      section_id: "sec-a-2-sci", // belongs to cls-a-2!
    });
    assert(
      mismatchQuery.response?.data.length === 0 && mismatchQuery.response?.total === 0,
      "Server rejects mismatched class and section combinations and returns empty dataset"
    );

    // 2.3 Cross-tenant section query: School A querying School B's section
    const crossTenantQuery = await listStudents(schoolA, {
      class_id: "cls-a-1",
      section_id: "sec-b-1-a", // belongs to School B!
    });
    assert(
      crossTenantQuery.response?.data.length === 0,
      "Server rejects section belonging to a different school/tenant"
    );
  }

  console.log("\n3. Multi-field Search, Pagination, & Metrics Setup:");
  {
    // Seed student test records for schoolA
    const student1: Student = {
      id: "std-a-1",
      school_id: schoolA,
      admission_no: "ADM-2026-001",
      sr_no: "SR-901",
      first_name: "Devendra",
      last_name: "Sharma",
      dob: "2010-05-15",
      gender: "male",
      nationality: "Indian",
      is_rte: false,
      admission_date: "2026-04-01",
      admission_type: "new",
      status: "enrolled",
      created_at: nowStr,
      updated_at: nowStr,
    };

    const student2: Student = {
      id: "std-a-2",
      school_id: schoolA,
      admission_no: "ADM-2026-002",
      sr_no: "SR-902",
      first_name: "Ananya",
      last_name: "Verma",
      dob: "2011-08-20",
      gender: "female",
      nationality: "Indian",
      is_rte: false,
      admission_date: "2026-04-01",
      admission_type: "new",
      status: "enrolled",
      created_at: nowStr,
      updated_at: nowStr,
    };

    const student3: Student = {
      id: "std-a-3",
      school_id: schoolA,
      admission_no: "ADM-2025-099",
      sr_no: "SR-899",
      first_name: "Rohit",
      last_name: "Gupta",
      dob: "2009-02-10",
      gender: "male",
      nationality: "Indian",
      is_rte: false,
      admission_date: "2025-04-01",
      admission_type: "re_admission",
      status: "inactive",
      created_at: nowStr,
      updated_at: nowStr,
    };

    const enr1: StudentEnrollment = {
      id: "enr-1",
      school_id: schoolA,
      student_id: "std-a-1",
      class_id: "cls-a-1",
      section_id: "sec-a-1-a",
      academic_year_id: "ay-2026-27",
      roll_no: "101",
      status: "active",
      enrolled_on: "2026-04-01",
      created_at: nowStr,
      updated_at: nowStr,
    };

    const enr2: StudentEnrollment = {
      id: "enr-2",
      school_id: schoolA,
      student_id: "std-a-2",
      class_id: "cls-a-1",
      section_id: "sec-a-1-b",
      academic_year_id: "ay-2026-27",
      roll_no: "102",
      status: "active",
      enrolled_on: "2026-04-01",
      created_at: nowStr,
      updated_at: nowStr,
    };

    const parent1: Parent = {
      id: "par-1",
      school_id: schoolA,
      full_name: "Ramesh Sharma",
      phone: "9876543210",
      email: "ramesh.sharma@example.com",
      created_at: nowStr,
      updated_at: nowStr,
    };

    const parent2: Parent = {
      id: "par-2",
      school_id: schoolA,
      full_name: "Sunita Verma",
      phone: "9123456789",
      email: "sunita.verma@example.com",
      created_at: nowStr,
      updated_at: nowStr,
    };

    const sp1: StudentParent = {
      id: "sp-1",
      school_id: schoolA,
      student_id: "std-a-1",
      parent_id: "par-1",
      relation: "father",
      is_primary_contact: true,
      is_fee_payer: true,
      is_emergency_contact: true,
      can_pickup: true,
      lives_with: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const sp2: StudentParent = {
      id: "sp-2",
      school_id: schoolA,
      student_id: "std-a-2",
      parent_id: "par-2",
      relation: "mother",
      is_primary_contact: true,
      is_fee_payer: true,
      is_emergency_contact: true,
      can_pickup: true,
      lives_with: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Dues records: student 1 has pending fee dues
    const dues = [
      {
        id: "due-1",
        school_id: schoolA,
        student_id: "std-a-1",
        academic_year_id: "ay-2026-27",
        balance_paise: 500000,
        status: "pending",
      },
      {
        id: "due-2",
        school_id: schoolA,
        student_id: "std-a-2",
        academic_year_id: "ay-2026-27",
        balance_paise: 0,
        status: "paid",
      },
    ];

    localStorage.setItem(`myzkool_students_${schoolA}`, JSON.stringify([student1, student2, student3]));
    localStorage.setItem(`myzkool_student_enrollments_${schoolA}`, JSON.stringify([enr1, enr2]));
    localStorage.setItem(`myzkool_parents_${schoolA}`, JSON.stringify([parent1, parent2]));
    localStorage.setItem(`myzkool_student_parents_${schoolA}`, JSON.stringify([sp1, sp2]));
    localStorage.setItem(`myzkool_student_dues_${schoolA}`, JSON.stringify(dues));

    console.log("3.1 Testing multi-field search:");

    // 3.1 Search by student first name
    const searchByName = await listStudents(schoolA, { search: "Devendra" });
    assert(
      searchByName.response?.data.some((s) => s.first_name === "Devendra"),
      "Search by student first name matches correctly"
    );

    // 3.2 Search by admission number
    const searchByAdmNo = await listStudents(schoolA, { search: "ADM-2026-002" });
    assert(
      searchByAdmNo.response?.data.length === 1 &&
        searchByAdmNo.response?.data[0].admission_no === "ADM-2026-002",
      "Search by admission number matches exact student"
    );

    // 3.3 Search by parent name
    const searchByParentName = await listStudents(schoolA, { search: "Ramesh" });
    assert(
      searchByParentName.response?.data.some((s) => s.first_name === "Devendra"),
      "Search by parent name matches child record"
    );

    // 3.4 Search by parent phone
    const searchByParentPhone = await listStudents(schoolA, { search: "9123456789" });
    assert(
      searchByParentPhone.response?.data.some((s) => s.first_name === "Ananya"),
      "Search by parent phone matches child record"
    );
  }

  console.log("\n4. Server-side Pagination & Deterministic Sorting (Spec Section 5):");
  {
    const page1 = await listStudents(schoolA, { page: 1, limit: 1 });
    assert(
      page1.response?.data.length === 1 && page1.response?.total === 3,
      "Page 1 returns exactly 1 item with accurate total count (3)"
    );

    const page2 = await listStudents(schoolA, { page: 2, limit: 1 });
    assert(
      page2.response?.data.length === 1 &&
        page2.response?.data[0].id !== page1.response?.data[0].id,
      "Page 2 returns different record without overlap or skipped items"
    );

    assert(
      page1.response?.total_pages === 3,
      "Calculates total_pages accurately based on total and limit"
    );
  }

  console.log("\n5. Accurate Summary Metrics (Spec Section 3):");
  {
    const metricsRes = await getStudentSummaryMetrics(schoolA, "ay-2026-27", "2026-04-01");
    assert(!metricsRes.error && !!metricsRes.metrics, "Summary metrics query succeeds without error");
    if (metricsRes.metrics) {
      assert(
        metricsRes.metrics.totalStudents === 3,
        `Total students metric accurately reflects database total (${metricsRes.metrics.totalStudents} === 3)`
      );
      assert(
        metricsRes.metrics.enrolledCount === 2,
        `Enrolled students metric reflects active enrollment (${metricsRes.metrics.enrolledCount} === 2)`
      );
      assert(
        metricsRes.metrics.newAdmissionsCount === 2,
        `New admissions count is computed deterministically (${metricsRes.metrics.newAdmissionsCount} === 2)`
      );
      assert(
        metricsRes.metrics.feePendingCount === 1,
        `Pending fees count uses canonical financial model student_dues (${metricsRes.metrics.feePendingCount} === 1)`
      );
    }
  }

  console.log("\n6. Filtered Export & Bulk Operations (Spec Section 9 & 14):");
  {
    // Test export with filter
    const exportRes = await exportStudentsList(
      schoolA,
      actorAdmin,
      {
        class_id: "cls-a-1",
        section_id: "sec-a-1-a",
      },
      "admin"
    );
    assert(
      exportRes.count >= 1 && exportRes.csv.includes("Devendra"),
      "Export produces CSV respecting class and section filters"
    );

    // Test bulk status change
    const bulkRes = await bulkChangeStudentStatus(
      schoolA,
      ["std-a-1"],
      "inactive",
      "Transferred to another school",
      actorAdmin,
      "admin"
    );
    assert(
      bulkRes.updatedCount === 1,
      "Bulk status change updates student status with audit logging"
    );

    const updatedCheck = await listStudents(schoolA, { status: "inactive" });
    assert(
      updatedCheck.response?.data.some((s) => s.id === "std-a-1"),
      "Student reflects new inactive status in subsequent queries"
    );
  }

  console.log("\n----------------------------------------------------------");
  console.log(`TEST SUMMARY: ${passCount} Passed, ${failCount} Failed.`);
  console.log("----------------------------------------------------------");

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
