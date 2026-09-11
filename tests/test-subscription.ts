/**
 * Test Suite: MyZkool Step 7 (Subscription & Plan Selection)
 * Onboarding Step 5 of 8 - Route: /onboarding/subscription
 */

import {
  getSubscriptionPlans,
  getPlanBySlug,
  calculatePlanPricing,
  getCurrentSchoolSubscription,
  selectSchoolPlan,
  saveSubscriptionSetupProgress,
  formatINR,
  formatINRCents,
  SUBSCRIPTION_CACHE_KEY_PREFIX,
} from "../src/services/subscriptionService";
import type { SubscriptionPlan, BillingCycle } from "../src/types/subscription";

// Polyfill localStorage in Node test environment
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] || null,
    get length() {
      return store.size;
    },
  } as Storage;
}

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ""}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log("\n==========================================================");
  console.log("MYZKOOL STEP 7: SUBSCRIPTION & PLAN SELECTION TEST SUITE");
  console.log("==========================================================\n");

  // 1. Plan Loading & Schema Catalog Tests
  console.log("1. Plan Catalog & Schema Validation:");
  const { plans, error: plansErr } = await getSubscriptionPlans();
  assert(!plansErr && Array.isArray(plans), "Successfully retrieves subscription plans catalog");
  assert(plans.length >= 3, "Catalog contains at least 3 tiers (Basic, Pro, Custom)");

  const basicPlan = plans.find((p) => p.slug === "basic");
  const proPlan = plans.find((p) => p.slug === "pro");
  const customPlan = plans.find((p) => p.slug === "custom");

  assert(Boolean(basicPlan), "Basic plan exists in catalog");
  assert(Boolean(proPlan), "Pro plan exists in catalog");
  assert(Boolean(customPlan), "Custom plan exists in catalog");

  assert(basicPlan?.price_monthly === 999, "Basic plan monthly rate is ₹999");
  assert(basicPlan?.max_students === 800, "Basic plan student capacity is up to 800");
  assert(basicPlan?.features.length! >= 5, "Basic plan includes core features list");

  assert(proPlan?.price_monthly === 1799, "Pro plan monthly rate is ₹1,799");
  assert(proPlan?.max_students === 1800, "Pro plan student capacity is up to 1,800");
  assert(proPlan?.is_popular === true, "Pro plan is flagged as popular for K-12 schools");

  assert(customPlan?.price_monthly === null, "Custom plan uses custom quote pricing (null monthly)");
  assert(customPlan?.max_students === null, "Custom plan accommodates 1,800+ students (unlimited)");

  // getPlanBySlug tests
  const { plan: foundBasic } = await getPlanBySlug("basic");
  const { plan: foundProUpper } = await getPlanBySlug("PRO");
  const { plan: foundNonexistent } = await getPlanBySlug("ultra-mega");

  assert(foundBasic?.slug === "basic", "getPlanBySlug finds plan by slug");
  assert(foundProUpper?.slug === "pro", "getPlanBySlug matches case-insensitively");
  assert(foundNonexistent === null, "getPlanBySlug returns null for invalid slug");

  // 2. Pricing, Discounts & GST Calculation Tests
  console.log("\n2. Pricing, Prepay Discounts & Statutory GST Calculations:");
  if (basicPlan) {
    // Basic Monthly
    const basicMonthly = calculatePlanPricing(basicPlan, "monthly");
    assert(basicMonthly.durationMonths === 1, "Monthly cycle duration is 1 month");
    assert(basicMonthly.subtotal === 999, "Basic monthly subtotal is ₹999");
    assert(basicMonthly.discountPercent === 0, "Monthly billing has 0% discount");
    assert(basicMonthly.gstRatePercent === 18, "GST rate is strictly statutory 18%");
    assert(basicMonthly.gstAmount === 179.82, "18% GST on ₹999 is ₹179.82");
    assert(basicMonthly.totalAmountWithGst === 1178.82, "Total for Basic monthly is ₹1,178.82");

    // Basic 6-Months (5% discount)
    const basic6Mo = calculatePlanPricing(basicPlan, "six_months");
    assert(basic6Mo.durationMonths === 6, "6-month cycle duration is 6 months");
    assert(basic6Mo.discountPercent === 5, "6-month billing applies 5% discount");
    assert(basic6Mo.subtotal === 5694, "Basic 6-month subtotal is ₹5,694 (₹949/mo)");
    assert(basic6Mo.savingsAmount === 300, "Basic 6-month savings is ₹300");
    assert(basic6Mo.gstAmount === 1024.92, "18% GST on ₹5,694 is ₹1,024.92");
    assert(basic6Mo.totalAmountWithGst === 6718.92, "Total for Basic 6-month with GST is ₹6,718.92");

    // Basic 12-Months / Annual (10% discount)
    const basic12Mo = calculatePlanPricing(basicPlan, "yearly");
    assert(basic12Mo.durationMonths === 12, "Yearly cycle duration is 12 months");
    assert(basic12Mo.discountPercent === 10, "Yearly billing applies 10% discount");
    assert(basic12Mo.subtotal === 10789, "Basic yearly subtotal is ₹10,789 (₹899/mo)");
    assert(basic12Mo.savingsAmount === 1199, "Basic yearly savings is ₹1,199");
    assert(basic12Mo.gstAmount === 1942.02, "18% GST on ₹10,789 is ₹1,942.02");
    assert(basic12Mo.totalAmountWithGst === 12731.02, "Total for Basic yearly with GST is ₹12,731.02");
  }

  if (proPlan) {
    // Pro Monthly
    const proMonthly = calculatePlanPricing(proPlan, "monthly");
    assert(proMonthly.subtotal === 1799, "Pro monthly subtotal is ₹1,799");
    assert(proMonthly.gstAmount === 323.82, "18% GST on ₹1,799 is ₹323.82");
    assert(proMonthly.totalAmountWithGst === 2122.82, "Total for Pro monthly with GST is ₹2,122.82");

    // Pro 6-Months (5% discount)
    const pro6Mo = calculatePlanPricing(proPlan, "six_months");
    assert(pro6Mo.subtotal === 10254, "Pro 6-month subtotal is ₹10,254 (₹1,709/mo)");
    assert(pro6Mo.savingsAmount === 540, "Pro 6-month savings is ₹540");
    assert(pro6Mo.gstAmount === 1845.72, "18% GST on ₹10,254 is ₹1,845.72");
    assert(pro6Mo.totalAmountWithGst === 12099.72, "Total for Pro 6-month with GST is ₹12,099.72");

    // Pro 12-Months (10% discount)
    const pro12Mo = calculatePlanPricing(proPlan, "yearly");
    assert(pro12Mo.subtotal === 19429, "Pro yearly subtotal is ₹19,429 (₹1,619/mo)");
    assert(pro12Mo.savingsAmount === 2159, "Pro yearly savings is ₹2,159");
    assert(pro12Mo.gstAmount === 3497.22, "18% GST on ₹19,429 is ₹3,497.22");
    assert(pro12Mo.totalAmountWithGst === 22926.22, "Total for Pro yearly with GST is ₹22,926.22");
  }

  if (customPlan) {
    const customPricing = calculatePlanPricing(customPlan, "yearly");
    assert(customPricing.isCustomQuote === true, "Custom plan correctly flags isCustomQuote");
    assert(customPricing.subtotal === null, "Custom plan subtotal is null");
    assert(customPricing.formattedTotal === "Custom Quote", "Custom plan formats total as 'Custom Quote'");
  }

  // 3. Subscription Creation & 14-Day Free Trial Tests
  console.log("\n3. School Subscription Creation & 14-Day Free Trial:");
  const testSchoolId1 = "school-tenant-sub-101";
  const testUserId1 = "user-admin-sub-101";

  // Validate validation guards
  const emptySchoolResult = await selectSchoolPlan({
    schoolId: "",
    userId: testUserId1,
    planSlug: "pro",
    billingCycle: "yearly",
  });
  assert(!emptySchoolResult.success, "Rejects selection without schoolId");

  const emptyUserResult = await selectSchoolPlan({
    schoolId: testSchoolId1,
    userId: "",
    planSlug: "pro",
    billingCycle: "yearly",
  });
  assert(!emptyUserResult.success, "Rejects selection without userId");

  const invalidPlanResult = await selectSchoolPlan({
    schoolId: testSchoolId1,
    userId: testUserId1,
    planSlug: "nonexistent-plan",
    billingCycle: "yearly",
  });
  assert(!invalidPlanResult.success, "Rejects selection with nonexistent plan slug");

  // Create valid trial subscription on Pro plan (yearly)
  const trialResult = await selectSchoolPlan({
    schoolId: testSchoolId1,
    userId: testUserId1,
    planSlug: "pro",
    billingCycle: "yearly",
    startTrial: true,
  });

  assert(trialResult.success, "Successfully creates school subscription on Pro plan");
  assert(Boolean(trialResult.subscription?.id), "Generates unique subscription UUID");
  assert(trialResult.subscription?.school_id === testSchoolId1, "Links subscription to school tenant ID");
  assert(trialResult.subscription?.status === "trialing", "Sets subscription status to 'trialing'");
  assert(trialResult.subscription?.billing_cycle === "yearly", "Persists chosen billing cycle 'yearly'");
  assert(trialResult.subscription?.payment_status === "trial", "Sets payment_status to 'trial'");
  assert(trialResult.subscription?.payment_method === "trial", "Sets payment_method to 'trial'");
  assert(trialResult.subscription?.total_amount === 22926.22, "Stores computed total amount with 18% GST");

  // Check trial date logic (14 days)
  const trialStart = new Date(trialResult.subscription!.trial_starts_at).getTime();
  const trialEnd = new Date(trialResult.subscription!.trial_ends_at).getTime();
  const diffDays = Math.round((trialEnd - trialStart) / (1000 * 60 * 60 * 24));
  assert(diffDays === 14, "Trial period spans exactly 14 calendar days");

  // 4. Retrieval & Resume Behavior
  console.log("\n4. Subscription Retrieval & Resume Behavior:");
  const { subscription: retrievedSub } = await getCurrentSchoolSubscription(testSchoolId1);
  assert(Boolean(retrievedSub), "Retrieves existing school subscription");
  assert(retrievedSub?.id === trialResult.subscription?.id, "Retrieved subscription ID matches created ID");
  assert(retrievedSub?.plan?.slug === "pro", "Retrieved subscription retains populated Pro plan details");
  assert(retrievedSub?.billing_cycle === "yearly", "Retrieved subscription retains 'yearly' billing cycle");

  // 5. Plan Switching (e.g. Basic to Pro, or Pro to Basic)
  console.log("\n5. Plan Upgrades / Downgrades & Updates:");
  const updateResult = await selectSchoolPlan({
    schoolId: testSchoolId1,
    userId: testUserId1,
    planSlug: "basic",
    billingCycle: "monthly",
    startTrial: true,
  });

  assert(updateResult.success, "Allows switching school plan to Basic monthly");
  assert(updateResult.subscription?.plan?.slug === "basic", "Updated subscription reflects Basic plan");
  assert(updateResult.subscription?.billing_cycle === "monthly", "Updated subscription reflects monthly billing cycle");
  assert(updateResult.subscription?.total_amount === 1178.82, "Recalculates total with GST for new plan (₹1,178.82)");

  const { subscription: afterUpdateSub } = await getCurrentSchoolSubscription(testSchoolId1);
  assert(afterUpdateSub?.plan?.slug === "basic", "Active subscription now points to Basic plan");

  // 6. Multi-Tenant Partitioning
  console.log("\n6. Strict Multi-Tenant Isolation:");
  const testSchoolId2 = "school-tenant-sub-202";
  const testUserId2 = "user-admin-sub-202";

  const school2Result = await selectSchoolPlan({
    schoolId: testSchoolId2,
    userId: testUserId2,
    planSlug: "custom",
    billingCycle: "yearly",
    startTrial: true,
  });

  assert(school2Result.success, "School 2 successfully chooses Custom plan");

  const { subscription: school1Current } = await getCurrentSchoolSubscription(testSchoolId1);
  const { subscription: school2Current } = await getCurrentSchoolSubscription(testSchoolId2);

  assert(school1Current?.school_id === testSchoolId1, "School 1 subscription belongs strictly to Tenant 1");
  assert(school1Current?.plan?.slug === "basic", "School 1 retains Basic plan");
  assert(school2Current?.school_id === testSchoolId2, "School 2 subscription belongs strictly to Tenant 2");
  assert(school2Current?.plan?.slug === "custom", "School 2 retains Custom plan independently");
  assert(school1Current?.id !== school2Current?.id, "Tenant subscriptions have distinct unique records");

  // 7. Onboarding Step Progression & Non-Regression
  console.log("\n7. Onboarding Progression & Non-Regression (Step 5 to Step 6):");
  // Set initial step 5
  const userKey = `myzkool_school_profile_${testUserId1}`;
  globalThis.localStorage.setItem(
    userKey,
    JSON.stringify({
      id: testSchoolId1,
      onboarding_step: 5,
    })
  );

  const progResult = await saveSubscriptionSetupProgress({
    schoolId: testSchoolId1,
    userId: testUserId1,
  });

  assert(progResult.success, "Advances onboarding progress after subscription setup");

  const cachedProfile = JSON.parse(globalThis.localStorage.getItem(userKey) || "{}");
  assert(cachedProfile.onboarding_step === 6, "Advances school onboarding_step from 5 to 6 (Website Setup)");

  // Non-regression test: If school is already at step 7, updating subscription should not regress to 6
  cachedProfile.onboarding_step = 7;
  globalThis.localStorage.setItem(userKey, JSON.stringify(cachedProfile));

  await saveSubscriptionSetupProgress({
    schoolId: testSchoolId1,
    userId: testUserId1,
  });

  const nonRegressedProfile = JSON.parse(globalThis.localStorage.getItem(userKey) || "{}");
  assert(
    nonRegressedProfile.onboarding_step === 7,
    "Preserves higher onboarding_step (7) when updating Step 5 (non-regression)"
  );

  // 8. Currency Formatting Helpers
  console.log("\n8. Currency & Number Formatting:");
  assert(formatINR(999).includes("999"), "Formats ₹999 with currency symbol");
  assert(formatINR(null) === "Custom Quote", "Null amount formats as 'Custom Quote'");
  assert(formatINRCents(1178.82).includes("1,178.82"), "Formats cents accurately for GST invoices");

  console.log("\n----------------------------------------------------------");
  console.log(`TEST SUMMARY: ${testsPassed} Passed, ${testsFailed} Failed.`);
  console.log("----------------------------------------------------------\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
