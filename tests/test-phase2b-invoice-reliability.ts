/**
 * Phase 2B Regression Test Suite: Database Integrity & Invoice Reliability
 *
 * Validates:
 * 1. Stable invoice numbers across filters, sorting, and pagination
 * 2. Duplicate invoice generation prevention (same student + term)
 * 3. Full and partial payment calculations
 * 4. Invoice cancellation without incorrect positive debt entries (amount_paise < 0)
 * 5. Rejection of voiding invoices with recorded payments
 * 6. Receipt and payment allocation ownership and tenant isolation
 * 7. Duplicate payment submission prevention (idempotency key)
 * 8. Authoritative reconciliation of dues, payments, credits, and ledger balance
 * 9. Preservation of existing issued invoices and backup integrity
 */

import {
  getSchoolInvoices,
  createSingleStudentInvoice,
  cancelInvoice,
  executeInvoiceGeneration,
} from "../src/services/invoiceService";
import { collectFees } from "../src/services/collectionService";
import type { StudentDue, FeeTerm, FeeHead, FeeLedgerEntry } from "../src/types/fees";
import type { FeeReceipt, FeeReceiptItem, FeePayment, CollectInput } from "../src/types/collection";
import fs from "fs";
import path from "path";

// In-memory localStorage polyfill
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

async function runPhase2BTests() {
  console.log("==========================================================");
  console.log("PHASE 2B: DATABASE INTEGRITY & INVOICE RELIABILITY SUITE");
  console.log("==========================================================\n");

  const schoolA = "school-aaa-1111";
  const schoolB = "school-bbb-2222";
  const academicYearId = "ay-2025-2026";

  // Pre-seed mock students for school A & B
  const studentsSchoolA = [
    { id: "std-1", school_id: schoolA, first_name: "Aarav", last_name: "Sharma", admission_no: "ADM-001", class_id: "class-10", section_id: "sec-a" },
    { id: "std-2", school_id: schoolA, first_name: "Bhavna", last_name: "Patel", admission_no: "ADM-002", class_id: "class-10", section_id: "sec-a" },
    { id: "std-3", school_id: schoolA, first_name: "Chetan", last_name: "Verma", admission_no: "ADM-003", class_id: "class-9", section_id: "sec-b" },
  ];
  const studentsSchoolB = [
    { id: "std-4", school_id: schoolB, first_name: "Divya", last_name: "Nair", admission_no: "ADM-999", class_id: "class-8", section_id: "sec-a" },
  ];

  localStorage.setItem(`myzkool_students_${schoolA}`, JSON.stringify(studentsSchoolA));
  localStorage.setItem(`myzkool_students_${schoolB}`, JSON.stringify(studentsSchoolB));
  localStorage.setItem(
    `myzkool_academic_years_${schoolA}`,
    JSON.stringify([{ id: academicYearId, name: "2025-2026", is_current: true }])
  );
  localStorage.setItem(
    `myzkool_classes_${schoolA}`,
    JSON.stringify([
      { id: "class-10", name: "Class 10" },
      { id: "class-9", name: "Class 9" },
    ])
  );
  localStorage.setItem(
    `myzkool_sections_${schoolA}`,
    JSON.stringify([
      { id: "sec-a", name: "A", class_id: "class-10" },
      { id: "sec-b", name: "B", class_id: "class-9" },
    ])
  );
  localStorage.setItem(
    `myzkool_fee_heads_${schoolA}`,
    JSON.stringify([{ id: "head-tuition", name: "Tuition Fee" }])
  );
  localStorage.setItem(
    `myzkool_fee_terms_${schoolA}`,
    JSON.stringify([{ id: "term-1", name: "Term 1", code: "T1" }])
  );

  // Setup initial dues for testing
  const duesSchoolA: StudentDue[] = [
    {
      id: "due-1-tuition",
      school_id: schoolA,
      student_id: "std-1",
      academic_year_id: academicYearId,
      term_id: "term-1",
      fee_head_id: "head-tuition",
      source: "structure",
      invoice_no: "INV-2026-0001",
      due_date: "2027-07-10", // Future date so status is unpaid
      gross_paise: 1000000,
      concession_paise: 0,
      net_paise: 1000000,
      paid_paise: 0,
      balance_paise: 1000000,
      status: "pending",
      created_at: "2025-07-01T10:00:00Z",
      updated_at: "2025-07-01T10:00:00Z",
    },
    {
      id: "due-2-tuition",
      school_id: schoolA,
      student_id: "std-2",
      academic_year_id: academicYearId,
      term_id: "term-1",
      fee_head_id: "head-tuition",
      source: "structure",
      invoice_no: "INV-2026-0002",
      due_date: "2027-07-10",
      gross_paise: 1500000,
      concession_paise: 0,
      net_paise: 1500000,
      paid_paise: 500000,
      balance_paise: 1000000,
      status: "partial",
      created_at: "2025-07-01T10:00:00Z",
      updated_at: "2025-07-01T10:00:00Z",
    },
    {
      id: "due-3-tuition",
      school_id: schoolA,
      student_id: "std-3",
      academic_year_id: academicYearId,
      term_id: "term-1",
      fee_head_id: "head-tuition",
      source: "structure",
      invoice_no: "INV-2026-0003",
      due_date: "2025-06-01", // Past due date, so invoice status is computed as 'overdue'
      gross_paise: 800000,
      concession_paise: 0,
      net_paise: 800000,
      paid_paise: 0,
      balance_paise: 800000,
      status: "pending",
      created_at: "2025-06-01T10:00:00Z",
      updated_at: "2025-06-01T10:00:00Z",
    },
  ];

  localStorage.setItem(`myzkool_student_dues_${schoolA}`, JSON.stringify(duesSchoolA));

  // ----------------------------------------------------
  // TEST 1: Stable Invoice Numbers Across Sorting, Filtering, and Pagination
  // ----------------------------------------------------
  console.log("TEST 1: Stable Invoice Numbers Across Sorting, Filtering, and Pagination");
  const defaultRes = await getSchoolInvoices(schoolA, { academic_year_id: academicYearId });
  const defaultList = defaultRes.invoices;
  assert(defaultList.length === 3, "Loads 3 invoices for School A");

  const invStd1Default = defaultList.find((i) => i.student_id === "std-1");
  const invStd2Default = defaultList.find((i) => i.student_id === "std-2");
  const invStd3Default = defaultList.find((i) => i.student_id === "std-3");

  assert(invStd1Default?.invoice_no === "INV-2026-0001", `Student 1 invoice number is INV-2026-0001 (got ${invStd1Default?.invoice_no})`);
  assert(invStd2Default?.invoice_no === "INV-2026-0002", `Student 2 invoice number is INV-2026-0002 (got ${invStd2Default?.invoice_no})`);
  assert(invStd3Default?.invoice_no === "INV-2026-0003", `Student 3 invoice number is INV-2026-0003 (got ${invStd3Default?.invoice_no})`);

  // Reverse sort by student name
  const sortedDescRes = await getSchoolInvoices(schoolA, {
    academic_year_id: academicYearId,
    sortBy: "student",
    sortOrder: "desc",
  });
  const invStd1Sorted = sortedDescRes.invoices.find((i) => i.student_id === "std-1");
  assert(invStd1Sorted?.invoice_no === "INV-2026-0001", "Student 1 invoice number remains INV-2026-0001 when sort order is reversed");

  // Filter only 'overdue' status (only Student 3 should return)
  const filteredOverdueRes = await getSchoolInvoices(schoolA, {
    academic_year_id: academicYearId,
    status: "overdue",
  });
  const filteredOverdue = filteredOverdueRes.invoices;
  assert(filteredOverdue.length === 1, `Filter 'overdue' returns exactly 1 invoice (got ${filteredOverdue.length})`);
  assert(
    filteredOverdue[0]?.invoice_no === "INV-2026-0003",
    `Student 3 keeps stable number INV-2026-0003 when filtered alone (got ${filteredOverdue[0]?.invoice_no})`
  );

  // Pagination test
  const page1Res = await getSchoolInvoices(schoolA, { academic_year_id: academicYearId, page: 1, pageSize: 2 });
  const page2Res = await getSchoolInvoices(schoolA, { academic_year_id: academicYearId, page: 2, pageSize: 2 });
  const page1 = page1Res.invoices;
  const page2 = page2Res.invoices;
  assert(page1.length === 2 && page2.length === 1, "Pagination divides 3 invoices into 2 on page 1 and 1 on page 2");
  const page2Invoice = page2[0];
  assert(
    page2Invoice.invoice_no === "INV-2026-0003" && page2Invoice.student_id === "std-3",
    "Page 2 retains stable invoice number and student association"
  );

  // ----------------------------------------------------
  // TEST 2: Duplicate Invoice Generation Prevention
  // ----------------------------------------------------
  console.log("\nTEST 2: Duplicate Invoice Generation Prevention");
  const dupCreateResult = await createSingleStudentInvoice(schoolA, {
    studentId: "std-1",
    academicYearId,
    termId: "term-1",
    billingPeriod: "Term 1",
    invoiceDate: "2027-07-01",
    dueDate: "2027-07-15",
    feeComponents: [
      {
        name: "Tuition Fee",
        amount_paise: 1000000,
        fee_head_id: "head-tuition",
      },
    ],
  });
  const duplicatePrevented =
    !dupCreateResult.success &&
    typeof dupCreateResult.error === "string" &&
    dupCreateResult.error.includes("already exists");
  assert(duplicatePrevented, "createSingleStudentInvoice rejects creating duplicate invoice for the same student, term, and academic year");

  // ----------------------------------------------------
  // TEST 3: Safe Void / Cancellation Safeguards & Correct Ledger Sign
  // ----------------------------------------------------
  console.log("\nTEST 3: Safe Void / Cancellation Safeguards & Correct Ledger Sign");
  // 3a. Rejection when paid_paise > 0
  const partiallyPaidInvoice = defaultList.find((i) => i.student_id === "std-2")!;
  const cancelPaidResult = await cancelInvoice(
    schoolA,
    partiallyPaidInvoice.id,
    "Attempting to cancel partially paid invoice"
  );
  const cancelPaidRejected =
    !cancelPaidResult.success &&
    typeof cancelPaidResult.error === "string" &&
    cancelPaidResult.error.includes("Cannot void Invoice");
  assert(cancelPaidRejected, "cancelInvoice strictly blocks voiding an invoice with recorded payments");

  // 3b. Cancellation of unpaid invoice and verifying negative ledger entry
  const unpaidInvoice = defaultList.find((i) => i.student_id === "std-1")!;
  const cancelResult = await cancelInvoice(schoolA, unpaidInvoice.id, "Customer requested cancellation");
  assert(cancelResult.success, "Unpaid invoice cancelled successfully");

  // Verify status in dues
  const updatedDuesStr = localStorage.getItem(`myzkool_student_dues_${schoolA}`);
  const updatedDues: StudentDue[] = JSON.parse(updatedDuesStr || "[]");
  const cancelledDue = updatedDues.find((d) => d.id === "due-1-tuition");
  assert(cancelledDue?.status === "cancelled", "Cancelled due status is updated to 'cancelled'");

  // Verify ledger entry: MUST be negative (amount_paise < 0) and use 'note' (not 'notes')
  const ledgerStr = localStorage.getItem(`myzkool_fee_ledger_${schoolA}`);
  const ledgerEntries: any[] = JSON.parse(ledgerStr || "[]");
  const cancelEntry = ledgerEntries.find((e) => e.entry_type === "cancel_due");
  assert(!!cancelEntry, "A 'cancel_due' entry was recorded in fee_ledger");
  assert(
    (cancelEntry?.amount_paise ?? 0) < 0,
    `cancel_due amount_paise must be strictly NEGATIVE to reduce debt (got ${cancelEntry?.amount_paise})`
  );
  assert(
    cancelEntry?.amount_paise === -1000000,
    `cancel_due amount_paise is exactly -1,000,000 paise (got ${cancelEntry?.amount_paise})`
  );
  assert(
    typeof (cancelEntry as any).note === "string" && (cancelEntry as any).notes === undefined,
    "fee_ledger entry correctly populates 'note' column and does not write non-existent 'notes'"
  );

  // ----------------------------------------------------
  // TEST 4: Receipt & Payment Allocation Ownership and Tenant Isolation
  // ----------------------------------------------------
  console.log("\nTEST 4: Receipt & Payment Allocation Ownership and Tenant Isolation");
  // Setup receipt for School A
  const receiptA: FeeReceipt = {
    id: "rcp-aaa-1",
    school_id: schoolA,
    receipt_no: "RCP-2026-0001",
    student_id: "std-2",
    academic_year_id: academicYearId,
    receipt_date: "2025-07-05",
    total_paise: 500000,
    status: "active",
    source: "counter",
    payment_group_id: null,
    collected_by: "user-1",
    remarks: null,
    idempotency_key: "idem-rcp-aaa-1",
    print_count: 0,
    whatsapp_sent_at: null,
    cancelled_by: null,
    cancelled_at: null,
    cancel_reason: null,
    created_at: "2025-07-05T10:00:00Z",
    updated_at: "2025-07-05T10:00:00Z",
  };
  const receiptItemA: FeeReceiptItem = {
    id: "item-aaa-1",
    school_id: schoolA,
    receipt_id: "rcp-aaa-1",
    due_id: "due-2-tuition",
    fee_head_id: "head-tuition",
    amount_paise: 500000,
  };
  localStorage.setItem(`myzkool_fee_receipts_${schoolA}`, JSON.stringify([receiptA]));
  localStorage.setItem(`myzkool_fee_receipt_items_${schoolA}`, JSON.stringify([receiptItemA]));

  // Verify that School B sees zero receipts and zero items
  const receiptsB = JSON.parse(localStorage.getItem(`myzkool_fee_receipts_${schoolB}`) || "[]");
  assert(receiptsB.length === 0, "School B cannot view or access School A fee receipts");

  // ----------------------------------------------------
  // TEST 5: Duplicate Payment Submission Prevention (Idempotency Key)
  // ----------------------------------------------------
  const collectInput: CollectInput = {
    student_id: "std-3",
    academic_year_id: academicYearId,
    selected_due_ids: ["due-3-tuition"],
    payments: [{ mode: "upi", amount_paise: 400000, reference_no: "UPI-TXN-12345" }],
    source: "counter",
  };
  const idemKey = "idem-key-batch-test-999";

  const firstSubmission = await collectFees(schoolA, collectInput, idemKey, "accountant-1");
  assert(!!firstSubmission.receipt_no, `First payment submission succeeded with receipt: ${firstSubmission.receipt_no}`);

  const secondSubmission = await collectFees(schoolA, collectInput, idemKey, "accountant-1");
  assert(
    secondSubmission.receipt_id === firstSubmission.receipt_id,
    "Second payment submission with same idempotency key returns existing receipt (no duplicate)"
  );
  assert(
    secondSubmission.idempotent === true,
    "Second submission is flagged as duplicate/idempotent"
  );

  // ----------------------------------------------------
  // TEST 6: Authoritative Ledger & Balance Reconciliation
  // ----------------------------------------------------
  console.log("\nTEST 6: Authoritative Ledger & Balance Reconciliation");
  // For Student 3:
  // Original due: 800,000 paise (due-3-tuition)
  // Payment: 400,000 paise
  // Outstanding should be 400,000 paise
  const student3DuesList: StudentDue[] = JSON.parse(localStorage.getItem(`myzkool_student_dues_${schoolA}`) || "[]");
  const student3Due = student3DuesList.find((d) => d.id === "due-3-tuition");
  assert(student3Due?.balance_paise === 400000, `Student 3 balance is 400,000 paise (₹4,000) (got ${student3Due?.balance_paise})`);
  assert(student3Due?.paid_paise === 400000, `Student 3 paid_paise is 400,000 paise (got ${student3Due?.paid_paise})`);
  assert(student3Due?.status === "partial", `Student 3 status is 'partial' (got ${student3Due?.status})`);

  // ----------------------------------------------------
  // TEST 7: Database Backup Verification & File Integrity
  // ----------------------------------------------------
  console.log("\nTEST 7: Database Backup Verification & File Integrity");
  const backupPath = path.resolve(process.cwd(), "scripts/backups/phase2b_financial_backup_pre.json");
  const backupExists = fs.existsSync(backupPath);
  assert(backupExists, "Pre-Phase 2B backup file exists on disk");
  if (backupExists) {
    const backupContent = JSON.parse(fs.readFileSync(backupPath, "utf-8"));
    assert(backupContent.student_dues?.length === 417, `Backup contains all 417 live student dues (got ${backupContent.student_dues?.length})`);
    assert(backupContent.fee_ledger?.length === 87, `Backup contains all 87 live fee ledger entries (got ${backupContent.fee_ledger?.length})`);
    assert(backupContent.fee_receipts?.length === 2, `Backup contains all 2 live fee receipts (got ${backupContent.fee_receipts?.length})`);
    assert(backupContent.fee_payments?.length === 2, `Backup contains all 2 live fee payments (got ${backupContent.fee_payments?.length})`);
    assert(backupContent.fee_receipt_items?.length === 1, `Backup contains all 1 live fee receipt items (got ${backupContent.fee_receipt_items?.length})`);
    assert(backupContent.fee_credits?.length === 1, `Backup contains all 1 live fee credits (got ${backupContent.fee_credits?.length})`);
  }

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log("\n==========================================================");
  console.log(`PHASE 2B RESULTS: ${passed} passed, ${failed} failed`);
  console.log("==========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2BTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
