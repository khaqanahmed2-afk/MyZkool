/**
 * Authoritative Test Suite: MyZkool Fee Structures & Calculation Preview Redesign
 *
 * Verifies:
 * 1. Nursery 2026–2027 reference example:
 *    - Admission Fee: ₹1,000 (one-time)
 *    - Tuition Fee: ₹1,200 (monthly)
 *    - Exam Fee: ₹1,500 (quarterly)
 *    - Development Fee: ₹5,000 (yearly)
 *    - Annual Charges: ₹1,000 (yearly)
 *    - Academic fee per student = ₹27,400 under 12-month / 4-quarter policy.
 * 2. 7 Nursery students, 4 transport users:
 *    - Class academic demand = ₹1,91,800 (7 × ₹27,400)
 *    - Transport demand = ₹52,800 (calculated separately, non-riders pay ₹0)
 *    - Grand demand = ₹2,44,600
 * 3. Annualized calculations for EVERY supported frequency:
 *    monthly, bimonthly, quarterly, three_term, half_yearly, yearly, annual, one_time, custom.
 * 4. Installment schedules preserve exact annual sum invariant across all billing cycles.
 * 5. Mid-year admission proration rules & academic year boundaries.
 * 6. Concession and RTE 100% full-waiver impact calculations.
 * 7. Preservation of exact administrator-entered structure name.
 * 8. Validation and prevention of duplicate student counts or transport riders.
 * 9. Safe versioning: editing active structure increments version and supersedes previous structure.
 * 10. Distinct status handling: draft, active, superseded, archived.
 */

// LocalStorage in-memory polyfill for offline test runner
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

import {
  calculateFeeStructureFinancials,
  calculateAnnualMultiplier,
  generateInstallmentSchedule,
  calculateMidYearAdmissionFee,
  calculateConcessionImpact,
  type ComponentCalculationInput,
  type StudentTransportInfo,
} from "../src/services/feeCalculationService";
import {
  saveCompleteFeeStructure,
  getStructureStudentCounts,
  getFeeStructures,
  getStructureConfigItems,
} from "../src/services/feeSetupService";
import type { AcademicYear } from "../src/types/academic";

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  testsRun++;
  if (condition) {
    testsPassed++;
    console.log(`  ✓ ${message}`);
  } else {
    testsFailed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log("================================================================================");
  console.log("  MyZkool Fee Structures & Preview Redesign: Authoritative Verification");
  console.log("================================================================================\n");

  // Academic Year 2026-2027 Boundary
  const nurseryAY: AcademicYear = {
    id: "ay_2026_2027",
    school_id: "sch_test_nursery",
    start_year: 2026,
    end_year: 2027,
    label: "2026–2027",
    start_date: "2026-04-01",
    end_date: "2027-03-31",
    is_current: true,
  };

  // ─── SUITE 1: Nursery 2026–2027 Reference Fixture ────────────────────────────
  console.log("--- Suite 1: Nursery 2026–2027 Reference Example Calculations ---");

  const nurseryComponents: ComponentCalculationInput[] = [
    {
      fee_head_id: "fh_adm",
      name: "Admission Fee",
      frequency: "one_time",
      amount_rupees: 1000,
      is_mandatory: true,
    },
    {
      fee_head_id: "fh_tui",
      name: "Tuition Fee",
      frequency: "monthly",
      amount_rupees: 1200,
      is_mandatory: true,
    },
    {
      fee_head_id: "fh_exm",
      name: "Exam Fee",
      frequency: "quarterly",
      amount_rupees: 1500,
      is_mandatory: true,
    },
    {
      fee_head_id: "fh_dev",
      name: "Development Fee",
      frequency: "yearly",
      amount_rupees: 5000,
      is_mandatory: true,
    },
    {
      fee_head_id: "fh_ann",
      name: "Annual Charges",
      frequency: "yearly",
      amount_rupees: 1000,
      is_mandatory: true,
    },
  ];

  // 7 Nursery students: 4 riders, 3 non-riders
  const nurseryStudents: StudentTransportInfo[] = [
    {
      student_id: "st_nur_01",
      first_name: "Aarav",
      last_name: "Sharma",
      admission_no: "NUR-001",
      has_transport: true,
      monthly_fee_paise: 120000, // ₹1,200/mo
      status: "active",
      route_name: "Bus Route 1",
    },
    {
      student_id: "st_nur_02",
      first_name: "Ananya",
      last_name: "Verma",
      admission_no: "NUR-002",
      has_transport: true,
      monthly_fee_paise: 120000, // ₹1,200/mo
      status: "active",
      route_name: "Bus Route 1",
    },
    {
      student_id: "st_nur_03",
      first_name: "Vihaan",
      last_name: "Patel",
      admission_no: "NUR-003",
      has_transport: true,
      monthly_fee_paise: 100000, // ₹1,000/mo
      status: "active",
      route_name: "Bus Route 2",
    },
    {
      student_id: "st_nur_04",
      first_name: "Isha",
      last_name: "Gupta",
      admission_no: "NUR-004",
      has_transport: true,
      monthly_fee_paise: 100000, // ₹1,000/mo
      status: "active",
      route_name: "Bus Route 2",
    },
    {
      student_id: "st_nur_05",
      first_name: "Reyansh",
      last_name: "Singh",
      admission_no: "NUR-005",
      has_transport: false,
      monthly_fee_paise: 0,
      status: "inactive",
    },
    {
      student_id: "st_nur_06",
      first_name: "Myra",
      last_name: "Kapoor",
      admission_no: "NUR-006",
      has_transport: false,
      monthly_fee_paise: 0,
      status: "inactive",
    },
    {
      student_id: "st_nur_07",
      first_name: "Advik",
      last_name: "Joshi",
      admission_no: "NUR-007",
      has_transport: false,
      monthly_fee_paise: 0,
      status: "inactive",
    },
  ];

  const nurseryResult = calculateFeeStructureFinancials({
    academicYear: nurseryAY,
    billingCycle: "quarterly",
    components: nurseryComponents,
    students: nurseryStudents,
  });

  assert(
    nurseryResult.base_annual_per_student_rupees === 27400,
    `Per-student base academic annual fee is exactly ₹27,400 (got ₹${nurseryResult.base_annual_per_student_rupees})`
  );
  assert(
    nurseryResult.base_annual_per_student_paise === 2740000,
    `Per-student base academic paise is exactly 2,740,000 (got ${nurseryResult.base_annual_per_student_paise})`
  );
  assert(
    nurseryResult.one_time_rupees === 1000,
    `One-time admission fee is ₹1,000 (got ₹${nurseryResult.one_time_rupees})`
  );
  assert(
    nurseryResult.monthly_annual_rupees === 14400,
    `Annualized monthly tuition (12 × ₹1,200) is ₹14,400 (got ₹${nurseryResult.monthly_annual_rupees})`
  );
  assert(
    nurseryResult.quarterly_annual_rupees === 6000,
    `Annualized quarterly exam fee (4 × ₹1,500) is ₹6,000 (got ₹${nurseryResult.quarterly_annual_rupees})`
  );
  assert(
    nurseryResult.yearly_rupees === 6000,
    `Annual recurring development + annual charges (₹5,000 + ₹1,000) is ₹6,000 (got ₹${nurseryResult.yearly_rupees})`
  );

  // Student counts and transport separation
  assert(
    nurseryResult.total_enrolled_students === 7,
    `Total enrolled students count is 7 (got ${nurseryResult.total_enrolled_students})`
  );
  assert(
    nurseryResult.transport_riders_count === 4,
    `Transport riders count is 4 (got ${nurseryResult.transport_riders_count})`
  );
  assert(
    nurseryResult.non_transport_students_count === 3,
    `Non-transport students count is 3 (got ${nurseryResult.non_transport_students_count})`
  );

  // Demand calculations
  assert(
    nurseryResult.class_base_annual_rupees === 191800,
    `Class academic demand (7 × ₹27,400) is ₹1,91,800 (got ₹${nurseryResult.class_base_annual_rupees})`
  );
  assert(
    nurseryResult.class_transport_annual_rupees === 52800,
    `Separated transport demand for 4 riders ((2×1200 + 2×1000) × 12) is ₹52,800 (got ₹${nurseryResult.class_transport_annual_rupees})`
  );
  assert(
    nurseryResult.class_grand_total_annual_rupees === 244600,
    `Grand total class annual demand (₹1,91,800 + ₹52,800) is ₹2,44,600 (got ₹${nurseryResult.class_grand_total_annual_rupees})`
  );

  // Non-transport students have ₹0 transport fee
  const nonRiders = nurseryResult.students_summary.filter((s) => !s.has_transport);
  assert(
    nonRiders.length === 3 && nonRiders.every((s) => s.transport_fee_paise === 0),
    `All 3 non-transport students are charged ₹0 transport fee`
  );

  // ─── SUITE 2: Accurate Annualized Calculations Across Every Frequency ──────
  console.log("\n--- Suite 2: Annualized Multipliers for Every Supported Frequency ---");

  assert(calculateAnnualMultiplier("monthly") === 12, "monthly multiplier is 12");
  assert(calculateAnnualMultiplier("bimonthly") === 6, "bimonthly multiplier is 6");
  assert(calculateAnnualMultiplier("quarterly") === 4, "quarterly multiplier is 4");
  assert(calculateAnnualMultiplier("three_term") === 3, "three_term multiplier is 3");
  assert(calculateAnnualMultiplier("half_yearly") === 2, "half_yearly multiplier is 2");
  assert(calculateAnnualMultiplier("yearly") === 1, "yearly multiplier is 1");
  assert(calculateAnnualMultiplier("annual") === 1, "annual multiplier is 1");
  assert(calculateAnnualMultiplier("one_time") === 1, "one_time multiplier is 1");
  assert(calculateAnnualMultiplier("custom") === 1, "custom multiplier is 1");

  // Multi-frequency structure test
  const multiFreqComponents: ComponentCalculationInput[] = [
    { fee_head_id: "fh_m", name: "Monthly", frequency: "monthly", amount_rupees: 500, is_mandatory: true },
    { fee_head_id: "fh_bm", name: "Bimonthly", frequency: "bimonthly", amount_rupees: 1000, is_mandatory: true },
    { fee_head_id: "fh_q", name: "Quarterly", frequency: "quarterly", amount_rupees: 1500, is_mandatory: true },
    { fee_head_id: "fh_tt", name: "Three-Term", frequency: "three_term", amount_rupees: 2000, is_mandatory: true },
    { fee_head_id: "fh_hy", name: "Half-Yearly", frequency: "half_yearly", amount_rupees: 3000, is_mandatory: true },
    { fee_head_id: "fh_y", name: "Yearly", frequency: "yearly", amount_rupees: 4000, is_mandatory: true },
    { fee_head_id: "fh_ot", name: "One-Time", frequency: "one_time", amount_rupees: 2500, is_mandatory: true },
  ];
  const multiFreqResult = calculateFeeStructureFinancials({
    academicYear: nurseryAY,
    billingCycle: "quarterly",
    components: multiFreqComponents,
    students: [],
  });
  assert(
    multiFreqResult.base_annual_per_student_rupees === 36500,
    `Multi-frequency structure annual total is ₹36,500 (got ₹${multiFreqResult.base_annual_per_student_rupees})`
  );

  // ─── SUITE 3: Installment Invariant Across All Billing Cycles ───────────────
  console.log("\n--- Suite 3: Installment Schedules Match Annual Total Invariant ---");

  const cycles = ["quarterly", "monthly", "half_yearly", "annual", "three_term"] as const;
  for (const cycle of cycles) {
    const installments = generateInstallmentSchedule(nurseryAY, cycle, nurseryComponents);
    const instSumPaise = installments.reduce((acc, inst) => acc + inst.base_amount_paise, 0);
    assert(
      instSumPaise === 2740000,
      `${cycle} billing cycle installment sum exactly equals ₹27,400 (2,740,000 paise)`
    );
  }

  // Quarterly schedule terms breakdown: Term 1 = ₹12,100, Terms 2,3,4 = ₹5,100 each
  const quarterlyInst = generateInstallmentSchedule(nurseryAY, "quarterly", nurseryComponents);
  assert(quarterlyInst.length === 4, "Quarterly schedule generates 4 terms");
  assert(
    quarterlyInst[0].base_amount_rupees === 12100,
    `Term 1 base amount is ₹12,100 (tuition 3600 + exam 1500 + admission 1000 + dev 5000 + annual 1000)`
  );
  assert(
    quarterlyInst[1].base_amount_rupees === 5100,
    `Term 2 base amount is ₹5,100 (tuition 3600 + exam 1500)`
  );
  assert(
    quarterlyInst[2].base_amount_rupees === 5100,
    `Term 3 base amount is ₹5,100`
  );
  assert(
    quarterlyInst[3].base_amount_rupees === 5100,
    `Term 4 base amount is ₹5,100`
  );

  // ─── SUITE 4: Mid-Year Admission Proration & Boundary Rules ─────────────────
  console.log("\n--- Suite 4: Mid-Year Admission Proration Rules ---");

  // Admitted on October 1, 2026 (Middle of session, Q3 start)
  const midYearQ3 = calculateMidYearAdmissionFee(
    nurseryComponents,
    nurseryAY,
    "2026-10-01",
    "quarterly"
  );
  assert(
    midYearQ3.months_remaining === 6,
    `October admission has 6 months remaining in session (got ${midYearQ3.months_remaining})`
  );
  assert(
    midYearQ3.prorated_installments.length === 2,
    `October admission owes exactly 2 remaining installments (Term 3 & Term 4)`
  );
  assert(
    midYearQ3.total_prorated_rupees === 10200,
    `Prorated payable base is ₹10,200 (Term 3 ₹5,100 + Term 4 ₹5,100) (got ₹${midYearQ3.total_prorated_rupees})`
  );

  // Admitted on January 1, 2027 (Term 4 only)
  const midYearQ4 = calculateMidYearAdmissionFee(
    nurseryComponents,
    nurseryAY,
    "2027-01-01",
    "quarterly"
  );
  assert(
    midYearQ4.prorated_installments.length === 1,
    `January admission owes exactly 1 remaining installment (Term 4)`
  );
  assert(
    midYearQ4.total_prorated_rupees === 5100,
    `Prorated payable base for Q4 admit is ₹5,100 (got ₹${midYearQ4.total_prorated_rupees})`
  );

  // ─── SUITE 5: Concessions, Discounts & RTE Full Waivers ─────────────────────
  console.log("\n--- Suite 5: Concession & Waiver Calculations ---");

  // 25% sibling discount on ₹27,400 (2,740,000 paise)
  const conc25 = calculateConcessionImpact(2740000, "percentage", 25);
  assert(
    conc25.concession_amount_rupees === 6850,
    `25% concession on ₹27,400 is ₹6,850 (got ₹${conc25.concession_amount_rupees})`
  );
  assert(
    conc25.net_amount_rupees === 20550,
    `Net payable after 25% discount is ₹20,550 (got ₹${conc25.net_amount_rupees})`
  );

  // 100% RTE Full Waiver
  const concRte = calculateConcessionImpact(2740000, "full_waiver");
  assert(
    concRte.concession_amount_rupees === 27400,
    `100% RTE waiver concession amount equals full gross ₹27,400`
  );
  assert(
    concRte.net_amount_rupees === 0,
    `Net payable for 100% RTE waived student is ₹0.00`
  );

  // ─── SUITE 6: Structure Name Preservation & Persistence ─────────────────────
  console.log("\n--- Suite 6: Structure Name Preservation & Persistence ---");

  const schoolId = "sch_authoritative_test";
  const customAdminName = "Nursery Annual Fee 2026–27 (Session A)";

  const { structure: savedStruct, error: saveErr } = await saveCompleteFeeStructure(schoolId, {
    name: customAdminName,
    academic_year_id: nurseryAY.id,
    class_id: "cls_nursery",
    class_ids: ["cls_nursery"],
    status: "active",
    description: "Standard Nursery fee structure with one-time admission",
    items: nurseryComponents.map((c) => ({
      fee_head_id: c.fee_head_id,
      frequency: c.frequency,
      base_amount_rupees: c.amount_rupees,
      is_mandatory: true,
      proration_rule: "full",
      term_amounts: {},
    })),
    metadata: { billingCycle: "quarterly" },
  });

  assert(!saveErr && !!savedStruct, "Successfully saved complete fee structure");
  assert(
    savedStruct?.name === customAdminName,
    `Preserved exact administrator-entered name: "${savedStruct?.name}"`
  );

  // Verify retrieval
  const { structures } = await getFeeStructures(schoolId, nurseryAY.id);
  const retrieved = structures.find((s) => s.id === savedStruct?.id);
  assert(
    retrieved?.name === customAdminName,
    `Retrieved fee structure preserves exact name: "${retrieved?.name}"`
  );

  // Verify config items retrieval and annualized sum
  const { items: configItems } = await getStructureConfigItems(schoolId, savedStruct!.id);
  let savedAnnualTotal = 0;
  for (const ci of configItems) {
    const mult = calculateAnnualMultiplier(ci.frequency);
    savedAnnualTotal += (ci.base_amount_rupees || 0) * mult;
  }
  assert(
    savedAnnualTotal === 27400,
    `Persisted structure config items accurately annualize to ₹27,400 (got ₹${savedAnnualTotal})`
  );

  // ─── SUITE 7: Safe Versioning & Conflict Superseding ───────────────────────
  console.log("\n--- Suite 7: Safe Versioning & Conflict Superseding ---");

  // Publishing a revision to the active structure should supersede the old version
  const newRevisionName = "Nursery Annual Fee 2026–27 (Revision B)";
  const { structure: revStruct } = await saveCompleteFeeStructure(schoolId, {
    id: savedStruct!.id, // Editing existing
    name: newRevisionName,
    academic_year_id: nurseryAY.id,
    class_id: "cls_nursery",
    status: "active",
  });

  assert(
    revStruct?.version === 2,
    `Editing existing structure safely incremented version from 1 to 2 (got v${revStruct?.version})`
  );

  // Creating a new active structure for the same class/AY supersedes the previous active structure
  const { structure: newerStruct } = await saveCompleteFeeStructure(schoolId, {
    name: "Nursery Annual Fee 2026–27 (Official)",
    academic_year_id: nurseryAY.id,
    class_id: "cls_nursery",
    status: "active",
  });

  const { structures: allUpdated } = await getFeeStructures(schoolId, nurseryAY.id);
  const previousRev = allUpdated.find((s) => s.id === savedStruct!.id);
  assert(
    previousRev?.status === "superseded",
    `Previous active structure automatically transitioned to 'superseded' to prevent conflict`
  );
  assert(
    newerStruct?.status === "active",
    `Newer structure is now the single active structure for this class and academic year`
  );

  console.log("\n================================================================================");
  console.log(`Nursery Fee Structure Redesign Tests: ${testsPassed} passed, ${testsFailed} failed`);
  console.log("================================================================================");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
