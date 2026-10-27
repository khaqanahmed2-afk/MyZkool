-- ============================================================================
-- Migration: 20261027210000_student_billing_ledger_reconciliation.sql
-- Description: Multi-tenant performance indexes & authoritative RPC for
--              Student Billing Ledger reconciliation across all 8 ledger views.
-- ============================================================================

-- 1. High-Performance Composite Indexes for Student Billing Queries
CREATE INDEX IF NOT EXISTS idx_student_dues_ledger_student
  ON public.student_dues (school_id, student_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_fee_receipts_ledger_student
  ON public.fee_receipts (school_id, student_id, receipt_date, status);

CREATE INDEX IF NOT EXISTS idx_fee_receipt_items_due_alloc
  ON public.fee_receipt_items (due_id, receipt_id);

CREATE INDEX IF NOT EXISTS idx_fee_payments_school_receipt
  ON public.fee_payments (school_id, receipt_id);

CREATE INDEX IF NOT EXISTS idx_fee_ledger_student_chronological
  ON public.fee_ledger (school_id, student_id, created_at, entry_type);

CREATE INDEX IF NOT EXISTS idx_fee_credits_student_remaining
  ON public.fee_credits (school_id, student_id, remaining_paise);

-- 2. Authoritative Multi-Tenant RPC for Student Billing Ledger Summary
CREATE OR REPLACE FUNCTION public.get_student_billing_ledger_summary(
  p_school_id UUID,
  p_student_id UUID,
  p_academic_year_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_today DATE;
  v_gross_paise BIGINT := 0;
  v_concession_paise BIGINT := 0;
  v_net_assessed_paise BIGINT := 0;
  v_dues_paid_paise BIGINT := 0;
  v_receipts_paid_paise BIGINT := 0;
  v_closing_balance_paise BIGINT := 0;
  v_overdue_balance_paise BIGINT := 0;
  v_advance_credit_paise BIGINT := 0;
  v_unreceipted_settlement_paise BIGINT := 0;
  v_caller_school_id UUID;
  v_res JSONB;
BEGIN
  -- Multi-tenant security isolation check
  -- If invoked in an authenticated context with school session, ensure caller matches p_school_id
  BEGIN
    SELECT NULLIF(current_setting('app.current_school_id', true), '')::UUID INTO v_caller_school_id;
  EXCEPTION WHEN OTHERS THEN
    v_caller_school_id := NULL;
  END;

  IF v_caller_school_id IS NOT NULL AND v_caller_school_id <> p_school_id THEN
    RAISE EXCEPTION 'Access denied: Multi-tenant boundary violation for school %', p_school_id;
  END IF;

  -- Business date in Asia/Kolkata timezone
  v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE;

  -- 1. Aggregate assessed charges and approved concessions from student_dues
  SELECT
    COALESCE(SUM(COALESCE(gross_paise, net_paise + COALESCE(concession_paise, 0))), 0),
    COALESCE(SUM(COALESCE(concession_paise, 0)), 0),
    COALESCE(SUM(COALESCE(net_paise, GREATEST(0, COALESCE(gross_paise, 0) - COALESCE(concession_paise, 0)))), 0),
    COALESCE(SUM(COALESCE(paid_paise, 0)), 0),
    COALESCE(SUM(
      CASE
        WHEN due_date < v_today AND COALESCE(balance_paise, 0) > 0 THEN COALESCE(balance_paise, 0)
        ELSE 0
      END
    ), 0)
  INTO
    v_gross_paise,
    v_concession_paise,
    v_net_assessed_paise,
    v_dues_paid_paise,
    v_overdue_balance_paise
  FROM public.student_dues
  WHERE school_id = p_school_id
    AND student_id = p_student_id
    AND status <> 'cancelled'
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id);

  -- 2. Outstanding Balance = Net Assessed - Paid Settlements
  v_closing_balance_paise := GREATEST(0, v_net_assessed_paise - v_dues_paid_paise);

  -- Invariant: Overdue is strictly a subset of closing balance, never negative, never exceeds outstanding
  v_overdue_balance_paise := GREATEST(0, LEAST(v_closing_balance_paise, v_overdue_balance_paise));

  -- 3. Total verified receipt collections
  SELECT COALESCE(SUM(total_paise), 0)
  INTO v_receipts_paid_paise
  FROM public.fee_receipts
  WHERE school_id = p_school_id
    AND student_id = p_student_id
    AND status = 'active'
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id);

  -- 4. Detect unreceipted historical settlements (direct dues allocations without receipt voucher)
  v_unreceipted_settlement_paise := GREATEST(0, v_dues_paid_paise - v_receipts_paid_paise);

  -- 5. Total active unallocated advance credits
  SELECT COALESCE(SUM(remaining_paise), 0)
  INTO v_advance_credit_paise
  FROM public.fee_credits
  WHERE school_id = p_school_id
    AND student_id = p_student_id
    AND remaining_paise > 0
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id);

  v_res := jsonb_build_object(
    'school_id', p_school_id,
    'student_id', p_student_id,
    'as_of_date', v_today,
    'opening_balance_paise', 0,
    'total_charges_paise', v_gross_paise,
    'total_concessions_paise', v_concession_paise,
    'net_assessed_paise', v_net_assessed_paise,
    'total_payments_paise', v_dues_paid_paise,
    'total_receipts_paise', v_receipts_paid_paise,
    'unreceipted_settlement_paise', v_unreceipted_settlement_paise,
    'closing_balance_paise', v_closing_balance_paise,
    'overdue_balance_paise', v_overdue_balance_paise,
    'advance_credits_paise', v_advance_credit_paise,
    'net_payable_after_credits_paise', GREATEST(0, v_closing_balance_paise - v_advance_credit_paise)
  );

  RETURN v_res;
END;
$$;

COMMENT ON FUNCTION public.get_student_billing_ledger_summary(UUID, UUID, UUID) IS
  'Authoritative multi-tenant RPC for calculating student net assessed fees, verified payments, unreceipted settlements, and bounded overdue balances.';

-- Grant execution to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.get_student_billing_ledger_summary(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_billing_ledger_summary(UUID, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_student_billing_ledger_summary(UUID, UUID, UUID) TO anon;
