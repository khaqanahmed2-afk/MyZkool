# Fee Management — Database Schema & Data Dictionary

## 1. Overview & Multi-Tenant Design

All fee-related tables in MyZkool are housed within PostgreSQL and managed via Supabase. Every table includes:
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE`
- `created_at TIMESTAMPTZ DEFAULT now()`
- `updated_at TIMESTAMPTZ DEFAULT now()`

### Strict Integer Paise Monetary Standard
In compliance with SaaS financial standards and to eliminate IEEE 754 floating-point inaccuracies, **all currency fields are stored as integer 64-bit values representing paise (1 INR = 100 paise)**.

---

## 2. Core Tables & Column Definitions

### 1. `student_dues` (Canonical Fee Obligations)
Stores individual fee assessment line items owed by students.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Unique identifier |
| `school_id` | UUID | FK -> `schools(id)` | Tenant identifier |
| `student_id` | UUID | FK -> `students(id)` | Obligated student |
| `academic_year_id` | UUID | FK -> `academic_years(id)` | Academic billing period |
| `fee_head_id` | UUID | FK -> `fee_heads(id)` | Accounting fee category |
| `fee_term_id` | UUID | FK -> `fee_terms(id)` | Installment schedule term |
| `fee_structure_id` | UUID | Nullable FK -> `fee_structures(id)`| Originating fee template |
| `gross_paise` | BIGINT | NOT NULL, >= 0 | Base assessment before waiver |
| `concession_paise` | BIGINT | NOT NULL, >= 0 | Total concession / discount |
| `net_paise` | BIGINT | NOT NULL, >= 0 | `gross_paise - concession_paise` |
| `paid_paise` | BIGINT | NOT NULL, >= 0 | Cumulative collections allocated |
| `balance_paise` | BIGINT | NOT NULL, >= 0 | `net_paise - paid_paise` |
| `due_date` | DATE | NOT NULL | Payment deadline |
| `status` | VARCHAR | NOT NULL | `'pending'`, `'partial'`, `'paid'`, `'cancelled'` |
| `source` | VARCHAR | DEFAULT `'structure'` | `'structure'`, `'transport'`, `'adhoc'` |

### 2. `fee_receipts` (Payment Transactions)
Stores verified monetary collections and cashier receipts.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Unique identifier |
| `school_id` | UUID | FK -> `schools(id)` | Tenant identifier |
| `receipt_no` | VARCHAR | NOT NULL, UNIQUE(school_id, receipt_no) | Sequential receipt series (e.g., `REC-2026-0001`) |
| `student_id` | UUID | FK -> `students(id)` | Payer student |
| `academic_year_id` | UUID | FK -> `academic_years(id)` | Billing academic year |
| `receipt_date` | DATE | NOT NULL | Transaction date |
| `total_paise` | BIGINT | NOT NULL, > 0 | Total money collected |
| `payment_mode` | VARCHAR | NOT NULL | `'cash'`, `'upi'`, `'cheque'`, `'card'`, `'netbanking'`, `'wallet'` |
| `transaction_ref` | VARCHAR | Nullable | Bank reference / UPI UTR / Cheque No |
| `collected_by` | UUID | FK -> `users(id)` | Cashier / Operator who took payment |
| `status` | VARCHAR | NOT NULL | `'active'`, `'cancelled'`, `'refunded'` |
| `remarks` | TEXT | Nullable | Notes / cashier memo |

### 3. `fee_receipt_items` (Payment Allocations)
Maintains the exact allocation of a receipt across one or more student dues.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Unique identifier |
| `school_id` | UUID | FK -> `schools(id)` | Tenant identifier |
| `receipt_id` | UUID | FK -> `fee_receipts(id)` ON DELETE CASCADE | Parent receipt |
| `due_id` | UUID | FK -> `student_dues(id)` | Settled obligation |
| `amount_paise` | BIGINT | NOT NULL, > 0 | Portion allocated to this due |

### 4. `fee_credits` (Student Advance Wallet)
Maintains unallocated advance balances, surplus payments, or credit notes.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Unique identifier |
| `school_id` | UUID | FK -> `schools(id)` | Tenant identifier |
| `student_id` | UUID | FK -> `students(id)` | Account owner |
| `amount_paise` | BIGINT | NOT NULL, > 0 | Credit balance available |
| `source` | VARCHAR | NOT NULL | `'surplus_payment'`, `'refund_reversal'`, `'manual_credit'` |
| `source_ref_id` | UUID | Nullable | Foreign key to origin receipt or credit note |
| `status` | VARCHAR | NOT NULL | `'available'`, `'applied'`, `'refunded'` |

### 5. `invoices` & `invoice_items` (Official Tax Invoices)
Provides formal invoicing for compliance and parent portal billing.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Unique identifier |
| `school_id` | UUID | FK -> `schools(id)` | Tenant identifier |
| `invoice_no` | VARCHAR | NOT NULL, UNIQUE(school_id, invoice_no) | Sequential invoice series |
| `student_id` | UUID | FK -> `students(id)` | Invoiced student |
| `academic_year_id` | UUID | FK -> `academic_years(id)` | Billing period |
| `invoice_date` | DATE | NOT NULL | Issue date |
| `due_date` | DATE | NOT NULL | Payment cutoff date |
| `subtotal_paise` | BIGINT | NOT NULL | Pre-discount sum |
| `discount_paise` | BIGINT | NOT NULL | Total applied concession |
| `total_paise` | BIGINT | NOT NULL | Net invoice payable |
| `status` | VARCHAR | NOT NULL | `'issued'`, `'paid'`, `'partial'`, `'void'` |

---

## 3. High-Performance Indexing Strategy

To support 500+ schools with hundreds of thousands of student records, the following composite B-tree indexes are enforced:

```sql
-- 1. High-frequency tenant & academic year filter on dues
CREATE INDEX IF NOT EXISTS idx_student_dues_school_ay 
ON student_dues(school_id, academic_year_id, status);

-- 2. Fast defaulter lookup by due_date
CREATE INDEX IF NOT EXISTS idx_student_dues_overdue 
ON student_dues(school_id, due_date) 
WHERE balance_paise > 0 AND status != 'cancelled';

-- 3. Student ledger drawer lookup
CREATE INDEX IF NOT EXISTS idx_student_dues_student 
ON student_dues(school_id, student_id, academic_year_id);

-- 4. Receipts filtering by date & status
CREATE INDEX IF NOT EXISTS idx_fee_receipts_school_date 
ON fee_receipts(school_id, receipt_date DESC) 
WHERE status = 'active';

-- 5. Student receipts lookup
CREATE INDEX IF NOT EXISTS idx_fee_receipts_student 
ON fee_receipts(school_id, student_id);

-- 6. Unallocated credit lookup
CREATE INDEX IF NOT EXISTS idx_fee_credits_student_avail 
ON fee_credits(school_id, student_id) 
WHERE status = 'available';
```

---

## 4. Row-Level Security (RLS) Policies

All queries and mutations are filtered through PostgreSQL RLS:

```sql
-- Enable RLS
ALTER TABLE student_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy (example for student_dues)
CREATE POLICY "Tenant isolation for student_dues" 
ON student_dues
AS RESTRICTIVE
FOR ALL
USING (school_id = (auth.jwt() ->> 'school_id')::UUID)
WITH CHECK (school_id = (auth.jwt() ->> 'school_id')::UUID);
```
