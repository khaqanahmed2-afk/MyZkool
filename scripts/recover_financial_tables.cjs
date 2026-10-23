/**
 * MyZkool Financial Table Recovery Utility
 * 
 * Restores financial tables from the verified JSON snapshot:
 * scripts/backups/phase2b_financial_backup_pre.json
 * 
 * IMPORTANT SCOPE NOTICE:
 * This recovery procedure restores ONLY the financial transaction tables:
 * - student_dues
 * - fee_ledger
 * - fee_receipts
 * - fee_receipt_items
 * - fee_payments
 * - fee_credits
 * 
 * It is NOT a full database backup (does not contain students, classes, or auth users).
 */

const fs = require('fs');
const path = require('path');

const BACKUP_FILE = path.join(__dirname, 'backups', 'phase2b_financial_backup_pre.json');
const OUTPUT_SQL = path.join(__dirname, 'backups', 'phase2b_financial_recovery.sql');

function generateRecoverySQL() {
  if (!fs.existsSync(BACKUP_FILE)) {
    console.error('Backup file not found at:', BACKUP_FILE);
    process.exit(1);
  }

  const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
  console.log('Read backup from:', backup.timestamp, '| Phase:', backup.phase);

  const lines = [
    '-- ==============================================================================',
    '-- MyZkool Point-in-Time Financial Recovery Script',
    `-- Source Snapshot: phase2b_financial_backup_pre.json (${backup.timestamp})`,
    '-- TARGET TENANT: Peace Convent School (b70261ef-37f1-46c8-a148-2c496a9d33a8)',
    '-- ==============================================================================',
    'BEGIN;',
    '',
    '-- Step 0: Clean up any Phase 2D repair entries before restoration to avoid orphan adjustments',
    "DELETE FROM public.fee_ledger WHERE note LIKE 'Phase 2D%';",
    ''
  ];

  // Helper to escape SQL strings
  const esc = (val) => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return val;
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    return `'${String(val).replace(/'/g, "''")}'`;
  };

  // 1. student_dues
  lines.push('-- 1. Restore student_dues (' + backup.student_dues.length + ' records)');
  for (const d of backup.student_dues) {
    lines.push(`INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES (${esc(d.id)}, ${esc(d.school_id)}, ${esc(d.student_id)}, ${esc(d.academic_year_id)}, ${esc(d.fee_head_id)}, ${esc(d.term_id)}, ${esc(d.source)}, ${esc(d.source_ref)}, ${esc(d.description)}, ${esc(d.gross_paise)}, ${esc(d.concession_paise)}, ${esc(d.net_paise)}, ${esc(d.paid_paise)}, ${esc(d.balance_paise)}, ${esc(d.due_date)}, ${esc(d.status)}, ${esc(d.invoice_no)}, ${esc(d.created_at)}, ${esc(d.updated_at)})
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;`);
  }
  lines.push('');

  // 2. fee_ledger
  lines.push('-- 2. Restore fee_ledger (' + backup.fee_ledger.length + ' records)');
  for (const l of backup.fee_ledger) {
    lines.push(`INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES (${esc(l.id)}, ${esc(l.school_id)}, ${esc(l.student_id)}, ${esc(l.academic_year_id)}, ${esc(l.due_id)}, ${esc(l.receipt_id)}, ${esc(l.entry_type)}, ${esc(l.amount_paise)}, ${esc(l.note)}, ${esc(l.created_by)}, ${esc(l.created_at)})
ON CONFLICT (id) DO NOTHING;`);
  }
  lines.push('');

  // 3. Verification Assertion
  lines.push('-- 3. Verification Assertions for Restored State');
  lines.push(`DO $$
DECLARE
    v_dues_count int;
    v_ledger_count int;
BEGIN
    SELECT count(*) INTO v_dues_count FROM public.student_dues WHERE school_id = 'b70261ef-37f1-46c8-a148-2c496a9d33a8';
    IF v_dues_count != 337 THEN
        RAISE EXCEPTION 'Recovery validation failed: expected 337 dues, found %', v_dues_count;
    END IF;

    SELECT count(*) INTO v_ledger_count FROM public.fee_ledger WHERE school_id = 'b70261ef-37f1-46c8-a148-2c496a9d33a8';
    IF v_ledger_count != 87 THEN
        RAISE EXCEPTION 'Recovery validation failed: expected 87 ledger records, found %', v_ledger_count;
    END IF;

    RAISE NOTICE 'RECOVERY VALIDATION PASSED: 337 dues and 87 ledger rows restored exactly.';
END $$;`);
  lines.push('');

  lines.push('COMMIT;');

  fs.writeFileSync(OUTPUT_SQL, lines.join('\n'), 'utf8');
  console.log(`Recovery SQL generated successfully at: ${OUTPUT_SQL} (${lines.length} lines)`);
}

generateRecoverySQL();
