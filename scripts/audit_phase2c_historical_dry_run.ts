import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

interface DiscrepancyRow {
  school_id: string;
  student_id: string;
  student_name: string;
  due_id: string;
  billing_period: string;
  fee_head: string;
  source: string;
  original_gross_paise: number;
  expected_gross_paise: number;
  paid_paise: number;
  current_balance_paise: number;
  proposed_adjustment_paise: number;
  reason: string;
  status: string;
}

async function runAudit() {
  console.log("================================================================================");
  console.log("PHASE 2C READ-ONLY HISTORICAL AUDIT & RECONCILIATION DRY RUN");
  console.log("================================================================================\n");

  // 1. Fetch all schools
  const { data: schools } = await supabase.from('schools').select('id, name');
  const schoolIds = (schools || []).map(s => s.id);

  // 2. Fetch all terms
  const { data: allTerms } = await supabase.from('fee_terms').select('*');
  const termMap = new Map((allTerms || []).map(t => [t.id, t]));

  // 3. Fetch all transport settings
  const { data: allTransSettings } = await supabase.from('transport_settings').select('*');
  const transSettingsMap = new Map((allTransSettings || []).map(s => [s.school_id, s]));

  // 4. Fetch all transport assignments
  const { data: allTransAssignments } = await supabase.from('transport_assignments').select('*');
  const transAssignMap = new Map((allTransAssignments || []).map(a => [a.id, a]));
  const studentTransMap = new Map((allTransAssignments || []).map(a => [a.student_id, a]));

  // 5. Fetch all students
  const { data: allStudents } = await supabase.from('students').select('id, school_id, first_name, last_name, admission_no');
  const studentMap = new Map((allStudents || []).map(s => [s.id, s]));

  // 6. Fetch all fee heads
  const { data: allHeads } = await supabase.from('fee_heads').select('id, name, code');
  const headMap = new Map((allHeads || []).map(h => [h.id, h]));

  // 7. Fetch all dues
  const { data: allDues } = await supabase.from('student_dues').select('*');
  console.log(`Auditing ${allDues?.length || 0} total student dues across ${schools?.length || 0} schools...\n`);

  // 8. Fetch all ledger entries
  const { data: allLedger } = await supabase.from('fee_ledger').select('*');
  const ledgerByDueId = new Map<string, any[]>();
  for (const l of allLedger || []) {
    if (l.due_id) {
      if (!ledgerByDueId.has(l.due_id)) ledgerByDueId.set(l.due_id, []);
      ledgerByDueId.get(l.due_id)!.push(l);
    }
  }

  // 9. Fetch all receipts and payments
  const { data: allReceipts } = await supabase.from('fee_receipts').select('*');
  const { data: allPayments } = await supabase.from('fee_payments').select('*');
  const { data: allReceiptItems } = await supabase.from('fee_receipt_items').select('*');

  const discrepancies: DiscrepancyRow[] = [];
  let transportErrorsCount = 0;
  let missingLedgerCount = 0;
  let paidDiscrepanciesCount = 0;

  for (const due of allDues || []) {
    const student = studentMap.get(due.student_id);
    const studentName = student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() : 'Unknown';
    const term = termMap.get(due.term_id);
    const termName = term ? term.name : (due.term_id || 'General');
    const head = headMap.get(due.fee_head_id);
    const headName = head ? head.name : 'Fee';

    // A. Check Ledger Synchronization
    const dueLedgerEntries = ledgerByDueId.get(due.id) || [];
    const hasDueCreated = dueLedgerEntries.some(l => l.entry_type === 'due_created');
    if (!hasDueCreated && due.status !== 'cancelled') {
      missingLedgerCount++;
      discrepancies.push({
        school_id: due.school_id,
        student_id: due.student_id,
        student_name: studentName,
        due_id: due.id,
        billing_period: termName,
        fee_head: headName,
        source: due.source,
        original_gross_paise: due.gross_paise,
        expected_gross_paise: due.gross_paise,
        paid_paise: due.paid_paise,
        current_balance_paise: due.balance_paise,
        proposed_adjustment_paise: 0,
        reason: 'Missing original due_created ledger entry from auto-assignment',
        status: due.status,
      });
    }

    // B. Check Transport Frequency & Validity
    if (due.source === 'transport') {
      const assignment = transAssignMap.get(due.source_ref) || studentTransMap.get(due.student_id);
      const settings = transSettingsMap.get(due.school_id);
      const billingMonths: number[] = settings?.billing_months || [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
      const partialRule: string = settings?.partial_month_rule || 'full_month';

      if (!assignment) {
        transportErrorsCount++;
        discrepancies.push({
          school_id: due.school_id,
          student_id: due.student_id,
          student_name: studentName,
          due_id: due.id,
          billing_period: termName,
          fee_head: headName,
          source: 'transport',
          original_gross_paise: due.gross_paise,
          expected_gross_paise: 0,
          paid_paise: due.paid_paise,
          current_balance_paise: due.balance_paise,
          proposed_adjustment_paise: -due.net_paise,
          reason: 'No valid transport assignment found for student (orphan transport due)',
          status: due.status,
        });
      } else {
        // Calculate billable months for this term
        let termMonths: { year: number; month: number }[] = [];
        if (term && term.period_start && term.period_end) {
          const pStart = new Date(term.period_start);
          const pEnd = new Date(term.period_end);
          let cur = new Date(pStart.getFullYear(), pStart.getMonth(), 1);
          const end = new Date(pEnd.getFullYear(), pEnd.getMonth(), 1);
          while (cur <= end) {
            const m = cur.getMonth() + 1;
            if (billingMonths.includes(m)) {
              termMonths.push({ year: cur.getFullYear(), month: m });
            }
            cur.setMonth(cur.getMonth() + 1);
          }
        } else if (term) {
          // 1 month per term if 12 terms
          const dueDate = new Date(term.due_date || due.due_date);
          const m = dueDate.getMonth() + 1;
          if (billingMonths.includes(m)) {
            termMonths.push({ year: dueDate.getFullYear(), month: m });
          }
        }

        // Filter active months against assignment effective dates
        const effStart = new Date(assignment.effective_from);
        const startYear = effStart.getFullYear();
        const startMonth = effStart.getMonth() + 1;
        const startDay = effStart.getDate();

        let billableStartYear = startYear;
        let billableStartMonth = startMonth;
        if (partialRule === 'from_next_month' && startDay > 1) {
          billableStartMonth += 1;
          if (billableStartMonth > 12) {
            billableStartMonth = 1;
            billableStartYear += 1;
          }
        }

        const activeMonths = termMonths.filter(tm => {
          if (tm.year < billableStartYear) return false;
          if (tm.year === billableStartYear && tm.month < billableStartMonth) return false;
          if (assignment.effective_to) {
            const effEnd = new Date(assignment.effective_to);
            const endYear = effEnd.getFullYear();
            const endMonth = effEnd.getMonth() + 1;
            if (tm.year > endYear) return false;
            if (tm.year === endYear && tm.month > endMonth) return false;
          }
          return true;
        });

        const expectedGross = Number(assignment.monthly_fee_paise) * activeMonths.length;
        if (expectedGross !== due.gross_paise) {
          transportErrorsCount++;
          discrepancies.push({
            school_id: due.school_id,
            student_id: due.student_id,
            student_name: studentName,
            due_id: due.id,
            billing_period: termName,
            fee_head: headName,
            source: 'transport',
            original_gross_paise: due.gross_paise,
            expected_gross_paise: expectedGross,
            paid_paise: due.paid_paise,
            current_balance_paise: due.balance_paise,
            proposed_adjustment_paise: expectedGross - due.gross_paise,
            reason: activeMonths.length === 0
              ? `Term is outside active assignment range (started ${assignment.effective_from})`
              : `Expected ${activeMonths.length} active month(s) × ₹${assignment.monthly_fee_paise / 100} = ₹${expectedGross / 100}, but billed ₹${due.gross_paise / 100}`,
            status: due.status,
          });
        }
      }
    }
  }

  console.log("--------------------------------------------------------------------------------");
  console.log("AUDIT SUMMARY STATISTICS");
  console.log("--------------------------------------------------------------------------------");
  console.log(`Total dues inspected: ${allDues?.length || 0}`);
  console.log(`Dues with missing 'due_created' ledger entry: ${missingLedgerCount}`);
  console.log(`Transport frequency / date-range discrepancies: ${transportErrorsCount}`);
  console.log(`Total discrepancies identified: ${discrepancies.length}\n`);

  console.log("--------------------------------------------------------------------------------");
  console.log("BREAKDOWN BY STATUS");
  console.log("--------------------------------------------------------------------------------");
  const byStatus: Record<string, number> = {};
  for (const d of discrepancies) {
    byStatus[d.status] = (byStatus[d.status] || 0) + 1;
  }
  for (const [s, c] of Object.entries(byStatus)) {
    console.log(`- Status '${s}': ${c} records`);
  }

  console.log("\n--------------------------------------------------------------------------------");
  console.log("SAMPLE TRANSPORT DISCREPANCIES (TOP 10)");
  console.log("--------------------------------------------------------------------------------");
  const transDisc = discrepancies.filter(d => d.source === 'transport');
  for (const td of transDisc.slice(0, 10)) {
    console.log(`[Due ${td.due_id}] Student: ${td.student_name} (${td.student_id})`);
    console.log(`  Period: ${td.billing_period} | Billed: ₹${td.original_gross_paise / 100} | Expected: ₹${td.expected_gross_paise / 100} | Paid: ₹${td.paid_paise / 100} | Bal: ₹${td.current_balance_paise / 100}`);
    console.log(`  Adjustment: ₹${td.proposed_adjustment_paise / 100} | Reason: ${td.reason}`);
    console.log("");
  }

  console.log("--------------------------------------------------------------------------------");
  console.log("SAMPLE MISSING LEDGER DUES (TOP 5)");
  console.log("--------------------------------------------------------------------------------");
  const ledgerDisc = discrepancies.filter(d => d.reason.includes('due_created'));
  for (const ld of ledgerDisc.slice(0, 5)) {
    console.log(`[Due ${ld.due_id}] Student: ${ld.student_name} | Head: ${ld.fee_head} | Period: ${ld.billing_period} | Net: ₹${ld.original_gross_paise / 100} | Status: ${ld.status}`);
  }

  console.log("\nDRY RUN COMPLETE: No database records were modified.");
}

runAudit().then(() => process.exit(0)).catch(err => {
  console.error("Audit failed:", err);
  process.exit(1);
});
