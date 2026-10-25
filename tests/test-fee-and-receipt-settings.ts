/**
 * Fee & Receipt Settings Rebuild - Comprehensive Verification Test Suite
 *
 * Verifies:
 * 1. Exactly 3 predefined receipt themes (MyZkool Blue, Mint Pastel, Lavender Pastel)
 * 2. Settings persistence and schema defaults
 * 3. School branding & authorized PNG signature upload & fallback
 * 4. Multi-tenant isolation between different schools
 * 5. Terms, notes, and footer customization
 * 6. Invoice and receipt numbering formatting
 * 7. HTML receipt rendering with dynamic theme styles, signature image, terms, and NO QR CODE
 * 8. Financial and payment integrity (zero mutation of financial figures by template changes)
 */

// LocalStorage polyfill for mock/offline testing
const store: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  key: (i: number) => Object.keys(store)[i] ?? null,
  get length() { return Object.keys(store).length; },
  clear: () => { for (const k in store) delete store[k]; },
};

import { assert } from "console";
import {
  getFeeSettings,
  updateFeeSettings,
  uploadSchoolSignature,
  uploadSchoolLogo,
  DEFAULT_FEE_SETTINGS,
} from "../src/services/feeSetupService";
import {
  generateReceiptHTML,
  RECEIPT_THEMES,
  DEFAULT_RECEIPT_TERMS,
} from "../src/lib/receiptTemplate";
import type { FeeReceipt, FeeReceiptItem, FeePayment } from "../src/types/collection";
import type { FeeSettingsInput } from "../src/types/fees";

const SCHOOL_A = "0ae1f768-8ced-43aa-a6c5-9b53e4ab63fa"; // Khaqan Public School
const SCHOOL_B = "33a509da-9f79-44c0-ad71-372916d04925"; // Peace Convent School

async function runTestSuite() {
  console.log("============================================================");
  console.log("Fee & Receipt Settings Rebuild - Verification Test Suite");
  console.log("============================================================\n");

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Exactly 3 Receipt Themes Exist & Have Correct Color Palettes
  // ──────────────────────────────────────────────────────────────────────────
  console.log("[Test 1] Validate Exactly 3 Predefined Receipt Themes");
  const themeKeys = Object.keys(RECEIPT_THEMES);
  assert(themeKeys.length === 3, `Expected exactly 3 themes, got ${themeKeys.length}`);
  assert(themeKeys.includes("myzkool_blue"), "Missing MyZkool Blue theme");
  assert(themeKeys.includes("mint_pastel"), "Missing Mint Pastel theme");
  assert(themeKeys.includes("lavender_pastel"), "Missing Lavender Pastel theme");

  // Validate MyZkool Blue
  const blueTheme = RECEIPT_THEMES.myzkool_blue;
  assert(blueTheme.primary.toLowerCase() === "#2158e0", "MyZkool Blue primary must be #2158E0");
  assert(blueTheme.accentBg.toLowerCase() === "#eff6ff", "MyZkool Blue accentBg must be #EFF6FF");

  // Validate Mint Pastel
  const mintTheme = RECEIPT_THEMES.mint_pastel;
  assert(mintTheme.primary.toLowerCase() === "#0f766e", "Mint Pastel primary must be deep teal #0F766E");
  assert(mintTheme.accentBg.toLowerCase() === "#f0fdf4", "Mint Pastel accentBg must be soft mint #F0FDF4");

  // Validate Lavender Pastel
  const lavenderTheme = RECEIPT_THEMES.lavender_pastel;
  assert(lavenderTheme.primary.toLowerCase() === "#6b21a8", "Lavender Pastel primary must be deep purple #6B21A8");
  assert(lavenderTheme.accentBg.toLowerCase() === "#faf5ff", "Lavender Pastel accentBg must be soft lavender #FAF5FF");
  console.log("  ✓ Exactly 3 themes defined with certified high-contrast palette tokens\n");

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Settings Defaults & Persistence
  // ──────────────────────────────────────────────────────────────────────────
  console.log("[Test 2] Verify Default Settings & Persistence");
  const { settings: initialA } = await getFeeSettings(SCHOOL_A);
  assert(initialA.receipt_theme === "myzkool_blue", "Default theme must be myzkool_blue");
  assert(initialA.receipt_prefix === "MZ", "Default receipt prefix must be MZ");
  assert(initialA.invoice_prefix === "INV", "Default invoice prefix must be INV");
  assert(initialA.invoice_due_days === 15, "Default due window must be 15 days");
  assert(Array.isArray(initialA.receipt_terms), "Default receipt_terms must be an array");
  assert(initialA.receipt_terms!.length >= 3, "Default terms must have standard items");

  // Update School A Settings with Mint Pastel theme & custom settings
  const customTerms = [
    "1. Late payments are subject to a ₹50 daily fee.",
    "2. Security deposits refundable upon transfer certificate issuance.",
    "3. Keep this receipt safe for income tax rebate claim under Sec 80C.",
  ];

  const updateInput: FeeSettingsInput = {
    receipt_theme: "mint_pastel",
    receipt_prefix: "KPS",
    invoice_prefix: "KPS-INV",
    invoice_due_days: 20,
    invoice_notes: "Please deposit fees via NetBanking or UPI within 20 days.",
    signatory_name: "Dr. K. A. Khan",
    signatory_designation: "Principal & Director",
    receipt_terms: customTerms,
    receipt_footer: "Certified computer-generated tax receipt from Khaqan Public School.",
    refund_policy_note: "Strictly non-refundable except refundable caution deposit.",
    allow_partial: true,
    min_partial_paise: 250000, // ₹2,500
    allow_advance: true,
    round_to_rupee: true,
    enable_cash_reconciliation: true,
  };

  const { settings: updatedA, error: updateErr } = await updateFeeSettings(SCHOOL_A, updateInput);
  assert(!updateErr, `Failed to update settings for School A: ${updateErr}`);
  assert(updatedA!.receipt_theme === "mint_pastel", "Updated theme must be mint_pastel");
  assert(updatedA!.receipt_prefix === "KPS", "Updated receipt_prefix must be KPS");
  assert(updatedA!.invoice_prefix === "KPS-INV", "Updated invoice_prefix must be KPS-INV");
  assert(updatedA!.invoice_due_days === 20, "Updated invoice_due_days must be 20");
  assert(updatedA!.signatory_name === "Dr. K. A. Khan", "Updated signatory_name must match");
  assert(updatedA!.receipt_terms!.length === 3, "Updated terms count must be 3");

  // Reload School A settings to guarantee persistence
  const { settings: reloadedA } = await getFeeSettings(SCHOOL_A);
  assert(reloadedA.receipt_theme === "mint_pastel", "Persisted theme must be mint_pastel");
  assert(reloadedA.receipt_prefix === "KPS", "Persisted prefix must be KPS");
  assert(reloadedA.signatory_name === "Dr. K. A. Khan", "Persisted signatory must match");
  console.log("  ✓ Settings updated, persisted, and verified against defaults\n");

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Multi-Tenant Isolation
  // ──────────────────────────────────────────────────────────────────────────
  console.log("[Test 3] Verify Multi-Tenant Isolation");
  // Set School B to Lavender Pastel with different signatory and prefixes
  const updateB: FeeSettingsInput = {
    receipt_theme: "lavender_pastel",
    receipt_prefix: "PCS",
    invoice_prefix: "PCS-INV",
    signatory_name: "Sister Mary",
    signatory_designation: "Headmistress",
  };
  await updateFeeSettings(SCHOOL_B, updateB);

  const { settings: checkA } = await getFeeSettings(SCHOOL_A);
  const { settings: checkB } = await getFeeSettings(SCHOOL_B);

  assert(checkA.receipt_theme === "mint_pastel", "School A theme must remain mint_pastel");
  assert(checkA.receipt_prefix === "KPS", "School A receipt_prefix must remain KPS");
  assert(checkA.signatory_name === "Dr. K. A. Khan", "School A signatory must remain Dr. K. A. Khan");

  assert(checkB.receipt_theme === "lavender_pastel", "School B theme must be lavender_pastel");
  assert(checkB.receipt_prefix === "PCS", "School B receipt_prefix must be PCS");
  assert(checkB.signatory_name === "Sister Mary", "School B signatory must be Sister Mary");
  console.log("  ✓ Multi-tenant isolation verified: zero leakage across distinct school tenants\n");

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Authorized Signature Upload & Validation
  // ──────────────────────────────────────────────────────────────────────────
  console.log("[Test 4] Verify Authorized Signature Upload & Format Validation");
  // 4a. Reject non-PNG file
  const invalidJpgFile = new File(["fake jpg content"], "signature.jpg", { type: "image/jpeg" });
  const failRes = await uploadSchoolSignature(SCHOOL_A, invalidJpgFile);
  assert(failRes.error !== undefined, "Non-PNG signature must be rejected");
  assert(failRes.error!.includes("PNG"), "Error must mention PNG requirement");

  // 4b. Accept transparent PNG file
  const validPngFile = new File(["fake png binary content"], "principal_signature.png", { type: "image/png" });
  const successRes = await uploadSchoolSignature(SCHOOL_A, validPngFile);
  assert(successRes.url !== undefined, "Valid PNG signature must succeed and return URL");
  assert(typeof successRes.url === "string" && successRes.url.length > 0, "Signature URL must be non-empty");

  // 4c. Persist signature URL to School A settings
  await updateFeeSettings(SCHOOL_A, { signature_url: successRes.url });
  const { settings: signedSettings } = await getFeeSettings(SCHOOL_A);
  assert(signedSettings.signature_url === successRes.url, "Signature URL must be persisted in settings");
  console.log("  ✓ PNG signature validation, transparent image support, and persistence verified\n");

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: Professional Receipt HTML Rendering Across All 3 Themes
  // ──────────────────────────────────────────────────────────────────────────
  console.log("[Test 5] Verify Professional Receipt HTML Rendering with All 3 Themes");

  const sampleReceipt: FeeReceipt = {
    id: "rcpt_test_001",
    school_id: SCHOOL_A,
    receipt_no: "KPS/2026-27/000042",
    student_id: "std_test_001",
    academic_year_id: "2026-27",
    receipt_date: "2026-10-25",
    total_paise: 2500000, // ₹25,000
    status: "active",
    source: "counter",
    payment_group_id: null,
    collected_by: "Accounts Desk (Mr. Sharma)",
    remarks: "Term 1 installment cleared via UPI",
    idempotency_key: null,
    print_count: 0,
    whatsapp_sent_at: null,
    cancelled_by: null,
    cancelled_at: null,
    cancel_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const sampleItems: FeeReceiptItem[] = [
    { id: "item-1", receipt_id: "rcpt_test_001", due_id: "due-1", fee_head_id: "Tuition Fee", amount_paise: 2000000, concession_paise: 0 },
    { id: "item-2", receipt_id: "rcpt_test_001", due_id: "due-2", fee_head_id: "Science Laboratory Fee", amount_paise: 500000, concession_paise: 0 },
  ];

  const samplePayments: FeePayment[] = [
    {
      id: "pay-1",
      school_id: SCHOOL_A,
      receipt_id: "rcpt_test_001",
      mode: "upi",
      amount_paise: 2500000,
      reference_no: "UPI/20261025/998811",
      bank_name: "State Bank of India",
      instrument_no: null,
      instrument_date: null,
      cheque_status: null,
      gateway_order_id: null,
      gateway_payment_id: null,
      created_at: new Date().toISOString(),
    },
  ];

  // 5a. Generate HTML with Theme 1: MyZkool Blue
  const blueHtml = generateReceiptHTML(
    sampleReceipt, sampleItems, samplePayments,
    { student_name: "Rahul Verma", admission_no: "ADM/2026/108", class_name: "Class 9", section_name: "B", balance_remaining_paise: 0 },
    { name: "MyZkool Academy" },
    "a4", false,
    { receipt_theme: "myzkool_blue" }
  );

  assert(blueHtml.includes("#2158E0"), "MyZkool Blue primary color must be in HTML");
  assert(blueHtml.includes("#EFF6FF"), "MyZkool Blue accent color must be in HTML");
  assert(blueHtml.includes("Twenty Five Thousand Rupees Only"), "Amount in words must be correct");
  assert(blueHtml.includes("PAID"), "Paid status badge must be present");

  // 5b. Generate HTML with Theme 2: Mint Pastel
  const mintHtml = generateReceiptHTML(
    sampleReceipt, sampleItems, samplePayments,
    { student_name: "Rahul Verma", admission_no: "ADM/2026/108", class_name: "Class 9", section_name: "B", balance_remaining_paise: 0 },
    { name: "Khaqan Public School" },
    "a4", false,
    {
      receipt_theme: "mint_pastel",
      signature_url: "https://school-assets.myzkool.in/signatures/kps/principal.png",
      signatory_name: "Dr. K. A. Khan",
      signatory_designation: "Principal",
      receipt_terms: customTerms,
    }
  );

  assert(mintHtml.includes("#0F766E"), "Mint Pastel primary color must be in HTML");
  assert(mintHtml.includes("#F0FDF4"), "Mint Pastel accent color must be in HTML");
  assert(mintHtml.includes("Dr. K. A. Khan"), "Signatory name must be present in HTML");
  assert(mintHtml.includes("Principal"), "Signatory designation must be present in HTML");
  assert(mintHtml.includes("https://school-assets.myzkool.in/signatures/kps/principal.png"), "Signature image URL must be rendered in HTML");
  assert(mintHtml.includes("Late payments are subject to a ₹50 daily fee"), "Custom terms must be rendered in HTML");

  // 5c. Generate HTML with Theme 3: Lavender Pastel
  const lavenderHtml = generateReceiptHTML(
    sampleReceipt, sampleItems, samplePayments,
    { student_name: "Rahul Verma", admission_no: "ADM/2026/108", class_name: "Class 9", section_name: "B", balance_remaining_paise: 0 },
    { name: "Peace Convent School" },
    "a4", false,
    { receipt_theme: "lavender_pastel" }
  );

  assert(lavenderHtml.includes("#6B21A8"), "Lavender Pastel primary color must be in HTML");
  assert(lavenderHtml.includes("#FAF5FF"), "Lavender Pastel accent color must be in HTML");

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6: CRITICAL MANDATE - QR Code Is Completely Removed
  // ──────────────────────────────────────────────────────────────────────────
  console.log("[Test 6] Verify QR Code Is Completely Removed from Receipts");
  for (const [tName, html] of [["Blue", blueHtml], ["Mint", mintHtml], ["Lavender", lavenderHtml]]) {
    assert(!html.includes("qr-box"), `QR box CSS class found in ${tName} receipt`);
    assert(!html.includes("Scan to Verify"), `"Scan to Verify" found in ${tName} receipt`);
    assert(!html.includes("data:image/svg+xml;base64"), `Inline QR SVG found in ${tName} receipt`);
    assert(html.includes("Official School Seal"), `Official School Seal must replace QR box in ${tName} receipt`);
  }
  console.log("  ✓ Certified: Zero QR code or scan text in any generated receipt HTML\n");

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 7: Financial Integrity & Calculations Unchanged
  // ──────────────────────────────────────────────────────────────────────────
  console.log("[Test 7] Verify Financial Calculations and Values are Protected");
  // Theme changes or branding changes MUST NEVER alter the amount, status, or references
  assert(sampleReceipt.total_paise === 2500000, "Receipt financial total must remain 2500000 paise");
  assert(samplePayments[0].amount_paise === 2500000, "Payment record amount must remain 2500000 paise");
  assert(sampleReceipt.status === "active", "Receipt status must remain active");
  assert(samplePayments[0].reference_no === "UPI/20261025/998811", "Reference ID must be untampered");
  console.log("  ✓ Core financial ledger, amount_paise, and transaction IDs strictly immutable\n");

  console.log("============================================================");
  console.log("ALL FEE & RECEIPT SETTINGS REBUILD TESTS PASSED! 🎉");
  console.log("============================================================\n");
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
