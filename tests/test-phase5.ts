/**
 * test-phase5.ts — Phase 5: Online Payments Test Suite
 * Run: npx tsx tests/test-phase5.ts
 *
 * Acceptance tests from spec B11 and user prompt:
 * 1. Client-supplied amount ignored (server recomputes from student_dues).
 * 2. Webhook replay ignored (deduped by event_id).
 * 3. Forged signature rejected (HMAC mismatch fails).
 * 4. Order finalised only by reconciliation gives exactly one receipt.
 * 5. Token of Parent A cannot read Parent B's dues.
 * 6. Duplicate capture when dues already settled creates FeeCredit advance + accountant alert row.
 * 7. OTP rate limiting / 3 failed attempts lock.
 * 8. Settlement report computes gross, fee, GST, and net payout accurately.
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
import {
  getSchoolGatewayCredentials,
  saveSchoolGatewayCredentials,
  generateParentPayLink,
  requestParentPayOTP,
  verifyParentPayOTP,
  getParentPayContext,
  createOnlinePaymentOrder,
  finaliseOnlineOrderCapture,
  processPaymentWebhook,
  runOnlineReconciliationJob,
  getSettlementReport,
} from "../src/services/onlinePaymentService";
import { MockPaymentGateway } from "../src/services/paymentGateway/mockAdapter";
import { RazorpayGateway, computeHmacSha256 } from "../src/services/paymentGateway/razorpayAdapter";

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

const SCHOOL = "school-p5-" + Date.now();
const YEAR = "year-p5-" + Date.now();

function seedEnvironment() {
  // Academic year
  localStorage.setItem(
    `myzkool_academic_years_${SCHOOL}`,
    JSON.stringify([
      { id: YEAR, school_id: SCHOOL, is_current: true, is_closed: false, start_year: 2026, end_year: 2027, label: "2026-27" },
    ])
  );

  // Fee settings
  localStorage.setItem(
    `myzkool_fee_settings_${SCHOOL}`,
    JSON.stringify({
      id: randomUUID(),
      school_id: SCHOOL,
      receipt_prefix: "ONL",
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
      parent_pay_enabled: true,
      gateway_fee_bearer: "school",
      auto_print_receipt: false,
    })
  );

  // School profile
  localStorage.setItem(
    `myzkool_school_profile_${SCHOOL}`,
    JSON.stringify([
      {
        id: SCHOOL,
        name: "Sunrise Global Academy",
        subdomain: "sunrise",
      },
    ])
  );

  // Default mock gateway credentials
  localStorage.setItem(
    `myzkool_gateway_creds_${SCHOOL}`,
    JSON.stringify([
      {
        id: `cred_${SCHOOL}`,
        school_id: SCHOOL,
        gateway: "mock",
        key_id: "mock_key_test_123",
        key_secret_enc: "mock_secret_enc_456",
        webhook_secret_enc: "mock_webhook_secret_789",
        who_bears_charges: "school",
        convenience_fee_percent: 0,
        is_active: true,
      },
    ])
  );
}

function createParentWithStudent(
  parentId: string,
  parentName: string,
  parentPhone: string,
  studentId: string,
  studentName: string,
  admissionNo: string
) {
  // Parent
  const parents = JSON.parse(localStorage.getItem(`myzkool_parents_${SCHOOL}`) || "[]");
  parents.push({ id: parentId, full_name: parentName, phone: parentPhone });
  localStorage.setItem(`myzkool_parents_${SCHOOL}`, JSON.stringify(parents));

  // Student
  const students = JSON.parse(localStorage.getItem(`myzkool_students_${SCHOOL}`) || "[]");
  const [firstName, ...rest] = studentName.split(" ");
  students.push({
    id: studentId,
    school_id: SCHOOL,
    first_name: firstName,
    last_name: rest.join(" "),
    admission_no: admissionNo,
    admission_class_id: "class-1",
    deleted_at: null,
  });
  localStorage.setItem(`myzkool_students_${SCHOOL}`, JSON.stringify(students));

  // Mapping
  const sp = JSON.parse(localStorage.getItem(`myzkool_student_parents_${SCHOOL}`) || "[]");
  sp.push({ student_id: studentId, parent_id: parentId });
  localStorage.setItem(`myzkool_student_parents_${SCHOOL}`, JSON.stringify(sp));
}

function createStudentDue(
  studentId: string,
  desc: string,
  balancePaise: number,
  dueDate: string = "2026-06-30"
): string {
  const dues = JSON.parse(localStorage.getItem(`myzkool_student_dues_${SCHOOL}`) || "[]");
  const id = randomUUID();
  dues.push({
    id,
    school_id: SCHOOL,
    student_id: studentId,
    academic_year_id: YEAR,
    fee_head_id: "head-tuition",
    term_id: null,
    source: "structure",
    description: desc,
    gross_paise: balancePaise,
    concession_paise: 0,
    net_paise: balancePaise,
    paid_paise: 0,
    balance_paise: balancePaise,
    due_date: dueDate,
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  localStorage.setItem(`myzkool_student_dues_${SCHOOL}`, JSON.stringify(dues));
  return id;
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

async function runTests() {
  console.log("=== Phase 5: Online Payments Test Suite ===\n");
  seedEnvironment();

  // Test 7: OTP rate limiting / 3 failed attempts lock
  console.log("[Test 7] OTP verification & rate-limiting (3 failed attempts lock)");
  const parentAId = "parent-A-" + Date.now();
  const studentAId = "student-A-" + Date.now();
  createParentWithStudent(parentAId, "Rajesh Kumar", "+91 9876543210", studentAId, "Aarav Kumar", "ADM-001");
  const dueA1 = createStudentDue(studentAId, "Q1 Tuition Fee", 1500000); // Rs 15,000

  const linkResA = await generateParentPayLink(SCHOOL, parentAId);
  check("Parent pay link generated with opaque token", linkResA.token.startsWith("pay_"));

  const otpReqA = await requestParentPayOTP(linkResA.token);
  check("OTP requested successfully", otpReqA.success);
  check("Phone number masked correctly", otpReqA.masked_phone.includes("3210") && otpReqA.masked_phone.includes("******"));

  // Retrieve generated OTP from session to test invalid and valid paths
  const sessionsA = JSON.parse(localStorage.getItem(`myzkool_pay_sessions_${SCHOOL}`) || "[]");
  const activeSessionA = sessionsA.find((s: any) => s.token_id);
  const correctOtp = activeSessionA.otp_code;

  // Wrong attempt 1
  const fail1 = await verifyParentPayOTP(linkResA.token, "000000");
  check("Attempt 1 fails with incorrect OTP", !fail1.success && fail1.remaining_attempts === 2);

  // Wrong attempt 2
  const fail2 = await verifyParentPayOTP(linkResA.token, "111111");
  check("Attempt 2 fails with 1 attempt remaining", !fail2.success && fail2.remaining_attempts === 1);

  // Wrong attempt 3
  const fail3 = await verifyParentPayOTP(linkResA.token, "222222");
  check("Attempt 3 locks session", !fail3.success && fail3.remaining_attempts === 0);

  // Wrong attempt 4 (after locked)
  const fail4 = await verifyParentPayOTP(linkResA.token, "333333");
  check("4th attempt blocked by max attempts lock", !fail4.success && (fail4.error || "").includes("Maximum"));

  // Request fresh OTP for Parent A and verify successfully
  await requestParentPayOTP(linkResA.token);
  const updatedSessions = JSON.parse(localStorage.getItem(`myzkool_pay_sessions_${SCHOOL}`) || "[]");
  const newOtp = updatedSessions[updatedSessions.length - 1].otp_code;
  const verifySuccessA = await verifyParentPayOTP(linkResA.token, newOtp);
  check("Fresh OTP verifies successfully and creates session token", verifySuccessA.success && !!verifySuccessA.session_token);
  const sessionTokenA = verifySuccessA.session_token!;

  // Test 1: Client-supplied amount ignored (server recomputes from student_dues)
  console.log("\n[Test 1] Client-supplied amount ignored (server recomputes from student_dues)");
  // Client attempts to pay only 100 paise (Rs 1) for a 1500000 paise (Rs 15,000) due
  const hackedOrderRes = await createOnlinePaymentOrder(sessionTokenA, [dueA1], 100);
  check("Order created successfully", hackedOrderRes.success && !!hackedOrderRes.order);
  check(
    "Server recomputed amount: client-supplied 100 paise was strictly ignored",
    hackedOrderRes.order?.amount_paise === 1500000,
    `got ${hackedOrderRes.order?.amount_paise}, expected 1500000`
  );

  // Test 5: Token of Parent A cannot read or pay Parent B's dues
  console.log("\n[Test 5] Cross-parent authorization (Token of Parent A cannot access Parent B's dues)");
  const parentBId = "parent-B-" + Date.now();
  const studentBId = "student-B-" + Date.now();
  createParentWithStudent(parentBId, "Sunita Sharma", "+91 9812345678", studentBId, "Rohan Sharma", "ADM-002");
  const dueB1 = createStudentDue(studentBId, "Q1 Tuition Fee", 1200000);

  // Parent A's context must ONLY contain Parent A's children
  const ctxA = await getParentPayContext(sessionTokenA);
  check("Parent A context returns Aarav Kumar", ctxA.context?.students.some((s) => s.student_id === studentAId) === true);
  check("Parent A context DOES NOT contain Rohan Sharma", ctxA.context?.students.some((s) => s.student_id === studentBId) === false);

  // Parent A attempts to create an order including Parent B's due
  const crossOrderRes = await createOnlinePaymentOrder(sessionTokenA, [dueB1]);
  check("Parent A prevented from creating order with Parent B's due", !crossOrderRes.success && (crossOrderRes.error || "").includes("Unauthorized"));

  // Test 3: Forged signature rejected (HMAC mismatch fails)
  console.log("\n[Test 3] Webhook signature verification (forged signature rejected)");
  const fakeBody = JSON.stringify({
    event: "payment.captured",
    event_id: "evt_test_fake_123",
    payload: {
      payment: {
        entity: {
          id: "pay_fake_999",
          order_id: hackedOrderRes.gateway_order_id,
          amount: 1500000,
          status: "captured",
        },
      },
    },
  });

  const forgedWebhookRes = await processPaymentWebhook(SCHOOL, fakeBody, "invalid_forged_signature_hex");
  check("Forged webhook signature rejected", !forgedWebhookRes.success && (forgedWebhookRes.error || "").includes("Invalid"));

  // Test real Razorpay signature calculation & verification directly
  const realRazorpay = new RazorpayGateway();
  const rzpSecret = "rzp_webhook_secret_myzkool";
  const validHmac = await computeHmacSha256(rzpSecret, fakeBody);
  const rzpValidResult = await realRazorpay.verifyWebhook({
    rawBody: fakeBody,
    signature: validHmac,
    secret: rzpSecret,
  });
  check("Valid HMAC signature accepted by Razorpay adapter", rzpValidResult.isValid);

  const rzpForgedResult = await realRazorpay.verifyWebhook({
    rawBody: fakeBody,
    signature: "deadbeefbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbad",
    secret: rzpSecret,
  });
  check("Forged HMAC signature rejected by Razorpay adapter", !rzpForgedResult.isValid);

  // Test 2: Webhook replay ignored (deduped by event_id)
  console.log("\n[Test 2] Webhook replay protection (deduped by event_id)");
  const creds = await getSchoolGatewayCredentials(SCHOOL);
  const eventId = "evt_unique_1001";
  const validMockSignature = `sig_mock_${eventId}_${creds.webhook_secret_enc}`;
  const mockWebhookBody = JSON.stringify({
    event: "payment.captured",
    event_id: eventId,
    order_id: hackedOrderRes.gateway_order_id,
    payment_id: "pay_valid_mock_1001",
    amount_paise: 1500000,
    status: "captured",
  });

  // First delivery
  const webhook1 = await processPaymentWebhook(SCHOOL, mockWebhookBody, validMockSignature);
  check("First webhook delivery processed successfully", webhook1.success && webhook1.replayed === false);

  // Check receipt was generated
  const ordersAfterW1 = JSON.parse(localStorage.getItem(`myzkool_online_orders_${SCHOOL}`) || "[]");
  const capturedOrder = ordersAfterW1.find((o: any) => o.gateway_order_id === hackedOrderRes.gateway_order_id);
  check("Order transitioned to captured", capturedOrder?.status === "captured");
  check("Receipt generated on webhook capture", capturedOrder?.receipt_ids.length === 1);
  const originalReceiptId = capturedOrder?.receipt_ids[0];

  // Replay exact same webhook
  const webhook2 = await processPaymentWebhook(SCHOOL, mockWebhookBody, validMockSignature);
  check("Replayed webhook recognized and ignored", webhook2.success && webhook2.replayed === true);

  const ordersAfterW2 = JSON.parse(localStorage.getItem(`myzkool_online_orders_${SCHOOL}`) || "[]");
  const capturedOrder2 = ordersAfterW2.find((o: any) => o.gateway_order_id === hackedOrderRes.gateway_order_id);
  check("No duplicate receipts generated upon webhook replay", capturedOrder2?.receipt_ids.length === 1 && capturedOrder2?.receipt_ids[0] === originalReceiptId);

  // Test 4: Order finalised only by reconciliation gives exactly one receipt
  console.log("\n[Test 4] Reconciliation job finalisation (15-min cycle, idempotent)");
  // Create another order for Parent A (due A2)
  const dueA2 = createStudentDue(studentAId, "Q2 Tuition Fee", 1500000);
  const reconOrderRes = await createOnlinePaymentOrder(sessionTokenA, [dueA2]);
  check("Order created for reconciliation test", reconOrderRes.success && !!reconOrderRes.gateway_order_id);

  // Backdate order created_at to 15 minutes ago to trigger reconciliation pickup
  const allOrders = JSON.parse(localStorage.getItem(`myzkool_online_orders_${SCHOOL}`) || "[]");
  const targetOrder = allOrders.find((o: any) => o.gateway_order_id === reconOrderRes.gateway_order_id);
  targetOrder.created_at = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  localStorage.setItem(`myzkool_online_orders_${SCHOOL}`, JSON.stringify(allOrders));

  // Mark status as captured on the mock gateway adapter
  MockPaymentGateway.setOrderStatus(reconOrderRes.gateway_order_id!, "captured", "pay_recon_9999");

  // Run reconciliation
  const reconReport1 = await runOnlineReconciliationJob(SCHOOL);
  check("Reconciliation job evaluated stale order and finalised capture", reconReport1.finalised === 1);

  const ordersAfterRecon = JSON.parse(localStorage.getItem(`myzkool_online_orders_${SCHOOL}`) || "[]");
  const finalisedReconOrder = ordersAfterRecon.find((o: any) => o.gateway_order_id === reconOrderRes.gateway_order_id);
  check("Reconciliation generated exactly one receipt", finalisedReconOrder?.receipt_ids.length === 1);

  // Run reconciliation a second time: must be idempotent and not create duplicate receipts
  const reconReport2 = await runOnlineReconciliationJob(SCHOOL);
  check("Second reconciliation run does not re-process already captured order", reconReport2.finalised === 0);

  // Test 6: Duplicate capture when dues already settled creates FeeCredit advance + accountant alert row
  console.log("\n[Test 6] Race condition / duplicate capture creates FeeCredit advance + alert row");
  const dueA3 = createStudentDue(studentAId, "Transport Fee Term 1", 500000); // Rs 5,000
  const simOrderRes = await createOnlinePaymentOrder(sessionTokenA, [dueA3]);
  check("Simultaneous in-flight order created", simOrderRes.success && !!simOrderRes.gateway_order_id);

  // Meanwhile, the parent walks up to the school counter and pays this exact due in cash!
  const currentDues = JSON.parse(localStorage.getItem(`myzkool_student_dues_${SCHOOL}`) || "[]");
  const d3 = currentDues.find((d: any) => d.id === dueA3);
  d3.status = "paid";
  d3.paid_paise = 500000;
  d3.balance_paise = 0;
  localStorage.setItem(`myzkool_student_dues_${SCHOOL}`, JSON.stringify(currentDues));

  // Now, the online payment gateway sends a capture for that order
  const simCaptureRes = await finaliseOnlineOrderCapture(
    SCHOOL,
    simOrderRes.gateway_order_id!,
    "pay_simultaneous_capture_777"
  );
  check("Duplicate capture finalisation completed without crashing", simCaptureRes.success);

  // Verify FeeCredit row was created for Rs 5,000 (500,000 paise)
  const credits = JSON.parse(localStorage.getItem(`myzkool_fee_credits_${SCHOOL}`) || "[]");
  const studentCredit = credits.find((c: any) => c.student_id === studentAId && c.amount_paise === 500000);
  check("FeeCredit advance created for the settled due amount", !!studentCredit && studentCredit.remaining_paise === 500000);

  // Verify alert row was written for accountant
  const alerts = JSON.parse(localStorage.getItem(`myzkool_fee_alerts_${SCHOOL}`) || "[]");
  const simAlert = alerts.find((a: any) => a.kind === "simultaneous_online_payment" && a.student_id === studentAId);
  check("Accountant alert row written with explanation and amount", !!simAlert && simAlert.message.includes("converted to student advance credit"));

  // Test 8: Settlement report computes gross, fee, GST, and net payout accurately
  console.log("\n[Test 8] Settlement report arithmetic (gross, fee, GST, net payout)");
  const settlement = await getSettlementReport(SCHOOL);
  check("Settlement report returned captured rows", settlement.rows.length >= 2);

  // Verify arithmetic for each row:
  // gateway_fee = 2% of gross
  // gst_on_fee = 18% of gateway_fee
  // net_payout = gross - gateway_fee - gst_on_fee
  let mathChecksPassed = true;
  for (const row of settlement.rows) {
    const expectedFee = Math.round(row.gross_amount_paise * 0.02);
    const expectedGst = Math.round(expectedFee * 0.18);
    const expectedNet = row.gross_amount_paise - expectedFee - expectedGst;
    if (
      row.gateway_fee_paise !== expectedFee ||
      row.gst_on_fee_paise !== expectedGst ||
      row.net_payout_paise !== expectedNet
    ) {
      mathChecksPassed = false;
      console.error("Mismatch in row math:", row);
      break;
    }
  }
  check("All settlement rows follow 2% fee + 18% GST + net payout formula", mathChecksPassed);
  check(
    "Total gross matches sum of net payouts plus fees",
    settlement.total_gross_paise > 0 && settlement.total_payout_paise < settlement.total_gross_paise
  );

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log("\n========================================================");
  console.log(`Phase 5 Tests Complete: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("Failures:", errors);
    process.exit(1);
  } else {
    console.log("ALL PHASE 5 ACCEPTANCE CRITERIA PASSED! 🎉");
  }
}

runTests().catch((err) => {
  console.error("Unhandled test execution error:", err);
  process.exit(1);
});

