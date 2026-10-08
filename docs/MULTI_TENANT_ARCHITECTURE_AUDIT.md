# MyZkool Multi-Tenant Database Architecture & Isolation Plan

## 1. Executive Summary

This document defines the comprehensive architecture audit and multi-tenant isolation refactor for the MyZkool School ERP database.
The objective is to establish strict, unbreakable logical tenant isolation so that:
- Every school's data is isolated at the relational constraint and database policy level.
- Cross-tenant foreign key references are impossible (e.g. School A student referencing School B class or parent).
- Client requests cannot spoof, tamper with, or escalate access to another school's records.
- Aadhaar and sensitive identity data have a single canonical, securely isolated home in `student_sensitive`.
- UUID arrays are backed by normalized relational junction tables.
- Subscription models are unified under `subscription_plans` and `school_subscriptions`.

---

## 2. Table Classification Inventory

All database tables are classified into three distinct multi-tenant tiers:

### Tier A: Global Tables (Shared Catalog, No `school_id`)
| Table Name | Purpose | RLS Policy |
| :--- | :--- | :--- |
| `subscription_plans` | Global plan tier catalog (Basic, Pro, Custom, quotas, prices) | Public read for active plans (`is_active = true`), superadmin write |
| `document_types` | Standard document catalog seed | Read-only for authenticated users |

### Tier B: Tenant-Owned Root Tables (Directly Owned by School)
These tables represent primary operational entities created and managed by a school. Every row contains `school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE`.
| Domain | Tables |
| :--- | :--- |
| **Identity & Core** | `schools`, `profiles`, `staff` |
| **Academics** | `academic_years`, `classes`, `subjects` |
| **Student Core** | `students`, `parents`, `counters`, `audit_logs` |
| **Subscriptions** | `school_subscriptions` |
| **Website / CMS** | `school_websites` |
| **Fee Structure** | `fee_heads`, `fee_terms`, `fee_structures`, `concession_rules`, `late_fee_rules`, `fee_settings` |
| **Fee Transactions** | `fee_receipts`, `student_dues`, `fee_payments`, `fee_ledger`, `fee_credits`, `fee_refunds`, `day_closings` |
| **Fee Operations** | `fee_reminder_rules`, `fee_followups`, `approval_requests`, `fee_outbox`, `fee_audit_log` |
| **Payment Gateways** | `school_gateway_credentials`, `online_payment_orders`, `gateway_webhook_events`, `parent_pay_tokens` |
| **Transport (Pro)** | `transport_settings`, `transport_vehicles`, `transport_staff`, `transport_routes`, `transport_fee_zones` |
| **Transport Ops** | `transport_assignments`, `transport_requests`, `transport_absences` |
| **Comms & Batches** | `communication_consents`, `notification_outbox`, `import_batches`, `promotion_batches` |

### Tier C: Child / Dependent Tables (Owned Through Parent Record)
These tables belong to a tenant through a parent entity and enforce composite tenant-safe relationships:
| Child Table | Primary Parent Entity | Composite Key Enforced |
| :--- | :--- | :--- |
| `sections` | `classes` | `(school_id, class_id) REFERENCES classes(school_id, id)` |
| `class_subjects` | `classes`, `subjects` | `(school_id, class_id)`, `(school_id, subject_id)` |
| `website_pages` | `school_websites` | `(school_id, website_id) REFERENCES school_websites(school_id, id)` |
| `student_sensitive` | `students` (1:1) | `(school_id, student_id) REFERENCES students(school_id, id)` |
| `student_addresses` | `students` | `(school_id, student_id) REFERENCES students(school_id, id)` |
| `student_parents` | `students`, `parents` | `(school_id, student_id)`, `(school_id, parent_id)` |
| `student_enrollments` | `students`, `classes`, `sections`, `academic_years` | `(school_id, student_id)`, `(school_id, class_id)`, `(school_id, section_id)`, `(school_id, academic_year_id)` |
| `student_previous_schools` | `students` | `(school_id, student_id) REFERENCES students(school_id, id)` |
| `student_documents` | `students` | `(school_id, student_id) REFERENCES students(school_id, id)` |
| `student_achievements` | `students` | `(school_id, student_id) REFERENCES students(school_id, id)` |
| `student_medical` | `students` (1:1) | `(school_id, student_id) REFERENCES students(school_id, id)` |
| `student_events` | `students` | `(school_id, student_id) REFERENCES students(school_id, id)` |
| `student_transfer_certificates` | `students` | `(school_id, student_id) REFERENCES students(school_id, id)` |
| `fee_structure_items` | `fee_structures`, `fee_heads` | `(school_id, fee_structure_id)`, `(school_id, fee_head_id)` |
| `fee_structure_item_terms` | `fee_structure_items`, `fee_terms` | `(school_id, term_id)` |
| `student_fee_assignments` | `students`, `fee_structures` | `(school_id, student_id)`, `(school_id, fee_structure_id)` |
| `student_concessions` | `students`, `concession_rules` | `(school_id, student_id)`, `(school_id, concession_rule_id)` |
| `fee_receipt_items` | `fee_receipts`, `student_dues`, `fee_heads` | `(school_id, receipt_id)`, `(school_id, due_id)`, `(school_id, fee_head_id)` |
| `route_stops` | `transport_routes` | `(school_id, route_id) REFERENCES transport_routes(school_id, id)` |
| `vehicle_documents` | `transport_vehicles` | `(school_id, vehicle_id) REFERENCES transport_vehicles(school_id, id)` |
| `staff_documents` | `transport_staff` | `(school_id, staff_id) REFERENCES transport_staff(school_id, id)` |
| `parent_pay_sessions` | `parent_pay_tokens` | `(school_id, token_id) REFERENCES parent_pay_tokens(school_id, id)` |

---

## 3. Tenant Relationship Graph

```
schools (CANONICAL TENANT ROOT)
├── profiles (auth.uid() -> school_id resolution)
├── staff
├── academic_years
│   ├── classes [UNIQUE: school_id, id]
│   │   ├── sections [FK: school_id, class_id]
│   │   └── class_subjects [FK: school_id, class_id & subject_id]
│   └── subjects [UNIQUE: school_id, id]
│
├── students [UNIQUE: school_id, id]
│   ├── student_enrollments [FK: (school_id, student_id), (school_id, class_id), etc.]
│   ├── student_sensitive [1:1, AES-256 GCM, strict RLS]
│   ├── student_addresses
│   ├── student_parents [FK: (school_id, student_id), (school_id, parent_id)]
│   ├── student_documents
│   ├── student_previous_schools
│   ├── student_achievements
│   ├── student_medical
│   ├── student_events
│   └── student_transfer_certificates
│
├── parents [UNIQUE: school_id, id]
│
├── fee configuration
│   ├── fee_heads [UNIQUE: school_id, id]
│   ├── fee_terms [UNIQUE: school_id, id]
│   ├── fee_structures [UNIQUE: school_id, id]
│   │   ├── fee_structure_items [FK: school_id, fee_structure_id]
│   │   │   └── fee_structure_item_terms [FK: school_id, term_id]
│   │   ├── fee_structure_classes (normalized junction)
│   │   ├── fee_structure_sections (normalized junction)
│   │   └── fee_structure_students (normalized junction)
│   ├── concession_rules [UNIQUE: school_id, id]
│   │   └── concession_rule_fee_heads (normalized junction)
│   ├── late_fee_rules [UNIQUE: school_id, id]
│   │   └── late_fee_rule_fee_heads (normalized junction)
│   └── fee_settings
│
├── fee transactions
│   ├── student_dues [FK: (school_id, student_id), (school_id, fee_head_id)]
│   ├── fee_receipts [UNIQUE: school_id, id]
│   │   └── fee_receipt_items [FK: (school_id, receipt_id), (school_id, due_id)]
│   ├── fee_payments [FK: (school_id, receipt_id)]
│   ├── fee_ledger [FK: (school_id, student_id)]
│   ├── fee_credits [FK: (school_id, student_id)]
│   └── fee_refunds [FK: (school_id, student_id), (school_id, receipt_id)]
│
├── online payments
│   ├── school_gateway_credentials
│   ├── online_payment_orders [UNIQUE: school_id, id]
│   │   ├── online_payment_order_students (normalized junction)
│   │   └── online_payment_order_dues (normalized junction)
│   ├── gateway_webhook_events
│   └── parent_pay_tokens [UNIQUE: school_id, id]
│       └── parent_pay_sessions [FK: (school_id, token_id)]
│
├── transport
│   ├── transport_settings
│   ├── transport_vehicles [UNIQUE: school_id, id]
│   │   └── vehicle_documents [FK: school_id, vehicle_id]
│   ├── transport_staff [UNIQUE: school_id, id]
│   │   └── staff_documents [FK: school_id, staff_id]
│   ├── transport_routes [UNIQUE: school_id, id]
│   │   └── route_stops [FK: school_id, route_id]
│   ├── transport_fee_zones [UNIQUE: school_id, id]
│   ├── transport_assignments [FK: (school_id, student_id), (school_id, route_id)]
│   ├── transport_requests [FK: (school_id, student_id)]
│   └── transport_absences [FK: (school_id, student_id)]
│
├── website
│   └── school_websites [UNIQUE: school_id, id]
│       └── website_pages [FK: school_id, website_id]
│
├── subscription/billing
│   └── school_subscriptions [FK: school_id, plan_id -> subscription_plans(id)]
│
└── operational
    ├── counters [UNIQUE: school_id, key]
    ├── audit_logs [tenant scoped]
    ├── fee_audit_log [tenant scoped]
    ├── communication_consents
    └── notification_outbox
```

---

## 4. Cross-School Integrity Violations & Relational Fixes

| Risk Scenario | Root Cause in Legacy Schema | Relational Fix Applied |
| :--- | :--- | :--- |
| School A student assigned to School B class | `students.admission_class_id` only referenced `classes(id)` | Composite FK: `(school_id, admission_class_id) REFERENCES classes(school_id, id)` |
| School A student enrollment pointing to School B section | `student_enrollments.section_id` only checked single UUID | Composite FK: `(school_id, section_id) REFERENCES sections(school_id, id)` |
| School A student linked to School B parent | `student_parents` only checked `student_id` and `parent_id` independently | Composite FK: `(school_id, student_id) REFERENCES students(school_id, id)` AND `(school_id, parent_id) REFERENCES parents(school_id, id)` |
| School A due assigned to School B fee head | `student_dues.fee_head_id` only referenced `fee_heads(id)` | Composite FK: `(school_id, fee_head_id) REFERENCES fee_heads(school_id, id)` |
| School A receipt linked to School B student | `fee_receipts.student_id` only referenced `students(id)` | Composite FK: `(school_id, student_id) REFERENCES students(school_id, id)` |
| School A transport assigned to School B route | `transport_assignments` only checked `route_id` | Composite FK: `(school_id, route_id) REFERENCES transport_routes(school_id, id)` |
| School A route using School B vehicle | `transport_routes.vehicle_id` only checked `transport_vehicles(id)` | Composite FK: `(school_id, vehicle_id) REFERENCES transport_vehicles(school_id, id)` |

---

## 5. Duplicate & Redundant Structures Resolution

1. **Student Aadhaar Information**:
   - `students.aadhaar_enc`, `students.aadhaar_last4`, `students.aadhaar_hash` are migrated into `student_sensitive`.
   - Migration backs up and verifies identical row count.
   - Redundant Aadhaar columns are removed from `public.students`.
   - All client queries for Aadhaar run through `student_sensitive` with strict permission verification.

2. **Subscription Model Consolidation**:
   - `subscription_plans` is the global plan catalog.
   - `school_subscriptions` is the canonical tenant subscription instance.
   - Legacy `school_plans` table is migrated into `school_subscriptions` and superseded with a backwards-compatible Postgres view.

3. **UUID Array Relationships Normalization**:
   - Created normalized junction tables:
     - `online_payment_order_students (school_id, order_id, student_id)`
     - `online_payment_order_dues (school_id, order_id, due_id)`
     - `concession_rule_fee_heads (school_id, rule_id, fee_head_id)`
     - `student_concession_fee_heads (school_id, student_concession_id, fee_head_id)`
     - `late_fee_rule_fee_heads (school_id, rule_id, fee_head_id)`
     - `fee_structure_classes (school_id, fee_structure_id, class_id)`
     - `fee_structure_sections (school_id, fee_structure_id, section_id)`
     - `fee_structure_students (school_id, fee_structure_id, student_id)`
   - Backfilled junctions from existing UUID arrays.

---

## 6. Tenant-Aware RLS Security Model

### Canonical Tenant Resolution Function
```sql
CREATE OR REPLACE FUNCTION public.get_current_school_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT school_id FROM public.profiles WHERE auth_id = auth.uid() AND school_id IS NOT NULL LIMIT 1),
    (SELECT id FROM public.schools WHERE created_by = auth.uid() AND id IS NOT NULL LIMIT 1)
  );
$$;
```

### Immutable Tenant Ownership Trigger
```sql
CREATE OR REPLACE FUNCTION public.prevent_school_id_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.school_id IS DISTINCT FROM NEW.school_id THEN
    RAISE EXCEPTION 'school_id is immutable (cannot change from % to %)', OLD.school_id, NEW.school_id;
  END IF;
  RETURN NEW;
END;
$$;
```
Attached as `BEFORE UPDATE` on every tenant table. Ordinary users cannot transfer records between schools.
