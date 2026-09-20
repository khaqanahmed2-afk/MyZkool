/**
 * School and Onboarding Domain Types for MyZkool
 */

export type SchoolType =
  | "k12"
  | "primary"
  | "middle"
  | "secondary"
  | "senior_secondary"
  | "preschool"
  | "other";

export type AffiliationBoard =
  | "cbse"
  | "icse"
  | "state_board"
  | "cambridge"
  | "ib"
  | "matriculation"
  | "other";

/**
 * Persisted School entity in Supabase/PostgreSQL
 */
export interface School {
  id: string; // Tenant Root Identifier (school_id)
  name: string;
  subdomain: string;
  school_type: SchoolType;
  affiliation_board?: AffiliationBoard | string;
  official_email: string;
  contact_phone: string;
  address: string;
  city: string;
  state: string;
  pin_code: string;
  logo_url?: string;
  onboarding_completed: boolean;
  onboarding_step: number; // 1 to 6
  created_by: string; // Auth User ID
  created_at: string;
  updated_at: string;
}

/**
 * School Profile Form Input for Step 1
 */
export interface SchoolProfileInput {
  name: string;
  subdomain: string;
  school_type: SchoolType;
  affiliation_board?: AffiliationBoard | string;
  official_email: string;
  contact_phone: string;
  address: string;
  city: string;
  state: string;
  pin_code: string;
}

/**
 * Subdomain check status states
 */
export type SubdomainAvailabilityState =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "invalid"
  | "reserved";

export interface SubdomainCheckResult {
  status: SubdomainAvailabilityState;
  isAvailable: boolean;
  message: string;
  subdomain: string;
}

/**
 * Standard 6-step onboarding definition
 */
export interface OnboardingStepDefinition {
  stepNumber: number;
  title: string;
  subtitle: string;
  route: string;
}

export const ONBOARDING_STEPS: OnboardingStepDefinition[] = [
  { stepNumber: 1, title: "School profile", subtitle: "Identity and location", route: "/onboarding/school" },
  { stepNumber: 2, title: "Academic year", subtitle: "Calendar and terms", route: "/onboarding/academics" },
  { stepNumber: 3, title: "Classes", subtitle: "Grade structure", route: "/onboarding/classes" },
  { stepNumber: 4, title: "Plan", subtitle: "Plan and billing", route: "/onboarding/subscription" },
  { stepNumber: 5, title: "Website", subtitle: "Public portal", route: "/onboarding/website" },
  { stepNumber: 6, title: "Launch", subtitle: "Ready to launch", route: "/onboarding/complete" },
];
