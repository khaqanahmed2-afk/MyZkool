-- Migration: 20261016190000_phase2b_invoice_reliability_and_integrity.sql
-- Description:
-- 1. Adds invoice_no column to public.student_dues for persisted, stable invoice identity.
-- 2. Backfills invoice_no deterministically across existing dues.
-- 3. Adds school_id to public.fee_receipt_items for direct multi-tenant scoping and indexing.
-- 4. Enforces cross-tenant validation trigger on public.fee_receipt_items.
-- 5. Implements atomic, secure public.cancel_invoice RPC with negative ledger balance adjustments (correcting debt reduction).

-- ============================================================================
-- 1. Add invoice_no column to student_dues
-- ============================================================================
ALTER TABLE public.student_dues 
  ADD COLUMN IF NOT EXISTS invoice_no TEXT;

CREATE INDEX IF NOT EXISTS idx_student_dues_invoice_no 
  ON public.student_dues(school_id, invoice_no);

CREATE INDEX IF NOT EXISTS idx_student_dues_student_term 
  ON public.student_dues(school_id, student_id, academic_year_id, term_id);

-- Backfill invoice_no for existing dues where null
WITH numbered_groups AS (
  SELECT 
    id,
    'INV-2026-' || LPAD(DENSE_RANK() OVER (
      PARTITION BY school_id 
      ORDER BY academic_year_id, student_id, COALESCE(term_id, '00000000-0000-0000-0000-000000000000'::uuid)
    )::TEXT, 4, '0') AS gen_invoice_no
  FROM public.student_dues
  WHERE invoice_no IS NULL
)
UPDATE public.student_dues d
SET invoice_no = ng.gen_invoice_no
FROM numbered_groups ng
WHERE d.id = ng.id AND d.invoice_no IS NULL;

-- ============================================================================
-- 2. Add school_id to fee_receipt_items & strengthen tenant RLS
-- ============================================================================
ALTER TABLE public.fee_receipt_items 
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- Backfill school_id from verified parent fee_receipts
UPDATE public.fee_receipt_items ri
SET school_id = r.school_id
FROM public.fee_receipts r
WHERE ri.receipt_id = r.id AND ri.school_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_fee_receipt_items_school 
  ON public.fee_receipt_items(school_id);

-- Update RLS policy on fee_receipt_items
DROP POLICY IF EXISTS "fee_receipt_items_isolation" ON public.fee_receipt_items;
CREATE POLICY "fee_receipt_items_isolation" ON public.fee_receipt_items
  FOR ALL USING (
    school_id = current_school_id() 
    OR receipt_id IN (SELECT id FROM public.fee_receipts WHERE school_id = current_school_id())
  );

-- ============================================================================
-- 3. Cross-tenant defense-in-depth trigger on fee_receipt_items
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_fee_receipt_item_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_receipt_school UUID;
  v_due_school UUID;
BEGIN
  SELECT school_id INTO v_receipt_school FROM public.fee_receipts WHERE id = NEW.receipt_id;
  SELECT school_id INTO v_due_school FROM public.student_dues WHERE id = NEW.due_id;
  
  IF v_receipt_school IS NOT NULL AND v_due_school IS NOT NULL AND v_receipt_school != v_due_school THEN
    RAISE EXCEPTION 'Cross-tenant violation: receipt school % does not match due school %', v_receipt_school, v_due_school;
  END IF;

  IF NEW.school_id IS NULL THEN
    NEW.school_id := v_receipt_school;
  ELSIF v_receipt_school IS NOT NULL AND NEW.school_id != v_receipt_school THEN
    RAISE EXCEPTION 'Receipt item school % does not match receipt school %', NEW.school_id, v_receipt_school;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fee_receipt_items_tenant_check ON public.fee_receipt_items;
CREATE TRIGGER trg_fee_receipt_items_tenant_check
  BEFORE INSERT OR UPDATE ON public.fee_receipt_items
  FOR EACH ROW EXECUTE FUNCTION public.check_fee_receipt_item_tenant();

-- ============================================================================
-- 4. Atomic cancel_invoice RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cancel_invoice(
  p_school_id UUID,
  p_due_ids   UUID[],
  p_reason    TEXT,
  p_actor_id  UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_due RECORD;
  v_due_id UUID;
  v_cancelled_count INT := 0;
BEGIN
  -- Multi-tenant authorization check
  IF auth.role() = 'authenticated' THEN
    IF auth.uid() IS NULL OR NOT (public.is_school_member(p_school_id) OR public.is_school_admin(p_school_id)) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Current user is not authorized to cancel invoices for school %', p_school_id;
    END IF;
  END IF;

  IF p_reason IS NULL OR length(TRIM(p_reason)) < 10 THEN
    RAISE EXCEPTION 'Cancel reason must be at least 10 characters';
  END IF;

  IF p_due_ids IS NULL OR array_length(p_due_ids, 1) = 0 THEN
    RAISE EXCEPTION 'At least one due ID must be specified';
  END IF;

  -- Lock and validate all dues
  FOREACH v_due_id IN ARRAY p_due_ids LOOP
    SELECT * INTO v_due FROM public.student_dues WHERE id = v_due_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Due % not found', v_due_id;
    END IF;
    IF v_due.school_id != p_school_id THEN
      RAISE EXCEPTION 'Cross-tenant violation on due %', v_due_id;
    END IF;
    IF v_due.paid_paise > 0 THEN
      RAISE EXCEPTION 'Cannot void an invoice with recorded payments (due % has paid_paise = %). Refund or reverse payments first.', v_due_id, v_due.paid_paise;
    END IF;
  END LOOP;

  -- Cancel dues and record ledger entries
  FOREACH v_due_id IN ARRAY p_due_ids LOOP
    SELECT * INTO v_due FROM public.student_dues WHERE id = v_due_id;
    IF v_due.status != 'cancelled' THEN
      UPDATE public.student_dues
      SET status = 'cancelled',
          updated_at = now()
      WHERE id = v_due_id;

      -- Ledger entry with NEGATIVE amount to reduce obligation (debt reduction)
      INSERT INTO public.fee_ledger (
        school_id, student_id, academic_year_id,
        due_id, receipt_id, entry_type, amount_paise, note, created_by
      ) VALUES (
        p_school_id, v_due.student_id, v_due.academic_year_id,
        v_due_id, NULL, 'cancel_due', -v_due.net_paise,
        'Invoice due cancelled: ' || p_reason, p_actor_id
      );

      v_cancelled_count := v_cancelled_count + 1;
    END IF;
  END LOOP;

  -- Audit log entry
  INSERT INTO public.fee_audit_log (
    school_id, actor_id, event_type, entity_type,
    after_json, created_at
  ) VALUES (
    p_school_id, p_actor_id, 'invoice_cancelled', 'invoice',
    jsonb_build_object('due_ids', p_due_ids, 'reason', p_reason, 'cancelled_count', v_cancelled_count),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'cancelled_count', v_cancelled_count
  );
END;
$$;
