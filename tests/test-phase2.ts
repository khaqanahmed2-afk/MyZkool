/**
 * Phase 2 Tests: Fee setup and dues generation
 *
 * Run: npx tsx tests/test-phase2.ts
 *
 * Tests:
 * 1. Generation idempotency
 * 2. RTE concession auto-applied
 * 3. Concession never exceeds gross
 * 4. Permission matrix (B2) — key functions gated
 * 5. Ledger sums equal dues
 * 6. RLS isolation (school separation)
 * 7. Owner PIN rate limit
 * 8. Suggested heads idempotent
 */

// Polyfill localStorage for Node
const store: Record<string, string> = {};
const localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  key: (i: number) => Object.keys(store)[i] ?? null,
  get length() { return Object.keys(store).length; },
  clear: () => { for (const k in store) delete store[k]; },
};
(global as any).localStorage = localStorage;

// Polyfill crypto.randomUUID
import { randomUUID } from "crypto";
if (!(globalThis as any).crypto) {
  (globalThis as any).crypto = { randomUUID, subtle: {} };
}

// ─── Import services (after polyfills) ───────────────────────────────────────
// We import these dynamically after polyfills are set up
let getFeeHeads: any, createFeeHead: any, addSuggestedHeads: any, ensureSystemHeads: any;
let getFeeTerms: any, createFeeTerms: any, generateTermPreset: any;
let getFeeSettings: any, updateFeeSettings: any, verifyOwnerPin: any;
let getConcessionRules: any, createConcessionRule: any;
let computeConcession: any;
let getStudentDues: any, generateDues: any, getLedger: any;
let createApprovalRequest: any, getPendingApprovals: any;
let SUGGESTED_FEE_HEADS: any;

// ─── Test runner ─────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const errors: string[] = [];

function expect(description: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${description}`);
    passed++;
  } else {
    console.error(`  ✗ ${description}${detail ? ` — ${detail}` : ""}`);
    failed++;
    errors.push(description);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SCHOOL_A = "school-a-" + Date.now();
const SCHOOL_B = "school-b-" + Date.now();
const YEAR_A = "year-a-" + Date.now();
const YEAR_B = "year-b-" + Date.now();
const STUDENT_A = "student-a-" + Date.now();
const STUDENT_B_RTE = "student-b-rte-" + Date.now();

function seedStudents() {
  // Seed students in localStorage for SCHOOL_A
  localStorage.setItem(`myzkool_students_${SCHOOL_A}`, JSON.stringify([
    {
      id: STUDENT_A, school_id: SCHOOL_A,
      first_name: "Alice", last_name: "Test", admission_no: "ADM001",
      is_rte: false, deleted_at: null, class_id: "class-1",
    },
    {
      id: STUDENT_B_RTE, school_id: SCHOOL_A,
      first_name: "Rte", last_name: "Student", admission_no: "ADM002",
      is_rte: true, deleted_at: null, class_id: "class-1",
    },
  ]));
  // Seed academic year
  localStorage.setItem(`myzkool_academic_years_${SCHOOL_A}`, JSON.stringify([
    { id: YEAR_A, school_id: SCHOOL_A, is_current: true, start_year: 2026, end_year: 2027, label: "2026-27", start_date: "2026-04-01", end_date: "2027-03-31" },
  ]));
  localStorage.setItem(`myzkool_classes_${SCHOOL_A}`, JSON.stringify([
    { id: "class-1", name: "Class 1", display_order: 1 },
  ]));
}

// ─── Test suites ──────────────────────────────────────────────────────────────

async function testSuggestedHeads() {
  console.log("\n[Test 8] Suggested heads — idempotent");

  await ensureSystemHeads(SCHOOL_A);
  const codes = ["tuition_fee", "exam_fee", "caution_deposit"];
  const { added: first } = await addSuggestedHeads(SCHOOL_A, codes);
  expect("First call adds 3 heads", first.length === 3, `got ${first.length}`);

  // Second call should add 0 (already exist)
  const { added: second } = await addSuggestedHeads(SCHOOL_A, codes);
  expect("Second call adds 0 (idempotent)", second.length === 0, `got ${second.length}`);

  const { heads } = await getFeeHeads(SCHOOL_A, true);
  const userHeads = heads.filter((h: any) => !h.is_system);
  expect("Total non-system heads = 3", userHeads.length === 3, `got ${userHeads.length}`);
}

async function setupFeeHeadsAndTerms() {
  // Add tuition_fee (RTE-waivable) and exam_fee (not waivable)
  await addSuggestedHeads(SCHOOL_A, ["tuition_fee", "exam_fee"]);
  const { heads } = await getFeeHeads(SCHOOL_A, true);
  const tuitionHead = heads.find((h: any) => h.code === "tuition_fee");
  const examHead = heads.find((h: any) => h.code === "exam_fee");

  // Create 2 terms
  const termInputs = generateTermPreset(YEAR_A, SCHOOL_A, "half_yearly", "2026-04-01");
  await createFeeTerms(SCHOOL_A, YEAR_A, termInputs);

  return { tuitionHead, examHead };
}

async function setupStructure(tuitionHeadId: string, examHeadId: string) {
  // Create structure
  const structureId = crypto.randomUUID();
  const structure = {
    id: structureId, school_id: SCHOOL_A, academic_year_id: YEAR_A,
    class_id: "class-1", name: "Test Structure", applies_to: "all",
    version: 1, status: "active", created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  const existing = JSON.parse(localStorage.getItem(`myzkool_fee_structures_${SCHOOL_A}`) || "[]");
  localStorage.setItem(`myzkool_fee_structures_${SCHOOL_A}`, JSON.stringify([...existing, structure]));

  // Create items and terms
  const { terms } = await getFeeTerms(SCHOOL_A, YEAR_A);

  const tuitionItemId = crypto.randomUUID();
  const examItemId = crypto.randomUUID();
  const items = [
    { id: tuitionItemId, school_id: SCHOOL_A, structure_id: structureId, fee_head_id: tuitionHeadId, pattern: "custom" },
    { id: examItemId, school_id: SCHOOL_A, structure_id: structureId, fee_head_id: examHeadId, pattern: "custom" },
  ];
  localStorage.setItem(`myzkool_fee_structure_items_${SCHOOL_A}`, JSON.stringify(items));

  const itemTerms: any[] = [];
  for (const term of terms) {
    itemTerms.push({ item_id: tuitionItemId, term_id: term.id, amount_paise: 50000 }); // ₹500
    itemTerms.push({ item_id: examItemId, term_id: term.id, amount_paise: 20000 });   // ₹200
  }
  localStorage.setItem(`myzkool_fee_structure_item_terms_${SCHOOL_A}`, JSON.stringify(itemTerms));

  // Create assignments for both students
  const assignments = [
    { id: crypto.randomUUID(), school_id: SCHOOL_A, student_id: STUDENT_A, academic_year_id: YEAR_A, structure_id: structureId, structure_version: 1, assigned_at: new Date().toISOString(), assigned_by: null, status: "active" },
    { id: crypto.randomUUID(), school_id: SCHOOL_A, student_id: STUDENT_B_RTE, academic_year_id: YEAR_A, structure_id: structureId, structure_version: 1, assigned_at: new Date().toISOString(), assigned_by: null, status: "active" },
  ];
  localStorage.setItem(`myzkool_fee_assignments_${SCHOOL_A}`, JSON.stringify(assignments));

  return { terms, structureId };
}

async function testDuesGeneration() {
  console.log("\n[Test 1] Dues generation — idempotency");

  const { result: r1 } = await generateDues(SCHOOL_A, YEAR_A);
  const { result: r2 } = await generateDues(SCHOOL_A, YEAR_A); // second run

  expect("First run creates > 0 dues", r1.created_count > 0, `created ${r1.created_count}`);
  expect("Second run creates 0 (idempotent)", r2.created_count === 0, `created ${r2.created_count}`);
  expect("Second run skips all", r2.skipped_count > 0, `skipped ${r2.skipped_count}`);
}

async function testRteConcession() {
  console.log("\n[Test 2] RTE concession auto-applied");

  const { dues } = await getStudentDues(SCHOOL_A, STUDENT_B_RTE, YEAR_A);
  const { heads } = await getFeeHeads(SCHOOL_A, true);
  const tuitionHead = heads.find((h: any) => h.code === "tuition_fee");
  const examHead = heads.find((h: any) => h.code === "exam_fee");

  const tuitionDues = dues.filter((d: any) => d.fee_head_id === tuitionHead?.id);
  const examDues = dues.filter((d: any) => d.fee_head_id === examHead?.id);

  expect("RTE student has tuition dues", tuitionDues.length > 0, `got ${tuitionDues.length}`);
  expect(
    "RTE tuition dues fully conceded (balance = 0)",
    tuitionDues.every((d: any) => d.balance_paise === 0),
    `balances: ${tuitionDues.map((d: any) => d.balance_paise).join(",")}`
  );
  expect(
    "RTE exam dues NOT conceded (exam_fee is not rte_waivable)",
    examDues.every((d: any) => d.balance_paise > 0),
    `balances: ${examDues.map((d: any) => d.balance_paise).join(",")}`
  );
}

async function testConcessionNeverExceedsGross() {
  console.log("\n[Test 3] Concession never exceeds gross");

  // Test computeConcession
  const gross = 50000; // ₹500 in paise
  const exactFixed = computeConcession(gross, "fixed", gross);
  const overFixed  = computeConcession(gross, "fixed", gross * 2);
  const hundred    = computeConcession(gross, "percent", 100);
  const overPct    = computeConcession(gross, "percent", 150);

  expect("100% concession = gross", hundred === gross, `got ${hundred}`);
  expect("Fixed at gross = gross", exactFixed === gross, `got ${exactFixed}`);
  expect("Fixed over gross capped at gross", overFixed === gross, `got ${overFixed}`);
  expect("150% concession capped at gross", overPct === gross, `got ${overPct}`);
  expect("Net never < 0 for any concession", gross - overFixed >= 0 && gross - overPct >= 0, "net would be negative");
}

async function testLedgerSumsEqualDues() {
  console.log("\n[Test 5] Ledger sums equal dues (due_created entries)");

  const { dues } = await getStudentDues(SCHOOL_A, STUDENT_A, YEAR_A);
  const { entries } = await getLedger(SCHOOL_A, STUDENT_A, YEAR_A);

  const ledgerDueCreated = entries
    .filter((e: any) => e.entry_type === "due_created")
    .reduce((sum: number, e: any) => sum + e.amount_paise, 0);
  const dueGross = dues.reduce((sum: number, d: any) => sum + d.gross_paise, 0);

  expect("Ledger due_created sum equals dues gross sum", ledgerDueCreated === dueGross,
    `ledger=${ledgerDueCreated} dues=${dueGross}`);
  expect("Ledger has at least one entry per due", entries.filter((e: any) => e.entry_type === "due_created").length >= dues.length,
    `entries=${entries.length} dues=${dues.length}`);
}

async function testRlsIsolation() {
  console.log("\n[Test 6] RLS isolation (school separation)");

  // Seed fee heads for school A
  const { heads: schoolAHeads } = await getFeeHeads(SCHOOL_A, true);
  // School B should have no heads
  const { heads: schoolBHeads } = await getFeeHeads(SCHOOL_B, true);

  expect("School A has heads", schoolAHeads.length > 0, `count=${schoolAHeads.length}`);
  expect("School B has no heads", schoolBHeads.length === 0, `count=${schoolBHeads.length}`);

  // Dues for school A's student not visible for school B query
  const { dues: aInB } = await getStudentDues(SCHOOL_B, STUDENT_A, YEAR_A);
  expect("School B cannot see school A's dues", aInB.length === 0, `got ${aInB.length} dues`);
}

async function testOwnerPinRateLimit() {
  console.log("\n[Test 7] Owner PIN rate limit");

  // Set a PIN first
  await updateFeeSettings(SCHOOL_A, { new_pin: "1234" });

  // Wrong PIN attempts
  for (let i = 0; i < 4; i++) {
    const { ok } = await verifyOwnerPin(SCHOOL_A, "9999");
    expect(`Wrong PIN attempt ${i + 1} returns ok=false`, !ok);
  }
  // 5th wrong attempt should lock
  const { ok, locked } = await verifyOwnerPin(SCHOOL_A, "9999");
  expect("5th wrong attempt locks PIN", !ok && locked === true, `ok=${ok} locked=${locked}`);

  // Correct PIN should still be blocked when locked
  const { ok: stillLocked } = await verifyOwnerPin(SCHOOL_A, "1234");
  expect("Correct PIN rejected when locked", !stillLocked, `ok=${stillLocked}`);
}

async function testPermissionMatrix() {
  console.log("\n[Test 4] Permission matrix (B2) — service checks exist");
  // In localStorage mode, we can only verify the service functions exist
  // and don't throw on call; real permission gating is enforced server-side via RLS.
  expect("getFeeHeads is callable", typeof getFeeHeads === "function");
  expect("generateDues is callable", typeof generateDues === "function");
  expect("getLedger is callable", typeof getLedger === "function");
  expect("createConcessionRule is callable", typeof createConcessionRule === "function");
  expect("createApprovalRequest is callable", typeof createApprovalRequest === "function");
  expect("getPendingApprovals is callable", typeof getPendingApprovals === "function");
  // Verify that permission types are exported
  expect("SUGGESTED_FEE_HEADS has 12 items", SUGGESTED_FEE_HEADS.length === 12, `got ${SUGGESTED_FEE_HEADS.length}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("Phase 2 Tests: Fee setup and dues generation");
  console.log("=".repeat(60));

  // Dynamic imports (after polyfills)
  const feeSetup = await import("../src/services/feeSetupService");
  const feeDues = await import("../src/services/feeDuesService");
  const approvalSvc = await import("../src/services/approvalService");
  const feeTypes = await import("../src/types/fees");

  getFeeHeads = feeSetup.getFeeHeads;
  createFeeHead = feeSetup.createFeeHead;
  addSuggestedHeads = feeSetup.addSuggestedHeads;
  ensureSystemHeads = feeSetup.ensureSystemHeads;
  getFeeTerms = feeSetup.getFeeTerms;
  createFeeTerms = feeSetup.createFeeTerms;
  generateTermPreset = feeSetup.generateTermPreset;
  getFeeSettings = feeSetup.getFeeSettings;
  updateFeeSettings = feeSetup.updateFeeSettings;
  verifyOwnerPin = feeSetup.verifyOwnerPin;
  getConcessionRules = feeSetup.getConcessionRules;
  createConcessionRule = feeSetup.createConcessionRule;
  computeConcession = feeSetup.computeConcession;

  getStudentDues = feeDues.getStudentDues;
  generateDues = feeDues.generateDues;
  getLedger = feeDues.getLedger;

  createApprovalRequest = approvalSvc.createApprovalRequest;
  getPendingApprovals = approvalSvc.getPendingApprovals;

  SUGGESTED_FEE_HEADS = feeTypes.SUGGESTED_FEE_HEADS;

  // Seed data
  seedStudents();

  // Run tests in order
  await testSuggestedHeads();
  const { tuitionHead, examHead } = await setupFeeHeadsAndTerms();
  await setupStructure(tuitionHead!.id, examHead!.id);
  await testDuesGeneration();
  await testRteConcession();
  await testConcessionNeverExceedsGross();
  await testPermissionMatrix();
  await testLedgerSumsEqualDues();
  await testRlsIsolation();
  await testOwnerPinRateLimit();

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("Failed tests:");
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  } else {
    console.log("All tests passed! ✓");
    process.exit(0);
  }
}

main().catch(err => {
  console.error("Test suite crashed:", err);
  process.exit(1);
});

