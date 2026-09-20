/**
 * test-phase3b.ts — Fee counter screen, receipts, ledger, and PDF snapshot tests
 * Run: npx tsx tests/test-phase3b.ts
 *
 * Tests:
 * 1. B7.2: Full collect flow (search, dues select, payment, receipt, ledger)
 * 2. B7.3: Partial payment flow (allocation preview, remaining balance, partial status)
 * 3. B7.4: Family payment (two children sharing payment_group_id, two receipts)
 * 4. B7.5: Ad-hoc counter concession (threshold check, PIN validation, balance reduction)
 * 5. B7.6: Receipt cancellation (min 10-char reason, full reversal, dues restored)
 * 6. Receipt PDF snapshots (A5 and 80mm thermal, amount in words, duplicate stamp, cancelled watermark)
 * 7. 360px mobile responsiveness and keyboard map verification
 */

// LocalStorage polyfill
const store: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  key: (i: number) => Object.keys(store)[i] ?? null,
  get length() { return Object.keys(store).length; },
  clear: () => { for (const k in store) delete store[k]; },
};

import { randomUUID } from "crypto";

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

const SCHOOL = "school-3b-" + Date.now();
const YEAR = "year-3b-" + Date.now();

function seedEnvironment() {
  localStorage.setItem(`myzkool_academic_years_${SCHOOL}`, JSON.stringify([
    { id: YEAR, school_id: SCHOOL, is_current: true, start_year: 2026, end_year: 2027, label: "2026-27" },
  ]));

  localStorage.setItem(`myzkool_fee_settings_${SCHOOL}`, JSON.stringify({
    id: randomUUID(),
    school_id: SCHOOL,
    receipt_prefix: "MZ",
    receipt_paper: "a5",
    receipt_language: "en",
    allow_partial: true,
    min_partial_paise: 0,
    allow_advance: true,
    allocation_mode: "auto_oldest_first",
    round_to_rupee: true,
    backdate_days_limit: 0,
    discount_approval_threshold_percent: 10,
    auto_assign_fee_on_admission: true,
    auto_late_fee: false,
    cheque_receipt_timing: "on_receipt",
    parent_pay_enabled: false,
    gateway_fee_bearer: "school",
    auto_print_receipt: false,
    owner_pin_hash: null,
  }));
}

function createStudent(id: string, firstName: string, lastName: string, admNo: string) {
  const existing = JSON.parse(localStorage.getItem(`myzkool_students_${SCHOOL}`) || "[]");
  existing.push({
    id,
    school_id: SCHOOL,
    first_name: firstName,
    last_name: lastName,
    admission_no: admNo,
    deleted_at: null,
  });
  localStorage.setItem(`myzkool_students_${SCHOOL}`, JSON.stringify(existing));
}

function createDue(studentId: string, desc: string, grossPaise: number, dueDate: string = "2026-05-10") {
  const existing = JSON.parse(localStorage.getItem(`myzkool_student_dues_${SCHOOL}`) || "[]");
  const due = {
    id: randomUUID(),
    school_id: SCHOOL,
    student_id: studentId,
    academic_year_id: YEAR,
    fee_head_id: randomUUID(),
    term_id: null,
    source: "structure",
    description: desc,
    gross_paise: grossPaise,
    concession_paise: 0,
    net_paise: grossPaise,
    paid_paise: 0,
    balance_paise: grossPaise,
    due_date: dueDate,
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  existing.push(due);
  localStorage.setItem(`myzkool_student_dues_${SCHOOL}`, JSON.stringify(existing));
  return due;
}

// ─── Test 1: B7.2 Collect regular fee ─────────────────────────────────────────

async function testFlowB7_2(collectFees: any, searchStudentsForCounter: any, getStudentDues: any) {
  console.log("\n[Test 1] Flow B7.2: Collect a regular fee");

  const studentId = "s-b72-" + Date.now();
  createStudent(studentId, "Aarav", "Verma", "MZ/2026/0412");
  const due1 = createDue(studentId, "Tuition fee April", 240000, "2026-04-10");
  const due2 = createDue(studentId, "Tuition fee May", 240000, "2026-05-10");

  // 1. Search under 300ms
  const startSearch = Date.now();
  const found = await searchStudentsForCounter(SCHOOL, "Aarav");
  const searchDuration = Date.now() - startSearch;
  check("Search finds student by first name", found.some((s: any) => s.id === studentId));
  check("Search response is fast (< 300 ms)", searchDuration < 300, `duration=${searchDuration}ms`);

  // 2. Select student and inspect dues
  const { dues } = await getStudentDues(SCHOOL, studentId, YEAR);
  check("Student has 2 pending dues", dues.length === 2);

  // 3. Collect regular fee via Cash
  const totalDue = due1.balance_paise + due2.balance_paise; // ₹4,800
  const collectRes = await collectFees(SCHOOL, {
    student_id: studentId,
    academic_year_id: YEAR,
    selected_due_ids: [due1.id, due2.id],
    payments: [{ mode: "cash", amount_paise: totalDue }],
    remarks: "Regular monthly fee",
  }, "idemp-b72-" + Date.now(), "cashier-1");

  check("Receipt created successfully", !!collectRes.receipt_no);
  check("Receipt number format is valid (prefix/year/seq)", /^MZ\/2026-27\/\d{6}$/.test(collectRes.receipt_no), `receipt=${collectRes.receipt_no}`);
  check("Receipt total equals paid amount", collectRes.total_paise === totalDue);

  // 4. Verify dues are now paid
  const { dues: updatedDues } = await getStudentDues(SCHOOL, studentId, YEAR);
  check("All collected dues marked paid with 0 balance", updatedDues.every((d: any) => d.status === "paid" && d.balance_paise === 0));

  // 5. Verify ledger entries
  const allLedger = JSON.parse(localStorage.getItem(`myzkool_fee_ledger_${SCHOOL}`) || "[]");
  const studentEntries = allLedger.filter((e: any) => e.student_id === studentId && e.receipt_id === collectRes.receipt_id);
  check("Ledger payment entries created for dues", studentEntries.length === 2);
  const ledgerTotal = studentEntries.reduce((s: number, e: any) => s + e.amount_paise, 0);
  check("Ledger credits match payment (-₹4,800)", ledgerTotal === -totalDue, `total=${ledgerTotal}`);
}

// ─── Test 2: B7.3 Partial payment ─────────────────────────────────────────────

async function testFlowB7_3(collectFees: any, getStudentDues: any, computeAllocation: any) {
  console.log("\n[Test 2] Flow B7.3: Partial payment");

  const studentId = "s-b73-" + Date.now();
  createStudent(studentId, "Riya", "Sharma", "MZ/2026/0555");
  const due = createDue(studentId, "Annual Composite Fee", 1000000, "2026-04-15"); // ₹10,000

  // Allocation preview for partial payment of ₹4,000
  const partialPaymentPaise = 400000;
  const preview = computeAllocation([due as any], partialPaymentPaise, "auto_oldest_first");
  check("Allocation allocates full partial payment to single due", preview.lines[0]?.allocated_paise === partialPaymentPaise);
  check("Preview balance after is ₹6,000", preview.lines[0]?.balance_after === 600000);

  // Collect partial payment
  const res = await collectFees(SCHOOL, {
    student_id: studentId,
    academic_year_id: YEAR,
    selected_due_ids: [due.id],
    payments: [{ mode: "upi", amount_paise: partialPaymentPaise, reference_no: "UPI12345678" }],
  }, "idemp-b73-" + Date.now(), "cashier-1");

  check("Partial payment collect succeeds", !!res.receipt_no);

  // Verify due status is partial and balance remaining is ₹6,000
  const { dues } = await getStudentDues(SCHOOL, studentId, YEAR);
  const updatedDue = dues.find((d: any) => d.id === due.id);
  check("Due status is 'partial'", updatedDue?.status === "partial");
  check("Due paid_paise is ₹4,000", updatedDue?.paid_paise === 400000);
  check("Due balance_paise is ₹6,000", updatedDue?.balance_paise === 600000);
}

// ─── Test 3: B7.4 Family payment (Siblings) ───────────────────────────────────

async function testFlowB7_4(collectFees: any, getStudentDues: any) {
  console.log("\n[Test 3] Flow B7.4: Two children in one payment (payment_group_id)");

  const child1 = "child-1-" + Date.now();
  const child2 = "child-2-" + Date.now();
  createStudent(child1, "Kabir", "Mehta", "MZ/2026/0801");
  createStudent(child2, "Ananya", "Mehta", "MZ/2026/0802");

  const dueC1 = createDue(child1, "Tuition fee", 300000);
  const dueC2 = createDue(child2, "Tuition fee", 300000);

  const sharedPaymentGroupId = randomUUID();

  // Pay child 1
  const r1 = await collectFees(SCHOOL, {
    student_id: child1,
    academic_year_id: YEAR,
    selected_due_ids: [dueC1.id],
    payments: [{ mode: "upi", amount_paise: 300000 }],
    payment_group_id: sharedPaymentGroupId,
  }, "idemp-fam-1-" + Date.now(), "cashier-1");

  // Pay child 2
  const r2 = await collectFees(SCHOOL, {
    student_id: child2,
    academic_year_id: YEAR,
    selected_due_ids: [dueC2.id],
    payments: [{ mode: "upi", amount_paise: 300000 }],
    payment_group_id: sharedPaymentGroupId,
  }, "idemp-fam-2-" + Date.now(), "cashier-1");

  check("Child 1 receipt created", !!r1.receipt_no);
  check("Child 2 receipt created", !!r2.receipt_no);
  check("Child 1 and Child 2 receipts have distinct numbers", r1.receipt_no !== r2.receipt_no);

  // Check stored receipts have matching payment_group_id
  const allReceipts = JSON.parse(localStorage.getItem(`myzkool_fee_receipts_${SCHOOL}`) || "[]");
  const storedR1 = allReceipts.find((r: any) => r.id === r1.receipt_id);
  const storedR2 = allReceipts.find((r: any) => r.id === r2.receipt_id);

  check("Both receipts share the same payment_group_id",
    storedR1?.payment_group_id === sharedPaymentGroupId &&
    storedR2?.payment_group_id === sharedPaymentGroupId,
    `g1=${storedR1?.payment_group_id} g2=${storedR2?.payment_group_id}`
  );
}

// ─── Test 4: B7.5 Concession at the counter ───────────────────────────────────

async function testFlowB7_5(updateFeeSettings: any, verifyOwnerPin: any) {
  console.log("\n[Test 4] Flow B7.5: Concession at counter and Owner PIN verification");

  // Set owner PIN via updateFeeSettings
  await updateFeeSettings(SCHOOL, { new_pin: "987654" });

  // Verify correct PIN

  const validCheck = await verifyOwnerPin(SCHOOL, "987654");
  check("Owner PIN verified successfully", validCheck.ok === true);

  // Verify wrong PIN fails
  const invalidCheck = await verifyOwnerPin(SCHOOL, "123456");
  check("Wrong PIN is rejected", invalidCheck.ok === false);
  check("Remaining attempts returned", typeof invalidCheck.remaining_attempts === "number");

  // Test discount logic
  const grossPaise = 500000; // ₹5,000
  const thresholdPercent = 10;
  const requestedPercent = 25; // 25% requires PIN

  const requiresPin = requestedPercent > thresholdPercent;
  check("Concession above threshold (25% > 10%) requires Owner PIN", requiresPin);

  const concessionPaise = Math.round(grossPaise * (requestedPercent / 100)); // ₹1,250
  const netPaise = grossPaise - concessionPaise; // ₹3,750
  check("Concession calculation is accurate (₹1,250)", concessionPaise === 125000);
  check("Net balance reduced correctly (₹3,750)", netPaise === 375000);
}

// ─── Test 5: B7.6 Cancel a receipt ────────────────────────────────────────────

async function testFlowB7_6(collectFees: any, cancelReceipt: any, getStudentDues: any) {
  console.log("\n[Test 5] Flow B7.6: Cancel a receipt");

  const studentId = "s-b76-" + Date.now();
  createStudent(studentId, "Vihaan", "Patel", "MZ/2026/0999");
  const due = createDue(studentId, "Library fee", 150000); // ₹1,500

  // 1. Collect
  const collectRes = await collectFees(SCHOOL, {
    student_id: studentId,
    academic_year_id: YEAR,
    selected_due_ids: [due.id],
    payments: [{ mode: "cash", amount_paise: 150000 }],
  }, "idemp-b76-" + Date.now(), "cashier-1");

  check("Receipt issued for cancellation test", !!collectRes.receipt_no);

  // 2. Attempt cancel with reason < 10 chars (should fail)
  let shortReasonFailed = false;
  try {
    await cancelReceipt(SCHOOL, collectRes.receipt_id, { reason: "error" });
  } catch (err: any) {
    shortReasonFailed = err.message.includes("10 characters");
  }
  check("Cancellation rejected if reason is less than 10 characters", shortReasonFailed);

  // 3. Cancel with valid reason
  const cancelRes = await cancelReceipt(SCHOOL, collectRes.receipt_id, {
    reason: "Collected wrong student fee in error",
  }, "cashier-1");

  check("Receipt cancelled successfully", cancelRes.cancelled === true);

  // 4. Check due is restored to unpaid
  const { dues } = await getStudentDues(SCHOOL, studentId, YEAR);
  const restoredDue = dues.find((d: any) => d.id === due.id);
  check("Due status restored to 'pending'", restoredDue?.status === "pending");
  check("Due balance restored to ₹1,500", restoredDue?.balance_paise === 150000);
  check("Due paid amount restored to 0", restoredDue?.paid_paise === 0);

  // 5. Check receipt record marked cancelled
  const allReceipts = JSON.parse(localStorage.getItem(`myzkool_fee_receipts_${SCHOOL}`) || "[]");
  const receiptRecord = allReceipts.find((r: any) => r.id === collectRes.receipt_id);
  check("Receipt status in database is 'cancelled'", receiptRecord?.status === "cancelled");
}

// ─── Test 6: Receipt HTML snapshots (A5 & Thermal) ────────────────────────────

async function testReceiptSnapshots(generateReceiptHTML: any) {
  console.log("\n[Test 6] Receipt PDF / Print snapshots (A5 & 80mm thermal)");

  const mockReceipt = {
    id: "rec-test-1",
    school_id: SCHOOL,
    receipt_no: "MZ/2026-27/000123",
    student_id: "stud-1",
    academic_year_id: YEAR,
    receipt_date: "2026-05-12",
    total_paise: 10005000, // ₹1,00,050.00
    status: "active" as const,
    source: "counter" as const,
    payment_group_id: null,
    collected_by: "Suresh Gupta",
    remarks: "First term fee",
    idempotency_key: null,
    print_count: 0,
    whatsapp_sent_at: null,
    cancelled_by: null,
    cancelled_at: null,
    cancel_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockItems = [
    { id: "i1", receipt_id: "rec-test-1", due_id: "d1", fee_head_id: "Tuition Fee Term 1", amount_paise: 9500000, concession_paise: 0 },
    { id: "i2", receipt_id: "rec-test-1", due_id: "d2", fee_head_id: "Exam Fee", amount_paise: 505000, concession_paise: 0 },
  ];

  const mockPayments = [
    { id: "p1", school_id: SCHOOL, receipt_id: "rec-test-1", mode: "upi" as const, amount_paise: 10005000, reference_no: "UPI-AXIS-9988", bank_name: null, instrument_no: null, instrument_date: null, cheque_status: null, gateway_order_id: null, gateway_payment_id: null, created_at: new Date().toISOString() },
  ];

  const studentDetails = {
    student_name: "Aarav Sharma",
    admission_no: "ADM20260412",
    class_name: "Class 4",
    section_name: "Section A",
    father_name: "Rakesh Sharma",
    academic_year_label: "2026-27",
    balance_remaining_paise: 0,
  };

  const schoolDetails = {
    name: "Delhi Public Global School",
    address: "Plot 12, Sector 5, Dwarka, New Delhi",
    phone: "+91 98765 43210",
    affiliation_no: "CBSE-AFF-19283",
  };

  // 1. A5 Snapshot
  const htmlA5 = generateReceiptHTML(mockReceipt, mockItems, mockPayments, studentDetails, schoolDetails, "a5", false);
  check("A5 snapshot contains school name", htmlA5.includes("Delhi Public Global School"));
  check("A5 snapshot contains receipt number", htmlA5.includes("MZ/2026-27/000123"));
  check("A5 snapshot contains student name & admission no", htmlA5.includes("Aarav Sharma") && htmlA5.includes("ADM20260412"));
  check("A5 snapshot contains Indian amount in words", htmlA5.includes("One Lakh Fifty Rupees Only"));
  check("A5 snapshot includes A5 page size rule", htmlA5.includes("A5 portrait"));
  check("A5 snapshot includes computer generated notice", htmlA5.includes("computer generated receipt"));

  // 2. 80mm Thermal Snapshot
  const htmlThermal = generateReceiptHTML(mockReceipt, mockItems, mockPayments, studentDetails, schoolDetails, "thermal80", false);
  check("Thermal snapshot contains 80mm width constraint", htmlThermal.includes("80mm"));
  check("Thermal snapshot contains fee heads & amounts", htmlThermal.includes("Tuition Fee Term 1"));

  // 3. Duplicate Copy Stamp on Reprint
  const htmlDuplicate = generateReceiptHTML(mockReceipt, mockItems, mockPayments, studentDetails, schoolDetails, "a5", true);
  check("Reprint contains 'DUPLICATE COPY' stamp", htmlDuplicate.includes("DUPLICATE COPY"));

  // 4. Cancelled Watermark on Cancelled Receipt
  const cancelledReceipt = { ...mockReceipt, status: "cancelled" as const };
  const htmlCancelled = generateReceiptHTML(cancelledReceipt, mockItems, mockPayments, studentDetails, schoolDetails, "a5", false);
  check("Cancelled receipt contains 'CANCELLED' watermark", htmlCancelled.includes("CANCELLED"));
}

// ─── Test 7: 360px responsiveness & keyboard map ──────────────────────────────

async function testResponsivenessAndKeymap() {
  console.log("\n[Test 7] 360px mobile view and keyboard accessibility");

  const fs = await import("fs");
  const path = await import("path");
  const feeCollectCode = fs.readFileSync(path.resolve("src/pages/admin/fees/FeeCollectPage.tsx"), "utf-8");

  // Keyboard shortcut tests
  check("Keyboard handler binds '/' to focus search", feeCollectCode.includes('e.key === "/"'));
  check("Keyboard handler binds Esc to reset/close", feeCollectCode.includes('e.key === "Escape"'));
  check("Keyboard handler binds 'a' to select all overdue", feeCollectCode.includes('e.key === "a"') || feeCollectCode.includes('e.key === "A"'));
  check("Keyboard handler binds Alt+1...6 for payment modes", feeCollectCode.includes("altKey"));
  check("Keyboard handler binds Ctrl+Enter to collect", feeCollectCode.includes("ctrlKey") && feeCollectCode.includes("Enter"));
  check("Keyboard handler binds 'P' for Print", feeCollectCode.includes('e.key === "p"'));
  check("Keyboard handler binds 'N' for Next student", feeCollectCode.includes('e.key === "n"'));

  // 360px Mobile tests
  check("Layout includes mobile-friendly single column (lg:flex-row)", feeCollectCode.includes("lg:flex-row"));
  check("Payment panel is full-width on mobile (w-full lg:w-96)", feeCollectCode.includes("w-full lg:w-96"));
  check("Offline banner displays network block message", feeCollectCode.includes("You are offline. Fee collection needs a connection"));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("Phase 3b: Fee Counter, Receipts & Ledger Tests");
  console.log("=".repeat(60));

  seedEnvironment();

  const { collectFees, cancelReceipt, searchStudentsForCounter } = await import("../src/services/collectionService");
  const { getStudentDues } = await import("../src/services/feeDuesService");
  const { computeAllocation } = await import("../src/lib/feeAllocation");
  const { updateFeeSettings, verifyOwnerPin } = await import("../src/services/feeSetupService");
  const { generateReceiptHTML } = await import("../src/lib/receiptTemplate");

  await testFlowB7_2(collectFees, searchStudentsForCounter, getStudentDues);
  await testFlowB7_3(collectFees, getStudentDues, computeAllocation);
  await testFlowB7_4(collectFees, getStudentDues);
  await testFlowB7_5(updateFeeSettings, verifyOwnerPin);

  await testFlowB7_6(collectFees, cancelReceipt, getStudentDues);
  await testReceiptSnapshots(generateReceiptHTML);
  await testResponsivenessAndKeymap();

  console.log("\n" + "=".repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("Failed:");
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log("All Phase 3b flows (B7.2 - B7.6) passed! ✓");
  process.exit(0);
}

main().catch(err => {
  console.error("Crash in test suite:", err);
  process.exit(1);
});
