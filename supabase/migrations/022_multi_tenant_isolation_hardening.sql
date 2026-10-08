-- Migration: 022_multi_tenant_isolation_hardening.sql
-- Architecture Refactor: Production-grade Multi-Tenant Isolation & Integrity
-- 1. Canonical Tenant Identification via auth.uid() & profiles.school_id
-- 2. Immutable school_id triggers to prevent cross-school hijacking
-- 3. Composite Foreign Keys (school_id, entity_id) guaranteeing zero cross-school references
-- 4. Single Canonical Home for Sensitive Data (student_sensitive)
-- 5. Normalized Junction Tables replacing UUID arrays
-- 6. Tenant-scoped uniqueness and comprehensive RLS hardening

-- ============================================================================
-- 1. CANONICAL TENANT IDENTIFICATION & VALIDATION HELPERS
-- ============================================================================

-- Function: get_current_school_id()
-- Resolves the authenticated user's canonical school_id from profiles or created_by
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

-- Function: is_school_member(p_school_id UUID)
-- Validates if the authenticated user is an authorized member of target school
CREATE OR REPLACE FUNCTION public.is_school_member(p_school_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    p_school_id IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND (
      p_school_id = public.get_current_school_id()
      OR p_school_id IN (SELECT public.school_member_school_ids())
    )
  );
$$;

-- Function: is_school_admin(p_school_id UUID)
-- Validates if the authenticated user is an administrator of target school
CREATE OR REPLACE FUNCTION public.is_school_admin(p_school_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    p_school_id IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND (
      p_school_id IN (SELECT public.school_admin_school_ids())
      OR (
        p_school_id = public.get_current_school_id()
        AND EXISTS (
          SELECT 1 FROM public.profiles
          WHERE auth_id = auth.uid()
            AND school_id = p_school_id
            AND LOWER(TRIM(role)) IN ('school_admin', 'super_admin', 'owner', 'admin')
        )
      )
    )
  );
$$;

-- Function: prevent_school_id_update()
-- Universal BEFORE UPDATE trigger ensuring tenant ownership can never be tampered with
CREATE OR REPLACE FUNCTION public.prevent_school_id_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.school_id IS DISTINCT FROM NEW.school_id THEN
    RAISE EXCEPTION 'Security Violation: school_id is immutable and cannot be transferred (% -> %)', OLD.school_id, NEW.school_id;
  END IF;
  RETURN NEW;
END;
$$;


-- ============================================================================
-- 2. COMPOSITE UNIQUE KEYS ON REFERENCED TENANT TABLES
-- Enables (school_id, id) composite foreign keys across all child relationships
-- ============================================================================

DO $$
BEGIN
  -- Academic tables
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_academic_years_school_id_id') THEN
    ALTER TABLE public.academic_years ADD CONSTRAINT unique_academic_years_school_id_id UNIQUE (school_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_classes_school_id_id') THEN
    ALTER TABLE public.classes ADD CONSTRAINT unique_classes_school_id_id UNIQUE (school_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_sections_school_id_id') THEN
    ALTER TABLE public.sections ADD CONSTRAINT unique_sections_school_id_id UNIQUE (school_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_subjects_school_id_id') THEN
    ALTER TABLE public.subjects ADD CONSTRAINT unique_subjects_school_id_id UNIQUE (school_id, id);
  END IF;

  -- People & Core tables
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_students_school_id_id') THEN
    ALTER TABLE public.students ADD CONSTRAINT unique_students_school_id_id UNIQUE (school_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_parents_school_id_id') THEN
    ALTER TABLE public.parents ADD CONSTRAINT unique_parents_school_id_id UNIQUE (school_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_staff_school_id_id') THEN
    ALTER TABLE public.staff ADD CONSTRAINT unique_staff_school_id_id UNIQUE (school_id, id);
  END IF;

  -- Fee tables
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_fee_heads_school_id_id') THEN
    ALTER TABLE public.fee_heads ADD CONSTRAINT unique_fee_heads_school_id_id UNIQUE (school_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_fee_terms_school_id_id') THEN
    ALTER TABLE public.fee_terms ADD CONSTRAINT unique_fee_terms_school_id_id UNIQUE (school_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_fee_structures_school_id_id') THEN
    ALTER TABLE public.fee_structures ADD CONSTRAINT unique_fee_structures_school_id_id UNIQUE (school_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_concession_rules_school_id_id') THEN
    ALTER TABLE public.concession_rules ADD CONSTRAINT unique_concession_rules_school_id_id UNIQUE (school_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_student_concessions_school_id_id') THEN
    ALTER TABLE public.student_concessions ADD CONSTRAINT unique_student_concessions_school_id_id UNIQUE (school_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_late_fee_rules_school_id_id') THEN
    ALTER TABLE public.late_fee_rules ADD CONSTRAINT unique_late_fee_rules_school_id_id UNIQUE (school_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_fee_receipts_school_id_id') THEN
    ALTER TABLE public.fee_receipts ADD CONSTRAINT unique_fee_receipts_school_id_id UNIQUE (school_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_student_dues_school_id_id') THEN
    ALTER TABLE public.student_dues ADD CONSTRAINT unique_student_dues_school_id_id UNIQUE (school_id, id);
  END IF;

  -- Transport & CMS tables
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_transport_vehicles_school_id_id') THEN
    ALTER TABLE public.transport_vehicles ADD CONSTRAINT unique_transport_vehicles_school_id_id UNIQUE (school_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_transport_staff_school_id_id') THEN
    ALTER TABLE public.transport_staff ADD CONSTRAINT unique_transport_staff_school_id_id UNIQUE (school_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_transport_routes_school_id_id') THEN
    ALTER TABLE public.transport_routes ADD CONSTRAINT unique_transport_routes_school_id_id UNIQUE (school_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_transport_fee_zones_school_id_id') THEN
    ALTER TABLE public.transport_fee_zones ADD CONSTRAINT unique_transport_fee_zones_school_id_id UNIQUE (school_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_school_websites_school_id_id') THEN
    ALTER TABLE public.school_websites ADD CONSTRAINT unique_school_websites_school_id_id UNIQUE (school_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_online_payment_orders_school_id_id') THEN
    ALTER TABLE public.online_payment_orders ADD CONSTRAINT unique_online_payment_orders_school_id_id UNIQUE (school_id, id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_parent_pay_tokens_school_id_id') THEN
    ALTER TABLE public.parent_pay_tokens ADD CONSTRAINT unique_parent_pay_tokens_school_id_id UNIQUE (school_id, id);
  END IF;
END $$;


-- ============================================================================
-- 3. COMPOSITE TENANT-SAFE FOREIGN KEY CONSTRAINTS
-- Guarantees no record can point to an entity belonging to a different school
-- ============================================================================

DO $$
BEGIN
  -- 1. sections -> classes
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sections_school_class') THEN
    ALTER TABLE public.sections
      ADD CONSTRAINT fk_sections_school_class
      FOREIGN KEY (school_id, class_id)
      REFERENCES public.classes(school_id, id)
      ON DELETE CASCADE;
  END IF;

  -- 2. class_subjects -> classes & subjects
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_class_subjects_school_class') THEN
    ALTER TABLE public.class_subjects
      ADD CONSTRAINT fk_class_subjects_school_class
      FOREIGN KEY (school_id, class_id)
      REFERENCES public.classes(school_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_class_subjects_school_subject') THEN
    ALTER TABLE public.class_subjects
      ADD CONSTRAINT fk_class_subjects_school_subject
      FOREIGN KEY (school_id, subject_id)
      REFERENCES public.subjects(school_id, id)
      ON DELETE CASCADE;
  END IF;

  -- 3. students -> admission_class
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_students_school_admission_class') THEN
    ALTER TABLE public.students
      ADD CONSTRAINT fk_students_school_admission_class
      FOREIGN KEY (school_id, admission_class_id)
      REFERENCES public.classes(school_id, id)
      ON DELETE SET NULL;
  END IF;

  -- 4. student_addresses -> students
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_addresses_school_student') THEN
    ALTER TABLE public.student_addresses
      ADD CONSTRAINT fk_student_addresses_school_student
      FOREIGN KEY (school_id, student_id)
      REFERENCES public.students(school_id, id)
      ON DELETE CASCADE;
  END IF;

  -- 5. student_parents -> students & parents
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_parents_school_student') THEN
    ALTER TABLE public.student_parents
      ADD CONSTRAINT fk_student_parents_school_student
      FOREIGN KEY (school_id, student_id)
      REFERENCES public.students(school_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_parents_school_parent') THEN
    ALTER TABLE public.student_parents
      ADD CONSTRAINT fk_student_parents_school_parent
      FOREIGN KEY (school_id, parent_id)
      REFERENCES public.parents(school_id, id)
      ON DELETE CASCADE;
  END IF;

  -- 6. student_enrollments -> students, classes, academic_years
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_enrollments_school_student') THEN
    ALTER TABLE public.student_enrollments
      ADD CONSTRAINT fk_student_enrollments_school_student
      FOREIGN KEY (school_id, student_id)
      REFERENCES public.students(school_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_enrollments_school_class') THEN
    ALTER TABLE public.student_enrollments
      ADD CONSTRAINT fk_student_enrollments_school_class
      FOREIGN KEY (school_id, class_id)
      REFERENCES public.classes(school_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_enrollments_school_academic_year') THEN
    ALTER TABLE public.student_enrollments
      ADD CONSTRAINT fk_student_enrollments_school_academic_year
      FOREIGN KEY (school_id, academic_year_id)
      REFERENCES public.academic_years(school_id, id)
      ON DELETE CASCADE;
  END IF;

  -- 7. student_documents -> students
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_documents_school_student') THEN
    ALTER TABLE public.student_documents
      ADD CONSTRAINT fk_student_documents_school_student
      FOREIGN KEY (school_id, student_id)
      REFERENCES public.students(school_id, id)
      ON DELETE CASCADE;
  END IF;

  -- 8. student_previous_schools -> students
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_previous_schools_school_student') THEN
    ALTER TABLE public.student_previous_schools
      ADD CONSTRAINT fk_student_previous_schools_school_student
      FOREIGN KEY (school_id, student_id)
      REFERENCES public.students(school_id, id)
      ON DELETE CASCADE;
  END IF;

  -- 9. student_achievements -> students
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_achievements_school_student') THEN
    ALTER TABLE public.student_achievements
      ADD CONSTRAINT fk_student_achievements_school_student
      FOREIGN KEY (school_id, student_id)
      REFERENCES public.students(school_id, id)
      ON DELETE CASCADE;
  END IF;

  -- 10. student_medical -> students
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_medical_school_student') THEN
    ALTER TABLE public.student_medical
      ADD CONSTRAINT fk_student_medical_school_student
      FOREIGN KEY (school_id, student_id)
      REFERENCES public.students(school_id, id)
      ON DELETE CASCADE;
  END IF;

  -- 11. student_events -> students
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_events_school_student') THEN
    ALTER TABLE public.student_events
      ADD CONSTRAINT fk_student_events_school_student
      FOREIGN KEY (school_id, student_id)
      REFERENCES public.students(school_id, id)
      ON DELETE CASCADE;
  END IF;

  -- 12. student_transfer_certificates -> students
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_tc_school_student') THEN
    ALTER TABLE public.student_transfer_certificates
      ADD CONSTRAINT fk_student_tc_school_student
      FOREIGN KEY (school_id, student_id)
      REFERENCES public.students(school_id, id)
      ON DELETE CASCADE;
  END IF;

  -- 13. student_dues -> students & fee_heads
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_dues_school_student') THEN
    ALTER TABLE public.student_dues
      ADD CONSTRAINT fk_student_dues_school_student
      FOREIGN KEY (school_id, student_id)
      REFERENCES public.students(school_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_dues_school_fee_head') THEN
    ALTER TABLE public.student_dues
      ADD CONSTRAINT fk_student_dues_school_fee_head
      FOREIGN KEY (school_id, fee_head_id)
      REFERENCES public.fee_heads(school_id, id)
      ON DELETE RESTRICT;
  END IF;

  -- 14. fee_receipts -> students
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fee_receipts_school_student') THEN
    ALTER TABLE public.fee_receipts
      ADD CONSTRAINT fk_fee_receipts_school_student
      FOREIGN KEY (school_id, student_id)
      REFERENCES public.students(school_id, id)
      ON DELETE RESTRICT;
  END IF;

  -- 15. fee_payments -> receipts
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fee_payments_school_receipt') THEN
    ALTER TABLE public.fee_payments
      ADD CONSTRAINT fk_fee_payments_school_receipt
      FOREIGN KEY (school_id, receipt_id)
      REFERENCES public.fee_receipts(school_id, id)
      ON DELETE CASCADE;
  END IF;

  -- 16. fee_ledger -> students
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fee_ledger_school_student') THEN
    ALTER TABLE public.fee_ledger
      ADD CONSTRAINT fk_fee_ledger_school_student
      FOREIGN KEY (school_id, student_id)
      REFERENCES public.students(school_id, id)
      ON DELETE RESTRICT;
  END IF;

  -- 17. fee_credits -> students
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fee_credits_school_student') THEN
    ALTER TABLE public.fee_credits
      ADD CONSTRAINT fk_fee_credits_school_student
      FOREIGN KEY (school_id, student_id)
      REFERENCES public.students(school_id, id)
      ON DELETE CASCADE;
  END IF;

  -- 18. fee_refunds -> students & receipts
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fee_refunds_school_student') THEN
    ALTER TABLE public.fee_refunds
      ADD CONSTRAINT fk_fee_refunds_school_student
      FOREIGN KEY (school_id, student_id)
      REFERENCES public.students(school_id, id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fee_refunds_school_receipt') THEN
    ALTER TABLE public.fee_refunds
      ADD CONSTRAINT fk_fee_refunds_school_receipt
      FOREIGN KEY (school_id, receipt_id)
      REFERENCES public.fee_receipts(school_id, id)
      ON DELETE RESTRICT;
  END IF;

  -- 19. transport_assignments -> students & routes
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_transport_assignments_school_student') THEN
    ALTER TABLE public.transport_assignments
      ADD CONSTRAINT fk_transport_assignments_school_student
      FOREIGN KEY (school_id, student_id)
      REFERENCES public.students(school_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_transport_assignments_school_route') THEN
    ALTER TABLE public.transport_assignments
      ADD CONSTRAINT fk_transport_assignments_school_route
      FOREIGN KEY (school_id, route_id)
      REFERENCES public.transport_routes(school_id, id)
      ON DELETE CASCADE;
  END IF;

  -- 20. transport_routes -> vehicles & staff
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_transport_routes_school_vehicle') THEN
    ALTER TABLE public.transport_routes
      ADD CONSTRAINT fk_transport_routes_school_vehicle
      FOREIGN KEY (school_id, default_vehicle_id)
      REFERENCES public.transport_vehicles(school_id, id)
      ON DELETE SET NULL;
  END IF;

  -- 21. transport_requests & absences -> students
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_transport_requests_school_student') THEN
    ALTER TABLE public.transport_requests
      ADD CONSTRAINT fk_transport_requests_school_student
      FOREIGN KEY (school_id, student_id)
      REFERENCES public.students(school_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_transport_absences_school_student') THEN
    ALTER TABLE public.transport_absences
      ADD CONSTRAINT fk_transport_absences_school_student
      FOREIGN KEY (school_id, student_id)
      REFERENCES public.students(school_id, id)
      ON DELETE CASCADE;
  END IF;
END $$;


-- ============================================================================
-- 4. FIX STUDENT SENSITIVE DATA CONSOLIDATION (SECTION 5)
-- Move existing Aadhaar data into student_sensitive and clean up students table
-- ============================================================================

-- Ensure student_sensitive has composite FK
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_sensitive_school_student') THEN
    ALTER TABLE public.student_sensitive
      ADD CONSTRAINT fk_student_sensitive_school_student
      FOREIGN KEY (school_id, student_id)
      REFERENCES public.students(school_id, id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Backfill from students into student_sensitive before dropping columns
INSERT INTO public.student_sensitive (
  student_id,
  school_id,
  aadhaar_enc,
  aadhaar_last4,
  aadhaar_hash,
  created_at,
  updated_at
)
SELECT 
  s.id AS student_id,
  s.school_id,
  s.aadhaar_enc,
  s.aadhaar_last4,
  s.aadhaar_hash,
  s.created_at,
  now()
FROM public.students s
WHERE s.aadhaar_enc IS NOT NULL 
   OR s.aadhaar_last4 IS NOT NULL 
   OR s.aadhaar_hash IS NOT NULL
ON CONFLICT (student_id) DO UPDATE SET
  aadhaar_enc = COALESCE(EXCLUDED.aadhaar_enc, public.student_sensitive.aadhaar_enc),
  aadhaar_last4 = COALESCE(EXCLUDED.aadhaar_last4, public.student_sensitive.aadhaar_last4),
  aadhaar_hash = COALESCE(EXCLUDED.aadhaar_hash, public.student_sensitive.aadhaar_hash),
  updated_at = now();

-- Drop redundant duplicate Aadhaar columns from public.students
ALTER TABLE public.students DROP COLUMN IF EXISTS aadhaar_enc;
ALTER TABLE public.students DROP COLUMN IF EXISTS aadhaar_last4;
ALTER TABLE public.students DROP COLUMN IF EXISTS aadhaar_hash;


-- ============================================================================
-- 5. NORMALIZE UUID ARRAY RELATIONSHIPS INTO JUNCTION TABLES (SECTION 6)
-- ============================================================================

-- 1. Online Payment Order Junctions
CREATE TABLE IF NOT EXISTS public.online_payment_order_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  order_id UUID NOT NULL,
  student_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_order_students_order FOREIGN KEY (school_id, order_id) REFERENCES public.online_payment_orders(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_order_students_student FOREIGN KEY (school_id, student_id) REFERENCES public.students(school_id, id) ON DELETE CASCADE,
  CONSTRAINT unique_order_student UNIQUE (school_id, order_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.online_payment_order_dues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  order_id UUID NOT NULL,
  due_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_order_dues_order FOREIGN KEY (school_id, order_id) REFERENCES public.online_payment_orders(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_order_dues_due FOREIGN KEY (school_id, due_id) REFERENCES public.student_dues(school_id, id) ON DELETE CASCADE,
  CONSTRAINT unique_order_due UNIQUE (school_id, order_id, due_id)
);

-- 2. Concession Rule Fee Head Junctions
CREATE TABLE IF NOT EXISTS public.concession_rule_fee_heads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL,
  fee_head_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_concession_rule_head_rule FOREIGN KEY (school_id, rule_id) REFERENCES public.concession_rules(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_concession_rule_head_head FOREIGN KEY (school_id, fee_head_id) REFERENCES public.fee_heads(school_id, id) ON DELETE CASCADE,
  CONSTRAINT unique_concession_rule_head UNIQUE (school_id, rule_id, fee_head_id)
);

-- 3. Student Concession Fee Head Junctions
CREATE TABLE IF NOT EXISTS public.student_concession_fee_heads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_concession_id UUID NOT NULL,
  fee_head_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_student_concession_head_sc FOREIGN KEY (school_id, student_concession_id) REFERENCES public.student_concessions(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_student_concession_head_head FOREIGN KEY (school_id, fee_head_id) REFERENCES public.fee_heads(school_id, id) ON DELETE CASCADE,
  CONSTRAINT unique_student_concession_head UNIQUE (school_id, student_concession_id, fee_head_id)
);

-- 4. Late Fee Rule Fee Head Junctions
CREATE TABLE IF NOT EXISTS public.late_fee_rule_fee_heads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL,
  fee_head_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_late_fee_head_rule FOREIGN KEY (school_id, rule_id) REFERENCES public.late_fee_rules(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_late_fee_head_head FOREIGN KEY (school_id, fee_head_id) REFERENCES public.fee_heads(school_id, id) ON DELETE CASCADE,
  CONSTRAINT unique_late_fee_head UNIQUE (school_id, rule_id, fee_head_id)
);

-- 5. Fee Structure Targets (Classes, Sections, Students)
CREATE TABLE IF NOT EXISTS public.fee_structure_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  fee_structure_id UUID NOT NULL,
  class_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_fs_classes_fs FOREIGN KEY (school_id, fee_structure_id) REFERENCES public.fee_structures(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_fs_classes_class FOREIGN KEY (school_id, class_id) REFERENCES public.classes(school_id, id) ON DELETE CASCADE,
  CONSTRAINT unique_fs_class UNIQUE (school_id, fee_structure_id, class_id)
);

CREATE TABLE IF NOT EXISTS public.fee_structure_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  fee_structure_id UUID NOT NULL,
  section_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_fs_sections_fs FOREIGN KEY (school_id, fee_structure_id) REFERENCES public.fee_structures(school_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_fs_sections_section FOREIGN KEY (school_id, section_id) REFERENCES public.sections(school_id, id) ON DELETE CASCADE,
  CONSTRAINT unique_fs_section UNIQUE (school_id, fee_structure_id, section_id)
);

-- Backfill data from existing UUID arrays into normalized junctions
DO $$
BEGIN
  -- Backfill online_payment_order_students
  INSERT INTO public.online_payment_order_students (school_id, order_id, student_id)
  SELECT o.school_id, o.id, unnest(o.student_ids)
  FROM public.online_payment_orders o
  WHERE o.student_ids IS NOT NULL AND array_length(o.student_ids, 1) > 0
  ON CONFLICT (school_id, order_id, student_id) DO NOTHING;

  -- Backfill online_payment_order_dues
  INSERT INTO public.online_payment_order_dues (school_id, order_id, due_id)
  SELECT o.school_id, o.id, unnest(o.due_ids)
  FROM public.online_payment_orders o
  WHERE o.due_ids IS NOT NULL AND array_length(o.due_ids, 1) > 0
  ON CONFLICT (school_id, order_id, due_id) DO NOTHING;

  -- Backfill concession_rule_fee_heads
  INSERT INTO public.concession_rule_fee_heads (school_id, rule_id, fee_head_id)
  SELECT c.school_id, c.id, unnest(c.fee_head_ids)
  FROM public.concession_rules c
  WHERE c.fee_head_ids IS NOT NULL AND array_length(c.fee_head_ids, 1) > 0
  ON CONFLICT (school_id, rule_id, fee_head_id) DO NOTHING;

  -- Backfill student_concession_fee_heads
  INSERT INTO public.student_concession_fee_heads (school_id, student_concession_id, fee_head_id)
  SELECT sc.school_id, sc.id, unnest(sc.fee_head_ids)
  FROM public.student_concessions sc
  WHERE sc.fee_head_ids IS NOT NULL AND array_length(sc.fee_head_ids, 1) > 0
  ON CONFLICT (school_id, student_concession_id, fee_head_id) DO NOTHING;

  -- Backfill late_fee_rule_fee_heads
  INSERT INTO public.late_fee_rule_fee_heads (school_id, rule_id, fee_head_id)
  SELECT l.school_id, l.id, unnest(l.fee_head_ids)
  FROM public.late_fee_rules l
  WHERE l.fee_head_ids IS NOT NULL AND array_length(l.fee_head_ids, 1) > 0
  ON CONFLICT (school_id, rule_id, fee_head_id) DO NOTHING;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Junction backfill notice: %', SQLERRM;
END $$;


-- ============================================================================
-- 6. IMMUTABLE SCHOOL_ID BEFORE UPDATE TRIGGERS (SECTION 9)
-- Attach trigger to every tenant table to prevent cross-school hijacking
-- ============================================================================

DO $$
DECLARE
  v_table TEXT;
  v_tables TEXT[] := ARRAY[
    'profiles', 'staff', 'academic_years', 'classes', 'sections', 'subjects',
    'class_subjects', 'students', 'parents', 'student_parents', 'student_enrollments',
    'student_addresses', 'student_documents', 'student_sensitive', 'student_previous_schools',
    'student_achievements', 'student_medical', 'student_events', 'student_transfer_certificates',
    'fee_heads', 'fee_terms', 'fee_structures', 'fee_structure_items', 'student_fee_assignments',
    'student_dues', 'concession_rules', 'student_concessions', 'late_fee_rules', 'fee_settings',
    'fee_receipts', 'fee_payments', 'fee_ledger', 'fee_credits', 'fee_refunds', 'day_closings',
    'transport_settings', 'transport_vehicles', 'transport_staff', 'transport_routes',
    'route_stops', 'transport_fee_zones', 'transport_assignments', 'counters', 'audit_logs',
    'school_subscriptions', 'school_websites', 'online_payment_orders'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    BEGIN
      EXECUTE format('DROP TRIGGER IF EXISTS trigger_prevent_school_id_update ON public.%I', v_table);
      EXECUTE format(
        'CREATE TRIGGER trigger_prevent_school_id_update BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.prevent_school_id_update()',
        v_table
      );
    EXCEPTION
      WHEN undefined_table THEN
        NULL;
      WHEN OTHERS THEN
        RAISE NOTICE 'Trigger attachment warning on %: %', v_table, SQLERRM;
    END;
  END LOOP;
END $$;


-- ============================================================================
-- 7. TENANT-AWARE UNIQUE CONSTRAINTS (SECTION 11)
-- ============================================================================

-- Ensure operational school codes and identifiers are scoped per school safely
DO $$
BEGIN
  -- 1. classes name per academic year
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'classes' AND column_name = 'name') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS unique_class_name_per_year ON public.classes(school_id, academic_year_id, name);
  END IF;

  -- 2. sections name per class
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sections' AND column_name = 'name') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS unique_section_name_per_class ON public.sections(school_id, class_id, name);
  END IF;

  -- 3. subjects code (if column exists)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subjects' AND column_name = 'code') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS unique_subject_code_per_school ON public.subjects(school_id, code) WHERE code IS NOT NULL;
  END IF;

  -- 4. fee_heads code (if column exists)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fee_heads' AND column_name = 'code') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS unique_fee_head_code_per_school ON public.fee_heads(school_id, code);
  END IF;

  -- 5. concession_rules name (if column exists)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'concession_rules' AND column_name = 'name') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS unique_concession_name_per_school ON public.concession_rules(school_id, LOWER(TRIM(name)));
  END IF;

  -- 6. transport_routes code (if column exists)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transport_routes' AND column_name = 'code') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS unique_route_code_per_school ON public.transport_routes(school_id, code) WHERE code IS NOT NULL;
  END IF;

  -- 7. transport_vehicles registration_no (or registration_number)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transport_vehicles' AND column_name = 'registration_no') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS unique_vehicle_reg_per_school ON public.transport_vehicles(school_id, registration_no);
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transport_vehicles' AND column_name = 'registration_number') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS unique_vehicle_reg_per_school ON public.transport_vehicles(school_id, registration_number);
  END IF;

  -- 8. counters key
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'counters' AND column_name = 'key') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS unique_counter_key_per_school ON public.counters(school_id, key);
  END IF;
END $$;


-- ============================================================================
-- 8. UNIFORM ROW LEVEL SECURITY (RLS) POLICIES (SECTION 8)
-- ============================================================================

-- Enable RLS on normalized junction tables
ALTER TABLE public.online_payment_order_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_payment_order_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concession_rule_fee_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_concession_fee_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.late_fee_rule_fee_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structure_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structure_sections ENABLE ROW LEVEL SECURITY;

-- Junction RLS Policies
DROP POLICY IF EXISTS "tenant_order_students" ON public.online_payment_order_students;
CREATE POLICY "tenant_order_students" ON public.online_payment_order_students
  FOR ALL TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()))
  WITH CHECK (school_id IN (SELECT public.school_admin_school_ids()));

DROP POLICY IF EXISTS "tenant_order_dues" ON public.online_payment_order_dues;
CREATE POLICY "tenant_order_dues" ON public.online_payment_order_dues
  FOR ALL TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()))
  WITH CHECK (school_id IN (SELECT public.school_admin_school_ids()));

DROP POLICY IF EXISTS "tenant_concession_rule_heads" ON public.concession_rule_fee_heads;
CREATE POLICY "tenant_concession_rule_heads" ON public.concession_rule_fee_heads
  FOR ALL TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()))
  WITH CHECK (school_id IN (SELECT public.school_admin_school_ids()));

DROP POLICY IF EXISTS "tenant_student_concession_heads" ON public.student_concession_fee_heads;
CREATE POLICY "tenant_student_concession_heads" ON public.student_concession_fee_heads
  FOR ALL TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()))
  WITH CHECK (school_id IN (SELECT public.school_admin_school_ids()));

DROP POLICY IF EXISTS "tenant_late_fee_rule_heads" ON public.late_fee_rule_fee_heads;
CREATE POLICY "tenant_late_fee_rule_heads" ON public.late_fee_rule_fee_heads
  FOR ALL TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()))
  WITH CHECK (school_id IN (SELECT public.school_admin_school_ids()));

DROP POLICY IF EXISTS "tenant_fs_classes" ON public.fee_structure_classes;
CREATE POLICY "tenant_fs_classes" ON public.fee_structure_classes
  FOR ALL TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()))
  WITH CHECK (school_id IN (SELECT public.school_admin_school_ids()));

DROP POLICY IF EXISTS "tenant_fs_sections" ON public.fee_structure_sections;
CREATE POLICY "tenant_fs_sections" ON public.fee_structure_sections
  FOR ALL TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()))
  WITH CHECK (school_id IN (SELECT public.school_admin_school_ids()));

-- Student sensitive strict RLS
DROP POLICY IF EXISTS "strict_student_sensitive_isolation" ON public.student_sensitive;
CREATE POLICY "strict_student_sensitive_isolation" ON public.student_sensitive
  FOR ALL TO authenticated
  USING (
    school_id IN (SELECT public.school_admin_school_ids())
    AND (
      public.has_role(ARRAY['owner', 'super_admin', 'school_admin'])
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.auth_id = auth.uid()
          AND p.school_id = public.student_sensitive.school_id
          AND 'students.reveal_sensitive' = ANY(p.custom_permissions)
      )
    )
  )
  WITH CHECK (
    school_id IN (SELECT public.school_admin_school_ids())
  );
