import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function main() {
  console.log('=== FINANCIAL CALCULATION AUDIT ===\n');

  // 1. Schools
  const { data: schools } = await supabase.from('schools').select('id, name');
  console.log('Schools count:', schools?.length);
  for (const s of schools || []) {
    console.log(`- School ${s.id}: ${s.name}`);
  }

  const schoolId = schools?.[0]?.id || 'b70261ef-37f1-46c8-a148-2c496a9d33a8';

  // 2. Transport Assignments
  const { data: transAssignments, error: transErr } = await supabase
    .from('transport_assignments')
    .select('*')
    .eq('school_id', schoolId);
  console.log('\nTransport Assignments:', transAssignments?.length, transErr || '');
  for (const ta of transAssignments || []) {
    console.log(`  Assignment ${ta.id}: student=${ta.student_id}, monthly_fee_paise=${ta.monthly_fee_paise}, status=${ta.status}, eff_from=${ta.effective_from || (ta as any).start_date}, eff_to=${ta.effective_to || (ta as any).end_date}`);
  }

  // 3. Terms
  const { data: terms } = await supabase
    .from('fee_terms')
    .select('id, name, due_date, period_start, period_end, sort_order')
    .eq('school_id', schoolId)
    .order('sort_order', { ascending: true });
  console.log('\nFee Terms:', terms?.length);
  for (const t of terms || []) {
    console.log(`  Term ${t.id} (${t.name}): due=${t.due_date}, start=${t.period_start}, end=${t.period_end}, sort=${t.sort_order}`);
  }

  // 4. Transport Dues vs Base Dues
  const { data: transDues } = await supabase
    .from('student_dues')
    .select('*')
    .eq('school_id', schoolId)
    .eq('source', 'transport');
  console.log('\nTransport Dues Count:', transDues?.length);
  for (const td of (transDues || []).slice(0, 10)) {
    console.log(`  Due ${td.id}: std=${td.student_id}, term=${td.term_id}, gross_paise=${td.gross_paise}, net=${td.net_paise}, paid=${td.paid_paise}, bal=${td.balance_paise}, status=${td.status}`);
  }

  // 5. Total dues vs ledger entries
  const { count: totalDuesCount } = await supabase
    .from('student_dues')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', schoolId);
  
  const { count: totalLedgerCount } = await supabase
    .from('fee_ledger')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', schoolId);

  const { data: ledgerTypes } = await supabase
    .from('fee_ledger')
    .select('entry_type')
    .eq('school_id', schoolId);

  const ledgerTypeCounts: Record<string, number> = {};
  for (const l of ledgerTypes || []) {
    ledgerTypeCounts[l.entry_type] = (ledgerTypeCounts[l.entry_type] || 0) + 1;
  }

  console.log(`\nTotal Dues in DB: ${totalDuesCount}`);
  console.log(`Total Ledger rows in DB: ${totalLedgerCount}`);
  console.log('Ledger Entry Types:', ledgerTypeCounts);

  // 6. Dues with / without ledger entry
  const { data: duesWithLedger } = await supabase
    .from('fee_ledger')
    .select('due_id')
    .eq('school_id', schoolId)
    .not('due_id', 'is', null);
  const ledgerDueIds = new Set((duesWithLedger || []).map(l => l.due_id));
  
  const { data: allDues } = await supabase
    .from('student_dues')
    .select('id, student_id, gross_paise, net_paise, paid_paise, balance_paise, status, source')
    .eq('school_id', schoolId);

  let duesMissingLedger = 0;
  for (const d of allDues || []) {
    if (!ledgerDueIds.has(d.id)) {
      duesMissingLedger++;
    }
  }
  console.log(`Dues MISSING ledger entry: ${duesMissingLedger} / ${allDues?.length}`);

  // 7. Receipts and Payments
  const { data: receipts } = await supabase
    .from('fee_receipts')
    .select('id, receipt_no, total_paise, status, receipt_date, created_at')
    .eq('school_id', schoolId);
  console.log('\nReceipts in DB:', receipts);

  const { data: payments } = await supabase
    .from('fee_payments')
    .select('id, receipt_id, mode, amount_paise, created_at')
    .eq('school_id', schoolId);
  console.log('Payments in DB:', payments);

  // 8. Test get_fee_collections_summary RPC
  try {
    const { data: summary, error: sumErr } = await supabase.rpc('get_fee_collections_summary', {
      p_school_id: schoolId,
    });
    console.log('\nget_fee_collections_summary RPC result:', summary, sumErr || '');
  } catch (err: any) {
    console.log('\nget_fee_collections_summary RPC error:', err.message);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
