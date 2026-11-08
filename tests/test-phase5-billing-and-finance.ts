/**
 * Automated Verification Suite: Phase 5 — Billing & Finance Management
 */

import {
  getMasterAdminInvoices,
  getMasterAdminPayments,
  generateMasterAdminInvoice,
  processMasterAdminRefund,
  getMasterAdminRevenueSummary,
} from "../src/services/masterAdminBillingService";
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

async function runPhase5Tests() {
  console.log("\n==========================================================");
  console.log("PHASE 5: BILLING & FINANCE MANAGEMENT TEST SUITE");
  console.log("==========================================================\n");

  // ─── Test Group 1: Subscription Invoices Retrieval ────────────────────────
  console.log("Group 1: Platform Invoices Retrieval & Integrity");

  const invoices = await getMasterAdminInvoices();
  assert(invoices.length > 0, "Invoices list is non-empty");
  assert(invoices[0].invoice_number.startsWith("MZK-INV-"), "Invoice number follows MZK-INV sequential format");
  assert(typeof invoices[0].total_paise === "number" && invoices[0].total_paise > 0, "Total is integer paise");
  assert(invoices[0].hsn_sac_code === "998314", "Statutory SAC code is 998314 for IT SaaS");

  // ─── Test Group 2: Invoice Generation & GST Split ─────────────────────────
  console.log("\nGroup 2: SaaS Invoice Generation & Statutory GST Calculation");

  {
    // Intra-state (Uttar Pradesh -> CGST 9% + SGST 9%)
    const upInvoice = await generateMasterAdminInvoice({
      schoolId: "sch-001",
      schoolName: "Sunrise Public School",
      planSlug: "pro",
      billingCycle: "monthly",
      billingAddress: "Civil Lines, Prayagraj",
      billingState: "Uttar Pradesh",
      adminEmail: "super@myzkool.com",
    });

    assert(Boolean(upInvoice.id), "Invoice generated with unique ID");
    assert(upInvoice.subtotal_paise === 179900, "Subtotal is ₹1,799 (179900 paise)");
    assert(upInvoice.gst_rate === 18.0, "GST rate is 18%");
    assert(upInvoice.cgst_paise > 0 && upInvoice.sgst_paise > 0, "Intra-state calculates CGST and SGST");
    assert(upInvoice.igst_paise === 0, "Intra-state has zero IGST");
    assert(upInvoice.total_paise === upInvoice.subtotal_paise + upInvoice.cgst_paise + upInvoice.sgst_paise, "Total paise equals subtotal + taxes");

    // Audit log verification
    const auditLogs = await getPlatformAuditLogs({ action: "invoice.generate" });
    assert(auditLogs.length > 0, "Audit log created for invoice.generate");
  }

  {
    // Inter-state (Haryana -> IGST 18%)
    const hrInvoice = await generateMasterAdminInvoice({
      schoolId: "sch-002",
      schoolName: "Oakridge Academy",
      planSlug: "basic",
      billingCycle: "monthly",
      billingAddress: "Gurugram",
      billingState: "Haryana",
      adminEmail: "super@myzkool.com",
    });

    assert(hrInvoice.igst_paise > 0, "Inter-state calculates IGST");
    assert(hrInvoice.cgst_paise === 0 && hrInvoice.sgst_paise === 0, "Inter-state has zero CGST/SGST");
  }

  // ─── Test Group 3: Payment Transactions & Razorpay Reconciliation ─────────
  console.log("\nGroup 3: Razorpay Payment Transactions");

  const payments = await getMasterAdminPayments();
  assert(payments.length > 0, "Payments ledger is non-empty");
  assert(payments.some((p) => p.status === "captured"), "Captured transactions exist");
  assert(payments.some((p) => p.status === "failed"), "Failed transactions tracked for dunning");

  // ─── Test Group 4: Refund Processing & Financial Governance ───────────────
  console.log("\nGroup 4: Refund Authorization Workflow");

  {
    const refundRes = await processMasterAdminRefund(
      "pay-001",
      2292622,
      "Duplicate wire transfer refund verified by bank.",
      "super@myzkool.com"
    );

    assert(refundRes.success, "Refund authorization succeeds for captured transaction");
    assert(Boolean(refundRes.refundId), "Refund returns gateway refund identifier");

    const auditLogs = await getPlatformAuditLogs({ action: "payment.refund" });
    assert(auditLogs.length > 0, "Audit log generated for payment.refund");
  }

  {
    // Rejection on short reason
    const failRefund = await processMasterAdminRefund("pay-001", 1000, "no", "super@myzkool.com");
    assert(!failRefund.success, "Refund rejected when reason is shorter than 5 chars");
  }

  // ─── Test Group 5: Revenue Summary ────────────────────────────────────────
  console.log("\nGroup 5: Revenue & MRR Aggregates");

  const revSummary = await getMasterAdminRevenueSummary();
  assert(revSummary.totalCollectedPaise > 0, "Total collected revenue is positive");
  assert(revSummary.mrrPaise > 0, "MRR is positive");
  assert(revSummary.outstandingPaise > 0, "Outstanding receivables tracked");

  console.log("\n==========================================================");
  console.log(`PHASE 5 SUMMARY: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log("==========================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase5Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

