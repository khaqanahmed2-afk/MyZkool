/**
 * Automated Verification Suite: Phase 4 — Subscription & Entitlement Management
 */

import {
  getMasterAdminSubscriptionPlans,
  updateMasterAdminSubscriptionPlan,
  overrideSchoolSubscription,
} from "../src/services/masterAdminSubscriptionService";
import { calculateServerSubscriptionPricing } from "../src/routes/razorpayRoutes";
import { getPlatformAuditLogs } from "../src/services/masterAdminAuditService";

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

async function runPhase4Tests() {
  console.log("\n==========================================================");
  console.log("PHASE 4: SUBSCRIPTION & ENTITLEMENT MANAGEMENT TEST SUITE");
  console.log("==========================================================\n");

  // ─── Test Group 1: Plan Catalog Fetch ─────────────────────────────────────
  console.log("Group 1: Global Subscription Plans Catalog");

  const plans = await getMasterAdminSubscriptionPlans();
  assert(plans.length >= 3, "Catalog contains at least 3 plans (Basic, Pro, Custom)");
  assert(plans.some((p) => p.slug === "basic"), "Basic plan is present");
  assert(plans.some((p) => p.slug === "pro"), "Pro plan is present");
  assert(plans.some((p) => p.slug === "custom"), "Custom Enterprise plan is present");

  const proPlan = plans.find((p) => p.slug === "pro")!;
  assert(proPlan.subscriber_count > 0, "Pro plan has subscriber count");
  assert(proPlan.max_students === 1800, "Pro plan has student limit of 1800");

  // ─── Test Group 2: Plan Price & Quota Updates ─────────────────────────────
  console.log("\nGroup 2: Administrative Plan Modification");

  {
    const updateResult = await updateMasterAdminSubscriptionPlan(
      proPlan.id,
      {
        price_monthly: 1899.0,
        max_students: 2000,
      },
      "super@myzkool.com"
    );

    assert(updateResult.success, "Plan update executes successfully");
    assert(updateResult.plan?.price_monthly === 1899.0, "Monthly price updated to 1899");
    assert(updateResult.plan?.max_students === 2000, "Max students quota updated to 2000");

    // Revert back
    await updateMasterAdminSubscriptionPlan(
      proPlan.id,
      { price_monthly: 1799.0, max_students: 1800 },
      "super@myzkool.com"
    );

    // Verify audit log
    const auditLogs = await getPlatformAuditLogs({ action: "plan.update" });
    assert(auditLogs.length > 0, "Audit log generated for plan.update");
    assert(auditLogs[0].admin_email === "super@myzkool.com", "Audit log records operator email");
  }

  // ─── Test Group 3: Server Subscription Pricing Calculation ────────────────
  console.log("\nGroup 3: Canonical Server Pricing Engine (Razorpay / Invoicing)");

  {
    const basicMonthly = calculateServerSubscriptionPricing("basic", "monthly");
    assert(basicMonthly.subtotal === 999, "Basic monthly subtotal is ₹999");
    assert(basicMonthly.gstAmount === 179.82, "18% GST correctly calculated on Basic");
    assert(basicMonthly.totalPaise === 117882, "Total amount in paise is exact integer (117882)");

    const proYearly = calculateServerSubscriptionPricing("pro", "yearly");
    assert(proYearly.durationMonths === 12, "Yearly cycle duration is 12 months");
    assert(proYearly.subtotal === 19429, "Pro yearly subtotal reflects 10% prepay discount (₹19,429)");
    assert(proYearly.totalPaise === 2292622, "Pro yearly total in integer paise is exact");
  }

  // ─── Test Group 4: Administrative Subscription Overrides ──────────────────
  console.log("\nGroup 4: School Subscription Overrides & Auditing");

  {
    const overrideRes = await overrideSchoolSubscription(
      "sch-001",
      {
        action: "extend_trial",
        extendDays: 14,
        reason: "Trial extension granted for trustee board evaluation.",
      },
      "super@myzkool.com"
    );

    assert(overrideRes.success, "Trial extension override succeeds");

    const auditLogs = await getPlatformAuditLogs({ action: "subscription.extend_trial" });
    assert(auditLogs.length > 0, "Audit log created for subscription.extend_trial");
    assert(
      (auditLogs[0].details as any)?.reason?.includes("trustee board"),
      "Audit log captures detailed justification"
    );
  }

  {
    // Rejection on missing or short justification
    const failRes = await overrideSchoolSubscription(
      "sch-001",
      {
        action: "change_status",
        newStatus: "cancelled",
        reason: "ok", // Too short
      },
      "super@myzkool.com"
    );

    assert(!failRes.success, "Override rejected when reason is too short (< 5 chars)");
  }

  console.log("\n==========================================================");
  console.log(`PHASE 4 SUMMARY: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log("==========================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase4Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

