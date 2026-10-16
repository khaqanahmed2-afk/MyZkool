# MyZkool Phase 2C Financial Calculation Audit & Reconciliation Dry-Run Report

**Date & Time**: 2026-10-16 19:40 IST  
**Environment**: Production Database (`nzphjfsgtkbvfrevduek`) & Local Application Services  
**Auditor**: Senior PostgreSQL, Supabase, React, and TypeScript Engineer  
**Status**: READ-ONLY DRY-RUN COMPLETE (No historical records modified)

---

## 1. Executive Summary

This audit investigated and repaired the underlying financial calculation inconsistencies across MyZkool's fee module:
- Fee structure auto-assignment and billing frequency multipliers
- Transport fee term derivation and assignment boundary enforcement
- Append-only fee ledger synchronization
- Collection summary period scoping and split-payment aggregation
- Financial reports metrics baseline calculation (excluding cancelled dues)

All root causes have been fixed at the application service level and database RPC level via forward-only idempotent migrations. Zero historical records have been mutated; all proposed historical corrections are documented below in this dry-run report awaiting explicit user approval.

---

## 2. Recovery Artifact Verification

- **Artifact Path**: `scripts/backups/phase2b_financial_backup_pre.json`
- **Size**: 391,876 bytes (Verified on disk)
- **Tables Backed Up**:
  - `student_dues`: 417 records (337 Peace Convent School, 80 legacy)
  - `fee_ledger`: 87 records (84 due_created, 2 payments, 1 reversal)
  - `fee_receipts`: 2 records (1 active with advance credit, 1 cancelled with reversal)
  - `fee_payments`: 2 records
  - `fee_receipt_items`: 1 record
  - `fee_credits`: 1 record (₹1,000 advance credit)
- **Restorability Assessment**:
  - **Verdict**: Restorable for fee tables, but **PARTIAL**.
  - **Details**: It represents a comprehensive JSON snapshot of the financial transaction tables and can be restored using a JSON re-hydration script targeting those specific tables. However, it does not contain `students`, `profiles`, `schools`, or auth tables, nor is it a complete `pg_dump`. Consequently, all historical corrections remain in dry-run mode until explicitly authorized.

---

## 3. Confirmed Bugs & Root Cause Analysis

### Bug 1: Transport 2x Double-Billing Overlap
- **Root Cause**: In `feeDuesService.ts` (`createTransportDues`), the term month derivation loop (`while (cur <= end)`) began on the 1st of the month of `term.period_start`. Because terms are configured with dates like `2026-04-30` to `2026-05-30` (due to UTC day offsets), `pStart.getMonth()` was April (month 4) and `pEnd.getMonth()` was May (month 5). The loop iterated across BOTH April and May, counting 2 billable months for every single monthly term from May to March.
- **Affected Dues**: 74 transport dues.
- **Financial Impact**: Current gross ₹1,44,800 vs Expected gross ₹72,400 (Overbilled by ₹72,400).

### Bug 2: Transport Pre-Enrollment Billing
- **Root Cause**: The auto-assignment RPC (`assign_fee_structure_to_eligible_students`) looped over all academic year terms without verifying whether the term dates were within the student's transport assignment window (`effective_from` to `effective_to`).
- **Affected Dues**: 6 transport dues for student Aanya Choudhary (ADM-2026-003) for April through September 2026, despite her transport enrollment starting on `2026-10-16`.
- **Financial Impact**: Current gross ₹4,800 vs Expected gross ₹0 (Overbilled by ₹4,800).

### Bug 3: Fee Ledger Desynchronization (Missing `due_created` Entries)
- **Root Cause**: Neither `assign_fee_structure_to_eligible_students` in SQL nor `assignFeeStructureToEligibleStudents` in TypeScript inserted rows into `public.fee_ledger` when creating dues.
- **Affected Records**: Exactly 333 dues (184 pending structure, 143 waived structure, 6 transport) have no corresponding ledger entries.

### Bug 4: Collection Summary All-Time Scope & Split Payment Attribution
- **Root Cause**: In `get_fee_collections_summary`, Online and Cash payments were queried without date bounds, displaying all-time totals instead of the reporting period. Furthermore, `feeCollectionsQueryService.ts` assigned the entire receipt total to the first payment method, misattributing split payments.

### Bug 5: Reports Service Cancelled Dues Inflation
- **Root Cause**: In `feeReportsService.ts`, `dynamicBilledPaise` summed gross demand across all dues without filtering out `status === 'cancelled'`.

---

## 4. Summary of Transport Discrepancies

| Anomaly Category | Record Count | Total Current Billed (Paise / ₹) | Total Expected (Paise / ₹) | Proposed Overbilled Adjustment |
| :--- | :--- | :--- | :--- | :--- |
| **Month Overlap Double-Billing** | 74 dues | 14,480,000 paise (₹1,44,800) | 7,240,000 paise (₹72,400) | **-7,240,000 paise (-₹72,400)** |
| **Pre-Enrollment Billing** | 6 dues | 480,000 paise (₹4,800) | 0 paise (₹0) | **-480,000 paise (-₹4,800)** |
| **Correct Dues (Baseline)** | 10 dues | 920,000 paise (₹9,200) | 920,000 paise (₹9,200) | ₹0 |
| **TOTAL TRANSPORT DUES** | **90 dues** | **15,880,000 paise (₹1,58,800)** | **8,160,000 paise (₹81,600)** | **-7,720,000 paise (-₹77,200)** |

*Payment Verification*: For all 80 overbilled transport dues, `paid_paise = 0`. No payments have been collected against these inflated amounts, meaning no parent refund or payment reversal is required.

---

## 5. Summary of Missing Ledger Entries

| Source | Status | Due Count | Gross Amount (Paise / ₹) | Net Amount (Paise / ₹) | Proposed Ledger Entry Type |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Fee Structure** | Pending | 184 | 25,920,000 paise (₹2,59,200) | 25,920,000 paise (₹2,59,200) | `due_created` (+Net) |
| **Fee Structure** | Waived (RTE) | 143 | 21,740,000 paise (₹2,17,400) | 0 paise (₹0) | `due_created` (+Gross) & `concession` (-Gross) |
| **Transport** | Pending | 6 | 480,000 paise (₹4,800) | 480,000 paise (₹4,800) | Cancelled if pre-enrollment approved |
| **TOTAL MISSING** | | **333 dues** | **48,140,000 paise (₹4,81,400)** | **26,400,000 paise (₹2,64,000)** | |

---

## 6. Proposed Corrections Schedule (Dry Run)

Below is the complete itemized schedule of proposed adjustments for all 80 affected transport dues.

| Due ID | Admission No | Term | Current Billed | Expected | Paid | Balance | Proposed Adjustment | Reason |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `54009d28...` | ADM-2026-0009 | November 2026 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `e538fd2a...` | ADM-2026-0009 | December 2026 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `b61cbcb9...` | ADM-2026-0009 | January 2027 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `8de75750...` | ADM-2026-0009 | February 2027 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `2f6b95ff...` | ADM-2026-0009 | March 2027 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `c58e9d77...` | ADM-2026-0010 | November 2026 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `a6b0cd9c...` | ADM-2026-0010 | December 2026 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `6a24fee9...` | ADM-2026-0010 | January 2027 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `75d101ed...` | ADM-2026-0010 | February 2027 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `d281ea16...` | ADM-2026-0010 | March 2027 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `87a92696...` | ADM-2026-0016 | May 2026 | ₹2000.00 | ₹1000.00 | ₹0.00 | ₹2000.00 | **₹-1000.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `7370bedd...` | ADM-2026-0016 | June 2026 | ₹2000.00 | ₹1000.00 | ₹0.00 | ₹2000.00 | **₹-1000.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `d238ca30...` | ADM-2026-0016 | July 2026 | ₹2000.00 | ₹1000.00 | ₹0.00 | ₹2000.00 | **₹-1000.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `d842a5c6...` | ADM-2026-0016 | August 2026 | ₹2000.00 | ₹1000.00 | ₹0.00 | ₹2000.00 | **₹-1000.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `1750f227...` | ADM-2026-0016 | September 2026 | ₹2000.00 | ₹1000.00 | ₹0.00 | ₹2000.00 | **₹-1000.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `3d353dc7...` | ADM-2026-0016 | October 2026 | ₹2000.00 | ₹1000.00 | ₹0.00 | ₹2000.00 | **₹-1000.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `628ab4b1...` | ADM-2026-0016 | November 2026 | ₹2000.00 | ₹1000.00 | ₹0.00 | ₹2000.00 | **₹-1000.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `adc13410...` | ADM-2026-0016 | December 2026 | ₹2000.00 | ₹1000.00 | ₹0.00 | ₹2000.00 | **₹-1000.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `47f39a56...` | ADM-2026-0016 | January 2027 | ₹2000.00 | ₹1000.00 | ₹0.00 | ₹2000.00 | **₹-1000.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `617c599a...` | ADM-2026-0016 | February 2027 | ₹2000.00 | ₹1000.00 | ₹0.00 | ₹2000.00 | **₹-1000.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `69af07e2...` | ADM-2026-0016 | March 2027 | ₹2000.00 | ₹1000.00 | ₹0.00 | ₹2000.00 | **₹-1000.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `f4d9a9ac...` | ADM-2026-0031 | May 2026 | ₹2000.00 | ₹1000.00 | ₹0.00 | ₹2000.00 | **₹-1000.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `4c475d77...` | ADM-2026-0031 | June 2026 | ₹2000.00 | ₹1000.00 | ₹0.00 | ₹2000.00 | **₹-1000.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `aed04fb7...` | ADM-2026-0031 | July 2026 | ₹2000.00 | ₹1000.00 | ₹0.00 | ₹2000.00 | **₹-1000.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `a06a2b4b...` | ADM-2026-0031 | August 2026 | ₹2000.00 | ₹1000.00 | ₹0.00 | ₹2000.00 | **₹-1000.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `720e6c8b...` | ADM-2026-0031 | September 2026 | ₹2000.00 | ₹1000.00 | ₹0.00 | ₹2000.00 | **₹-1000.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `4c12e882...` | ADM-2026-0031 | October 2026 | ₹2000.00 | ₹1000.00 | ₹0.00 | ₹2000.00 | **₹-1000.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `45a88651...` | ADM-2026-0031 | November 2026 | ₹2000.00 | ₹1000.00 | ₹0.00 | ₹2000.00 | **₹-1000.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `2a5b6ead...` | ADM-2026-0031 | December 2026 | ₹2000.00 | ₹1000.00 | ₹0.00 | ₹2000.00 | **₹-1000.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `4c50b24c...` | ADM-2026-0031 | January 2027 | ₹2000.00 | ₹1000.00 | ₹0.00 | ₹2000.00 | **₹-1000.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `150824a3...` | ADM-2026-0031 | February 2027 | ₹2000.00 | ₹1000.00 | ₹0.00 | ₹2000.00 | **₹-1000.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `afcc57b3...` | ADM-2026-0031 | March 2027 | ₹2000.00 | ₹1000.00 | ₹0.00 | ₹2000.00 | **₹-1000.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `93a374f4...` | ADM-2026-0037 | November 2026 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `a4716e31...` | ADM-2026-0037 | December 2026 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `8c4dd8e5...` | ADM-2026-0037 | January 2027 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `80514d9d...` | ADM-2026-0037 | February 2027 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `b89d8e32...` | ADM-2026-0037 | March 2027 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `7c126024...` | ADM-2026-0061 | May 2026 | ₹2400.00 | ₹1200.00 | ₹0.00 | ₹2400.00 | **₹-1200.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `f3197c0e...` | ADM-2026-0061 | June 2026 | ₹2400.00 | ₹1200.00 | ₹0.00 | ₹2400.00 | **₹-1200.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `dd1c9540...` | ADM-2026-0061 | July 2026 | ₹2400.00 | ₹1200.00 | ₹0.00 | ₹2400.00 | **₹-1200.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `0abc2031...` | ADM-2026-0061 | August 2026 | ₹2400.00 | ₹1200.00 | ₹0.00 | ₹2400.00 | **₹-1200.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `d9f46ac5...` | ADM-2026-0061 | September 2026 | ₹2400.00 | ₹1200.00 | ₹0.00 | ₹2400.00 | **₹-1200.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `7efc2dfe...` | ADM-2026-0061 | October 2026 | ₹2400.00 | ₹1200.00 | ₹0.00 | ₹2400.00 | **₹-1200.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `ec1caa29...` | ADM-2026-0061 | November 2026 | ₹2400.00 | ₹1200.00 | ₹0.00 | ₹2400.00 | **₹-1200.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `9e54ee56...` | ADM-2026-0061 | December 2026 | ₹2400.00 | ₹1200.00 | ₹0.00 | ₹2400.00 | **₹-1200.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `924163e9...` | ADM-2026-0061 | January 2027 | ₹2400.00 | ₹1200.00 | ₹0.00 | ₹2400.00 | **₹-1200.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `90d21b8c...` | ADM-2026-0061 | February 2027 | ₹2400.00 | ₹1200.00 | ₹0.00 | ₹2400.00 | **₹-1200.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `fde010a4...` | ADM-2026-0061 | March 2027 | ₹2400.00 | ₹1200.00 | ₹0.00 | ₹2400.00 | **₹-1200.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `f84b151c...` | ADM-2026-0068 | November 2026 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `1e8fa744...` | ADM-2026-0068 | December 2026 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `d1a85ac7...` | ADM-2026-0068 | January 2027 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `66ad0fe1...` | ADM-2026-0068 | February 2027 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `8429a659...` | ADM-2026-0068 | March 2027 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `1163d007...` | ADM-2026-0074 | April 2026 | ₹800.00 | ₹0.00 | ₹0.00 | ₹800.00 | **₹-800.00** | Pre-enrollment billing: Term ended before transport assignment start |
| `ed61aef6...` | ADM-2026-0074 | May 2026 | ₹800.00 | ₹0.00 | ₹0.00 | ₹800.00 | **₹-800.00** | Pre-enrollment billing: Term ended before transport assignment start |
| `70a5fe1d...` | ADM-2026-0074 | June 2026 | ₹800.00 | ₹0.00 | ₹0.00 | ₹800.00 | **₹-800.00** | Pre-enrollment billing: Term ended before transport assignment start |
| `e06b633e...` | ADM-2026-0074 | July 2026 | ₹800.00 | ₹0.00 | ₹0.00 | ₹800.00 | **₹-800.00** | Pre-enrollment billing: Term ended before transport assignment start |
| `ac093eb2...` | ADM-2026-0074 | August 2026 | ₹800.00 | ₹0.00 | ₹0.00 | ₹800.00 | **₹-800.00** | Pre-enrollment billing: Term ended before transport assignment start |
| `ceb18229...` | ADM-2026-0074 | September 2026 | ₹800.00 | ₹0.00 | ₹0.00 | ₹800.00 | **₹-800.00** | Pre-enrollment billing: Term ended before transport assignment start |
| `679f6e19...` | ADM-2026-0074 | November 2026 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `f8b449b2...` | ADM-2026-0074 | December 2026 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `6946a434...` | ADM-2026-0074 | January 2027 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `d30d773b...` | ADM-2026-0074 | February 2027 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `0c974e0a...` | ADM-2026-0074 | March 2027 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `7a7a7d57...` | ADM-2026-0091 | May 2026 | ₹2400.00 | ₹1200.00 | ₹0.00 | ₹2400.00 | **₹-1200.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `37d1fd89...` | ADM-2026-0091 | June 2026 | ₹2400.00 | ₹1200.00 | ₹0.00 | ₹2400.00 | **₹-1200.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `dc3c073a...` | ADM-2026-0091 | July 2026 | ₹2400.00 | ₹1200.00 | ₹0.00 | ₹2400.00 | **₹-1200.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `7fce04f8...` | ADM-2026-0091 | August 2026 | ₹2400.00 | ₹1200.00 | ₹0.00 | ₹2400.00 | **₹-1200.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `57fea092...` | ADM-2026-0091 | September 2026 | ₹2400.00 | ₹1200.00 | ₹0.00 | ₹2400.00 | **₹-1200.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `c04b3c29...` | ADM-2026-0091 | October 2026 | ₹2400.00 | ₹1200.00 | ₹0.00 | ₹2400.00 | **₹-1200.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `2af11e2f...` | ADM-2026-0091 | November 2026 | ₹2400.00 | ₹1200.00 | ₹0.00 | ₹2400.00 | **₹-1200.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `3d32e35b...` | ADM-2026-0091 | December 2026 | ₹2400.00 | ₹1200.00 | ₹0.00 | ₹2400.00 | **₹-1200.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `6f0fb2fd...` | ADM-2026-0091 | January 2027 | ₹2400.00 | ₹1200.00 | ₹0.00 | ₹2400.00 | **₹-1200.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `816e37a0...` | ADM-2026-0091 | February 2027 | ₹2400.00 | ₹1200.00 | ₹0.00 | ₹2400.00 | **₹-1200.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `7765bf80...` | ADM-2026-0091 | March 2027 | ₹2400.00 | ₹1200.00 | ₹0.00 | ₹2400.00 | **₹-1200.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `d1790b6e...` | ADM-2026-0098 | November 2026 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `01d55f7d...` | ADM-2026-0098 | December 2026 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `09327627...` | ADM-2026-0098 | January 2027 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `55f6c3ea...` | ADM-2026-0098 | February 2027 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |
| `edcc565a...` | ADM-2026-0098 | March 2027 | ₹1600.00 | ₹800.00 | ₹0.00 | ₹1600.00 | **₹-800.00** | Double billing: Previous month overlap bug doubled term multiplier |

---

## 7. Recommended Action Plan for User Approval

Once approved by the system owner:
1. **Apply Transport Dues Correction**:
   - Update the 74 double-billed dues: `SET gross_paise = ta.monthly_fee_paise, net_paise = ta.monthly_fee_paise, balance_paise = ta.monthly_fee_paise`.
   - Update the 6 pre-enrollment dues: `SET status = 'cancelled', balance_paise = 0, note = 'Cancelled: Enrolled after term end'`.
2. **Backfill Missing Fee Ledger Entries**:
   - Insert `due_created` for the 184 active structure dues.
   - Insert `due_created` and `concession` for the 143 waived structure dues.
3. **Run Nightly Ledger Integrity Verification**:
   - Execute `runLedgerIntegrityCheck` to empirically confirm zero student balance mismatches.
