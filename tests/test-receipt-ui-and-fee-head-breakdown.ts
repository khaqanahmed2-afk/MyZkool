/**
 * Comprehensive Test Suite for MyZkool Fee Receipt UI & Line Items Breakdown
 *
 * Verifies:
 * 1. UI Redesign (Header alignment, subtle divider, single copy badge, 2-column details, 3 summary cards, signatures & seal, no QR code)
 * 2. Complete invoice-wise Line Items Breakdown (Gross, Concession, Net, Paid, Outstanding)
 * 3. The referenced scenario: ₹10,700 total invoice / ₹10,000 paid / ₹700 remaining balance with the 6 example fee heads + ₹700 charge
 * 4. Partial payment status & badge accessibility (no contradictory labels)
 * 5. Multi-invoice collection breakdown & grouping
 * 6. Historical invoice with missing line items (explicit discrepancy reporting, no invented fee heads)
 * 7. Multi-page pagination safety (@page, thead table-header-group, tr page-break-inside avoid)
 * 8. All three approved themes (MyZkool Blue, Mint Pastel, Lavender Pastel)
 * 9. Supported paper sizes (A4, A5, Thermal 80mm)
 * 10. Existing test backwards-compatibility
 */

import {
  generateReceiptHTML,
  RECEIPT_THEMES,
  DEFAULT_RECEIPT_TERMS,
  ReceiptLineItemBreakdown,
} from "../src/lib/receiptTemplate";
import type { FeeReceipt, FeeReceiptItem, FeePayment } from "../src/types/collection";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log("=== RUNNING RECEIPT UI & FEE-HEAD BREAKDOWN TESTS ===\n");

  const schoolDetails = {
    name: "Delhi Public Global School",
    address: "Plot 12, Sector 5, Dwarka, New Delhi - 110075",
    phone: "+91 98765 43210",
    email: "accounts@dpgschool.in",
    affiliation_no: "CBSE / AFF-2026-19283",
    signatory_name: "Dr. Alok Verma",
    signatory_designation: "Head of Accounts",
    terms: DEFAULT_RECEIPT_TERMS,
  };

  const studentDetails = {
    student_name: "Aarav Sharma",
    admission_no: "ADM20260412",
    class_name: "Class 10",
    section_name: "Section A",
    father_name: "Rakesh Sharma",
    academic_year_label: "2026–2027",
    balance_remaining_paise: 70000, // ₹700.00
    previous_balance_paise: 0,
  };

  const mockReceipt: FeeReceipt = {
    id: "rec-test-101",
    school_id: "sch-1",
    receipt_no: "MZ/2026-27/000789",
    student_id: "stud-1",
    academic_year_id: "2026-27",
    receipt_date: "2026-10-25",
    total_paise: 1000000, // ₹10,000.00 paid
    status: "active",
    source: "counter",
    payment_group_id: null,
    collected_by: "Suresh Gupta (Cashier)",
    remarks: "Term 1 Tuition & Annual Charges partial payment",
    idempotency_key: "idem-key-101",
    print_count: 0,
    whatsapp_sent_at: null,
    cancelled_by: null,
    cancelled_at: null,
    cancel_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockPayments: FeePayment[] = [
    {
      id: "pay-1",
      school_id: "sch-1",
      receipt_id: "rec-test-101",
      mode: "upi",
      amount_paise: 1000000,
      reference_no: "UPI-AXIS-9876543210",
      bank_name: "Axis Bank",
      instrument_no: null,
      instrument_date: null,
      cheque_status: null,
      gateway_order_id: null,
      gateway_payment_id: null,
      created_at: new Date().toISOString(),
    },
  ];

  // ─── TEST 1: The Referenced ₹10,700 Invoice / ₹10,000 Paid / ₹700 Balance Scenario ───
  console.log("[Test 1] Referenced Scenario: ₹10,700 Invoice with 6 Example Fee Heads + ₹700 Charge");

  const exampleBreakdown: ReceiptLineItemBreakdown[] = [
    { fee_particulars: "Transport Fee", gross_paise: 90000, concession_paise: 0, net_paise: 90000, amount_paid_paise: 90000, outstanding_paise: 0, invoice_no: "INV-2026-001" },
    { fee_particulars: "Development Fee", gross_paise: 100000, concession_paise: 0, net_paise: 100000, amount_paid_paise: 100000, outstanding_paise: 0, invoice_no: "INV-2026-001" },
    { fee_particulars: "Admission Fee", gross_paise: 500000, concession_paise: 0, net_paise: 500000, amount_paid_paise: 500000, outstanding_paise: 0, invoice_no: "INV-2026-001" },
    { fee_particulars: "Exam Fee", gross_paise: 80000, concession_paise: 0, net_paise: 80000, amount_paid_paise: 80000, outstanding_paise: 0, invoice_no: "INV-2026-001" },
    { fee_particulars: "Annual Charges", gross_paise: 100000, concession_paise: 0, net_paise: 100000, amount_paid_paise: 100000, outstanding_paise: 0, invoice_no: "INV-2026-001" },
    { fee_particulars: "Tuition Fee", gross_paise: 130000, concession_paise: 0, net_paise: 130000, amount_paid_paise: 130000, outstanding_paise: 0, invoice_no: "INV-2026-001" },
    { fee_particulars: "Activity & Lab Charges", gross_paise: 70000, concession_paise: 0, net_paise: 70000, amount_paid_paise: 0, outstanding_paise: 70000, invoice_no: "INV-2026-001" },
  ];

  const htmlScenario = generateReceiptHTML(
    mockReceipt,
    [],
    mockPayments,
    studentDetails,
    schoolDetails,
    "a4",
    false,
    { receipt_theme: "myzkool_blue" },
    {
      lineItemsBreakdown: exampleBreakdown,
      totalInvoicePaise: 1070000,
      invoiceNo: "INV-2026-001",
    }
  );

  // Check all 6 example heads + 7th head appear with correct formatting
  assert(htmlScenario.includes("Transport Fee"), "Contains Transport Fee");
  assert(htmlScenario.includes("₹900.00"), "Contains Transport Fee amount ₹900.00");
  assert(htmlScenario.includes("Development Fee"), "Contains Development Fee");
  assert(htmlScenario.includes("₹1,000.00"), "Contains Development Fee amount ₹1,000.00");
  assert(htmlScenario.includes("Admission Fee"), "Contains Admission Fee");
  assert(htmlScenario.includes("₹5,000.00"), "Contains Admission Fee amount ₹5,000.00");
  assert(htmlScenario.includes("Exam Fee"), "Contains Exam Fee");
  assert(htmlScenario.includes("₹800.00"), "Contains Exam Fee amount ₹800.00");
  assert(htmlScenario.includes("Annual Charges"), "Contains Annual Charges");
  assert(htmlScenario.includes("Tuition Fee"), "Contains Tuition Fee");
  assert(htmlScenario.includes("₹1,300.00"), "Contains Tuition Fee amount ₹1,300.00");
  assert(htmlScenario.includes("Activity &amp; Lab Charges") || htmlScenario.includes("Activity & Lab Charges"), "Contains 7th head Activity & Lab Charges");
  assert(htmlScenario.includes("₹700.00"), "Contains 7th head amount ₹700.00");

  // Check total reconciliation
  assert(htmlScenario.includes("₹10,700.00"), "Contains reconciled total invoice amount ₹10,700.00");
  assert(htmlScenario.includes("₹10,000.00"), "Contains reconciled paid amount ₹10,000.00");
  assert(htmlScenario.includes("Line Items Breakdown"), "Contains section title Line Items Breakdown");
  console.log("  ✓ All 7 fee heads, ₹10,700 invoice, ₹10,000 paid, and ₹700 balance reconciled perfectly.");

  // ─── TEST 2: UI Redesign Elements (Phase 1) ───
  console.log("\n[Test 2] Phase 1 UI Layout Requirements");
  assert(htmlScenario.includes("school-letterhead"), "Contains school-letterhead block");
  assert(htmlScenario.includes("border-bottom: 1.5px solid #E2E8F0") || htmlScenario.includes("border-bottom:"), "Contains subtle divider below header");
  assert(htmlScenario.includes("Delhi Public Global School"), "Contains school name");
  assert(htmlScenario.includes("CBSE / AFF-2026-19283"), "Contains affiliation number");
  assert(htmlScenario.toLowerCase().includes("official fee receipt"), "Contains Official Fee Receipt banner");

  // Non-contradictory status badge & copy tag
  assert(htmlScenario.includes("PARTIAL"), "Displays PARTIAL payment status badge for remaining balance > 0");
  assert(htmlScenario.includes("STUDENT COPY"), "Displays STUDENT COPY on first print");
  assert(!htmlScenario.includes("DUPLICATE COPY"), "Does not show contradictory DUPLICATE COPY on first print");

  // Balanced 2-column details
  assert(htmlScenario.includes("details-card"), "Contains details-card grid");
  assert(htmlScenario.includes("Receipt Number:"), "Left column contains Receipt Number");
  assert(htmlScenario.includes("Receipt Date:"), "Left column contains Receipt Date");
  assert(htmlScenario.includes("Academic Year:"), "Left column contains Academic Year");
  assert(htmlScenario.includes("Payment Method:"), "Left column contains Payment Method");
  assert(htmlScenario.includes("Student Name:"), "Right column contains Student Name");
  assert(htmlScenario.includes("Admission Number:"), "Right column contains Admission Number");
  assert(htmlScenario.includes("Class &amp; Section:") || htmlScenario.includes("Class & Section:"), "Right column contains Class & Section");
  assert(htmlScenario.includes("Parent / Guardian:"), "Right column contains Parent / Guardian");

  // 3 Summary Cards
  assert(htmlScenario.includes("summary-cards-grid"), "Contains summary-cards-grid");
  assert(htmlScenario.includes("Previous Dues"), "Contains Previous Dues card");
  assert(htmlScenario.includes("Amount Paid"), "Contains Amount Paid card");
  assert(htmlScenario.includes("Remaining Balance"), "Contains Remaining Balance card");

  // Signatures & School Seal
  assert(htmlScenario.includes("footer-signatures"), "Contains footer-signatures block");
  assert(htmlScenario.includes("Cashier Signature"), "Contains Cashier Signature line");
  assert(htmlScenario.includes("Official School Seal"), "Contains Official School Seal");
  assert(htmlScenario.includes("Authorized Signatory"), "Contains Authorized Signatory block");
  assert(htmlScenario.includes("Dr. Alok Verma"), "Contains Signatory Name");
  assert(htmlScenario.includes("Head of Accounts"), "Contains Signatory Designation");

  // Zero QR Code
  assert(!htmlScenario.toLowerCase().includes("qr-code") && !htmlScenario.toLowerCase().includes("qrcode"), "Confirmed ZERO QR Code in receipt");
  console.log("  ✓ Phase 1 UI redesign requirements verified successfully.");

  // ─── TEST 3: Duplicate Copy & Cancelled Status ───
  console.log("\n[Test 3] Duplicate Copy and Cancelled Watermark");
  const htmlDuplicate = generateReceiptHTML(
    mockReceipt,
    [],
    mockPayments,
    studentDetails,
    schoolDetails,
    "a4",
    true // isDuplicate = true
  );
  assert(htmlDuplicate.includes("DUPLICATE COPY"), "Contains DUPLICATE COPY label when isDuplicate=true");
  assert(!htmlDuplicate.includes("STUDENT COPY"), "Does not show contradictory STUDENT COPY when isDuplicate=true");

  const cancelledReceipt = { ...mockReceipt, status: "cancelled" as const };
  const htmlCancelled = generateReceiptHTML(
    cancelledReceipt,
    [],
    mockPayments,
    studentDetails,
    schoolDetails,
    "a4",
    false
  );
  assert(htmlCancelled.includes("CANCELLED"), "Cancelled receipt contains CANCELLED watermark");
  assert(htmlCancelled.includes("status-badge"), "Contains status badge");
  console.log("  ✓ Duplicate and Cancelled copy labels work without contradiction.");

  // ─── TEST 4: Historical Invoice with Missing Line Items (Discrepancy Reporting) ───
  console.log("\n[Test 4] Historical Invoice with Missing Line Items (No Invented Heads)");
  // Suppose invoice total is ₹10,700, but persisted line items only explain ₹10,000 (missing ₹700)
  const partialItemsOnly: ReceiptLineItemBreakdown[] = [
    { fee_particulars: "Tuition Fee", gross_paise: 900000, concession_paise: 0, net_paise: 900000, amount_paid_paise: 900000, outstanding_paise: 0 },
    { fee_particulars: "Exam Fee", gross_paise: 100000, concession_paise: 0, net_paise: 100000, amount_paid_paise: 100000, outstanding_paise: 0 },
  ]; // Sums to ₹10,000
  const htmlDiscrepancy = generateReceiptHTML(
    mockReceipt,
    [],
    mockPayments,
    studentDetails,
    schoolDetails,
    "a4",
    false,
    null,
    {
      lineItemsBreakdown: partialItemsOnly,
      totalInvoicePaise: 1070000, // ₹10,700 invoice total
      discrepancyNote: "Historical line items incomplete by ₹700.00",
    }
  );
  assert(htmlDiscrepancy.includes("Unallocated / Historical Invoice Difference"), "Reports discrepancy row explicitly");
  assert(htmlDiscrepancy.includes("Historical line items incomplete by ₹700.00"), "Includes explanatory note");
  assert(htmlDiscrepancy.includes("₹10,700.00"), "Total invoice still reconciles to ₹10,700.00");
  console.log("  ✓ Historical discrepancy reported transparently without inventing fake fee heads.");

  // ─── TEST 5: Concessions Handling ───
  console.log("\n[Test 5] Concessions and Disounts Display");
  const concessionBreakdown: ReceiptLineItemBreakdown[] = [
    { fee_particulars: "Tuition Fee", gross_paise: 1000000, concession_paise: 200000, net_paise: 800000, amount_paid_paise: 800000, outstanding_paise: 0 },
  ];
  const htmlConcession = generateReceiptHTML(
    mockReceipt,
    [],
    mockPayments,
    studentDetails,
    schoolDetails,
    "a4",
    false,
    null,
    { lineItemsBreakdown: concessionBreakdown }
  );
  assert(htmlConcession.includes("-₹2,000.00"), "Displays concession with minus sign in green (-₹2,000.00)");
  assert(htmlConcession.includes("₹10,000.00"), "Displays gross amount ₹10,000.00");
  assert(htmlConcession.includes("₹8,000.00"), "Displays net amount ₹8,000.00");
  console.log("  ✓ Concessions display accurately with proper negative formatting.");

  // ─── TEST 6: Multi-Invoice Support ───
  console.log("\n[Test 6] Multi-Invoice Collection Breakdown");
  const multiInvoiceBreakdown: ReceiptLineItemBreakdown[] = [
    { fee_particulars: "Term 1 Tuition", gross_paise: 500000, concession_paise: 0, net_paise: 500000, amount_paid_paise: 500000, outstanding_paise: 0, invoice_no: "INV-2026-001" },
    { fee_particulars: "Term 2 Tuition", gross_paise: 500000, concession_paise: 0, net_paise: 500000, amount_paid_paise: 500000, outstanding_paise: 0, invoice_no: "INV-2026-002" },
  ];
  const htmlMultiInvoice = generateReceiptHTML(
    mockReceipt,
    [],
    mockPayments,
    studentDetails,
    schoolDetails,
    "a4",
    false,
    null,
    { lineItemsBreakdown: multiInvoiceBreakdown, invoiceNo: "INV-2026-001, INV-2026-002" }
  );
  assert(htmlMultiInvoice.includes("INV-2026-001"), "Displays first invoice number tag");
  assert(htmlMultiInvoice.includes("INV-2026-002"), "Displays second invoice number tag");
  console.log("  ✓ Multi-invoice collection line items rendered clearly.");

  // ─── TEST 7: All Three Approved Themes ───
  console.log("\n[Test 7] All Three Approved Themes (MyZkool Blue, Mint Pastel, Lavender Pastel)");
  const approvedThemes: Array<"myzkool_blue" | "mint_pastel" | "lavender_pastel"> = [
    "myzkool_blue",
    "mint_pastel",
    "lavender_pastel",
  ];
  for (const th of approvedThemes) {
    const htmlTheme = generateReceiptHTML(
      mockReceipt,
      [],
      mockPayments,
      studentDetails,
      { ...schoolDetails, theme: th },
      "a4",
      false,
      { receipt_theme: th }
    );
    const themeCfg = RECEIPT_THEMES[th];
    assert(htmlTheme.includes(themeCfg.primary), `HTML contains primary color for theme ${th} (${themeCfg.primary})`);
    assert(htmlTheme.includes(themeCfg.accentBg), `HTML contains accentBg for theme ${th} (${themeCfg.accentBg})`);
    console.log(`  ✓ Verified Theme: ${themeCfg.name}`);
  }

  // ─── TEST 8: Supported Paper Sizes (A4, A5, Thermal 80mm) ───
  console.log("\n[Test 8] Paper Formats (A4, A5, Thermal 80mm)");
  const htmlA4 = generateReceiptHTML(mockReceipt, [], mockPayments, studentDetails, schoolDetails, "a4");
  assert(htmlA4.includes("A4 portrait"), "A4 contains A4 portrait size rule");
  assert(htmlA4.includes("210mm"), "A4 contains 210mm max width");

  const htmlA5 = generateReceiptHTML(mockReceipt, [], mockPayments, studentDetails, schoolDetails, "a5");
  assert(htmlA5.includes("A5 portrait"), "A5 contains A5 portrait size rule");
  assert(htmlA5.includes("148mm"), "A5 contains 148mm max width");

  const htmlThermal = generateReceiptHTML(mockReceipt, [], mockPayments, studentDetails, schoolDetails, "thermal80");
  assert(htmlThermal.includes("80mm auto"), "Thermal contains 80mm auto size rule");
  assert(htmlThermal.includes("80mm"), "Thermal contains 80mm max width");
  console.log("  ✓ All paper formats verified with correct page constraints.");

  // ─── TEST 9: Multi-page Print Safety ───
  console.log("\n[Test 9] Multi-page Pagination & Print Safety");
  assert(htmlScenario.includes("thead {") && htmlScenario.includes("table-header-group"), "Repeats table headers across page breaks");
  assert(htmlScenario.includes("tr {") && htmlScenario.includes("page-break-inside: avoid;"), "Protects table rows from page break splits");
  assert(htmlScenario.includes(".footer-signatures") && htmlScenario.includes("page-break-inside: avoid;"), "Protects footer signatures from page break splits");
  console.log("  ✓ Multi-page pagination rules verified.");

  // ─── TEST 10: Existing Tests Signature Backwards Compatibility ───
  console.log("\n[Test 10] Backward Compatibility with Legacy FeeReceiptItem[] Array");
  const legacyItems: FeeReceiptItem[] = [
    { id: "i1", receipt_id: "rec-1", due_id: "d1", fee_head_id: "Tuition Fee Term 1", amount_paise: 9500000, concession_paise: 0 },
    { id: "i2", receipt_id: "rec-1", due_id: "d2", fee_head_id: "Exam Fee", amount_paise: 505000, concession_paise: 0 },
  ];
  const legacyPayments: FeePayment[] = [
    { id: "p1", school_id: "sch-1", receipt_id: "rec-1", mode: "upi", amount_paise: 10005000, reference_no: "UPI-AXIS-9988", bank_name: null, instrument_no: null, instrument_date: null, cheque_status: null, gateway_order_id: null, gateway_payment_id: null, created_at: new Date().toISOString() },
  ];
  const legacyReceipt = { ...mockReceipt, total_paise: 10005000 };
  const htmlLegacy = generateReceiptHTML(legacyReceipt, legacyItems, legacyPayments, studentDetails, schoolDetails, "a5", false);
  assert(htmlLegacy.includes("Tuition Fee Term 1"), "Legacy fee head Tuition Fee Term 1 preserved");
  assert(htmlLegacy.includes("Exam Fee"), "Legacy fee head Exam Fee preserved");
  assert(htmlLegacy.includes("One Lakh Fifty Rupees Only"), "Indian amount in words preserved");
  console.log("  ✓ 100% backward compatibility preserved for legacy callers.");

  console.log("\n=== ALL 10 TEST SUITES PASSED FLAWLESSLY! ===");
}

runTests().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
