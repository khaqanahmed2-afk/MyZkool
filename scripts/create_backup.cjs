const fs = require('fs');

function extractData(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  const text = parsed.result;
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1) return null;
  const jsonContent = text.substring(start, end + 1);
  return JSON.parse(jsonContent);
}

const ledgerRows = extractData('C:/Users/yadav/.gemini/antigravity-ide/brain/a55ddbb7-62ce-4baa-875c-67bc36b43fc3/.system_generated/steps/778/output.txt') || [];
const duesRows = extractData('C:/Users/yadav/.gemini/antigravity-ide/brain/a55ddbb7-62ce-4baa-875c-67bc36b43fc3/.system_generated/steps/782/output.txt') || [];

const fee_receipts = [
  {
    id: 'f14ed1ce-632a-4b70-8dff-49c5028d9088',
    school_id: 'b70261ef-37f1-46c8-a148-2c496a9d33a8',
    receipt_no: 'MZ/2026–2027/000002',
    student_id: '92c37a0e-c82b-41d1-9f55-49b1e0937bd2',
    academic_year_id: 'a0171c28-e12c-4485-ac27-e0b010607e1f',
    receipt_date: '2026-10-16',
    total_paise: 100000,
    status: 'active',
    source: 'counter',
    payment_group_id: null,
    collected_by: '62f0436b-8e83-46ca-8716-7814f8699a09',
    remarks: null,
    idempotency_key: 'b068bc74-3253-4235-8b8c-f731556e853e',
    print_count: 0,
    whatsapp_sent_at: null,
    cancelled_by: null,
    cancelled_at: null,
    cancel_reason: null,
    created_at: '2026-10-16T10:56:02.838495+00:00',
    updated_at: '2026-10-16T10:56:02.838495+00:00'
  },
  {
    id: '6210e425-fe0b-4e3a-9baa-f27f874e0a5b',
    school_id: 'b70261ef-37f1-46c8-a148-2c496a9d33a8',
    receipt_no: 'MZ/2026–2027/000003',
    student_id: '899e02ab-d52b-4990-853c-62bbb7960563',
    academic_year_id: 'a0171c28-e12c-4485-ac27-e0b010607e1f',
    receipt_date: '2026-10-16',
    total_paise: 50000,
    status: 'cancelled',
    source: 'counter',
    payment_group_id: null,
    collected_by: null,
    remarks: 'SQL Verification Test Payment',
    idempotency_key: 'sql-idemp-1792149242.429080',
    print_count: 0,
    whatsapp_sent_at: null,
    cancelled_by: null,
    cancelled_at: '2026-10-16T11:14:27.313833+00:00',
    cancel_reason: 'Automated test verification cancellation',
    created_at: '2026-10-16T11:14:02.42908+00:00',
    updated_at: '2026-10-16T11:14:27.313833+00:00'
  }
];

const fee_receipt_items = [
  {
    id: '42c8367e-b65a-48f9-bf0b-d24c9ed3a7da',
    receipt_id: '6210e425-fe0b-4e3a-9baa-f27f874e0a5b',
    due_id: '1d048b1c-2f60-4040-8222-86c060963d4b',
    fee_head_id: '6ff3b20c-5cf2-4f74-a2d2-7721455a192a',
    amount_paise: 50000,
    concession_paise: 0
  }
];

const fee_payments = [
  {
    id: '61e5d3f6-2264-4086-bff2-ad954e72fd63',
    school_id: 'b70261ef-37f1-46c8-a148-2c496a9d33a8',
    receipt_id: 'f14ed1ce-632a-4b70-8dff-49c5028d9088',
    mode: 'cash',
    amount_paise: 100000,
    reference_no: null,
    bank_name: null,
    instrument_no: null,
    instrument_date: null,
    cheque_status: null,
    gateway_order_id: null,
    gateway_payment_id: null,
    created_at: '2026-10-16T10:56:02.838495+00:00'
  },
  {
    id: '2b776269-0896-4d2a-8c72-803a97f05153',
    school_id: 'b70261ef-37f1-46c8-a148-2c496a9d33a8',
    receipt_id: '6210e425-fe0b-4e3a-9baa-f27f874e0a5b',
    mode: 'cash',
    amount_paise: 50000,
    reference_no: 'SQL-VERIFY-001',
    bank_name: null,
    instrument_no: null,
    instrument_date: null,
    cheque_status: null,
    gateway_order_id: null,
    gateway_payment_id: null,
    created_at: '2026-10-16T11:14:02.42908+00:00'
  }
];

const fee_credits = [
  {
    id: '89c36a06-9474-4c99-868d-a444244f43aa',
    school_id: 'b70261ef-37f1-46c8-a148-2c496a9d33a8',
    student_id: '92c37a0e-c82b-41d1-9f55-49b1e0937bd2',
    academic_year_id: 'a0171c28-e12c-4485-ac27-e0b010607e1f',
    amount_paise: 100000,
    remaining_paise: 100000,
    source_receipt_id: 'f14ed1ce-632a-4b70-8dff-49c5028d9088',
    created_at: '2026-10-16T10:56:02.838495+00:00'
  }
];

if (!fs.existsSync('scripts/backups')) {
  fs.mkdirSync('scripts/backups', { recursive: true });
}

const backup = {
  timestamp: new Date().toISOString(),
  phase: 'Phase 2B Pre-Migration Backup',
  fee_receipts,
  fee_receipt_items,
  fee_payments,
  fee_credits,
  fee_ledger: ledgerRows[0]?.json_agg || [],
  student_dues: duesRows[0]?.json_agg || []
};

fs.writeFileSync('scripts/backups/phase2b_financial_backup_pre.json', JSON.stringify(backup, null, 2));
console.log('BACKUP_SUCCESS');
console.log('Receipts:', backup.fee_receipts.length);
console.log('Receipt Items:', backup.fee_receipt_items.length);
console.log('Payments:', backup.fee_payments.length);
console.log('Credits:', backup.fee_credits.length);
console.log('Ledger:', backup.fee_ledger.length);
console.log('Student Dues:', backup.student_dues.length);
