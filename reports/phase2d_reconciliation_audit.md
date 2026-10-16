# MyZkool Phase 2D: Historical Financial Reconciliation Audit Report

**Date & Time**: 2026-10-16 20:05 IST  
**Environment**: Production Database (`nzphjfsgtkbvfrevduek`) — PostgreSQL Live  
**Execution Mode**: **READ-ONLY AUDIT & DRY-RUN VERIFICATION** (No historical records updated, no backfills run)  
**Status**: **AWAITING USER APPROVAL**  

---

## 1. Executive Summary & Exact Record Counts

In accordance with the Phase 2D specifications, a comprehensive read-only audit of historical discrepancies was executed against the live Supabase PostgreSQL database. Every record was re-queried and mathematically verified against student transport assignments, term date boundaries, billing policies, fee ledger entries, and recovery backup files.

### Verified Record Counts Against Live Database

| Discrepancy Category | Verified Record Count | Total Current Amount (Paise / ₹) | Total Expected Amount (Paise / ₹) | Proposed Net Adjustment | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Transport: Doubled Dues** | **74 dues** | 14,480,000 paise (₹1,44,800) | 7,240,000 paise (₹72,400) | **-7,240,000 paise (-₹72,400)** | Verified in live DB |
| **Transport: Pre-Enrollment Dues** | **6 dues** | 480,000 paise (₹4,800) | 0 paise (₹0) | **-480,000 paise (-₹4,800)** | Verified in live DB |
| **Transport: Correct Dues (Baseline)** | **10 dues** | 920,000 paise (₹9,200) | 920,000 paise (₹9,200) | ₹0 (No change) | Verified in live DB |
| **TOTAL TRANSPORT DUES** | **90 dues** | **15,880,000 paise (₹1,58,800)** | **8,160,000 paise (₹81,600)** | **-7,720,000 paise (-₹77,200)** | |
| **Missing Ledger: Pending Structure** | **184 dues** | 25,920,000 paise (₹2,59,200) | 25,920,000 paise (₹2,59,200) | Backfill `due_created` | Verified in live DB |
| **Missing Ledger: Waived Structure (RTE)**| **143 dues** | 21,740,000 paise (₹2,17,400) | 0 paise net | Backfill `due_created` & `concession` | Verified in live DB |
| **Missing Ledger: Pre-Enrollment Transport**| **6 dues** | 480,000 paise (₹4,800) | 0 paise | Cancelled dues (0 ledger impact) | Verified in live DB |
| **TOTAL MISSING LEDGER ENTRIES** | **333 dues** | **48,140,000 paise (₹4,81,400)** | **25,920,000 paise (₹2,59,200)** | | |

---

## 2. Verification of the 80 Transport Dues

### Detailed Student-Wise Audit (All 10 Transport Students)

Every student's transport assignment, billing frequency, monthly rate, and terms were verified against the live database:

1. **Aarohi Saini** (`ADM-2026-0009`):
   - Transport Assignment: Active, `service_type: both`, `monthly_fee_paise: 80,000` (₹800/mo), `effective_from: 2026-10-16`.
   - Dues: 6 terms generated (October 2026 to March 2027).
   - Analysis: October 2026 billed correctly at ₹800. Terms Nov 2026, Dec 2026, Jan 2027, Feb 2027, Mar 2027 (5 terms) billed at ₹1,600 each due to the month-overlap multiplier bug.
   - Payments: ₹0 paid. Concessions: ₹0.
   - Expected Dues: 6 × ₹800 = ₹4,800. Current: ₹8,800. Adjustment: **-₹4,000 (-400,000 paise)**.

2. **Aadhya Sharma** (`ADM-2026-0010`):
   - Transport Assignment: Active, `monthly_fee_paise: 80,000` (₹800/mo), `effective_from: 2026-10-16`.
   - Dues: 6 terms. Oct 2026 = ₹800; Nov 2026 - Mar 2027 (5 terms) = ₹1,600 each.
   - Payments: ₹0 paid. Concessions: ₹0.
   - Expected Dues: 6 × ₹800 = ₹4,800. Current: ₹8,800. Adjustment: **-₹4,000 (-400,000 paise)**.

3. **Ira Roy** (`ADM-2026-0016`):
   - Transport Assignment: Active, `monthly_fee_paise: 100,000` (₹1,000/mo), `effective_from: 2026-04-01`.
   - Dues: 12 terms (April 2026 to March 2027).
   - Analysis: April 2026 billed correctly at ₹1,000. Terms May 2026 through March 2027 (11 terms) billed at ₹2,000 each.
   - Payments: ₹0 paid against dues directly. (Has unallocated advance credit of ₹1,000 via receipt `MZ/2026–2027/000002`).
   - Expected Transport Dues: 12 × ₹1,000 = ₹12,000. Current: ₹23,000. Adjustment: **-₹11,000 (-1,100,000 paise)**.

4. **Kunal Singh** (`ADM-2026-0031`):
   - Transport Assignment: Active, `monthly_fee_paise: 100,000` (₹1,000/mo), `effective_from: 2026-04-01`.
   - Dues: 12 terms. April 2026 = ₹1,000; May 2026 - Mar 2027 (11 terms) = ₹2,000 each.
   - Payments: ₹0 paid. Concessions: ₹0.
   - Expected Transport Dues: 12 × ₹1,000 = ₹12,000. Current: ₹23,000. Adjustment: **-₹11,000 (-1,100,000 paise)**.

5. **Aadhya Choudhary** (`ADM-2026-0037`):
   - Transport Assignment: Active, `monthly_fee_paise: 80,000` (₹800/mo), `effective_from: 2026-10-16`.
   - Dues: 6 terms. Oct 2026 = ₹800; Nov 2026 - Mar 2027 (5 terms) = ₹1,600 each.
   - Payments: ₹0 paid. Concessions: ₹0.
   - Expected Dues: 6 × ₹800 = ₹4,800. Current: ₹8,800. Adjustment: **-₹4,000 (-400,000 paise)**.

6. **Abhishek Agarwal** (`ADM-2026-0061`):
   - Transport Assignment: Active, `monthly_fee_paise: 120,000` (₹1,200/mo), `effective_from: 2026-04-01`.
   - Dues: 12 terms. April 2026 = ₹1,200; May 2026 - Mar 2027 (11 terms) = ₹2,400 each.
   - Payments: Receipt `MZ/2026–2027/000003` for ₹500 was cancelled; due balance is ₹1,200 for April and ₹0 paid.
   - Expected Transport Dues: 12 × ₹1,200 = ₹14,400. Current: ₹27,600. Adjustment: **-₹13,200 (-1,320,000 paise)**.

7. **Aarohi Bhardwaj** (`ADM-2026-0068`):
   - Transport Assignment: Active, `monthly_fee_paise: 80,000` (₹800/mo), `effective_from: 2026-10-16`.
   - Dues: 6 terms. Oct 2026 = ₹800; Nov 2026 - Mar 2027 (5 terms) = ₹1,600 each.
   - Payments: ₹0 paid. Concessions: ₹0.
   - Expected Dues: 6 × ₹800 = ₹4,800. Current: ₹8,800. Adjustment: **-₹4,000 (-400,000 paise)**.

8. **Aanya Choudhary** (`ADM-2026-0074`):
   - Transport Assignment: Active, `monthly_fee_paise: 80,000` (₹800/mo), `effective_from: 2026-10-16`.
   - Dues: 12 terms generated.
   - Analysis:
     - **6 Pre-Enrollment Dues** (April, May, June, July, August, September 2026): Term periods all ended before her transport start date of `2026-10-16`. Billed at ₹800 each (Total ₹4,800). Proposed Action: **Cancel all 6 dues**.
     - **1 Normal Due** (October 2026): Billed at ₹800. Expected: ₹800. Correct.
     - **5 Doubled Dues** (November 2026 to March 2027): Billed at ₹1,600 each. Expected: ₹800 each. Proposed Action: **Reduce by ₹800 each**.
   - Payments: ₹0 paid. Concessions: ₹0.
   - Expected Transport Dues: 6 × ₹800 = ₹4,800. Current: ₹13,600. Total Adjustment: **-₹8,800 (-880,000 paise)**.

9. **Diya Bhardwaj** (`ADM-2026-0091`):
   - Transport Assignment: Active, `monthly_fee_paise: 120,000` (₹1,200/mo), `effective_from: 2026-04-01`.
   - Dues: 12 terms. April 2026 = ₹1,200; May 2026 - Mar 2027 (11 terms) = ₹2,400 each.
   - Payments: ₹0 paid. Concessions: ₹0.
   - Expected Transport Dues: 12 × ₹1,200 = ₹14,400. Current: ₹27,600. Adjustment: **-₹13,200 (-1,320,000 paise)**.

10. **Aadhya Patel** (`ADM-2026-0098`):
    - Transport Assignment: Active, `monthly_fee_paise: 80,000` (₹800/mo), `effective_from: 2026-10-16`.
    - Dues: 6 terms. Oct 2026 = ₹800; Nov 2026 - Mar 2027 (5 terms) = ₹1,600 each.
    - Payments: ₹0 paid. Concessions: ₹0.
    - Expected Dues: 6 × ₹800 = ₹4,800. Current: ₹8,800. Adjustment: **-₹4,000 (-400,000 paise)**.

### Transport Summary

- **Total Transport Dues**: 90
- **Correct Unaltered Dues**: 10 (4 students × April 2026 + 6 students × October 2026)
- **Doubled Dues Requiring Adjustment**: **74 dues** (Overbilled by ₹72,400)
- **Pre-Enrollment Dues Requiring Cancellation**: **6 dues** (Overbilled by ₹4,800)
- **Total Proposed Transport Correction**: **-₹77,200 (-7,720,000 paise)**
- **Paid Status on Affected Transport Dues**: **₹0 paid across all 80 affected dues**. No parent refunds or receipt rollbacks are required.

---

## 3. Verification of the 333 Missing Ledger Entries

### Categorization & Tenant Isolation

Cross-tenant analysis of `student_dues` vs `fee_ledger` confirms exactly 333 dues have no opening `due_created` entry in `public.fee_ledger`:

1. **Peace Convent School (Active Tenant `b70261ef-37f1-46c8-a148-2c496a9d33a8`)**:
   - **104 Pending Structure Dues**:
     - Gross: 17,960,000 paise (₹1,79,600). Net: 17,960,000 paise. Concession: 0. Balance: 17,960,000 paise.
     - Expected Ledger Entry: `due_created` (+amount_paise matching net_paise).
   - **143 Waived Structure Dues (RTE Quota Students)**:
     - Gross: 21,740,000 paise (₹2,17,400). Concession: 21,740,000 paise. Net: 0 paise. Balance: 0 paise.
     - Expected Ledger Entries:
       - `due_created`: +amount_paise matching gross_paise (+21,740,000 paise)
       - `concession`: -amount_paise matching concession_paise (-21,740,000 paise)
       - Net impact on student ledger balance = 0 paise.
   - **6 Pre-Enrollment Transport Dues (Aanya Choudhary)**:
     - Gross: 480,000 paise (₹4,800).
     - Recommended Action: Mark `status = 'cancelled'`, `balance_paise = 0`. Since no `due_created` was ever inserted for these 6 dues, leaving them uninserted or inserting a paired `due_created` and `cancel_due` maintains a net ledger balance of 0.

2. **Legacy / Test Tenant (`33a509da-9f79-44c0-ad71-372916d04925`)**:
   - **80 Pending Structure Dues**:
     - Gross: 7,960,000 paise (₹79,600). Net: 7,960,000 paise.
     - Belongs to 4 legacy test students (`ADM-2026-0139` to `ADM-2026-0143`).
     - Zero transport dues and zero ledger rows exist in this tenant.

### Existing Ledger Entries Verification (84 Transport Dues)

- All 84 active transport dues that currently have ledger entries were verified.
- In each case, `fl.amount_paise == sd.gross_paise` (100% match, 0 mismatches).
- For the 74 doubled transport dues, their existing ledger entries are ALSO for the doubled amount.
- **Append-Only Compliance**: Rather than mutating existing historical `due_created` ledger rows, the system will insert authorized `adjustment` entries with negative amounts (`-1 * monthly_fee_paise`) referencing the respective `due_id`. This preserves full audit compliance under `fee_ledger_entry_type_check`.

---

## 4. Inspection of Recovery Snapshot

- **File Path**: `scripts/backups/phase2b_financial_backup_pre.json`
- **Size**: 391,876 bytes (Verified on disk)
- **Timestamp**: `2026-10-16T13:16:13.512Z`
- **Scope Verification**:
  - `student_dues`: Exactly 417 records (covers 100% of all dues in the database: 90 transport + 327 structure).
  - `fee_ledger`: Exactly 87 records (covers 100% of all ledger rows).
  - `fee_receipts`: Exactly 2 records.
  - `fee_payments`: Exactly 2 records.
  - `fee_receipt_items`: Exactly 1 record.
  - `fee_credits`: Exactly 1 record.
- **Restorability Assessment**:
  - The snapshot is fully restorable via standard JSON ingestion for the financial transaction tables (`student_dues`, `fee_ledger`, `fee_receipts`, etc.).
  - It does NOT include core identity tables (`students`, `classes`, `schools`), so it is a table-level financial transaction snapshot, not an entire cluster `pg_dump`.
  - All proposed corrections below are strictly isolated to `student_dues` and `fee_ledger`.

---

## 5. Before-and-After Reconciliation Totals (Peace Convent School)

### Student Dues Balance

| Metric | Current Persisted | Proposed Adjustment | Expected Post-Correction |
| :--- | :--- | :--- | :--- |
| **Transport Gross Billed** | ₹1,58,800 (15,880,000 paise) | -₹77,200 (-7,720,000 paise) | **₹81,600 (8,160,000 paise)** |
| **Structure Gross Billed** | ₹3,97,000 (39,700,000 paise) | ₹0 (No change) | **₹3,97,000 (39,700,000 paise)** |
| **Total Gross Demand** | **₹5,55,800 (55,580,000 paise)** | **-₹77,200 (-7,720,000 paise)** | **₹4,78,600 (47,860,000 paise)** |
| **Concessions (RTE Quota)** | ₹2,17,400 (21,740,000 paise) | ₹0 (No change) | **₹2,17,400 (21,740,000 paise)** |
| **Net Payable Dues Demand** | **₹3,38,400 (33,840,000 paise)** | **-₹77,200 (-7,720,000 paise)** | **₹2,61,200 (26,120,000 paise)** |
| **Paid Amount Against Dues** | ₹0 | ₹0 | **₹0** |
| **Outstanding Dues Balance** | **₹3,38,400 (33,840,000 paise)** | **-₹77,200 (-7,720,000 paise)** | **₹2,61,200 (26,120,000 paise)** |

### Fee Ledger Reconciliation

| Metric | Current Persisted | Proposed Adjustment | Expected Post-Correction |
| :--- | :--- | :--- | :--- |
| **Transport Dues in Ledger** | +₹1,54,000 (15,400,000 paise) | -₹72,400 (74 adjustments) | **+₹81,600 (8,160,000 paise)** |
| **Structure Dues in Ledger** | ₹0 (Unsynchronized) | +₹1,79,600 (104 due_created) | **+₹1,79,600 (17,960,000 paise)** |
| **RTE Waived Dues in Ledger** | ₹0 (Unsynchronized) | +₹2,17,400 due_created - ₹2,17,400 concession | **₹0 net (0 paise)** |
| **Unallocated Advance Credit** | -₹1,000 (-100,000 paise) | ₹0 (Ira Roy Receipt #000002) | **-₹1,000 (-100,000 paise)** |
| **Cancelled Payment & Reversal**| -₹500 payment + ₹500 reversal | ₹0 (Abhishek Agarwal Receipt #000003) | **₹0 net (0 paise)** |
| **Total Net Ledger Balance** | **₹1,53,000 (15,300,000 paise)** | **+₹1,07,200 (+10,720,000 paise)** | **₹2,60,200 (26,020,000 paise)** |

> [!NOTE]
> **Mathematical Proof of Exact Reconciliation**:
> Net Payable Dues Balance (₹2,61,200) minus Unallocated Parent Advance Credit (₹1,000) = **₹2,60,200 net student liability**, matching the Fee Ledger balance to the exact paisa!

---

## 6. Records Requiring Manual Review

1. **Student Ira Roy (`ADM-2026-0016`)**:
   - Receipt `MZ/2026–2027/000002` for ₹1,000 (100,000 paise) was deposited in Cash on 2026-10-16 without selecting a specific due.
   - It is correctly stored in `fee_credits` with `remaining_paise = 100,000`.
   - **Recommendation**: Leave unallocated until the cashier or parent explicitly chooses which month's tuition or transport due to apply it against, or auto-apply to the earliest due (April 2026 transport due).
2. **Legacy Tenant `33a509da-9f79-44c0-ad71-372916d04925`**:
   - Contains 80 pending structure dues for 4 students (`ADM-2026-0139` to `ADM-2026-0143`).
   - Completely isolated from Peace Convent School (`b70261ef-37f1-46c8-a148-2c496a9d33a8`).
   - **Recommendation**: Exclude from production backfills unless explicitly instructed to retain this test tenant.

---

## 7. Proposed Correction SQL (Awaiting Explicit Approval)

The following script is designed with atomic transactions, row-level locking, and strict validation assertions. **DO NOT EXECUTE UNTIL EXPLICITLY APPROVED.**

```sql
-- ==============================================================================
-- MyZkool Phase 2D: Atomic Historical Correction Script
-- TARGET TENANT: Peace Convent School (b70261ef-37f1-46c8-a148-2c496a9d33a8)
-- ==============================================================================

BEGIN;

-- 1. Lock affected rows to prevent concurrent mutations
SELECT id FROM public.student_dues 
WHERE school_id = 'b70261ef-37f1-46c8-a148-2c496a9d33a8'
FOR UPDATE;

-- 2. Correct the 74 doubled transport dues
WITH updated_transport AS (
    UPDATE public.student_dues sd
    SET gross_paise = ta.monthly_fee_paise,
        net_paise = ta.monthly_fee_paise - sd.concession_paise,
        balance_paise = ta.monthly_fee_paise - sd.concession_paise - sd.paid_paise,
        updated_at = NOW()
    FROM public.transport_assignments ta
    WHERE sd.source = 'transport'
      AND sd.school_id = 'b70261ef-37f1-46c8-a148-2c496a9d33a8'
      AND ta.student_id = sd.student_id
      AND sd.gross_paise = 2 * ta.monthly_fee_paise
    RETURNING sd.id, sd.school_id, sd.student_id, sd.academic_year_id, ta.monthly_fee_paise
)
-- 3. Append-only ledger adjustments for the 74 corrected transport dues
INSERT INTO public.fee_ledger (
    school_id, student_id, academic_year_id, due_id, entry_type, amount_paise, note, created_at
)
SELECT 
    ut.school_id,
    ut.student_id,
    ut.academic_year_id,
    ut.id,
    'adjustment',
    -1 * ut.monthly_fee_paise,
    'Phase 2D Correction: Rectified transport term month-overlap double billing',
    NOW()
FROM updated_transport ut;

-- 4. Cancel the 6 pre-enrollment transport dues for Aanya Choudhary
UPDATE public.student_dues sd
SET status = 'cancelled',
    balance_paise = 0,
    updated_at = NOW()
FROM public.transport_assignments ta, public.fee_terms ft
WHERE sd.source = 'transport'
  AND sd.school_id = 'b70261ef-37f1-46c8-a148-2c496a9d33a8'
  AND ta.student_id = sd.student_id
  AND ft.id = sd.term_id
  AND ft.period_end < ta.effective_from;

-- 5. Backfill missing opening due_created entries for 104 active structure dues
INSERT INTO public.fee_ledger (
    school_id, student_id, academic_year_id, due_id, entry_type, amount_paise, note, created_at
)
SELECT 
    sd.school_id,
    sd.student_id,
    sd.academic_year_id,
    sd.id,
    'due_created',
    sd.net_paise,
    'Phase 2D Synchronization: Opening structure due ledger entry',
    sd.created_at
FROM public.student_dues sd
LEFT JOIN public.fee_ledger fl ON fl.due_id = sd.id AND fl.entry_type = 'due_created'
WHERE sd.school_id = 'b70261ef-37f1-46c8-a148-2c496a9d33a8'
  AND sd.source = 'structure'
  AND sd.status = 'pending'
  AND fl.id IS NULL;

-- 6. Backfill missing due_created and concession entries for 143 RTE waived dues
INSERT INTO public.fee_ledger (
    school_id, student_id, academic_year_id, due_id, entry_type, amount_paise, note, created_at
)
SELECT 
    sd.school_id,
    sd.student_id,
    sd.academic_year_id,
    sd.id,
    'due_created',
    sd.gross_paise,
    'Phase 2D Synchronization: Opening RTE quota gross structure obligation',
    sd.created_at
FROM public.student_dues sd
LEFT JOIN public.fee_ledger fl ON fl.due_id = sd.id AND fl.entry_type = 'due_created'
WHERE sd.school_id = 'b70261ef-37f1-46c8-a148-2c496a9d33a8'
  AND sd.source = 'structure'
  AND sd.status = 'waived'
  AND fl.id IS NULL;

INSERT INTO public.fee_ledger (
    school_id, student_id, academic_year_id, due_id, entry_type, amount_paise, note, created_at
)
SELECT 
    sd.school_id,
    sd.student_id,
    sd.academic_year_id,
    sd.id,
    'concession',
    -1 * sd.concession_paise,
    'Phase 2D Synchronization: Approved 100% RTE Government Concession',
    sd.created_at
FROM public.student_dues sd
LEFT JOIN public.fee_ledger fl ON fl.due_id = sd.id AND fl.entry_type = 'concession'
WHERE sd.school_id = 'b70261ef-37f1-46c8-a148-2c496a9d33a8'
  AND sd.source = 'structure'
  AND sd.status = 'waived'
  AND fl.id IS NULL;

-- 7. Verification Assertions
DO $$
DECLARE
    v_adj_count int;
    v_cancelled_count int;
    v_structure_count int;
    v_waived_count int;
BEGIN
    SELECT count(*) INTO v_adj_count FROM public.fee_ledger WHERE note LIKE 'Phase 2D Correction: Rectified transport%';
    IF v_adj_count != 74 THEN
        RAISE EXCEPTION 'Assertion failed: expected 74 transport adjustments, found %', v_adj_count;
    END IF;

    SELECT count(*) INTO v_cancelled_count FROM public.student_dues WHERE status = 'cancelled' AND source = 'transport';
    IF v_cancelled_count != 6 THEN
        RAISE EXCEPTION 'Assertion failed: expected 6 cancelled transport dues, found %', v_cancelled_count;
    END IF;
    
    RAISE NOTICE 'Phase 2D SQL Assertions passed successfully.';
END $$;

-- COMMIT; -- (Uncomment when explicitly authorized by user)
ROLLBACK;  -- Default safety guard
```
