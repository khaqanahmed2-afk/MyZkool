/**
 * Automated Verification Test for Fee Billing Cycles & Installments Schedule Preview
 * Verifies:
 * 1. Quarterly (4 Terms): exactly 4 installments with correct quarterly periods, due dates, components, and amounts.
 * 2. Monthly (12 Installments): exactly 12 installments with monthly tuition and term additions.
 * 3. Half-Yearly (2 Terms): exactly 2 installments with 6-month tuition + half-yearly fees.
 * 4. Annual (1 Session): 1 installment with full academic session components.
 * 5. Date boundaries strictly conform to the Academic Year without timezone date-shifting bugs.
 * 6. Total annual scheduled amounts are mathematically consistent across all cycles.
 */

import { generateInstallmentSchedule, calculateFeeStructureFinancials } from "../src/services/feeCalculationService";
import type { AcademicYear } from "../src/types/academic";
import type { ComponentCalculationInput } from "../src/services/feeCalculationService";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(msg);
  } else {
    console.log(`  ✓ ${msg}`);
  }
}

async function testBillingCycles() {
  console.log("=== STARTING BILLING CYCLES & INSTALLMENT SCHEDULE TEST SUITE ===\n");

  const academicYear: AcademicYear = {
    id: "ay_2026_27",
    school_id: "sch_peace_01",
    start_year: 2026,
    end_year: 2027,
    start_date: "2026-04-01",
    end_date: "2027-03-31",
    label: "2026–2027",
    is_current: true,
  };

  const components: ComponentCalculationInput[] = [
    {
      fee_head_id: "fh_tuition",
      name: "Tuition Fee",
      frequency: "monthly",
      amount_rupees: 2000,
      is_mandatory: true,
      is_system_managed: false,
    },
    {
      fee_head_id: "fh_exam",
      name: "Examination Fee",
      frequency: "quarterly",
      amount_rupees: 500,
      is_mandatory: true,
      is_system_managed: false,
    },
    {
      fee_head_id: "fh_sports",
      name: "Sports & Lab Fee",
      frequency: "half_yearly",
      amount_rupees: 1000,
      is_mandatory: true,
      is_system_managed: false,
    },
    {
      fee_head_id: "fh_admission",
      name: "Annual Activity Fee",
      frequency: "yearly",
      amount_rupees: 1500,
      is_mandatory: true,
      is_system_managed: false,
    },
  ];

  // Expected Total Base Fee:
  // Tuition (2000 * 12 = 24,000) + Exam (500 * 4 = 2,000) + Sports (1000 * 2 = 2,000) + Annual (1500) = 29,500
  const EXPECTED_ANNUAL_TOTAL = 29500;

  console.log("TEST 1: Quarterly (4 Terms) Schedule Preview");
  {
    const schedule = generateInstallmentSchedule(academicYear, "quarterly", components, 10);
    assert(schedule.length === 4, `Quarterly schedule contains exactly 4 terms (got: ${schedule.length})`);

    // Term 1 (Apr - Jun)
    assert(schedule[0].period_start === "2026-04-01", `Q1 period_start is 2026-04-01 (got: ${schedule[0].period_start})`);
    assert(schedule[0].period_end === "2026-06-30", `Q1 period_end is 2026-06-30 (got: ${schedule[0].period_end})`);
    assert(schedule[0].due_date === "10 Apr 2026", `Q1 due_date is 10 Apr 2026 (got: ${schedule[0].due_date})`);
    assert(schedule[0].base_amount_rupees === 9000, `Q1 amount is ₹9,000 (Tuition 6k + Exam 500 + Sports 1k + Annual 1.5k) (got: ${schedule[0].base_amount_rupees})`);
    assert(
      schedule[0].included_components.some(c => c.includes("Tuition (3 mos)")) &&
      schedule[0].included_components.includes("Examination Fee") &&
      schedule[0].included_components.includes("Sports & Lab Fee") &&
      schedule[0].included_components.includes("Annual Activity Fee"),
      "Q1 includes Tuition (3 mos), Examination Fee, Sports Fee, and Annual Activity Fee"
    );

    // Term 2 (Jul - Sep)
    assert(schedule[1].period_start === "2026-07-01", `Q2 period_start is 2026-07-01 (got: ${schedule[1].period_start})`);
    assert(schedule[1].period_end === "2026-09-30", `Q2 period_end is 2026-09-30 (got: ${schedule[1].period_end})`);
    assert(schedule[1].due_date === "10 Jul 2026", `Q2 due_date is 10 Jul 2026 (got: ${schedule[1].due_date})`);
    assert(schedule[1].base_amount_rupees === 6500, `Q2 amount is ₹6,500 (Tuition 6k + Exam 500) (got: ${schedule[1].base_amount_rupees})`);

    // Term 3 (Oct - Dec)
    assert(schedule[2].period_start === "2026-10-01", `Q3 period_start is 2026-10-01 (got: ${schedule[2].period_start})`);
    assert(schedule[2].period_end === "2026-12-31", `Q3 period_end is 2026-12-31 (got: ${schedule[2].period_end})`);
    assert(schedule[2].due_date === "10 Oct 2026", `Q3 due_date is 10 Oct 2026 (got: ${schedule[2].due_date})`);
    assert(schedule[2].base_amount_rupees === 7500, `Q3 amount is ₹7,500 (Tuition 6k + Exam 500 + Sports 1k) (got: ${schedule[2].base_amount_rupees})`);

    // Term 4 (Jan - Mar)
    assert(schedule[3].period_start === "2027-01-01", `Q4 period_start is 2027-01-01 (got: ${schedule[3].period_start})`);
    assert(schedule[3].period_end === "2027-03-31", `Q4 period_end is 2027-03-31 (got: ${schedule[3].period_end})`);
    assert(schedule[3].due_date === "10 Jan 2027", `Q4 due_date is 10 Jan 2027 (got: ${schedule[3].due_date})`);
    assert(schedule[3].base_amount_rupees === 6500, `Q4 amount is ₹6,500 (Tuition 6k + Exam 500) (got: ${schedule[3].base_amount_rupees})`);

    const quarterlyTotal = schedule.reduce((sum, inst) => sum + inst.base_amount_rupees, 0);
    assert(quarterlyTotal === EXPECTED_ANNUAL_TOTAL, `Total of 4 quarterly installments is ₹${EXPECTED_ANNUAL_TOTAL} (got: ${quarterlyTotal})`);
  }

  console.log("\nTEST 2: Monthly (12 Installments) Schedule Preview");
  {
    const schedule = generateInstallmentSchedule(academicYear, "monthly", components, 10);
    assert(schedule.length === 12, `Monthly schedule contains exactly 12 installments (got: ${schedule.length})`);
    assert(schedule[0].period_start === "2026-04-01" && schedule[0].period_end === "2026-04-30", "Month 1 period: 2026-04-01 to 2026-04-30");
    assert(schedule[11].period_start === "2027-03-01" && schedule[11].period_end === "2027-03-31", "Month 12 period: 2027-03-01 to 2027-03-31");
    assert(schedule[0].due_date === "10 Apr 2026", "Month 1 due date: 10 Apr 2026");
    assert(schedule[11].due_date === "10 Mar 2027", "Month 12 due date: 10 Mar 2027");

    const monthlyTotal = schedule.reduce((sum, inst) => sum + inst.base_amount_rupees, 0);
    assert(monthlyTotal === EXPECTED_ANNUAL_TOTAL, `Total of 12 monthly installments matches ₹${EXPECTED_ANNUAL_TOTAL} (got: ${monthlyTotal})`);
  }

  console.log("\nTEST 3: Half-Yearly (2 Terms) Schedule Preview");
  {
    const schedule = generateInstallmentSchedule(academicYear, "half_yearly", components, 10);
    assert(schedule.length === 2, `Half-Yearly schedule contains exactly 2 terms (got: ${schedule.length})`);
    assert(schedule[0].period_start === "2026-04-01" && schedule[0].period_end === "2026-09-30", "Half 1 period: 2026-04-01 to 2026-09-30");
    assert(schedule[1].period_start === "2026-10-01" && schedule[1].period_end === "2027-03-31", "Half 2 period: 2026-10-01 to 2027-03-31");
    assert(schedule[0].due_date === "10 Apr 2026", "Half 1 due date: 10 Apr 2026");
    assert(schedule[1].due_date === "10 Oct 2026", "Half 2 due date: 10 Oct 2026");

    const halfYearlyTotal = schedule.reduce((sum, inst) => sum + inst.base_amount_rupees, 0);
    assert(halfYearlyTotal === EXPECTED_ANNUAL_TOTAL, `Total of 2 half-yearly installments matches ₹${EXPECTED_ANNUAL_TOTAL} (got: ${halfYearlyTotal})`);
  }

  console.log("\nTEST 4: Annual (1 Session) Schedule Preview");
  {
    const schedule = generateInstallmentSchedule(academicYear, "annual", components, 10);
    assert(schedule.length === 1, `Annual schedule contains exactly 1 installment (got: ${schedule.length})`);
    assert(schedule[0].period_start === "2026-04-01" && schedule[0].period_end === "2027-03-31", "Annual period: 2026-04-01 to 2027-03-31");
    assert(schedule[0].due_date === "10 Apr 2026", "Annual due date: 10 Apr 2026");
    assert(schedule[0].base_amount_rupees === EXPECTED_ANNUAL_TOTAL, `Annual installment amount matches ₹${EXPECTED_ANNUAL_TOTAL} (got: ${schedule[0].base_amount_rupees})`);
  }

  console.log("\nTEST 5: Calculation Engine Financial Aggregation");
  {
    const mockStudents = [
      {
        student_id: "s1",
        first_name: "Aman",
        last_name: "Kumar",
        admission_no: "ADM-101",
        has_transport: true,
        status: "active",
        monthly_fee_paise: 250000, // ₹2,500/mo = ₹30,000/yr transport
      },
      {
        student_id: "s2",
        first_name: "Diya",
        last_name: "Sharma",
        admission_no: "ADM-102",
        has_transport: false,
        status: "active",
        monthly_fee_paise: 0,
      },
    ];

    const result = calculateFeeStructureFinancials({
      academicYear,
      billingCycle: "quarterly",
      components,
      students: mockStudents,
    });

    assert(result.billing_cycle === "quarterly", "Result correctly reflects quarterly cycle");
    assert(result.installments.length === 4, "Result contains 4 quarterly installments");
    assert(result.base_annual_per_student_rupees === EXPECTED_ANNUAL_TOTAL, `Base annual per student is ₹${EXPECTED_ANNUAL_TOTAL} (got: ${result.base_annual_per_student_rupees})`);
    assert(result.transport_riders_count === 1, "Identified 1 active transport rider");
    assert(result.class_transport_annual_rupees === 30000, `Class transport total is ₹30,000 (got: ${result.class_transport_annual_rupees})`);
    assert(result.class_grand_total_annual_rupees === (EXPECTED_ANNUAL_TOTAL * 2) + 30000, "Grand total reflects 2 students base + 1 transport rider");
  }

  console.log("\n✅ ALL BILLING CYCLE AND INSTALLMENT TESTS PASSED SUCCESSFULLY!\n");
}

testBillingCycles().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
