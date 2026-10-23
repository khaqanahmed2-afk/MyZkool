-- ============================================================================
-- Rollback Migration: 20261017220000_fee_architecture_refactor_rollback.sql
-- Description: Reverses changes applied by 20261017220000_fee_architecture_refactor.sql
-- ============================================================================

-- 1. Drop Added Constraints
ALTER TABLE public.fee_structure_items
  DROP CONSTRAINT IF EXISTS fk_fee_structure_items_school_fee_head,
  DROP CONSTRAINT IF EXISTS fk_fee_structure_items_school_structure,
  DROP CONSTRAINT IF EXISTS unique_fee_structure_items_school_id_id;

ALTER TABLE public.student_concessions
  DROP CONSTRAINT IF EXISTS fk_student_concessions_school_term,
  DROP CONSTRAINT IF EXISTS fk_student_concessions_school_rule,
  DROP CONSTRAINT IF EXISTS fk_student_concessions_school_student;

ALTER TABLE public.fee_structures
  DROP CONSTRAINT IF EXISTS fk_fee_structures_school_academic_year;

ALTER TABLE public.fee_terms
  DROP CONSTRAINT IF EXISTS fk_fee_terms_school_academic_year;

ALTER TABLE public.student_dues
  DROP CONSTRAINT IF EXISTS fk_student_dues_school_academic_year;

ALTER TABLE public.fee_receipts
  DROP CONSTRAINT IF EXISTS fk_fee_receipts_school_academic_year;

ALTER TABLE public.fee_ledger
  DROP CONSTRAINT IF EXISTS fk_fee_ledger_school_academic_year,
  DROP CONSTRAINT IF EXISTS chk_fee_ledger_amount_nonzero;

ALTER TABLE public.fee_credits
  DROP CONSTRAINT IF EXISTS fk_fee_credits_school_academic_year;

-- 2. Drop annual structure fee duplicate prevention index
DROP INDEX IF EXISTS public.unique_due_per_student_head_annual;

-- 3. Drop trg_fee_ledger_prevent_delete
DROP TRIGGER IF EXISTS trg_fee_ledger_prevent_delete ON public.fee_ledger;

-- 4. Restore original enforce_fee_ledger_immutability (UPDATE only)
CREATE OR REPLACE FUNCTION public.enforce_fee_ledger_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
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

-- 5. Drop school_id immutability triggers on junction tables
DROP TRIGGER IF EXISTS trigger_prevent_school_id_update ON public.concession_rule_fee_heads;
DROP TRIGGER IF EXISTS trigger_prevent_school_id_update ON public.student_concession_fee_heads;
DROP TRIGGER IF EXISTS trigger_prevent_school_id_update ON public.late_fee_rule_fee_heads;
DROP TRIGGER IF EXISTS trigger_prevent_school_id_update ON public.fee_structure_classes;
DROP TRIGGER IF EXISTS trigger_prevent_school_id_update ON public.fee_structure_sections;
DROP TRIGGER IF EXISTS trigger_prevent_school_id_update ON public.online_payment_order_dues;
DROP TRIGGER IF EXISTS trigger_prevent_school_id_update ON public.online_payment_order_students;
DROP TRIGGER IF EXISTS trigger_prevent_school_id_update ON public.transport_absences;
DROP TRIGGER IF EXISTS trigger_prevent_school_id_update ON public.transport_requests;
