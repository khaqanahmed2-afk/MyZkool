/**
 * Subscription Service Layer for MyZkool
 * 
 * Handles:
 * - Dynamic loading of subscription plans from Supabase (with fallback seed catalog)
 * - Calculation of plan pricing, discounts (5% for 6-month, 10% for annual), and 18% GST
 * - 14-day free trial activation and school subscription record management
 * - Strict multi-tenant isolation by school_id
 * - Onboarding step progression (Step 5 to Step 6: Website Setup) with non-regression logic
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type {
  SubscriptionPlan,
  BillingCycle,
  SchoolSubscription,
  PlanPriceCalculation,
  SubscriptionSelectionInput,
  SelectPlanResult,
} from "../types/subscription";
import { DEFAULT_SUBSCRIPTION_PLANS } from "../types/subscription";

export const SUBSCRIPTION_CACHE_KEY_PREFIX = "myzkool_subscription_";

export const formatINR = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return "Custom Quote";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatINRCents = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return "Custom Quote";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Loads all active subscription plans from database or fallback catalog
 */
export async function getSubscriptionPlans(): Promise<{
  plans: SubscriptionPlan[];
  error?: string;
}> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (!error && data && data.length > 0) {
        const plans: SubscriptionPlan[] = data.map((item) => ({
          id: item.id,
          slug: item.slug,
          name: item.name,
          description: item.description,
          price_monthly: item.price_monthly ? Number(item.price_monthly) : null,
          price_six_months: item.price_six_months ? Number(item.price_six_months) : null,
          price_yearly: item.price_yearly ? Number(item.price_yearly) : null,
          currency: item.currency || "INR",
          student_capacity_label: item.student_capacity_label,
          max_students: item.max_students,
          max_staff: item.max_staff,
          trial_days: item.trial_days || 14,
          features: Array.isArray(item.features) ? item.features : [],
          is_popular: Boolean(item.is_popular),
          is_active: Boolean(item.is_active),
          sort_order: item.sort_order || 0,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }));
        return { plans };
      }
    } catch {
      // Table may not yet be initialized in remote schema; fallback cleanly
    }
  }

  // Resilient fallback to predefined MyZkool plans
  return { plans: DEFAULT_SUBSCRIPTION_PLANS };
}

/**
 * Finds a specific plan by slug
 */
export async function getPlanBySlug(
  slug: string
): Promise<{ plan: SubscriptionPlan | null; error?: string }> {
  const { plans } = await getSubscriptionPlans();
  const found = plans.find(
    (p) => p.slug.toLowerCase() === slug.trim().toLowerCase()
  );
  return { plan: found || null };
}

/**
 * Calculates itemized pricing for a given plan and billing cycle
 */
export function calculatePlanPricing(
  plan: SubscriptionPlan,
  billingCycle: BillingCycle
): PlanPriceCalculation {
  const isCustomQuote = plan.slug.toLowerCase() === "custom" || plan.price_monthly === null;

  if (isCustomQuote) {
    return {
      planSlug: plan.slug,
      billingCycle,
      baseMonthlyRate: null,
      durationMonths: billingCycle === "monthly" ? 1 : billingCycle === "six_months" ? 6 : 12,
      subtotal: null,
      discountPercent: 0,
      savingsAmount: 0,
      effectiveMonthlyRate: null,
      gstRatePercent: 18,
      gstAmount: null,
      totalAmountWithGst: null,
      formattedSubtotal: "Custom Quote",
      formattedGst: "Custom Quote",
      formattedTotal: "Custom Quote",
      isCustomQuote: true,
    };
  }

  const baseMonthlyRate = plan.price_monthly ?? 0;
  let durationMonths = 1;
  let discountPercent = 0;
  let subtotal = baseMonthlyRate;

  if (billingCycle === "monthly") {
    durationMonths = 1;
    discountPercent = 0;
    subtotal = plan.price_monthly ?? 0;
  } else if (billingCycle === "six_months") {
    durationMonths = 6;
    discountPercent = 5;
    subtotal = plan.price_six_months ?? Math.round(baseMonthlyRate * 6 * 0.95);
  } else if (billingCycle === "yearly") {
    durationMonths = 12;
    discountPercent = 10;
    subtotal = plan.price_yearly ?? Math.round(baseMonthlyRate * 12 * 0.9);
  }

  const effectiveMonthlyRate = Math.round(subtotal / durationMonths);
  const regularTotal = baseMonthlyRate * durationMonths;
  const savingsAmount = Math.max(0, regularTotal - subtotal);
  const gstRatePercent = 18;
  const gstAmount = Math.round(subtotal * 0.18 * 100) / 100;
  const totalAmountWithGst = Math.round((subtotal + gstAmount) * 100) / 100;

  return {
    planSlug: plan.slug,
    billingCycle,
    baseMonthlyRate,
    durationMonths,
    subtotal,
    discountPercent,
    savingsAmount,
    effectiveMonthlyRate,
    gstRatePercent,
    gstAmount,
    totalAmountWithGst,
    formattedSubtotal: formatINR(subtotal),
    formattedGst: formatINRCents(gstAmount),
    formattedTotal: formatINRCents(totalAmountWithGst),
    isCustomQuote: false,
  };
}

/**
 * Retrieves the current subscription for a school
 */
export async function getCurrentSchoolSubscription(
  schoolId: string
): Promise<{ subscription: SchoolSubscription | null; error?: string }> {
  if (!schoolId) {
    return { subscription: null, error: "school_id is required." };
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("school_subscriptions")
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const sub: SchoolSubscription = {
          id: data.id,
          school_id: data.school_id,
          plan_id: data.plan_id,
          billing_cycle: data.billing_cycle as BillingCycle,
          status: data.status,
          trial_starts_at: data.trial_starts_at,
          trial_ends_at: data.trial_ends_at,
          current_period_starts_at: data.current_period_starts_at,
          current_period_ends_at: data.current_period_ends_at,
          amount: Number(data.amount),
          currency: data.currency,
          gst_rate: Number(data.gst_rate),
          gst_amount: Number(data.gst_amount),
          total_amount: Number(data.total_amount),
          payment_method: data.payment_method,
          payment_status: data.payment_status,
          metadata: data.metadata,
          created_at: data.created_at,
          updated_at: data.updated_at,
          plan: data.plan ? {
            id: data.plan.id,
            slug: data.plan.slug,
            name: data.plan.name,
            description: data.plan.description,
            price_monthly: data.plan.price_monthly ? Number(data.plan.price_monthly) : null,
            price_six_months: data.plan.price_six_months ? Number(data.plan.price_six_months) : null,
            price_yearly: data.plan.price_yearly ? Number(data.plan.price_yearly) : null,
            currency: data.plan.currency || "INR",
            student_capacity_label: data.plan.student_capacity_label,
            max_students: data.plan.max_students,
            max_staff: data.plan.max_staff,
            trial_days: data.plan.trial_days || 14,
            features: Array.isArray(data.plan.features) ? data.plan.features : [],
            is_popular: Boolean(data.plan.is_popular),
            is_active: Boolean(data.plan.is_active),
            sort_order: data.plan.sort_order || 0,
          } : undefined,
        };
        return { subscription: sub };
      }
    } catch {
      // Non-fatal, proceed to check localStorage cache
    }
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(`${SUBSCRIPTION_CACHE_KEY_PREFIX}${schoolId}`);
    if (raw) {
      const parsed: SchoolSubscription = JSON.parse(raw);
      // Ensure plan details are populated
      if (!parsed.plan) {
        const { plan } = await getPlanBySlug(parsed.plan_id);
        if (plan) parsed.plan = plan;
      }
      return { subscription: parsed };
    }
  } catch {
    // Non-fatal
  }

  return { subscription: null };
}

export const getSchoolSubscription = getCurrentSchoolSubscription;

/**
 * Selects a plan, starts a 14-day free trial or confirms selection,
 * persists the subscription, and advances onboarding step from 5 to 6.
 */
export async function selectSchoolPlan(
  input: SubscriptionSelectionInput
): Promise<SelectPlanResult> {
  const { schoolId, userId, planSlug, billingCycle } = input;
  const startTrial = input.startTrial !== false; // defaults to true

  if (!schoolId) {
    return { success: false, error: "school_id is required." };
  }
  if (!userId) {
    return { success: false, error: "User authentication session is required." };
  }
  if (!planSlug) {
    return { success: false, error: "Please choose a school plan." };
  }

  // Retrieve plan details
  const { plan, error: planError } = await getPlanBySlug(planSlug);
  if (planError || !plan) {
    return { success: false, error: `Plan '${planSlug}' was not found.` };
  }

  // Calculate pricing breakdown
  const pricing = calculatePlanPricing(plan, billingCycle);

  const now = new Date();
  const trialDays = plan.trial_days || 14;
  const trialEnds = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

  // Period ends depending on billing cycle
  const periodEnds = new Date(now);
  if (billingCycle === "monthly") {
    periodEnds.setMonth(periodEnds.getMonth() + 1);
  } else if (billingCycle === "six_months") {
    periodEnds.setMonth(periodEnds.getMonth() + 6);
  } else if (billingCycle === "yearly") {
    periodEnds.setFullYear(periodEnds.getFullYear() + 1);
  }

  const subscriptionRecord: SchoolSubscription = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `sub-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    school_id: schoolId,
    plan_id: plan.id,
    billing_cycle: billingCycle,
    status: startTrial ? "trialing" : "active",
    trial_starts_at: now.toISOString(),
    trial_ends_at: trialEnds.toISOString(),
    current_period_starts_at: now.toISOString(),
    current_period_ends_at: periodEnds.toISOString(),
    amount: pricing.subtotal || 0,
    currency: "INR",
    gst_rate: 18,
    gst_amount: pricing.gstAmount || 0,
    total_amount: pricing.totalAmountWithGst || 0,
    payment_method: startTrial ? "trial" : "pending",
    payment_status: startTrial ? "trial" : "pending",
    metadata: {
      plan_slug: plan.slug,
      plan_name: plan.name,
      notes: input.notes || "Configured during School Onboarding Step 5",
      is_trial: startTrial,
      trial_duration_days: trialDays,
    },
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    plan,
  };

  // 1. Persist to Supabase if configured
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("school_subscriptions")
        .insert({
          id: subscriptionRecord.id,
          school_id: schoolId,
          plan_id: plan.id.startsWith("plan-") ? undefined : plan.id, // Only use DB UUID if not fallback ID
          billing_cycle: billingCycle,
          status: subscriptionRecord.status,
          trial_starts_at: subscriptionRecord.trial_starts_at,
          trial_ends_at: subscriptionRecord.trial_ends_at,
          current_period_starts_at: subscriptionRecord.current_period_starts_at,
          current_period_ends_at: subscriptionRecord.current_period_ends_at,
          amount: subscriptionRecord.amount,
          currency: subscriptionRecord.currency,
          gst_rate: subscriptionRecord.gst_rate,
          gst_amount: subscriptionRecord.gst_amount,
          total_amount: subscriptionRecord.total_amount,
          payment_method: subscriptionRecord.payment_method,
          payment_status: subscriptionRecord.payment_status,
          metadata: subscriptionRecord.metadata,
        })
        .select()
        .maybeSingle();

      if (!error && data) {
        subscriptionRecord.id = data.id;
      }
    } catch (err) {
      console.warn("Supabase school_subscriptions insert note:", err);
    }
  }

  // 2. Persist to localStorage
  try {
    localStorage.setItem(
      `${SUBSCRIPTION_CACHE_KEY_PREFIX}${schoolId}`,
      JSON.stringify(subscriptionRecord)
    );
  } catch {
    // Non-fatal
  }

  // 3. Advance onboarding step from 5 to 6 (Website Setup) with non-regression
  const progressResult = await saveSubscriptionSetupProgress({
    schoolId,
    userId,
  });

  if (!progressResult.success) {
    return {
      success: false,
      subscription: subscriptionRecord,
      error: progressResult.error,
    };
  }

  return {
    success: true,
    subscription: subscriptionRecord,
  };
}

/**
 * Advances the school onboarding step to Step 6 (/onboarding/website)
 * using the non-regression principle (Math.max(currentStep, 6))
 */
export async function saveSubscriptionSetupProgress({
  schoolId,
  userId,
}: {
  schoolId: string;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!schoolId || !userId) {
    return {
      success: false,
      error: "school_id and user_id are required to update onboarding progress.",
    };
  }

  const timestamp = new Date().toISOString();

  if (isSupabaseConfigured) {
    try {
      const { data: currentSchool } = await supabase
        .from("schools")
        .select("onboarding_step")
        .eq("id", schoolId)
        .maybeSingle();

      const currentStep = currentSchool?.onboarding_step || 5;
      const newStep = Math.max(currentStep, 6);

      await supabase
        .from("schools")
        .update({
          onboarding_step: newStep,
          updated_at: timestamp,
        })
        .eq("id", schoolId);

      await supabase
        .from("profiles")
        .update({
          current_onboarding_step: "/onboarding/website",
          updated_at: timestamp,
        })
        .eq("auth_id", userId);

      await supabase.auth.updateUser({
        data: {
          onboarding_step: newStep,
          current_onboarding_step: "/onboarding/website",
        },
      });
    } catch (err) {
      console.warn("Supabase onboarding progress update error:", err);
    }
  }

  // Local storage update with non-regression
  try {
    const schoolKey = `myzkool_school_profile_${userId}`;
    const raw = localStorage.getItem(schoolKey);
    if (raw) {
      const cached = JSON.parse(raw);
      cached.onboarding_step = Math.max(cached.onboarding_step || 5, 6);
      localStorage.setItem(schoolKey, JSON.stringify(cached));
    }
  } catch {
    // Non-fatal
  }

  return { success: true };
}

export const selectSubscriptionPlan = selectSchoolPlan;
export const saveSubscriptionProgress = saveSubscriptionSetupProgress;
