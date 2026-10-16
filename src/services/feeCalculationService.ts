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
} from "../types/fees";

export interface ComponentCalculationInput {
  fee_head_id: string;
  name: string;
  frequency: FeeHeadFrequency;
  amount_rupees: number;
  is_mandatory: boolean;
  is_system_managed?: boolean;
  applicable_to?: string;
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
  // Per-student standard academic base
  monthly_recurring_paise: number;
  monthly_recurring_rupees: number;
  quarterly_annual_paise?: number;
  quarterly_annual_rupees?: number;
  annual_onetime_paise: number;
  annual_onetime_rupees: number;
  half_yearly_annual_paise: number;
  half_yearly_annual_rupees: number;
  base_annual_per_student_paise: number;
  base_annual_per_student_rupees: number;

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
 * Derives installment periods strictly bounded by the school's configured Academic Year.
 */
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

  // 1. Monthly recurring components
  const monthlyComps = components.filter(
    (c) => c.frequency === "monthly" && !c.is_system_managed && c.amount_rupees > 0
  );
  const monthlyPaise = monthlyComps.reduce(
    (acc, c) => acc + Math.round(c.amount_rupees * 100),
    0
  );

  // 2. Quarterly components
  const quarterlyComps = components.filter(
    (c) => c.frequency === "quarterly" && !c.is_system_managed && c.amount_rupees > 0
  );
  const quarterlyPaise = quarterlyComps.reduce(
    (acc, c) => acc + Math.round(c.amount_rupees * 100),
    0
  );

  // 3. Half-Yearly components
  const halfYearlyComps = components.filter(
    (c) => c.frequency === "half_yearly" && !c.is_system_managed && c.amount_rupees > 0
  );
  const halfYearlyTermPaise = halfYearlyComps.reduce(
    (acc, c) => acc + Math.round(c.amount_rupees * 100),
    0
  );

  // 4. Annual & One-Time components
  const annualComps = components.filter(
    (c) => (c.frequency === "yearly" || c.frequency === "one_time") && !c.is_system_managed && c.amount_rupees > 0
  );
  const annualPaise = annualComps.reduce(
    (acc, c) => acc + Math.round(c.amount_rupees * 100),
    0
  );

  const recurringNames = monthlyComps.map((c) => c.name.replace(/ Fee$/i, "")).join(" + ");
  const quarterlyNames = quarterlyComps.map((c) => c.name).join(" + ");
  const halfYearlyNames = halfYearlyComps.map((c) => c.name).join(" + ");
  const annualNames = annualComps.map((c) => c.name).join(" + ");

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

    return quarters.map((q, idx) => {
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
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. MONTHLY BILLING CYCLE (Exactly 12 Installments)
  // ─────────────────────────────────────────────────────────────────────────────
  if (billingCycle === "monthly") {
    const installments: GeneratedInstallment[] = [];
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
    return installments;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. HALF-YEARLY BILLING CYCLE (Exactly 2 Terms)
  // ─────────────────────────────────────────────────────────────────────────────
  if (billingCycle === "half_yearly") {
    const halves = [
      { name: "Term 1 (Half Year 1)", mStart: 0, mEnd: 5 },
      { name: "Term 2 (Half Year 2)", mStart: 6, mEnd: 11 },
    ];

    return halves.map((h, idx) => {
      const pStart = new Date(startYear, startMonth + h.mStart, 1);
      const pEnd = new Date(startYear, startMonth + h.mEnd + 1, 0);
      const dDate = new Date(startYear, startMonth + h.mStart, dueDay);

      // Monthly * 6, Quarterly * 2, Half-Yearly * 1
      let instPaise = monthlyPaise * 6 + quarterlyPaise * 2 + halfYearlyTermPaise;
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
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. ANNUAL BILLING CYCLE (1 Session Installment)
  // ─────────────────────────────────────────────────────────────────────────────
  const fullYearPaise =
    monthlyPaise * 12 +
    quarterlyPaise * 4 +
    halfYearlyTermPaise * 2 +
    annualPaise;

  const dDate = new Date(startYear, startMonth, dueDay);
  const incComps: string[] = [];
  if (monthlyComps.length > 0) incComps.push(`${recurringNames || "Tuition"} (12 mos)`);
  if (quarterlyComps.length > 0) incComps.push(`${quarterlyNames} (4 qtrs)`);
  if (halfYearlyComps.length > 0) incComps.push(`${halfYearlyNames} (2 terms)`);
  if (annualComps.length > 0) annualComps.forEach((c) => incComps.push(c.name));

  const pStart = new Date(startYear, startMonth, 1);
  const pEnd = new Date(startYear, startMonth + 12, 0);

  return [
    {
      installment_number: 1,
      label: `Annual Session ${academicYear.label || `${academicYear.start_year}–${academicYear.end_year}`}`,
      period_start: formatIso(pStart),
      period_end: formatIso(pEnd),
      due_date: formatDisplay(dDate),
      base_amount_paise: fullYearPaise,
      base_amount_rupees: Math.round(fullYearPaise / 100),
      included_components: incComps.length > 0 ? incComps : ["Full Academic Fee Components"],
    },
  ];
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

  // 1. Calculate base academic components in paise
  const monthlyComps = components.filter(
    (c) => c.frequency === "monthly" && !c.is_system_managed && c.amount_rupees > 0
  );
  const monthly_recurring_paise = monthlyComps.reduce(
    (acc, c) => acc + Math.round(c.amount_rupees * 100),
    0
  );

  const annualComps = components.filter(
    (c) => (c.frequency === "yearly" || c.frequency === "one_time") && !c.is_system_managed && c.amount_rupees > 0
  );
  const annual_onetime_paise = annualComps.reduce(
    (acc, c) => acc + Math.round(c.amount_rupees * 100),
    0
  );

  const quarterlyComps = components.filter(
    (c) => c.frequency === "quarterly" && !c.is_system_managed && c.amount_rupees > 0
  );
  const quarterly_annual_paise = quarterlyComps.reduce(
    (acc, c) => acc + Math.round(c.amount_rupees * 100 * 4),
    0
  );

  const halfYearlyComps = components.filter(
    (c) => c.frequency === "half_yearly" && !c.is_system_managed && c.amount_rupees > 0
  );
  const half_yearly_annual_paise = halfYearlyComps.reduce(
    (acc, c) => acc + Math.round(c.amount_rupees * 100 * 2),
    0
  );

  const base_annual_per_student_paise =
    monthly_recurring_paise * 12 + annual_onetime_paise + half_yearly_annual_paise + quarterly_annual_paise;

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
    monthly_recurring_paise,
    monthly_recurring_rupees: Math.round(monthly_recurring_paise / 100),
    quarterly_annual_paise,
    quarterly_annual_rupees: Math.round(quarterly_annual_paise / 100),
    annual_onetime_paise,
    annual_onetime_rupees: Math.round(annual_onetime_paise / 100),
    half_yearly_annual_paise,
    half_yearly_annual_rupees: Math.round(half_yearly_annual_paise / 100),
    base_annual_per_student_paise,
    base_annual_per_student_rupees: Math.round(base_annual_per_student_paise / 100),

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
