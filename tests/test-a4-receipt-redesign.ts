import assert from "node:assert";
import { generateReceiptHTML, generateReceiptA4Html } from "../src/lib/receiptTemplate";
import type { FeeReceipt, FeeReceiptItem, FeePayment } from "../src/types/collection";
import type { FeeSettings } from "../src/types/fees";

console.log("==================================================================");
console.log("A4 FEE PAYMENT RECEIPT REDESIGN VERIFICATION SUITE");
console.log("==================================================================\n");

const SCHOOL_A = "school-a4-redesign-01";
const SCHOOL_B = "school-a4-redesign-02";

const defaultSchoolBranding = {
  name: "PEACE CONVENT SCHOOL",
  address: "Behind Abdul Hameed Memorial Inter College, Mawai, Ayodhya, Uttar Pradesh – 224117, India",
  phone: "8400404002",
  email: "myzkool.official@gmail.com",
  logo_url: "https://school-assets.myzkool.in/peace-logo.png",
  signatory_name: "Mr. R. Verma",
  signatory_designation: "Principal",
};

// ──────────────────────────────────────────────────────────────────
// Scenario 1: Reference Receipt Exact Layout Match
// (Aarav Sharma, RCP-2025-00123, October 2025, UPI, ₹10,500.00)
// ──────────────────────────────────────────────────────────────────
console.log("[Scenario 1] Reference Receipt Layout Match (User Reference Image)");

const sampleReceipt: FeeReceipt = {
  id: "rcpt-001",
  school_id: SCHOOL_A,
  receipt_no: "RCP-2025-00123",
  student_id: "std-001",
  academic_year_id: "ay-2025-26",
  receipt_date: "2025-10-15",
  total_paise: 1050000, // ₹10,500.00
  status: "active",
  source: "counter",
  payment_group_id: null,
  collected_by: "Mr. R. Verma (Cashier)",
  remarks: "Fee payment for October 2025.",
  idempotency_key: null,
  print_count: 0,
  whatsapp_sent_at: null,
  cancelled_by: null,
  cancelled_at: null,
  cancel_reason: null,
  created_at: "2025-10-15T10:00:00Z",
  updated_at: "2025-10-15T10:00:00Z",
};

const sampleItems: FeeReceiptItem[] = [
  {
    id: "item-1",
    receipt_id: "rcpt-001",
    due_id: "due-1",
    fee_head_id: "head-tuition",
    fee_head_name: "Tuition Fee",
    amount_paise: 800000,
    gross_paise: 800000,
    concession_paise: 0,
    net_paise: 800000,
    balance_paise: 0,
    term_name: "October 2025",
  } as any,
  {
    id: "item-2",
    receipt_id: "rcpt-001",
    due_id: "due-2",
    fee_head_id: "head-transport",
    fee_head_name: "Transport Fee",
    amount_paise: 200000,
    gross_paise: 200000,
    concession_paise: 0,
    net_paise: 200000,
    balance_paise: 0,
    term_name: "October 2025",
  } as any,
  {
    id: "item-3",
    receipt_id: "rcpt-001",
    due_id: "due-3",
    fee_head_id: "head-exam",
    fee_head_name: "Exam Fee",
    amount_paise: 50000,
    gross_paise: 50000,
    concession_paise: 0,
    net_paise: 50000,
    balance_paise: 0,
    term_name: "October 2025",
  } as any,
];

const samplePayments: FeePayment[] = [
  {
    id: "pay-001",
    school_id: SCHOOL_A,
    receipt_id: "rcpt-001",
    mode: "upi",
    amount_paise: 1050000,
    reference_no: "UPI1234567890",
    bank_name: null,
    instrument_no: null,
    instrument_date: null,
    cheque_status: null,
    gateway_order_id: null,
    gateway_payment_id: null,
    created_at: "2025-10-15T10:00:00Z",
  },
];

const sampleStudent = {
  student_name: "Aarav Sharma",
  admission_no: "A1234",
  class_name: "6",
  section_name: "A",
  guardian_name: "Rajesh Sharma",
  applicable_month: "October 2025",
  academic_year_label: "2025–2026",
  balance_remaining_paise: 500000, // ₹5,000.00
};

const html1 = generateReceiptA4Html(
  sampleReceipt,
  sampleItems,
  sampleStudent,
  defaultSchoolBranding,
  {
    show_receipt_school_logo: true,
    show_receipt_school_name: true,
    show_receipt_address: true,
    show_receipt_phone: true,
    show_receipt_email: true,
    show_receipt_number_date: true,
    show_receipt_student_details: true,
    show_receipt_parent_name: true,
    show_receipt_payment_mode: true,
    show_receipt_transaction_ref: true,
    show_receipt_fee_allocation: true,
    show_receipt_amount_received: true,
    show_receipt_amount_in_words: true,
    show_receipt_balance_remaining: true,
    show_receipt_advance_credit: true,
    show_receipt_cashier: true,
    show_receipt_signatory: true,
    show_receipt_terms: true,
    show_receipt_acknowledgement: true,
  },
  {
    payments: samplePayments,
    applicableMonth: "October 2025",
    advanceAmountPaise: 0,
  }
);

assert(html1.includes("PEACE CONVENT SCHOOL"), "School name must match reference");
assert(html1.includes("FEE PAYMENT RECEIPT"), "Receipt title must be prominent FEE PAYMENT RECEIPT");
assert(html1.includes("8400404002"), "Phone number must be present in header");
assert(html1.includes("myzkool.official@gmail.com"), "Email must be present in header");
assert(html1.includes("Aarav Sharma"), "Student name must be Aarav Sharma");
assert(html1.includes("A1234"), "Admission number must be A1234");
assert(html1.includes("6 - A"), "Class & Section must be 6 - A");
assert(html1.includes("Rajesh Sharma"), "Parent / Guardian must be Rajesh Sharma");
assert(html1.includes("RCP-2025-00123"), "Receipt number must be RCP-2025-00123");
assert(html1.includes("2025-10-15"), "Payment date must be 2025-10-15");
assert(html1.includes("October 2025"), "Applicable month must be October 2025");
assert(html1.includes("UPI1234567890"), "Transaction reference must be UPI1234567890");
assert(html1.includes("Mr. R. Verma (Cashier)"), "Collected by must be Mr. R. Verma (Cashier)");
assert(html1.includes("Tuition Fee"), "Tuition Fee row must exist");
assert(html1.includes("Transport Fee"), "Transport Fee row must exist");
assert(html1.includes("Transport</span>"), "Transport badge must be rendered for Transport Fee");
assert(html1.includes("Exam Fee"), "Exam Fee row must exist");
assert(html1.includes("Total Amount Paid"), "Total Amount Paid row must exist");
assert(html1.includes("₹ 10,500.00") || html1.includes("₹10,500.00"), "Total amount must be ₹10,500.00");
assert(html1.includes("AMOUNT PAID"), "Summary card AMOUNT PAID must exist");
assert(html1.includes("REMAINING BALANCE"), "Summary card REMAINING BALANCE must exist");
assert(html1.includes("ADVANCE CREDIT"), "Summary card ADVANCE CREDIT must exist");
assert(html1.includes("₹ 5,000.00") || html1.includes("₹5,000.00"), "Remaining balance must be ₹5,000.00");
assert(html1.includes("Ten Thousand Five Hundred Rupees Only"), "Words must be Ten Thousand Five Hundred Rupees Only");
assert(html1.includes("Fee payment for October 2025."), "Remarks must be rendered");
assert(html1.includes("Questions?"), "Bottom info Questions? column must exist");
assert(html1.includes("Payment Info:"), "Bottom info Payment Info: column must exist");
assert(html1.includes("Terms &amp; Conditions:"), "Bottom info Terms & Conditions: column must exist");
assert(html1.includes("Collected By / Cashier"), "Cashier signature line must exist");
assert(html1.includes("Principal"), "Principal signature line must exist");
assert(html1.includes("This is a computer generated receipt"), "Computer generated disclaimer must exist");
assert(!html1.includes("seal-box"), "No decorative circular seal box per spec");
console.log("  ✓ Reference receipt matched all specifications from user reference image\n");

// ──────────────────────────────────────────────────────────────────
// Scenario 2: Cash Payment Without Reference (Omission Check)
// ──────────────────────────────────────────────────────────────────
console.log("[Scenario 2] Cash Payment Without Reference (No Placeholder Reference)");

const cashReceipt: FeeReceipt = {
  ...sampleReceipt,
  receipt_no: "RCP-2025-CASH-01",
  total_paise: 500000,
};

const cashPayments: FeePayment[] = [
  {
    id: "pay-cash-01",
    school_id: SCHOOL_A,
    receipt_id: "rcpt-001",
    mode: "cash",
    amount_paise: 500000,
    reference_no: null,
    bank_name: null,
    instrument_no: null,
    instrument_date: null,
    cheque_status: null,
    gateway_order_id: null,
    gateway_payment_id: null,
    created_at: "2025-10-15T10:00:00Z",
  },
];

const cashHtml = generateReceiptA4Html(
  cashReceipt,
  sampleItems.slice(0, 1),
  sampleStudent,
  defaultSchoolBranding,
  {
    show_receipt_transaction_ref: true,
    show_receipt_payment_mode: true,
  },
  { payments: cashPayments }
);

assert(cashHtml.includes("Payment Method"), "Payment method must be shown");
assert(cashHtml.includes("CASH"), "Payment mode must be CASH");
assert(!cashHtml.includes("Transaction Ref."), "Cash payment without reference must omit Transaction Ref. row cleanly");
console.log("  ✓ Cash payment without reference cleanly omits reference line\n");

// ──────────────────────────────────────────────────────────────────
// Scenario 3: Payment with Approved Concession
// ──────────────────────────────────────────────────────────────────
console.log("[Scenario 3] Payment with Approved Concession");

const concessionItems: FeeReceiptItem[] = [
  {
    id: "item-conc-1",
    receipt_id: "rcpt-001",
    due_id: "due-conc-1",
    fee_head_id: "head-tuition",
    fee_head_name: "Annual Tuition",
    amount_paise: 700000,
    gross_paise: 1000000,
    concession_paise: 300000, // ₹3,000 concession
    net_paise: 700000,
    balance_paise: 0,
    term_name: "Term 1",
  } as any,
];

const concessionHtml = generateReceiptA4Html(
  { ...sampleReceipt, total_paise: 700000 },
  concessionItems,
  sampleStudent,
  defaultSchoolBranding,
  {}
);

assert(concessionHtml.includes("Concession: -₹3,000.00") || concessionHtml.includes("Concession: -₹ 3,000.00"), "Concession amount must be cleanly noted on line item");
console.log("  ✓ Approved concession cleanly shown under fee item without distorting total\n");

// ──────────────────────────────────────────────────────────────────
// Scenario 4: Clean Element Hiding on Disabled Toggles
// ──────────────────────────────────────────────────────────────────
console.log("[Scenario 4] Toggle Visibility & Clean Gapless Hiding");

const strippedHtml = generateReceiptA4Html(
  sampleReceipt,
  sampleItems,
  sampleStudent,
  defaultSchoolBranding,
  {
    show_receipt_school_logo: false,
    show_receipt_address: false,
    show_receipt_phone: false,
    show_receipt_email: false,
    show_receipt_parent_name: false,
    show_receipt_fee_allocation: false,
    show_receipt_advance_credit: false,
    show_receipt_cashier: false,
    show_receipt_terms: false,
    show_receipt_acknowledgement: false,
  }
);

assert(!strippedHtml.includes("alt=\"School Logo\""), "Logo img must be hidden when show_receipt_school_logo is false");
assert(!strippedHtml.includes("class=\"school-addr\""), "Address must be hidden when show_receipt_address is false");
assert(!strippedHtml.includes("class=\"school-contacts\""), "Contacts must be hidden when show_receipt_phone and email are false");
assert(!strippedHtml.includes("Parent / Guardian"), "Parent row must be hidden when show_receipt_parent_name is false");
assert(!strippedHtml.includes("<table class=\"receipt-table\""), "Fee table must be hidden when show_receipt_fee_allocation is false");
assert(!strippedHtml.includes("ADVANCE CREDIT"), "Advance credit card must be hidden when show_receipt_advance_credit is false");
assert(!strippedHtml.includes("Collected By / Cashier"), "Cashier signature must be hidden when show_receipt_cashier is false");
assert(!strippedHtml.includes("Terms &amp; Conditions:"), "Terms must be hidden when show_receipt_terms is false");
assert(!strippedHtml.includes("class=\"disclaimer-text\""), "Disclaimer must be hidden when show_receipt_acknowledgement is false");
console.log("  ✓ Disabled elements omit cleanly without leftover borders or empty gaps\n");

// ──────────────────────────────────────────────────────────────────
// Scenario 5: Multi-School Tenant Isolation
// ──────────────────────────────────────────────────────────────────
console.log("[Scenario 5] Multi-School Tenant Profile & Branding Isolation");

const schoolBBranding = {
  name: "ST. XAVIER HIGH SCHOOL",
  address: "St. Xavier Road, Civil Lines, Ayodhya, UP",
  phone: "05278-223344",
  email: "office@stxavier.edu.in",
  signatory_name: "Fr. Thomas",
  signatory_designation: "Rector",
};

const schoolBHtml = generateReceiptA4Html(
  { ...sampleReceipt, school_id: SCHOOL_B, receipt_no: "XAV-2025-998" },
  sampleItems,
  sampleStudent,
  schoolBBranding,
  { receipt_theme: "mint_pastel" }
);

assert(schoolBHtml.includes("ST. XAVIER HIGH SCHOOL"), "Must use School B name");
assert(schoolBHtml.includes("05278-223344"), "Must use School B phone");
assert(schoolBHtml.includes("office@stxavier.edu.in"), "Must use School B email");
assert(schoolBHtml.includes("Fr. Thomas"), "Must use School B signatory");
assert(!schoolBHtml.includes("PEACE CONVENT SCHOOL"), "School A branding must not leak to School B");
console.log("  ✓ School branding strictly isolated across distinct tenants\n");

// ──────────────────────────────────────────────────────────────────
// Scenario 6: A4 Portrait Print Styles
// ──────────────────────────────────────────────────────────────────
console.log("[Scenario 6] A4 Portrait Print Layout & Styling Rules");

assert(html1.includes("@page {"), "Must contain @page declaration");
assert(html1.includes("size: A4 portrait"), "Must specify A4 portrait size");
assert(html1.includes("print-color-adjust: exact"), "Must enforce exact color printing");
console.log("  ✓ Print stylesheet enforces portrait A4 dimensions and background colors\n");

console.log("==================================================================");
console.log("ALL A4 RECEIPT REDESIGN VERIFICATION TESTS PASSED! 🎉");
console.log("==================================================================\n");
