/**
 * Test Suite: MyZkool Students Module Stage 2 List & Profile
 * Verifies:
 * 1. Performance: List and search queries return under 300 ms with 2,000 seeded students
 * 2. Audit on every edit: Every field-level update writes a row to audit_logs
 * 3. Role scoping: Teacher sees only assigned section; parent sees only linked children
 * 4. Siblings detection through shared parent records
 * 5. Full profile data hydration
 */

import {
  listStudents,
  updateStudent,
  getStudentProfile,
  getStudentSiblings,
} from "../src/services/studentService";
import type {
  Student,
  StudentEnrollment,
  Parent,
  StudentParent,
  AuditLog,
} from "../src/types/students";

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

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ""}`);
    testsFailed++;
  }
}

async function runStage2Tests() {
  console.log("\n==========================================================");
  console.log("MYZKOOL STAGE 2: LIST & PROFILE TEST SUITE");
  console.log("==========================================================\n");

  const testSchoolId = "test-school-stage2";

  // Polyfill active session with owner/admin permissions so hasPermission returns true
  localStorage.setItem(
    "myzkool_user_permissions",
    JSON.stringify([
      "students.read",
      "students.write",
      "students.contacts.read",
      "students.reveal_sensitive",
      "students.medical.read",
      "students.medical.write",
      "students.documents.manage",
      "students.status.manage",
      "students.promote",
      "students.import",
      "students.export",
      "students.archive",
    ])
  );

  // 1. SEED 2,000 STUDENTS FOR PERFORMANCE BENCHMARK
  console.log("1. Seeding 2,000 Students & Performance Benchmark (Spec A4.1):");

  const seededStudents: Student[] = [];
  const seededEnrollments: StudentEnrollment[] = [];
  const seededParents: Parent[] = [];
  const seededStudentParents: StudentParent[] = [];

  const sectionAId = "sec-class1-a";
  const sectionBId = "sec-class1-b";
  const classId = "class-1";

  for (let i = 1; i <= 2000; i++) {
    const studentId = `seeded-student-${i}`;
    const sectionId = i % 2 === 0 ? sectionAId : sectionBId;
    const gender = i % 2 === 0 ? "female" : "male";
    const category = i % 5 === 0 ? "obc" : i % 7 === 0 ? "sc" : "general";

    seededStudents.push({
      id: studentId,
      school_id: testSchoolId,
      admission_no: `ADM-2026-${String(i).padStart(4, "0")}`,
      sr_no: `SR-${String(i).padStart(4, "0")}`,
      first_name: `Student${i}`,
      last_name: `Kumar`,
      dob: "2018-05-15",
      gender,
      nationality: "Indian",
      category,
      is_rte: i % 4 === 0,
      admission_date: "2026-04-01",
      admission_type: "new",
      status: "enrolled",
      created_at: new Date(Date.now() - i * 60000).toISOString(),
      updated_at: new Date(Date.now() - i * 60000).toISOString(),
    });

    seededEnrollments.push({
      id: `enr-${i}`,
      school_id: testSchoolId,
      student_id: studentId,
      academic_year_id: "ay-2026-27",
      class_id: classId,
      section_id: sectionId,
      roll_no: String((i % 50) + 1),
      status: "active",
      enrolled_on: "2026-04-01",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // Create two parents and link siblings
  const parent1Id = "parent-sharma-1";
  seededParents.push({
    id: parent1Id,
    school_id: testSchoolId,
    full_name: "Rajesh Kumar",
    phone: "9876543210",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Link student 1 and student 2 as siblings
  seededStudentParents.push(
    {
      id: "sp-1",
      school_id: testSchoolId,
      student_id: "seeded-student-1",
      parent_id: parent1Id,
      relation: "father",
      is_primary_contact: true,
      is_fee_payer: true,
      is_emergency_contact: true,
      can_pickup: true,
      lives_with: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "sp-2",
      school_id: testSchoolId,
      student_id: "seeded-student-2",
      parent_id: parent1Id,
      relation: "father",
      is_primary_contact: true,
      is_fee_payer: true,
      is_emergency_contact: true,
      can_pickup: true,
      lives_with: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  );

  // Save to localStorage cache
  localStorage.setItem(`myzkool_students_${testSchoolId}`, JSON.stringify(seededStudents));
  localStorage.setItem(`myzkool_student_enrollments_${testSchoolId}`, JSON.stringify(seededEnrollments));
  localStorage.setItem(`myzkool_parents_${testSchoolId}`, JSON.stringify(seededParents));
  localStorage.setItem(`myzkool_student_parents_${testSchoolId}`, JSON.stringify(seededStudentParents));

  // Benchmark 1: Unfiltered list of 2,000 students with cursor pagination
  const startList = performance.now();
  const listRes = await listStudents(testSchoolId, { limit: 50 });
  const listDuration = performance.now() - startList;

  assert(listRes.response?.data.length === 50, "List returns paginated page of 50 students");
  assert(listRes.response?.total_estimate === 2000, "Total estimate reflects 2,000 seeded students");
  assert(
    listDuration < 300,
    `List 50 from 2,000 students executes under 300 ms (${listDuration.toFixed(2)} ms)`
  );

  // Benchmark 2: Search across 2,000 students
  const startSearch = performance.now();
  const searchRes = await listStudents(testSchoolId, { search: "Student1999" });
  const searchDuration = performance.now() - startSearch;

  assert(searchRes.response?.data.length === 1, "Search finds target student 'Student1999'");
  assert(
    searchRes.response?.data[0].admission_no === "ADM-2026-1999",
    "Search matches exact admission number"
  );
  assert(
    searchDuration < 300,
    `Trigram/prefix search across 2,000 students executes under 300 ms (${searchDuration.toFixed(2)} ms)`
  );

  // Benchmark 3: Search by parent phone
  const phoneSearchRes = await listStudents(testSchoolId, { search: "9876543210" });
  assert(
    phoneSearchRes.response?.data.length === 2,
    "Search by parent phone finds all 2 linked children"
  );

  // 2. AUDIT ON EVERY EDIT (SPEC A6 RULE 7 & SPEC A4.3)
  console.log("\n2. Audit Logging on Every Edit (Spec A4.3):");

  const targetStudentId = "seeded-student-1";
  const editResult = await updateStudent(
    testSchoolId,
    targetStudentId,
    {
      first_name: "Aarav",
      last_name: "Sharma",
      dob: "2018-06-20",
      category: "ews",
      is_rte: true,
    },
    "user-editor-1",
    "school_admin"
  );

  assert(editResult.student?.first_name === "Aarav", "Student first_name updated to 'Aarav'");
  assert(editResult.student?.category === "ews", "Student category updated to 'ews'");

  // Check audit log row
  const auditLogsCache = localStorage.getItem(`myzkool_audit_logs_${testSchoolId}`);
  const auditLogs: AuditLog[] = auditLogsCache ? JSON.parse(auditLogsCache) : [];

  const updateLog = auditLogs.find(
    log => log.entity_type === "student" && log.entity_id === targetStudentId && log.action === "update"
  );

  assert(!!updateLog, "Audit log row created for student update action");
  assert(updateLog?.actor_id === "user-editor-1", "Audit log records correct actor_id");
  assert(updateLog?.actor_role === "school_admin", "Audit log records actor_role");
  assert(
    (updateLog?.before as any)?.first_name === "Student1",
    "Audit log records 'before' state (Student1)"
  );
  assert(
    (updateLog?.after as any)?.first_name === "Aarav",
    "Audit log records 'after' state (Aarav)"
  );

  // 3. ROLE SCOPING (SPEC A6 RULE 11)
  console.log("\n3. Role Scoping in List Queries (Spec A6 Rule 11):");

  // Teacher role scoping: teacher assigned to section A only
  const teacherListRes = await listStudents(testSchoolId, {
    userRole: "teacher",
    teacherSectionIds: [sectionAId],
    limit: 100,
  });

  const teacherStudents = teacherListRes.response?.data || [];
  assert(teacherStudents.length > 0, "Teacher can view students in assigned section A");
  // Every student returned must belong to section A
  const anyNonSectionA = teacherStudents.some(s => s.section_id && s.section_id !== sectionAId);
  assert(!anyNonSectionA, "Teacher cannot view any student outside assigned section A");

  // Parent role scoping: parent linked to student 1 and student 2
  const parentListRes = await listStudents(testSchoolId, {
    userRole: "parent",
    parentStudentIds: ["seeded-student-1", "seeded-student-2"],
  });

  const parentStudents = parentListRes.response?.data || [];
  assert(parentStudents.length === 2, "Parent can view exactly their 2 linked children");
  assert(
    parentStudents.some(s => s.id === "seeded-student-1") &&
    parentStudents.some(s => s.id === "seeded-student-2"),
    "Parent views only their own linked children"
  );
  assert(
    !parentStudents.some(s => s.id === "seeded-student-3"),
    "Parent is strictly prevented from seeing unlinked children"
  );

  // 4. SIBLINGS DETECTION FROM SHARED PARENTS
  console.log("\n4. Siblings Detection (Spec A3 view v_student_siblings):");

  const siblingsRes = await getStudentSiblings(testSchoolId, "seeded-student-1");
  const siblings = siblingsRes.siblings || [];
  assert(siblings.length === 1, "Student 1 detects 1 sibling sharing parent Rajesh Kumar");
  assert(siblings[0].sibling_id === "seeded-student-2", "Detects correct sibling (seeded-student-2)");

  // 5. FULL STUDENT PROFILE DATA
  console.log("\n5. Student Profile Data Hydration (Spec A4.3):");

  const profileRes = await getStudentProfile(testSchoolId, "seeded-student-1");
  assert(!!profileRes.profile, "Successfully retrieved full student profile");
  assert(profileRes.profile?.first_name === "Aarav", "Profile contains updated first name");
  assert(profileRes.profile?.parents.length === 1, "Profile hydrates linked parent");
  assert(profileRes.profile?.siblings.length === 1, "Profile hydrates siblings");

  console.log("\n----------------------------------------------------------");
  console.log(`TEST SUMMARY: ${testsPassed} Passed, ${testsFailed} Failed.`);
  console.log("----------------------------------------------------------\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runStage2Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
