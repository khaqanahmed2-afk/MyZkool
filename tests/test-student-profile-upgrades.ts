import assert from "node:assert";
import {
  linkStudentSibling,
  unlinkStudentSibling,
  getStudentSiblings,
  searchStudentsForSibling,
  getStudentActivityTimeline,
} from "../src/services/studentService";

// Mock localStorage for node environment
const store = new Map<string, string>();
(global as any).localStorage = {
  getItem: (key: string) => store.get(key) || null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
};

async function runTests() {
  console.log("==========================================================");
  console.log("STUDENT PROFILE UPGRADES: SIBLINGS & TIMELINE TESTS");
  console.log("==========================================================");

  const schoolId = "test-school-1";
  const student1Id = "student-101";
  const student2Id = "student-102";
  const student3Id = "student-103";

  // Seed sample students in local storage
  const students = [
    {
      id: student1Id,
      school_id: schoolId,
      first_name: "Khaqan",
      last_name: "Ahmad",
      admission_no: "APT-2026-0001",
      status: "enrolled",
      phone: "9512747273",
      deleted_at: null,
    },
    {
      id: student2Id,
      school_id: schoolId,
      first_name: "Zidan",
      last_name: "Ahmad",
      admission_no: "APT-2026-0002",
      status: "enrolled",
      phone: "9512747273",
      deleted_at: null,
    },
    {
      id: student3Id,
      school_id: schoolId,
      first_name: "Aarav",
      last_name: "Sharma",
      admission_no: "APT-2026-0003",
      status: "enrolled",
      phone: "9876543210",
      deleted_at: null,
    },
  ];

  localStorage.setItem(`myzkool_students_${schoolId}`, JSON.stringify(students));
  localStorage.setItem(`myzkool_student_parents_${schoolId}`, JSON.stringify([]));
  localStorage.setItem(`myzkool_parents_${schoolId}`, JSON.stringify([]));

  console.log("\n1. Sibling Linking & Validation:");
  // Cannot link student to themselves
  const selfLink = await linkStudentSibling(schoolId, student1Id, student1Id);
  assert.strictEqual(selfLink.success, false, "Self linking should fail");
  console.log("  ✓ PASS: Self linking prevented");

  // Link Student 1 and Student 2 as siblings
  const linkRes = await linkStudentSibling(schoolId, student1Id, student2Id);
  assert.strictEqual(linkRes.success, true, "Linking should succeed");
  console.log("  ✓ PASS: Successfully linked Student 1 and Student 2");

  // Verify Student 1 detects Student 2 as sibling
  const sibs1 = await getStudentSiblings(schoolId, student1Id);
  assert.strictEqual(sibs1.siblings?.length, 1, "Student 1 should have 1 sibling");
  assert.strictEqual(sibs1.siblings?.[0].sibling_id, student2Id, "Sibling should be Student 2");
  assert.strictEqual(sibs1.siblings?.[0].sibling_first_name, "Zidan");
  console.log("  ✓ PASS: Student 1 has linked sibling Zidan Ahmad");

  // Verify Student 2 detects Student 1 as sibling
  const sibs2 = await getStudentSiblings(schoolId, student2Id);
  assert.strictEqual(sibs2.siblings?.length, 1, "Student 2 should have 1 sibling");
  assert.strictEqual(sibs2.siblings?.[0].sibling_id, student1Id, "Sibling should be Student 1");
  console.log("  ✓ PASS: Sibling connection is reciprocal (Student 2 has Student 1)");

  console.log("\n2. Sibling Search:");
  // Search for sibling candidates
  const searchRes = await searchStudentsForSibling(schoolId, student1Id, "sharma");
  assert.strictEqual(searchRes.students.length, 1, "Search should return 1 match");
  assert.strictEqual(searchRes.students[0].id, student3Id);
  console.log("  ✓ PASS: Search finds candidate Aarav Sharma");

  // Search prevents selecting self
  const searchSelf = await searchStudentsForSibling(schoolId, student1Id, "khaqan");
  assert.strictEqual(searchSelf.students.length, 0, "Self should not appear in sibling search");
  console.log("  ✓ PASS: Current student excluded from sibling search");

  console.log("\n3. Sibling Unlinking:");
  const unlinkRes = await unlinkStudentSibling(schoolId, student1Id, student2Id);
  assert.strictEqual(unlinkRes.success, true, "Unlinking should succeed");
  const sibsAfter = await getStudentSiblings(schoolId, student1Id);
  assert.strictEqual(sibsAfter.siblings?.length, 0, "Student 1 should now have 0 siblings");
  console.log("  ✓ PASS: Successfully unlinked sibling");

  console.log("\n4. Activity Timeline Aggregation:");
  // Seed sample receipts and events
  localStorage.setItem(
    `myzkool_fee_receipts_${schoolId}`,
    JSON.stringify([
      {
        id: "rec-1",
        student_id: student1Id,
        school_id: schoolId,
        receipt_no: "REC-2026-0001",
        receipt_date: "2026-05-10",
        total_amount_paise: 1500000,
        payment_mode: "upi",
        status: "completed",
        created_at: "2026-05-10T11:00:00Z",
      },
    ])
  );
  localStorage.setItem(
    `myzkool_student_events_${schoolId}`,
    JSON.stringify([
      {
        id: "ev-1",
        student_id: student1Id,
        school_id: schoolId,
        kind: "admitted",
        summary: "Admitted to school",
        created_at: "2026-04-01T09:00:00Z",
      },
    ])
  );

  const timeline = await getStudentActivityTimeline(schoolId, student1Id);
  assert.strictEqual(timeline.length, 2, "Timeline should aggregate receipts and events");
  assert.strictEqual(timeline[0].category, "fee_payment", "Newest should be fee payment");
  assert.strictEqual(timeline[0].financial?.receiptNo, "REC-2026-0001");
  assert.strictEqual(timeline[0].financial?.amountFormatted, "₹15,000");
  assert.strictEqual(timeline[1].category, "admission", "Oldest should be admission");
  console.log("  ✓ PASS: Activity timeline aggregates chronological payments and events");

  console.log("\n----------------------------------------------------------");
  console.log("ALL STUDENT PROFILE UPGRADE TESTS PASSED!");
  console.log("----------------------------------------------------------");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});

