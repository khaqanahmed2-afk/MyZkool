/**
 * Fee Calculation Service
 *
 * Centralized, decimal-safe integer paise calculation engine for:
 * - Fee Structure wizard previews and review screens
 * - Installment schedule derivation from actual Academic Year boundaries
 * - Student-specific transport fee resolution (charging only eligible riders with valid assignments)
 * - Class-level aggregated demand calculations
 *
 * All amounts internally computed in integer paise to avoid IEEE 754 floating-point inaccuracies.
 */

import type { AcademicYear } from "../types/academic";
import type {
  FeeHeadFrequency,
  FeeCycleFrequency,
  FeeTerm,
  StudentDue,
  FeeCredit,
} from "../types/fees";
import type { FeeReceipt } from "../types/collection";

export interface ComponentCalculationInput {
  fee_head_id: string;
  name: string;
  frequency: FeeHeadFrequency;
  amount_rupees: number;
  is_mandatory: boolean;
  is_system_managed?: boolean;
  applicable_to?: string;
}

export interface ComponentBreakdownItem {
  fee_head_id: string;
  name: string;
  frequency: FeeHeadFrequency;
  amount_rupees: number;
  amount_paise: number;
  annual_multiplier: number;
  annual_amount_rupees: number;
  annual_amount_paise: number;
  is_mandatory: boolean;
  is_one_time: boolean;
  is_recurring: boolean;
  is_optional: boolean;
}

export interface StudentTransportInfo {
  student_id: string;
  first_name: string;
  last_name: string;
  admission_no: string;
  class_id?: string | null;
  section_id?: string | null;
  has_transport: boolean;
  assignment_id?: string | null;
  route_id?: string | null;
  route_name?: string | null;
  stop_id?: string | null;
  stop_name?: string | null;
  service_type?: "both" | "pickup_only" | "drop_only";
  monthly_fee_paise: number;
  status?: string;
}

export interface GeneratedInstallment {
  installment_number: number;
  label: string;
  period_start: string;
  period_end: string;
  due_date: string;
  base_amount_paise: number;
  base_amount_rupees: number;
  included_components: string[];
}

export interface MidYearProrationResult {
  student_id?: string;
  admission_date: string;
  total_original_paise: number;
  total_prorated_paise: number;
  total_original_rupees: number;
  total_prorated_rupees: number;
  months_remaining: number;
  total_months: number;
  prorated_installments: GeneratedInstallment[];
}

export interface ConcessionImpactResult {
  original_amount_paise: number;
  concession_amount_paise: number;
  net_amount_paise: number;
  original_amount_rupees: number;
  concession_amount_rupees: number;
  net_amount_rupees: number;
  discount_percentage?: number;
}

export interface StudentCalculationSummary {
  student_id: string;
  first_name: string;
  last_name: string;
  admission_no: string;
  base_fee_paise: number;
  base_fee_rupees: number;
  transport_fee_paise: number;
  transport_fee_rupees: number;
  total_fee_paise: number;
  total_fee_rupees: number;
  has_transport: boolean;
  route_name?: string;
  stop_name?: string;
  monthly_transport_paise: number;
}

export interface FeeStructureCalculationResult {
  // Granular Academic Base Breakdown (in integer paise and rupees)
  one_time_paise: number;
  one_time_rupees: number;
  yearly_paise: number;
  yearly_rupees: number;
  monthly_recurring_paise: number;
  monthly_recurring_rupees: number;
  monthly_annual_paise: number;
  monthly_annual_rupees: number;
  quarterly_annual_paise: number;
  quarterly_annual_rupees: number;
  bimonthly_annual_paise: number;
  bimonthly_annual_rupees: number;
  three_term_annual_paise: number;
  three_term_annual_rupees: number;
  half_yearly_annual_paise: number;
  half_yearly_annual_rupees: number;
  optional_annual_paise: number;
  optional_annual_rupees: number;

  // Backward-compatible totals
  annual_onetime_paise: number;
  annual_onetime_rupees: number;

  // Base standard annual fee per enrolled student
  base_annual_per_student_paise: number;
  base_annual_per_student_rupees: number;

  // Component breakdowns
  component_breakdowns: ComponentBreakdownItem[];

  // Installments
  billing_cycle: FeeCycleFrequency;
  installments: GeneratedInstallment[];

  // Student coverage & transport details
  total_enrolled_students: number;
  transport_riders_count: number;
  non_transport_students_count: number;
  students_summary: StudentCalculationSummary[];

  // Aggregated class totals
  class_base_annual_paise: number;
  class_base_annual_rupees: number;
  class_transport_annual_paise: number;
  class_transport_annual_rupees: number;
  class_grand_total_annual_paise: number;
  class_grand_total_annual_rupees: number;

  // Breakdown labels
  recurring_components_label: string;
}

/**
 * Returns the annual multiplier for a given fee frequency in a 12-month academic year.
 */
export function calculateAnnualMultiplier(
  frequency: FeeHeadFrequency,
  totalMonths: number = 12
): number {
  switch (frequency) {
    case "monthly":
      return totalMonths;
    case "bimonthly":
      return Math.floor(totalMonths / 2); // 6
    case "quarterly":
      return Math.floor(totalMonths / 3); // 4
    case "three_term":
      return Math.floor(totalMonths / 4); // 3
    case "half_yearly":
      return Math.floor(totalMonths / 6); // 2
    case "yearly":
    case "annual":
    case "one_time":
    case "custom":
    default:
      return 1;
  }
}

/**
 * Derives installment periods strictly bounded by the school's configured Academic Year.
 */
export function generateInstallmentSchedule(
  academicYear: AcademicYear,
  billingCycle: FeeCycleFrequency,
  components: ComponentCalculationInput[],
  dueDay = 10
): GeneratedInstallment[] {
  // Parse start and end date from academic year
  const rawStartDate = academicYear.start_date || `${academicYear.start_year}-04-01`;
  const rawEndDate = academicYear.end_date || `${academicYear.end_year}-03-31`;

  // Parse YYYY-MM-DD components directly to prevent timezone/UTC offset shifts
  const [sY, sM, sD] = rawStartDate.split("-").map(Number);
  const [eY, eM, eD] = rawEndDate.split("-").map(Number);

  const startYear = sY || academicYear.start_year;
  const startMonth = sM !== undefined ? sM - 1 : 3; // 0-indexed (e.g. 3 for April)

  const formatIso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const formatDisplay = (d: Date) => {
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  // Component categories
  const monthlyComps = components.filter(
    (c) => c.frequency === "monthly" && !c.is_system_managed && c.amount_rupees > 0
  );
  const monthlyPaise = monthlyComps.reduce(
    (acc, c) => acc + Math.round(c.amount_rupees * 100),
    0
  );

  const quarterlyComps = components.filter(
    (c) => c.frequency === "quarterly" && !c.is_system_managed && c.amount_rupees > 0
  );
  const quarterlyPaise = quarterlyComps.reduce(
    (acc, c) => acc + Math.round(c.amount_rupees * 100),
    0
  );

  const halfYearlyComps = components.filter(
    (c) => c.frequency === "half_yearly" && !c.is_system_managed && c.amount_rupees > 0
  );
  const halfYearlyTermPaise = halfYearlyComps.reduce(
    (acc, c) => acc + Math.round(c.amount_rupees * 100),
    0
  );

  const annualComps = components.filter(
    (c) => (c.frequency === "yearly" || c.frequency === "annual" || c.frequency === "one_time" || c.frequency === "custom") && !c.is_system_managed && c.amount_rupees > 0
  );
  const annualPaise = annualComps.reduce(
    (acc, c) => acc + Math.round(c.amount_rupees * 100),
    0
  );

  const bimonthlyComps = components.filter(
    (c) => c.frequency === "bimonthly" && !c.is_system_managed && c.amount_rupees > 0
  );
  const bimonthlyPaise = bimonthlyComps.reduce(
    (acc, c) => acc + Math.round(c.amount_rupees * 100),
    0
  );

  const threeTermComps = components.filter(
    (c) => c.frequency === "three_term" && !c.is_system_managed && c.amount_rupees > 0
  );
  const threeTermPaise = threeTermComps.reduce(
    (acc, c) => acc + Math.round(c.amount_rupees * 100),
    0
  );

  const recurringNames = monthlyComps.map((c) => c.name.replace(/ Fee$/i, "")).join(" + ");
  const quarterlyNames = quarterlyComps.map((c) => c.name).join(" + ");
  const halfYearlyNames = halfYearlyComps.map((c) => c.name).join(" + ");

  // Target expected annual sum for mandatory components
  const targetAnnualPaise =
    monthlyPaise * 12 +
    quarterlyPaise * 4 +
    halfYearlyTermPaise * 2 +
    bimonthlyPaise * 6 +
    threeTermPaise * 3 +
    annualPaise;

  let installments: GeneratedInstallment[] = [];

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. QUARTERLY BILLING CYCLE (Exactly 4 Terms)
  // ─────────────────────────────────────────────────────────────────────────────
  if (billingCycle === "quarterly") {
    const quarters = [
      { name: "Term 1 (Quarter 1)", mStart: 0, mEnd: 2 },
      { name: "Term 2 (Quarter 2)", mStart: 3, mEnd: 5 },
      { name: "Term 3 (Quarter 3)", mStart: 6, mEnd: 8 },
      { name: "Term 4 (Quarter 4)", mStart: 9, mEnd: 11 },
    ];

    installments = quarters.map((q, idx) => {
      const pStart = new Date(startYear, startMonth + q.mStart, 1);
      const pEnd = new Date(startYear, startMonth + q.mEnd + 1, 0); // Last calendar day of quarter
      const dDate = new Date(startYear, startMonth + q.mStart, dueDay);

      // Base: Monthly components * 3 (for the 3 months in this quarter)
      let instPaise = monthlyPaise * 3;
      const incComps: string[] = [];

      if (monthlyComps.length > 0) {
        incComps.push(`${recurringNames || "Tuition"} (3 mos)`);
      }

      // Quarterly components apply in every quarter
      if (quarterlyComps.length > 0) {
        instPaise += quarterlyPaise;
        quarterlyComps.forEach((c) => incComps.push(c.name));
      }

      // Half-Yearly components billed in Term 1 (Q1) and Term 3 (Q3)
      if ((idx === 0 || idx === 2) && halfYearlyComps.length > 0) {
        instPaise += halfYearlyTermPaise;
        halfYearlyComps.forEach((c) => incComps.push(c.name));
      }

      // Bimonthly: 6 installments / 4 quarters -> Term 1,2,3 get 2 each or distributed
      if (bimonthlyComps.length > 0) {
        const bimonthlyInQuarter = idx < 2 ? Math.round(bimonthlyPaise * 1.5) : Math.round(bimonthlyPaise * 1.5);
        instPaise += bimonthlyInQuarter;
        bimonthlyComps.forEach((c) => incComps.push(c.name));
      }

      // Three-Term: billed in Term 1, 2, 3
      if (idx < 3 && threeTermComps.length > 0) {
        instPaise += threeTermPaise;
        threeTermComps.forEach((c) => incComps.push(c.name));
      }

      // One-time and annual fees attached to Term 1 (Q1)
      if (idx === 0 && annualComps.length > 0) {
        instPaise += annualPaise;
        annualComps.forEach((c) => incComps.push(c.name));
      }

      const startMonthName = pStart.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      const endMonthName = pEnd.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      const periodLabel = `${q.name} (${startMonthName} – ${endMonthName})`;

      return {
        installment_number: idx + 1,
        label: periodLabel,
        period_start: formatIso(pStart),
        period_end: formatIso(pEnd),
        due_date: formatDisplay(dDate),
        base_amount_paise: instPaise,
        base_amount_rupees: Math.round(instPaise / 100),
        included_components: incComps.length > 0 ? incComps : ["Quarterly Academic Fee"],
      };
    });
  } else if (billingCycle === "monthly") {
    // ─────────────────────────────────────────────────────────────────────────────
    // 2. MONTHLY BILLING CYCLE (Exactly 12 Installments)
    // ─────────────────────────────────────────────────────────────────────────────
    installments = [];
    for (let i = 0; i < 12; i++) {
      const pStart = new Date(startYear, startMonth + i, 1);
      const pEnd = new Date(startYear, startMonth + i + 1, 0);
      const dDate = new Date(startYear, startMonth + i, dueDay);

      const incComps: string[] = [];
      let instPaise = monthlyPaise;
      if (monthlyComps.length > 0) {
        incComps.push(recurringNames || "Monthly Tuition");
      }

      // Quarterly fees attached to months 0, 3, 6, 9 (start of each quarter)
      if ((i === 0 || i === 3 || i === 6 || i === 9) && quarterlyComps.length > 0) {
        instPaise += quarterlyPaise;
        quarterlyComps.forEach((c) => incComps.push(c.name));
      }

      // Half-yearly fees attached to month 0 (Apr) and month 6 (Oct)
      if ((i === 0 || i === 6) && halfYearlyComps.length > 0) {
        instPaise += halfYearlyTermPaise;
        halfYearlyComps.forEach((c) => incComps.push(c.name));
      }

      // Bimonthly fees attached to even months (0, 2, 4, 6, 8, 10)
      if (i % 2 === 0 && bimonthlyComps.length > 0) {
        instPaise += bimonthlyPaise;
        bimonthlyComps.forEach((c) => incComps.push(c.name));
      }

      // Three-term fees attached to months 0, 4, 8
      if ((i === 0 || i === 4 || i === 8) && threeTermComps.length > 0) {
        instPaise += threeTermPaise;
        threeTermComps.forEach((c) => incComps.push(c.name));
      }

      // One-time and annual fees attached to Month 1 (Apr)
      if (i === 0 && annualComps.length > 0) {
        instPaise += annualPaise;
        annualComps.forEach((c) => incComps.push(c.name));
      }

      const monthLabel = pStart.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

      installments.push({
        installment_number: i + 1,
        label: monthLabel,
        period_start: formatIso(pStart),
        period_end: formatIso(pEnd),
        due_date: formatDisplay(dDate),
        base_amount_paise: instPaise,
        base_amount_rupees: Math.round(instPaise / 100),
        included_components: incComps.length > 0 ? incComps : ["Monthly Academic Fee"],
      });
    }
  } else if (billingCycle === "half_yearly") {
    // ─────────────────────────────────────────────────────────────────────────────
    // 3. HALF-YEARLY BILLING CYCLE (Exactly 2 Terms)
    // ─────────────────────────────────────────────────────────────────────────────
    const halves = [
      { name: "Term 1 (Half Year 1)", mStart: 0, mEnd: 5 },
      { name: "Term 2 (Half Year 2)", mStart: 6, mEnd: 11 },
    ];

    installments = halves.map((h, idx) => {
      const pStart = new Date(startYear, startMonth + h.mStart, 1);
      const pEnd = new Date(startYear, startMonth + h.mEnd + 1, 0);
      const dDate = new Date(startYear, startMonth + h.mStart, dueDay);

      let instPaise = monthlyPaise * 6 + quarterlyPaise * 2 + halfYearlyTermPaise + bimonthlyPaise * 3;
      const incComps: string[] = [];

      if (monthlyComps.length > 0) {
        incComps.push(`${recurringNames || "Tuition"} (6 mos)`);
      }
      if (quarterlyComps.length > 0) {
        incComps.push(`${quarterlyNames} (2 qtrs)`);
      }
      if (halfYearlyComps.length > 0) {
        halfYearlyComps.forEach((c) => incComps.push(c.name));
      }
      if (threeTermComps.length > 0) {
        const ttAmt = idx === 0 ? threeTermPaise * 2 : threeTermPaise;
        instPaise += ttAmt;
        threeTermComps.forEach((c) => incComps.push(c.name));
      }

      if (idx === 0 && annualComps.length > 0) {
        instPaise += annualPaise;
        annualComps.forEach((c) => incComps.push(c.name));
      }

      const startMonthName = pStart.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      const endMonthName = pEnd.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      const periodLabel = `${h.name} (${startMonthName} – ${endMonthName})`;

      return {
        installment_number: idx + 1,
        label: periodLabel,
        period_start: formatIso(pStart),
        period_end: formatIso(pEnd),
        due_date: formatDisplay(dDate),
        base_amount_paise: instPaise,
        base_amount_rupees: Math.round(instPaise / 100),
        included_components: incComps.length > 0 ? incComps : ["Half-Yearly Academic Fee"],
      };
    });
  } else if (billingCycle === "three_term") {
    // ─────────────────────────────────────────────────────────────────────────────
    // 4. THREE-TERM BILLING CYCLE (Exactly 3 Terms)
    // ─────────────────────────────────────────────────────────────────────────────
    const terms = [
      { name: "Term 1", mStart: 0, mEnd: 3 },
      { name: "Term 2", mStart: 4, mEnd: 7 },
      { name: "Term 3", mStart: 8, mEnd: 11 },
    ];

    installments = terms.map((t, idx) => {
      const pStart = new Date(startYear, startMonth + t.mStart, 1);
      const pEnd = new Date(startYear, startMonth + t.mEnd + 1, 0);
      const dDate = new Date(startYear, startMonth + t.mStart, dueDay);

      let instPaise = monthlyPaise * 4 + threeTermPaise;
      const incComps: string[] = [];
      if (monthlyComps.length > 0) incComps.push(`${recurringNames || "Tuition"} (4 mos)`);
      if (threeTermComps.length > 0) threeTermComps.forEach((c) => incComps.push(c.name));

      if (idx === 0 && annualComps.length > 0) {
        instPaise += annualPaise;
        annualComps.forEach((c) => incComps.push(c.name));
      }

      const startMonthName = pStart.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      const endMonthName = pEnd.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      const periodLabel = `${t.name} (${startMonthName} – ${endMonthName})`;

      return {
        installment_number: idx + 1,
        label: periodLabel,
        period_start: formatIso(pStart),
        period_end: formatIso(pEnd),
        due_date: formatDisplay(dDate),
        base_amount_paise: instPaise,
        base_amount_rupees: Math.round(instPaise / 100),
        included_components: incComps.length > 0 ? incComps : ["Term Academic Fee"],
      };
    });
  } else {
    // ─────────────────────────────────────────────────────────────────────────────
    // 5. ANNUAL BILLING CYCLE (1 Session Installment)
    // ─────────────────────────────────────────────────────────────────────────────
    const dDate = new Date(startYear, startMonth, dueDay);
    const incComps: string[] = [];
    if (monthlyComps.length > 0) incComps.push(`${recurringNames || "Tuition"} (12 mos)`);
    if (quarterlyComps.length > 0) incComps.push(`${quarterlyNames} (4 qtrs)`);
    if (halfYearlyComps.length > 0) incComps.push(`${halfYearlyNames} (2 terms)`);
    if (annualComps.length > 0) annualComps.forEach((c) => incComps.push(c.name));

    const pStart = new Date(startYear, startMonth, 1);
    const pEnd = new Date(startYear, startMonth + 12, 0);

    installments = [
      {
        installment_number: 1,
        label: `Annual Session ${academicYear.label || `${academicYear.start_year}–${academicYear.end_year}`}`,
        period_start: formatIso(pStart),
        period_end: formatIso(pEnd),
        due_date: formatDisplay(dDate),
        base_amount_paise: targetAnnualPaise,
        base_amount_rupees: Math.round(targetAnnualPaise / 100),
        included_components: incComps.length > 0 ? incComps : ["Full Academic Fee Components"],
      },
    ];
  }

  // Exact Integer Invariant Guarantee: Sum of installments must equal total annualized academic fee
  if (installments.length > 0 && targetAnnualPaise > 0) {
    const currentSum = installments.reduce((acc, inst) => acc + inst.base_amount_paise, 0);
    const diff = targetAnnualPaise - currentSum;
    if (diff !== 0) {
      installments[0].base_amount_paise += diff;
      installments[0].base_amount_rupees = Math.round(installments[0].base_amount_paise / 100);
    }
  }

  return installments;
}

/**
 * Calculates complete fee structure financials with strict student transport eligibility.
 */
export function calculateFeeStructureFinancials(params: {
  academicYear: AcademicYear;
  billingCycle: FeeCycleFrequency;
  components: ComponentCalculationInput[];
  students: StudentTransportInfo[];
}): FeeStructureCalculationResult {
  const { academicYear, billingCycle, components, students } = params;

  // 1. Calculate granular component breakdowns and frequency multipliers
  const component_breakdowns: ComponentBreakdownItem[] = components
    .filter((c) => !c.is_system_managed && c.amount_rupees > 0)
    .map((c) => {
      const annual_multiplier = calculateAnnualMultiplier(c.frequency);
      const amount_paise = Math.round(c.amount_rupees * 100);
      const annual_amount_paise = amount_paise * annual_multiplier;
      const is_one_time = c.frequency === "one_time";
      const is_recurring = c.frequency !== "one_time";
      const is_optional = !c.is_mandatory;

      return {
        fee_head_id: c.fee_head_id,
        name: c.name,
        frequency: c.frequency,
        amount_rupees: c.amount_rupees,
        amount_paise,
        annual_multiplier,
        annual_amount_rupees: Math.round(annual_amount_paise / 100),
        annual_amount_paise,
        is_mandatory: c.is_mandatory,
        is_one_time,
        is_recurring,
        is_optional,
      };
    });

  // Mandatory active items for the base annual academic fee
  const mandatoryItems = component_breakdowns.filter((c) => c.is_mandatory);

  const one_time_paise = mandatoryItems
    .filter((c) => c.frequency === "one_time")
    .reduce((acc, c) => acc + c.annual_amount_paise, 0);

  const yearly_paise = mandatoryItems
    .filter((c) => c.frequency === "yearly" || c.frequency === "annual" || c.frequency === "custom")
    .reduce((acc, c) => acc + c.annual_amount_paise, 0);

  const monthlyComps = mandatoryItems.filter((c) => c.frequency === "monthly");
  const monthly_recurring_paise = monthlyComps.reduce((acc, c) => acc + c.amount_paise, 0);
  const monthly_annual_paise = monthly_recurring_paise * 12;

  const quarterly_annual_paise = mandatoryItems
    .filter((c) => c.frequency === "quarterly")
    .reduce((acc, c) => acc + c.annual_amount_paise, 0);

  const half_yearly_annual_paise = mandatoryItems
    .filter((c) => c.frequency === "half_yearly")
    .reduce((acc, c) => acc + c.annual_amount_paise, 0);

  const bimonthly_annual_paise = mandatoryItems
    .filter((c) => c.frequency === "bimonthly")
    .reduce((acc, c) => acc + c.annual_amount_paise, 0);

  const three_term_annual_paise = mandatoryItems
    .filter((c) => c.frequency === "three_term")
    .reduce((acc, c) => acc + c.annual_amount_paise, 0);

  const optional_annual_paise = component_breakdowns
    .filter((c) => c.is_optional)
    .reduce((acc, c) => acc + c.annual_amount_paise, 0);

  const annual_onetime_paise = one_time_paise + yearly_paise;

  const base_annual_per_student_paise =
    one_time_paise +
    yearly_paise +
    monthly_annual_paise +
    quarterly_annual_paise +
    half_yearly_annual_paise +
    bimonthly_annual_paise +
    three_term_annual_paise;

  // 2. Generate installment schedule
  const installments = generateInstallmentSchedule(
    academicYear,
    billingCycle,
    components
  );

  // 3. Process each student: Base fee + Stop-specific transport fee
  const students_summary: StudentCalculationSummary[] = [];
  let total_transport_demand_paise = 0;
  let riders_count = 0;

  for (const st of students) {
    let student_transport_annual_paise = 0;

    // A student is only charged transport if they have an active assignment
    if (st.has_transport && st.status === "active" && st.monthly_fee_paise > 0) {
      riders_count++;
      // Transport is billed for 12 months (or active billing months)
      student_transport_annual_paise = st.monthly_fee_paise * 12;
      total_transport_demand_paise += student_transport_annual_paise;
    }

    const student_total_paise =
      base_annual_per_student_paise + student_transport_annual_paise;

    students_summary.push({
      student_id: st.student_id,
      first_name: st.first_name,
      last_name: st.last_name,
      admission_no: st.admission_no,
      base_fee_paise: base_annual_per_student_paise,
      base_fee_rupees: Math.round(base_annual_per_student_paise / 100),
      transport_fee_paise: student_transport_annual_paise,
      transport_fee_rupees: Math.round(student_transport_annual_paise / 100),
      total_fee_paise: student_total_paise,
      total_fee_rupees: Math.round(student_total_paise / 100),
      has_transport: st.has_transport && st.status === "active" && st.monthly_fee_paise > 0,
      route_name: st.route_name || undefined,
      stop_name: st.stop_name || undefined,
      monthly_transport_paise: st.monthly_fee_paise,
    });
  }

  const total_enrolled_students = students.length;
  const non_transport_students_count = total_enrolled_students - riders_count;

  const class_base_annual_paise = base_annual_per_student_paise * total_enrolled_students;
  const class_grand_total_annual_paise =
    class_base_annual_paise + total_transport_demand_paise;

  const recurringNames = monthlyComps.map((c) => c.name.replace(/ Fee$/i, "")).join(" + ");

  return {
    one_time_paise,
    one_time_rupees: Math.round(one_time_paise / 100),
    yearly_paise,
    yearly_rupees: Math.round(yearly_paise / 100),
    monthly_recurring_paise,
    monthly_recurring_rupees: Math.round(monthly_recurring_paise / 100),
    monthly_annual_paise,
    monthly_annual_rupees: Math.round(monthly_annual_paise / 100),
    quarterly_annual_paise,
    quarterly_annual_rupees: Math.round(quarterly_annual_paise / 100),
    bimonthly_annual_paise,
    bimonthly_annual_rupees: Math.round(bimonthly_annual_paise / 100),
    three_term_annual_paise,
    three_term_annual_rupees: Math.round(three_term_annual_paise / 100),
    half_yearly_annual_paise,
    half_yearly_annual_rupees: Math.round(half_yearly_annual_paise / 100),
    optional_annual_paise,
    optional_annual_rupees: Math.round(optional_annual_paise / 100),

    annual_onetime_paise,
    annual_onetime_rupees: Math.round(annual_onetime_paise / 100),
    base_annual_per_student_paise,
    base_annual_per_student_rupees: Math.round(base_annual_per_student_paise / 100),

    component_breakdowns,
    billing_cycle: billingCycle,
    installments,

    total_enrolled_students,
    transport_riders_count: riders_count,
    non_transport_students_count,
    students_summary,

    class_base_annual_paise,
    class_base_annual_rupees: Math.round(class_base_annual_paise / 100),
    class_transport_annual_paise: total_transport_demand_paise,
    class_transport_annual_rupees: Math.round(total_transport_demand_paise / 100),
    class_grand_total_annual_paise,
    class_grand_total_annual_rupees: Math.round(class_grand_total_annual_paise / 100),

    recurring_components_label: recurringNames || "Tuition",
  };
}

/**
 * Prorate fee structure installments and total demand for students admitted mid-academic-year.
 * Uses integer paise to guarantee zero precision loss.
 */
export function calculateMidYearAdmissionFee(
  components: ComponentCalculationInput[],
  academicYear: AcademicYear,
  admissionDateStr: string,
  billingCycle: FeeCycleFrequency = "quarterly",
  dueDayOfMonth: number = 10
): MidYearProrationResult {
  const fullSchedule = generateInstallmentSchedule(
    academicYear,
    billingCycle,
    components,
    dueDayOfMonth
  );

  const admissionDate = new Date(admissionDateStr);
  const admissionTime = admissionDate.getTime();

  const totalOriginalPaise = fullSchedule.reduce(
    (sum, inst) => sum + inst.base_amount_paise,
    0
  );

  // Installments whose period_end is on or after the admission date are payable
  const proratedInstallments = fullSchedule.filter((inst) => {
    const periodEnd = new Date(inst.period_end).getTime();
    return periodEnd >= admissionTime;
  });

  const totalProratedPaise = proratedInstallments.reduce(
    (sum, inst) => sum + inst.base_amount_paise,
    0
  );

  const ayStart = new Date(academicYear.start_date || "2026-04-01");
  const ayEnd = new Date(academicYear.end_date || "2027-03-31");
  const totalMonths = Math.max(
    1,
    (ayEnd.getFullYear() - ayStart.getFullYear()) * 12 +
      (ayEnd.getMonth() - ayStart.getMonth()) +
      1
  );

  const monthsRemaining = Math.max(
    0,
    Math.min(
      totalMonths,
      (ayEnd.getFullYear() - admissionDate.getFullYear()) * 12 +
        (ayEnd.getMonth() - admissionDate.getMonth()) +
        1
    )
  );

  return {
    admission_date: admissionDateStr,
    total_original_paise: totalOriginalPaise,
    total_prorated_paise: totalProratedPaise,
    total_original_rupees: Math.round(totalOriginalPaise / 100),
    total_prorated_rupees: Math.round(totalProratedPaise / 100),
    months_remaining: monthsRemaining,
    total_months: totalMonths,
    prorated_installments: proratedInstallments,
  };
}

/**
 * Calculate concession/waiver impact in integer paise.
 * Supports percentage discounts, flat fee concessions, and 100% full waivers (e.g. RTE).
 */
export function calculateConcessionImpact(
  baseAmountPaise: number,
  concessionType: "percentage" | "flat" | "full_waiver",
  concessionValue: number = 0
): ConcessionImpactResult {
  let concessionPaise = 0;

  if (concessionType === "full_waiver") {
    concessionPaise = baseAmountPaise;
  } else if (concessionType === "percentage") {
    const clampedPct = Math.max(0, Math.min(100, concessionValue));
    concessionPaise = Math.round((baseAmountPaise * clampedPct) / 100);
  } else if (concessionType === "flat") {
    concessionPaise = Math.min(baseAmountPaise, Math.max(0, Math.round(concessionValue)));
  }

  const netPaise = Math.max(0, baseAmountPaise - concessionPaise);

  return {
    original_amount_paise: baseAmountPaise,
    concession_amount_paise: concessionPaise,
    net_amount_paise: netPaise,
    original_amount_rupees: Math.round(baseAmountPaise / 100),
    concession_amount_rupees: Math.round(concessionPaise / 100),
    net_amount_rupees: Math.round(netPaise / 100),
    discount_percentage:
      baseAmountPaise > 0 ? (concessionPaise / baseAmountPaise) * 100 : 0,
  };
}

/**
 * Returns current calendar date in Asia/Kolkata timezone as YYYY-MM-DD string.
 */
export function getTodayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export interface AuthoritativeStudentBreakdown {
  student_id: string;
  gross_billed_paise: number;
  concessions_paise: number;
  net_billed_paise: number;
  paid_paise: number;
  gross_pending_paise: number;
  advance_credit_paise: number;
  net_pending_paise: number;
  gross_overdue_paise: number;
  net_overdue_paise: number;
  earliest_due_date: string | null;
  earliest_overdue_date: string | null;
  status: "no_dues" | "fully_paid" | "partially_paid" | "upcoming" | "overdue" | "pending";
}

export interface AuthoritativeSchoolFinancials {
  academic_year_id?: string;
  academic_year_name?: string;

  // Demand
  total_gross_billed_paise: number;
  total_concessions_paise: number;
  total_net_billed_paise: number;

  // Realized Collections
  total_collected_paise: number;
  total_allocated_paid_paise: number;

  // Balances (strictly net of advance credits)
  total_gross_pending_paise: number;
  total_advance_credit_paise: number;
  net_outstanding_paise: number;
  total_gross_overdue_paise: number;
  net_overdue_paise: number;

  // Student counts
  total_students_count: number;
  distinct_students_with_dues_count: number;
  distinct_students_overdue_count: number;
  fully_paid_students_count: number;

  // Obligations counts
  total_dues_count: number;
  pending_dues_count: number;
  overdue_dues_count: number;

  // Collection efficiency
  collection_rate_pct: number;

  // Student level breakdown map
  studentsMap: Map<string, AuthoritativeStudentBreakdown>;
}

export interface ComputeAuthoritativeFinancialParams {
  dues: StudentDue[];
  credits?: FeeCredit[] | Array<{ student_id: string; remaining_paise: number }>;
  receipts?: FeeReceipt[] | Array<{ id: string; total_paise: number; status: string; academic_year_id?: string; receipt_date?: string }>;
  students?: Array<{ id: string; status?: string; deleted_at?: any }>;
  academicYearId?: string;
  academicYearName?: string;
  asOfDateStr?: string;
}

/**
 * Computes canonical, cross-page reconciled financial metrics adhering to authoritative accounting rules:
 * 1. Excludes cancelled and waived dues from billing demand, balances, and counts.
 * 2. Unallocated student advance credits offset only THAT student's obligations (no cross-student debt masking).
 * 3. Overdue requires (due_date < asOfDate in Asia/Kolkata) AND (balance > 0). Available advance credit offsets oldest debt first.
 * 4. Total collected reflects active receipts in the academic year, or falls back to total allocated dues payment.
 * 5. Distinct student counts accurately distinguish total students, students with dues, and overdue students.
 */
export function computeAuthoritativeFinancialSummary(
  params: ComputeAuthoritativeFinancialParams
): AuthoritativeSchoolFinancials {
  const {
    dues = [],
    credits = [],
    receipts = [],
    students = [],
    academicYearId,
    academicYearName,
    asOfDateStr = getTodayIST(),
  } = params;

  // 1. Map advance credits per student
  const creditsMap = new Map<string, number>();
  let totalAdvanceCreditsPaise = 0;
  for (const c of credits) {
    const rem = Number(c.remaining_paise) || 0;
    if (rem > 0) {
      totalAdvanceCreditsPaise += rem;
      creditsMap.set(c.student_id, (creditsMap.get(c.student_id) || 0) + rem);
    }
  }

  // 2. Filter active (non-cancelled, non-waived) dues for target academic year
  const activeDues = dues.filter((d) => {
    if (d.status === "cancelled" || d.status === "waived") return false;
    if (academicYearId && d.academic_year_id && d.academic_year_id !== academicYearId) return false;
    return true;
  });

  // 3. Group dues by student_id
  const duesByStudent = new Map<string, StudentDue[]>();
  for (const d of activeDues) {
    if (!duesByStudent.has(d.student_id)) {
      duesByStudent.set(d.student_id, []);
    }
    duesByStudent.get(d.student_id)!.push(d);
  }

  // Determine all distinct students to evaluate
  const allStudentIds = new Set<string>();
  for (const s of students) {
    if (!s.deleted_at) allStudentIds.add(s.id);
  }
  for (const sId of duesByStudent.keys()) {
    allStudentIds.add(sId);
  }
  for (const sId of creditsMap.keys()) {
    allStudentIds.add(sId);
  }

  // 4. Compute student-level metrics
  const studentsMap = new Map<string, AuthoritativeStudentBreakdown>();
  let totalGrossBilledPaise = 0;
  let totalConcessionsPaise = 0;
  let totalNetBilledPaise = 0;
  let totalAllocatedPaidPaise = 0;
  let totalGrossPendingPaise = 0;
  let totalGrossOverduePaise = 0;
  let netOutstandingPaise = 0;
  let netOverduePaise = 0;

  let distinctStudentsWithDues = 0;
  let distinctStudentsOverdue = 0;
  let fullyPaidStudentsCount = 0;

  let pendingDuesCount = 0;
  let overdueDuesCount = 0;

  for (const sId of allStudentIds) {
    const sDues = duesByStudent.get(sId) || [];
    const advCredit = creditsMap.get(sId) || 0;

    let sGross = 0;
    let sConcession = 0;
    let sNet = 0;
    let sPaid = 0;
    let sPending = 0;
    let sGrossOverdue = 0;
    let earliestDueDate: string | null = null;
    let earliestOverdueDate: string | null = null;

    for (const d of sDues) {
      const gross = Number(d.gross_paise || (d.net_paise + (d.concession_paise || 0)) || 0);
      const concession = Number(d.concession_paise || 0);
      const net = Number(d.net_paise !== undefined ? d.net_paise : Math.max(0, gross - concession));
      const paid = Number(d.paid_paise || 0);
      const balance = Math.max(0, net - paid);

      sGross += gross;
      sConcession += concession;
      sNet += net;
      sPaid += paid;
      sPending += balance;

      if (balance > 0) {
        pendingDuesCount++;
        const isOvd = d.due_date && d.due_date < asOfDateStr;
        if (isOvd) {
          sGrossOverdue += balance;
          overdueDuesCount++;
          if (!earliestOverdueDate || d.due_date < earliestOverdueDate) {
            earliestOverdueDate = d.due_date;
          }
        }
        if (!earliestDueDate || (d.due_date && d.due_date < earliestDueDate)) {
          earliestDueDate = d.due_date;
        }
      }
    }

    // Apply student advance credit to offset overdue first, then future pending
    const sNetOverdue = Math.max(0, sGrossOverdue - advCredit);
    const sNetPending = Math.max(0, sPending - advCredit);

    // Determine status
    let status: AuthoritativeStudentBreakdown["status"] = "no_dues";
    if (sGross === 0 && sNet === 0) {
      status = "no_dues";
    } else if (sPending === 0 || sNetPending === 0) {
      status = "fully_paid";
      fullyPaidStudentsCount++;
    } else if (sNetOverdue > 0) {
      status = "overdue";
    } else if (sPaid > 0) {
      status = "partially_paid";
    } else if (earliestDueDate && earliestDueDate >= asOfDateStr) {
      status = "upcoming";
    } else {
      status = "pending";
    }

    if (sNetPending > 0) {
      distinctStudentsWithDues++;
    }
    if (sNetOverdue > 0) {
      distinctStudentsOverdue++;
    }

    totalGrossBilledPaise += sGross;
    totalConcessionsPaise += sConcession;
    totalNetBilledPaise += sNet;
    totalAllocatedPaidPaise += sPaid;
    totalGrossPendingPaise += sPending;
    totalGrossOverduePaise += sGrossOverdue;
    netOutstandingPaise += sNetPending;
    netOverduePaise += sNetOverdue;

    studentsMap.set(sId, {
      student_id: sId,
      gross_billed_paise: sGross,
      concessions_paise: sConcession,
      net_billed_paise: sNet,
      paid_paise: sPaid,
      gross_pending_paise: sPending,
      advance_credit_paise: advCredit,
      net_pending_paise: sNetPending,
      gross_overdue_paise: sGrossOverdue,
      net_overdue_paise: sNetOverdue,
      earliest_due_date: earliestDueDate,
      earliest_overdue_date: earliestOverdueDate,
      status,
    });
  }

  // 5. Calculate Realized Total Collections from Receipts (or fall back to dues allocated paid)
  let totalReceiptsCollectedPaise = 0;
  const activeReceipts = receipts.filter((r) => {
    if (r.status !== "active") return false;
    if (academicYearId && r.academic_year_id && r.academic_year_id !== academicYearId) return false;
    return true;
  });

  if (activeReceipts.length > 0) {
    totalReceiptsCollectedPaise = activeReceipts.reduce((sum, r) => sum + (Number(r.total_paise) || 0), 0);
  } else {
    totalReceiptsCollectedPaise = totalAllocatedPaidPaise;
  }

  const collectionRatePct = totalNetBilledPaise > 0
    ? Number(((totalReceiptsCollectedPaise / totalNetBilledPaise) * 100).toFixed(1))
    : (totalGrossBilledPaise > 0 ? Number(((totalReceiptsCollectedPaise / totalGrossBilledPaise) * 100).toFixed(1)) : 0);

  const totalStudentsCount = students.length > 0
    ? students.filter((s) => !s.deleted_at && (!s.status || s.status === "active" || s.status === "enrolled")).length
    : allStudentIds.size;

  return {
    academic_year_id: academicYearId,
    academic_year_name: academicYearName,
    total_gross_billed_paise: totalGrossBilledPaise,
    total_concessions_paise: totalConcessionsPaise,
    total_net_billed_paise: totalNetBilledPaise,
    total_collected_paise: totalReceiptsCollectedPaise,
    total_allocated_paid_paise: totalAllocatedPaidPaise,
    total_gross_pending_paise: totalGrossPendingPaise,
    total_advance_credit_paise: totalAdvanceCreditsPaise,
    net_outstanding_paise: netOutstandingPaise,
    total_gross_overdue_paise: totalGrossOverduePaise,
    net_overdue_paise: netOverduePaise,
    total_students_count: Math.max(totalStudentsCount, allStudentIds.size),
    distinct_students_with_dues_count: distinctStudentsWithDues,
    distinct_students_overdue_count: distinctStudentsOverdue,
    fully_paid_students_count: fullyPaidStudentsCount,
    total_dues_count: activeDues.length,
    pending_dues_count: pendingDuesCount,
    overdue_dues_count: overdueDuesCount,
    collection_rate_pct: Math.min(100, Math.max(0, collectionRatePct)),
    studentsMap,
  };
}


