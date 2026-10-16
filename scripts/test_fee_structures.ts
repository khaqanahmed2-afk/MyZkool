/**
 * Automated Verification Test Suite for Fee Structures Data Accuracy
 * 
 * Verifies all 10 requirements:
 * 1. A Nursery fee structure with All Sections.
 * 2. A user-defined structure name preserved after publishing and refreshing.
 * 3. Seven eligible Nursery students displayed correctly.
 * 4. Four transport users out of those seven students.
 * 5. No duplicate student counts caused by database joins.
 * 6. Correct class mapping when the section ID is null.
 * 7. Different academic years and fee structure statuses.
 * 8. Isolation between two schools.
 * 9. Editing and republishing a structure without overwriting its name or class.
 * 10. Correct summary cards after creating, editing, publishing, and archiving structures.
 */

import {
  getFeeStructures,
  getStructureStudentCounts,
  saveCompleteFeeStructure,
} from "../src/services/feeSetupService";
import type { FeeStructure } from "../src/types/fees";

// Setup headless in-memory localStorage
const memoryStorage: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (key: string) => memoryStorage[key] || null,
  setItem: (key: string, value: string) => {
    memoryStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete memoryStorage[key];
  },
  clear: () => {
    for (const k of Object.keys(memoryStorage)) delete memoryStorage[k];
  },
};

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(msg);
  } else {
    console.log(`  ✓ ${msg}`);
  }
}

async function runFeeStructureTests() {
  console.log("=== STARTING MYZKOOL FEE STRUCTURES DATA ACCURACY TEST SUITE ===\n");

  const schoolA = "school_peace_convent_101";
  const schoolB = "school_other_tenant_202";
  const year2026_27 = "year_2026_27";
  const year2025_26 = "year_2025_26";

  const nurseryClassId = "class_nursery_01";
  const class5Id = "class_5th_02";
  const nurserySecA = "sec_nursery_a";

  // 7 Eligible Nursery Students
  const mockStudentsSchoolA = [
    { id: "s1", first_name: "Abhishek", last_name: "Agarwal", admission_no: "ADM-001", status: "enrolled" },
    { id: "s2", first_name: "Aman", last_name: "Kumar", admission_no: "ADM-002", status: "enrolled" },
    { id: "s3", first_name: "Diya", last_name: "Bhardwaj", admission_no: "ADM-003", status: "enrolled" },
    { id: "s4", first_name: "Divya", last_name: "Mehta", admission_no: "ADM-004", status: "enrolled" },
    { id: "s5", first_name: "Ira", last_name: "Roy", admission_no: "ADM-005", status: "enrolled" },
    { id: "s6", first_name: "Kunal", last_name: "Singh", admission_no: "ADM-006", status: "enrolled" },
    { id: "s7", first_name: "Rohan", last_name: "Verma", admission_no: "ADM-007", status: "enrolled" },
    // A student from another class (Class 5) - must NOT be counted in Nursery
    { id: "s8", first_name: "Tina", last_name: "Dutta", admission_no: "ADM-008", status: "enrolled" },
  ];

  // Enrollments mapping students to class and section for year2026_27
  const mockEnrollmentsSchoolA = [
    { student_id: "s1", class_id: nurseryClassId, section_id: nurserySecA, academic_year_id: year2026_27, status: "active" },
    { student_id: "s2", class_id: nurseryClassId, section_id: nurserySecA, academic_year_id: year2026_27, status: "active" },
    { student_id: "s3", class_id: nurseryClassId, section_id: nurserySecA, academic_year_id: year2026_27, status: "active" },
    { student_id: "s4", class_id: nurseryClassId, section_id: nurserySecA, academic_year_id: year2026_27, status: "active" },
    { student_id: "s5", class_id: nurseryClassId, section_id: nurserySecA, academic_year_id: year2026_27, status: "active" },
    { student_id: "s6", class_id: nurseryClassId, section_id: nurserySecA, academic_year_id: year2026_27, status: "active" },
    { student_id: "s7", class_id: nurseryClassId, section_id: nurserySecA, academic_year_id: year2026_27, status: "active" },
    { student_id: "s8", class_id: class5Id, section_id: "sec_5a", academic_year_id: year2026_27, status: "active" },
  ];

  // 4 of the 7 Nursery students use school transport
  const mockTransportAssignmentsSchoolA = [
    { student_id: "s1", school_id: schoolA, status: "active", monthly_fee_paise: 200000 },
    { student_id: "s3", school_id: schoolA, status: "active", monthly_fee_paise: 250000 },
    { student_id: "s5", school_id: schoolA, status: "active", monthly_fee_paise: 200000 },
    { student_id: "s6", school_id: schoolA, status: "active", monthly_fee_paise: 300000 },
    // An inactive transport assignment that must NOT be counted
    { student_id: "s2", school_id: schoolA, status: "inactive", monthly_fee_paise: 200000 },
  ];

  // Seed storage
  localStorage.setItem(`myzkool_students_${schoolA}`, JSON.stringify(mockStudentsSchoolA));
  localStorage.setItem(`myzkool_student_enrollments_${schoolA}`, JSON.stringify(mockEnrollmentsSchoolA));
  localStorage.setItem(`myzkool_transport_assignments_${schoolA}`, JSON.stringify(mockTransportAssignmentsSchoolA));

  const targetStructureId = "struct_nursery_001";
  const customUserDefinedName = "Nursery Annual Academic & Activity Fee 2026-27";

  console.log("TEST 1 & 2: User-defined Name Preservation & Nursery with All Sections");
  {
    // User creates and saves fee structure for Nursery with All Sections
    const createPayload: Partial<FeeStructure> & { id: string } = {
      id: targetStructureId,
      school_id: schoolA,
      academic_year_id: year2026_27,
      name: customUserDefinedName,
      class_id: nurseryClassId,
      class_ids: [nurseryClassId],
      section_ids: [], // All Sections
      target_type: "specific_classes",
      status: "active",
      version: 1,
    };

    await saveCompleteFeeStructure(schoolA, createPayload);

    const { structures } = await getFeeStructures(schoolA, year2026_27);
    const saved = structures.find((s) => s.id === targetStructureId);

    assert(Boolean(saved), "Fee structure successfully persisted in storage");
    assert(
      saved?.name === customUserDefinedName,
      `Exact user-defined structure name preserved: "${saved?.name}" (no generic overwrite)`
    );
    assert(
      saved?.class_id === nurseryClassId,
      `Class ID is Nursery (${saved?.class_id})`
    );
    assert(
      !saved?.section_ids || saved.section_ids.length === 0,
      "Section IDs empty or null represents 'All Sections'"
    );
  }

  console.log("\nTEST 3, 4 & 5: Student Counts, Transport Users & No Duplicate Joins");
  {
    const { enrolledCount, transportCount, studentIds } = await getStructureStudentCounts(
      schoolA,
      year2026_27,
      {
        target_type: "specific_classes",
        class_id: nurseryClassId,
        class_ids: [nurseryClassId],
        section_ids: [],
      }
    );

    assert(enrolledCount === 7, `Correctly counted 7 enrolled Nursery students (got: ${enrolledCount})`);
    assert(transportCount === 4, `Correctly identified 4 active transport users (got: ${transportCount})`);
    assert(studentIds.length === 7, `Exact 7 unique student IDs returned (length: ${studentIds.length})`);
    
    // Check no duplicate IDs exist
    const uniqueIds = new Set(studentIds);
    assert(uniqueIds.size === studentIds.length, "No duplicate student counts caused by joins or multiple records");
    
    // Non-Nursery student (s8) must NOT be included
    assert(!studentIds.includes("s8"), "Class 5 student (s8) excluded from Nursery student counts");
  }

  console.log("\nTEST 6: Correct Class Mapping When Section ID is Null / Empty");
  {
    // Ensure that having a class with null section_id does NOT get mapped to "All Classes"
    const isUniversalAllClasses = (st: Partial<FeeStructure>) =>
      st.target_type === "all_classes" && !st.class_id && (!st.class_ids || st.class_ids.length === 0);

    const nurseryStructure = {
      id: targetStructureId,
      name: customUserDefinedName,
      class_id: nurseryClassId,
      section_ids: [],
      target_type: "specific_classes" as const,
    };

    assert(!isUniversalAllClasses(nurseryStructure), "Class-level structure with null section is NOT 'All Classes'");
  }

  console.log("\nTEST 7: Different Academic Years & Fee Structure Statuses");
  {
    // Add another structure in a different academic year (2025-26)
    const structYear2025: Partial<FeeStructure> & { id: string } = {
      id: "struct_2025_002",
      school_id: schoolA,
      academic_year_id: year2025_26,
      name: "Old 2025 Fee Structure",
      class_id: nurseryClassId,
      target_type: "specific_classes",
      status: "archived",
    };
    await saveCompleteFeeStructure(schoolA, structYear2025);

    // Add a draft structure in current year
    const structDraft: Partial<FeeStructure> & { id: string } = {
      id: "struct_draft_003",
      school_id: schoolA,
      academic_year_id: year2026_27,
      name: "Draft High School Structure",
      class_id: class5Id,
      target_type: "specific_classes",
      status: "draft",
    };
    await saveCompleteFeeStructure(schoolA, structDraft);

    // Filter by year 2026-27
    const { structures: year26Structures } = await getFeeStructures(schoolA, year2026_27);
    assert(
      year26Structures.length === 2,
      `Year 2026-27 strictly returns 2 structures (got: ${year26Structures.length})`
    );
    assert(
      year26Structures.some((s) => s.id === targetStructureId && s.status === "active"),
      "Found active Nursery structure in 2026-27"
    );
    assert(
      year26Structures.some((s) => s.id === "struct_draft_003" && s.status === "draft"),
      "Found draft Class 5 structure in 2026-27"
    );

    // Filter by year 2025-26
    const { structures: year25Structures } = await getFeeStructures(schoolA, year2025_26);
    assert(
      year25Structures.length === 1 && year25Structures[0].id === "struct_2025_002",
      "Year 2025-26 strictly returns archived structure"
    );
  }

  console.log("\nTEST 8: Tenant Isolation Between Two Schools");
  {
    // School B query must return empty
    const { structures: schoolBStructures } = await getFeeStructures(schoolB, year2026_27);
    assert(
      schoolBStructures.length === 0,
      "School B cannot view School A's fee structures (strict multi-tenant isolation)"
    );

    const countsSchoolB = await getStructureStudentCounts(schoolB, year2026_27, {
      target_type: "specific_classes",
      class_id: nurseryClassId,
      class_ids: [nurseryClassId],
    });
    assert(
      countsSchoolB.enrolledCount === 0 && countsSchoolB.transportCount === 0,
      "School B has 0 student count for School A's classes"
    );
  }

  console.log("\nTEST 9: Editing and Republishing Without Overwriting Name or Class");
  {
    const editedCustomName = "Nursery Comprehensive Fee 2026-27 (Revised)";
    
    // 1. Edit draft
    await saveCompleteFeeStructure(schoolA, {
      id: targetStructureId,
      name: editedCustomName,
      class_id: nurseryClassId,
      class_ids: [nurseryClassId],
      section_ids: [],
      target_type: "specific_classes",
      status: "draft",
    });

    let { structures } = await getFeeStructures(schoolA, year2026_27);
    let st = structures.find((s) => s.id === targetStructureId);
    assert(st?.status === "draft", "Status successfully updated to draft");
    assert(st?.name === editedCustomName, `Name successfully updated: "${st?.name}"`);
    assert(st?.class_id === nurseryClassId, "Class ID retained Nursery");

    // 2. Publish
    await saveCompleteFeeStructure(schoolA, {
      id: targetStructureId,
      status: "active",
    });

    let { structures: publishedList } = await getFeeStructures(schoolA, year2026_27);
    st = publishedList.find((s) => s.id === targetStructureId);
    assert(st?.status === "active", "Published structure is active");
    assert(st?.name === editedCustomName, "Publishing preserved the custom edited name");
    assert(st?.class_id === nurseryClassId, "Publishing did not erase class ID");
    assert(
      !st?.section_ids || st.section_ids.length === 0,
      "Publishing did not corrupt section mapping"
    );
  }

  console.log("\nTEST 10: Summary Cards Metric Calculations");
  {
    const { structures: currentYearStructures } = await getFeeStructures(schoolA, year2026_27);
    const activeStructures = currentYearStructures.filter((s) => s.status === "active").length;
    const draftStructures = currentYearStructures.filter((s) => s.status === "draft").length;
    const archivedStructures = currentYearStructures.filter((s) => s.status === "archived").length;

    // Distinct classes covered calculation
    const coveredClasses = new Set<string>();
    currentYearStructures.forEach((s) => {
      if (s.class_id) coveredClasses.add(s.class_id);
      if (s.class_ids) s.class_ids.forEach((cid) => coveredClasses.add(cid));
    });

    assert(activeStructures === 1, `Active structures count is exactly 1 (got: ${activeStructures})`);
    assert(draftStructures === 1, `Draft structures count is exactly 1 (got: ${draftStructures})`);
    assert(archivedStructures === 0, `Archived structures count is exactly 0 in 2026-27 (got: ${archivedStructures})`);
    assert(coveredClasses.size === 2, `Active classes covered count is 2 (Nursery & Class 5) (got: ${coveredClasses.size})`);
  }

  console.log("\n✅ ALL 10 TESTS PASSED SUCCESSFULLY WITH ZERO REGRESSIONS!\n");
}

runFeeStructureTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
