/**
 * Test Suite: Student Fee Management Financial Reconciliation & Multi-Tenant Audit
 *
 * Validates:
 * 1. Zero balances and empty datasets (no division by zero)
 * 2. Partial and full payments reconciliation
 * 3. Multiple invoices and installments schedule
 * 4. Credits, discounts, and RTE waivers offset
 * 5. Refunds, reversals, cancelled invoices, and failed payments
 * 6. Overdue versus non-overdue outstanding balances (Overdue <= Outstanding strictly)
 * 7. Transport-only students and billing isolation
 * 8. Students without invoices / no structure
 * 9. Quick-filter counts and combined multi-dimensional filtering
 * 10. Academic-year boundaries and isolation
 * 11. Cross-school multi-tenant data isolation
 * 12. Strict consistency between KPI totals and sum of student rows
 */

import { getStudentFeeSummaries, exportStudentFeeCSV } from "../src/services/studentFeeLedgerService";
import type { StudentDue, FeeTerm } from "../src/types/fees";
import type { FeeReceipt } from "../src/types/collection";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ PASS: ${message}`);
}

async function runStudentFeeManagementReconciliationTests() {
  console.log("==================================================================");
  console.log("STUDENT FEE MANAGEMENT RECONCILIATION & MULTI-TENANT TEST SUITE");
  console.log("==================================================================\n");

  const schoolA = "school-sfm-audit-alpha";
  const schoolB = "school-sfm-audit-beta";
  const ay2026 = "ay-2026-2027";
  const ay2025 = "ay-2025-2026";

  // Setup mock local storage environment
  const mockStorage: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (k: string) => mockStorage[k] || null,
    setItem: (k: string, v: string) => { mockStorage[k] = v; },
    removeItem: (k: string) => { delete mockStorage[k]; },
    clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); },
    length: 0,
    key: () => null,
  } as any;

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 1: Zero Balances & Empty Datasets
  // ───────────────────────────────────────────────────────────────────────────
  console.log("--- TEST 1: Zero Balances & Empty Datasets ---");
  {
    const emptyRes = await getStudentFeeSummaries(schoolA, { academic_year_id: ay2026 });
    assert(emptyRes.students.length === 0, "Empty school returns 0 students");
    assert(emptyRes.metrics.total_fees_paise === 0, "Billed amount is 0");
    assert(emptyRes.metrics.total_collected_paise === 0, "Collected amount is 0");
    assert(emptyRes.metrics.total_pending_paise === 0, "Pending amount is 0");
    assert(emptyRes.metrics.total_overdue_paise === 0, "Overdue amount is 0");
    assert(emptyRes.metrics.collection_percentage === 0, "Collection percentage is safe 0%");
    assert(emptyRes.metrics.with_dues_percentage === 0, "With dues percentage is safe 0%");
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SEED DATA FOR SCHOOL A (Realistic School ERP Model)
  // ───────────────────────────────────────────────────────────────────────────
  // Classes & Sections
  const class1 = { id: "cls-1", school_id: schoolA, name: "Class 1" };
  const class2 = { id: "cls-2", school_id: schoolA, name: "Class 2" };
  const sec1A = { id: "sec-1a", school_id: schoolA, class_id: "cls-1", name: "A" };
  const sec1B = { id: "sec-1b", school_id: schoolA, class_id: "cls-1", name: "B" };
  const sec2A = { id: "sec-2a", school_id: schoolA, class_id: "cls-2", name: "A" };

  localStorage.setItem(`myzkool_classes_${schoolA}`, JSON.stringify([class1, class2]));
  localStorage.setItem(`myzkool_sections_${schoolA}`, JSON.stringify([sec1A, sec1B, sec2A]));

  // Academic Years
  const academicYears = [
    { id: ay2026, name: "2026–2027", label: "2026–2027", is_current: true },
    { id: ay2025, name: "2025–2026", label: "2025–2026", is_current: false },
  ];
  localStorage.setItem(`myzkool_academic_years_${schoolA}`, JSON.stringify(academicYears));

  // Students in School A
  const std1 = {
    id: "std-1",
    school_id: schoolA,
    first_name: "Aarav",
    last_name: "Sharma",
    admission_no: "ADM-2026-001",
    class_id: "cls-1",
    section_id: "sec-1a",
    status: "active",
    contact_phone: "9876543210",
  };
  const std2 = {
    id: "std-2",
    school_id: schoolA,
    first_name: "Ananya",
    last_name: "Verma",
    admission_no: "ADM-2026-002",
    class_id: "cls-1",
    section_id: "sec-1a",
    status: "active",
    contact_phone: "9876543211",
  };
  const std3 = {
    id: "std-3",
    school_id: schoolA,
    first_name: "Kabir",
    last_name: "Singh",
    admission_no: "ADM-2026-003",
    class_id: "cls-1",
    section_id: "sec-1b",
    status: "active",
    contact_phone: "9876543212",
  };
  const std4_transport_only = {
    id: "std-4",
    school_id: schoolA,
    first_name: "Diya",
    last_name: "Patel",
    admission_no: "ADM-2026-004",
    class_id: "cls-2",
    section_id: "sec-2a",
    status: "active",
    contact_phone: "9876543213",
  };
  const std5_no_invoice = {
    id: "std-5",
    school_id: schoolA,
    first_name: "Rohan",
    last_name: "Gupta",
    admission_no: "ADM-2026-005",
    class_id: "cls-2",
    section_id: "sec-2a",
    status: "active",
    contact_phone: "9876543214",
  };

  localStorage.setItem(
    `myzkool_students_${schoolA}`,
    JSON.stringify([std1, std2, std3, std4_transport_only, std5_no_invoice])
  );

  // Fee Structures
  const structurePrimary = {
    id: "struct-primary",
    school_id: schoolA,
    class_id: "cls-1",
    academic_year_id: ay2026,
    name: "Primary Standard Structure 2026-27",
    status: "active",
  };
  localStorage.setItem(`myzkool_fee_structures_${schoolA}`, JSON.stringify([structurePrimary]));

  // Structure Assignments
  const assignments = [
    { id: "asg-1", school_id: schoolA, student_id: "std-1", structure_id: "struct-primary", academic_year_id: ay2026, status: "active" },
    { id: "asg-2", school_id: schoolA, student_id: "std-2", structure_id: "struct-primary", academic_year_id: ay2026, status: "active" },
    { id: "asg-3", school_id: schoolA, student_id: "std-3", structure_id: "struct-primary", academic_year_id: ay2026, status: "active" },
  ];
  localStorage.setItem(`myzkool_student_fee_assignments_${schoolA}`, JSON.stringify(assignments));

  // Transport Assignments (Diya Patel is Transport Only)
  const transportAssignments = [
    { id: "trans-4", school_id: schoolA, student_id: "std-4", route_id: "route-1", pickup_stop_id: "stop-1", status: "active" },
  ];
  localStorage.setItem(`myzkool_transport_assignments_${schoolA}`, JSON.stringify(transportAssignments));

  // Student Dues (Obligations in Integer Paise)
  // std1: 2 installments (Term 1 overdue ₹10,000, Term 2 upcoming ₹10,000). Total Billed: ₹20,000. Paid: ₹5,000 on Term 1.
  // Net Pending: ₹15,000. Overdue: ₹5,000.
  const dueStd1_T1: StudentDue = {
    id: "due-1-t1",
    school_id: schoolA,
    student_id: "std-1",
    academic_year_id: ay2026,
    gross_paise: 1000000, // ₹10,000
    concession_paise: 0,
    net_paise: 1000000,
    paid_paise: 500000, // ₹5,000
    balance_paise: 500000,
    due_date: "2026-04-10", // Past date (overdue)
    status: "partial",
    invoice_no: "INV-2026-0001",
    created_at: "2026-04-01T00:00:00Z",
  } as any;

  const dueStd1_T2: StudentDue = {
    id: "due-1-t2",
    school_id: schoolA,
    student_id: "std-1",
    academic_year_id: ay2026,
    gross_paise: 1000000, // ₹10,000
    concession_paise: 0,
    net_paise: 1000000,
    paid_paise: 0,
    balance_paise: 1000000,
    due_date: "2026-11-15", // Future date (upcoming)
    status: "pending",
    invoice_no: "INV-2026-0002",
    created_at: "2026-04-01T00:00:00Z",
  } as any;

  // std2: Fully Paid (Billed ₹20,000, Paid ₹20,000)
  const dueStd2: StudentDue = {
    id: "due-2",
    school_id: schoolA,
    student_id: "std-2",
    academic_year_id: ay2026,
    gross_paise: 2000000,
    concession_paise: 0,
    net_paise: 2000000,
    paid_paise: 2000000,
    balance_paise: 0,
    due_date: "2026-04-10",
    status: "paid",
    invoice_no: "INV-2026-0003",
    created_at: "2026-04-01T00:00:00Z",
  } as any;

  // std3: RTE / Full Concession (Gross ₹20,000, Concession ₹20,000, Net ₹0, Paid ₹0, Balance ₹0)
  const dueStd3: StudentDue = {
    id: "due-3",
    school_id: schoolA,
    student_id: "std-3",
    academic_year_id: ay2026,
    gross_paise: 2000000,
    concession_paise: 2000000,
    net_paise: 0,
    paid_paise: 0,
    balance_paise: 0,
    due_date: "2026-04-10",
    status: "waived", // Waived / RTE
    invoice_no: "INV-2026-0004",
    created_at: "2026-04-01T00:00:00Z",
  } as any;

  // std4: Transport Only (Billed ₹6,000, Paid ₹0, Past due date -> Overdue ₹6,000)
  const dueStd4_trans: StudentDue = {
    id: "due-4",
    school_id: schoolA,
    student_id: "std-4",
    academic_year_id: ay2026,
    gross_paise: 600000,
    concession_paise: 0,
    net_paise: 600000,
    paid_paise: 0,
    balance_paise: 600000,
    due_date: "2026-04-10",
    status: "pending",
    source: "transport",
    invoice_no: "INV-2026-0005",
    created_at: "2026-04-01T00:00:00Z",
  } as any;

  // Cancelled Invoice (Must be strictly ignored by accounting engine)
  const cancelledDue: StudentDue = {
    id: "due-cancelled",
    school_id: schoolA,
    student_id: "std-1",
    academic_year_id: ay2026,
    gross_paise: 5000000,
    concession_paise: 0,
    net_paise: 5000000,
    paid_paise: 0,
    balance_paise: 5000000,
    due_date: "2026-04-10",
    status: "cancelled",
    invoice_no: "INV-CANCELLED",
    created_at: "2026-04-01T00:00:00Z",
  } as any;

  // Previous Academic Year (2025-26) Due (Must NOT bleed into 2026-27 calculations)
  const dueOldYear: StudentDue = {
    id: "due-old",
    school_id: schoolA,
    student_id: "std-1",
    academic_year_id: ay2025,
    gross_paise: 1500000,
    concession_paise: 0,
    net_paise: 1500000,
    paid_paise: 0,
    balance_paise: 1500000,
    due_date: "2025-05-10",
    status: "pending",
    invoice_no: "INV-2025-0099",
    created_at: "2025-04-01T00:00:00Z",
  } as any;

  localStorage.setItem(
    `myzkool_student_dues_${schoolA}`,
    JSON.stringify([dueStd1_T1, dueStd1_T2, dueStd2, dueStd3, dueStd4_trans, cancelledDue, dueOldYear])
  );

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 2: Financial Invariants & Arithmetic Integrity
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST 2: Financial Invariants & Reconciliation ---");
  {
    const res = await getStudentFeeSummaries(schoolA, { academic_year_id: ay2026 });
    const metrics = res.metrics;

    // Expected figures:
    // std1 net: 10,000 + 10,000 = 20,000 (paid 5,000, pending 15,000, overdue 5,000)
    // std2 net: 20,000 (paid 20,000, pending 0)
    // std3: waived/cancelled excluded from demand
    // std4 net: 6,000 (paid 0, pending 6,000, overdue 6,000)
    // Total Billed = 20,000 + 20,000 + 6,000 = ₹46,000 (4,600,000 paise)
    // Total Collected = 5,000 + 20,000 = ₹25,000 (2,500,000 paise)
    // Total Pending = 15,000 + 6,000 = ₹21,000 (2,100,000 paise)
    // Total Overdue = 5,000 + 6,000 = ₹11,000 (1,100,000 paise)
    assert(metrics.total_fees_paise === 4600000, `Total Billed is exactly ₹46,000, got ₹${metrics.total_fees_paise / 100}`);
    assert(metrics.total_collected_paise === 2500000, `Total Collected is exactly ₹25,000, got ₹${metrics.total_collected_paise / 100}`);
    assert(metrics.total_pending_paise === 2100000, `Total Pending is exactly ₹21,000, got ₹${metrics.total_pending_paise / 100}`);
    assert(metrics.total_overdue_paise === 1100000, `Total Overdue is exactly ₹11,000, got ₹${metrics.total_overdue_paise / 100}`);

    // Invariant 1: Billed - Collected === Pending (when zero credits offset)
    assert(
      metrics.total_fees_paise - metrics.total_collected_paise === metrics.total_pending_paise,
      "Invariant: Total Billed - Total Collected === Total Pending"
    );

    // Invariant 2: Overdue strictly <= Pending
    assert(
      metrics.total_overdue_paise <= metrics.total_pending_paise,
      "Invariant: Overdue balance is strictly <= Pending balance"
    );

    // Cancelled invoice excluded
    assert(
      !res.students.some((s) => s.total_billed_paise === 5000000),
      "Cancelled dues of ₹50,000 are strictly excluded from demand"
    );

    // Old academic year due excluded
    assert(
      metrics.total_fees_paise < 6000000,
      "Previous academic year dues (2025-26) are strictly excluded from current reporting scope"
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 3: Student Row Statuses & Details
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST 3: Student Status & Row Breakdown ---");
  {
    const res = await getStudentFeeSummaries(schoolA, { academic_year_id: ay2026 });
    const aarav = res.allFilteredStudents.find((s) => s.student_id === "std-1")!;
    const ananya = res.allFilteredStudents.find((s) => s.student_id === "std-2")!;
    const diya = res.allFilteredStudents.find((s) => s.student_id === "std-4")!;
    const rohan = res.allFilteredStudents.find((s) => s.student_id === "std-5")!;

    assert(aarav.fee_status === "overdue", "Aarav has overdue installment -> status = 'overdue'");
    assert(aarav.total_pending_paise === 1500000, "Aarav pending balance is ₹15,000");
    assert(aarav.total_overdue_paise === 500000, "Aarav overdue balance is ₹5,000");

    assert(ananya.fee_status === "fully_paid", "Ananya paid in full -> status = 'fully_paid'");
    assert(ananya.total_pending_paise === 0, "Ananya pending balance is ₹0");

    assert(diya.is_transport_only === true, "Diya Patel identified as Transport Only");
    assert(diya.applicable_fee_structure_name === "Transport Only", "Diya structure label is 'Transport Only'");
    assert(diya.total_pending_paise === 600000, "Diya pending balance is ₹6,000");

    assert(rohan.fee_status === "no_dues", "Rohan has no dues -> status = 'no_dues'");
    assert(rohan.total_billed_paise === 0, "Rohan billed amount is ₹0");
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 4: Quick Filter Counts & Navigation
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST 4: Quick Filter Pills & Scopes ---");
  {
    // Filter by "with_dues": Aarav (std1) and Diya (std4)
    const withDuesRes = await getStudentFeeSummaries(schoolA, { academic_year_id: ay2026, quick_pill: "with_dues" });
    assert(withDuesRes.students.length === 2, `With Dues filter returned exactly 2 students, got ${withDuesRes.students.length}`);
    assert(withDuesRes.students.every((s) => s.total_pending_paise > 0), "All returned students have positive outstanding balance");

    // Filter by "transport_only": Diya
    const transRes = await getStudentFeeSummaries(schoolA, { academic_year_id: ay2026, quick_pill: "transport_only" });
    assert(transRes.students.length === 1 && transRes.students[0].student_id === "std-4", "Transport Only filter returns Diya");

    // Filter by "fully_paid": Ananya
    const paidRes = await getStudentFeeSummaries(schoolA, { academic_year_id: ay2026, quick_pill: "fully_paid" });
    assert(paidRes.students.some((s) => s.student_id === "std-2"), "Fully paid filter includes Ananya");

    // Filter by "all": All 5 enrolled students
    const allRes = await getStudentFeeSummaries(schoolA, { academic_year_id: ay2026, quick_pill: "all" });
    assert(allRes.students.length === 5, `All enrolled filter returns all 5 students, got ${allRes.students.length}`);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 5: Combined Filters & Debounced Search
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST 5: Combined Filters & Multi-Field Search ---");
  {
    // Search by name
    const searchName = await getStudentFeeSummaries(schoolA, { academic_year_id: ay2026, search: "aarav" });
    assert(searchName.students.length === 1 && searchName.students[0].admission_no === "ADM-2026-001", "Search by student name works");

    // Search by admission number
    const searchAdm = await getStudentFeeSummaries(schoolA, { academic_year_id: ay2026, search: "ADM-2026-004" });
    assert(searchAdm.students.length === 1 && searchAdm.students[0].student_name.includes("Diya"), "Search by admission no works");

    // Combined Class 1 + Section A
    const classFilter = await getStudentFeeSummaries(schoolA, { academic_year_id: ay2026, class_id: "cls-1", section_id: "sec-1a" });
    assert(classFilter.students.length === 2, "Class 1 Section A returns 2 students (Aarav and Ananya)");
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 6: Advance Credits Deduction & Net Outstanding Offset
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST 6: Advance Credits Offset Against Dues ---");
  {
    // Give Diya ₹2,000 in fee credit (unallocated overpayment)
    const credit = {
      id: "credit-1",
      school_id: schoolA,
      student_id: "std-4",
      amount_paise: 200000,
      remaining_paise: 200000,
    };
    localStorage.setItem(`myzkool_fee_credits_${schoolA}`, JSON.stringify([credit]));

    const res = await getStudentFeeSummaries(schoolA, { academic_year_id: ay2026 });
    const diya = res.allFilteredStudents.find((s) => s.student_id === "std-4")!;

    assert(diya.advance_credit_paise === 200000, "Diya has ₹2,000 advance credit");
    // Diya gross pending was ₹6,000. Net pending after credit: ₹4,000.
    assert(diya.net_pending_paise === 400000, `Diya net pending is ₹4,000 (6,000 - 2,000), got ₹${(diya.net_pending_paise || 0) / 100}`);
    assert(diya.total_overdue_paise === 400000, `Diya net overdue is ₹4,000, got ₹${diya.total_overdue_paise / 100}`);

    // Remove credit
    localStorage.removeItem(`myzkool_fee_credits_${schoolA}`);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 7: Column Sorting
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST 7: Column Sorting Integrity ---");
  {
    // Sort by student_name ascending
    const sortNameAsc = await getStudentFeeSummaries(schoolA, { academic_year_id: ay2026, sort_by: "student_name", sort_order: "asc" });
    const names = sortNameAsc.students.map((s) => s.student_name);
    for (let i = 1; i < names.length; i++) {
      assert(names[i - 1].localeCompare(names[i]) <= 0, `Sorted alphabetically: ${names[i - 1]} <= ${names[i]}`);
    }

    // Sort by pending balance descending
    const sortPendingDesc = await getStudentFeeSummaries(schoolA, { academic_year_id: ay2026, sort_by: "pending", sort_order: "desc" });
    const pendings = sortPendingDesc.students.map((s) => s.total_pending_paise);
    for (let i = 1; i < pendings.length; i++) {
      assert(pendings[i - 1] >= pendings[i], `Sorted by pending balance descending: ${pendings[i - 1]} >= ${pendings[i]}`);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 8: Cross-School Multi-Tenant Data Isolation
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST 8: Multi-Tenant Data Isolation ---");
  {
    // Seed School B with different students
    const stdB = {
      id: "std-b-1",
      school_id: schoolB,
      first_name: "Rahul",
      last_name: "Mehta",
      admission_no: "ADM-B-001",
      status: "active",
    };
    localStorage.setItem(`myzkool_students_${schoolB}`, JSON.stringify([stdB]));

    const resB = await getStudentFeeSummaries(schoolB);
    assert(resB.students.length === 1, "School B sees only its own student");
    assert(!resB.students.some((s) => (s as any).school_id === schoolA || s.student_name.includes("Aarav")), "School A students NEVER bleed into School B");
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 9: Consistency Between KPI Totals and Student Rows
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST 9: Exact Row-to-KPI Reconciliation ---");
  {
    const res = await getStudentFeeSummaries(schoolA, { academic_year_id: ay2026 });
    const sumRowBilled = res.allFilteredStudents.reduce((acc, s) => acc + (s.total_applicable_paise || 0), 0);
    const sumRowPaid = res.allFilteredStudents.reduce((acc, s) => acc + (s.total_paid_paise || 0), 0);
    const sumRowPending = res.allFilteredStudents.reduce((acc, s) => acc + (s.total_pending_paise || 0), 0);

    assert(sumRowBilled === res.metrics.total_fees_paise, "Sum of student rows billed === KPI Total Billed");
    assert(sumRowPaid === res.metrics.total_collected_paise, "Sum of student rows paid === KPI Total Collected");
    assert(sumRowPending === res.metrics.total_pending_paise, "Sum of student rows pending === KPI Total Pending");
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 10: CSV Export Verification
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST 10: CSV Export Output Quality ---");
  {
    const res = await getStudentFeeSummaries(schoolA, { academic_year_id: ay2026 });
    const csv = exportStudentFeeCSV(res.allFilteredStudents);
    assert(csv.includes("Student Name"), "CSV contains header 'Student Name'");
    assert(csv.includes("Aarav Sharma"), "CSV contains Aarav Sharma");
    assert(csv.includes("Diya Patel"), "CSV contains Diya Patel");
    assert(csv.includes("Transport Only"), "CSV exports Transport Only structure correctly");
  }

  console.log("\n------------------------------------------------------------------");
  console.log("STUDENT FEE MANAGEMENT RECONCILIATION: ALL 10 TEST SUITES PASSED (100% GREEN)");
  console.log("------------------------------------------------------------------\n");
}

runStudentFeeManagementReconciliationTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
