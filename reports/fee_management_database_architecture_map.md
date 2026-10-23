# MyZkool Fee Management Database Architecture: Refactoring & Verification Map

**Document Version**: 2.0 (Post-Refactoring Architecture Verification)  
**Execution Timestamp**: 2026-10-17T20:55:00+05:30  
**Environment**: Production Supabase PostgreSQL (`nzphjfsgtkbvfrevduek`)  
**Target School**: Peace Convent School (`b70261ef-37f1-46c8-a148-2c496a9d33a8`)  
**Target Academic Year**: 2026–2027 (`a0171c28-e12c-4485-ac27-e0b010607e1f`)  

---

## 1. Executive Summary & Architectural Integrity

The MyZkool Fee Management PostgreSQL database architecture has undergone comprehensive inspection, hardening, and multi-tenant refactoring. The system now enforces strict relational integrity, immutable double-entry financial history, robust duplicate-billing prevention, and complete multi-tenant authorization boundaries at the database engine level.

### Key Invariants Maintained & Verified
- **Financial Balance Invariant**: Net Active Outstanding strictly equals **₹2,60,200.00** (26,020,000 paise). Gross Outstanding equals **₹2,61,200.00** (26,120,000 paise) with exactly **₹1,000.00** (100,000 paise) in unallocated advance credit offset.
- **Three-Way Accounting Reconciliation**: Student Ledger Net Pending (₹2,60,200.00) == Fee Reports Net Pending (₹2,60,200.00) == Fee Ledger Journal Sum (₹2,60,200.00) with **₹0.00 / 0 paise discrepancy**.
- **Append-Only Immutability**: `fee_ledger` entries cannot be deleted or mutated by any role; updates and deletes trigger immediate exceptions.
- **Strict Server-Side Authorization**: 100% of fee and transport table RLS policies enforce both `USING` and explicit `WITH CHECK` clauses, guaranteeing tenant containment on inserts and updates.
- **Regression Test Coverage**: All test suites passed:
  - `tests/test-financial-calculation-engine.ts`: **38/38 Passed**
  - `tests/test-phase2d-reconciliation.ts`: **25/25 Passed**
  - `tests/test-phase2b-invoice-reliability.ts`: **31/31 Passed**
  - TypeScript Compiler (`npx tsc --noEmit`): **0 errors**

---

## 2. Comprehensive Schema Map: Fee & Transport Entities

The fee management subsystem spans 30 PostgreSQL tables, categorized into Financial Facts, Fee Configuration, Junction & Allocation entities, and Transport modules.

### A. Financial Transactional Facts (Historical, Ledger & Invoices)

| Table | Primary Key | Tenant Key | Foreign Keys | Key Constraints & Invariants | Immutability / Triggers |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `student_dues` | `id` | `school_id` | `(school_id, student_id)` &rarr; `students`<br>`(school_id, fee_head_id)` &rarr; `fee_heads`<br>`(school_id, term_id)` &rarr; `fee_terms`<br>`(school_id, academic_year_id)` &rarr; `academic_years` | `net_paise = gross_paise - concession_paise`<br>`balance_paise = net_paise - paid_paise`<br>`paid_paise <= net_paise`<br>`concession_paise <= gross_paise` | `trigger_prevent_school_id_update`<br>`trigger_student_dues_updated_at` |
| `fee_ledger` | `id` | `school_id` | `(school_id, student_id)` &rarr; `students`<br>`(school_id, due_id)` &rarr; `student_dues`<br>`(school_id, receipt_id)` &rarr; `fee_receipts`<br>`(school_id, academic_year_id)` &rarr; `academic_years` | `chk_fee_ledger_amount_nonzero` (`amount_paise <> 0`)<br>`entry_type` in (`due_created`, `concession`, `payment`, `refund`, `reversal`, `waiver`, `late_fee`, `adjustment`, `carry_forward`, `cancel_due`) | `trg_fee_ledger_immutable` (UPDATE)<br>`trg_fee_ledger_prevent_delete` (DELETE)<br>`trigger_prevent_school_id_update` |
| `fee_receipts` | `id` | `school_id` | `(school_id, student_id)` &rarr; `students`<br>`(school_id, academic_year_id)` &rarr; `academic_years` | `total_paise >= 0`<br>`unique_receipt_no_per_school (school_id, receipt_no)`<br>`unique_fee_receipts_school_id_id (school_id, id)` | `trigger_prevent_school_id_update`<br>`trg_fee_receipts_updated_at` |
| `fee_receipt_items` | `id` | `school_id` | `(school_id, receipt_id)` &rarr; `fee_receipts`<br>`(school_id, due_id)` &rarr; `student_dues`<br>`(school_id, fee_head_id)` &rarr; `fee_heads` | `amount_paise >= 0`<br>`concession_paise >= 0` | `trg_fee_receipt_items_tenant_check` (validates due, receipt & item school alignment) |
| `fee_payments` | `id` | `school_id` | `(school_id, receipt_id)` &rarr; `fee_receipts` | `amount_paise > 0`<br>`mode` enum check | `trigger_prevent_school_id_update` |
| `fee_credits` | `id` | `school_id` | `(school_id, student_id)` &rarr; `students`<br>`(school_id, source_receipt_id)` &rarr; `fee_receipts`<br>`(school_id, academic_year_id)` &rarr; `academic_years` | `amount_paise > 0`<br>`remaining_paise >= 0`<br>`remaining_paise <= amount_paise` | `trigger_prevent_school_id_update` |

### B. Fee Configuration & Setup

| Table | Primary Key | Tenant Key | Foreign Keys | Key Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `fee_heads` | `id` | `school_id` | `school_id` &rarr; `schools` | `unique_fee_head_code_per_school (school_id, code)`<br>`unique_fee_heads_school_id_id (school_id, id)` |
| `fee_terms` | `id` | `school_id` | `(school_id, academic_year_id)` &rarr; `academic_years` | `unique_fee_terms_school_id_id (school_id, id)` |
| `fee_structures` | `id` | `school_id` | `(school_id, academic_year_id)` &rarr; `academic_years` | `unique_active_structure_per_class (academic_year_id, class_id, applies_to)` WHERE status='active' |
| `fee_structure_items` | `id` | `school_id` | `(school_id, structure_id)` &rarr; `fee_structures`<br>`(school_id, fee_head_id)` &rarr; `fee_heads` | `unique_structure_head (structure_id, fee_head_id)`<br>`unique_fee_structure_items_school_id_id (school_id, id)` |
| `fee_structure_item_terms`| `(item_id, term_id)` | Via item | `item_id` &rarr; `fee_structure_items`<br>`term_id` &rarr; `fee_terms` | Primary key on composite pair |
| `fee_structure_classes` | `id` | `school_id` | `(school_id, fee_structure_id)` &rarr; `fee_structures`<br>`(school_id, class_id)` &rarr; `classes` | `unique_fs_class (school_id, fee_structure_id, class_id)` |
| `fee_structure_sections` | `id` | `school_id` | `(school_id, fee_structure_id)` &rarr; `fee_structures`<br>`(school_id, section_id)` &rarr; `sections` | `unique_fs_section (school_id, fee_structure_id, section_id)` |
| `concession_rules` | `id` | `school_id` | `(school_id, academic_year_id)` &rarr; `academic_years` | `unique_concession_name_per_school (school_id, lower(trim(name)))` |
| `concession_rule_fee_heads` | `id` | `school_id` | `(school_id, rule_id)` &rarr; `concession_rules`<br>`(school_id, fee_head_id)` &rarr; `fee_heads` | `unique_concession_rule_head (school_id, rule_id, fee_head_id)` |
| `late_fee_rules` | `id` | `school_id` | `school_id` &rarr; `schools` | `unique_late_fee_rules_school_id_id (school_id, id)` |
| `late_fee_rule_fee_heads` | `id` | `school_id` | `(school_id, rule_id)` &rarr; `late_fee_rules`<br>`(school_id, fee_head_id)` &rarr; `fee_heads` | `unique_late_fee_head (school_id, rule_id, fee_head_id)` |
| `student_concessions` | `id` | `school_id` | `(school_id, student_id)` &rarr; `students`<br>`(school_id, rule_id)` &rarr; `concession_rules`<br>`(school_id, from_term_id)` &rarr; `fee_terms` | Single concession per student head & term window |
| `student_concession_fee_heads` | `id` | `school_id` | `(school_id, student_concession_id)` &rarr; `student_concessions`<br>`(school_id, fee_head_id)` &rarr; `fee_heads` | `unique_student_concession_head` |
| `student_fee_assignments` | `id` | `school_id` | `(school_id, student_id)` &rarr; `students`<br>`(school_id, structure_id)` &rarr; `fee_structures` | `unique_active_student_fee_assignment (school_id, student_id, academic_year_id)` WHERE status='active' |

### C. Transport Subsystem

| Table | Primary Key | Tenant Key | Foreign Keys | Key Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `transport_routes` | `id` | `school_id` | `(school_id, default_vehicle_id)` &rarr; `transport_vehicles` | `idx_transport_routes_code_school (school_id, upper(code))` WHERE deleted_at IS NULL |
| `transport_assignments`| `id` | `school_id` | `(school_id, student_id)` &rarr; `students`<br>`(school_id, route_id)` &rarr; `transport_routes` | `idx_transport_assignments_active_student (school_id, student_id, academic_year_id)` WHERE status='active' |
| `transport_fee_zones` | `id` | `school_id` | `school_id` &rarr; `schools` | `unique_transport_fee_zones_school_id_id (school_id, id)` |
| `transport_vehicles` | `id` | `school_id` | `school_id` &rarr; `schools` | `idx_transport_vehicles_reg_school (school_id, upper(replace(registration_no, ' ', '')))` |
| `transport_staff` | `id` | `school_id` | `school_id` &rarr; `schools` | `idx_transport_staff_phone_school (school_id, phone)` |
| `transport_absences` | `id` | `school_id` | `(school_id, student_id)` &rarr; `students` | `idx_transport_absences_student_dates` |
| `transport_requests` | `id` | `school_id` | `(school_id, student_id)` &rarr; `students` | `idx_transport_requests_school_status` |

---

## 3. Redundancies and Structural Vulnerabilities Resolved

### 1. Missing Composite Tenant Foreign Keys
- **Problem**: `fee_structure_items`, `student_concessions`, `fee_structures`, `fee_terms`, `student_dues`, `fee_receipts`, `fee_ledger`, and `fee_credits` previously lacked composite foreign keys referencing `(school_id, academic_year_id)` or `(school_id, student_id)`. An application bug or manual SQL could associate an invoice or due with an academic year or student belonging to another tenant.
- **Resolution**: Added composite foreign keys:
  - `fk_fee_structure_items_school_structure (school_id, structure_id)`
  - `fk_fee_structure_items_school_fee_head (school_id, fee_head_id)`
  - `fk_student_concessions_school_student (school_id, student_id)`
  - `fk_student_concessions_school_rule (school_id, rule_id)`
  - `fk_student_concessions_school_term (school_id, from_term_id)`
  - `fk_fee_structures_school_academic_year (school_id, academic_year_id)`
  - `fk_fee_terms_school_academic_year (school_id, academic_year_id)`
  - `fk_student_dues_school_academic_year (school_id, academic_year_id)`
  - `fk_fee_receipts_school_academic_year (school_id, academic_year_id)`
  - `fk_fee_ledger_school_academic_year (school_id, academic_year_id)`
  - `fk_fee_credits_school_academic_year (school_id, academic_year_id)`

### 2. Duplicate Billing Prevention on Annual & Non-Term Structure Dues
- **Problem**: The existing unique partial index `unique_due_per_student_head_term` only protected structure dues where `term_id IS NOT NULL`. Dues created without a specific term (e.g. annual fees or admission fees) had no unique constraint to prevent duplicate generation on repeated syncs.
- **Resolution**: Created `unique_due_per_student_head_annual`:
  ```sql
  CREATE UNIQUE INDEX unique_due_per_student_head_annual
    ON public.student_dues (student_id, academic_year_id, fee_head_id, source)
    WHERE (source = 'structure' AND term_id IS NULL AND status <> 'cancelled');
  ```

### 3. Missing Delete Guard on Financial Ledger
- **Problem**: `trg_fee_ledger_immutable` was configured only `BEFORE UPDATE`. A `DELETE` statement on `fee_ledger` would execute silently without raising an error.
- **Resolution**: Created trigger `trg_fee_ledger_prevent_delete` on `BEFORE DELETE ON public.fee_ledger` invoking `enforce_fee_ledger_immutability()`, which raises:
  `Fee ledger financial entries are immutable and cannot be deleted. Create an adjustment, reversal, or compensating entry instead.`

### 4. Non-Zero Amount Constraint on Financial Ledger
- **Problem**: Financial ledger lines of 0 paise produce phantom records that distort accounting journals without changing obligation.
- **Resolution**: Added check constraint `chk_fee_ledger_amount_nonzero` (`CHECK (amount_paise <> 0)`).

### 5. Weak RLS `WITH CHECK` Coverage
- **Problem**: Multiple fee configuration and transport tables had `WITH CHECK: null` on `ALL` commands, allowing authenticated users with tenant access to insert rows pointing to a different `school_id`.
- **Resolution**: Enforced explicit `WITH CHECK` across 100% of policies, validating `(school_id = current_school_id() OR is_school_member(school_id))` and `school_has_feature('transport', school_id)`.

### 6. Tenant ID Immutability on Junction Tables
- **Problem**: Junction tables (`fee_structure_classes`, `fee_structure_sections`, `concession_rule_fee_heads`, `student_concession_fee_heads`, `late_fee_rule_fee_heads`, `online_payment_order_dues`, `online_payment_order_students`, `transport_absences`, `transport_requests`) lacked the `trigger_prevent_school_id_update` trigger.
- **Resolution**: Installed `trigger_prevent_school_id_update` across all 9 junction tables.

---

## 4. Tenant Isolation & Server-Side Authorization

All multi-tenant database operations are verified against the active user's session claims via PostgreSQL stored functions:
1. `public.current_school_id()`: Returns the school ID mapped to `auth.uid()` via `profiles` or `schools.created_by`.
2. `public.is_school_member(uuid)`: Validates that `auth.uid()` is an active member or admin of the specific school ID.
3. `public.is_school_admin(uuid)`: Validates administrative privileges.

### RPC Functions Multi-Tenant Hardening
Key stored procedures enforce server-side tenant authentication before any operation:
- `collect_fees(p_school_id, ...)`: Verifies caller membership, checks student belongs to school, locks dues `FOR UPDATE`, checks balance limits, generates atomic receipt numbers, creates payment records, updates dues, and writes ledger entries in a single atomic transaction.
- `cancel_receipt(p_school_id, p_receipt_id, ...)`: Locks receipt, verifies tenant ownership, validates active status, reverses each allocation, restores due balances, voids advance credits, and logs reversals in `fee_ledger`.
- `cancel_invoice(p_school_id, p_due_ids, ...)`: Locks dues, verifies tenant ownership, prevents cancellation if payments exist, updates due status to `cancelled`, and writes negative `cancel_due` entries in `fee_ledger`.
- `check_fee_structure_can_delete(p_school_id, p_structure_id)`: Prevents deleting fee structures that have active student assignments or active dues.

---

## 5. Configuration vs Historical Fact Separation

The MyZkool Fee Architecture separates editable configuration from historical facts:
- **Configuration** (`fee_structures`, `fee_structure_items`, `fee_structure_item_terms`, `concession_rules`, `fee_terms`):
  Can be created, versioned, or deactivated without altering past financial obligations.
  `check_fee_structure_can_delete` ensures that structures with historical ties cannot be dropped.
- **Historical Invoices & Facts** (`student_dues`, `fee_receipts`, `fee_receipt_items`, `fee_credits`, `fee_ledger`):
  Store immutable snapshots of paise amounts, due dates, receipt numbers, and payment lines.
  Past dues maintain the exact agreed pricing even if subsequent fee structures are updated.

---

## 6. Migration Artifacts & Rollback Path

The refactoring has been codified in versioned, reversible migration files:
- **Migration Script**: `supabase/migrations/20261017220000_fee_architecture_refactor.sql`
- **Rollback Script**: `supabase/migrations/20261017220000_fee_architecture_refactor_rollback.sql`

Both scripts are committed and versioned in the repository.

---

## 7. Empirical Verification Summary

| Test Suite / Inspection | Status | Result Details |
| :--- | :--- | :--- |
| **Financial Calculation Engine** | PASS | 38/38 tests passing (`tests/test-financial-calculation-engine.ts`) |
| **Phase 2D Reconciliation Suite** | PASS | 25/25 tests passing (`tests/test-phase2d-reconciliation.ts`) |
| **Invoice Reliability Suite** | PASS | 31/31 tests passing (`tests/test-phase2b-invoice-reliability.ts`) |
| **TypeScript Compilation** | PASS | 0 errors (`npx tsc --noEmit`) |
| **Ledger DELETE Prevention** | PASS | Verified trigger raises `Fee ledger financial entries are immutable and cannot be deleted.` |
| **Ledger UPDATE Prevention** | PASS | Verified trigger raises `Fee ledger financial entries are immutable.` on financial fields |
| **Ledger Non-Zero Check** | PASS | Verified `chk_fee_ledger_amount_nonzero` rejects 0 paise insertion |
| **Junction Tenant Immutability** | PASS | Verified `prevent_school_id_update` blocks modifying `school_id` on junction tables |
| **RLS WITH CHECK Coverage** | PASS | Verified 0 fee/transport policies with null `WITH CHECK` clauses |
| **Live Outstanding Invariant** | PASS | Exactly ₹2,60,200.00 Net Active Outstanding; ₹0.00 discrepancy |

---

## 8. Migration Blockers & Scalability Roadmap

### Current Status: ZERO BLOCKERS
- All migration steps have been applied and tested on live PostgreSQL.
- Zero breaking changes to the active React/TypeScript application.
- All live data preserved without any data loss or column removal.

### Future Scalability Recommendations
1. **Periodic Partitioning of `fee_ledger` and `fee_audit_log`**: As transaction volume grows past 10 million rows, partition `fee_ledger` by `academic_year_id` or range of `created_at` using PostgreSQL declarative partitioning.
2. **Read Replica Routing for Reports**: Route heavy analytics views (`v_fee_day_book`, `v_fee_concession_register`) to a read replica or materialized summary cache during peak collection periods.
