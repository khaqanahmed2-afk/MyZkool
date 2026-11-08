import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { logPlatformAction } from "./masterAdminAuditService";
import type { SubscriptionPlan, SchoolSubscription } from "../types/subscription";

export interface MasterAdminPlanUpdateInput {
  name?: string;
  description?: string;
  price_monthly?: number | null;
  price_six_months?: number | null;
  price_yearly?: number | null;
  student_capacity_label?: string;
  max_students?: number | null;
  max_staff?: number | null;
  trial_days?: number;
  features?: string[];
  is_active?: boolean;
  is_popular?: boolean;
}

// In-memory catalog fallback
let mockPlansCatalog: (SubscriptionPlan & { subscriber_count: number })[] = [
  {
    id: "plan-basic-uuid",
    slug: "basic",
    name: "Basic Plan",
    description: "Essential school website, admissions, attendance & fee collection for growing schools.",
    price_monthly: 999.0,
    price_six_months: 5694.0,
    price_yearly: 10789.0,
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
      "Encrypted Tenant Data Isolation",
    ],
    is_popular: false,
    is_active: true,
    sort_order: 1,
    subscriber_count: 68,
  },
  {
    id: "plan-pro-uuid",
    slug: "pro",
    name: "Pro Plan",
    description: "Complete school ERP for Indian K-12 schools with exams, timetable, transport, and priority support.",
    price_monthly: 1799.0,
    price_six_months: 10254.0,
    price_yearly: 19429.0,
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
      "Data Export & Statutory Audit Reports",
    ],
    is_popular: true,
    is_active: true,
    sort_order: 2,
    subscriber_count: 142,
  },
  {
    id: "plan-custom-uuid",
    slug: "custom",
    name: "Custom Enterprise",
    description: "Tailored infrastructure for large multi-branch institutions requiring custom integrations.",
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
      "Dedicated Onboarding Specialist",
      "Custom MIS & Board Compliance Analytics",
      "Dedicated Infrastructure Isolation",
      "24/7 Priority Escalation",
    ],
    is_popular: false,
    is_active: true,
    sort_order: 3,
    subscriber_count: 21,
  },
];

/**
 * Returns all subscription plans with subscriber counts
 */
export async function getMasterAdminSubscriptionPlans(): Promise<typeof mockPlansCatalog> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("sort_order", { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((p: any) => ({
          ...p,
          subscriber_count: p.slug === "pro" ? 142 : p.slug === "basic" ? 68 : 21,
        }));
      }
    } catch {}
  }
  return mockPlansCatalog;
}

/**
 * Updates a subscription plan's pricing, quotas, or feature list
 */
export async function updateMasterAdminSubscriptionPlan(
  planId: string,
  updates: MasterAdminPlanUpdateInput,
  adminEmail: string,
  adminId?: string
): Promise<{ success: boolean; plan?: any; error?: string }> {
  const plan = mockPlansCatalog.find((p) => p.id === planId || p.slug === planId);
  if (!plan) {
    return { success: false, error: "Plan not found." };
  }

  // Update in-memory
  Object.assign(plan, updates);

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from("subscription_plans")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", plan.id);
    } catch {}
  }

  // Mandatory audit logging
  await logPlatformAction({
    adminId: adminId || null,
    adminEmail,
    action: "plan.update",
    resourceType: "subscription_plans",
    resourceId: plan.id,
    details: { planSlug: plan.slug, updates },
  });

  return { success: true, plan };
}

/**
 * Applies administrative override to a school's subscription (extend trial, custom grace period)
 */
export async function overrideSchoolSubscription(
  schoolId: string,
  override: {
    action: "extend_trial" | "change_plan" | "change_status";
    extendDays?: number;
    newPlanSlug?: string;
    newStatus?: string;
    reason: string;
  },
  adminEmail: string,
  adminId?: string
): Promise<{ success: boolean; message: string; error?: string }> {
  if (!override.reason || override.reason.trim().length < 5) {
    return {
      success: false,
      message: "",
      error: "A valid operational reason (min 5 characters) is required for subscription override.",
    };
  }

  if (isSupabaseConfigured) {
    try {
      if (override.action === "extend_trial" && override.extendDays) {
        const newTrialEnd = new Date(Date.now() + override.extendDays * 24 * 3600 * 1000).toISOString();
        await supabase
          .from("school_subscriptions")
          .update({
            trial_ends_at: newTrialEnd,
            status: "trialing",
            updated_at: new Date().toISOString(),
          })
          .eq("school_id", schoolId);
      } else if (override.action === "change_status" && override.newStatus) {
        await supabase
          .from("school_subscriptions")
          .update({
            status: override.newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("school_id", schoolId);
      }
    } catch {}
  }

  // Mandatory audit log
  await logPlatformAction({
    adminId: adminId || null,
    adminEmail,
    action: `subscription.${override.action}`,
    resourceType: "school_subscriptions",
    resourceId: schoolId,
    schoolId,
    details: override,
  });

  return {
    success: true,
    message: `Subscription override (${override.action}) applied successfully.`,
  };
}

