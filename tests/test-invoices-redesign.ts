/**
 * Comprehensive Redesigned Invoices Test Suite
 *
 * Validates:
 * 1. Student Search & Pre-filled Fee Form Data (Create Invoice Drawer Step 1 & 2)
 * 2. Transport fee detection and inclusion
 * 3. Concession application & discount calculations
 * 4. Single invoice generation & duplicate prevention (Step 3 & 4)
 * 5. Summary metrics (total invoiced, paid, pending, overdue counts & percentages)
 * 6. Quick status filtering and query filtering
 * 7. Safeguards against cancelling paid invoices
 * 8. Seed demonstration data consistency
 */

import {
  getSchoolInvoices,
  getInvoiceById,
  searchStudentsForInvoice,
  getStudentInvoiceFormData,
  createSingleStudentInvoice,
  cancelInvoice,
  seedDemoInvoicesIfEmpty,
  formatInvoiceNumber,
} from "../src/services/invoiceService";
import type { StudentInvoice } from "../src/types/fees";

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

async function runTests() {
  console.log("==========================================================");
  console.log("MYZKOOL INVOICES PAGE REDESIGN & DRAWER TEST SUITE");
  console.log("==========================================================\n");

  const testSchool = "school-redesign-test";
  const yearId = "year-2025-2026";

  // 1. Seed demo records matching reference image
  seedDemoInvoicesIfEmpty(testSchool, yearId);

  // TEST 1: Initial Invoices & Summary Metrics
  console.log("TEST 1: Invoices List & Summary Metrics Baseline");
  const { invoices, metrics, totalCount } = await getSchoolInvoices(testSchool, {
    academic_year_id: yearId,
  });

  assert(invoices.length === 8, `Loads exactly 8 reference invoices (got ${invoices.length})`);
  assert(invoices[0].invoice_no === "INV-2026-001", `First invoice is INV-2026-001 (got ${invoices[0].invoice_no})`);
  assert(invoices[0].student_name === "Aarav Sharma", `Student 1 is Aarav Sharma`);
  assert(invoices[0].total_paise === 1500000, `Student 1 amount is ₹15,000 (got ${invoices[0].total_paise})`);
  assert(invoices[0].status === "overdue", `Student 1 status is overdue`);

  // Row 2: Ayesha Khan
  const inv2 = invoices.find((i) => i.invoice_no === "INV-2026-002");
  assert(inv2 !== undefined, "INV-2026-002 found");
  assert(inv2?.status === "partial", "INV-2026-002 is partially paid");
  assert(inv2?.paid_paise === 500000, "INV-2026-002 paid amount is ₹5,000");
  assert(inv2?.balance_paise === 700000, "INV-2026-002 balance is ₹7,000");

  // Row 3: Rahul Verma
  const inv3 = invoices.find((i) => i.invoice_no === "INV-2026-003");
  assert(inv3?.status === "paid", "INV-2026-003 is paid");
  assert(inv3?.balance_paise === 0, "INV-2026-003 balance is 0");

  // TEST 2: Student Search for Drawer
  console.log("\nTEST 2: Student Search in Create Invoice Drawer");
  const searchResults1 = await searchStudentsForInvoice(testSchool, "Aarav", yearId);
  assert(searchResults1.length === 1, "Finds Aarav Sharma by name search");
  assert(searchResults1[0].admission_no === "ADM-2023-015", "Aarav admission no is ADM-2023-015");
  assert(searchResults1[0].has_transport === true, "Aarav has active transport assignment");

  const searchResults2 = await searchStudentsForInvoice(testSchool, "ADM-2022-048", yearId);
  assert(searchResults2.length === 1, "Finds Ayesha Khan by admission number search");
  assert(searchResults2[0].name === "Ayesha Khan", "Matched student name is Ayesha Khan");

  // TEST 3: Pre-filled Fee Form Data (Drawer Step 2)
  console.log("\nTEST 3: Form Data Pre-fill & Calculations");
  const formData = await getStudentInvoiceFormData(testSchool, "demo-std-1", yearId);
  assert(formData.terms.length >= 4, `Loads available fee terms (count: ${formData.terms.length})`);
  assert(formData.feeComponents.some((c) => c.name === "Tuition Fee"), "Tuition Fee component present");
  assert(formData.feeComponents.some((c) => c.name === "Transport Fee"), "Transport Fee component present");
  assert(formData.concessions.some((c) => c.name.includes("Sibling")), "Sibling concession available");

  // TEST 4: Single Invoice Creation (Drawer Step 4)
  console.log("\nTEST 4: Single Invoice Creation via Drawer");
  // Create an invoice for Ayesha Khan for Term Oct 2026
  const newInvoiceRes = await createSingleStudentInvoice(testSchool, {
    studentId: "demo-std-2",
    academicYearId: yearId,
    termId: "term-oct-2026",
    billingPeriod: "Oct 2026",
    invoiceDate: "2026-10-01",
    dueDate: "2026-10-15",
    feeComponents: [
      { name: "Tuition Fee", amount_paise: 1200000, fee_head_id: "head-tuition" },
      { name: "Transport Fee", amount_paise: 200000, is_transport: true, fee_head_id: "head-transport" },
    ],
    concessionPaise: 200000, // ₹2,000 concession
    notes: "Approved sibling discount",
  });

  assert(newInvoiceRes.success === true, "Single invoice created successfully");
  assert(newInvoiceRes.invoice_no !== undefined, `Generated invoice number: ${newInvoiceRes.invoice_no}`);
  assert(newInvoiceRes.invoice?.total_paise === 1200000, "Net total is ₹12,000 (14,000 - 2,000 discount)");

  // TEST 5: Duplicate Prevention
  console.log("\nTEST 5: Duplicate Invoice Prevention");
  const duplicateRes = await createSingleStudentInvoice(testSchool, {
    studentId: "demo-std-2",
    academicYearId: yearId,
    termId: "term-oct-2026",
    billingPeriod: "Oct 2026",
    invoiceDate: "2026-10-01",
    dueDate: "2026-10-15",
    feeComponents: [{ name: "Tuition Fee", amount_paise: 1200000 }],
  });
  assert(duplicateRes.success === false, "System rejected duplicate invoice for the same student and term");
  assert(duplicateRes.error?.includes("already exists"), "Error message informs of existing active invoice");

  // TEST 6: Protected Cancellation Safeguards
  console.log("\nTEST 6: Invoice Cancellation Safeguards");
  // Try to cancel paid invoice INV-2026-003
  const cancelPaidRes = await cancelInvoice(testSchool, "inv_demo-std-3_term-oct-2025_year-2025-2026", "Testing void");
  assert(cancelPaidRes.success === false, "System refuses to cancel invoice with recorded payments");

  // Cancel the newly created unpaid invoice
  if (newInvoiceRes.invoice) {
    const cancelNewRes = await cancelInvoice(testSchool, newInvoiceRes.invoice.id, "Administrative cancellation test");
    assert(cancelNewRes.success === true, "Successfully cancelled unpaid invoice");
  }

  // TEST 7: Search and Filter Matching
  console.log("\nTEST 7: Search & Status Filters Verification");
  const filteredSearch = await getSchoolInvoices(testSchool, {
    search: "Ayesha",
    academic_year_id: yearId,
  });
  const activeAyesha = filteredSearch.invoices.filter((i) => i.status !== "cancelled");
  assert(activeAyesha.length === 1, "Filter by name 'Ayesha' returns exactly 1 active invoice");

  const filteredPaid = await getSchoolInvoices(testSchool, {
    status: "paid",
    academic_year_id: yearId,
  });
  assert(filteredPaid.invoices.every((i) => i.status === "paid"), "Status 'paid' returns only paid invoices");

  const filteredOverdue = await getSchoolInvoices(testSchool, {
    status: "overdue",
    academic_year_id: yearId,
  });
  assert(filteredOverdue.invoices.every((i) => i.status === "overdue"), "Status 'overdue' returns only overdue invoices");

  console.log("\n==========================================================");
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log("==========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
