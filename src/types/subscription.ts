/**
 * Subscription Domain Types for MyZkool
 */

export type BillingCycle = "monthly" | "six_months" | "yearly";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "incomplete";

export type PaymentMethod =
  | "trial"
  | "upi"
  | "card"
  | "netbanking"
  | "offline_invoice"
  | "pending";

export type PaymentStatus = "trial" | "pending" | "paid" | "failed";

export interface SubscriptionPlan {
  id: string;
  slug: "basic" | "pro" | "custom" | string;
  name: string;
  description: string;
  price_monthly: number | null;
  price_six_months: number | null;
  price_yearly: number | null;
  currency: string;
  student_capacity_label: string;
  max_students: number | null;
  max_staff: number | null;
  trial_days: number;
  features: string[];
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface SchoolSubscription {
  id: string;
  school_id: string;
  plan_id: string;
  billing_cycle: BillingCycle;
  status: SubscriptionStatus;
  trial_starts_at: string;
  trial_ends_at: string;
  current_period_starts_at: string;
  current_period_ends_at: string;
  amount: number;
  currency: string;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  plan?: SubscriptionPlan;
}

export interface PlanPriceCalculation {
  planSlug: string;
  billingCycle: BillingCycle;
  baseMonthlyRate: number | null;
  durationMonths: number;
  subtotal: number | null;
  discountPercent: number;
  savingsAmount: number;
  effectiveMonthlyRate: number | null;
  gstRatePercent: number;
  gstAmount: number | null;
  totalAmountWithGst: number | null;
  formattedSubtotal: string;
  formattedGst: string;
  formattedTotal: string;
  isCustomQuote: boolean;
}

export interface SubscriptionSelectionInput {
  schoolId: string;
  userId: string;
  planSlug: string;
  billingCycle: BillingCycle;
  startTrial?: boolean;
  notes?: string;
}

export interface SelectPlanResult {
  success: boolean;
  subscription?: SchoolSubscription;
  error?: string;
}

/**
 * Fallback / Seed Catalog of MyZkool Plans
 * Matches official Indian school pricing & capacity tiers
 */
export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "plan-basic-default",
    slug: "basic",
    name: "Basic",
    description: "Essential school website, admissions, attendance & fee collection for growing schools.",
    price_monthly: 999,
    price_six_months: 5694, // ₹949/mo (5% off)
    price_yearly: 10789,    // ₹899/mo (10% off)
    currency: "INR",
    student_capacity_label: "Up to 800 students",
    max_students: 800,
    max_staff: 50,
    trial_days: 14,
    features: [
      "Website Builder & School Subdomain",
      "Admissions Pipeline & Lead Capture",
      "Fee Collection with 1-Click UPI Links",
      "Daily Attendance Register",
      "Direct WhatsApp Parent Alerts",
      "Encrypted Tenant Data Isolation"
    ],
    is_popular: false,
    is_active: true,
    sort_order: 1
  },
  {
    id: "plan-pro-default",
    slug: "pro",
    name: "Pro",
    description: "Complete school ERP for Indian K-12 schools with exams, timetable, transport, and priority support.",
    price_monthly: 1799,
    price_six_months: 10254, // ₹1,709/mo (5% off)
    price_yearly: 19429,     // ₹1,619/mo (10% off)
    currency: "INR",
    student_capacity_label: "Up to 1,800 students",
    max_students: 1800,
    max_staff: 150,
    trial_days: 14,
    features: [
      "Everything in Basic Plan",
      "CBSE, ICSE & State Board Report Cards",
      "Automated Timetable & Period Scheduler",
      "Staff & Student Digital Registers",
      "School Bus & Transport Tracking",
      "Priority WhatsApp Administrative Support",
      "Data Export & Statutory Audit Reports"
    ],
    is_popular: true,
    is_active: true,
    sort_order: 2
  },
  {
    id: "plan-custom-default",
    slug: "custom",
    name: "Custom",
    description: "Tailored infrastructure for large multi-branch institutions requiring custom integrations and dedicated support.",
    price_monthly: null,
    price_six_months: null,
    price_yearly: null,
    currency: "INR",
    student_capacity_label: "1,800+ students",
    max_students: null,
    max_staff: null,
    trial_days: 14,
    features: [
      "Everything in Pro Plan",
      "Multi-branch Centralized Management",
      "Dedicated Onboarding & Account Specialist",
      "Custom MIS & Board Compliance Analytics",
      "Dedicated Infrastructure Isolation",
      "24/7 SLA Priority Phone & WhatsApp Escalation"
    ],
    is_popular: false,
    is_active: true,
    sort_order: 3
  }
];
