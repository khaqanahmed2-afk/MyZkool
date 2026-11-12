# Historical Financial & Data Backups Archive

> **Retention Policy:** Permanent Legal and Financial Audit Trail  
> **Classification:** Category D — Historical Records (Do Not Delete)  
> **Audited Date:** 2026-11-11

---

## Inventory of Archived Records

| File Name | Size | Purpose | Description |
|---|---|---|---|
| `peace_convent_students.json` | 27 KB | Student Onboarding Snapshot | 100 historical student profile records from initial school onboarding reconciliation. |
| `phase2b_financial_backup_pre.json` | 401 KB | Pre-Phase 2b Ledger Capture | Point-in-time state of `fee_receipts`, `fee_payments`, and `student_dues` prior to migration. |
| `phase2b_financial_recovery.sql` | 462 KB | Emergency Recovery SQL | Transactional SQL statements generated to restore fee balances during Phase 2b repairs. |
| `phase2d_pre_commit_backup_20261017.json` | 401 KB | Pre-Commit Ledger State | Live database state captured on 2026-10-17 prior to applying final financial integrity fixes. |
| `phase2d_post_repair_live_backup_20261017.json` | 686 KB | Post-Repair Live Backup | Verification snapshot confirming fee balance zero-discrepancy state post repair. |

---

## Security and Compliance Notice

- These records reflect historical audit evidence and must be preserved for financial accountability.
- Future database dumps and temporary CSV imports should be placed in `archive/` and kept untracked in version control if containing live unmasked PII.
