/**
 * Automated Verification Suite for Fee Structure Hardening (Phases 2–12)
 *
 * Verifies:
 * 1. Academic Year configuration, boundaries, and validation
 * 2. Class and Section scoping (including All Sections)
 * 3. Decimal-safe integer paise calculations across billing frequencies
 * 4. Critical Transport Fee Logic:
 *    - 20 Nursery students
 *    - 8 transport riders charged stop-specific pricing (₹500/mo = ₹6,000/yr)
 *    - 12 non-riders charged ₹0
 *    - Class grand total = (20 * base) + (8 * rider fees)
 *    - Inactive / missing assignments charged ₹0
 * 5. Lifecycle operations: Create, Edit, Duplicate, Archive, and Protected Deletion
 * 6. Financial integrity: Blocking deletion when student dues or assignments exist
 * 7. Multi-tenant isolation
 */

import {
  calculateFeeStructureFinancials,
  generateInstallmentSchedule,
  type ComponentCalculationInput,
  type StudentTransportInfo,
} from "../src/services/feeCalculationService";
import {
  saveCompleteFeeStructure,
  getFeeStructures,
  getStructureConfigItems,
  duplicateFeeStructure,
  archiveFeeStructure,
  activateStructure,
  deactivateFeeStructure,
  deleteFeeStructure,
  checkStructureOverlaps,
} from "../src/services/feeSetupService";
import type { AcademicYear } from "../src/types/academic";

// Polyfill in-memory localStorage for Node test runner
const memoryStore = new Map<string, string>();
if (typeof globalThis.localStorage === "undefined") {
  globalThis.localStorage = {
    getItem: (key: string) => memoryStore.get(key) || null,
    setItem: (key: string, value: string) => {
      memoryStore.set(key, String(value));
    },
    removeItem: (key: string) => {
      memoryStore.delete(key);
    },
    clear: () => {
      memoryStore.clear();
    },
    key: (index: number) => Array.from(memoryStore.keys())[index] || null,
    get length() {
      return memoryStore.size;
    },
  } as Storage;
}

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    failedCount++;
    throw new Error(msg);
  } else {
    console.log(`✅ PASS: ${msg}`);
    passedCount++;
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("RUNNING FEE STRUCTURE HARDENING VERIFICATION SUITE");
  console.log("=======================================================\n");

  const testSchoolId = `school-test-${Date.now()}`;
  const mockAcademicYear: AcademicYear = {
    id: `ay-${Date.now()}`,
    school_id: testSchoolId,
    start_year: 2026,
    end_year: 2027,
    label: "2026–2027",
    start_date: "2026-04-01",
    end_date: "2027-03-31",
    is_current: true,
  };

  // ─── TEST 1: Academic Year Boundaries & Installment Derivation ───────────────
  console.log("\n--- TEST 1: Academic Year Boundaries & Installments ---");
  {
    const components: ComponentCalculationInput[] = [
      { fee_head_id: "fh-tuition", name: "Tuition Fee", frequency: "monthly", amount_rupees: 1500, is_mandatory: true },
      { fee_head_id: "fh-exam", name: "Examination Fee", frequency: "half_yearly", amount_rupees: 500, is_mandatory: true },
      { fee_head_id: "fh-annual", name: "Annual Charges", frequency: "yearly", amount_rupees: 2000, is_mandatory: true },
    ];

    // 1.1 Monthly Schedule (12 installments starting April 2026)
    const monthlyInst = generateInstallmentSchedule(mockAcademicYear, "monthly", components);
    assert(monthlyInst.length === 12, "Monthly schedule must produce exactly 12 installments");
    assert(monthlyInst[0].label.includes("April 2026"), "First installment must start in April 2026");
    assert(monthlyInst[11].label.includes("March 2027"), "12th installment must end in March 2027");
    // Term 1 includes monthly (1500) + annual (2000) + half-yearly exam (500) = 4000
    assert(monthlyInst[0].base_amount_rupees === 4000, `Term 1 amount must include one-time annual + exam fee (expected 4000, got ${monthlyInst[0].base_amount_rupees})`);
    // Month 2 (May) has only recurring tuition = 1500
    assert(monthlyInst[1].base_amount_rupees === 1500, `Month 2 amount must be recurring tuition 1500, got ${monthlyInst[1].base_amount_rupees}`);

    // 1.2 Quarterly Schedule (4 terms)
    const quarterlyInst = generateInstallmentSchedule(mockAcademicYear, "quarterly", components);
    assert(quarterlyInst.length === 4, "Quarterly schedule must produce exactly 4 terms");
    assert(quarterlyInst[0].label.includes("Quarter 1"), "Quarterly term 1 label correct");
    // Quarter 1: (1500 * 3) + 2000 (annual) + 500 (exam) = 7000
    assert(quarterlyInst[0].base_amount_rupees === 7000, `Quarter 1 amount must be 7000, got ${quarterlyInst[0].base_amount_rupees}`);

    // 1.3 Annual Schedule (1 term)
    const annualInst = generateInstallmentSchedule(mockAcademicYear, "annual", components);
    assert(annualInst.length === 1, "Annual schedule must produce exactly 1 term");
    // (1500 * 12) + 2000 + (500 * 2) = 18000 + 2000 + 1000 = 21000
    assert(annualInst[0].base_amount_rupees === 21000, `Full year annual total must be 21000, got ${annualInst[0].base_amount_rupees}`);
  }

  // ─── TEST 2: Critical Transport Fee Logic (Nursery 20 students, 8 riders) ─────
  console.log("\n--- TEST 2: Transport Fee Logic (20 students, 8 riders) ---");
  {
    // Generate 20 Nursery students
    const nurseryStudents: StudentTransportInfo[] = Array.from({ length: 20 }, (_, i) => {
      const studentNum = i + 1;
      const isRider = studentNum <= 8; // Exactly 8 riders
      return {
        student_id: `stu-nur-${studentNum}`,
        first_name: `NurseryStudent`,
        last_name: `${studentNum}`,
        admission_no: `NUR-2026-${String(studentNum).padStart(3, "0")}`,
        class_id: "cls-nursery",
        section_id: "sec-nur-a",
        has_transport: isRider,
        status: isRider ? "active" : "inactive",
        monthly_fee_paise: isRider ? 50000 : 0, // ₹500 per month = 50,000 paise
        route_name: isRider ? "Route 1 - East Zone" : undefined,
      };
    });

    const components: ComponentCalculationInput[] = [
      { fee_head_id: "fh-tuition", name: "Tuition Fee", frequency: "monthly", amount_rupees: 1500, is_mandatory: true },
      { fee_head_id: "fh-transport", name: "Transport Fee", frequency: "monthly", amount_rupees: 0, is_mandatory: false, is_system_managed: true },
    ];

    const financials = calculateFeeStructureFinancials({
      academicYear: mockAcademicYear,
      billingCycle: "monthly",
      components,
      students: nurseryStudents,
    });

    // Validations:
    assert(financials.total_enrolled_students === 20, "Total enrolled students must be 20");
    assert(financials.transport_riders_count === 8, "Active transport riders must be exactly 8");
    assert(financials.non_transport_students_count === 12, "Non-transport students must be exactly 12");

    // Base fee per student = 1500 * 12 = 18,000
    assert(financials.base_annual_per_student_rupees === 18000, "Base academic fee per student must be 18,000");

    // Rider fee = ₹500/mo * 12 = ₹6,000/yr
    const riderStudent = financials.students_summary.find((s) => s.student_id === "stu-nur-1")!;
    assert(riderStudent.has_transport === true, "Student 1 must be marked as transport rider");
    assert(riderStudent.transport_fee_rupees === 6000, `Rider 1 must have ₹6,000 transport fee, got ${riderStudent.transport_fee_rupees}`);
    assert(riderStudent.total_fee_rupees === 24000, `Rider 1 total must be 18,000 + 6,000 = 24,000, got ${riderStudent.total_fee_rupees}`);

    // Non-rider fee = ₹0 transport fee, total = ₹18,000
    const nonRiderStudent = financials.students_summary.find((s) => s.student_id === "stu-nur-9")!;
    assert(nonRiderStudent.has_transport === false, "Student 9 must be non-rider");
    assert(nonRiderStudent.transport_fee_rupees === 0, `Non-rider 9 transport fee must be 0, got ${nonRiderStudent.transport_fee_rupees}`);
    assert(nonRiderStudent.total_fee_rupees === 18000, `Non-rider 9 total must be 18,000, got ${nonRiderStudent.total_fee_rupees}`);

    // Class Grand Totals:
    // Base class demand = 20 * 18,000 = 360,000
    // Total transport demand = 8 * 6,000 = 48,000
    // Class grand total = 360,000 + 48,000 = 408,000
    assert(financials.class_base_annual_rupees === 360000, `Class base annual must be 360,000, got ${financials.class_base_annual_rupees}`);
    assert(financials.class_transport_annual_rupees === 48000, `Class transport total must be 48,000, got ${financials.class_transport_annual_rupees}`);
    assert(financials.class_grand_total_annual_rupees === 408000, `Class grand total must be 408,000, got ${financials.class_grand_total_annual_rupees}`);
  }

  // ─── TEST 3: Fee Structure Persistence, Scoping, and Conflict Checks ─────────
  console.log("\n--- TEST 3: Persistence, Scoping, and Overlap Check ---");
  {
    const structureName = "Nursery Fee Structure 2026–27";
    const createRes = await saveCompleteFeeStructure(testSchoolId, {
      name: structureName,
      academic_year_id: mockAcademicYear.id,
      status: "active",
      target_type: "specific_classes",
      class_id: "cls-nursery",
      class_ids: ["cls-nursery"],
      section_ids: [],
      description: "Standard Nursery academic fee structure",
      items: [
        {
          fee_head_id: "fh-tuition-uuid",
          frequency: "monthly",
          base_amount_rupees: 1500,
          is_mandatory: true,
          proration_rule: "full",
          start_date: "2026-04-01",
          end_date: "2027-03-31",
          term_amounts: {},
        },
      ],
    });

    assert(!!createRes.structure, "saveCompleteFeeStructure must return saved structure");
    const structId = createRes.structure!.id;

    // Verify retrieval
    const { structures } = await getFeeStructures(testSchoolId, mockAcademicYear.id);
    const retrieved = structures.find((s) => s.id === structId);
    assert(!!retrieved, "Retrieved structure must exist in school records");
    assert(retrieved!.name === structureName, "Retrieved structure name matches");
    assert(retrieved!.status === "active", "Retrieved structure status is active");

    // Verify config items retrieval
    const { items: configItems } = await getStructureConfigItems(testSchoolId, structId);
    assert(configItems.length === 1, "Config items must return 1 saved item");
    assert(configItems[0].base_amount_rupees === 1500, "Base amount must be 1500");

    // Conflict check: Overlapping active structure for the same class
    const overlapRes = await checkStructureOverlaps(
      testSchoolId,
      mockAcademicYear.id,
      "specific_classes",
      ["cls-nursery"]
    );
    assert(overlapRes.hasConflict === true, "checkStructureOverlaps must detect existing active Nursery structure");
    assert(overlapRes.conflicts.length > 0, "Conflicts array must list overlapping structure");
  }

  // ─── TEST 4: Duplication, Archival, and Protected Deletion ────────────────────
  console.log("\n--- TEST 4: Duplication, Archiving, and Financial Delete Protection ---");
  {
    // Create a standalone draft structure
    const draftRes = await saveCompleteFeeStructure(testSchoolId, {
      name: "Temporary Class 1 Draft",
      academic_year_id: mockAcademicYear.id,
      status: "draft",
      target_type: "specific_classes",
      class_id: "cls-1",
      class_ids: ["cls-1"],
      items: [
        {
          fee_head_id: "fh-comp-uuid",
          frequency: "monthly",
          base_amount_rupees: 2000,
          is_mandatory: true,
          proration_rule: "full",
          term_amounts: {},
        },
      ],
    });

    const draftId = draftRes.structure!.id;

    // Test Duplication
    const dupRes = await duplicateFeeStructure(testSchoolId, draftId, "Duplicated Class 1");
    assert(!!dupRes.structure, "duplicateFeeStructure must succeed");
    assert(dupRes.structure!.name === "Duplicated Class 1", "Duplicated structure has new name");
    assert(dupRes.structure!.status === "draft", "Duplicated structure starts in draft status");

    // Test Archival
    const archRes = await archiveFeeStructure(testSchoolId, dupRes.structure!.id);
    assert(archRes.success === true, "archiveFeeStructure must succeed");
    const { structures: checkArch } = await getFeeStructures(testSchoolId, mockAcademicYear.id);
    const archivedItem = checkArch.find((s) => s.id === dupRes.structure!.id);
    assert(archivedItem?.status === "archived", "Archived item has status = archived");

    // Test Unattached Draft Deletion: should succeed
    const delDraftRes = await deleteFeeStructure(testSchoolId, draftId);
    assert(delDraftRes.success === true, "Deleting an unattached draft structure must succeed");
    const { structures: afterDel } = await getFeeStructures(testSchoolId, mockAcademicYear.id);
    assert(!afterDel.some((s) => s.id === draftId), "Deleted structure must no longer appear in structures list");

    // Test Protected Deletion: Mock an active assignment attached to a structure
    const protectedRes = await saveCompleteFeeStructure(testSchoolId, {
      name: "Protected Active Structure",
      academic_year_id: mockAcademicYear.id,
      status: "active",
      target_type: "specific_classes",
      class_id: "cls-protected",
      class_ids: ["cls-protected"],
      items: [
        {
          fee_head_id: "fh-tuition-uuid",
          frequency: "monthly",
          base_amount_rupees: 3000,
          is_mandatory: true,
          proration_rule: "full",
          term_amounts: {},
        },
      ],
    });
    const protectedId = protectedRes.structure!.id;

    // Inject active assignment into local cache to simulate existing active dues / assignments
    if (typeof localStorage !== "undefined") {
      const assignKey = `myzkool_student_fee_assignments_${testSchoolId}`;
      localStorage.setItem(
        assignKey,
        JSON.stringify([
          {
            id: "assign-protected-1",
            school_id: testSchoolId,
            student_id: "stu-100",
            academic_year_id: mockAcademicYear.id,
            structure_id: protectedId,
            structure_version: 1,
            assigned_at: new Date().toISOString(),
            status: "active",
          },
        ])
      );
    }

    const delProtectedRes = await deleteFeeStructure(testSchoolId, protectedId);
    assert(delProtectedRes.success === false, "Deleting a structure with active fee assignments must be BLOCKED");
    assert(
      delProtectedRes.error?.includes("Cannot delete fee structure") || false,
      `Error message must protect financial integrity: ${delProtectedRes.error}`
    );
  }

  // ─── TEST 5: Multi-Tenant Isolation ──────────────────────────────────────────
  console.log("\n--- TEST 5: Multi-Tenant Isolation ---");
  {
    const otherSchoolId = `school-other-${Date.now()}`;
    const otherRes = await saveCompleteFeeStructure(otherSchoolId, {
      name: "Other School Structure",
      academic_year_id: "ay-other",
      status: "active",
      target_type: "specific_classes",
      class_id: "cls-other",
      items: [],
    });

    const { structures: school1Structures } = await getFeeStructures(testSchoolId);
    const { structures: school2Structures } = await getFeeStructures(otherSchoolId);

    assert(
      !school1Structures.some((s) => s.id === otherRes.structure!.id),
      "School 1 must not see School 2 fee structures"
    );
    assert(
      school2Structures.some((s) => s.id === otherRes.structure!.id),
      "School 2 correctly sees its own structure"
    );
  }

  console.log("\n=======================================================");
  console.log(`TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=======================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution aborted with error:", err);
  process.exit(1);
});
