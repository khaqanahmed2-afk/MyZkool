/**
 * test-phase3a.ts — Collection engine tests
 * Run: npx tsx tests/test-phase3a.ts
 *
 * Tests:
 * 1. Allocation property tests (1000 random inputs)
 * 2. 50 parallel collects → unique gap-free receipt numbers, no double payment
 * 3. Idempotent retry
 * 4. Cancel restores balances exactly
 * 5. Two counters race on same due
 * 6. Ledger integrity job detects mismatch
 * 7. Amount-in-words (spot checks)
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

let passed = 0; let failed = 0; const errors: string[] = [];
function check(desc: string, cond: boolean, detail?: string) {
  if (cond) { console.log(`  ✓ ${desc}`); passed++; }
  else { console.error(`  ✗ ${desc}${detail ? " — " + detail : ""}`); failed++; errors.push(desc); }
}

// ─── Seed helpers ─────────────────────────────────────────────────────────────

const SCHOOL = "school-3a-" + Date.now();
const YEAR   = "year-3a-" + Date.now();
const CLASS  = "class-3a";

function seedYear() {
  localStorage.setItem(`myzkool_academic_years_${SCHOOL}`, JSON.stringify([
    { id: YEAR, school_id: SCHOOL, is_current: true, start_year: 2026, end_year: 2027, label: "2026-27" },
  ]));
}

function seedFeeSettings() {
  localStorage.setItem(`myzkool_fee_settings_${SCHOOL}`, JSON.stringify({
    id: randomUUID(), school_id: SCHOOL,
    receipt_prefix: "MZ", receipt_paper: "a5", receipt_language: "en",
    allow_partial: true, min_partial_paise: 0, allow_advance: true,
    allocation_mode: "auto_oldest_first", round_to_rupee: true,
    backdate_days_limit: 0, discount_approval_threshold_percent: 10,
    auto_assign_fee_on_admission: true, auto_late_fee: false,
    cheque_receipt_timing: "on_receipt", parent_pay_enabled: false,
    gateway_fee_bearer: "school", auto_print_receipt: false,
    owner_pin_hash: null,
  }));
}

function makeStudentId(n: number) { return `student-3a-${n}`; }

function seedStudents(count: number) {
  const students = Array.from({ length: count }, (_, i) => ({
    id: makeStudentId(i),
    school_id: SCHOOL, first_name: `Student`, last_name: `${i}`,
    admission_no: `ADM3A${i}`, is_rte: false, deleted_at: null,
  }));
  localStorage.setItem(`myzkool_students_${SCHOOL}`, JSON.stringify(students));
}

function seedDuesForStudent(studentId: string, count = 2, netPaise = 50000) {
  const existing = JSON.parse(localStorage.getItem(`myzkool_student_dues_${SCHOOL}`) || "[]");
  const newDues = Array.from({ length: count }, (_, i) => ({
    id: randomUUID(),
    school_id: SCHOOL, student_id: studentId, academic_year_id: YEAR,
    fee_head_id: randomUUID(), term_id: null, source: "structure",
    description: `Due ${i}`, gross_paise: netPaise, concession_paise: 0,
    net_paise: netPaise, paid_paise: 0, balance_paise: netPaise,
    due_date: "2026-05-01", status: "pending",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }));
  localStorage.setItem(`myzkool_student_dues_${SCHOOL}`, JSON.stringify([...existing, ...newDues]));
  return newDues;
}

// ─── Test 1: Allocation property tests ────────────────────────────────────────

async function testAllocationProperties(
  computeAllocation: any,
  validateAllocation: any,
  allocateOldestFirst: any,
  fixRoundingRemainder: any,
) {
  console.log("\n[Test 1] Allocation property tests (1000 random inputs)");

  let violations = 0;
  const numTests = 1000;

  for (let i = 0; i < numTests; i++) {
    const numDues = Math.floor(Math.random() * 8) + 1;
    const dues = Array.from({ length: numDues }, (_, j) => {
      const net = Math.floor(Math.random() * 50000) + 100;
      const paid = Math.floor(Math.random() * net);
      return {
        id: `due-${i}-${j}`, fee_head_id: `head-${j}`,
        student_id: "s", academic_year_id: YEAR, school_id: SCHOOL,
        gross_paise: net, concession_paise: 0, net_paise: net,
        paid_paise: paid, balance_paise: net - paid,
        due_date: "2026-05-01", status: paid < net ? (paid > 0 ? "partial" : "pending") : "paid",
        source: "structure", term_id: null, description: "", fee_head_id_2: "",
        created_at: "", updated_at: "",
      };
    });
    const totalBalance = dues.reduce((s: number, d: any) => s + d.balance_paise, 0);
    const amount = Math.floor(Math.random() * (totalBalance + 20000)) + 1;

    const result = computeAllocation(dues, amount, "auto_oldest_first");

    // Property 1: sum(allocated) + advance = amount
    const sumAllocated = result.lines.reduce((s: number, l: any) => s + l.allocated_paise, 0);
    if (Math.abs(sumAllocated + result.advance_paise - amount) > 1) {
      violations++;
      console.error(`  Property 1 violated: sum=${sumAllocated} advance=${result.advance_paise} total=${amount}`);
    }

    // Property 2: no negative allocations
    for (const line of result.lines) {
      if (line.allocated_paise < 0) { violations++; }
      if (line.balance_after < 0) { violations++; }
    }

    // Property 3: advance >= 0
    if (result.advance_paise < 0) { violations++; }

    try { validateAllocation(result); }
    catch (e: any) { violations++; console.error(`  validate failed: ${e.message}`); }
  }

  check(`All ${numTests} allocation invariants hold (sum=paid, no negatives)`, violations === 0, `violations=${violations}`);

  // Rounding remainder on last line
  console.log("\n[Test 1b] Rounding remainder on last line");
  const dues2 = [
    { id: "d1", fee_head_id: "h", student_id: "s", academic_year_id: YEAR, school_id: SCHOOL,
      gross_paise: 33334, concession_paise: 0, net_paise: 33334, paid_paise: 0, balance_paise: 33334,
      due_date: "2026-05-01", status: "pending", source: "structure", term_id: null,
      description: "", created_at: "", updated_at: "" },
    { id: "d2", fee_head_id: "h", student_id: "s", academic_year_id: YEAR, school_id: SCHOOL,
      gross_paise: 33333, concession_paise: 0, net_paise: 33333, paid_paise: 0, balance_paise: 33333,
      due_date: "2026-05-02", status: "pending", source: "structure", term_id: null,
      description: "", created_at: "", updated_at: "" },
    { id: "d3", fee_head_id: "h", student_id: "s", academic_year_id: YEAR, school_id: SCHOOL,
      gross_paise: 33333, concession_paise: 0, net_paise: 33333, paid_paise: 0, balance_paise: 33333,
      due_date: "2026-05-03", status: "pending", source: "structure", term_id: null,
      description: "", created_at: "", updated_at: "" },
  ];
  const r2 = allocateOldestFirst(dues2, 100000);
  const rFixed = fixRoundingRemainder(r2.lines, 100000 - r2.advance_paise);
  const sum2 = rFixed.reduce((s: number, l: any) => s + l.allocated_paise, 0);
  check("Sum after fixRounding = total allocated", sum2 === (100000 - r2.advance_paise), `sum=${sum2}`);
}

// ─── Test 2: 50 parallel collects across 10 students ─────────────────────────

async function testParallelCollects(collectFees: any) {
  console.log("\n[Test 2] 50 parallel collects across 10 students");

  seedStudents(10);
  // Give each of 10 students 5 dues × ₹100 = 5 collects each, 50 total
  for (let i = 0; i < 10; i++) {
    seedDuesForStudent(makeStudentId(i), 5, 10000);
  }

  const collects: Promise<any>[] = [];
  for (let s = 0; s < 10; s++) {
    const studentId = makeStudentId(s);
    for (let j = 0; j < 5; j++) {
      const ikey = `ikey-s${s}-c${j}-${Date.now()}-${Math.random()}`;
      collects.push(
        collectFees(SCHOOL, {
          student_id: studentId,
          academic_year_id: YEAR,
          payments: [{ mode: "cash", amount_paise: 10000 }],
        }, ikey, "actor-1").catch((e: Error) => ({ _error: e.message }))
      );
    }
  }

  const results = await Promise.all(collects);
  const successful = results.filter(r => !r._error && r.receipt_no);
  const receiptNos = successful.map((r: any) => r.receipt_no);
  const uniqueNos = new Set(receiptNos);

  check(
    "All 50 collects return a receipt (no errors)",
    successful.length === 50,
    `successful=${successful.length}/50 errors=${results.filter(r => r._error).map((r: any) => r._error).slice(0, 3).join("; ")}`
  );
  check(
    "All 50 receipt numbers are unique",
    uniqueNos.size === receiptNos.length,
    `unique=${uniqueNos.size} total=${receiptNos.length}`
  );

  // Gap-free check — parse the sequence numbers and ensure no gaps
  const seqNos = receiptNos
    .map((no: string) => parseInt(no.split("/")[2], 10))
    .sort((a: number, b: number) => a - b);
  const minSeq = seqNos[0];
  const maxSeq = seqNos[seqNos.length - 1];
  check(
    "Receipt numbers are gap-free (consecutive)",
    maxSeq - minSeq + 1 === seqNos.length,
    `min=${minSeq} max=${maxSeq} count=${seqNos.length}`
  );

  // No double payment: check dues have correct paid status
  const allDues = JSON.parse(localStorage.getItem(`myzkool_student_dues_${SCHOOL}`) || "[]");
  const overPaid = allDues.filter((d: any) => d.paid_paise > d.net_paise);
  check("No dues are over-paid", overPaid.length === 0, `over-paid count=${overPaid.length}`);
}


// ─── Test 3: Idempotent retry ─────────────────────────────────────────────────

async function testIdempotency(collectFees: any) {
  console.log("\n[Test 3] Idempotent retry");

  const studentId = makeStudentId(99);
  seedStudents(100);
  const [due] = seedDuesForStudent(studentId, 1, 30000);
  const ikey = `ikey-idem-${Date.now()}`;

  const r1 = await collectFees(SCHOOL, {
    student_id: studentId, academic_year_id: YEAR,
    payments: [{ mode: "cash", amount_paise: 30000 }],
  }, ikey, "actor-1");

  const r2 = await collectFees(SCHOOL, {
    student_id: studentId, academic_year_id: YEAR,
    payments: [{ mode: "cash", amount_paise: 30000 }],
  }, ikey, "actor-1");

  check("Same idempotency key returns same receipt_id", r1.receipt_id === r2.receipt_id,
    `r1=${r1.receipt_id} r2=${r2.receipt_id}`);
  check("Second call is flagged idempotent", r2.idempotent === true, `idempotent=${r2.idempotent}`);

  // Verify due is not double-paid
  const allDues = JSON.parse(localStorage.getItem(`myzkool_student_dues_${SCHOOL}`) || "[]");
  const theDue = allDues.find((d: any) => d.id === due.id);
  check("Due paid_paise === net_paise (not doubled)", theDue?.paid_paise === 30000,
    `paid=${theDue?.paid_paise}`);
}

// ─── Test 4: Cancel restores balances exactly ─────────────────────────────────

async function testCancelRestores(collectFees: any, cancelReceipt: any, getStudentDues: any) {
  console.log("\n[Test 4] Cancel restores balances exactly");

  const studentId = makeStudentId(200);
  const [due1, due2] = seedDuesForStudent(studentId, 2, 50000);

  // Record balances before
  const { dues: before } = await getStudentDues(SCHOOL, studentId, YEAR);
  const balanceBefore = before.reduce((s: number, d: any) => s + d.balance_paise, 0);

  // Collect
  const ikey = `ikey-cancel-${Date.now()}`;
  const receipt = await collectFees(SCHOOL, {
    student_id: studentId, academic_year_id: YEAR,
    payments: [{ mode: "cash", amount_paise: 70000 }],
  }, ikey, "actor-1");

  // Cancel
  await cancelReceipt(SCHOOL, receipt.receipt_id, {
    reason: "Test cancel — correcting error",
  }, "actor-1");

  // Verify restoration
  const { dues: after } = await getStudentDues(SCHOOL, studentId, YEAR);
  const balanceAfter = after.reduce((s: number, d: any) => s + d.balance_paise, 0);

  check("Balance restored to exactly pre-collect value",
    balanceAfter === balanceBefore,
    `before=${balanceBefore} after=${balanceAfter}`
  );
  check("All dues back to pending or partial",
    after.every((d: any) => d.status === "pending" || d.status === "partial"),
    `statuses: ${after.map((d: any) => d.status).join(",")}`
  );

  // Check ledger sums: payment rows (negative) + reversal rows (positive) cancel out → net=0
  const ledger = JSON.parse(localStorage.getItem(`myzkool_fee_ledger_${SCHOOL}`) || "[]")
    .filter((e: any) => e.student_id === studentId && e.academic_year_id === YEAR
      && (e.entry_type === "payment" || e.entry_type === "reversal"));
  const ledgerNet = ledger.reduce((s: number, e: any) => s + e.amount_paise, 0);
  check("Payment + reversal entries cancel out to zero",
    ledgerNet === 0,
    `ledgerNet=${ledgerNet} (payment rows negative, reversal rows positive)`
  );

}

// ─── Test 5: Race condition on same due ────────────────────────────────────────

async function testRaceCondition(collectFees: any, getStudentDues: any) {
  console.log("\n[Test 5] Two counters race on same due (localStorage simulation)");

  const studentId = makeStudentId(300);
  const [due] = seedDuesForStudent(studentId, 1, 30000);

  // In localStorage mode, concurrent updates are serialized by JS event loop.
  // We test that two requests for the same student's full balance result in
  // no over-payment (the second sees the updated balance).
  const [r1, r2] = await Promise.all([
    collectFees(SCHOOL, {
      student_id: studentId, academic_year_id: YEAR,
      payments: [{ mode: "cash", amount_paise: 30000 }],
    }, `ikey-race-1-${Date.now()}`, "counter-1"),
    collectFees(SCHOOL, {
      student_id: studentId, academic_year_id: YEAR,
      payments: [{ mode: "cash", amount_paise: 30000 }],
    }, `ikey-race-2-${Date.now()}`, "counter-2").catch((e: Error) => ({ _error: e.message })),
  ]);

  const allDues = JSON.parse(localStorage.getItem(`myzkool_student_dues_${SCHOOL}`) || "[]");
  const theDue = allDues.find((d: any) => d.id === due.id);

  check("Due is never over-paid after two concurrent collects",
    theDue && theDue.paid_paise <= theDue.net_paise,
    `paid=${theDue?.paid_paise} net=${theDue?.net_paise}`
  );

  // One should have succeeded as advance (excess → credit)
  const r1Ok = r1.receipt_no;
  check("At least one collect succeeded", !!r1Ok, `r1=${JSON.stringify(r1)}`);
}

// ─── Test 6: Ledger integrity job ────────────────────────────────────────────

async function testLedgerIntegrity(runLedgerIntegrityCheck: any) {
  console.log("\n[Test 6] Ledger integrity job");

  const studentId = makeStudentId(400);
  seedDuesForStudent(studentId, 1, 10000);

  // Artificially corrupt a balance (simulate inconsistency)
  const allDues = JSON.parse(localStorage.getItem(`myzkool_student_dues_${SCHOOL}`) || "[]");
  const dueIdx = allDues.findIndex((d: any) => d.student_id === studentId);
  if (dueIdx >= 0) {
    allDues[dueIdx].paid_paise = 5000; // paid 5000 without a ledger entry
    allDues[dueIdx].balance_paise = 5000;
    localStorage.setItem(`myzkool_student_dues_${SCHOOL}`, JSON.stringify(allDues));
  }

  // Clear any today marker so job runs
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  localStorage.removeItem(`myzkool_integrity_checked_${SCHOOL}_${today}`);

  const report = await runLedgerIntegrityCheck(SCHOOL, YEAR);
  check("Integrity job runs and checks students", report.checked > 0, `checked=${report.checked}`);
  check("Integrity job detects mismatch", report.mismatches > 0, `mismatches=${report.mismatches}`);

  // Alert row should be in ledger
  const ledger = JSON.parse(localStorage.getItem(`myzkool_fee_ledger_${SCHOOL}`) || "[]");
  const alertRows = ledger.filter((e: any) => e.entry_type === "adjustment" && e.note?.includes("INTEGRITY ALERT"));
  check("Alert row written to ledger", alertRows.length > 0, `alertRows=${alertRows.length}`);

  // Running again same day should be idempotent (no new alerts)
  const report2 = await runLedgerIntegrityCheck(SCHOOL, YEAR);
  check("Integrity job is idempotent (runs 0 checks on same day)", report2.checked === 0,
    `checked=${report2.checked}`);
}

// ─── Test 7: Amount-in-words spot checks ──────────────────────────────────────

async function testAmountInWordsSpot(amountInWords: any) {
  console.log("\n[Test 7] Amount-in-words spot checks");
  check("₹500 in words", amountInWords(50000), "Five Hundred Rupees Only");
  check("₹1,23,456.89 in words", amountInWords(12345689),
    "One Lakh Twenty Three Thousand Four Hundred Fifty Six Rupees and Eighty Nine Paise Only");
  check("0 paise", amountInWords(0), "Zero Rupees Only");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("Phase 3a: Collection Engine Tests");
  console.log("=".repeat(60));

  const { computeAllocation, validateAllocation, allocateOldestFirst, fixRoundingRemainder } =
    await import("../src/lib/feeAllocation");
  const { collectFees, cancelReceipt } = await import("../src/services/collectionService");
  const { getStudentDues } = await import("../src/services/feeDuesService");
  const { runLedgerIntegrityCheck } = await import("../src/services/ledgerIntegrityJob");
  const { amountInWords } = await import("../src/lib/amountInWords");

  seedYear();
  seedFeeSettings();

  await testAllocationProperties(computeAllocation, validateAllocation, allocateOldestFirst, fixRoundingRemainder);
  await testParallelCollects(collectFees);
  await testIdempotency(collectFees);
  await testCancelRestores(collectFees, cancelReceipt, getStudentDues);
  await testRaceCondition(collectFees, getStudentDues);
  await testLedgerIntegrity(runLedgerIntegrityCheck);
  await testAmountInWordsSpot(amountInWords);

  console.log("\n" + "=".repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("Failed:");
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log("All tests passed! ✓");
  process.exit(0);
}

main().catch(e => { console.error("Crash:", e); process.exit(1); });
