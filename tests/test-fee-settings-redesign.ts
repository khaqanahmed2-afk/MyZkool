import { generateReceiptHTML, RECEIPT_THEMES, DEFAULT_RECEIPT_TERMS } from "../src/lib/receiptTemplate";
import type { ReceiptTheme } from "../src/types/fees";

console.log("=== RUNNING EMPIRICAL TESTS FOR FEE & RECEIPT SETTINGS REDESIGN ===");

// 1. Verify 3 approved themes
const approvedThemes: ReceiptTheme[] = ["myzkool_blue", "mint_pastel", "lavender_pastel"];
console.log("\n[Test 1] Verifying exactly the 3 approved themes exist:");
for (const theme of approvedThemes) {
  if (!RECEIPT_THEMES[theme]) {
    throw new Error(`Missing approved theme: ${theme}`);
  }
  console.log(`  ✓ Theme ${theme}: ${RECEIPT_THEMES[theme].name} (${RECEIPT_THEMES[theme].primary})`);
}

// 2. Verify Receipt HTML Generation across all 3 themes and 3 paper formats (A4, A5, thermal80)
console.log("\n[Test 2] Verifying Receipt HTML Generation across themes and paper sizes:");
const mockReceipt: any = {
  id: "test-rec-1",
  receipt_no: "MZ/2026-27/000124",
  student_id: "student-1",
  academic_year_id: "2026-27",
  receipt_date: "2026-10-25",
  total_paise: 1650000,
  status: "active",
  source: "counter",
  collected_by: "Accounts Desk (P. Roy)",
  remarks: "Q1 Academic Fees Cleared. Thank you!",
  print_count: 0,
};

const mockItems: any[] = [
  { id: "item-1", fee_head_id: "Tuition Fee (Term 1)", amount_paise: 1200000, concession_paise: 0 },
  { id: "item-2", fee_head_id: "Computer & Robotics Lab", amount_paise: 250000, concession_paise: 0 },
];

const mockPayments: any[] = [
  { id: "pay-1", mode: "upi", amount_paise: 1650000, reference_no: "UPI-4289017265", bank_name: "HDFC Bank" },
];

const studentDetails = {
  student_name: "Aarav Sharma",
  admission_no: "ADM-2026-042",
  class_name: "Class 10",
  section_name: "Section A",
  academic_year_label: "2026–2027",
  balance_remaining_paise: 0,
  previous_balance_paise: 0,
};

const schoolDetails = {
  name: "Khaqan Public School",
  address: "124 Knowledge Park, Education District",
  phone: "+91 95559 54854",
  email: "accounts@myzkool.in",
  affiliation_no: "CBSE / AFF-2026-892",
  terms: DEFAULT_RECEIPT_TERMS,
  footer: "This is a computer generated receipt.",
  theme: "myzkool_blue" as ReceiptTheme,
};

const paperSizes: Array<"a4" | "a5" | "thermal80"> = ["a4", "a5", "thermal80"];

for (const th of approvedThemes) {
  for (const paper of paperSizes) {
    const html = generateReceiptHTML(
      mockReceipt,
      mockItems,
      mockPayments,
      studentDetails,
      { ...schoolDetails, theme: th },
      paper,
      false,
      {
        receipt_theme: th,
        receipt_header_title: "Official Fee Receipt",
        receipt_paper: paper,
      }
    );

    if (!html.includes(mockReceipt.receipt_no)) {
      throw new Error(`Generated HTML for ${th} / ${paper} missing receipt number!`);
    }
    if (!html.includes(studentDetails.student_name)) {
      throw new Error(`Generated HTML for ${th} / ${paper} missing student name!`);
    }
    if (!html.includes(RECEIPT_THEMES[th].primary)) {
      throw new Error(`Generated HTML for ${th} / ${paper} missing primary theme color!`);
    }
    console.log(`  ✓ Generated valid print-ready HTML for Theme: ${th}, Paper: ${paper} (${html.length} bytes)`);
  }
}

// 3. Verify that zero QR code is present in generated receipts
console.log("\n[Test 3] Verifying Zero QR Code in receipts:");
const testHtml = generateReceiptHTML(mockReceipt, mockItems, mockPayments, studentDetails, schoolDetails, "a4");
if (testHtml.toLowerCase().includes("qr-code") || testHtml.toLowerCase().includes("qrcode")) {
  throw new Error("Found QR code reference in receipt template!");
}
console.log("  ✓ Confirmed zero QR code in receipt template.");

console.log("\n=== ALL EMPIRICAL VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
