/**
 * Comprehensive Automated Verification Suite:
 * Master Admin — Schools & Institutions Production Master Plan
 */

import {
  getMasterAdminSchools,
  getMasterAdminSchoolDetail,
  changeSchoolSubscriptionPlan,
  extendSchoolTrial,
  extendSchoolSubscriptionValidity,
  updateMasterAdminSchoolStatus,
  getSchoolSubscriptionHistory,
  updateSchoolModules,
  exportSchoolsToCsv,
} from "../src/services/masterAdminSchoolService";
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

async function runSchoolsMasterTests() {
  console.log("\n==========================================================");
  console.log("SCHOOLS & INSTITUTIONS PRODUCTION VERIFICATION SUITE");
  console.log("==========================================================\n");

  const testSchoolId = "b70261ef-37f1-46c8-a148-2c496a9d33a8"; // Peace Convent School
  const adminEmail = "myzkool.official@gmail.com";

  // ─── Group 1: Directory Listing, KPIs & Filtering ───────────────────────
  console.log("Group 1: Directory Listing & KPI Calculations");
  {
    const res = await getMasterAdminSchools({ page: 1, limit: 10 });
    assert(res.schools.length >= 6, "Directory returns all verified registered schools");
    assert(res.total >= 6, "Total schools count reflects actual database records");
    assert(typeof res.kpis.total_schools === "number" && res.kpis.total_schools >= 6, "KPI total_schools is verified");
    assert(typeof res.kpis.active_schools === "number", "KPI active_schools is calculated");
    assert(typeof res.kpis.total_students === "number", "KPI total_students aggregates real records");
    assert(Boolean(res.kpis.mrr_formatted), "KPI mrr_formatted is populated");

    // Check school properties match mockup
    const peaceConvent = res.schools.find((s) => s.id === testSchoolId);
    assert(Boolean(peaceConvent), "Peace Convent School is present in directory");
    assert(peaceConvent?.institution_code === "MYZ-00124", "Peace Convent has institution code MYZ-00124");
    assert(Boolean(peaceConvent?.principal_name), "Peace Convent has Principal name");
    assert(Boolean(peaceConvent?.principal_email), "Peace Convent has Principal email");
  }

  // ─── Group 2: Advanced Search & Multi-Field Filtering ────────────────────
  console.log("\nGroup 2: Advanced Search & Filtering");
  {
    // Search by code
    const codeSearch = await getMasterAdminSchools({ search: "MYZ-00124" });
    assert(codeSearch.schools.length === 1, "Search by institution code 'MYZ-00124' returns exact match");
    assert(codeSearch.schools[0].id === testSchoolId, "Matched school is Peace Convent");

    // Search by admin or official email
    const emailSearch = await getMasterAdminSchools({ search: "myzkool.official@gmail.com" });
    assert(emailSearch.schools.length >= 1, "Search by principal or official email returns matching institution");

    // Filter by plan
    const proSearch = await getMasterAdminSchools({ plan: "pro" });
    assert(proSearch.schools.length > 0, "Filter by plan 'pro' returns matching schools");
    assert(proSearch.schools.every((s) => s.current_plan_slug === "pro"), "All results have Pro plan");

    // Filter by status
    const suspendedSearch = await getMasterAdminSchools({ status: "suspended" });
    assert(suspendedSearch.schools.length >= 1, "Filter by status 'suspended' returns suspended schools");
    assert(suspendedSearch.schools.every((s) => s.status === "suspended"), "All results have suspended status");
  }

  // ─── Group 3: Plan Changes (Upgrade/Downgrade) ───────────────────────────
  console.log("\nGroup 3: Subscription Plan Upgrades & Downgrades");
  {
    // Upgrade to Custom
    const upgradeRes = await changeSchoolSubscriptionPlan(
      testSchoolId,
      "custom",
      "yearly",
      "Campus network expansion to 5,000+ student seats",
      adminEmail
    );
    assert(upgradeRes.success, "Plan upgrade to Custom succeeds");
    assert(upgradeRes.school?.current_plan_slug === "custom", "School plan reflects 'custom'");
    assert(upgradeRes.school?.student_limit === 5000, "Student limit updated to 5,000");

    // Check subscription history generated
    const history = await getSchoolSubscriptionHistory(testSchoolId);
    assert(history.length > 0, "Subscription history ledger contains records");
    assert(history[0].operation_type === "plan_change", "Latest history entry is plan_change");
    assert(history[0].new_plan_slug === "custom", "History captures new plan slug");
    assert(history[0].reason.includes("Campus network expansion"), "History captures administrative reason");

    // Revert back to Pro
    const revertRes = await changeSchoolSubscriptionPlan(
      testSchoolId,
      "pro",
      "yearly",
      "Reverted to Pro tier for standard K-12 operational requirements",
      adminEmail
    );
    assert(revertRes.success, "Plan revert to Pro succeeds");
  }

  // ─── Group 4: Free Trial Extensions ──────────────────────────────────────
  console.log("\nGroup 4: Free Trial Extension Operations");
  {
    const greenValleyId = "599a11a0-cdfe-4f36-896d-3e212a20f0f3"; // Green Valley School (Trial)
    const extendRes = await extendSchoolTrial(
      greenValleyId,
      14,
      "Authorized 14 days additional trial for examination module evaluation",
      adminEmail
    );
    assert(extendRes.success, "Trial extension by +14 days succeeds");
    assert(Boolean(extendRes.newExpiry), "New expiration timestamp is calculated and returned");

    const schoolDetail = await getMasterAdminSchoolDetail(greenValleyId);
    assert(schoolDetail?.subscription_status === "trialing", "School subscription status is 'trialing'");
    assert(schoolDetail?.trial_days_left !== null && schoolDetail!.trial_days_left! >= 10, "Trial days left updated");

    // Validate invalid inputs are rejected
    const invalidDays = await extendSchoolTrial(greenValleyId, 0, "Invalid days test", adminEmail);
    assert(!invalidDays.success, "Extension with 0 days is rejected");

    const shortReason = await extendSchoolTrial(greenValleyId, 7, "bad", adminEmail);
    assert(!shortReason.success, "Extension with reason < 5 chars is rejected");
  }

  // ─── Group 5: Subscription Validity Extensions ───────────────────────────
  console.log("\nGroup 5: Paid & Complimentary Subscription Extensions");
  {
    // Complimentary extension
    const compRes = await extendSchoolSubscriptionValidity(
      testSchoolId,
      30,
      "complimentary",
      undefined,
      "Goodwill administrative concession for annual festival sponsorship",
      adminEmail
    );
    assert(compRes.success, "Complimentary extension by +30 days succeeds");
    assert(Boolean(compRes.newExpiry), "New validity expiry calculated");

    // Paid extension with payment reference
    const paidRes = await extendSchoolSubscriptionValidity(
      testSchoolId,
      90,
      "paid",
      "UTR-HDFC-99182374",
      "Quarterly renewal payment verified via bank wire transfer",
      adminEmail
    );
    assert(paidRes.success, "Paid extension with payment reference succeeds");

    const history = await getSchoolSubscriptionHistory(testSchoolId);
    const paidEntry = history.find((h) => h.payment_reference === "UTR-HDFC-99182374");
    assert(Boolean(paidEntry), "Subscription history preserves payment reference UTR-HDFC-99182374");
    assert(paidEntry?.classification === "paid", "Classification is marked as 'paid'");
  }

  // ─── Group 6: Suspension & Reactivation Lifecycle ─────────────────────────
  console.log("\nGroup 6: Suspension & Reactivation Lifecycle");
  {
    const suspendRes = await updateMasterAdminSchoolStatus(
      testSchoolId,
      "suspended",
      "Terms of service compliance review pending board response",
      "Compliance audit ticket #SEC-8821",
      adminEmail
    );
    assert(suspendRes.success, "Institution suspension succeeds");

    let detail = await getMasterAdminSchoolDetail(testSchoolId);
    assert(detail?.status === "suspended", "Institution status reflects 'suspended'");
    assert(Boolean(detail?.suspended_at), "Suspension timestamp is recorded");

    // Reactivation
    const reactivateRes = await updateMasterAdminSchoolStatus(
      testSchoolId,
      "active",
      "Compliance documentation received and verified by legal counsel",
      "Resolution notes ticket #SEC-8821",
      adminEmail
    );
    assert(reactivateRes.success, "Institution reactivation succeeds");

    detail = await getMasterAdminSchoolDetail(testSchoolId);
    assert(detail?.status === "active", "Institution status restored to 'active'");
  }

  // ─── Group 7: Modules Management ─────────────────────────────────────────
  console.log("\nGroup 7: Institutional Module Configuration");
  {
    const newModules = ["students", "fees", "attendance", "admissions", "transport", "exams"];
    const modRes = await updateSchoolModules(
      testSchoolId,
      newModules,
      "Enabled Transport and Exams modules for campus term 2",
      adminEmail
    );
    assert(modRes.success, "Modules update succeeds");
    assert(modRes.modules?.includes("transport") === true, "Transport module is enabled");
    assert(modRes.modules?.includes("exams") === true, "Exams module is enabled");
  }

  // ─── Group 8: CSV Export ─────────────────────────────────────────────────
  console.log("\nGroup 8: CSV Directory Export");
  {
    const csv = await exportSchoolsToCsv({ plan: "all" });
    assert(typeof csv === "string" && csv.length > 100, "CSV export returns non-empty string");
    assert(csv.includes("Institution ID"), "CSV contains 'Institution ID' header");
    assert(csv.includes("School Name"), "CSV contains 'School Name' header");
    assert(csv.includes("Peace Convent School"), "CSV contains Peace Convent School");
    assert(csv.includes("MYZ-00124"), "CSV contains MYZ-00124 code");
  }

  console.log("\n==========================================================");
  console.log(`MASTER SUITE RESULTS: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log("==========================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runSchoolsMasterTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
