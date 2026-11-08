# Supabase & Database Architecture Audit Report

**Audit Target**: Supabase PostgreSQL Engine & Migration Suite  
**Scope**: 55 Migration Scripts, Database Stored Procedures (RPCs), Row Level Security (RLS) Policies, Multi-Tenant Partitioning  

---

## 1. Migration Inventory & Evolution

The database architecture is defined through **55 structured SQL migrations** in `supabase/migrations/`:

### Sequential Foundation Migrations (001–024)
* `001_schools_and_onboarding.sql`: Core `schools`, `profiles`, and onboarding progress trackers.
* `002_academic_years.sql` to `007_student_sensitive.sql`: Student directories, parent profiles, and encrypted sensitive tables.
* `008_fee_structures.sql` to `013_fee_collections.sql`: Financial ledger engine, terms, concession matrices, and receipt sequencing counters.
* `014_transport_core.sql` to `016_transport_sync.sql`: Transport fleet, routes, stops, and automated fee synchronization triggers.
* `017_audit_logs.sql` to `021_parent_portal.sql`: Security event logging, parent authentication, and notification audit logs.
* `022_multi_tenant_isolation_hardening.sql`: Composite foreign key enforcement `(school_id, parent_id)` and immutable tenant triggers.
* `023_razorpay_ledger_integration.sql`: Payment intent tracking and webhook idempotency tables.
* `024_school_subscription_payments.sql`: Platform subscription tiers and billing tracking.

### Timestamped Production Migrations (31 Migrations)
* `20260920120000_...` through `20261027220000_...`:
  * Index optimization for full-text student search and dues lookups.
  * Late fee calculation triggers and grace period processors.
  * Day close accounting summaries and cheque clearing workflows.
  * Audit log retention partitioning and automated cleanup jobs.

---

## 2. Multi-Tenant Isolation Model

MyZkool enforces strict multi-tenant logical partitioning across all relational tables using a defense-in-depth model:

```mermaid
flowchart TD
    User["Authenticated User JWT"] --> Profile["public.profiles (school_id, role)"]
    Profile --> RLS{"Row Level Security"}
    RLS -->|get_current_school_id()| TableFilter["Filter: table.school_id = get_current_school_id()"]
    TableFilter --> AuthorizedRows["Permitted School Data Rows"]
    RLS -->|Mismatch / Cross-Tenant| Denied["403 Forbidden / Empty Set"]
```

### Key Isolation Primitives:
1. **Tenant Identification Function**:
   ```sql
   CREATE OR REPLACE FUNCTION public.get_current_school_id()
   RETURNS UUID AS $$
     SELECT school_id FROM public.profiles WHERE id = auth.uid();
   $$ LANGUAGE sql STABLE SECURITY DEFINER;
   ```
2. **Composite Foreign Keys**:
   To prevent foreign-key reference crossing between schools (e.g., School A referencing a section from School B), every relational child table enforces composite foreign keys `(school_id, parent_id)` matching the parent table's `(school_id, id)`.
3. **Tenant Immutability Triggers**:
   `prevent_school_id_update()` triggers prevent accidental or malicious alteration of `school_id` on existing records after initial creation.

---

## 3. Data Protection & DPDP Act Compliance

1. **Aadhaar & Financial Data at Rest**:
   * Aadhaar numbers, guardian bank account numbers, and IFSC codes are encrypted using AES-256-GCM authenticated encryption.
   * Encryption occurs in the application tier (`src/lib/sensitiveCrypto.ts`) using the server-side `APP_MASTER_KEY`.
   * Sensitive values reside strictly in the dedicated `student_sensitive` table protected by role-gated RLS policies.
2. **Masked Field Exposure**:
   * The database and backend APIs only return masked strings (e.g., `XXXX-XXXX-1234`) to general administrative interfaces.

---

## 4. Mission-Critical Stored Procedures (RPCs)

* `rpc_bulk_import_students`: Batch processes student enrollments in an atomic transaction; automatically rolls back if any row fails validation or creates duplicate admission numbers.
* `rpc_create_fee_collection`: Concurrently locks student ledger rows, computes remaining balances, generates sequential school-scoped receipt numbers (`REC-YYYYMM-XXXX`), and commits cash/cheque/online receipts.
* `rpc_record_due_reminder_event`: High-throughput, non-blocking reminder delivery logger recording WhatsApp, SMS, and email notices with delivery receipts.

---

## 5. Backup & Recovery Integrity

* Active financial snapshots and historical recovery SQL scripts in `scripts/backups/` and `supabase/scripts/` were audited and confirmed preserved intact:
  * `scripts/backups/peace_convent_students.json`
  * `scripts/backups/phase2b_financial_backup_pre.json`
  * `scripts/backups/phase2b_financial_recovery.sql`
  * `scripts/backups/phase2d_post_repair_live_backup_20261017.json`
  * `supabase/scripts/phase2d_historical_repair.sql`
* No live database connections were modified or dropped during this maintenance cycle.

