# MyZkool: Data Retention & Complete Purge Policy

**Document Ref**: DP-POL-2026-V1  
**Jurisdiction**: India (Digital Personal Data Protection Act 2023, IT Act 2000, Companies Act 2013 §128)  
**Effective Date**: October 2026  

---

## 1. Overview & Primary Objective

This policy outlines MyZkool's technical and legal protocols for complete user data purge, account deletion, and multi-tenant school decommissioning. The objective is to leave **zero orphaned records, abandoned drafts, or unnecessary personal data** when a user or institution terminates their relationship with the platform.

---

## 2. Distinction Between Workflows

| Characteristic | Personal Account Deletion (`Delete My Account`) | School Tenant Purge (`Delete School & All Data`) |
|---|---|---|
| **Initiator** | Any authenticated user (staff, clerk, teacher, admin) | Verified School Owner / Registered Creator Only |
| **Prerequisites** | Must **not** be the sole registered owner of an active school | Requires typing exact school name, owner password, and 3 explicit risk acknowledgments |
| **Multi-Tenant Rule** | Never cascades to destroy a school tenant | Completely destroys the specified school tenant only; preserves all other tenants |
| **Destruction Scope** | Auth user, profile, drafts, sessions, push tokens, personal files | All students, staff, classes, fees, dues, routes, website, and `{schoolId}/*` Storage files |
| **Financial Records** | Anonymized: actor references set to `NULL` to maintain double-entry audit consistency | Completely erased along with tenant database rows and receipts |

---

## 3. Mandatory Statutory Retention vs. Privacy Anonymization

When an employee or administrator requests account deletion while their school remains active, Indian statutory regulations mandate retention of corporate accounting books and tax receipts:

### 3.1 Applicable Indian Legislation
1. **Companies Act 2013, Section 128**: Every company/educational entity shall prepare and keep at its registered office books of account and other relevant papers and financial statement for every financial year for a period of not less than **eight financial years**.
2. **Income Tax Act 1961, Section 44AA**: Mandatory maintenance of accounts and documents for charitable and educational trusts.
3. **Goods & Services Tax (GST) Act, Section 36**: Accounts and other records must be retained for at least 72 months (6 years) from the due date of furnishing of annual return.
4. **Digital Personal Data Protection Act (DPDPA) 2023, Section 17(1)(b)**: Exempts data processing from erasure obligations where necessary for compliance with any law for the time being in force in India.

### 3.2 Technical Implementation (Anonymization Pattern)
- When a user deletes their account:
  - `public.fee_ledger.created_by` $\rightarrow$ `NULL`
  - `public.fee_receipts.collected_by` $\rightarrow$ `NULL`
  - `public.fee_receipts.cancelled_by` $\rightarrow$ `NULL`
  - `public.day_closings.closed_by` $\rightarrow$ `NULL`
  - `public.fee_audit_log.actor_id` $\rightarrow$ `NULL`
  - `public.audit_logs.actor_id` $\rightarrow$ `NULL`
- The double-entry ledger totals, receipt sequence numbers, and financial balances are intact, but all personal links to the deleted human being are severed.

---

## 4. Complete Tenant Decommissioning (School Purge)

When the authorized School Owner explicitly decommissions an institution:
1. **Storage Assets Purged**: All files located in `school-assets` with prefix `{school_id}/` (logos, brochures, vehicle RC copies, student photos, staff documents) are removed via atomic batch deletion.
2. **PostgreSQL Cascade Purge**: Root record `public.schools(id)` is deleted. By database foreign key architecture, all 80+ tenant tables cascade delete in a single ACID transaction.
3. **Independent Verification**: A post-deletion query scans all tables and Storage buckets confirming that remaining rows count is exactly **0**.
4. **Audit Manifest**: A machine-readable JSON tombstone is appended to `public.deletion_audit_logs` documenting the event, purged row metrics, and timestamp.

---

## 5. Security & Safeguards

- **No Client-Supplied Trust**: Tenant identification and user identity are extracted solely from cryptographically signed Supabase Auth JWTs on the server.
- **Service Role Protection**: Deletion functions execute via secure `SECURITY DEFINER` database RPCs; service-role keys are never exposed in browser bundles.
- **Re-Authentication Required**: Destructive actions mandate immediate password validation to protect against session hijacking or unlocked terminal abuse.
- **Tombstone Immutability**: `deletion_audit_logs` records cannot be updated or deleted by tenants.
