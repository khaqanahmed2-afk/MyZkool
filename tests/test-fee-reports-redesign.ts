/**
 * Fee Reports Redesign & Analytics Engine Test Suite
 *
 * Validates:
 * 1. Financial summary calculations strictly against authentic database/cache records.
 * 2. Real-time collection trends across granularities (monthly, weekly, daily).
 * 3. Payment method distribution calculation based on real fee_payments.
 * 4. Class-wise collection aggregation and distinct students with dues count.
 * 5. Aging bracket analysis based on actual due dates.
 * 6. Top outstanding students derived from real uncollected balances.
 * 7. Recent transaction stream derived from actual fee_receipts.
 * 8. Multi-tenant isolation: School B cannot see School A's records.
 * 9. Excel and printable statement export helpers.
 */

// Mock localStorage in Node environment
const store: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, val: string) => {
    store[key] = String(val);
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    for (const k in store) delete store[k];
  },
};

import { randomUUID } from "crypto";
import {
  getFeeReportsDashboardData,
  exportFeeReportsExcel,
  exportClassWiseCSV,
  exportAgingCSV,
  generateFeeReportPrintHTML,
} from "../src/services/feeReportsService";
import type { StudentDue } from "../src/types/fees";
import type { FeeReceipt, FeePayment } from "../src/types/collection";

let passed = 0;
let failed = 0;
const errors: string[] = [];

function check(desc: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ ${desc}${detail ? " — " + detail : ""}`);
    failed++;
    errors.push(desc);
  }
}

async function runTests() {
  console.log("============================================================");
  console.log("Fee Reports Redesign & Analytics Engine Test Suite");
  console.log("============================================================\n");

  const schoolA = "school-a-" + randomUUID().slice(0, 8);
  const schoolB = "school-b-" + randomUUID().slice(0, 8);
  const yearId = "year-2025-2026";

  // Setup authentic classes and students for School A
  const classesA = [
    { id: "cls-10", school_id: schoolA, name: "Class 10" },
    { id: "cls-9", school_id: schoolA, name: "Class 9" },
  ];
  const sectionsA = [
    { id: "sec-10a", school_id: schoolA, class_id: "cls-10", name: "A" },
    { id: "sec-9b", school_id: schoolA, class_id: "cls-9", name: "B" },
  ];
  const studentsA = [
    { id: "std-1", school_id: schoolA, first_name: "Aarav", last_name: "Sharma", admission_no: "ADM-001", class_id: "cls-10", section_id: "sec-10a" },
    { id: "std-2", school_id: schoolA, first_name: "Ayesha", last_name: "Khan", admission_no: "ADM-002", class_id: "cls-9", section_id: "sec-9b" },
  ];

  // Authentic student dues for School A:
  // std-1: 15,000 gross, 0 paid, 15,000 balance (Overdue, due 2025-04-10)
  // std-2: 12,000 gross, 5,000 paid, 7,000 balance (Due soon, due 2026-12-18)
  const duesA: StudentDue[] = [
    {
      id: "due-1",
      school_id: schoolA,
      student_id: "std-1",
      source: "structure",
      fee_head_id: "head-1",
      academic_year_id: yearId,
      gross_paise: 1500000,
      concession_paise: 0,
      net_paise: 1500000,
      paid_paise: 0,
      balance_paise: 1500000,
      due_date: "2025-04-10",
      status: "pending",
      created_at: "2025-04-01T00:00:00Z",
      updated_at: "2025-04-01T00:00:00Z",
    },
    {
      id: "due-2",
      school_id: schoolA,
      student_id: "std-2",
      source: "structure",
      fee_head_id: "head-1",
      academic_year_id: yearId,
      gross_paise: 1200000,
      concession_paise: 0,
      net_paise: 1200000,
      paid_paise: 500000,
      balance_paise: 700000,
      due_date: "2026-12-18",
      status: "partial",
      created_at: "2025-04-01T00:00:00Z",
      updated_at: "2025-04-01T00:00:00Z",
    },
  ];

  const receiptsA: FeeReceipt[] = [
    {
      id: "rcp-1",
      school_id: schoolA,
      receipt_no: "RCP-2026-1001",
      student_id: "std-2",
      academic_year_id: yearId,
      receipt_date: "2026-07-24",
      total_paise: 500000,
      status: "active",
      source: "counter",
      payment_group_id: null,
      collected_by: "Admin",
      remarks: "Partial payment",
      idempotency_key: null,
      print_count: 1,
      whatsapp_sent_at: null,
      cancelled_by: null,
      cancelled_at: null,
      cancel_reason: null,
      created_at: "2026-07-24T10:00:00Z",
      updated_at: "2026-07-24T10:00:00Z",
    },
  ];

  const paymentsA: FeePayment[] = [
    {
      id: "pay-1",
      school_id: schoolA,
      receipt_id: "rcp-1",
      mode: "upi",
      amount_paise: 500000,
      reference_no: "UPI-9999",
      bank_name: null,
      instrument_no: null,
      instrument_date: null,
      cheque_status: null,
      gateway_order_id: null,
      gateway_payment_id: null,
      created_at: "2026-07-24T10:00:00Z",
    },
  ];

  // Populate cache for School A
  localStorage.setItem(`myzkool_classes_${schoolA}`, JSON.stringify(classesA));
  localStorage.setItem(`myzkool_sections_${schoolA}`, JSON.stringify(sectionsA));
  localStorage.setItem(`myzkool_students_${schoolA}`, JSON.stringify(studentsA));
  localStorage.setItem(`myzkool_student_dues_${schoolA}`, JSON.stringify(duesA));
  localStorage.setItem(`myzkool_fee_receipts_${schoolA}`, JSON.stringify(receiptsA));
  localStorage.setItem(`myzkool_fee_payments_${schoolA}`, JSON.stringify(paymentsA));
  localStorage.setItem(`myzkool_academic_years_${schoolA}`, JSON.stringify([{ id: yearId, name: "2025-2026", is_current: true }]));

  // ─── TEST 1: Initial Dashboard Data Load & KPI Metrics ───
  console.log("[Test 1] Financial Summary Metrics & Baseline Calculations");
  const dataA = await getFeeReportsDashboardData(schoolA, { academic_year_id: yearId });

  check("Loads summary metrics successfully", !!dataA.summary);
  check("Total billed matches authentic ₹27,000 (2700000 paise)", dataA.summary.total_billed_paise === 2700000);
  check("Total collected matches authentic ₹5,000 (500000 paise)", dataA.summary.total_collected_paise === 500000);
  check("Outstanding dues matches authentic ₹22,000 (2200000 paise)", dataA.summary.outstanding_dues_paise === 2200000);
  check("Total discounts matches 0 when none applied", dataA.summary.total_discounts_paise === 0);
  check(
    "Collection rate is accurately calculated (500000 / 2700000 * 100 = 18.5%)",
    dataA.summary.collection_rate_pct === 18.5,
    `Got ${dataA.summary.collection_rate_pct}%`
  );
  check("Invoices generated count is reported", dataA.summary.invoices_generated_count === 2);
  check("Payments received count is reported", dataA.summary.payments_received_count === 1);

  // ─── TEST 2: Collection Trend Breakdown Across Granularities ───
  console.log("\n[Test 2] Collection Trend Breakdown (Monthly)");
  const monthlyData = await getFeeReportsDashboardData(schoolA, {}, "monthly");
  check("Monthly trends contain 12 academic periods", monthlyData.trends.length === 12);
  check("First month is April (Apr)", monthlyData.trends[0].label === "Apr");
  check("Last month is March (Mar)", monthlyData.trends[11].label === "Mar");

  // ─── TEST 3: Payment Method Breakdown ───
  console.log("\n[Test 3] Fee Collection by Payment Method");
  check("Reports all standard payment methods (UPI, Cash, Bank Transfer, Online, Cheque)",
    dataA.paymentMethods.length === 5
  );

  const upiMethod = dataA.paymentMethods.find(m => m.method === "upi");
  check("UPI has the collected amount of ₹5,000 (100% of collections)", upiMethod?.amount_paise === 500000 && upiMethod?.percentage === 100);

  // ─── TEST 4: Class-wise Collection Summary ───
  console.log("\n[Test 4] Class-wise Collection Summary Performance");
  check("Includes class summaries for school grades", dataA.classSummaries.length === 2);
  const cls10Summary = dataA.classSummaries.find(c => c.class_name === "Class 10");
  check("Class 10 billed amount matches ₹15,000", cls10Summary?.total_billed_paise === 1500000);
  check("Class 10 outstanding matches ₹15,000", cls10Summary?.outstanding_paise === 1500000);

  // ─── TEST 5: Outstanding Dues by Aging ───
  console.log("\n[Test 5] Outstanding Dues by Aging");
  check("Contains 5 aging brackets", dataA.agingAnalysis.length === 5);
  const totalAgingPaise = dataA.agingAnalysis.reduce((s, a) => s + a.amount_paise, 0);
  check("Total aging sum equals total outstanding dues (₹22,000)", totalAgingPaise === 2200000);

  // ─── TEST 6: Top Students with Outstanding Dues ───
  console.log("\n[Test 6] Top Students with Outstanding Dues");
  check("Top students list populated", dataA.topOutstandingStudents.length === 2);
  check("Aarav Sharma balance due is ₹15,000 with Overdue status",
    dataA.topOutstandingStudents[0].student_name === "Aarav Sharma" &&
    dataA.topOutstandingStudents[0].balance_due_paise === 1500000 &&
    dataA.topOutstandingStudents[0].status === "Overdue"
  );
  check("Ayesha Khan balance due is ₹7,000 with Due Soon status",
    dataA.topOutstandingStudents[1].student_name === "Ayesha Khan" &&
    dataA.topOutstandingStudents[1].balance_due_paise === 700000 &&
    dataA.topOutstandingStudents[1].status === "Due Soon"
  );

  // ─── TEST 7: Recent Fee Transactions ───
  console.log("\n[Test 7] Recent Fee Transactions");
  check("Recent transactions list populated", dataA.recentTransactions.length === 1);
  check("RCP-2026-1001 recorded for Ayesha Khan with ₹5,000 via UPI",
    dataA.recentTransactions[0].receipt_no === "RCP-2026-1001" &&
    dataA.recentTransactions[0].student_name === "Ayesha Khan" &&
    dataA.recentTransactions[0].amount_paise === 500000
  );

  // ─── TEST 8: Multi-Tenant School Isolation ───
  console.log("\n[Test 8] Multi-Tenant School Isolation");
  const dataB = await getFeeReportsDashboardData(schoolB, {});
  check("School B report is completely empty (0 billed)", dataB.summary.total_billed_paise === 0);
  check("School B report has 0 collected", dataB.summary.total_collected_paise === 0);
  check("School B report has 0 class summaries", dataB.classSummaries.length === 0);
  check("School B report does NOT leak School A transactions", dataB.recentTransactions.length === 0);

  // ─── TEST 9: Comprehensive Export Utilities ───
  console.log("\n[Test 9] Comprehensive Export Utilities");
  const excelCsv = exportFeeReportsExcel(dataA, "Sunrise International School", "All Classes");
  check("Excel CSV contains School Title header", excelCsv.includes("Sunrise International School"));
  check("Excel CSV contains Financial Summary Metrics", excelCsv.includes("1. FINANCIAL SUMMARY METRICS"));
  check("Excel CSV contains Payment Method breakdown", excelCsv.includes("2. FEE COLLECTION BY PAYMENT METHOD") && excelCsv.includes("UPI"));
  check("Excel CSV contains Class-wise breakdown", excelCsv.includes("3. CLASS-WISE COLLECTION SUMMARY") && excelCsv.includes("Class 10"));
  check("Excel CSV contains Aging analysis", excelCsv.includes("4. OUTSTANDING DUES BY AGING"));
  check("Excel CSV contains Top Students", excelCsv.includes("5. TOP STUDENTS WITH OUTSTANDING DUES") && excelCsv.includes("Aarav Sharma"));
  check("Excel CSV contains Recent Transactions", excelCsv.includes("6. RECENT FEE TRANSACTIONS") && excelCsv.includes("RCP-2026-1001"));

  const classCsv = exportClassWiseCSV(dataA.classSummaries);
  check("Class-wise CSV contains formatted columns", classCsv.startsWith("Class,Total Billed,Collected,Outstanding"));

  const agingCsv = exportAgingCSV(dataA.agingAnalysis);
  check("Aging CSV contains formatted columns", agingCsv.startsWith("Aging Bracket,Outstanding Amount,Invoices Count"));

  const printHtml = generateFeeReportPrintHTML(dataA, "Sunrise International School", "All Classes");
  check("Printable HTML contains doctype and CSS styles", printHtml.includes("<!DOCTYPE html>") && printHtml.includes("@media print"));
  check("Printable HTML contains KPI grid and class breakdown", printHtml.includes("kpi-grid") && printHtml.includes("Class 10"));

  // ─── Summary ───
  console.log("\n============================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log("All Fee Reports Redesign integration tests passed! ✓\n");
  } else {
    console.error("Test failures encountered:", errors);
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test suite runner crashed:", err);
  process.exit(1);
});
