-- Migration: 20261016150000_fee_collections_real_data_hardening.sql
-- Description:
-- 1. Updates public.next_receipt_no to work seamlessly with public.counters (key, next_value).
-- 2. Hardens public.collect_fees with strict tenant verification, atomic row locking, balance checks, payment metadata, and due balance updates.
-- 3. Hardens public.cancel_receipt to correctly reverse due balances, ledger entries, and advance credits.
-- 4. Creates public.get_fee_collections_summary for accurate real-time collection metrics.

-- ============================================================================
-- 1. next_receipt_no
-- ============================================================================
CREATE OR REPLACE FUNCTION public.next_receipt_no(
  p_school_id        UUID,
  p_academic_year_id UUID,
  p_prefix           TEXT,
  p_year_label       TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counter_key TEXT;
  v_next        BIGINT;
  v_receipt_no  TEXT;
  v_clean_year  TEXT;
BEGIN
  v_counter_key := 'receipt_no_' || p_academic_year_id::TEXT;

  -- Atomic increment on public.counters
  INSERT INTO public.counters (school_id, key, next_value, updated_at)
  VALUES (p_school_id, v_counter_key, 2, now())
  ON CONFLICT (school_id, key)
  DO UPDATE SET
    next_value = public.counters.next_value + 1,
    updated_at = now()
  RETURNING public.counters.next_value - 1 INTO v_next;

  v_clean_year := REPLACE(COALESCE(p_year_label, '2026-27'), ' ', '');
  v_receipt_no := COALESCE(p_prefix, 'MZ') || '/' || v_clean_year || '/' || LPAD(v_next::TEXT, 6, '0');
  RETURN v_receipt_no;
END;
$$;

-- ============================================================================
-- 2. collect_fees
-- ============================================================================
CREATE OR REPLACE FUNCTION public.collect_fees(
  p_school_id        UUID,
  p_student_id       UUID,
  p_academic_year_id UUID,
  p_receipt_date     DATE,
  p_total_paise      BIGINT,
  p_source           TEXT,
  p_payment_group_id UUID,
  p_collected_by     UUID,
  p_remarks          TEXT,
  p_idempotency_key  TEXT,
  p_prefix           TEXT,
  p_year_label       TEXT,
  p_allocations      JSONB,  -- [{due_id, amount_paise}]
  p_payments         JSONB,  -- [{mode, amount_paise, reference_no, bank_name, instrument_no, instrument_date, cheque_status}]
  p_advance_paise    BIGINT DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_receipt RECORD;
  v_receipt_no       TEXT;
  v_receipt_id       UUID;
  v_alloc            JSONB;
  v_payment          JSONB;
  v_due_id           UUID;
  v_amount           BIGINT;
  v_due              RECORD;
  v_new_paid         BIGINT;
  v_new_balance      BIGINT;
  v_new_status       TEXT;
  v_head_id          UUID;
  v_payment_total    BIGINT := 0;
  v_alloc_total      BIGINT := 0;
  v_rem_balance      BIGINT;
  v_student_school   UUID;
BEGIN
  -- Multi-tenant authorization check when invoked by authenticated user
  IF auth.role() = 'authenticated' THEN
    IF auth.uid() IS NULL OR NOT (public.is_school_member(p_school_id) OR public.is_school_admin(p_school_id)) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Current user is not authorized to collect fees for school %', p_school_id;
    END IF;
  END IF;

  -- 1. Idempotency check
  IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) != '' THEN
    SELECT id, receipt_no, total_paise INTO v_existing_receipt
      FROM public.fee_receipts
      WHERE idempotency_key = p_idempotency_key AND school_id = p_school_id;

    IF v_existing_receipt.id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'receipt_id', v_existing_receipt.id,
        'receipt_no', v_existing_receipt.receipt_no,
        'idempotent', true,
        'total_paise', v_existing_receipt.total_paise
      );
    END IF;
  END IF;

  -- 2. Input validation
  IF p_total_paise <= 0 THEN
    RAISE EXCEPTION 'Total payment amount must be greater than zero';
  END IF;

  IF p_payments IS NULL OR jsonb_array_length(p_payments) = 0 THEN
    RAISE EXCEPTION 'At least one payment line is required';
  END IF;

  -- Verify student belongs to school
  SELECT school_id INTO v_student_school FROM public.students WHERE id = p_student_id AND deleted_at IS NULL;
  IF NOT FOUND OR v_student_school != p_school_id THEN
    RAISE EXCEPTION 'Student % not found in school %', p_student_id, p_school_id;
  END IF;

  -- 3. Sum of payments validation
  FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments) LOOP
    v_payment_total := v_payment_total + (v_payment->>'amount_paise')::BIGINT;
  END LOOP;

  IF v_payment_total != p_total_paise THEN
    RAISE EXCEPTION 'Sum of payments (%) does not match total amount (%)', v_payment_total, p_total_paise;
  END IF;

  -- 4. Allocations validation & row locks
  IF p_allocations IS NOT NULL THEN
    FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_allocations) LOOP
      v_due_id := (v_alloc->>'due_id')::UUID;
      v_amount := (v_alloc->>'amount_paise')::BIGINT;

      IF v_amount <= 0 THEN
        RAISE EXCEPTION 'Allocation amount must be greater than zero for due %', v_due_id;
      END IF;

      -- Lock target due FOR UPDATE
      SELECT * INTO v_due FROM public.student_dues WHERE id = v_due_id FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Due % not found', v_due_id;
      END IF;

      IF v_due.school_id != p_school_id THEN
        RAISE EXCEPTION 'Cross-tenant access denied on due %', v_due_id;
      END IF;

      IF v_due.student_id != p_student_id THEN
        RAISE EXCEPTION 'Due % does not belong to student %', v_due_id, p_student_id;
      END IF;

      v_rem_balance := v_due.net_paise - v_due.paid_paise;
      IF v_amount > v_rem_balance THEN
        RAISE EXCEPTION 'Allocation of % exceeds outstanding balance % for due %', v_amount, v_rem_balance, v_due_id;
      END IF;

      v_alloc_total := v_alloc_total + v_amount;
    END LOOP;
  END IF;

  IF (v_alloc_total + COALESCE(p_advance_paise, 0)) != p_total_paise THEN
    RAISE EXCEPTION 'Sum of allocations (%) and advance credit (%) does not match total amount (%)',
      v_alloc_total, COALESCE(p_advance_paise, 0), p_total_paise;
  END IF;

  -- 5. Generate gap-free atomic receipt number
  v_receipt_no := public.next_receipt_no(p_school_id, p_academic_year_id, p_prefix, p_year_label);

  -- 6. Insert receipt record
  INSERT INTO public.fee_receipts (
    school_id, receipt_no, student_id, academic_year_id,
    receipt_date, total_paise, status, source,
    payment_group_id, collected_by, remarks, idempotency_key
  ) VALUES (
    p_school_id, v_receipt_no, p_student_id, p_academic_year_id,
    p_receipt_date, p_total_paise, 'active', COALESCE(p_source, 'counter'),
    p_payment_group_id, p_collected_by, p_remarks, p_idempotency_key
  ) RETURNING id INTO v_receipt_id;

  -- 7. Insert payment records
  FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments) LOOP
    INSERT INTO public.fee_payments (
      school_id, receipt_id, mode, amount_paise, reference_no,
      bank_name, instrument_no, instrument_date, cheque_status,
      gateway_order_id, gateway_payment_id
    ) VALUES (
      p_school_id, v_receipt_id,
      v_payment->>'mode',
      (v_payment->>'amount_paise')::BIGINT,
      v_payment->>'reference_no',
      v_payment->>'bank_name',
      v_payment->>'instrument_no',
      CASE WHEN (v_payment->>'instrument_date') IS NOT NULL AND (v_payment->>'instrument_date') != ''
           THEN (v_payment->>'instrument_date')::date ELSE NULL END,
      v_payment->>'cheque_status',
      v_payment->>'gateway_order_id',
      v_payment->>'gateway_payment_id'
    );
  END LOOP;

  -- 8. Apply allocations to dues and ledger
  IF p_allocations IS NOT NULL THEN
    FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_allocations) LOOP
      v_due_id := (v_alloc->>'due_id')::UUID;
      v_amount := (v_alloc->>'amount_paise')::BIGINT;

      SELECT * INTO v_due FROM public.student_dues WHERE id = v_due_id;
      v_head_id := v_due.fee_head_id;

      -- Insert receipt item
      INSERT INTO public.fee_receipt_items (receipt_id, due_id, fee_head_id, amount_paise, concession_paise)
      VALUES (v_receipt_id, v_due_id, v_head_id, v_amount, 0);

      -- Update due paid and balance
      v_new_paid := v_due.paid_paise + v_amount;
      v_new_balance := GREATEST(v_due.net_paise - v_new_paid, 0);
      v_new_status := CASE
        WHEN v_new_paid >= v_due.net_paise THEN 'paid'
        WHEN v_new_paid > 0 THEN 'partial'
        ELSE v_due.status
      END;

      UPDATE public.student_dues
      SET paid_paise = v_new_paid,
          balance_paise = v_new_balance,
          status = v_new_status,
          updated_at = now()
      WHERE id = v_due_id;

      -- Write ledger entry
      INSERT INTO public.fee_ledger (
        school_id, student_id, academic_year_id,
        due_id, receipt_id, entry_type, amount_paise, note, created_by
      ) VALUES (
        p_school_id, p_student_id, p_academic_year_id,
        v_due_id, v_receipt_id, 'payment', -v_amount,
        'Payment via ' || v_receipt_no, p_collected_by
      );
    END LOOP;
  END IF;

  -- 9. Handle Advance credit if applicable
  IF p_advance_paise > 0 THEN
    INSERT INTO public.fee_credits (school_id, student_id, academic_year_id, amount_paise, remaining_paise, source_receipt_id)
    VALUES (p_school_id, p_student_id, p_academic_year_id, p_advance_paise, p_advance_paise, v_receipt_id);

    INSERT INTO public.fee_ledger (
      school_id, student_id, academic_year_id,
      due_id, receipt_id, entry_type, amount_paise, note, created_by
    ) VALUES (
      p_school_id, p_student_id, p_academic_year_id,
      NULL, v_receipt_id, 'payment', -p_advance_paise,
      'Advance credit via ' || v_receipt_no, p_collected_by
    );
  END IF;

  RETURN jsonb_build_object(
    'receipt_id', v_receipt_id,
    'receipt_no', v_receipt_no,
    'total_paise', p_total_paise,
    'idempotent', false
  );
END;
$$;

-- ============================================================================
-- 3. cancel_receipt
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cancel_receipt(
  p_school_id  UUID,
  p_receipt_id UUID,
  p_reason     TEXT,
  p_actor_id   UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt       RECORD;
  v_item          RECORD;
  v_due           RECORD;
  v_new_paid      BIGINT;
  v_new_balance   BIGINT;
  v_new_status    TEXT;
  v_reversed_cnt  INT := 0;
BEGIN
  -- Authorization check
  IF auth.role() = 'authenticated' THEN
    IF auth.uid() IS NULL OR NOT (public.is_school_member(p_school_id) OR public.is_school_admin(p_school_id)) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Current user is not authorized to cancel receipts for school %', p_school_id;
    END IF;
  END IF;

  -- Lock receipt
  SELECT * INTO v_receipt FROM public.fee_receipts
    WHERE id = p_receipt_id AND school_id = p_school_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Receipt not found';
  END IF;
  IF v_receipt.status != 'active' THEN
    RAISE EXCEPTION 'Receipt is already %', v_receipt.status;
  END IF;
  IF length(TRIM(p_reason)) < 10 THEN
    RAISE EXCEPTION 'Cancel reason must be at least 10 characters';
  END IF;

  -- Reverse each allocation item
  FOR v_item IN SELECT * FROM public.fee_receipt_items WHERE receipt_id = p_receipt_id LOOP
    SELECT * INTO v_due FROM public.student_dues WHERE id = v_item.due_id FOR UPDATE;

    IF FOUND THEN
      v_new_paid := GREATEST(v_due.paid_paise - v_item.amount_paise, 0);
      v_new_balance := GREATEST(v_due.net_paise - v_new_paid, 0);
      v_new_status := CASE
        WHEN v_new_paid = 0 AND v_due.net_paise > 0 THEN 'pending'
        WHEN v_new_paid > 0 AND v_new_paid < v_due.net_paise THEN 'partial'
        WHEN v_new_paid >= v_due.net_paise THEN 'paid'
        ELSE 'pending'
      END;

      UPDATE public.student_dues
      SET paid_paise = v_new_paid,
          balance_paise = v_new_balance,
          status = v_new_status,
          updated_at = now()
      WHERE id = v_item.due_id;

      -- Reversal ledger entry
      INSERT INTO public.fee_ledger (
        school_id, student_id, academic_year_id,
        due_id, receipt_id, entry_type, amount_paise, note, created_by
      ) VALUES (
        v_receipt.school_id, v_receipt.student_id, v_receipt.academic_year_id,
        v_item.due_id, p_receipt_id, 'reversal', v_item.amount_paise,
        'Reversal of ' || v_receipt.receipt_no || ': ' || p_reason, p_actor_id
      );

      v_reversed_cnt := v_reversed_cnt + 1;
    END IF;
  END LOOP;

  -- Reverse any advance credit from this receipt
  UPDATE public.fee_credits
    SET remaining_paise = 0
    WHERE source_receipt_id = p_receipt_id AND school_id = p_school_id;

  -- Mark receipt cancelled
  UPDATE public.fee_receipts
  SET status = 'cancelled',
      cancelled_by = p_actor_id,
      cancelled_at = now(),
      cancel_reason = p_reason,
      updated_at = now()
  WHERE id = p_receipt_id;

  RETURN jsonb_build_object(
    'cancelled', true,
    'receipt_no', v_receipt.receipt_no,
    'reversed_lines', v_reversed_cnt
  );
END;
$$;

-- ============================================================================
-- 4. get_fee_collections_summary
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_fee_collections_summary(
  p_school_id        UUID,
  p_academic_year_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_date       DATE;
  v_first_of_month   DATE;
  v_today_paise      BIGINT := 0;
  v_today_count      BIGINT := 0;
  v_month_paise      BIGINT := 0;
  v_month_count      BIGINT := 0;
  v_online_paise     BIGINT := 0;
  v_online_count     BIGINT := 0;
  v_cash_paise       BIGINT := 0;
  v_cash_count       BIGINT := 0;
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

  -- 1. Today's collections
  SELECT COALESCE(SUM(total_paise), 0), COUNT(*)
  INTO v_today_paise, v_today_count
  FROM public.fee_receipts
  WHERE school_id = p_school_id
    AND receipt_date = v_today_date
    AND status = 'active'
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id);

  -- 2. This month's collections
  SELECT COALESCE(SUM(total_paise), 0), COUNT(*)
  INTO v_month_paise, v_month_count
  FROM public.fee_receipts
  WHERE school_id = p_school_id
    AND receipt_date >= v_first_of_month
    AND receipt_date <= v_today_date
    AND status = 'active'
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id);

  -- 3. Online Payments (UPI, Bank Transfer, Online gateway, Card)
  SELECT COALESCE(SUM(p.amount_paise), 0), COUNT(DISTINCT r.id)
  INTO v_online_paise, v_online_count
  FROM public.fee_payments p
  JOIN public.fee_receipts r ON p.receipt_id = r.id
  WHERE r.school_id = p_school_id
    AND r.status = 'active'
    AND p.mode IN ('upi', 'bank_transfer', 'online', 'card')
    AND (p_academic_year_id IS NULL OR r.academic_year_id = p_academic_year_id);

  -- 4. Cash Payments
  SELECT COALESCE(SUM(p.amount_paise), 0), COUNT(DISTINCT r.id)
  INTO v_cash_paise, v_cash_count
  FROM public.fee_payments p
  JOIN public.fee_receipts r ON p.receipt_id = r.id
  WHERE r.school_id = p_school_id
    AND r.status = 'active'
    AND p.mode = 'cash'
    AND (p_academic_year_id IS NULL OR r.academic_year_id = p_academic_year_id);

  RETURN jsonb_build_object(
    'todayPaise', v_today_paise,
    'todayCount', v_today_count,
    'thisMonthPaise', v_month_paise,
    'thisMonthCount', v_month_count,
    'onlinePaise', v_online_paise,
    'onlineCount', v_online_count,
    'cashPaise', v_cash_paise,
    'cashCount', v_cash_count
  );
END;
$$;
