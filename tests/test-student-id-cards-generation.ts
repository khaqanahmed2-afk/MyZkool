/**
 * E2E Verification Test Suite: Student ID Cards Generation
 * Tests Individual Student ID Generation, Bulk Generation, Field Accuracy, and Multi-Tenant Security.
 */

import {
  getStudentIdCardData,
  StudentIdCardItem,
} from "../src/services/studentOperationsService";
import type { Student, StudentEnrollment, Parent, StudentParent } from "../src/types/students";

// Mock localStorage for headless Node/tsx test runner
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => store.get(key) || null,
  setItem: (key: string, value: string) => {
    store.set(key, value);
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
  console.log("========================================================");
  console.log("TEST SUITE: Student ID Cards Generation & Accuracy");
  console.log("========================================================");

  const school1Id = "sch_greenfield_01";
  const school2Id = "sch_st_xavier_02";

  // Setup School Profiles
  localStorage.setItem(
    `myzkool_school_profile_school_${school1Id}`,
    JSON.stringify({
      id: school1Id,
      name: "Greenfield Public School",
      logo_url: "https://myzkool.com/logos/greenfield.png",
    })
  );

  localStorage.setItem(
    `myzkool_school_profile_school_${school2Id}`,
    JSON.stringify({
      id: school2Id,
      name: "St. Xavier Academy",
      logo_url: "https://myzkool.com/logos/stxavier.png",
    })
  );

  // Setup Classes & Sections for School 1
  const classes = [
    { id: "cls_5", school_id: school1Id, name: "Class 5" },
    { id: "cls_6", school_id: school1Id, name: "Class 6" },
    { id: "cls_7", school_id: school1Id, name: "Class 7" },
  ];
  localStorage.setItem(`myzkool_classes_${school1Id}`, JSON.stringify(classes));

  const sections = [
    { id: "sec_5a", school_id: school1Id, class_id: "cls_5", name: "Section A" },
    { id: "sec_6b", school_id: school1Id, class_id: "cls_6", name: "Section B" },
    { id: "sec_7a", school_id: school1Id, class_id: "cls_7", name: "Section A" },
  ];
  localStorage.setItem(`myzkool_sections_${school1Id}`, JSON.stringify(sections));

  // Setup 3 Students for School 1
  const studentA: Student = {
    id: "stu_01_aarav",
    school_id: school1Id,
    admission_no: "ADM-2026-0101",
    first_name: "Aarav",
    last_name: "Sharma",
    dob: "2015-04-12",
    gender: "male",
    status: "enrolled",
    blood_group: "B+",
    nationality: "Indian",
    is_rte: false,
    admission_date: "2026-04-01",
    admission_type: "new",
    photo_path: "https://myzkool.com/photos/aarav.jpg",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const studentB: Student = {
    id: "stu_02_diya",
    school_id: school1Id,
    admission_no: "ADM-2026-0102",
    first_name: "Diya",
    last_name: "Patel",
    dob: "2014-08-20",
    gender: "female",
    status: "enrolled",
    blood_group: "O+",
    nationality: "Indian",
    is_rte: false,
    admission_date: "2026-04-01",
    admission_type: "new",
    photo_path: "https://myzkool.com/photos/diya.jpg",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const studentC: Student = {
    id: "stu_03_kabir",
    school_id: school1Id,
    admission_no: "ADM-2026-0103",
    first_name: "Kabir",
    middle_name: "Singh",
    last_name: "Verma",
    dob: "2013-11-05",
    gender: "male",
    status: "enrolled",
    blood_group: "AB+",
    nationality: "Indian",
    is_rte: false,
    admission_date: "2026-04-01",
    admission_type: "new",
    photo_path: "https://myzkool.com/photos/kabir.jpg",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Setup 1 Student for School 2 (to test multi-tenant boundaries)
  const studentD: Student = {
    id: "stu_04_rohan_sch2",
    school_id: school2Id,
    admission_no: "ADM-2026-0201",
    first_name: "Rohan",
    last_name: "Gupta",
    dob: "2014-01-15",
    gender: "male",
    status: "enrolled",
    blood_group: "A+",
    nationality: "Indian",
    is_rte: false,
    admission_date: "2026-04-01",
    admission_type: "new",
    photo_path: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  localStorage.setItem(`myzkool_students_${school1Id}`, JSON.stringify([studentA, studentB, studentC]));
  localStorage.setItem(`myzkool_students_${school2Id}`, JSON.stringify([studentD]));

  // Setup Enrollments
  const enrollmentsSch1: StudentEnrollment[] = [
    {
      id: "enr_01",
      school_id: school1Id,
      student_id: studentA.id,
      class_id: "cls_5",
      section_id: "sec_5a",
      academic_year_id: "ay-2026",
      status: "active",
      enrolled_on: "2026-04-01",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "enr_02",
      school_id: school1Id,
      student_id: studentB.id,
      class_id: "cls_6",
      section_id: "sec_6b",
      academic_year_id: "ay-2026",
      status: "active",
      enrolled_on: "2026-04-01",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "enr_03",
      school_id: school1Id,
      student_id: studentC.id,
      class_id: "cls_7",
      section_id: "sec_7a",
      academic_year_id: "ay-2026",
      status: "active",
      enrolled_on: "2026-04-01",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  localStorage.setItem(`myzkool_student_enrollments_${school1Id}`, JSON.stringify(enrollmentsSch1));

  // Setup Parents
  const parentsSch1: Parent[] = [
    {
      id: "par_01_ramesh",
      school_id: school1Id,
      full_name: "Ramesh Sharma",
      phone: "9876543210",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "par_02_suresh",
      school_id: school1Id,
      full_name: "Suresh Patel",
      phone: "9876543220",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "par_03_rajesh",
      school_id: school1Id,
      full_name: "Rajesh Verma",
      phone: "9876543230",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  localStorage.setItem(`myzkool_parents_${school1Id}`, JSON.stringify(parentsSch1));

  // Setup Student-Parent Links
  const studentParentsSch1: any[] = [
    {
      id: "sp_01",
      school_id: school1Id,
      student_id: studentA.id,
      parent_id: "par_01_ramesh",
      relation: "father",
      is_primary_contact: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "sp_02",
      school_id: school1Id,
      student_id: studentB.id,
      parent_id: "par_02_suresh",
      relation: "father",
      is_primary_contact: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "sp_03",
      school_id: school1Id,
      student_id: studentC.id,
      parent_id: "par_03_rajesh",
      relation: "father",
      is_primary_contact: true,
      created_at: new Date().toISOString(),
    },
  ];
  localStorage.setItem(`myzkool_student_parents_${school1Id}`, JSON.stringify(studentParentsSch1));

  // --- Group 1: Individual Generation for Student A ---
  console.log("\n--- Group 1: Individual ID Card for Student A ---");
  const cardsA = await getStudentIdCardData(school1Id, { studentId: studentA.id });
  assert(cardsA.length === 1, `Returns exactly 1 card for Student A (actual: ${cardsA.length})`);
  assert(cardsA[0].student_id === studentA.id, `Card student_id matches Student A's ID`);
  assert(cardsA[0].full_name === "Aarav Sharma", `Card full_name is 'Aarav Sharma' (actual: ${cardsA[0].full_name})`);
  assert(cardsA[0].admission_no === "ADM-2026-0101", `Card admission_no is 'ADM-2026-0101'`);
  assert(cardsA[0].photo_url === "https://myzkool.com/photos/aarav.jpg", `Card photo_url is restored`);
  assert(cardsA[0].class_name === "Class 5", `Card class_name is 'Class 5'`);
  assert(cardsA[0].section_name === "Section A", `Card section_name is 'Section A'`);
  assert(cardsA[0].father_name === "Ramesh Sharma", `Card father_name is 'Ramesh Sharma'`);
  assert(cardsA[0].guardian_phone === "9876543210", `Card guardian_phone is '9876543210'`);
  assert(cardsA[0].blood_group === "B+", `Card blood_group is 'B+'`);
  assert(cardsA[0].school_name === "Greenfield Public School", `Card school_name is authenticated school name`);
  assert(cardsA[0].school_logo_url === "https://myzkool.com/logos/greenfield.png", `Card school_logo_url is present`);
  assert(cardsA[0].qr_payload === `MYZKOOL:STUDENT:${studentA.admission_no}:${studentA.id}`, `QR payload correctly encoded`);
  assert(!cardsA.some((c) => c.student_id === studentB.id), `Does NOT contain Student B`);
  assert(!cardsA.some((c) => c.student_id === studentC.id), `Does NOT contain Student C`);

  // --- Group 2: Individual Generation for Student B ---
  console.log("\n--- Group 2: Individual ID Card for Student B ---");
  const cardsB = await getStudentIdCardData(school1Id, { studentId: studentB.id });
  assert(cardsB.length === 1, `Returns exactly 1 card for Student B (actual: ${cardsB.length})`);
  assert(cardsB[0].student_id === studentB.id, `Card student_id matches Student B's ID`);
  assert(cardsB[0].full_name === "Diya Patel", `Card full_name is 'Diya Patel' (actual: ${cardsB[0].full_name})`);
  assert(cardsB[0].admission_no === "ADM-2026-0102", `Card admission_no is 'ADM-2026-0102'`);
  assert(cardsB[0].class_name === "Class 6", `Card class_name is 'Class 6'`);
  assert(cardsB[0].section_name === "Section B", `Card section_name is 'Section B'`);
  assert(cardsB[0].father_name === "Suresh Patel", `Card father_name is 'Suresh Patel'`);
  assert(cardsB[0].guardian_phone === "9876543220", `Card guardian_phone is '9876543220'`);
  assert(cardsB[0].blood_group === "O+", `Card blood_group is 'O+'`);
  assert(!cardsB.some((c) => c.student_id === studentA.id), `Does NOT contain Student A`);
  assert(!cardsB.some((c) => c.student_id === studentC.id), `Does NOT contain Student C`);

  // --- Group 3: Individual Generation for Student C ---
  console.log("\n--- Group 3: Individual ID Card for Student C ---");
  const cardsC = await getStudentIdCardData(school1Id, { studentId: studentC.id });
  assert(cardsC.length === 1, `Returns exactly 1 card for Student C (actual: ${cardsC.length})`);
  assert(cardsC[0].student_id === studentC.id, `Card student_id matches Student C's ID`);
  assert(cardsC[0].full_name === "Kabir Singh Verma", `Card full_name with middle name is 'Kabir Singh Verma'`);
  assert(cardsC[0].admission_no === "ADM-2026-0103", `Card admission_no is 'ADM-2026-0103'`);
  assert(cardsC[0].class_name === "Class 7", `Card class_name is 'Class 7'`);
  assert(cardsC[0].section_name === "Section A", `Card section_name is 'Section A'`);
  assert(cardsC[0].father_name === "Rajesh Verma", `Card father_name is 'Rajesh Verma'`);
  assert(cardsC[0].guardian_phone === "9876543230", `Card guardian_phone is '9876543230'`);
  assert(cardsC[0].blood_group === "AB+", `Card blood_group is 'AB+'`);
  assert(!cardsC.some((c) => c.student_id === studentA.id), `Does NOT contain Student A`);
  assert(!cardsC.some((c) => c.student_id === studentB.id), `Does NOT contain Student B`);

  // --- Group 4: Bulk Generation for Selected Students (A & C) ---
  console.log("\n--- Group 4: Bulk ID Cards for Selected Students (A and C) ---");
  const bulkAC = await getStudentIdCardData(school1Id, { studentIds: [studentA.id, studentC.id] });
  assert(bulkAC.length === 2, `Returns exactly 2 cards for bulk selection (actual: ${bulkAC.length})`);
  const bulkIds = new Set(bulkAC.map((c) => c.student_id));
  assert(bulkIds.has(studentA.id), `Bulk cards contain Student A`);
  assert(bulkIds.has(studentC.id), `Bulk cards contain Student C`);
  assert(!bulkIds.has(studentB.id), `Bulk cards do NOT contain unselected Student B`);

  // --- Group 5: Full School Batch Generation (No Filters) ---
  console.log("\n--- Group 5: Full School Batch Generation ---");
  const fullBatch = await getStudentIdCardData(school1Id);
  assert(fullBatch.length === 3, `Returns all 3 enrolled students for full batch print (actual: ${fullBatch.length})`);

  // --- Group 6: Class-Filtered Batch Generation ---
  console.log("\n--- Group 6: Class Filtered ID Card Batch (Class 6) ---");
  const class6Cards = await getStudentIdCardData(school1Id, { classId: "cls_6" });
  assert(class6Cards.length === 1, `Returns 1 card for Class 6 (actual: ${class6Cards.length})`);
  assert(class6Cards[0].student_id === studentB.id, `Card belongs to Student B in Class 6`);

  // --- Group 7: Multi-Tenant Tenant Boundary Security ---
  console.log("\n--- Group 7: Multi-Tenant Security & Tenant Isolation ---");
  const crossTenantAttempt1 = await getStudentIdCardData(school2Id, { studentId: studentA.id });
  assert(
    crossTenantAttempt1.length === 0,
    `School 2 cannot generate or view Student A from School 1 (actual: ${crossTenantAttempt1.length})`
  );

  const crossTenantAttempt2 = await getStudentIdCardData(school1Id, { studentId: studentD.id });
  assert(
    crossTenantAttempt2.length === 0,
    `School 1 cannot generate or view Student D from School 2 (actual: ${crossTenantAttempt2.length})`
  );

  const crossTenantBulk = await getStudentIdCardData(school2Id, {
    studentIds: [studentA.id, studentB.id, studentD.id],
  });
  assert(
    crossTenantBulk.length === 1 && crossTenantBulk[0].student_id === studentD.id,
    `Cross-tenant bulk request only returns students belonging to authenticated school (actual: ${crossTenantBulk.length})`
  );

  // --- Group 8: Invalid / Non-Existent IDs ---
  console.log("\n--- Group 8: Graceful Non-Existent ID Handling ---");
  const invalidCard = await getStudentIdCardData(school1Id, { studentId: "non-existent-uuid" });
  assert(invalidCard.length === 0, `Non-existent student ID returns empty array gracefully`);

  const emptySchool = await getStudentIdCardData("", { studentId: studentA.id });
  assert(emptySchool.length === 0, `Empty schoolId returns empty array gracefully`);

  // --- Group 9: URL Parameter Resolution Simulation ---
  console.log("\n--- Group 9: Frontend URL Parameter Resolution Compatibility ---");
  const resolveTargetStudent = (search: string) => {
    const params = new URLSearchParams(search);
    return params.get("studentId") || params.get("student") || params.get("id") || null;
  };

  assert(
    resolveTargetStudent("?student=stu_01_aarav") === "stu_01_aarav",
    `Resolves ?student= query parameter accurately`
  );
  assert(
    resolveTargetStudent("?studentId=stu_01_aarav") === "stu_01_aarav",
    `Resolves ?studentId= query parameter accurately`
  );
  assert(
    resolveTargetStudent("?id=stu_01_aarav") === "stu_01_aarav",
    `Resolves ?id= query parameter accurately`
  );

  const resolveBulkSelection = (search: string) => {
    const params = new URLSearchParams(search);
    const sel = params.get("selected") || params.get("studentIds");
    return sel ? sel.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
  };

  const parsedBulk = resolveBulkSelection("?selected=stu_01_aarav,stu_03_kabir");
  assert(
    parsedBulk?.length === 2 && parsedBulk[0] === "stu_01_aarav" && parsedBulk[1] === "stu_03_kabir",
    `Resolves ?selected= comma-separated bulk parameter accurately`
  );

  console.log("\n========================================================");
  console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
