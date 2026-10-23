-- ============================================================================
-- Migration: 20261017220000_fee_architecture_refactor.sql
-- Description: Fee Management Database Architecture Refactoring
--   1. Enforce composite tenant foreign keys on fee configuration & transactional tables.
--   2. Enforce strict append-only ledger immutability on UPDATE and DELETE.
--   3. Guard against duplicate annual/structure fee billing via partial unique index.
--   4. Add non-zero amount checks on ledger transactions.
--   5. Enforce tenant ID immutability on all junction and fee configuration tables.
--   6. Standardize and strengthen RLS policies with explicit WITH CHECK clauses.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. COMPOSITE TENANT FOREIGN KEYS & UNIQUE CONSTRAINTS
-- ----------------------------------------------------------------------------

-- A. fee_structure_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_fee_structure_items_school_id_id'
  ) THEN
    ALTER TABLE public.fee_structure_items
      ADD CONSTRAINT unique_fee_structure_items_school_id_id UNIQUE (school_id, id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_fee_structure_items_school_structure'
  ) THEN
    ALTER TABLE public.fee_structure_items
      ADD CONSTRAINT fk_fee_structure_items_school_structure
      FOREIGN KEY (school_id, structure_id)
      REFERENCES public.fee_structures(school_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_fee_structure_items_school_fee_head'
  ) THEN
    ALTER TABLE public.fee_structure_items
      ADD CONSTRAINT fk_fee_structure_items_school_fee_head
      FOREIGN KEY (school_id, fee_head_id)
      REFERENCES public.fee_heads(school_id, id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- B. student_concessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_concessions_school_student'
  ) THEN
    ALTER TABLE public.student_concessions
      ADD CONSTRAINT fk_student_concessions_school_student
      FOREIGN KEY (school_id, student_id)
      REFERENCES public.students(school_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_concessions_school_rule'
  ) THEN
    ALTER TABLE public.student_concessions
      ADD CONSTRAINT fk_student_concessions_school_rule
      FOREIGN KEY (school_id, rule_id)
      REFERENCES public.concession_rules(school_id, id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_concessions_school_term'
  ) THEN
    ALTER TABLE public.student_concessions
      ADD CONSTRAINT fk_student_concessions_school_term
      FOREIGN KEY (school_id, from_term_id)
      REFERENCES public.fee_terms(school_id, id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- C. Composite Foreign Keys to academic_years(school_id, id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_fee_structures_school_academic_year'
  ) THEN
    ALTER TABLE public.fee_structures
      ADD CONSTRAINT fk_fee_structures_school_academic_year
      FOREIGN KEY (school_id, academic_year_id)
      REFERENCES public.academic_years(school_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_fee_terms_school_academic_year'
  ) THEN
    ALTER TABLE public.fee_terms
      ADD CONSTRAINT fk_fee_terms_school_academic_year
      FOREIGN KEY (school_id, academic_year_id)
      REFERENCES public.academic_years(school_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_dues_school_academic_year'
  ) THEN
    ALTER TABLE public.student_dues
      ADD CONSTRAINT fk_student_dues_school_academic_year
      FOREIGN KEY (school_id, academic_year_id)
      REFERENCES public.academic_years(school_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_fee_receipts_school_academic_year'
  ) THEN
    ALTER TABLE public.fee_receipts
      ADD CONSTRAINT fk_fee_receipts_school_academic_year
      FOREIGN KEY (school_id, academic_year_id)
      REFERENCES public.academic_years(school_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_fee_ledger_school_academic_year'
  ) THEN
    ALTER TABLE public.fee_ledger
      ADD CONSTRAINT fk_fee_ledger_school_academic_year
      FOREIGN KEY (school_id, academic_year_id)
      REFERENCES public.academic_years(school_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_fee_credits_school_academic_year'
  ) THEN
    ALTER TABLE public.fee_credits
      ADD CONSTRAINT fk_fee_credits_school_academic_year
      FOREIGN KEY (school_id, academic_year_id)
      REFERENCES public.academic_years(school_id, id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. DUPLICATE BILLING PREVENTION (Annual & Non-Term Structure Dues)
-- ----------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS unique_due_per_student_head_annual
  ON public.student_dues (student_id, academic_year_id, fee_head_id, source)
  WHERE (source = 'structure' AND term_id IS NULL AND status <> 'cancelled');

-- ----------------------------------------------------------------------------
-- 3. FINANCIAL LEDGER INTEGRITY & STRICT APPEND-ONLY IMMUTABILITY
-- ----------------------------------------------------------------------------

-- Check constraint: amount_paise must never be 0 in the financial ledger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_fee_ledger_amount_nonzero'
  ) THEN
    ALTER TABLE public.fee_ledger
      ADD CONSTRAINT chk_fee_ledger_amount_nonzero CHECK (amount_paise <> 0);
  END IF;
END $$;

-- Update immutability function to explicitly block DELETE
CREATE OR REPLACE FUNCTION public.enforce_fee_ledger_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Fee ledger financial entries are immutable and cannot be deleted. Create an adjustment, reversal, or compensating entry instead.';
  END IF;

  IF (OLD.amount_paise <> NEW.amount_paise OR
      OLD.entry_type <> NEW.entry_type OR
      OLD.due_id IS DISTINCT FROM NEW.due_id OR
      OLD.receipt_id IS DISTINCT FROM NEW.receipt_id OR
      OLD.student_id <> NEW.student_id OR
      OLD.school_id <> NEW.school_id OR
      OLD.academic_year_id <> NEW.academic_year_id) THEN
    RAISE EXCEPTION 'Fee ledger financial entries are immutable. Create an adjustment, reversal, or compensating entry instead.';
  END IF;
  RETURN NEW;
END;
$$;

-- Ensure delete protection trigger exists on fee_ledger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE event_object_table = 'fee_ledger' AND trigger_name = 'trg_fee_ledger_prevent_delete'
  ) THEN
    CREATE TRIGGER trg_fee_ledger_prevent_delete
      BEFORE DELETE ON public.fee_ledger
      FOR EACH ROW
      EXECUTE FUNCTION public.enforce_fee_ledger_immutability();
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. TENANT IMMUTABILITY TRIGGERS (prevent_school_id_update)
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  t TEXT;
  tbls TEXT[] := ARRAY[
    'concession_rule_fee_heads',
    'student_concession_fee_heads',
    'late_fee_rule_fee_heads',
    'fee_structure_classes',
    'fee_structure_sections',
    'online_payment_order_dues',
    'online_payment_order_students',
    'transport_absences',
    'transport_requests'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE event_object_table = t AND trigger_name = 'trigger_prevent_school_id_update'
    ) THEN
      EXECUTE format('
        CREATE TRIGGER trigger_prevent_school_id_update
        BEFORE UPDATE OF school_id ON public.%I
        FOR EACH ROW
        EXECUTE FUNCTION public.prevent_school_id_update();
      ', t);
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 5. STANDARDIZE RLS POLICIES & ENFORCE STRICT SERVER-SIDE AUTHORIZATION
-- ----------------------------------------------------------------------------

ALTER POLICY "Concession rules tenant isolation" ON public.concession_rules 
  WITH CHECK ((school_id = current_school_id()) OR is_school_member(school_id));

ALTER POLICY "Late fee rules tenant isolation" ON public.late_fee_rules 
  WITH CHECK ((school_id = current_school_id()) OR is_school_member(school_id));

ALTER POLICY "Student concessions tenant isolation" ON public.student_concessions 
  WITH CHECK ((school_id = current_school_id()) OR is_school_member(school_id));

ALTER POLICY fee_receipts_school_isolation ON public.fee_receipts
  WITH CHECK ((school_id = current_school_id()) OR is_school_member(school_id));

ALTER POLICY fee_audit_log_isolation ON public.fee_audit_log
  WITH CHECK (school_id = current_school_id());

ALTER POLICY fee_followups_school ON public.fee_followups
  WITH CHECK (school_id = current_school_id());

ALTER POLICY fee_outbox_isolation ON public.fee_outbox
  WITH CHECK (school_id = current_school_id());

ALTER POLICY fee_reminder_rules_school ON public.fee_reminder_rules
  WITH CHECK (school_id = current_school_id());

ALTER POLICY fee_reminder_templates_school ON public.fee_reminder_templates
  WITH CHECK (school_id = current_school_id());

ALTER POLICY "Fee settings tenant isolation" ON public.fee_settings
  WITH CHECK (school_id = current_school_id());

ALTER POLICY online_payment_orders_school ON public.online_payment_orders
  WITH CHECK (school_id = current_school_id());

ALTER POLICY "Fee structure item terms tenant isolation" ON public.fee_structure_item_terms
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.fee_structure_items fsi
    WHERE fsi.id = fee_structure_item_terms.item_id
      AND (fsi.school_id = current_school_id() OR public.is_school_member(fsi.school_id))
  ));

ALTER POLICY transport_assignments_isolation ON public.transport_assignments 
  WITH CHECK ((school_id = current_school_id()) AND public.school_has_feature('transport'::text, school_id));

ALTER POLICY transport_routes_isolation ON public.transport_routes 
  WITH CHECK ((school_id = current_school_id()) AND public.school_has_feature('transport'::text, school_id));

ALTER POLICY transport_vehicles_isolation ON public.transport_vehicles 
  WITH CHECK ((school_id = current_school_id()) AND public.school_has_feature('transport'::text, school_id));

ALTER POLICY transport_staff_isolation ON public.transport_staff 
  WITH CHECK ((school_id = current_school_id()) AND public.school_has_feature('transport'::text, school_id));

ALTER POLICY transport_fee_zones_isolation ON public.transport_fee_zones 
  WITH CHECK ((school_id = current_school_id()) AND public.school_has_feature('transport'::text, school_id));

ALTER POLICY transport_requests_isolation ON public.transport_requests 
  WITH CHECK ((school_id = current_school_id()) AND public.school_has_feature('transport'::text, school_id));

ALTER POLICY transport_absences_isolation ON public.transport_absences 
  WITH CHECK ((school_id = current_school_id()) AND public.school_has_feature('transport'::text, school_id));

ALTER POLICY transport_settings_isolation ON public.transport_settings
  WITH CHECK ((school_id = current_school_id()) AND public.school_has_feature('transport'::text, school_id));
