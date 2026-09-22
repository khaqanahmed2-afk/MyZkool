# MyZkool — Database Schema Reference (SCHEMA.md)

**Generated**: 2026-09-22  
**Platform**: PostgreSQL 15+ / Supabase  
**Total Tables**: 72  
**Total Migrations**: 17  
**Multi-Tenant Isolation**: Row-Level Security (RLS) enabled on all 72 tenant tables  

---

## 1. Architectural Principles & Hard Rules

1. **Multi-Tenant Partitioning by `school_id`**:
   - Every tenant table references `public.schools(id)` via foreign key (`ON DELETE CASCADE` or `ON DELETE RESTRICT`).
   - Every tenant table has Postgres Row Level Security (RLS) enabled.
   - Helper functions `public.school_admin_school_ids()` and `public.is_school_admin(school_id)` provide fast, cached tenant boundary checks.

2. **Sensitive Data Protection & Aadhaar Compliance**:
   - Indian regulatory compliance: Raw 12-digit Aadhaar numbers are **never** stored in plaintext.
   - `public.student_sensitive` isolates Aadhaar numbers with AES-256 GCM encryption (`aadhaar_encrypted`), HMAC-SHA256 search hash (`aadhaar_hash`), and masked display string (`aadhaar_last4`, e.g. `•••• •••• 1234`).
   - Aadhaar reveals require explicit administrative permission, documented business purpose, and an append-only audit trail in `audit_logs`.
   - Medical details live in an isolated `student_medical` table with dedicated access control.

3. **Financial Precision (Zero Floating Point)**:
   - All monetary fields use integer paise (`BIGINT`), where ₹1.00 = 100 paise.
   - Double-entry balance integrity is enforced in `fee_ledger`.
   - Money sequences (receipt numbers, invoice numbers, TC numbers) are generated monotonically using row-locked transactional increments in the `counters` table.

4. **Soft Deletions & Audit Logging**:
   - Student, parent, staff, and financial records use `deleted_at TIMESTAMPTZ` soft deletes.
   - Hard deletes on financial or enrollment data are prohibited.
   - Operational mutations write immutable records to `audit_logs` and `fee_audit_log`.

---

## 2. Migration Registry & Naming Policy

The migration sequence in `supabase/migrations/` represents the schema progression from initial school onboarding to full ERP capabilities.

| Migration File | Primary Domain | Tables Introduced / Modified |
|---|---|---|
| `001_schools_and_onboarding.sql` | Multi-Tenant Root & Profiles | `schools`, `profiles` |
| `002_academic_years.sql` | Academic Cycles | `academic_years` |
| `003_classes_sections_subjects.sql` | Academics | `classes`, `sections`, `subjects`, `class_subjects` |
| `004_subscriptions.sql` | Plans & Billing | `subscription_plans`, `school_subscriptions` |
| `005_website_setup.sql` | CMS & Builder | `school_websites`, `website_pages` |
| `006_staff.sql` | Staff Management | `staff` |
| `007_students_foundations.sql` | Student Module Core | `students`, `student_addresses`, `parents`, `student_parents`, `student_previous_schools`, `document_types`, `student_documents`, `student_achievements`, `student_medical`, `student_events`, `student_drafts`, `student_transfer_certificates`, `import_batches`, `promotion_batches`, `student_enrollments`, `counters`, `audit_logs`, `communication_consents`, `notification_outbox`, `school_plans` |
| `008_students_sensitive_and_records.sql` | Data Protection | `student_sensitive` |
| `009_students_operations.sql` | Operations Enhancements | Alters `students`, `student_enrollments`, `sections`, `student_transfer_certificates`, `parents` |
| `010_fees.sql` | Fee Structure & Rules | `fee_heads`, `fee_terms`, `fee_structures`, `fee_structure_items`, `fee_structure_item_terms`, `student_fee_assignments`, `fee_receipts` (stub), `student_dues`, `concession_rules`, `student_concessions`, `late_fee_rules`, `fee_settings`, `fee_ledger`, `fee_credits`, `approval_requests`, `day_closings` (stub) |
| `011_fee_collection.sql` | Fee Collection Engine | `fee_receipts` (complete), `fee_receipt_items`, `fee_payments`, `day_closings` (complete), `fee_outbox`, `fee_audit_log` |
| `012_fee_operations.sql` | Fee Operations | `fee_reminder_rules`, `fee_followups`, `fee_refunds` |
| `013_online_payments.sql` | Payment Gateways | `school_gateway_credentials`, `online_payment_orders`, `gateway_webhook_events`, `parent_pay_tokens`, `parent_pay_sessions` |
| `014_transport_core.sql` | Fleet & Routes (Pro) | `transport_settings`, `transport_vehicles`, `vehicle_documents`, `transport_staff`, `staff_documents`, `transport_routes`, `route_stops`, `transport_fee_zones` |
| `015_transport_assignments.sql` | Student Transport (Pro) | `transport_assignments`, `transport_requests`, `transport_absences` |
| `016_fix_students_rls_authorization.sql` | RLS Hardening | RLS helper functions (`school_admin_school_ids`, `is_school_admin`, `school_member_school_ids`) & policy refactor |
| `20260920120000_onboarding_v2_simplify.sql` | Onboarding v2 | Schema update: 6-step flow, `onboarding_flow_version`, nullable website fields |

### Migration Naming Standard & Forward Policy
- **Legacy Files (001–016)**: Preserved with their sequential prefix (`NNN_name.sql`). These **must not be renamed**, as Supabase migration tracking registers the exact filename in `supabase_migrations.schema_migrations`. Renaming would trigger duplicate migration attempts or CI/CD state divergence.
- **Forward Standard**: All future migrations must strictly adopt the official Supabase timestamp naming convention:  
  `YYYYMMDDHHMMSS_<descriptive_name>.sql` (e.g. `20260920120000_onboarding_v2_simplify.sql`).

---

## 3. Database Schema Catalog by Domain


### 1. Tenant Root & Auth

*Core multi-tenant root entity and user profile links with role-based attributes.*

#### `schools`

- **Introduced in**: `001_schools_and_onboarding.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `name` | `TEXT NOT NULL` |
| `subdomain` | `TEXT NOT NULL` |
| `school_type` | `TEXT NOT NULL DEFAULT 'k12'` |
| `affiliation_board` | `TEXT` |
| `official_email` | `TEXT NOT NULL` |
| `contact_phone` | `TEXT NOT NULL` |
| `address` | `TEXT NOT NULL` |
| `city` | `TEXT NOT NULL` |
| `state` | `TEXT NOT NULL` |
| `pin_code` | `TEXT NOT NULL` |
| `logo_url` | `TEXT` |
| `onboarding_completed` | `BOOLEAN NOT NULL DEFAULT false` |
| `onboarding_step` | `INTEGER NOT NULL DEFAULT 1` |
| `created_by` | `UUID REFERENCES auth.users(id) ON DELETE RESTRICT` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
- Check: `CONSTRAINT subdomain_format_check CHECK (subdomain ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$')`
- Check: `CONSTRAINT onboarding_step_check CHECK (onboarding_step BETWEEN 1 AND 8)`

**Indexes**:
- `idx_schools_subdomain_unique` (`LOWER(subdomain`)
- `idx_schools_created_by` (`created_by`)
- `idx_schools_onboarding_status` (`onboarding_completed, onboarding_step`)

---
#### `profiles`

- **Introduced in**: `001_schools_and_onboarding.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `auth_id` | `UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE` |
| `email` | `TEXT NOT NULL` |
| `full_name` | `TEXT NOT NULL` |
| `role` | `TEXT NOT NULL DEFAULT 'school_admin'` |
| `school_id` | `UUID REFERENCES public.schools(id) ON DELETE SET NULL` |
| `phone` | `TEXT` |
| `onboarding_completed` | `BOOLEAN NOT NULL DEFAULT false` |
| `current_onboarding_step` | `TEXT NOT NULL DEFAULT '/onboarding/school'` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_profiles_auth_id` (`auth_id`)
- `idx_profiles_school_id` (`school_id`)

---

### 2. Academic Structure

*Academic years, grade levels, sections (with capacity and class teacher assignments), subjects, and curriculum mappings.*

#### `academic_years`

- **Introduced in**: `002_academic_years.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `start_year` | `INTEGER NOT NULL` |
| `end_year` | `INTEGER NOT NULL` |
| `label` | `TEXT NOT NULL` |
| `start_date` | `DATE NOT NULL` |
| `end_date` | `DATE NOT NULL` |
| `is_current` | `BOOLEAN NOT NULL DEFAULT true` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
- Check: `CONSTRAINT chk_academic_year_range CHECK (end_year > start_year)`
- Check: `CONSTRAINT chk_academic_year_bounds CHECK (start_year >= 1990 AND start_year <= 2100)`
- Check: `CONSTRAINT chk_academic_date_order CHECK (end_date > start_date)`

**Indexes**:
- `idx_academic_years_school_id` (`school_id`)
- `idx_academic_years_school_current` (`school_id, is_current`)
- `idx_academic_years_school_label` (`school_id, LOWER(label`)
- `idx_academic_years_single_current` (`school_id`)

---
#### `classes`

- **Introduced in**: `003_classes_sections_subjects.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `academic_year_id` | `UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE` |
| `name` | `TEXT NOT NULL` |
| `display_name` | `TEXT` |
| `sort_order` | `INTEGER NOT NULL DEFAULT 0` |
| `status` | `TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active'` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_classes_unique_name` (`school_id, academic_year_id, LOWER(TRIM(name`)
- `idx_classes_school_ay` (`school_id, academic_year_id, sort_order`)

---
#### `sections`

- **Introduced in**: `003_classes_sections_subjects.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `academic_year_id` | `UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE` |
| `class_id` | `UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE` |
| `name` | `TEXT NOT NULL` |
| `display_name` | `TEXT` |
| `sort_order` | `INTEGER NOT NULL DEFAULT 0` |
| `status` | `TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active'` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_sections_unique_name` (`school_id, academic_year_id, class_id, LOWER(TRIM(name`)
- `idx_sections_class_id` (`class_id, sort_order`)
- `idx_sections_school_ay` (`school_id, academic_year_id`)

---
#### `subjects`

- **Introduced in**: `003_classes_sections_subjects.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `academic_year_id` | `UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE` |
| `name` | `TEXT NOT NULL` |
| `code` | `TEXT` |
| `subject_type` | `TEXT NOT NULL DEFAULT 'core' CHECK (subject_type IN ('core'` |
| `status` | `TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active'` |
| `sort_order` | `INTEGER NOT NULL DEFAULT 0` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_subjects_unique_name` (`school_id, academic_year_id, LOWER(TRIM(name`)
- `idx_subjects_school_ay` (`school_id, academic_year_id, sort_order`)

---
#### `class_subjects`

- **Introduced in**: `003_classes_sections_subjects.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `academic_year_id` | `UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE` |
| `class_id` | `UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE` |
| `subject_id` | `UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE` |
| `sort_order` | `INTEGER NOT NULL DEFAULT 0` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_class_subjects_unique_assignment` (`school_id, academic_year_id, class_id, subject_id`)
- `idx_class_subjects_class` (`class_id, sort_order`)
- `idx_class_subjects_subject` (`subject_id`)

---

### 3. Subscriptions & Tier Gating

*Platform billing tiers, feature modules gating (Basic, Standard, Pro), and school subscription tracking.*

#### `subscription_plans`

- **Introduced in**: `004_subscriptions.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `slug` | `TEXT NOT NULL UNIQUE` |
| `name` | `TEXT NOT NULL` |
| `description` | `TEXT NOT NULL` |
| `price_monthly` | `NUMERIC(10` |
| `price_six_months` | `NUMERIC(10` |
| `price_yearly` | `NUMERIC(10` |
| `currency` | `TEXT NOT NULL DEFAULT 'INR'` |
| `student_capacity_label` | `TEXT NOT NULL` |
| `max_students` | `INTEGER` |
| `max_staff` | `INTEGER` |
| `trial_days` | `INTEGER NOT NULL DEFAULT 14` |
| `features` | `JSONB NOT NULL DEFAULT '[]'::jsonb` |
| `is_popular` | `BOOLEAN NOT NULL DEFAULT false` |
| `is_active` | `BOOLEAN NOT NULL DEFAULT true` |
| `sort_order` | `INTEGER NOT NULL DEFAULT 0` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_subscription_plans_active_sort` (`is_active, sort_order`)

---
#### `school_subscriptions`

- **Introduced in**: `004_subscriptions.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `plan_id` | `UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT` |
| `billing_cycle` | `TEXT NOT NULL CHECK (billing_cycle IN ('monthly'` |
| `status` | `TEXT NOT NULL CHECK (status IN ('trialing'` |
| `trial_starts_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `trial_ends_at` | `TIMESTAMPTZ NOT NULL` |
| `current_period_starts_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `current_period_ends_at` | `TIMESTAMPTZ NOT NULL` |
| `amount` | `NUMERIC(10` |
| `currency` | `TEXT NOT NULL DEFAULT 'INR'` |
| `gst_rate` | `NUMERIC(5` |
| `gst_amount` | `NUMERIC(10` |
| `total_amount` | `NUMERIC(10` |
| `payment_method` | `TEXT DEFAULT 'trial' CHECK (payment_method IN ('trial'` |
| `payment_status` | `TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('trial'` |
| `metadata` | `JSONB DEFAULT '{}'::jsonb` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_school_subscriptions_school_status` (`school_id, status`)
- `idx_school_subscriptions_created_at` (`created_at DESC`)

---
#### `school_plans`

- **Introduced in**: `007_students_foundations.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `school_id` | `UUID PRIMARY KEY REFERENCES public.schools(id) ON DELETE CASCADE` |
| `plan_key` | `TEXT NOT NULL CHECK (plan_key IN ('basic'` |
| `student_limit` | `INTEGER NOT NULL DEFAULT 800` |
| `features` | `JSONB NOT NULL DEFAULT '["students"` |
| `billing_status` | `TEXT NOT NULL DEFAULT 'active' CHECK (billing_status IN ('trialing'` |
| `valid_until` | `TIMESTAMPTZ` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_school_plans_school_id` (`school_id`)

---

### 4. School Website Builder

*Public-facing multi-tenant website content, custom domain mappings, CMS pages, and branding theme configurations.*

#### `school_websites`

- **Introduced in**: `005_website_setup.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `site_name` | `TEXT NOT NULL` |
| `tagline` | `TEXT` |
| `logo_url` | `TEXT` |
| `favicon_url` | `TEXT` |
| `primary_color` | `TEXT NOT NULL DEFAULT '#2158E0'` |
| `secondary_color` | `TEXT NOT NULL DEFAULT '#141A2E'` |
| `accent_color` | `TEXT NOT NULL DEFAULT '#10B981'` |
| `subdomain` | `TEXT NOT NULL` |
| `custom_domain` | `TEXT` |
| `contact_email` | `TEXT` |
| `contact_phone` | `TEXT` |
| `address` | `TEXT` |
| `city` | `TEXT` |
| `state` | `TEXT` |
| `postal_code` | `TEXT` |
| `about_text` | `TEXT` |
| `admission_enabled` | `BOOLEAN NOT NULL DEFAULT true` |
| `parent_portal_enabled` | `BOOLEAN NOT NULL DEFAULT true` |
| `published` | `BOOLEAN NOT NULL DEFAULT false` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
- `CONSTRAINT unique_school_website UNIQUE (school_id)`

**Indexes**:
- `idx_school_websites_subdomain_unique` (`LOWER(subdomain`)
- `idx_school_websites_school_id` (`school_id`)
- `idx_school_websites_published` (`published`)

---
#### `website_pages`

- **Introduced in**: `005_website_setup.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `website_id` | `UUID NOT NULL REFERENCES public.school_websites(id) ON DELETE CASCADE` |
| `slug` | `TEXT NOT NULL` |
| `title` | `TEXT NOT NULL` |
| `page_type` | `TEXT NOT NULL DEFAULT 'standard'` |
| `content` | `JSONB NOT NULL DEFAULT '{}'::jsonb` |
| `is_enabled` | `BOOLEAN NOT NULL DEFAULT true` |
| `sort_order` | `INTEGER NOT NULL DEFAULT 0` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
- `CONSTRAINT unique_website_page_slug UNIQUE (website_id, slug)`
- Check: `CONSTRAINT valid_page_slug CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$' OR slug = 'home')`

**Indexes**:
- `idx_website_pages_website_sort` (`website_id, sort_order ASC`)
- `idx_website_pages_school_id` (`school_id`)

---

### 5. Staff Management

*School faculty and administrative personnel records, role mappings, and document attachments.*

#### `staff`

- **Introduced in**: `006_staff.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `user_id` | `UUID REFERENCES auth.users(id) ON DELETE SET NULL` |
| `employee_code` | `TEXT` |
| `first_name` | `TEXT NOT NULL` |
| `last_name` | `TEXT` |
| `email` | `TEXT` |
| `phone` | `TEXT` |
| `role` | `TEXT NOT NULL` |
| `designation` | `TEXT` |
| `joining_date` | `DATE` |
| `status` | `TEXT NOT NULL DEFAULT 'active'` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
- Check: `CONSTRAINT valid_staff_role CHECK (role IN ('teacher', 'accountant'))`
- Check: `CONSTRAINT valid_staff_status CHECK (status IN ('active', 'archived', 'inactive'))`

**Indexes**:
- `idx_staff_school_employee_code` (`school_id, LOWER(employee_code`)
- `idx_staff_school_id` (`school_id`)
- `idx_staff_role` (`school_id, role`)
- `idx_staff_status` (`school_id, status`)

---
#### `staff_documents`

- **Introduced in**: `014_transport_core.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `staff_id` | `UUID NOT NULL REFERENCES public.transport_staff(id) ON DELETE CASCADE` |
| `doc_type` | `TEXT NOT NULL CHECK (doc_type IN ('license'` |
| `expires_on` | `DATE` |
| `file_path` | `TEXT` |
| `deleted_at` | `TIMESTAMPTZ` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_staff_docs_staff` (`staff_id`)

---

### 6. Student Management & Records

*Complete student lifecycle: admissions, addresses, parents/guardians, enrollments, documents, medical details, achievements, promotions, transfer certificates (TC), audit logging, and Aadhaar encryption/masking.*

#### `students`

- **Introduced in**: `007_students_foundations.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `admission_no` | `TEXT NOT NULL` |
| `sr_no` | `TEXT` |
| `apaar_id` | `TEXT` |
| `first_name` | `TEXT NOT NULL` |
| `middle_name` | `TEXT` |
| `last_name` | `TEXT NOT NULL` |
| `dob` | `DATE NOT NULL` |
| `gender` | `TEXT NOT NULL CHECK (gender IN ('male'` |
| `blood_group` | `TEXT` |
| `nationality` | `TEXT NOT NULL DEFAULT 'Indian'` |
| `religion` | `TEXT` |
| `category` | `TEXT CHECK (category IN ('general'` |
| `mother_tongue` | `TEXT` |
| `is_rte` | `BOOLEAN NOT NULL DEFAULT false` |
| `photo_path` | `TEXT` |
| `aadhaar_enc` | `BYTEA` |
| `aadhaar_last4` | `TEXT` |
| `aadhaar_hash` | `TEXT` |
| `admission_date` | `DATE NOT NULL` |
| `admission_type` | `TEXT NOT NULL CHECK (admission_type IN ('new'` |
| `admission_class_id` | `UUID REFERENCES public.classes(id) ON DELETE SET NULL` |
| `status` | `TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled'` |
| `status_changed_on` | `DATE` |
| `status_reason` | `TEXT` |
| `house` | `TEXT` |
| `medium` | `TEXT` |
| `deleted_at` | `TIMESTAMPTZ` |
| `deleted_by` | `UUID REFERENCES auth.users(id) ON DELETE SET NULL` |
| `delete_reason` | `TEXT` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `created_by` | `UUID REFERENCES auth.users(id) ON DELETE SET NULL` |
| `updated_by` | `UUID REFERENCES auth.users(id) ON DELETE SET NULL` |
- `CONSTRAINT unique_admission_no_per_school UNIQUE (school_id, admission_no)`

**Indexes**:
- `idx_students_school_id` (`school_id`)
- `idx_students_status` (`school_id, status`)
- `idx_students_admission_class` (`admission_class_id`)
- `idx_students_aadhaar_hash` (`school_id, aadhaar_hash`)
- `unique_sr_no_per_school` (`school_id, sr_no`)
- `unique_apaar_id_per_school` (`school_id, apaar_id`)
- `idx_students_import_batch` (`import_batch_id`)

---
#### `student_addresses`

- **Introduced in**: `007_students_foundations.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `student_id` | `UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE` |
| `kind` | `TEXT NOT NULL CHECK (kind IN ('current'` |
| `line1` | `TEXT NOT NULL` |
| `line2` | `TEXT` |
| `locality` | `TEXT` |
| `landmark` | `TEXT` |
| `city` | `TEXT NOT NULL` |
| `district` | `TEXT NOT NULL` |
| `state` | `TEXT NOT NULL` |
| `pin` | `CHAR(6) NOT NULL` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_student_addresses_student_id` (`student_id`)
- `idx_student_addresses_school_id` (`school_id`)

---
#### `parents`

- **Introduced in**: `007_students_foundations.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `full_name` | `TEXT NOT NULL` |
| `phone` | `TEXT NOT NULL` |
| `whatsapp_phone` | `TEXT` |
| `email` | `TEXT` |
| `occupation` | `TEXT` |
| `qualification` | `TEXT` |
| `annual_income_band` | `TEXT` |
| `photo_path` | `TEXT` |
| `deleted_at` | `TIMESTAMPTZ` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
- `CONSTRAINT unique_phone_per_school UNIQUE (school_id, phone)`

**Indexes**:
- `idx_parents_school_id` (`school_id`)
- `idx_parents_phone` (`school_id, phone`)
- `idx_parents_school_phone` (`school_id, phone`)

---
#### `student_parents`

- **Introduced in**: `007_students_foundations.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `student_id` | `UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE` |
| `parent_id` | `UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE` |
| `relation` | `TEXT NOT NULL CHECK (relation IN ('father'` |
| `is_primary_contact` | `BOOLEAN NOT NULL DEFAULT false` |
| `is_fee_payer` | `BOOLEAN NOT NULL DEFAULT false` |
| `is_emergency_contact` | `BOOLEAN NOT NULL DEFAULT false` |
| `can_pickup` | `BOOLEAN NOT NULL DEFAULT false` |
| `lives_with` | `BOOLEAN NOT NULL DEFAULT true` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
- `CONSTRAINT unique_student_parent UNIQUE (student_id, parent_id)`

**Indexes**:
- `idx_student_parents_one_primary` (`student_id`)
- `idx_student_parents_student_id` (`student_id`)
- `idx_student_parents_parent_id` (`parent_id`)
- `idx_student_parents_school_id` (`school_id`)

---
#### `student_previous_schools`

- **Introduced in**: `007_students_foundations.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `student_id` | `UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE` |
| `school_name` | `TEXT NOT NULL` |
| `board` | `TEXT` |
| `last_class` | `TEXT` |
| `tc_no` | `TEXT` |
| `tc_date` | `DATE` |
| `result_percent` | `NUMERIC(5` |
| `reason_for_leaving` | `TEXT` |
| `medium` | `TEXT` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_student_previous_schools_student_id` (`student_id`)
- `idx_student_previous_schools_school_id` (`school_id`)

---
#### `document_types`

- **Introduced in**: `007_students_foundations.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `key` | `TEXT NOT NULL` |
| `label` | `TEXT NOT NULL` |
| `required_for` | `TEXT NOT NULL CHECK (required_for IN ('all'` |
| `is_required` | `BOOLEAN NOT NULL DEFAULT false` |
| `display_order` | `INTEGER NOT NULL DEFAULT 0` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
- `CONSTRAINT unique_document_type_key_per_school UNIQUE (school_id, key)`

**Indexes**:
- `idx_document_types_school_id` (`school_id`)

---
#### `student_documents`

- **Introduced in**: `007_students_foundations.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `student_id` | `UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE` |
| `doc_type` | `TEXT NOT NULL` |
| `storage_path` | `TEXT` |
| `status` | `TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending'` |
| `expected_on` | `DATE` |
| `verified_by` | `UUID REFERENCES auth.users(id) ON DELETE SET NULL` |
| `verified_at` | `TIMESTAMPTZ` |
| `rejection_reason` | `TEXT` |
| `file_name` | `TEXT` |
| `mime` | `TEXT` |
| `size_bytes` | `BIGINT` |
| `uploaded_by` | `UUID REFERENCES auth.users(id) ON DELETE SET NULL` |
| `uploaded_at` | `TIMESTAMPTZ` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_student_documents_student_id` (`student_id`)
- `idx_student_documents_school_id` (`school_id`)
- `idx_student_documents_status` (`student_id, status`)

---
#### `student_achievements`

- **Introduced in**: `007_students_foundations.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `student_id` | `UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE` |
| `kind` | `TEXT NOT NULL CHECK (kind IN ('academic'` |
| `title` | `TEXT NOT NULL` |
| `level` | `TEXT NOT NULL CHECK (level IN ('school'` |
| `year` | `INTEGER NOT NULL` |
| `position_or_award` | `TEXT` |
| `document_id` | `UUID REFERENCES public.student_documents(id) ON DELETE SET NULL` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_student_achievements_student_id` (`student_id`)
- `idx_student_achievements_school_id` (`school_id`)

---
#### `student_medical`

- **Introduced in**: `007_students_foundations.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `student_id` | `UUID PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `allergies` | `TEXT` |
| `conditions` | `TEXT` |
| `medications` | `TEXT` |
| `special_needs` | `TEXT` |
| `vision_hearing_aids` | `TEXT` |
| `immunisation_notes` | `TEXT` |
| `emergency_instructions` | `TEXT` |
| `doctor_name` | `TEXT` |
| `doctor_phone` | `TEXT` |
| `preferred_hospital` | `TEXT` |
| `updated_by` | `UUID REFERENCES auth.users(id) ON DELETE SET NULL` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_student_medical_school_id` (`school_id`)

---
#### `student_events`

- **Introduced in**: `007_students_foundations.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `student_id` | `UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE` |
| `kind` | `TEXT NOT NULL CHECK (kind IN ('admitted'` |
| `summary` | `TEXT NOT NULL` |
| `meta` | `JSONB` |
| `created_by` | `UUID REFERENCES auth.users(id) ON DELETE SET NULL` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_student_events_student_id` (`student_id`)
- `idx_student_events_school_id` (`school_id`)
- `idx_student_events_created_at` (`student_id, created_at DESC`)

---
#### `student_drafts`

- **Introduced in**: `007_students_foundations.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `created_by` | `UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` |
| `step` | `INTEGER NOT NULL` |
| `payload` | `JSONB NOT NULL` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_student_drafts_created_by` (`created_by`)
- `idx_student_drafts_school_id` (`school_id`)

---
#### `student_transfer_certificates`

- **Introduced in**: `007_students_foundations.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `student_id` | `UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE` |
| `tc_no` | `TEXT NOT NULL` |
| `issued_on` | `DATE NOT NULL` |
| `last_class_id` | `UUID REFERENCES public.classes(id) ON DELETE SET NULL` |
| `last_academic_year_id` | `UUID REFERENCES public.academic_years(id) ON DELETE SET NULL` |
| `reason` | `TEXT NOT NULL` |
| `conduct` | `TEXT` |
| `remarks` | `TEXT` |
| `dues_cleared` | `BOOLEAN NOT NULL DEFAULT false` |
| `dues_override_reason` | `TEXT` |
| `approved_by` | `UUID REFERENCES auth.users(id) ON DELETE SET NULL` |
| `pdf_path` | `TEXT` |
| `is_duplicate_copy` | `BOOLEAN NOT NULL DEFAULT false` |
| `original_tc_id` | `UUID REFERENCES public.student_transfer_certificates(id) ON DELETE SET NULL` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
- `CONSTRAINT unique_tc_no_per_school UNIQUE (school_id, tc_no)`

**Indexes**:
- `idx_student_transfer_certificates_student_id` (`student_id`)
- `idx_student_transfer_certificates_school_id` (`school_id`)
- `idx_tc_qr_code` (`school_id, qr_verification_code`)

---
#### `import_batches`

- **Introduced in**: `007_students_foundations.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `created_by` | `UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` |
| `file_name` | `TEXT NOT NULL` |
| `total_rows` | `INTEGER NOT NULL DEFAULT 0` |
| `created_rows` | `INTEGER NOT NULL DEFAULT 0` |
| `skipped_rows` | `INTEGER NOT NULL DEFAULT 0` |
| `status` | `TEXT NOT NULL DEFAULT 'validated' CHECK (status IN ('validated'` |
| `error_report_path` | `TEXT` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_import_batches_school_id` (`school_id`)
- `idx_import_batches_created_by` (`created_by`)

---
#### `promotion_batches`

- **Introduced in**: `007_students_foundations.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `from_year_id` | `UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE` |
| `to_year_id` | `UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE` |
| `status` | `TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft'` |
| `summary` | `JSONB` |
| `created_by` | `UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_promotion_batches_school_id` (`school_id`)

---
#### `student_enrollments`

- **Introduced in**: `007_students_foundations.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `student_id` | `UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE` |
| `academic_year_id` | `UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE` |
| `class_id` | `UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE` |
| `section_id` | `UUID REFERENCES public.sections(id) ON DELETE SET NULL` |
| `roll_no` | `TEXT` |
| `status` | `TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active'` |
| `enrolled_on` | `DATE NOT NULL DEFAULT CURRENT_DATE` |
| `ended_on` | `DATE` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
- `CONSTRAINT unique_student_academic_year UNIQUE (student_id, academic_year_id)`

**Indexes**:
- `idx_student_enrollments_student_id` (`student_id`)
- `idx_student_enrollments_academic_year` (`academic_year_id`)
- `idx_student_enrollments_class_section` (`class_id, section_id`)
- `idx_student_enrollments_school_id` (`school_id`)
- `idx_student_enrollments_promotion_batch` (`promotion_batch_id`)

---
#### `counters`

- **Introduced in**: `007_students_foundations.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `key` | `TEXT NOT NULL` |
| `next_value` | `BIGINT NOT NULL DEFAULT 1` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_counters_school_id` (`school_id`)

---
#### `audit_logs`

- **Introduced in**: `007_students_foundations.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `actor_id` | `UUID REFERENCES auth.users(id) ON DELETE SET NULL` |
| `actor_role` | `TEXT` |
| `entity_type` | `TEXT NOT NULL` |
| `entity_id` | `UUID NOT NULL` |
| `action` | `TEXT NOT NULL` |
| `before` | `JSONB` |
| `after` | `JSONB` |
| `reason` | `TEXT` |
| `ip` | `INET` |
| `user_agent` | `TEXT` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_audit_logs_school_id` (`school_id`)
- `idx_audit_logs_entity` (`entity_type, entity_id`)
- `idx_audit_logs_actor` (`actor_id`)
- `idx_audit_logs_created_at` (`created_at DESC`)

---
#### `communication_consents`

- **Introduced in**: `007_students_foundations.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `parent_id` | `UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE` |
| `channel` | `TEXT NOT NULL CHECK (channel IN ('whatsapp'` |
| `status` | `TEXT NOT NULL DEFAULT 'opted_in' CHECK (status IN ('opted_in'` |
| `captured_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `source` | `TEXT NOT NULL CHECK (source IN ('admission_form'` |
| `captured_by` | `UUID REFERENCES auth.users(id) ON DELETE SET NULL` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
- `CONSTRAINT unique_parent_channel UNIQUE (parent_id, channel)`

**Indexes**:
- `idx_communication_consents_parent_id` (`parent_id`)
- `idx_communication_consents_school_id` (`school_id`)

---
#### `notification_outbox`

- **Introduced in**: `007_students_foundations.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `channel` | `TEXT NOT NULL CHECK (channel IN ('whatsapp'` |
| `template_key` | `TEXT NOT NULL` |
| `recipient_phone` | `TEXT NOT NULL` |
| `recipient_parent_id` | `UUID REFERENCES public.parents(id) ON DELETE SET NULL` |
| `params` | `JSONB NOT NULL DEFAULT '{}'::jsonb` |
| `related_type` | `TEXT` |
| `related_id` | `UUID` |
| `dedupe_key` | `TEXT` |
| `status` | `TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued'` |
| `provider_message_id` | `TEXT` |
| `error` | `TEXT` |
| `attempts` | `INTEGER NOT NULL DEFAULT 0` |
| `scheduled_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `sent_at` | `TIMESTAMPTZ` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
- `CONSTRAINT unique_dedupe_key UNIQUE (dedupe_key)`

**Indexes**:
- `idx_notification_outbox_school_id` (`school_id`)
- `idx_notification_outbox_status` (`status`)
- `idx_notification_outbox_scheduled_at` (`scheduled_at`)
- `idx_notification_outbox_dedupe_key` (`dedupe_key`)

---
#### `student_sensitive`

- **Introduced in**: `008_students_sensitive_and_records.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `student_id` | `UUID PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `aadhaar_enc` | `BYTEA` |
| `aadhaar_last4` | `TEXT` |
| `aadhaar_hash` | `TEXT` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_student_sensitive_school_id` (`school_id`)
- `idx_student_sensitive_aadhaar_hash` (`school_id, aadhaar_hash`)

---

### 7. Fee Management & Financial Ledger

*Fee structures, heads, terms, concessions, late fee rules, student dues, fee payments, receipts, day closings, reconciliation, and immutable ledger entries in integer paise.*

#### `fee_heads`

- **Introduced in**: `010_fees.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `name` | `TEXT NOT NULL` |
| `code` | `TEXT NOT NULL` |
| `kind` | `TEXT NOT NULL DEFAULT 'recurring' CHECK (kind IN ('recurring'` |
| `is_refundable` | `BOOLEAN NOT NULL DEFAULT false` |
| `rte_waivable` | `BOOLEAN NOT NULL DEFAULT false` |
| `is_system` | `BOOLEAN NOT NULL DEFAULT false` |
| `display_order` | `INTEGER NOT NULL DEFAULT 0` |
| `is_active` | `BOOLEAN NOT NULL DEFAULT true` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
- `CONSTRAINT unique_fee_head_code_per_school UNIQUE (school_id, code)`

**Indexes**:
- `idx_fee_heads_school_id` (`school_id`)
- `idx_fee_heads_school_active` (`school_id, is_active`)

---
#### `fee_terms`

- **Introduced in**: `010_fees.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `academic_year_id` | `UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE` |
| `name` | `TEXT NOT NULL` |
| `period_start` | `DATE` |
| `period_end` | `DATE` |
| `due_date` | `DATE NOT NULL` |
| `late_grace_days` | `INTEGER NOT NULL DEFAULT 0` |
| `sort_order` | `INTEGER NOT NULL DEFAULT 0` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_fee_terms_school_year` (`school_id, academic_year_id`)

---
#### `fee_structures`

- **Introduced in**: `010_fees.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `academic_year_id` | `UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE` |
| `class_id` | `UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE` |
| `name` | `TEXT NOT NULL` |
| `applies_to` | `TEXT NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all'` |
| `version` | `INTEGER NOT NULL DEFAULT 1` |
| `status` | `TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft'` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_fee_structures_school_year` (`school_id, academic_year_id`)
- `idx_fee_structures_class` (`class_id`)
- `unique_active_structure_per_class` (`academic_year_id, class_id, applies_to`)

---
#### `fee_structure_items`

- **Introduced in**: `010_fees.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `structure_id` | `UUID NOT NULL REFERENCES public.fee_structures(id) ON DELETE CASCADE` |
| `fee_head_id` | `UUID NOT NULL REFERENCES public.fee_heads(id) ON DELETE CASCADE` |
| `pattern` | `TEXT NOT NULL DEFAULT 'custom' CHECK (pattern IN ('equal_all_terms'` |
- `CONSTRAINT unique_structure_head UNIQUE (structure_id, fee_head_id)`

**Indexes**:
- `idx_fee_structure_items_structure` (`structure_id`)

---
#### `fee_structure_item_terms`

- **Introduced in**: `010_fees.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `item_id` | `UUID NOT NULL REFERENCES public.fee_structure_items(id) ON DELETE CASCADE` |
| `term_id` | `UUID NOT NULL REFERENCES public.fee_terms(id) ON DELETE CASCADE` |
| `amount_paise` | `BIGINT NOT NULL DEFAULT 0` |

**Indexes**:
- `idx_fee_structure_item_terms_item` (`item_id`)

---
#### `student_fee_assignments`

- **Introduced in**: `010_fees.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `student_id` | `UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE` |
| `academic_year_id` | `UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE` |
| `structure_id` | `UUID NOT NULL REFERENCES public.fee_structures(id) ON DELETE CASCADE` |
| `structure_version` | `INTEGER NOT NULL DEFAULT 1` |
| `assigned_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `assigned_by` | `UUID REFERENCES auth.users(id) ON DELETE SET NULL` |
| `status` | `TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active'` |

**Indexes**:
- `idx_student_fee_assignments_student` (`student_id, academic_year_id`)
- `idx_student_fee_assignments_school` (`school_id`)

---
#### `student_dues`

- **Introduced in**: `010_fees.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `student_id` | `UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE` |
| `academic_year_id` | `UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE` |
| `fee_head_id` | `UUID NOT NULL REFERENCES public.fee_heads(id) ON DELETE CASCADE` |
| `term_id` | `UUID REFERENCES public.fee_terms(id) ON DELETE SET NULL` |
| `source` | `TEXT NOT NULL DEFAULT 'structure' CHECK (source IN ('structure'` |
| `source_ref` | `UUID` |
| `description` | `TEXT` |
| `gross_paise` | `BIGINT NOT NULL DEFAULT 0` |
| `concession_paise` | `BIGINT NOT NULL DEFAULT 0` |
| `net_paise` | `BIGINT NOT NULL DEFAULT 0` |
| `paid_paise` | `BIGINT NOT NULL DEFAULT 0` |
| `balance_paise` | `BIGINT NOT NULL DEFAULT 0` |
| `due_date` | `DATE NOT NULL` |
| `status` | `TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending'` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `created_by` | `UUID REFERENCES auth.users(id) ON DELETE SET NULL` |
- Check: `CONSTRAINT chk_paid_paise CHECK (paid_paise >= 0 AND paid_paise <= net_paise)`
- Check: `CONSTRAINT chk_concession_paise CHECK (concession_paise >= 0 AND concession_paise <= gross_paise)`
- Check: `CONSTRAINT chk_net_paise CHECK (net_paise = gross_paise - concession_paise)`

**Indexes**:
- `unique_due_per_student_head_term` (`student_id, academic_year_id, fee_head_id, term_id, source`)
- `idx_student_dues_school` (`school_id`)
- `idx_student_dues_student_year` (`student_id, academic_year_id`)
- `idx_student_dues_status` (`school_id, status`)
- `idx_student_dues_due_date` (`due_date`)

---
#### `concession_rules`

- **Introduced in**: `010_fees.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `name` | `TEXT NOT NULL` |
| `basis` | `TEXT NOT NULL CHECK (basis IN ('sibling'` |
| `type` | `TEXT NOT NULL CHECK (type IN ('percent'` |
| `value` | `NUMERIC NOT NULL` |
| `fee_head_ids` | `UUID[] NOT NULL DEFAULT '{}'` |
| `sibling_from_rank` | `INTEGER` |
| `auto_apply` | `BOOLEAN NOT NULL DEFAULT false` |
| `needs_approval` | `BOOLEAN NOT NULL DEFAULT false` |
| `is_active` | `BOOLEAN NOT NULL DEFAULT true` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_concession_rules_school` (`school_id`)

---
#### `student_concessions`

- **Introduced in**: `010_fees.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `student_id` | `UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE` |
| `academic_year_id` | `UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE` |
| `rule_id` | `UUID REFERENCES public.concession_rules(id) ON DELETE SET NULL` |
| `type` | `TEXT NOT NULL CHECK (type IN ('percent'` |
| `value` | `NUMERIC NOT NULL` |
| `fee_head_ids` | `UUID[] NOT NULL DEFAULT '{}'` |
| `reason` | `TEXT NOT NULL` |
| `document_id` | `UUID REFERENCES public.student_documents(id) ON DELETE SET NULL` |
| `from_term_id` | `UUID REFERENCES public.fee_terms(id) ON DELETE SET NULL` |
| `approved_by` | `UUID REFERENCES auth.users(id) ON DELETE SET NULL` |
| `approved_at` | `TIMESTAMPTZ` |
| `status` | `TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active'` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_student_concessions_student` (`student_id, academic_year_id`)
- `idx_student_concessions_school` (`school_id`)

---
#### `late_fee_rules`

- **Introduced in**: `010_fees.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `name` | `TEXT NOT NULL` |
| `fee_head_ids` | `UUID[]` |
| `method` | `TEXT NOT NULL CHECK (method IN ('flat_once'` |
| `value` | `NUMERIC NOT NULL` |
| `grace_days` | `INTEGER NOT NULL DEFAULT 0` |
| `max_cap_paise` | `BIGINT` |
| `is_active` | `BOOLEAN NOT NULL DEFAULT true` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_late_fee_rules_school` (`school_id`)

---
#### `fee_settings`

- **Introduced in**: `010_fees.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `school_id` | `UUID PRIMARY KEY REFERENCES public.schools(id) ON DELETE CASCADE` |
| `receipt_prefix` | `TEXT NOT NULL DEFAULT 'MZ'` |
| `receipt_paper` | `TEXT NOT NULL DEFAULT 'a5' CHECK (receipt_paper IN ('a5'` |
| `receipt_language` | `TEXT NOT NULL DEFAULT 'en' CHECK (receipt_language IN ('en'` |
| `allow_partial` | `BOOLEAN NOT NULL DEFAULT true` |
| `min_partial_paise` | `BIGINT NOT NULL DEFAULT 0` |
| `allow_advance` | `BOOLEAN NOT NULL DEFAULT true` |
| `allocation_mode` | `TEXT NOT NULL DEFAULT 'auto_oldest_first' CHECK (allocation_mode IN ('auto_oldest_first'` |
| `round_to_rupee` | `BOOLEAN NOT NULL DEFAULT true` |
| `backdate_days_limit` | `INTEGER NOT NULL DEFAULT 0` |
| `discount_approval_threshold_percent` | `NUMERIC NOT NULL DEFAULT 10` |
| `auto_assign_fee_on_admission` | `BOOLEAN NOT NULL DEFAULT true` |
| `auto_late_fee` | `BOOLEAN NOT NULL DEFAULT false` |
| `cheque_receipt_timing` | `TEXT NOT NULL DEFAULT 'on_receipt' CHECK (cheque_receipt_timing IN ('on_receipt'` |
| `parent_pay_enabled` | `BOOLEAN NOT NULL DEFAULT false` |
| `gateway_fee_bearer` | `TEXT NOT NULL DEFAULT 'school' CHECK (gateway_fee_bearer IN ('school'` |
| `auto_print_receipt` | `BOOLEAN NOT NULL DEFAULT false` |
| `owner_pin_hash` | `TEXT` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

---
#### `fee_ledger`

- **Introduced in**: `010_fees.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `student_id` | `UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE` |
| `academic_year_id` | `UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE` |
| `due_id` | `UUID REFERENCES public.student_dues(id) ON DELETE SET NULL` |
| `receipt_id` | `UUID REFERENCES public.fee_receipts(id) ON DELETE SET NULL` |
| `entry_type` | `TEXT NOT NULL CHECK (entry_type IN (` |
| `amount_paise` | `BIGINT NOT NULL` |
| `note` | `TEXT` |
| `created_by` | `UUID REFERENCES auth.users(id) ON DELETE SET NULL` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_fee_ledger_school` (`school_id`)
- `idx_fee_ledger_student_year` (`student_id, academic_year_id`)
- `idx_fee_ledger_due` (`due_id`)
- `idx_fee_ledger_created_at` (`created_at DESC`)

---
#### `fee_credits`

- **Introduced in**: `010_fees.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `student_id` | `UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE` |
| `academic_year_id` | `UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE` |
| `amount_paise` | `BIGINT NOT NULL` |
| `remaining_paise` | `BIGINT NOT NULL` |
| `source_receipt_id` | `UUID REFERENCES public.fee_receipts(id) ON DELETE SET NULL` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_fee_credits_student` (`student_id, academic_year_id`)

---
#### `approval_requests`

- **Introduced in**: `010_fees.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `kind` | `TEXT NOT NULL CHECK (kind IN (` |
| `entity_type` | `TEXT` |
| `entity_id` | `UUID` |
| `payload` | `JSONB NOT NULL DEFAULT '{}'::jsonb` |
| `requested_by` | `UUID REFERENCES auth.users(id) ON DELETE SET NULL` |
| `status` | `TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending'` |
| `decided_by` | `UUID REFERENCES auth.users(id) ON DELETE SET NULL` |
| `decided_at` | `TIMESTAMPTZ` |
| `decision_note` | `TEXT` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_approval_requests_school` (`school_id`)
- `idx_approval_requests_status` (`school_id, status`)
- `idx_approval_requests_kind` (`school_id, kind`)

---
#### `day_closings`

- **Introduced in**: `010_fees.sql, 011_fee_collection.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `business_date` | `DATE NOT NULL` |
| `opening_cash_paise` | `BIGINT NOT NULL DEFAULT 0` |
| `system_cash_paise` | `BIGINT NOT NULL DEFAULT 0` |
| `refunds_cash_paise` | `BIGINT NOT NULL DEFAULT 0` |
| `expected_cash_paise` | `BIGINT NOT NULL DEFAULT 0` |
| `counted_cash_paise` | `BIGINT NOT NULL DEFAULT 0` |
| `denominations` | `JSONB NOT NULL DEFAULT '{}'::jsonb` |
| `difference_paise` | `BIGINT NOT NULL DEFAULT 0` |
| `notes` | `TEXT` |
| `status` | `TEXT NOT NULL DEFAULT 'closed' CHECK (status IN ('closed'` |
| `closed_by` | `UUID REFERENCES auth.users(id) ON DELETE SET NULL` |
| `closed_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `business_date` | `DATE NOT NULL` |
| `opening_cash_paise` | `BIGINT NOT NULL DEFAULT 0` |
| `system_cash_paise` | `BIGINT NOT NULL DEFAULT 0` |
| `refunds_cash_paise` | `BIGINT NOT NULL DEFAULT 0` |
| `expected_cash_paise` | `BIGINT NOT NULL DEFAULT 0` |
| `counted_cash_paise` | `BIGINT` |
| `denominations` | `JSONB` |
| `difference_paise` | `BIGINT` |
| `notes` | `TEXT` |
| `status` | `TEXT NOT NULL DEFAULT 'closed' CHECK (status IN ('closed'` |
| `closed_by` | `UUID REFERENCES public.profiles(id)` |
| `closed_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
- `CONSTRAINT unique_day_closing UNIQUE (school_id, business_date)`
- `UNIQUE (school_id, business_date)`

**Indexes**:
- `idx_day_closings_school` (`school_id`)
- `idx_day_closings_school` (`school_id, business_date`)

---
#### `fee_receipts`

- **Introduced in**: `010_fees.sql, 011_fee_collection.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `receipt_no` | `TEXT NOT NULL` |
| `student_id` | `UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE` |
| `academic_year_id` | `UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE` |
| `receipt_date` | `DATE NOT NULL` |
| `total_paise` | `BIGINT NOT NULL DEFAULT 0` |
| `status` | `TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active'` |
| `source` | `TEXT NOT NULL DEFAULT 'counter' CHECK (source IN ('counter'` |
| `payment_group_id` | `UUID` |
| `collected_by` | `UUID REFERENCES auth.users(id) ON DELETE SET NULL` |
| `remarks` | `TEXT` |
| `idempotency_key` | `TEXT UNIQUE` |
| `print_count` | `INTEGER NOT NULL DEFAULT 0` |
| `whatsapp_sent_at` | `TIMESTAMPTZ` |
| `cancelled_by` | `UUID REFERENCES auth.users(id) ON DELETE SET NULL` |
| `cancelled_at` | `TIMESTAMPTZ` |
| `cancel_reason` | `TEXT` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `receipt_no` | `TEXT NOT NULL` |
| `student_id` | `UUID NOT NULL REFERENCES public.students(id)` |
| `academic_year_id` | `UUID NOT NULL REFERENCES public.academic_years(id)` |
| `receipt_date` | `DATE NOT NULL DEFAULT CURRENT_DATE` |
| `total_paise` | `BIGINT NOT NULL CHECK (total_paise >= 0)` |
| `status` | `TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active'` |
| `source` | `TEXT NOT NULL DEFAULT 'counter' CHECK (source IN ('counter'` |
| `payment_group_id` | `UUID` |
| `collected_by` | `UUID REFERENCES public.profiles(id)` |
| `remarks` | `TEXT` |
| `idempotency_key` | `TEXT UNIQUE` |
| `print_count` | `INT NOT NULL DEFAULT 0` |
| `whatsapp_sent_at` | `TIMESTAMPTZ` |
| `cancelled_by` | `UUID REFERENCES public.profiles(id)` |
| `cancelled_at` | `TIMESTAMPTZ` |
| `cancel_reason` | `TEXT` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
- `CONSTRAINT unique_receipt_no_per_school UNIQUE (school_id, receipt_no)`
- `UNIQUE (school_id, receipt_no)`

**Indexes**:
- `idx_fee_receipts_school` (`school_id`)
- `idx_fee_receipts_student` (`student_id`)
- `idx_fee_receipts_school_id` (`school_id`)
- `idx_fee_receipts_student_id` (`student_id`)
- `idx_fee_receipts_receipt_date` (`school_id, receipt_date`)
- `idx_fee_receipts_payment_group` (`payment_group_id`)
- `idx_fee_receipts_idempotency` (`idempotency_key`)

---
#### `fee_receipt_items`

- **Introduced in**: `011_fee_collection.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `receipt_id` | `UUID NOT NULL REFERENCES public.fee_receipts(id) ON DELETE CASCADE` |
| `due_id` | `UUID NOT NULL REFERENCES public.student_dues(id)` |
| `fee_head_id` | `UUID NOT NULL REFERENCES public.fee_heads(id)` |
| `amount_paise` | `BIGINT NOT NULL CHECK (amount_paise >= 0)` |
| `concession_paise` | `BIGINT NOT NULL DEFAULT 0 CHECK (concession_paise >= 0)` |

**Indexes**:
- `idx_fee_receipt_items_receipt` (`receipt_id`)
- `idx_fee_receipt_items_due` (`due_id`)

---
#### `fee_payments`

- **Introduced in**: `011_fee_collection.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `receipt_id` | `UUID NOT NULL REFERENCES public.fee_receipts(id) ON DELETE CASCADE` |
| `mode` | `TEXT NOT NULL CHECK (mode IN ('cash'` |
| `amount_paise` | `BIGINT NOT NULL CHECK (amount_paise > 0)` |
| `reference_no` | `TEXT` |
| `bank_name` | `TEXT` |
| `instrument_no` | `TEXT` |
| `instrument_date` | `DATE` |
| `cheque_status` | `TEXT CHECK (cheque_status IN ('received'` |
| `gateway_order_id` | `TEXT` |
| `gateway_payment_id` | `TEXT` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_fee_payments_receipt` (`receipt_id`)
- `idx_fee_payments_school` (`school_id`)
- `idx_fee_payments_mode` (`school_id, mode`)

---
#### `fee_outbox`

- **Introduced in**: `011_fee_collection.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `event_type` | `TEXT NOT NULL` |
| `payload` | `JSONB NOT NULL` |
| `status` | `TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending'` |
| `attempts` | `INT NOT NULL DEFAULT 0` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `sent_at` | `TIMESTAMPTZ` |

**Indexes**:
- `idx_fee_outbox_pending` (`status, created_at`)

---
#### `fee_audit_log`

- **Introduced in**: `011_fee_collection.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `actor_id` | `UUID REFERENCES public.profiles(id)` |
| `event_type` | `TEXT NOT NULL` |
| `entity_type` | `TEXT` |
| `entity_id` | `UUID` |
| `before_json` | `JSONB` |
| `after_json` | `JSONB` |
| `ip_address` | `TEXT` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_fee_audit_log_school` (`school_id, created_at DESC`)
- `idx_fee_audit_log_entity` (`entity_type, entity_id`)

---
#### `fee_reminder_rules`

- **Introduced in**: `012_fee_operations.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `name` | `TEXT NOT NULL` |
| `days_offset` | `INT NOT NULL` |
| `channel` | `TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp'` |
| `template_key` | `TEXT NOT NULL DEFAULT 'fee_reminder_overdue'` |
| `is_active` | `BOOLEAN NOT NULL DEFAULT true` |
| `max_sends` | `INT NOT NULL DEFAULT 5` |
| `min_balance_paise` | `BIGINT NOT NULL DEFAULT 10000` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_fee_reminder_rules_school` (`school_id`)

---
#### `fee_followups`

- **Introduced in**: `012_fee_operations.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `student_id` | `UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE` |
| `staff_id` | `UUID REFERENCES public.profiles(id) ON DELETE SET NULL` |
| `note` | `TEXT NOT NULL` |
| `promise_date` | `DATE` |
| `status` | `TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending'` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_fee_followups_student` (`school_id, student_id`)
- `idx_fee_followups_promise` (`school_id, promise_date`)

---
#### `fee_refunds`

- **Introduced in**: `012_fee_operations.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `student_id` | `UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE` |
| `receipt_id` | `UUID REFERENCES public.fee_receipts(id) ON DELETE SET NULL` |
| `academic_year_id` | `UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE` |
| `amount_paise` | `BIGINT NOT NULL CHECK (amount_paise > 0)` |
| `reason` | `TEXT NOT NULL` |
| `status` | `TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested'` |
| `payment_mode` | `TEXT NOT NULL DEFAULT 'cash' CHECK (payment_mode IN ('cash'` |
| `reference_no` | `TEXT` |
| `requested_by` | `UUID REFERENCES public.profiles(id) ON DELETE SET NULL` |
| `approved_by` | `UUID REFERENCES public.profiles(id) ON DELETE SET NULL` |
| `approved_at` | `TIMESTAMPTZ` |
| `paid_at` | `TIMESTAMPTZ` |
| `ledger_entry_id` | `UUID` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_fee_refunds_school` (`school_id, status`)

---

### 8. Online Payments & Gateways

*Payment gateway configurations (Razorpay, Cashfree, etc.), online payment orders, webhook event logs, and secure parent pay tokens.*

#### `school_gateway_credentials`

- **Introduced in**: `013_online_payments.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `gateway` | `TEXT NOT NULL DEFAULT 'razorpay' CHECK (gateway IN ('razorpay'` |
| `key_id` | `TEXT NOT NULL` |
| `key_secret_enc` | `TEXT NOT NULL` |
| `webhook_secret_enc` | `TEXT NOT NULL` |
| `who_bears_charges` | `TEXT NOT NULL DEFAULT 'school' CHECK (who_bears_charges IN ('school'` |
| `convenience_fee_percent` | `NUMERIC(5` |
| `is_active` | `BOOLEAN NOT NULL DEFAULT true` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
- `CONSTRAINT unique_school_gateway UNIQUE (school_id, gateway)`

**Indexes**:
- `idx_school_gateway_credentials_school` (`school_id`)

---
#### `online_payment_orders`

- **Introduced in**: `013_online_payments.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `parent_id` | `UUID REFERENCES public.parents(id) ON DELETE SET NULL` |
| `student_ids` | `UUID[] NOT NULL` |
| `due_ids` | `UUID[] NOT NULL` |
| `amount_paise` | `BIGINT NOT NULL CHECK (amount_paise > 0)` |
| `convenience_fee_paise` | `BIGINT NOT NULL DEFAULT 0` |
| `currency` | `TEXT NOT NULL DEFAULT 'INR'` |
| `gateway` | `TEXT NOT NULL DEFAULT 'razorpay'` |
| `gateway_order_id` | `TEXT NOT NULL` |
| `gateway_payment_id` | `TEXT` |
| `gateway_signature` | `TEXT` |
| `status` | `TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created'` |
| `payment_group_id` | `UUID` |
| `receipt_ids` | `UUID[] DEFAULT '{}'` |
| `advance_credit_ids` | `UUID[] DEFAULT '{}'` |
| `payer_phone` | `TEXT` |
| `payer_email` | `TEXT` |
| `error_code` | `TEXT` |
| `error_description` | `TEXT` |
| `expires_at` | `TIMESTAMPTZ NOT NULL` |
| `captured_at` | `TIMESTAMPTZ` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
- `CONSTRAINT unique_gateway_order UNIQUE (gateway, gateway_order_id)`

**Indexes**:
- `idx_online_payment_orders_school` (`school_id`)
- `idx_online_payment_orders_status` (`school_id, status`)
- `idx_online_payment_orders_expires` (`status, expires_at`)
- `idx_online_payment_orders_gateway_order` (`gateway_order_id`)

---
#### `gateway_webhook_events`

- **Introduced in**: `013_online_payments.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `gateway` | `TEXT NOT NULL` |
| `event_id` | `TEXT NOT NULL` |
| `event_type` | `TEXT NOT NULL` |
| `payload` | `JSONB NOT NULL` |
| `processed` | `BOOLEAN NOT NULL DEFAULT false` |
| `processed_at` | `TIMESTAMPTZ` |
| `error` | `TEXT` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
- `CONSTRAINT unique_gateway_event UNIQUE (gateway, event_id)`

**Indexes**:
- `idx_gateway_webhook_events_school` (`school_id`)
- `idx_gateway_webhook_events_lookup` (`gateway, event_id`)

---
#### `parent_pay_tokens`

- **Introduced in**: `013_online_payments.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `parent_id` | `UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE` |
| `token` | `TEXT NOT NULL UNIQUE` |
| `expires_at` | `TIMESTAMPTZ NOT NULL` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_parent_pay_tokens_lookup` (`token`)
- `idx_parent_pay_tokens_school_parent` (`school_id, parent_id`)

---
#### `parent_pay_sessions`

- **Introduced in**: `013_online_payments.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `token_id` | `UUID NOT NULL REFERENCES public.parent_pay_tokens(id) ON DELETE CASCADE` |
| `otp_code` | `TEXT NOT NULL` |
| `attempts` | `INTEGER NOT NULL DEFAULT 0` |
| `max_attempts` | `INTEGER NOT NULL DEFAULT 3` |
| `otp_expires_at` | `TIMESTAMPTZ NOT NULL` |
| `verified` | `BOOLEAN NOT NULL DEFAULT false` |
| `session_token` | `TEXT UNIQUE` |
| `session_expires_at` | `TIMESTAMPTZ` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_parent_pay_sessions_token_id` (`token_id`)
- `idx_parent_pay_sessions_session_token` (`session_token`)

---

### 9. Transport System (Pro Tier)

*Fleet vehicle management, driver/attendant staff, routes, bus stops, distance/stop-based fee zones, student bus assignments, parent requests, and absence logging.*

#### `transport_settings`

- **Introduced in**: `014_transport_core.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `school_id` | `UUID PRIMARY KEY REFERENCES public.schools(id) ON DELETE CASCADE` |
| `fee_basis` | `TEXT NOT NULL DEFAULT 'zone' CHECK (fee_basis IN ('stop'` |
| `billing_months` | `INT[] NOT NULL DEFAULT '{4` |
| `run_days` | `INT[] NOT NULL DEFAULT '{1` |
| `drop_order` | `TEXT NOT NULL DEFAULT 'reverse' CHECK (drop_order IN ('reverse'` |
| `require_pretrip_checklist` | `BOOLEAN NOT NULL DEFAULT false` |
| `guardian_handover_stages` | `TEXT[] NOT NULL DEFAULT '{pre_primary}'` |
| `block_expired_documents` | `BOOLEAN NOT NULL DEFAULT true` |
| `expiry_alert_days` | `INT[] NOT NULL DEFAULT '{30` |
| `tracking_enabled` | `BOOLEAN NOT NULL DEFAULT false` |
| `notify_boarding` | `BOOLEAN NOT NULL DEFAULT false` |
| `notify_approaching` | `BOOLEAN NOT NULL DEFAULT true` |
| `approaching_meters` | `INT NOT NULL DEFAULT 800` |
| `partial_month_rule` | `TEXT NOT NULL DEFAULT 'full_month' CHECK (partial_month_rule IN ('full_month'` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

---
#### `transport_vehicles`

- **Introduced in**: `014_transport_core.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `registration_no` | `TEXT NOT NULL` |
| `vehicle_type` | `TEXT NOT NULL CHECK (vehicle_type IN ('bus'` |
| `make_model` | `TEXT NOT NULL` |
| `manufacture_year` | `INT` |
| `capacity` | `INT NOT NULL CHECK (capacity > 0)` |
| `fuel_type` | `TEXT` |
| `ownership` | `TEXT NOT NULL DEFAULT 'owned' CHECK (ownership IN ('owned'` |
| `vendor_name` | `TEXT` |
| `vendor_phone` | `TEXT` |
| `gps_device_id` | `TEXT` |
| `odometer_km` | `INT` |
| `safety_items` | `JSONB NOT NULL DEFAULT '{"first_aid": false` |
| `status` | `TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active'` |
| `notes` | `TEXT` |
| `deleted_at` | `TIMESTAMPTZ` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_transport_vehicles_reg_school` (`school_id, UPPER(REPLACE(registration_no, ' ', ''`)

---
#### `vehicle_documents`

- **Introduced in**: `014_transport_core.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `vehicle_id` | `UUID NOT NULL REFERENCES public.transport_vehicles(id) ON DELETE CASCADE` |
| `doc_type` | `TEXT NOT NULL CHECK (doc_type IN ('rc'` |
| `doc_number` | `TEXT NOT NULL` |
| `issued_on` | `DATE` |
| `expires_on` | `DATE NOT NULL` |
| `file_path` | `TEXT` |
| `is_mandatory` | `BOOLEAN NOT NULL DEFAULT true` |
| `deleted_at` | `TIMESTAMPTZ` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_vehicle_docs_vehicle` (`vehicle_id`)
- `idx_vehicle_docs_expires` (`expires_on`)

---
#### `transport_staff`

- **Introduced in**: `014_transport_core.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `staff_type` | `TEXT NOT NULL CHECK (staff_type IN ('driver'` |
| `full_name` | `TEXT NOT NULL` |
| `phone` | `TEXT NOT NULL` |
| `photo_path` | `TEXT` |
| `license_no` | `TEXT` |
| `license_class` | `TEXT` |
| `license_expires_on` | `DATE` |
| `badge_no` | `TEXT` |
| `police_verified_on` | `DATE` |
| `medical_fit_on` | `DATE` |
| `experience_years` | `INT` |
| `address` | `TEXT` |
| `emergency_contact_name` | `TEXT` |
| `emergency_contact_phone` | `TEXT` |
| `id_proof_type` | `TEXT` |
| `id_proof_last4` | `TEXT` |
| `joined_on` | `DATE NOT NULL DEFAULT CURRENT_DATE` |
| `status` | `TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active'` |
| `user_id` | `UUID REFERENCES auth.users(id) ON DELETE SET NULL` |
| `deleted_at` | `TIMESTAMPTZ` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_transport_staff_phone_school` (`school_id, phone`)

---
#### `transport_routes`

- **Introduced in**: `014_transport_core.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `name` | `TEXT NOT NULL` |
| `code` | `TEXT NOT NULL` |
| `description` | `TEXT` |
| `default_vehicle_id` | `UUID REFERENCES public.transport_vehicles(id) ON DELETE SET NULL` |
| `default_driver_id` | `UUID REFERENCES public.transport_staff(id) ON DELETE SET NULL` |
| `default_attendant_id` | `UUID REFERENCES public.transport_staff(id) ON DELETE SET NULL` |
| `pickup_start_time` | `TIME NOT NULL` |
| `drop_start_time` | `TIME NOT NULL` |
| `est_duration_min` | `INT NOT NULL DEFAULT 45` |
| `status` | `TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft'` |
| `deleted_at` | `TIMESTAMPTZ` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_transport_routes_code_school` (`school_id, UPPER(code`)

---
#### `route_stops`

- **Introduced in**: `014_transport_core.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `route_id` | `UUID NOT NULL REFERENCES public.transport_routes(id) ON DELETE CASCADE` |
| `name` | `TEXT NOT NULL` |
| `landmark` | `TEXT` |
| `lat` | `NUMERIC(10` |
| `lng` | `NUMERIC(10` |
| `sequence` | `INT NOT NULL CHECK (sequence > 0)` |
| `pickup_time` | `TIME NOT NULL` |
| `drop_time` | `TIME NOT NULL` |
| `distance_km` | `NUMERIC(6` |
| `fee_zone_id` | `UUID` |
| `deleted_at` | `TIMESTAMPTZ` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_route_stops_sequence` (`route_id, sequence`)

---
#### `transport_fee_zones`

- **Introduced in**: `014_transport_core.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `name` | `TEXT NOT NULL` |
| `distance_from_km` | `NUMERIC(6` |
| `distance_to_km` | `NUMERIC(6` |
| `monthly_fee_paise` | `BIGINT NOT NULL DEFAULT 0 CHECK (monthly_fee_paise >= 0)` |
| `pickup_only_monthly_paise` | `BIGINT NOT NULL DEFAULT 0 CHECK (pickup_only_monthly_paise >= 0)` |
| `drop_only_monthly_paise` | `BIGINT NOT NULL DEFAULT 0 CHECK (drop_only_monthly_paise >= 0)` |
| `is_active` | `BOOLEAN NOT NULL DEFAULT true` |
| `deleted_at` | `TIMESTAMPTZ` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

---
#### `transport_assignments`

- **Introduced in**: `015_transport_assignments.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `student_id` | `UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE` |
| `academic_year_id` | `UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE` |
| `route_id` | `UUID NOT NULL REFERENCES public.transport_routes(id) ON DELETE RESTRICT` |
| `pickup_stop_id` | `UUID NOT NULL REFERENCES public.route_stops(id) ON DELETE RESTRICT` |
| `drop_stop_id` | `UUID NOT NULL REFERENCES public.route_stops(id) ON DELETE RESTRICT` |
| `service_type` | `TEXT NOT NULL CHECK (service_type IN ('both'` |
| `effective_from` | `DATE NOT NULL` |
| `effective_to` | `DATE` |
| `monthly_fee_paise` | `BIGINT NOT NULL CHECK (monthly_fee_paise >= 0)` |
| `requires_guardian_handover` | `BOOLEAN NOT NULL DEFAULT false` |
| `status` | `TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active'` |
| `end_reason` | `TEXT` |
| `created_by` | `UUID` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_transport_assignments_active_student` (`school_id, student_id, academic_year_id`)
- `idx_transport_assignments_route` (`route_id, status`)
- `idx_transport_assignments_student` (`student_id`)

---
#### `transport_requests`

- **Introduced in**: `015_transport_assignments.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `student_id` | `UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE` |
| `requested_location` | `TEXT NOT NULL` |
| `note` | `TEXT` |
| `status` | `TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending'` |
| `decided_by` | `UUID` |
| `decided_at` | `TIMESTAMPTZ` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_transport_requests_school_status` (`school_id, status`)
- `idx_transport_requests_student` (`student_id`)

---
#### `transport_absences`

- **Introduced in**: `015_transport_assignments.sql`
- **RLS Enabled**: ✅ Yes

| Column | Type / Constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `school_id` | `UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE` |
| `student_id` | `UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE` |
| `date_from` | `DATE NOT NULL` |
| `date_to` | `DATE NOT NULL` |
| `reason` | `TEXT` |
| `created_by` | `UUID` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

**Indexes**:
- `idx_transport_absences_student_dates` (`student_id, date_from, date_to`)

---

## 4. Verification & Audit Summary

- **Unused / Dead Tables**: None found. `idempotency_keys` was verified to exist only in a deleted TypeScript prototype file and was never migrated into Supabase; no database DROP migration is required.
- **RLS Coverage**: 100% (72 of 72 tables enforce Row-Level Security).
- **Data Isolation**: Verified through `tests/test-rls-isolation.ts` and `tests/test-multitenant-isolation.ts`.
- **Test Baseline**: 709 passed across all phase test suites with zero failures.
