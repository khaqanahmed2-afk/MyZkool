import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { OnboardingLayout } from "../../components/onboarding/OnboardingLayout";
import { getSchoolForCurrentUser } from "../../services/schoolService";
import {
  getSubscriptionPlans,
  calculatePlanPricing,
  getCurrentSchoolSubscription,
  selectSchoolPlan,
  formatINR,
  formatINRCents,
} from "../../services/subscriptionService";
import type {
  SubscriptionPlan,
  BillingCycle,
  SchoolSubscription,
  PlanPriceCalculation,
} from "../../types/subscription";
import type { School } from "../../types/school";
import { initiateSubscriptionCheckout } from "../../services/razorpayService";
import {
  Check,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Users,
  Building2,
  Receipt,
  Clock,
  Sparkles,
  X,
  CreditCard,
  CheckCircle2,
  Lock,
} from "lucide-react";

export default function Subscription() {
  const { user, profile, refreshSession, signOut } = useAuth();
  const navigate = useNavigate();

  // Core Data State
  const [school, setSchool] = useState<School | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [existingSubscription, setExistingSubscription] = useState<SchoolSubscription | null>(null);

  // Form State
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string>("pro"); // Pro is default recommended
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // UI State
  const [paymentMode, setPaymentMode] = useState<"pay_now" | "free_trial">("pay_now");
  const [isPayingRazorpay, setIsPayingRazorpay] = useState<boolean>(false);
  const [verifiedPaymentInfo, setVerifiedPaymentInfo] = useState<{
    orderId: string;
    paymentId: string;
    amount: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSavingAndExiting, setIsSavingAndExiting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [prerequisiteError, setPrerequisiteError] = useState<{
    msg: string;
    route: string;
    linkText: string;
  } | null>(null);

  // Redirect if onboarding already finished
  useEffect(() => {
    if (profile?.onboarding_completed) {
      navigate("/admin", { replace: true });
    }
  }, [profile?.onboarding_completed, navigate]);

  // Load School, Plans & Existing Subscription
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setPlansError(null);

    try {
      if (!user) {
        setIsLoading(false);
        return;
      }

      // 1. Fetch Current School
      const { school: currentSchool, error: schoolErr } = await getSchoolForCurrentUser(
        user.id,
        profile?.school_id
      );

      if (schoolErr || !currentSchool) {
        setPrerequisiteError({
          msg: "School profile not found. Please complete Step 1 (School Profile) first.",
          route: "/onboarding/school",
          linkText: "Go to Step 1: School Profile",
        });
        setIsLoading(false);
        return;
      }

      setSchool(currentSchool);

      // 2. Fetch Subscription Plans Catalog
      const { plans: loadedPlans, error: plansErr } = await getSubscriptionPlans();

      if (plansErr || !loadedPlans || loadedPlans.length === 0) {
        setPlansError("Failed to load subscription tiers. Please check your connection and try again.");
      } else {
        setPlans(loadedPlans);
      }

      // 3. Fetch Existing Subscription if resuming
      const { subscription: currentSub } = await getCurrentSchoolSubscription(currentSchool.id);

      if (currentSub) {
        setExistingSubscription(currentSub);
        if (currentSub.plan?.slug) {
          setSelectedPlanSlug(currentSub.plan.slug);
        }
        if (currentSub.billing_cycle) {
          setBillingCycle(currentSub.billing_cycle);
        }
      }
    } catch (err) {
      console.error("Subscription load error:", err);
      setPlansError("An unexpected error occurred while loading subscription data.");
    } finally {
      setIsLoading(false);
    }
  }, [user, profile?.school_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Selected Plan Object & Pricing Calculation
  const selectedPlan = useMemo(() => {
    return (
      plans.find((p) => p.slug === selectedPlanSlug) ||
      plans.find((p) => p.slug === "pro") ||
      plans[0]
    );
  }, [plans, selectedPlanSlug]);

  const pricingCalculation: PlanPriceCalculation | null = useMemo(() => {
    if (!selectedPlan) return null;
    return calculatePlanPricing(selectedPlan, billingCycle);
  }, [selectedPlan, billingCycle]);

  // Trial end date calculation (14 days from trial start or now)
  const { trialEndFormatted, daysRemainingInTrial, isExistingTrialActive } = useMemo(() => {
    const now = Date.now();
    let trialEndMs: number;
    let isTrialActive = false;
    let daysRemaining = 14;

    if (existingSubscription?.status === "trialing" && existingSubscription.trial_ends_at) {
      trialEndMs = new Date(existingSubscription.trial_ends_at).getTime();
      isTrialActive = trialEndMs > now;
      daysRemaining = Math.max(0, Math.ceil((trialEndMs - now) / (1000 * 60 * 60 * 24)));
    } else {
      const d = new Date();
      d.setDate(d.getDate() + (selectedPlan?.trial_days || 14));
      trialEndMs = d.getTime();
      daysRemaining = selectedPlan?.trial_days || 14;
    }

    const formattedDate = new Date(trialEndMs).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    return {
      trialEndFormatted: formattedDate,
      daysRemainingInTrial: daysRemaining,
      isExistingTrialActive: isTrialActive,
    };
  }, [existingSubscription, selectedPlan]);

  // Plan Selection Handler
  const handleSelectPlan = (slug: string) => {
    if (slug !== selectedPlanSlug) {
      setSelectedPlanSlug(slug);
      setIsDirty(true);
      setErrorMessage(null);
    }
  };

  // Billing Cycle Switcher Handler
  const handleSelectBillingCycle = (cycle: BillingCycle) => {
    if (cycle !== billingCycle) {
      setBillingCycle(cycle);
      setIsDirty(true);
      setErrorMessage(null);
    }
  };

  // Dedicated Razorpay Standard Web Checkout Handler for School Subscription
  const handleRazorpaySubscriptionPay = async () => {
    if (!school || !user || !selectedPlan) {
      setErrorMessage("Authentication session or school profile is missing.");
      return;
    }

    if (selectedPlan.slug === "custom") {
      setErrorMessage(
        "Custom enterprise plans require tailored SLA terms. Please continue with the 14-day free trial or contact support."
      );
      return;
    }

    setIsPayingRazorpay(true);
    setErrorMessage(null);

    try {
      await initiateSubscriptionCheckout({
        schoolId: school.id,
        schoolName: school.name,
        planSlug: selectedPlanSlug,
        planName: selectedPlan.name,
        billingCycle,
        userEmail: user.email,
        userPhone: school.contact_phone,
        userName: profile?.full_name || user.email,
        onSuccess: async (_verifyResult, paymentData) => {
          setIsPayingRazorpay(false);
          setVerifiedPaymentInfo({
            orderId: paymentData.razorpay_order_id,
            paymentId: paymentData.razorpay_payment_id,
            amount: pricingCalculation?.formattedTotal || "₹0.00",
          });

          // Sync local subscription state
          try {
            await selectSchoolPlan({
              schoolId: school.id,
              userId: user.id,
              planSlug: selectedPlanSlug,
              billingCycle,
              startTrial: false, // Paid activation!
              notes: `Razorpay verified: ${paymentData.razorpay_payment_id}`,
            });
          } catch (cacheErr) {
            console.warn("Local subscription sync note:", cacheErr);
          }

          if (refreshSession) {
            await refreshSession();
          }

          // Automatically proceed to Step 5 (Website Setup) after brief confirmation
          setTimeout(() => {
            navigate("/onboarding/website");
          }, 1500);
        },
        onError: (errMsg) => {
          setIsPayingRazorpay(false);
          setErrorMessage(errMsg || "Payment could not be completed.");
        },
        onDismiss: () => {
          setIsPayingRazorpay(false);
        },
      });
    } catch (err: any) {
      setIsPayingRazorpay(false);
      setErrorMessage(err?.message || "Failed to initialize payment gateway.");
    }
  };

  // Form Submit Handler: Proceed to Step 5 (Website Setup)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !user) {
      setErrorMessage("Authentication session or school profile is missing.");
      return;
    }

    if (!selectedPlan) {
      setErrorMessage("Please select a valid school subscription plan.");
      return;
    }

    // If user chose to pay now with Razorpay and not a custom quote
    if (paymentMode === "pay_now" && !pricingCalculation?.isCustomQuote) {
      await handleRazorpaySubscriptionPay();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await selectSchoolPlan({
        schoolId: school.id,
        userId: user.id,
        planSlug: selectedPlanSlug,
        billingCycle,
        startTrial: true,
        notes: `Configured during Onboarding Step 4 by ${user.email}`,
      });

      if (!result.success) {
        setErrorMessage(result.error || "Failed to save subscription plan selection.");
        setIsSubmitting(false);
        return;
      }

      setIsDirty(false);

      // Refresh auth session so that updated onboarding progress is reflected
      if (refreshSession) {
        await refreshSession();
      }

      // Smooth progression to Step 5 (Website Setup)
      navigate("/onboarding/website");
    } catch (err: any) {
      console.error("selectSchoolPlan error:", err);
      setErrorMessage(err?.message || "Failed to process subscription selection. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Save & Exit Handler
  const handleSaveAndExit = async () => {
    if (!school || !user) {
      await signOut();
      navigate("/login");
      return;
    }

    if (isDirty && selectedPlan) {
      setIsSavingAndExiting(true);
      try {
        await selectSchoolPlan({
          schoolId: school.id,
          userId: user.id,
          planSlug: selectedPlanSlug,
          billingCycle,
          startTrial: true,
          notes: `Saved on exit by ${user.email}`,
        });
      } catch (err) {
        console.warn("Background save on exit note:", err);
      }
    }

    await signOut();
    navigate("/login");
  };

  // Initial Loading State
  if (isLoading) {
    return (
      <OnboardingLayout
        currentStepNumber={4}
        completedStepNumbers={[1, 2, 3]}
        title=""
        subtitle=""
        maxWidth="max-w-4xl"
        showCardWrapper={false}
      >
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#2158E0] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-[#5B6478]">
            Loading subscription plans...
          </p>
        </div>
      </OnboardingLayout>
    );
  }

  // Prerequisite Error State
  if (prerequisiteError) {
    return (
      <OnboardingLayout
        currentStepNumber={4}
        completedStepNumbers={[]}
        title="Choose your school plan"
        subtitle="Step 1 required before selecting subscription."
        maxWidth="max-w-2xl"
      >
        <div className="py-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#141A2E]">
            Previous Step Required
          </h2>
          <p className="text-sm text-[#5B6478] max-w-md mx-auto">
            {prerequisiteError.msg}
          </p>
          <div className="pt-2">
            <Link
              to={prerequisiteError.route}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2158E0] text-white rounded-lg text-sm font-medium hover:bg-[#1A46B8] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{prerequisiteError.linkText}</span>
            </Link>
          </div>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      currentStepNumber={4}
      completedStepNumbers={[1, 2, 3]}
      title=""
      subtitle=""
      maxWidth="max-w-4xl"
      showCardWrapper={false}
      onSaveAndExit={handleSaveAndExit}
      isSavingAndExiting={isSavingAndExiting}
    >
      <form onSubmit={handleSubmit} className="space-y-6" id="subscription-selection-form">
        {/* Page Title & Context Header */}
        <div className="space-y-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#141A2E] tracking-tight">
              Choose your school plan
            </h1>
            <p className="text-sm text-[#5B6478] mt-1">
              Select the plan that best fits your institution. All tiers include a 14-day free trial with zero upfront charge.
            </p>
          </div>

          {/* School & Active Plan Context Summary */}
          {school && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 py-2.5 px-3.5 bg-white border border-[#E6EAF3] rounded-lg text-xs text-[#5B6478] shadow-xs">
              <div className="flex items-center gap-1.5 font-medium text-[#141A2E]">
                <Building2 className="w-4 h-4 text-[#2158E0]" />
                <span>{school.name}</span>
              </div>
              <span className="text-[#CBD5E1] hidden sm:inline">•</span>

              {existingSubscription && (
                <div className="flex items-center gap-1.5 font-medium text-[#141A2E]">
                  <Sparkles className="w-3.5 h-3.5 text-[#2158E0]" />
                  <span>
                    Current: {existingSubscription.plan?.name || "Pro"} (
                    {isExistingTrialActive ? `${daysRemainingInTrial} days left` : existingSubscription.status}
                    )
                  </span>
                </div>
              )}

              {isDirty && (
                <div className="sm:ml-auto flex items-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved plan selection
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Unable to proceed</p>
              <p className="text-xs sm:text-sm mt-0.5 text-red-600">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-600 p-1"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Plans Error with Retry */}
        {plansError && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{plansError}</span>
            </div>
            <button
              type="button"
              onClick={loadData}
              className="font-semibold text-[#2158E0] hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Billing Period Selector */}
        <div className="bg-white border border-[#E6EAF3] rounded-xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#5B6478]">
              Billing Period
            </h2>
            <p className="text-xs text-[#5B6478] mt-0.5">
              Choose monthly or prepay 6 / 12 months for institutional discounts.
            </p>
          </div>

          <div
            role="radiogroup"
            aria-label="Billing cycle"
            className="inline-flex items-center p-1 bg-[#F1F4F9] rounded-lg border border-[#E6EAF3] w-full sm:w-auto"
          >
            <button
              type="button"
              role="radio"
              aria-checked={billingCycle === "monthly"}
              id="billing-monthly-btn"
              onClick={() => handleSelectBillingCycle("monthly")}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                billingCycle === "monthly"
                  ? "bg-white text-[#141A2E] shadow-xs"
                  : "text-[#5B6478] hover:text-[#141A2E]"
              }`}
            >
              Monthly
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={billingCycle === "six_months"}
              id="billing-six-months-btn"
              onClick={() => handleSelectBillingCycle("six_months")}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                billingCycle === "six_months"
                  ? "bg-white text-[#2158E0] shadow-xs"
                  : "text-[#5B6478] hover:text-[#141A2E]"
              }`}
            >
              <span>6 Months</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                5% off
              </span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={billingCycle === "yearly"}
              id="billing-yearly-btn"
              onClick={() => handleSelectBillingCycle("yearly")}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                billingCycle === "yearly"
                  ? "bg-white text-[#2158E0] shadow-xs"
                  : "text-[#5B6478] hover:text-[#141A2E]"
              }`}
            >
              <span>12 Months</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                10% off
              </span>
            </button>
          </div>
        </div>

        {/* 3 Comparison Plan Cards */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch"
          role="radiogroup"
          aria-label="School Plans"
        >
          {plans.map((plan) => {
            const isSelected = selectedPlanSlug === plan.slug;
            const pricing = calculatePlanPricing(plan, billingCycle);

            return (
              <div
                key={plan.id || plan.slug}
                id={`plan-card-${plan.slug}`}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => handleSelectPlan(plan.slug)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    handleSelectPlan(plan.slug);
                  }
                }}
                className={`relative rounded-xl border p-4 sm:p-5 flex flex-col justify-between cursor-pointer transition-all outline-none ${
                  isSelected
                    ? "border-[#2158E0] bg-blue-50/20 shadow-sm ring-1 ring-[#2158E0]"
                    : "border-[#E6EAF3] bg-white hover:border-[#CBD5E1]"
                }`}
              >
                {/* Recommended Badge on Pro */}
                {plan.is_popular && (
                  <div className="absolute -top-2.5 right-4 bg-[#2158E0] text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase shadow-xs">
                    Recommended
                  </div>
                )}

                <div>
                  {/* Card Header & Radio Check */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div>
                      <h3 className="text-base font-bold text-[#141A2E]">
                        {plan.name}
                      </h3>
                      <div className="inline-flex items-center gap-1 text-xs text-[#5B6478] mt-0.5">
                        <Users className="w-3.5 h-3.5 text-[#94A3B8]" />
                        <span>{plan.student_capacity_label}</span>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                        isSelected
                          ? "bg-[#2158E0] border-[#2158E0] text-white"
                          : "border-[#CBD5E1] bg-white"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  {/* Price Section */}
                  <div className="py-3 border-y border-[#F1F4F9] my-2.5">
                    {pricing.isCustomQuote ? (
                      <div>
                        <div className="text-xl font-bold text-[#141A2E]">
                          Custom Quote
                        </div>
                        <div className="text-[11px] text-[#5B6478] mt-0.5">
                          Institutions with 1,800+ students or multi-branch campuses
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl sm:text-3xl font-extrabold text-[#141A2E]">
                            ₹{pricing.effectiveMonthlyRate?.toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs text-[#5B6478]">/ month</span>
                        </div>

                        {billingCycle !== "monthly" ? (
                          <div className="text-[11px] text-emerald-700 font-medium mt-1">
                            Billed {pricing.formattedSubtotal} every {pricing.durationMonths} mos ({pricing.discountPercent}% off)
                          </div>
                        ) : (
                          <div className="text-[11px] text-[#5B6478] mt-1">
                            Billed monthly
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="space-y-2 text-xs text-[#141A2E] mt-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block">
                      Capabilities Included:
                    </span>
                    {plan.features.slice(0, 5).map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-tight text-xs text-[#334155]">{feat}</span>
                      </div>
                    ))}
                    {plan.features.length > 5 && (
                      <div className="text-[11px] text-[#2158E0] font-medium pt-0.5">
                        + {plan.features.length - 5} additional modules
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Select Button */}
                <div className="mt-4 pt-3 border-t border-[#F1F4F9]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPlan(plan.slug);
                    }}
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-[#2158E0] text-white shadow-xs"
                        : "bg-[#F1F4F9] text-[#141A2E] hover:bg-[#E2E8F0]"
                    }`}
                  >
                    {isSelected ? "Selected Plan" : "Select Plan"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Plan Summary & Pricing Breakdown */}
        {selectedPlan && pricingCalculation && (
          <div className="rounded-xl border border-[#E6EAF3] bg-white p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F1F4F9]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2158E0] flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#141A2E]">
                    Order Summary: {selectedPlan.name} Plan (
                    {billingCycle === "monthly"
                      ? "Monthly"
                      : billingCycle === "six_months"
                      ? "6 Months"
                      : "12 Months"}
                    )
                  </h3>
                  <p className="text-xs text-[#5B6478]">
                    {selectedPlan.student_capacity_label} • Dedicated tenant for {school?.name || "your school"}
                  </p>
                </div>
              </div>

              {/* Free Trial Status Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold self-start sm:self-auto">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {isExistingTrialActive
                    ? `14-Day Trial Active (${daysRemainingInTrial} days left)`
                    : "14-Day Free Trial Included"}
                </span>
              </div>
            </div>

            {/* Payment Choice Selector (Pay Now vs Free Trial) */}
            {!pricingCalculation.isCustomQuote && (
              <div className="pt-1 space-y-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5B6478]">
                  Select Payment Option
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Pay Now via Razorpay */}
                  <div
                    onClick={() => setPaymentMode("pay_now")}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      paymentMode === "pay_now"
                        ? "border-[#2158E0] bg-blue-50/50 shadow-xs"
                        : "border-[#E6EAF3] bg-white hover:border-[#CBD5E1]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            paymentMode === "pay_now"
                              ? "border-[#2158E0] bg-[#2158E0]"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {paymentMode === "pay_now" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="text-xs font-bold text-[#141A2E]">
                          Pay &amp; Activate Now
                        </span>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[#2158E0] text-white">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5B6478] mt-2 leading-relaxed">
                      Instant paid activation with Razorpay Standard Checkout &amp; official GST tax invoice.
                    </p>
                    <div className="mt-2 text-xs font-extrabold text-[#2158E0]">
                      Payable: {pricingCalculation.formattedTotal}
                    </div>
                  </div>

                  {/* Option 2: 14-Day Free Trial (Pay Later) */}
                  <div
                    onClick={() => setPaymentMode("free_trial")}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      paymentMode === "free_trial"
                        ? "border-[#2158E0] bg-blue-50/50 shadow-xs"
                        : "border-[#E6EAF3] bg-white hover:border-[#CBD5E1]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            paymentMode === "free_trial"
                              ? "border-[#2158E0] bg-[#2158E0]"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {paymentMode === "free_trial" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="text-xs font-bold text-[#141A2E]">
                          Start 14-Day Free Trial
                        </span>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-100 text-emerald-800">
                        ₹0 Today
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5B6478] mt-2 leading-relaxed">
                      Zero upfront charge today. Test all ERP modules risk-free through {trialEndFormatted}.
                    </p>
                    <div className="mt-2 text-xs font-extrabold text-emerald-700">
                      ₹0.00 Due Today
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Verified Payment Success Confirmation Banner */}
            {verifiedPaymentInfo && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-2 text-emerald-900 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Payment Verified &amp; Subscription Activated!</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px] text-emerald-700">
                  <div>Payment ID: {verifiedPaymentInfo.paymentId}</div>
                  <div>Order ID: {verifiedPaymentInfo.orderId}</div>
                </div>
                <p className="text-emerald-700 font-medium pt-1">
                  Advancing to Step 5: Website Setup...
                </p>
              </div>
            )}

            {/* Financial Breakdown (Itemized) */}
            {!pricingCalculation.isCustomQuote && (
              <div className="bg-[#F8FAFC] rounded-lg border border-[#E6EAF3] p-3.5 text-xs space-y-2">
                <div className="flex justify-between text-[#5B6478]">
                  <span>
                    Base Subscription ({pricingCalculation.durationMonths} month
                    {pricingCalculation.durationMonths > 1 ? "s" : ""})
                  </span>
                  <span>
                    {pricingCalculation.savingsAmount > 0
                      ? formatINR(pricingCalculation.baseMonthlyRate! * pricingCalculation.durationMonths)
                      : pricingCalculation.formattedSubtotal}
                  </span>
                </div>

                {pricingCalculation.savingsAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Prepay Discount ({pricingCalculation.discountPercent}% off)</span>
                    <span>-₹{pricingCalculation.savingsAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}

                <div className="flex justify-between text-[#5B6478] pt-1.5 border-t border-[#E6EAF3]">
                  <span>Subtotal (excluding GST)</span>
                  <span className="font-medium text-[#141A2E]">{pricingCalculation.formattedSubtotal}</span>
                </div>

                <div className="flex justify-between text-[#5B6478]">
                  <span>Statutory 18% GST</span>
                  <span>{pricingCalculation.formattedGst}</span>
                </div>

                <div className="flex justify-between text-sm font-bold text-[#141A2E] pt-2 border-t border-[#E6EAF3]">
                  <span>
                    {paymentMode === "pay_now" ? "Total Payable Today" : "Total Amount (after trial)"}
                  </span>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-[#2158E0]">
                      {pricingCalculation.formattedTotal}
                    </span>
                    <div className="text-[11px] font-normal text-[#5B6478]">
                      {paymentMode === "pay_now"
                        ? "Includes 18% GST • Razorpay Secured"
                        : "₹0.00 charged today"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Quote Message */}
            {pricingCalculation.isCustomQuote && (
              <div className="bg-[#F8FAFC] rounded-lg border border-[#E6EAF3] p-3.5 text-xs space-y-1.5 text-[#5B6478]">
                <p className="font-semibold text-[#141A2E]">
                  Tailored Institutional Proposal
                </p>
                <p>
                  For institutions with more than 1,800 students or multi-branch requirements, our enterprise team provides customized SLA terms and volume licensing. You can continue onboarding today with full 14-day trial access.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Bottom Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
          <Link
            to="/onboarding/classes"
            id="back-to-classes-btn"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-[#E6EAF3] bg-white text-[#5B6478] hover:text-[#141A2E] hover:border-[#CBD5E1] rounded-lg text-sm font-medium transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to classes</span>
          </Link>

          {paymentMode === "pay_now" && !pricingCalculation?.isCustomQuote ? (
            <button
              type="submit"
              id="pay-and-continue-btn"
              disabled={isPayingRazorpay || isSubmitting || !!verifiedPaymentInfo}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#2158E0] hover:bg-[#1A46B8] disabled:bg-[#94A3B8] text-white rounded-lg text-sm font-semibold transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-[#2158E0] focus:ring-offset-2 cursor-pointer"
            >
              {isPayingRazorpay ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Opening Razorpay Checkout...</span>
                </>
              ) : verifiedPaymentInfo ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Payment Complete</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Pay {pricingCalculation?.formattedTotal} &amp; Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <button
              type="submit"
              id="continue-to-website-btn"
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#2158E0] hover:bg-[#1A46B8] disabled:bg-[#94A3B8] text-white rounded-lg text-sm font-semibold transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-[#2158E0] focus:ring-offset-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving plan...</span>
                </>
              ) : (
                <>
                  <span>
                    {pricingCalculation?.isCustomQuote
                      ? "Continue with Custom Plan"
                      : isExistingTrialActive
                      ? "Continue to Website Setup"
                      : "Start 14-Day Free Trial"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </OnboardingLayout>
  );
}
