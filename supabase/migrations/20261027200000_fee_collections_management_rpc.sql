-- ============================================================================
-- Migration: 20261027200000_fee_collections_management_rpc.sql
-- Description: Production-grade RPC and indexing for Fee Collections page.
-- Reconciles:
--   1. Today's collections (IST school-local date)
--   2. This month's collections
--   3. Online payments (UPI, bank transfer, online gateway, card)
--   4. Cash payments
--   5. Distinguishes settled active collections from cancelled/voided audit rows
--   6. Enforces multi-tenant isolation via is_school_member / is_school_admin
-- ============================================================================

-- 1. Drop obsolete 2-argument overload to prevent 42725 ambiguity and 300 Multiple Choices
DROP FUNCTION IF EXISTS public.get_fee_collections_summary(UUID, UUID);

-- 2. Create or replace public.get_fee_collections_summary with date range scoping
CREATE OR REPLACE FUNCTION public.get_fee_collections_summary(
  p_school_id        UUID,
  p_academic_year_id UUID DEFAULT NULL,
  p_start_date       DATE DEFAULT NULL,
  p_end_date         DATE DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_date         DATE;
  v_first_of_month     DATE;
  v_period_start       DATE;
  v_period_end         DATE;
  v_today_paise        BIGINT := 0;
  v_today_count        BIGINT := 0;
  v_month_paise        BIGINT := 0;
  v_month_count        BIGINT := 0;
  v_online_paise       BIGINT := 0;
  v_online_count       BIGINT := 0;
  v_cash_paise         BIGINT := 0;
  v_cash_count         BIGINT := 0;
  v_cancelled_count    BIGINT := 0;
  v_total_audited_rows BIGINT := 0;
BEGIN
  -- Multi-tenant authorization check when invoked by authenticated user
  IF auth.role() = 'authenticated' THEN
    IF auth.uid() IS NULL OR NOT (public.is_school_member(p_school_id) OR public.is_school_admin(p_school_id)) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Current user is not authorized to access collections summary for school %', p_school_id;
    END IF;
  END IF;

  -- Get IST current date (Asia/Kolkata timezone)
  v_today_date := (now() AT TIME ZONE 'Asia/Kolkata')::DATE;
  v_first_of_month := DATE_TRUNC('month', v_today_date)::DATE;

  -- Scope period for Cash and Online breakdown (defaulting to current month)
  v_period_start := COALESCE(p_start_date, v_first_of_month);
  v_period_end   := COALESCE(p_end_date, v_today_date);

  -- 1. Today's collections (Only active/successful receipts)
  SELECT 
    COALESCE(SUM(total_paise), 0), 
    COUNT(*)
  INTO v_today_paise, v_today_count
  FROM public.fee_receipts
  WHERE school_id = p_school_id
    AND receipt_date = v_today_date
    AND status = 'active'
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id);

  -- 2. This month's collections (Only active/successful receipts)
  SELECT 
    COALESCE(SUM(total_paise), 0), 
    COUNT(*)
  INTO v_month_paise, v_month_count
  FROM public.fee_receipts
  WHERE school_id = p_school_id
    AND receipt_date >= v_first_of_month
    AND receipt_date <= v_today_date
    AND status = 'active'
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id);

  -- 3. Online Payments for reporting period (UPI, Bank Transfer, Online gateway, Card)
  SELECT 
    COALESCE(SUM(p.amount_paise), 0), 
    COUNT(DISTINCT r.id)
  INTO v_online_paise, v_online_count
  FROM public.fee_payments p
  JOIN public.fee_receipts r ON p.receipt_id = r.id
  WHERE r.school_id = p_school_id
    AND r.status = 'active'
    AND r.receipt_date >= v_period_start
    AND r.receipt_date <= v_period_end
    AND p.mode IN ('upi', 'bank_transfer', 'online', 'card')
    AND (p_academic_year_id IS NULL OR r.academic_year_id = p_academic_year_id);

  -- 4. Cash Payments for reporting period
  SELECT 
    COALESCE(SUM(p.amount_paise), 0), 
    COUNT(DISTINCT r.id)
  INTO v_cash_paise, v_cash_count
  FROM public.fee_payments p
  JOIN public.fee_receipts r ON p.receipt_id = r.id
  WHERE r.school_id = p_school_id
    AND r.status = 'active'
    AND r.receipt_date >= v_period_start
    AND r.receipt_date <= v_period_end
    AND p.mode = 'cash'
    AND (p_academic_year_id IS NULL OR r.academic_year_id = p_academic_year_id);

  -- 5. Count cancelled receipts within the period for audit reconciliation
  SELECT COUNT(*)
  INTO v_cancelled_count
  FROM public.fee_receipts
  WHERE school_id = p_school_id
    AND receipt_date >= v_period_start
    AND receipt_date <= v_period_end
    AND status = 'cancelled'
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id);

  -- 6. Total audited transaction rows (settled + cancelled)
  v_total_audited_rows := v_month_count + v_cancelled_count;

  RETURN jsonb_build_object(
    'todayPaise', v_today_paise,
    'todayCount', v_today_count,
    'thisMonthPaise', v_month_paise,
    'thisMonthCount', v_month_count,
    'onlinePaise', v_online_paise,
    'onlineCount', v_online_count,
    'cashPaise', v_cash_paise,
    'cashCount', v_cash_count,
    'cancelledCount', v_cancelled_count,
    'totalAuditedCount', v_total_audited_rows
  );
END;
$$;

-- 2. Performance indexes for Fee Collections query patterns
CREATE INDEX IF NOT EXISTS idx_fee_receipts_collections_summary 
  ON public.fee_receipts (school_id, receipt_date, status, academic_year_id);

CREATE INDEX IF NOT EXISTS idx_fee_payments_receipt_mode
  ON public.fee_payments (receipt_id, mode, cheque_status);

COMMENT ON FUNCTION public.get_fee_collections_summary(UUID, UUID, DATE, DATE) IS 
  'Computes real-time fee collection totals and distinct transaction counts for Today, This Month, Online, and Cash in IST.';
