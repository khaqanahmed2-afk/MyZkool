import React, { useState, useEffect } from "react";
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
import {
  Check,
  ShieldCheck,
  Zap,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  CreditCard,
  Building2,
  Users,
  Sparkles,
  Receipt,
  Clock,
  HelpCircle,
} from "lucide-react";

export default function Subscription() {
  const { user, profile, refreshSession } = useAuth();
  const navigate = useNavigate();

  // Core Data State
  const [school, setSchool] = useState<School | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [existingSubscription, setExistingSubscription] = useState<SchoolSubscription | null>(null);

  // Form State
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string>("pro"); // Pro is default popular
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [startTrial, setStartTrial] = useState<boolean>(true);

  // UI State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [prerequisiteError, setPrerequisiteError] = useState<{
    msg: string;
    route: string;
    linkText: string;
  } | null>(null);

  // 1. Initial Load: Fetch School & Subscription Plans
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Fetch Current School
        const { school: currentSchool, error: schoolErr } = await getSchoolForCurrentUser(
          user.id,
          profile?.school_id
        );
        if (!isMounted) return;

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

        // Fetch Plans
        const { plans: loadedPlans, error: plansErr } = await getSubscriptionPlans();
        if (!isMounted) return;

        if (plansErr || !loadedPlans || loadedPlans.length === 0) {
          setErrorMessage("Failed to load subscription tiers. Using default catalog.");
        } else {
          setPlans(loadedPlans);
        }

        // Fetch Existing Subscription if user is resuming
        const { subscription: currentSub } = await getCurrentSchoolSubscription(currentSchool.id);
        if (!isMounted) return;

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
        if (isMounted) {
          setErrorMessage("An unexpected error occurred while loading subscription data.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Selected Plan Object & Pricing Calculation
  const selectedPlan = plans.find((p) => p.slug === selectedPlanSlug) || plans[1] || plans[0];
  const pricingCalculation: PlanPriceCalculation | null = selectedPlan
    ? calculatePlanPricing(selectedPlan, billingCycle)
    : null;

  // Trial end date calculation (14 days from now)
  const trialEndFormatted = (() => {
    const d = new Date();
    d.setDate(d.getDate() + (selectedPlan?.trial_days || 14));
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  })();

  // Submit Handler: Confirm Plan Selection & Proceed
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

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await selectSchoolPlan({
        schoolId: school.id,
        userId: user.id,
        planSlug: selectedPlanSlug,
        billingCycle,
        startTrial,
        notes: `Selected during onboarding by ${user.email}`,
      });

      if (!result.success) {
        setErrorMessage(result.error || "Failed to save subscription plan selection.");
        setIsSubmitting(false);
        return;
      }

      // Refresh auth session so that onboarding step is updated globally
      if (refreshSession) {
        await refreshSession();
      }

      // Smooth progression to Step 6 (Website Setup)
      navigate("/onboarding/website");
    } catch (err) {
      console.error("selectSchoolPlan error:", err);
      setErrorMessage("Failed to process subscription selection. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <OnboardingLayout
        currentStepNumber={5}
        completedStepNumbers={[1, 2, 3, 4]}
        title="Select School Plan & Subscription"
        subtitle="Choose your school subscription tier and billing cycle."
      >
        <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
          <Loader2 className="w-8 h-8 text-[#2158E0] animate-spin" />
          <div>
            <p className="text-sm font-semibold text-[#141A2E]">Loading subscription tiers...</p>
            <p className="text-xs text-[#5B6478] mt-1">Retrieving official plans and GST pricing for Indian schools</p>
          </div>
        </div>
      </OnboardingLayout>
    );
  }

  // Prerequisite Error State
  if (prerequisiteError) {
    return (
      <OnboardingLayout
        currentStepNumber={5}
        completedStepNumbers={[]}
        title="Select School Plan & Subscription"
        subtitle="Step 1 required before selecting subscription."
      >
        <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
          <h2 className="text-base font-bold text-amber-900">{prerequisiteError.msg}</h2>
          <Link
            to={prerequisiteError.route}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#2158E0] text-white text-xs font-semibold hover:bg-[#1a4ec4] transition-colors"
          >
            <span>{prerequisiteError.linkText}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      currentStepNumber={5}
      completedStepNumbers={[1, 2, 3, 4]}
      title="Select School Plan & Subscription"
      subtitle="Activate your 14-day free trial on any tier. Zero upfront payment or credit card required."
    >
      <form onSubmit={handleSubmit} className="space-y-8" id="subscription-selection-form">
        {/* Prior Steps Success Banner */}
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Steps 1, 2, 3 &amp; 4 Completed:</strong> School profile, academic year, classes, and curriculum configured.
            </span>
          </div>
          <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md bg-emerald-100/80 text-emerald-700 font-medium text-[11px]">
            Ready for Step 5
          </span>
        </div>

        {/* Existing Active Subscription Notice (Resume Support) */}
        {existingSubscription && (
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#2158E0] shrink-0" />
              <span>
                <strong>Current Selection Saved:</strong> You have selected the{" "}
                <strong>{existingSubscription.plan?.name || existingSubscription.plan_id}</strong> tier (
                {existingSubscription.status === "trialing" ? "14-Day Free Trial" : existingSubscription.status}). You can change tiers or continue to Website Setup.
              </span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Billing Cycle Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#F8FAFC] border border-[#E6EAF3]">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#5B6478]">
              Billing Period
            </span>
            <p className="text-xs text-[#5B6478] mt-0.5">
              Select monthly or prepay to unlock institutional discounts.
            </p>
          </div>

          <div className="inline-flex items-center p-1 bg-[#E2E8F0]/70 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              id="billing-monthly-btn"
              onClick={() => setBillingCycle("monthly")}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                billingCycle === "monthly"
                  ? "bg-white text-[#141A2E] shadow-xs"
                  : "text-[#5B6478] hover:text-[#141A2E]"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              id="billing-six-months-btn"
              onClick={() => setBillingCycle("six_months")}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                billingCycle === "six_months"
                  ? "bg-white text-[#2158E0] shadow-xs"
                  : "text-[#5B6478] hover:text-[#141A2E]"
              }`}
            >
              <span>6 Months</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold">
                5% off
              </span>
            </button>
            <button
              type="button"
              id="billing-yearly-btn"
              onClick={() => setBillingCycle("yearly")}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                billingCycle === "yearly"
                  ? "bg-white text-[#2158E0] shadow-xs"
                  : "text-[#5B6478] hover:text-[#141A2E]"
              }`}
            >
              <span>12 Months</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold">
                10% off
              </span>
            </button>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch" role="radiogroup" aria-label="School Plans">
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
                onClick={() => setSelectedPlanSlug(plan.slug)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    setSelectedPlanSlug(plan.slug);
                  }
                }}
                className={`relative rounded-2xl border-2 p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 outline-none ${
                  isSelected
                    ? "border-[#2158E0] bg-blue-50/20 shadow-md ring-2 ring-[#2158E0]/15"
                    : "border-[#E6EAF3] bg-white hover:border-[#CBD5E1] hover:shadow-xs"
                } ${plan.is_popular ? "md:-translate-y-1" : ""}`}
              >
                {/* Popular Badge */}
                {plan.is_popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1FAE7A] text-white px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase shadow-xs whitespace-nowrap">
                    Most Popular for K-12
                  </div>
                )}

                <div>
                  {/* Card Header & Radio Checkmark */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-lg font-bold font-heading text-[#141A2E]">
                        {plan.name}
                      </h3>
                      <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5B6478] mt-0.5">
                        <Users className="w-3 h-3 text-[#5B6478]" />
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
                  <div className="py-3 border-y border-[#F1F5F9] my-3">
                    {pricing.isCustomQuote ? (
                      <div>
                        <div className="text-2xl font-extrabold font-heading text-[#141A2E]">
                          Custom Quote
                        </div>
                        <div className="text-[11px] text-[#5B6478] mt-0.5">
                          Multi-branch &amp; institutions 1,800+
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold font-heading text-[#141A2E]">
                            ₹{pricing.effectiveMonthlyRate?.toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs text-[#5B6478]">/ month</span>
                        </div>

                        {billingCycle !== "monthly" && (
                          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                            {pricing.formattedSubtotal} billed every {pricing.durationMonths} mos ({pricing.discountPercent}% off)
                          </div>
                        )}
                        {billingCycle === "monthly" && (
                          <div className="text-[11px] text-[#5B6478] mt-1">
                            Standard monthly billing
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="space-y-2 text-xs text-[#141A2E] mt-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6478] block">
                      Includes:
                    </span>
                    {plan.features.slice(0, 5).map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-tight">{feat}</span>
                      </div>
                    ))}
                    {plan.features.length > 5 && (
                      <div className="text-[11px] text-[#2158E0] font-medium pt-1">
                        + {plan.features.length - 5} more capabilities
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="mt-5 pt-3 border-t border-[#F1F5F9]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlanSlug(plan.slug);
                    }}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-[#2158E0] text-white shadow-xs"
                        : "bg-[#F1F5F9] text-[#141A2E] hover:bg-[#E2E8F0]"
                    }`}
                  >
                    {isSelected ? "Selected Plan" : "Select Plan"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Plan Summary & 14-Day Free Trial Notice */}
        {selectedPlan && pricingCalculation && (
          <div className="rounded-2xl border border-[#E6EAF3] bg-[#F8FAFC] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6EAF3] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#2158E0] flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#141A2E]">
                    Order Summary: {selectedPlan.name} Plan ({billingCycle === "monthly" ? "Monthly" : billingCycle === "six_months" ? "6 Months" : "12 Months"})
                  </h4>
                  <p className="text-xs text-[#5B6478]">
                    {selectedPlan.student_capacity_label} • Dedicated tenant for {school?.name || "your school"}
                  </p>
                </div>
              </div>

              {/* Free Trial Pill */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                <Clock className="w-3.5 h-3.5" />
                <span>14-Day Free Trial Activated</span>
              </div>
            </div>

            {/* Trial Zero-Charge Banner */}
            <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">₹0 Due Today: </span>
                Your 14-day fully-featured trial is completely free through <strong>{trialEndFormatted}</strong>. You will not be charged today and no credit card is required upfront. You can upgrade, downgrade, or cancel anytime from your School Admin portal.
              </div>
            </div>

            {/* Financial Breakdown (Itemized) */}
            {!pricingCalculation.isCustomQuote && (
              <div className="bg-white rounded-xl border border-[#E6EAF3] p-4 text-xs space-y-2">
                <div className="flex justify-between text-[#5B6478]">
                  <span>Base Subscription ({pricingCalculation.durationMonths} month{pricingCalculation.durationMonths > 1 ? "s" : ""})</span>
                  <span>{pricingCalculation.formattedSubtotal}</span>
                </div>

                {pricingCalculation.savingsAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Prepay Discount ({pricingCalculation.discountPercent}% off)</span>
                    <span>-₹{pricingCalculation.savingsAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}

                <div className="flex justify-between text-[#5B6478] pt-1 border-t border-[#F1F5F9]">
                  <span className="flex items-center gap-1">
                    <span>Statutory 18% GST</span>
                    <span className="text-[10px] text-[#5B6478]">(ITC Eligible B2B Invoice)</span>
                  </span>
                  <span>{pricingCalculation.formattedGst}</span>
                </div>

                <div className="flex justify-between text-sm font-bold text-[#141A2E] pt-2 border-t border-[#E6EAF3]">
                  <span>Total Amount (after 14-day trial)</span>
                  <div className="text-right">
                    <span className="text-base text-[#2158E0]">{pricingCalculation.formattedTotal}</span>
                    <div className="text-[10px] font-normal text-[#5B6478]">₹0.00 charged today</div>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Quote Box */}
            {pricingCalculation.isCustomQuote && (
              <div className="bg-white rounded-xl border border-[#E6EAF3] p-4 text-xs space-y-2">
                <p className="text-[#141A2E] font-medium">
                  Custom quote requested for schools with 1,800+ students or multi-branch structures.
                </p>
                <p className="text-[#5B6478]">
                  Our enterprise onboarding team will contact you to configure custom domain mapping, dedicated servers, and statutory state-board reporting. You can proceed directly to Website Setup today.
                </p>
              </div>
            )}

            {/* Trust Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-[#5B6478]">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Zero Upfront Card</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#2158E0] shrink-0" />
                <span>GST B2B Tax Invoice</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>UPI / RuPay / Cards</span>
              </div>
              <div className="flex items-center gap-1.5">
                <LockIcon className="w-3.5 h-3.5 text-[#141A2E] shrink-0" />
                <span>DPDP Act Compliant</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="pt-4 border-t border-[#F1F5F9] flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link
            to="/onboarding/subjects"
            id="back-to-subjects-btn"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#5B6478] hover:text-[#141A2E] transition-colors py-2.5 px-3 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Subjects Setup</span>
          </Link>

          <button
            type="submit"
            id="continue-to-website-btn"
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-xs sm:text-sm font-semibold text-white bg-[#2158E0] hover:bg-[#1a4ec4] disabled:bg-[#94A3B8] rounded-full transition-all shadow-sm cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Activating 14-Day Free Trial...</span>
              </>
            ) : (
              <>
                <span>
                  {pricingCalculation?.isCustomQuote
                    ? "Confirm Custom Plan & Continue to Website Setup"
                    : "Activate 14-Day Free Trial & Continue to Website Setup"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </OnboardingLayout>
  );
}

// Internal Helper for Trust Badge Lock
function LockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-3.5 h-3.5"
      {...props}
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
