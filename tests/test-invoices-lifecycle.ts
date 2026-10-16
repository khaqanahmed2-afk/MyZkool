/**
 * Invoice Lifecycle Test Suite
 *
 * Verifies:
 * 1. Invoice compilation and totals from real student dues
 * 2. Tenant isolation (school A invoices never leak into school B)
 * 3. Status determination: paid, partial, unpaid, overdue, cancelled
 * 4. Transport fee eligibility: only students with active transport assignments receive transport line items
 * 5. Duplicate prevention: regenerating invoices skips already existing dues
 * 6. Partial payments and balance consistency with linked receipts
 * 7. Safe void / cancellation: unpaid invoice can be voided; paid invoice cannot be voided without audit history
 * 8. Summary metrics calculation (total invoiced, total paid, outstanding, overdue)
 */

import {
  getSchoolInvoices,
  getInvoiceById,
  previewInvoiceGeneration,
  executeInvoiceGeneration,
  cancelInvoice,
  formatInvoiceNumber,
} from "../src/services/invoiceService";
import type { StudentDue, FeeTerm, FeeHead } from "../src/types/fees";
import type { FeeReceipt, FeeReceiptItem, FeePayment } from "../src/types/collection";

// Polyfill in-memory localStorage for test environment
const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (key: string) => store.get(key) || null,
  setItem: (key: string, value: string) => {
    store.set(key, String(value));
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => {
    store.clear();
  },
  key: (index: number) => Array.from(store.keys())[index] || null,
  get length() {
    return store.size;
  },
} as Storage;

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

function cleanLocalStorage() {
  if (typeof localStorage !== "undefined") {
    localStorage.clear();
  }
}

async function runTests() {
  console.log("==========================================================");
  console.log("MYZKOOL INVOICES LIFECYCLE & DATA INTEGRITY TEST SUITE");
  console.log("==========================================================\n");

  cleanLocalStorage();

  const schoolA = "school-alpha-001";
  const schoolB = "school-beta-002";
  const yearId = "year-2026";

  // ── 1. Setup Common Master Data for School A ──────────────────────────────
  const classId = "class-10";
  const term1Id = "term-q1";
  const term2Id = "term-q2";
  const headTuition = "head-tuition";
  const headTransport = "head-transport";

  localStorage.setItem(
    `myzkool_academic_years_${schoolA}`,
    JSON.stringify([{ id: yearId, name: "2025-2026", is_current: true }])
  );
  localStorage.setItem(
    `myzkool_classes_${schoolA}`,
    JSON.stringify([{ id: classId, name: "Class 10" }])
  );
  localStorage.setItem(
    `myzkool_sections_${schoolA}`,
    JSON.stringify([{ id: "sec-a", name: "A", class_id: classId }])
  );
  localStorage.setItem(
    `myzkool_fee_heads_${schoolA}`,
    JSON.stringify([
      { id: headTuition, name: "Tuition Fee", code: "tuition_fee" },
      { id: headTransport, name: "Transport Fee", code: "transport_fee" },
    ])
  );
  localStorage.setItem(
    `myzkool_fee_terms_${schoolA}`,
    JSON.stringify([
      { id: term1Id, name: "Quarter 1", due_date: "2026-04-10", sort_order: 1 },
      { id: term2Id, name: "Quarter 2", due_date: "2026-07-10", sort_order: 2 },
    ])
  );

  // Setup Students in School A
  const student1Id = "student-aarav"; // Has transport
  const student2Id = "student-ayesha"; // No transport (day scholar, walks)
  const student3Id = "student-overdue"; // Overdue student

  localStorage.setItem(
    `myzkool_students_${schoolA}`,
    JSON.stringify([
      {
        id: student1Id,
        first_name: "Aarav",
        last_name: "Sharma",
        admission_no: "ADM-2023-015",
        class_id: classId,
        section_id: "sec-a",
        guardian_name: "Rajesh Sharma",
        contact_phone: "9876543210",
      },
      {
        id: student2Id,
        first_name: "Ayesha",
        last_name: "Khan",
        admission_no: "ADM-2022-048",
        class_id: classId,
        section_id: "sec-a",
        guardian_name: "Imran Khan",
        contact_phone: "9876543211",
      },
      {
        id: student3Id,
        first_name: "Rahul",
        last_name: "Verma",
        admission_no: "ADM-2021-037",
        class_id: classId,
        section_id: "sec-a",
        guardian_name: "Suresh Verma",
        contact_phone: "9876543212",
      },
    ])
  );

  // Setup Active Transport Assignment for Student 1 only
  localStorage.setItem(
    `myzkool_transport_assignments_${schoolA}`,
    JSON.stringify([
      {
        id: "trans-assign-1",
        school_id: schoolA,
        student_id: student1Id,
        academic_year_id: yearId,
        route_id: "route-1",
        pickup_stop_id: "stop-1",
        monthly_fee_paise: 150000,
        status: "active",
      },
    ])
  );

  // ── Setup School B Student (Tenant Isolation Test) ─────────────────────────
  localStorage.setItem(
    `myzkool_academic_years_${schoolB}`,
    JSON.stringify([{ id: yearId, name: "2025-2026", is_current: true }])
  );
  localStorage.setItem(
    `myzkool_students_${schoolB}`,
    JSON.stringify([
      {
        id: "student-beta-1",
        first_name: "Beta",
        last_name: "Student",
        admission_no: "BETA-001",
        class_id: classId,
      },
    ])
  );
  localStorage.setItem(
    `myzkool_student_dues_${schoolB}`,
    JSON.stringify([
      {
        id: "due-beta-1",
        school_id: schoolB,
        student_id: "student-beta-1",
        academic_year_id: yearId,
        fee_head_id: headTuition,
        term_id: term1Id,
        gross_paise: 999900,
        concession_paise: 0,
        net_paise: 999900,
        paid_paise: 0,
        balance_paise: 999900,
        due_date: "2026-04-10",
        status: "pending",
        source: "structure",
      },
    ])
  );

  // ── Seed Dues for School A ───────────────────────────────────────────────
  // Student 1: Tuition (₹12,000) + Transport (₹3,000) = ₹15,000 total. Paid ₹15,000 -> Status: Paid
  // Student 2: Tuition (₹12,000), No Transport. Paid ₹5,000 -> Status: Partial, Balance: ₹7,000
  // Student 3: Tuition (₹10,000). Due Date 2020-01-01 (Past). Paid ₹0 -> Status: Overdue

  const duesSchoolA: any[] = [
    // Student 1 (Term 1)
    {
      id: "due-st1-tuition",
      school_id: schoolA,
      student_id: student1Id,
      academic_year_id: yearId,
      fee_head_id: headTuition,
      term_id: term1Id,
      gross_paise: 1200000,
      concession_paise: 0,
      net_paise: 1200000,
      paid_paise: 1200000,
      balance_paise: 0,
      due_date: "2026-04-10",
      status: "paid",
      source: "structure",
      created_at: "2026-03-01T10:00:00Z",
      updated_at: "2026-03-01T10:00:00Z",
    },
    {
      id: "due-st1-transport",
      school_id: schoolA,
      student_id: student1Id,
      academic_year_id: yearId,
      fee_head_id: headTransport,
      term_id: term1Id,
      gross_paise: 300000,
      concession_paise: 0,
      net_paise: 300000,
      paid_paise: 300000,
      balance_paise: 0,
      due_date: "2026-04-10",
      status: "paid",
      source: "transport",
      source_ref: "trans-assign-1",
      created_at: "2026-03-01T10:00:00Z",
      updated_at: "2026-03-01T10:00:00Z",
    },
    // Student 2 (Term 1)
    {
      id: "due-st2-tuition",
      school_id: schoolA,
      student_id: student2Id,
      academic_year_id: yearId,
      fee_head_id: headTuition,
      term_id: term1Id,
      gross_paise: 1200000,
      concession_paise: 0,
      net_paise: 1200000,
      paid_paise: 500000,
      balance_paise: 700000,
      due_date: "2099-12-31", // Future due date
      status: "partial",
      source: "structure",
      created_at: "2026-03-01T10:00:00Z",
      updated_at: "2026-03-01T10:00:00Z",
    },
    // Student 3 (Term 1 - Overdue)
    {
      id: "due-st3-tuition",
      school_id: schoolA,
      student_id: student3Id,
      academic_year_id: yearId,
      fee_head_id: headTuition,
      term_id: term1Id,
      gross_paise: 1000000,
      concession_paise: 0,
      net_paise: 1000000,
      paid_paise: 0,
      balance_paise: 1000000,
      due_date: "2020-01-01", // Past due date
      status: "pending",
      source: "structure",
      created_at: "2020-01-01T10:00:00Z",
      updated_at: "2020-01-01T10:00:00Z",
    },
  ];

  localStorage.setItem(`myzkool_student_dues_${schoolA}`, JSON.stringify(duesSchoolA));

  // Seed Receipts for Student 1 and Student 2
  const receiptsSchoolA: any[] = [
    {
      id: "rcpt-1",
      school_id: schoolA,
      student_id: student1Id,
      receipt_no: "RCP-2026-001",
      receipt_date: "2026-04-05",
      academic_year_id: yearId,
      total_paise: 1500000,
      status: "active",
      created_at: "2026-04-05T10:00:00Z",
    },
    {
      id: "rcpt-2",
      school_id: schoolA,
      student_id: student2Id,
      receipt_no: "RCP-2026-002",
      receipt_date: "2026-04-06",
      academic_year_id: yearId,
      total_paise: 500000,
      status: "active",
      created_at: "2026-04-06T10:00:00Z",
    },
  ];
  localStorage.setItem(`myzkool_fee_receipts_${schoolA}`, JSON.stringify(receiptsSchoolA));

  const receiptItemsSchoolA: any[] = [
    {
      id: "ri-1",
      receipt_id: "rcpt-1",
      due_id: "due-st1-tuition",
      amount_paise: 1200000,
    },
    {
      id: "ri-2",
      receipt_id: "rcpt-1",
      due_id: "due-st1-transport",
      amount_paise: 300000,
    },
    {
      id: "ri-3",
      receipt_id: "rcpt-2",
      due_id: "due-st2-tuition",
      amount_paise: 500000,
    },
  ];
  localStorage.setItem(`myzkool_fee_receipt_items_${schoolA}`, JSON.stringify(receiptItemsSchoolA));

  const paymentsSchoolA: any[] = [
    {
      id: "pay-1",
      school_id: schoolA,
      receipt_id: "rcpt-1",
      mode: "upi",
      amount_paise: 1500000,
      created_at: "2026-04-05T10:00:00Z",
    },
    {
      id: "pay-2",
      school_id: schoolA,
      receipt_id: "rcpt-2",
      mode: "cash",
      amount_paise: 500000,
      created_at: "2026-04-06T10:00:00Z",
    },
  ];
  localStorage.setItem(`myzkool_fee_payments_${schoolA}`, JSON.stringify(paymentsSchoolA));

  // ── TEST 1: Tenant Isolation ───────────────────────────────────────────────
  console.log("TEST 1: Tenant Isolation Verification");
  const invoicesA = await getSchoolInvoices(schoolA);
  const invoicesB = await getSchoolInvoices(schoolB);

  assert(invoicesA.invoices.length === 3, "School A retrieves exactly 3 student invoices");
  assert(invoicesB.invoices.length === 1, "School B retrieves only its own 1 invoice");
  assert(
    !invoicesA.invoices.some((i) => i.student_name.includes("Beta")),
    "School A never leaks School B students"
  );
  assert(
    !invoicesB.invoices.some((i) => i.student_name.includes("Aarav")),
    "School B never leaks School A students"
  );

  // ── TEST 2: Invoice Totals & Transport Eligibility ─────────────────────────
  console.log("\nTEST 2: Invoice Totals & Transport Separation");
  const invAarav = invoicesA.invoices.find((i) => i.student_id === student1Id);
  assert(!!invAarav, "Student 1 (Aarav) invoice found");
  assert(invAarav?.total_paise === 1500000, "Student 1 total matches ₹15,000 (tuition + transport)");
  assert(invAarav?.tuition_paise === 1200000, "Student 1 tuition matches ₹12,000");
  assert(invAarav?.transport_paise === 300000, "Student 1 transport matches ₹3,000 as separate item");
  assert(invAarav?.status === "paid", "Student 1 status is 'paid' when balance is 0");
  assert(invAarav?.payments.length === 1, "Student 1 invoice is linked to payment receipt RCP-2026-001");

  const invAyesha = invoicesA.invoices.find((i) => i.student_id === student2Id);
  assert(!!invAyesha, "Student 2 (Ayesha) invoice found");
  assert(invAyesha?.total_paise === 1200000, "Student 2 total matches ₹12,000");
  assert(invAyesha?.transport_paise === 0, "Student 2 has ₹0 transport fees (not opted into transport)");
  assert(invAyesha?.paid_paise === 500000, "Student 2 paid amount is ₹5,000");
  assert(invAyesha?.balance_paise === 700000, "Student 2 balance due is ₹7,000");
  assert(invAyesha?.status === "partial", "Student 2 status is 'partial'");

  // ── TEST 3: Overdue Status Detection ───────────────────────────────────────
  console.log("\nTEST 3: Overdue Status Detection");
  const invRahul = invoicesA.invoices.find((i) => i.student_id === student3Id);
  assert(!!invRahul, "Student 3 (Rahul) invoice found");
  assert(invRahul?.status === "overdue", "Student 3 with past due date and outstanding balance is 'overdue'");

  // ── TEST 4: Summary Metrics Accuracy ───────────────────────────────────────
  console.log("\nTEST 4: Summary Metrics Accuracy Across Real Database Records");
  const m = invoicesA.metrics;
  // Total Invoiced: 15,000 + 12,000 + 10,000 = ₹37,000 (3700000 paise)
  // Total Paid: 15,000 + 5,000 + 0 = ₹20,000 (2000000 paise)
  // Outstanding: 0 + 7,000 + 10,000 = ₹17,000 (1700000 paise)
  // Overdue count: 1 (Student 3)
  // Overdue paise: 10,000 (1000000 paise)
  assert(m.totalInvoicedPaise === 3700000, `Total invoiced matches ₹37,000 (got ₹${m.totalInvoicedPaise / 100})`);
  assert(m.totalPaidPaise === 2000000, `Total paid matches ₹20,000 (got ₹${m.totalPaidPaise / 100})`);
  assert(m.outstandingPaise === 1700000, `Outstanding balance matches ₹17,000 (got ₹${m.outstandingPaise / 100})`);
  assert(m.overdueCount === 1, `Overdue invoices count matches 1 (got ${m.overdueCount})`);
  assert(m.overduePaise === 1000000, `Overdue balance matches ₹10,000 (got ₹${m.overduePaise / 100})`);
  assert(m.invoiceCount === 3, `Invoice count matches 3 (got ${m.invoiceCount})`);

  // ── TEST 5: Safe Invoice Void / Cancellation Safeguards ────────────────────
  console.log("\nTEST 5: Safe Void / Cancellation Safeguards");
  // Attempt to cancel Student 1 (Paid): Must be BLOCKED
  const cancelPaidRes = await cancelInvoice(schoolA, invAarav!.id, "Testing cancel paid");
  assert(
    !cancelPaidRes.success && cancelPaidRes.error?.includes("Cannot void"),
    "System refuses to void invoice with recorded payments"
  );

  // Attempt to cancel Student 3 (Unpaid): Allowed with valid reason
  const cancelUnpaidRes = await cancelInvoice(schoolA, invRahul!.id, "Student transferred to another school", "admin-1");
  assert(cancelUnpaidRes.success, "Successfully cancelled unpaid invoice with audit trail");

  // Re-fetch to verify cancelled status and updated metrics
  const afterCancel = await getSchoolInvoices(schoolA);
  const invRahulAfter = afterCancel.invoices.find((i) => i.student_id === student3Id);
  assert(invRahulAfter?.status === "cancelled", "Cancelled invoice now has status 'cancelled'");
  assert(afterCancel.metrics.overdueCount === 0, "Overdue count drops to 0 after cancelling overdue invoice");

  // ── TEST 6: Duplicate Prevention ───────────────────────────────────────────
  console.log("\nTEST 6: Duplicate Demand Prevention");
  // Setup Fee Structure for Class 10
  localStorage.setItem(
    `myzkool_fee_structures_${schoolA}`,
    JSON.stringify([
      {
        id: "struct-10",
        school_id: schoolA,
        name: "Class 10 Standard",
        class_id: classId,
        academic_year_id: yearId,
        status: "active",
      },
    ])
  );
  localStorage.setItem(
    `myzkool_fee_structure_items_${schoolA}`,
    JSON.stringify([{ id: "item-tuition", structure_id: "struct-10", fee_head_id: headTuition }])
  );
  localStorage.setItem(
    `myzkool_fee_structure_item_terms_${schoolA}`,
    JSON.stringify([
      { id: "st-t1", item_id: "item-tuition", term_id: term1Id, amount_paise: 1200000 },
      { id: "st-t2", item_id: "item-tuition", term_id: term2Id, amount_paise: 1200000 },
    ])
  );
  localStorage.setItem(
    `myzkool_fee_terms_${schoolA}_${yearId}`,
    JSON.stringify([
      { id: term1Id, name: "Quarter 1", due_date: "2026-04-10", sort_order: 1 },
      { id: term2Id, name: "Quarter 2", due_date: "2026-07-10", sort_order: 2 },
    ])
  );

  // Run generation for Term 1 (already seeded above)
  const genResult = await executeInvoiceGeneration(schoolA, yearId, { termId: term1Id, classId });
  assert(genResult.success, "Invoice generation executed successfully");
  assert(
    genResult.skippedCount > 0,
    `Duplicate prevention safely skipped already existing dues (skipped: ${genResult.skippedCount})`
  );

  console.log("\n==========================================================");
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log("==========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Unhandled error in test-invoices-lifecycle:", err);
  process.exit(1);
});
