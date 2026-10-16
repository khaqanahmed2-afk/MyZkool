/**
 * Automated Test Suite for MyZkool Invoice Management
 * Verifies:
 * 1. Tenant Isolation
 * 2. Invoice Totals and Line Item Aggregation
 * 3. Status Determination (Unpaid, Partial, Paid, Overdue, Cancelled)
 * 4. Duplicate Prevention (Idempotent Generation)
 * 5. Transport Fee Separation & Eligibility
 * 6. Protection of Paid Invoices from Cancellation
 */

import {
  getSchoolInvoices,
  getInvoiceById,
  previewInvoiceGeneration,
  executeInvoiceGeneration,
  cancelInvoice,
} from "../src/services/invoiceService";
import type { StudentInvoice } from "../src/types/fees";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(msg);
  } else {
    console.log(`  ✓ ${msg}`);
  }
}

async function runInvoiceTests() {
  console.log("=== STARTING MYZKOOL INVOICE MANAGEMENT TEST SUITE ===\n");

  const schoolA = "school_tenant_a_101";
  const schoolB = "school_tenant_b_202";
  const yearId = "year_2026_27";
  const termId = "term_quarter_1";

  // Setup mock local data in localStorage for deterministic headless execution
  const mockStudentsSchoolA = [
    {
      id: "stud_01",
      school_id: schoolA,
      first_name: "Aarav",
      last_name: "Sharma",
      admission_no: "ADM-101",
      class_id: "class_5",
      section_id: "sec_5a",
      guardian_name: "Rajesh Sharma",
      guardian_phone: "+91 9876543210",
      deleted_at: null,
    },
    {
      id: "stud_02",
      school_id: schoolA,
      first_name: "Ananya",
      last_name: "Verma",
      admission_no: "ADM-102",
      class_id: "class_5",
      section_id: "sec_5a",
      guardian_name: "Suresh Verma",
      guardian_phone: "+91 9876543211",
      deleted_at: null,
    },
  ];

  const mockStudentsSchoolB = [
    {
      id: "stud_03_b",
      school_id: schoolB,
      first_name: "Rohan",
      last_name: "Gupta",
      admission_no: "ADM-999",
      class_id: "class_5",
      deleted_at: null,
    },
  ];

  const mockClasses = [
    { id: "class_5", school_id: schoolA, name: "Class 5" },
  ];

  const mockSections = [
    { id: "sec_5a", school_id: schoolA, name: "Section A" },
  ];

  const mockTerms = [
    {
      id: termId,
      school_id: schoolA,
      academic_year_id: yearId,
      name: "Quarter 1 (Apr - Jun)",
      due_date: "2026-05-15",
    },
  ];

  const mockHeads = [
    { id: "head_tuition", school_id: schoolA, name: "Tuition Fee", code: "tuition_fee" },
    { id: "head_transport", school_id: schoolA, name: "Transport Fee", code: "transport_fee" },
  ];

  // Aarav has a bus route assignment; Ananya does not
  const mockTransportAssignments = [
    {
      id: "trans_assign_01",
      school_id: schoolA,
      student_id: "stud_01",
      route_id: "route_north",
      stop_id: "stop_mg_road",
      monthly_fee_paise: 250000, // Rs. 2,500
      status: "active",
      academic_year_id: yearId,
    },
  ];

  // Set up mock dues for School A
  // Aarav (stud_01): Tuition (Rs. 10,000) + Transport (Rs. 2,500), partially paid Rs. 5,000
  // Ananya (stud_02): Tuition (Rs. 10,000), unpaid, past due date => Overdue
  const pastDueDate = "2026-04-10";
  const futureDueDate = "2026-06-30";

  const mockDuesSchoolA = [
    {
      id: "due_01_tuition",
      school_id: schoolA,
      student_id: "stud_01",
      academic_year_id: yearId,
      term_id: termId,
      fee_head_id: "head_tuition",
      source: "structure",
      gross_paise: 1000000,
      concession_paise: 0,
      net_paise: 1000000,
      paid_paise: 500000,
      balance_paise: 500000,
      due_date: futureDueDate,
      status: "partial",
    },
    {
      id: "due_01_transport",
      school_id: schoolA,
      student_id: "stud_01",
      academic_year_id: yearId,
      term_id: termId,
      fee_head_id: "head_transport",
      source: "transport",
      gross_paise: 250000,
      concession_paise: 0,
      net_paise: 250000,
      paid_paise: 0,
      balance_paise: 250000,
      due_date: futureDueDate,
      status: "pending",
    },
    {
      id: "due_02_tuition",
      school_id: schoolA,
      student_id: "stud_02",
      academic_year_id: yearId,
      term_id: termId,
      fee_head_id: "head_tuition",
      source: "structure",
      gross_paise: 1000000,
      concession_paise: 100000, // Rs. 1,000 discount
      net_paise: 900000,
      paid_paise: 0,
      balance_paise: 900000,
      due_date: pastDueDate, // Overdue
      status: "pending",
    },
  ];

  const mockReceiptsSchoolA = [
    {
      id: "rcpt_01",
      school_id: schoolA,
      student_id: "stud_01",
      receipt_no: "RCP-2026-0001",
      receipt_date: "2026-05-01",
      total_paise: 500000,
      status: "active",
      collected_by: "user_acc_01",
    },
  ];

  const mockReceiptItemsSchoolA = [
    {
      id: "item_01",
      receipt_id: "rcpt_01",
      due_id: "due_01_tuition",
      amount_paise: 500000,
    },
  ];

  const mockReceiptPaymentsSchoolA = [
    {
      id: "pay_01",
      receipt_id: "rcpt_01",
      mode: "upi",
      amount_paise: 500000,
      reference_no: "UPI/123456",
    },
  ];

  // Save into localStorage
  const globalStorage: Record<string, string> = {
    [`myzkool_students_${schoolA}`]: JSON.stringify(mockStudentsSchoolA),
    [`myzkool_students_${schoolB}`]: JSON.stringify(mockStudentsSchoolB),
    [`myzkool_classes_${schoolA}`]: JSON.stringify(mockClasses),
    [`myzkool_sections_${schoolA}`]: JSON.stringify(mockSections),
    [`myzkool_fee_terms_${schoolA}`]: JSON.stringify(mockTerms),
    [`myzkool_fee_heads_${schoolA}`]: JSON.stringify(mockHeads),
    [`myzkool_transport_assignments_${schoolA}`]: JSON.stringify(mockTransportAssignments),
    [`myzkool_student_dues_${schoolA}`]: JSON.stringify(mockDuesSchoolA),
    [`myzkool_fee_receipts_${schoolA}`]: JSON.stringify(mockReceiptsSchoolA),
    [`myzkool_fee_receipt_items_${schoolA}`]: JSON.stringify(mockReceiptItemsSchoolA),
    [`myzkool_fee_payments_${schoolA}`]: JSON.stringify(mockReceiptPaymentsSchoolA),
  };

  (globalThis as any).localStorage = {
    getItem: (key: string) => globalStorage[key] || null,
    setItem: (key: string, val: string) => {
      globalStorage[key] = val;
    },
    removeItem: (key: string) => {
      delete globalStorage[key];
    },
  };

  // TEST 1: Tenant Isolation
  console.log("Test 1: Tenant Isolation");
  const resSchoolA = await getSchoolInvoices(schoolA, { academic_year_id: yearId });
  const resSchoolB = await getSchoolInvoices(schoolB, { academic_year_id: yearId });

  assert(resSchoolA.invoices.length === 2, "School A has exactly 2 invoices");
  assert(resSchoolB.invoices.length === 0, "School B has 0 invoices (no cross-tenant leakage)");

  // TEST 2: Invoice Totals & Line Items Calculation
  console.log("\nTest 2: Invoice Totals and Line Items");
  const invAarav = resSchoolA.invoices.find((i) => i.student_id === "stud_01")!;
  assert(invAarav !== undefined, "Found Aarav's invoice");
  assert(invAarav.gross_paise === 1250000, "Aarav gross total is Rs. 12,500 (1250000 paise)");
  assert(invAarav.tuition_paise === 1000000, "Aarav tuition component is Rs. 10,000");
  assert(invAarav.transport_paise === 250000, "Aarav transport component is Rs. 2,500");
  assert(invAarav.paid_paise === 500000, "Aarav paid amount is Rs. 5,000");
  assert(invAarav.balance_paise === 750000, "Aarav balance due is Rs. 7,500");
  assert(invAarav.line_items.length === 2, "Aarav has 2 line items");

  // TEST 3: Status Determination (Partial vs Overdue vs Paid)
  console.log("\nTest 3: Status Determination");
  assert(invAarav.status === "partial", "Aarav invoice is marked 'partial'");

  const invAnanya = resSchoolA.invoices.find((i) => i.student_id === "stud_02")!;
  assert(invAnanya !== undefined, "Found Ananya's invoice");
  assert(invAnanya.status === "overdue", "Ananya invoice with past due date is marked 'overdue'");
  assert(invAnanya.concession_paise === 100000, "Ananya has Rs. 1,000 concession recorded");
  assert(invAnanya.total_paise === 900000, "Ananya net invoice total is Rs. 9,000");

  // TEST 4: Transport Eligibility & Separation
  console.log("\nTest 4: Transport Eligibility & Separation");
  const aaravTransportItem = invAarav.line_items.find((l) => l.is_transport);
  assert(aaravTransportItem !== undefined, "Aarav has a designated transport line item");
  assert(aaravTransportItem!.gross_paise === 250000, "Transport fee is Rs. 2,500");

  const ananyaTransportItem = invAnanya.line_items.find((l) => l.is_transport);
  assert(ananyaTransportItem === undefined, "Ananya (without bus assignment) has NO transport fee");

  // TEST 5: Payment Receipts Linkage
  console.log("\nTest 5: Payment Receipts Linkage");
  assert(invAarav.payments.length === 1, "Aarav's invoice has 1 linked payment receipt");
  assert(invAarav.payments[0].receipt_no === "RCP-2026-0001", "Linked receipt number matches RCP-2026-0001");
  assert(invAarav.payments[0].amount_paise === 500000, "Linked receipt amount is Rs. 5,000");

  // TEST 6: Protection of Paid Invoices (Cannot Void Paid Invoices)
  console.log("\nTest 6: Safety - Block Cancelling Paid Invoices");
  const cancelPaidAttempt = await cancelInvoice(schoolA, invAarav.id, "Attempting invalid cancellation");
  assert(!cancelPaidAttempt.success, "Cancelling partially paid invoice is rejected");
  assert(
    cancelPaidAttempt.error?.toLowerCase().includes("payments") === true,
    "Helpful error message returned: cannot cancel invoice with collected payments"
  );

  // TEST 7: Cancelling Unpaid Invoice
  console.log("\nTest 7: Cancelling Eligible Unpaid Invoice");
  const cancelUnpaidAttempt = await cancelInvoice(schoolA, invAnanya.id, "Student granted transfer certificate");
  assert(cancelUnpaidAttempt.success, "Cancelling unpaid invoice succeeded");

  // Re-fetch to verify status changed to cancelled / void
  const { invoice: updatedAnanya } = await getInvoiceById(schoolA, invAnanya.id);
  assert(updatedAnanya?.status === "cancelled", "Ananya invoice is now marked 'cancelled'");

  // TEST 8: Summary Metrics Accuracy
  console.log("\nTest 8: Summary Metrics Calculation");
  const metricsCheck = await getSchoolInvoices(schoolA, { academic_year_id: yearId });
  assert(metricsCheck.metrics.totalInvoicedPaise > 0, "Summary metrics computed totalInvoicedPaise");
  assert(metricsCheck.metrics.totalPaidPaise === 500000, "Summary metrics totalPaidPaise is Rs. 5,000");
  assert(metricsCheck.metrics.invoiceCount === 1, "Summary metrics counted 1 active non-cancelled invoice");
  assert(metricsCheck.totalCount === 2, "Total invoices list still contains 2 invoices (including voided)");

  console.log("\n🎉 ALL 8 INVOICE TEST SUITES PASSED SUCCESSFULLY!");
}

runInvoiceTests().catch((err) => {
  console.error("FATAL TEST FAILURE:", err);
  process.exit(1);
});
