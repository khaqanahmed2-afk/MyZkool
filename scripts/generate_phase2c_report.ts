import fs from "fs";
import path from "path";

// Load steps/1485/output.txt to extract the query results
const stepFilePath = "C:/Users/yadav/.gemini/antigravity-ide/brain/a55ddbb7-62ce-4baa-875c-67bc36b43fc3/.system_generated/steps/1485/output.txt";
const stepContent = fs.readFileSync(stepFilePath, "utf8");

const parsedStep = JSON.parse(stepContent);
const rawResult = parsedStep.result;
const jsonStart = rawResult.indexOf("[{");
const jsonEnd = rawResult.lastIndexOf("}]") + 2;
const anomalyRows = JSON.parse(rawResult.slice(jsonStart, jsonEnd));
console.log(`Loaded ${anomalyRows.length} anomaly rows.`);

const reportDir = "c:/Users/yadav/Desktop/MyZkool/reports";
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

let md = `# MyZkool Phase 2C Financial Calculation Audit & Reconciliation Dry-Run Report

**Date & Time**: 2026-10-16 19:40 IST  
**Environment**: Production Database (\`nzphjfsgtkbvfrevduek\`) & Local Application Services  
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

- **Artifact Path**: \`scripts/backups/phase2b_financial_backup_pre.json\`
- **Size**: 391,876 bytes (Verified on disk)
- **Tables Backed Up**:
  - \`student_dues\`: 417 records (337 Peace Convent School, 80 legacy)
  - \`fee_ledger\`: 87 records (84 due_created, 2 payments, 1 reversal)
  - \`fee_receipts\`: 2 records (1 active with advance credit, 1 cancelled with reversal)
  - \`fee_payments\`: 2 records
  - \`fee_receipt_items\`: 1 record
  - \`fee_credits\`: 1 record (₹1,000 advance credit)
- **Restorability Assessment**:
  - **Verdict**: Restorable for fee tables, but **PARTIAL**.
  - **Details**: It represents a comprehensive JSON snapshot of the financial transaction tables and can be restored using a JSON re-hydration script targeting those specific tables. However, it does not contain \`students\`, \`profiles\`, \`schools\`, or auth tables, nor is it a complete \`pg_dump\`. Consequently, all historical corrections remain in dry-run mode until explicitly authorized.

---

## 3. Confirmed Bugs & Root Cause Analysis

### Bug 1: Transport 2x Double-Billing Overlap
- **Root Cause**: In \`feeDuesService.ts\` (\`createTransportDues\`), the term month derivation loop (\`while (cur <= end)\`) began on the 1st of the month of \`term.period_start\`. Because terms are configured with dates like \`2026-04-30\` to \`2026-05-30\` (due to UTC day offsets), \`pStart.getMonth()\` was April (month 4) and \`pEnd.getMonth()\` was May (month 5). The loop iterated across BOTH April and May, counting 2 billable months for every single monthly term from May to March.
- **Affected Dues**: 74 transport dues.
- **Financial Impact**: Current gross ₹1,44,800 vs Expected gross ₹72,400 (Overbilled by ₹72,400).

### Bug 2: Transport Pre-Enrollment Billing
- **Root Cause**: The auto-assignment RPC (\`assign_fee_structure_to_eligible_students\`) looped over all academic year terms without verifying whether the term dates were within the student's transport assignment window (\`effective_from\` to \`effective_to\`).
- **Affected Dues**: 6 transport dues for student Aanya Choudhary (ADM-2026-003) for April through September 2026, despite her transport enrollment starting on \`2026-10-16\`.
- **Financial Impact**: Current gross ₹4,800 vs Expected gross ₹0 (Overbilled by ₹4,800).

### Bug 3: Fee Ledger Desynchronization (Missing \`due_created\` Entries)
- **Root Cause**: Neither \`assign_fee_structure_to_eligible_students\` in SQL nor \`assignFeeStructureToEligibleStudents\` in TypeScript inserted rows into \`public.fee_ledger\` when creating dues.
- **Affected Records**: Exactly 333 dues (184 pending structure, 143 waived structure, 6 transport) have no corresponding ledger entries.

### Bug 4: Collection Summary All-Time Scope & Split Payment Attribution
- **Root Cause**: In \`get_fee_collections_summary\`, Online and Cash payments were queried without date bounds, displaying all-time totals instead of the reporting period. Furthermore, \`feeCollectionsQueryService.ts\` assigned the entire receipt total to the first payment method, misattributing split payments.

### Bug 5: Reports Service Cancelled Dues Inflation
- **Root Cause**: In \`feeReportsService.ts\`, \`dynamicBilledPaise\` summed gross demand across all dues without filtering out \`status === 'cancelled'\`.

---

## 4. Summary of Transport Discrepancies

| Anomaly Category | Record Count | Total Current Billed (Paise / ₹) | Total Expected (Paise / ₹) | Proposed Overbilled Adjustment |
| :--- | :--- | :--- | :--- | :--- |
| **Month Overlap Double-Billing** | 74 dues | 14,480,000 paise (₹1,44,800) | 7,240,000 paise (₹72,400) | **-7,240,000 paise (-₹72,400)** |
| **Pre-Enrollment Billing** | 6 dues | 480,000 paise (₹4,800) | 0 paise (₹0) | **-480,000 paise (-₹4,800)** |
| **Correct Dues (Baseline)** | 10 dues | 920,000 paise (₹9,200) | 920,000 paise (₹9,200) | ₹0 |
| **TOTAL TRANSPORT DUES** | **90 dues** | **15,880,000 paise (₹1,58,800)** | **8,160,000 paise (₹81,600)** | **-7,720,000 paise (-₹77,200)** |

*Payment Verification*: For all 80 overbilled transport dues, \`paid_paise = 0\`. No payments have been collected against these inflated amounts, meaning no parent refund or payment reversal is required.

---

## 5. Summary of Missing Ledger Entries

| Source | Status | Due Count | Gross Amount (Paise / ₹) | Net Amount (Paise / ₹) | Proposed Ledger Entry Type |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Fee Structure** | Pending | 184 | 25,920,000 paise (₹2,59,200) | 25,920,000 paise (₹2,59,200) | \`due_created\` (+Net) |
| **Fee Structure** | Waived (RTE) | 143 | 21,740,000 paise (₹2,17,400) | 0 paise (₹0) | \`due_created\` (+Gross) & \`concession\` (-Gross) |
| **Transport** | Pending | 6 | 480,000 paise (₹4,800) | 480,000 paise (₹4,800) | Cancelled if pre-enrollment approved |
| **TOTAL MISSING** | | **333 dues** | **48,140,000 paise (₹4,81,400)** | **26,400,000 paise (₹2,64,000)** | |

---

## 6. Proposed Corrections Schedule (Dry Run)

Below is the complete itemized schedule of proposed adjustments for all 80 affected transport dues.

| Due ID | Admission No | Term | Current Billed | Expected | Paid | Balance | Proposed Adjustment | Reason |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
`;

for (const row of anomalyRows) {
  const currentRs = (row.gross_paise / 100).toFixed(2);
  const expectedRs = (row.expected_paise / 100).toFixed(2);
  const paidRs = (row.paid_paise / 100).toFixed(2);
  const balanceRs = (row.balance_paise / 100).toFixed(2);
  const adjRs = ((row.expected_paise - row.gross_paise) / 100).toFixed(2);

  md += `| \`${row.due_id.slice(0, 8)}...\` | ${row.admission_no} | ${row.term_name} | ₹${currentRs} | ₹${expectedRs} | ₹${paidRs} | ₹${balanceRs} | **₹${adjRs}** | ${row.reason} |\n`;
}

md += `
---

## 7. Recommended Action Plan for User Approval

Once approved by the system owner:
1. **Apply Transport Dues Correction**:
   - Update the 74 double-billed dues: \`SET gross_paise = ta.monthly_fee_paise, net_paise = ta.monthly_fee_paise, balance_paise = ta.monthly_fee_paise\`.
   - Update the 6 pre-enrollment dues: \`SET status = 'cancelled', balance_paise = 0, note = 'Cancelled: Enrolled after term end'\`.
2. **Backfill Missing Fee Ledger Entries**:
   - Insert \`due_created\` for the 184 active structure dues.
   - Insert \`due_created\` and \`concession\` for the 143 waived structure dues.
3. **Run Nightly Ledger Integrity Verification**:
   - Execute \`runLedgerIntegrityCheck\` to empirically confirm zero student balance mismatches.
`;

fs.writeFileSync(path.join(reportDir, "phase2c_financial_reconciliation_report.md"), md, "utf8");
console.log("Successfully generated reports/phase2c_financial_reconciliation_report.md");
