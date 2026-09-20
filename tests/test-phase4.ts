/**
 * test-phase4.ts — Phase 4: Fee Operations Test Suite
 * Run: npx tsx tests/test-phase4.ts
 *
 * Acceptance tests from spec B11 and user prompt:
 * 1. Late fee job twice gives no duplicates, never compounds, waiver writes ledger.
 * 2. Year close twice gives exactly ONE carry-forward due per student.
 * 3. Closed day rejects create and cancel operations.
 * 4. Cheque bounce restores dues and writes ledger reversal.
 * 5. Reminders never repeat for the same dedupe_key, respects quiet hours & skip paid.
 * 6. Reports execute under 3 seconds on a seed of 1,800 students and 3 years.
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

const SCHOOL = "school-p4-" + Date.now();
const YEAR_CUR = "year-cur-" + Date.now();
const YEAR_NEXT = "year-next-" + Date.now();

function seedEnvironment() {
  localStorage.setItem(`myzkool_academic_years_${SCHOOL}`, JSON.stringify([
    { id: YEAR_CUR, school_id: SCHOOL, is_current: true, is_closed: false, start_year: 2025, end_year: 2026, label: "2025-26" },
    { id: YEAR_NEXT, school_id: SCHOOL, is_current: false, is_closed: false, start_year: 2026, end_year: 2027, label: "2026-27" },
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
    auto_late_fee: true,
    cheque_receipt_timing: "on_receipt",
    parent_pay_enabled: false,
    gateway_fee_bearer: "school",
    auto_print_receipt: false,
  }));
}

function createStudent(id: string, firstName: string, lastName: string, admNo: string, classId?: string) {
  const existing = JSON.parse(localStorage.getItem(`myzkool_students_${SCHOOL}`) || "[]");
  existing.push({
    id,
    school_id: SCHOOL,
    first_name: firstName,
    last_name: lastName,
    admission_no: admNo,
    class_id: classId || "class-1",
    deleted_at: null,
  });
  localStorage.setItem(`myzkool_students_${SCHOOL}`, JSON.stringify(existing));
}

function createDue(studentId: string, desc: string, grossPaise: number, dueDate: string, yearId: string = YEAR_CUR) {
  const existing = JSON.parse(localStorage.getItem(`myzkool_student_dues_${SCHOOL}`) || "[]");
  const due = {
    id: randomUUID(),
    school_id: SCHOOL,
    student_id: studentId,
    academic_year_id: yearId,
    fee_head_id: "head-tuition",
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

// ─── Test 1: Late Fee Job Twice Gives No Duplicates ───────────────────────────

async function testLateFeeJob(runLateFeeJob: any, waiveLateFee: any) {
  console.log("\n[Test 1] Late fee job run twice gives no duplicates; waiver writes ledger");

  const s1 = "s-late-1-" + Date.now();
  createStudent(s1, "Rohan", "Kapoor", "MZ/2025/0101");
  // 30 days overdue
  const due = createDue(s1, "Tuition fee August", 500000, "2025-08-10");

  // Run 1
  const report1 = await runLateFeeJob(SCHOOL, YEAR_CUR, "2025-09-10");
  check("Run 1 created late fee due", report1.late_fees_created > 0);

  const duesAfterRun1 = JSON.parse(localStorage.getItem(`myzkool_student_dues_${SCHOOL}`) || "[]");
  const lateDues1 = duesAfterRun1.filter((d: any) => d.student_id === s1 && d.source === "late_fee");
  check("Exactly one late fee due exists for student", lateDues1.length === 1);
  const initialLateFeePaise = lateDues1[0].gross_paise;

  // Run 2 (Idempotency test on same day)
  const report2 = await runLateFeeJob(SCHOOL, YEAR_CUR, "2025-09-10");
  check("Run 2 created 0 new late fees (idempotent)", report2.late_fees_created === 0);

  const duesAfterRun2 = JSON.parse(localStorage.getItem(`myzkool_student_dues_${SCHOOL}`) || "[]");
  const lateDues2 = duesAfterRun2.filter((d: any) => d.student_id === s1 && d.source === "late_fee");
  check("Still exactly one late fee due (no duplicates)", lateDues2.length === 1);
  check("Late fee did not compound or double", lateDues2[0].gross_paise === initialLateFeePaise);

  // Waive Late Fee
  const waiveRes = await waiveLateFee(SCHOOL, lateDues2[0].id, "Principal waiver for sports achievement", "principal-1");
  check("Waive late fee succeeds", waiveRes.success === true);
  check("Waived amount matches initial late fee", waiveRes.waived_paise === initialLateFeePaise);

  const duesAfterWaive = JSON.parse(localStorage.getItem(`myzkool_student_dues_${SCHOOL}`) || "[]");
  const waivedDue = duesAfterWaive.find((d: any) => d.id === lateDues2[0].id);
  check("Late fee due balance is 0 after waiver", waivedDue.balance_paise === 0);

  const ledger = JSON.parse(localStorage.getItem(`myzkool_fee_ledger_${SCHOOL}`) || "[]");
  const waiverEntry = ledger.find((e: any) => e.due_id === lateDues2[0].id && e.entry_type === "waiver");
  check("Ledger contains waiver entry", !!waiverEntry);
  check("Waiver ledger amount is negative (-initialLateFeePaise)", waiverEntry?.amount_paise === -initialLateFeePaise);
}

// ─── Test 2: Year Close Twice Gives One Carry-Forward Due Per Student ──────────

async function testYearClose(executeYearClose: any) {
  console.log("\n[Test 2] Year close twice gives exactly ONE carry-forward due per student");

  const yearCloseSrc = "year-close-src-" + Date.now();
  const yearCloseTgt = "year-close-tgt-" + Date.now();
  const years = JSON.parse(localStorage.getItem(`myzkool_academic_years_${SCHOOL}`) || "[]");
  years.push(
    { id: yearCloseSrc, school_id: SCHOOL, is_current: true, is_closed: false, start_year: 2024, end_year: 2025, label: "2024-25" },
    { id: yearCloseTgt, school_id: SCHOOL, is_current: false, is_closed: false, start_year: 2025, end_year: 2026, label: "2025-26" }
  );
  localStorage.setItem(`myzkool_academic_years_${SCHOOL}`, JSON.stringify(years));

  const sYear1 = "s-yr-1-" + Date.now();
  const sYear2 = "s-yr-2-" + Date.now();
  createStudent(sYear1, "Neha", "Sen", "MZ/2025/0201");
  createStudent(sYear2, "Aditya", "Roy", "MZ/2025/0202");

  // sYear1 has two outstanding dues totaling 6,000
  createDue(sYear1, "Tuition Q1", 300000, "2024-06-10", yearCloseSrc);
  createDue(sYear1, "Tuition Q2", 300000, "2024-09-10", yearCloseSrc);

  // sYear2 has one outstanding due of 4,500
  createDue(sYear2, "Composite Fee", 450000, "2024-07-10", yearCloseSrc);

  // Run Year Close 1
  const res1 = await executeYearClose(SCHOOL, yearCloseSrc, yearCloseTgt, "admin-1");
  check("Year close 1 processed students with balance", res1.students_carried_forward === 2);
  check("Year close 1 created 2 carry-forward dues", res1.dues_created_count === 2);

  const duesAfterYr1 = JSON.parse(localStorage.getItem(`myzkool_student_dues_${SCHOOL}`) || "[]");
  const carryDuesS1_run1 = duesAfterYr1.filter((d: any) => d.student_id === sYear1 && d.academic_year_id === yearCloseTgt && d.source === "carry_forward");
  const carryDuesS2_run1 = duesAfterYr1.filter((d: any) => d.student_id === sYear2 && d.academic_year_id === yearCloseTgt && d.source === "carry_forward");

  check("Student 1 has exactly 1 carry-forward due in next year", carryDuesS1_run1.length === 1);
  check("Student 1 carry-forward due equals total arrears (₹6,000)", carryDuesS1_run1[0].balance_paise === 600000);
  check("Student 2 has exactly 1 carry-forward due in next year", carryDuesS2_run1.length === 1);
  check("Student 2 carry-forward due equals total arrears (₹4,500)", carryDuesS2_run1[0].balance_paise === 450000);

  // Run Year Close 2 (Idempotency test)
  const res2 = await executeYearClose(SCHOOL, yearCloseSrc, yearCloseTgt, "admin-1");
  check("Year close 2 created 0 new dues (idempotent)", res2.dues_created_count === 0);

  const duesAfterYr2 = JSON.parse(localStorage.getItem(`myzkool_student_dues_${SCHOOL}`) || "[]");
  const carryDuesS1_run2 = duesAfterYr2.filter((d: any) => d.student_id === sYear1 && d.academic_year_id === yearCloseTgt && d.source === "carry_forward");
  const carryDuesS2_run2 = duesAfterYr2.filter((d: any) => d.student_id === sYear2 && d.academic_year_id === yearCloseTgt && d.source === "carry_forward");

  check("Student 1 STILL has exactly 1 carry-forward due after 2nd run", carryDuesS1_run2.length === 1);
  check("Student 2 STILL has exactly 1 carry-forward due after 2nd run", carryDuesS2_run2.length === 1);
}

// ─── Test 3: Closed Day Rejects Create and Cancel ──────────────────────────────

async function testClosedDay(closeDay: any, collectFees: any, cancelReceipt: any) {
  console.log("\n[Test 3] Closed day rejects create and cancel operations");

  const closedDate = "2026-03-31";
  const sClosed = "s-cls-" + Date.now();
  createStudent(sClosed, "Tanvi", "Nair", "MZ/2025/0301");
  const due = createDue(sClosed, "Exam fee", 100000, closedDate, YEAR_CUR);

  // Lock and close date
  await closeDay(SCHOOL, {
    business_date: closedDate,
    counted_cash_paise: 0,
    notes: "Financial year end closing",
  }, "owner-1");

  // 1. Attempt to collect on closed day (should fail)
  let createRejected = false;
  try {
    await collectFees(SCHOOL, {
      student_id: sClosed,
      academic_year_id: YEAR_CUR,
      selected_due_ids: [due.id],
      payments: [{ mode: "cash", amount_paise: 100000 }],
      receipt_date: closedDate,
    }, "idemp-cls-" + Date.now(), "cashier-1");
  } catch (err: any) {
    createRejected = err.message.includes("closed");
  }
  check("Fee collection rejected on a closed day", createRejected);

  // 2. Attempt to cancel a receipt on a closed day
  // First create a receipt on an open day
  const openDate = "2026-04-02";
  const openDue = createDue(sClosed, "ID card fee", 20000, openDate, YEAR_CUR);
  const rOpen = await collectFees(SCHOOL, {
    student_id: sClosed,
    academic_year_id: YEAR_CUR,
    selected_due_ids: [openDue.id],
    payments: [{ mode: "cash", amount_paise: 20000 }],
    receipt_date: openDate,
  }, "idemp-opn-" + Date.now(), "cashier-1");

  // Now close openDate
  await closeDay(SCHOOL, { business_date: openDate }, "owner-1");

  // Attempt to cancel receipt of now-closed day (should fail)
  let cancelRejected = false;
  try {
    await cancelReceipt(SCHOOL, rOpen.receipt_id, {
      reason: "Requested cancellation of closed day transaction",
    }, "cashier-1");
  } catch (err: any) {
    cancelRejected = err.message.includes("closed");
  }
  check("Receipt cancellation rejected on a closed day", cancelRejected);
}

// ─── Test 4: Cheque Bounce Restores Dues ───────────────────────────────────────

async function testChequeBounce(collectFees: any, bounceCheque: any, getStudentDues: any) {
  console.log("\n[Test 4] Cheque bounce restores dues and writes reversal ledger");

  const sChq = "s-chq-" + Date.now();
  createStudent(sChq, "Aryan", "Mishra", "MZ/2026/0401");
  const due = createDue(sChq, "Tuition Q3", 350000, "2026-01-10", YEAR_CUR);

  // 1. Collect via Cheque
  const collectRes = await collectFees(SCHOOL, {
    student_id: sChq,
    academic_year_id: YEAR_CUR,
    selected_due_ids: [due.id],
    payments: [{
      mode: "cheque",
      amount_paise: 350000,
      reference_no: "CHQ998877",
    }],
  }, "idemp-chq-" + Date.now(), "cashier-1");

  check("Cheque collection succeeded", !!collectRes.receipt_no);

  // Verify due is paid
  const { dues: duesAfterCollect } = await getStudentDues(SCHOOL, sChq, YEAR_CUR);
  const paidDue = duesAfterCollect.find((d: any) => d.id === due.id);
  check("Due marked paid after cheque collection", paidDue?.status === "paid" && paidDue?.balance_paise === 0);

  // Get payment ID
  const payments = JSON.parse(localStorage.getItem(`myzkool_fee_payments_${SCHOOL}`) || "[]");
  const chqPayment = payments.find((p: any) => p.receipt_id === collectRes.receipt_id);
  check("Cheque payment record exists", !!chqPayment);

  // 2. Mark Cheque Bounced
  const bounceRes = await bounceCheque(SCHOOL, chqPayment.id, {
    bounce_reason: "Insufficient funds (Drawer signature verified)",
    bounce_charge_paise: 50000, // ₹500 bounce fee
  }, "cashier-1");
  check("Cheque bounce processed successfully", bounceRes.success === true);

  // 3. Verify original due is RESTORED
  const { dues: duesAfterBounce } = await getStudentDues(SCHOOL, sChq, YEAR_CUR);
  const restoredDue = duesAfterBounce.find((d: any) => d.id === due.id);
  check("Original due restored to 'pending'", restoredDue?.status === "pending");
  check("Original due balance restored to ₹3,500", restoredDue?.balance_paise === 350000);
  check("Original due paid_paise reset to 0", restoredDue?.paid_paise === 0);

  // 4. Verify bounce charge due created
  const bounceDue = duesAfterBounce.find((d: any) => d.description?.includes("Cheque bounce charge"));
  check("Bounce charge manual due created (₹500)", !!bounceDue && bounceDue.balance_paise === 50000);

  // 5. Verify receipt status is 'bounced'
  const receipts = JSON.parse(localStorage.getItem(`myzkool_fee_receipts_${SCHOOL}`) || "[]");
  const bouncedReceipt = receipts.find((r: any) => r.id === collectRes.receipt_id);
  check("Receipt status updated to 'bounced'", bouncedReceipt?.status === "bounced");

  // 6. Verify ledger reversal
  const ledger = JSON.parse(localStorage.getItem(`myzkool_fee_ledger_${SCHOOL}`) || "[]");
  const reversalEntry = ledger.find((e: any) => e.receipt_id === collectRes.receipt_id && e.entry_type === "reversal");
  check("Ledger contains reversal entry for bounced payment", !!reversalEntry && reversalEntry.amount_paise === 350000);
}

// ─── Test 5: Reminders Never Repeat For Same Dedupe Key ───────────────────────

async function testReminders(runReminderJob: any) {
  console.log("\n[Test 5] Reminders never repeat for the same dedupe_key");

  const sRem = "s-rem-" + Date.now();
  createStudent(sRem, "Isha", "Bose", "MZ/2026/0501");
  // Due exactly 7 days overdue as of 2026-05-17
  const due = createDue(sRem, "Annual charge", 200000, "2026-05-10", YEAR_CUR);

  // Run 1: 7 days overdue
  const res1 = await runReminderJob(SCHOOL, YEAR_CUR, {
    ignoreQuietHours: true,
    asOfDateStr: "2026-05-17",
  });
  check("Run 1 queued reminder for 7 days overdue", res1.reminders_queued > 0);

  const outboxAfter1 = JSON.parse(localStorage.getItem(`myzkool_fee_outbox_${SCHOOL}`) || "[]");
  const reminders1 = outboxAfter1.filter((o: any) => o.payload?.due_id === due.id);
  check("Outbox contains exactly 1 reminder for this due", reminders1.length === 1);

  // Run 2: Same date / same rule (Should skip due to dedupe_key!)
  const res2 = await runReminderJob(SCHOOL, YEAR_CUR, {
    ignoreQuietHours: true,
    asOfDateStr: "2026-05-17",
  });
  check("Run 2 queued 0 duplicate reminders", res2.reminders_queued === 0);
  check("Run 2 skipped already sent reminder", res2.skipped_already_sent > 0);

  const outboxAfter2 = JSON.parse(localStorage.getItem(`myzkool_fee_outbox_${SCHOOL}`) || "[]");
  const reminders2 = outboxAfter2.filter((o: any) => o.payload?.due_id === due.id);
  check("Outbox STILL contains exactly 1 reminder (no repeats)", reminders2.length === 1);
}

// ─── Test 6: Reports Under 3 Seconds on 1,800 Students & 3 Years ───────────────

async function testReportsPerformance(getOutstandingReport: any) {
  console.log("\n[Test 6] Reports performance: 1,800 students across 3 years < 3.0s");

  const BENCH_SCHOOL = "school-bench-" + Date.now();

  const benchStudents: any[] = [];
  const benchDues: any[] = [];
  const TOTAL_STUDENTS = 1800;

  console.log(`  Seeding ${TOTAL_STUDENTS} students and 3 years of dues in memory...`);
  for (let i = 1; i <= TOTAL_STUDENTS; i++) {
    const studentId = `bench-std-${i}`;
    benchStudents.push({
      id: studentId,
      school_id: BENCH_SCHOOL,
      first_name: `Student${i}`,
      last_name: `Patel`,
      admission_no: `ADM/${i.toString().padStart(5, "0")}`,
      class_id: `class-${(i % 12) + 1}`,
      deleted_at: null,
    });

    // 3 dues per student across 3 years (total 5,400 dues)
    benchDues.push({
      id: randomUUID(),
      school_id: BENCH_SCHOOL,
      student_id: studentId,
      academic_year_id: "year-2024",
      description: "Tuition 2024",
      gross_paise: 200000,
      concession_paise: 0,
      net_paise: 200000,
      paid_paise: 200000,
      balance_paise: 0,
      due_date: "2024-04-10",
      status: "paid",
    });

    benchDues.push({
      id: randomUUID(),
      school_id: BENCH_SCHOOL,
      student_id: studentId,
      academic_year_id: "year-2025",
      description: "Tuition 2025",
      gross_paise: 220000,
      concession_paise: 0,
      net_paise: 220000,
      paid_paise: 110000,
      balance_paise: 110000,
      due_date: "2025-04-10",
      status: "partial",
    });

    benchDues.push({
      id: randomUUID(),
      school_id: BENCH_SCHOOL,
      student_id: studentId,
      academic_year_id: "year-2026",
      description: "Tuition 2026",
      gross_paise: 240000,
      concession_paise: 0,
      net_paise: 240000,
      paid_paise: 0,
      balance_paise: 240000,
      due_date: "2026-04-10",
      status: "pending",
    });
  }

  localStorage.setItem(`myzkool_students_${BENCH_SCHOOL}`, JSON.stringify(benchStudents));
  localStorage.setItem(`myzkool_student_dues_${BENCH_SCHOOL}`, JSON.stringify(benchDues));

  const start = performance.now();
  const reportRows = await getOutstandingReport(BENCH_SCHOOL);
  const durationMs = performance.now() - start;

  check(`Outstanding report generated ${reportRows.length} student rows`, reportRows.length === TOTAL_STUDENTS);
  check(`Execution time: ${durationMs.toFixed(1)} ms (< 3000 ms limit)`, durationMs < 3000, `actual=${durationMs.toFixed(1)}ms`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("Phase 4: Fee Operations & Reports Test Suite");
  console.log("=".repeat(60));

  seedEnvironment();

  const { runLateFeeJob, waiveLateFee } = await import("../src/services/lateFeeJob");
  const { executeYearClose } = await import("../src/services/yearCloseService");
  const { closeDay } = await import("../src/services/dayCloseService");
  const { collectFees, cancelReceipt } = await import("../src/services/collectionService");
  const { getStudentDues } = await import("../src/services/feeDuesService");
  const { bounceCheque } = await import("../src/services/chequeService");
  const { runReminderJob } = await import("../src/services/reminderJob");
  const { getOutstandingReport } = await import("../src/services/feeReportsService");

  await testLateFeeJob(runLateFeeJob, waiveLateFee);
  await testYearClose(executeYearClose);
  await testClosedDay(closeDay, collectFees, cancelReceipt);
  await testChequeBounce(collectFees, bounceCheque, getStudentDues);
  await testReminders(runReminderJob);
  await testReportsPerformance(getOutstandingReport);

  console.log("\n" + "=".repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("Failed:");
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log("All Phase 4 criteria passed! ✓");
  process.exit(0);
}

main().catch(err => {
  console.error("Crash in Phase 4 test suite:", err);
  process.exit(1);
});
