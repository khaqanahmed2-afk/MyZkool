-- 011_fee_collection.sql
-- Receipt, payment, day closing tables for the collection engine (Phase 3a)
-- Follows the same RLS pattern as 010_fees.sql

-- ─── fee_receipts ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fee_receipts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  receipt_no        TEXT NOT NULL,
  student_id        UUID NOT NULL REFERENCES public.students(id),
  academic_year_id  UUID NOT NULL REFERENCES public.academic_years(id),
  receipt_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  total_paise       BIGINT NOT NULL CHECK (total_paise >= 0),
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','bounced')),
  source            TEXT NOT NULL DEFAULT 'counter' CHECK (source IN ('counter','online','import')),
  payment_group_id  UUID,
  collected_by      UUID REFERENCES public.profiles(id),
  remarks           TEXT,
  idempotency_key   TEXT UNIQUE,
  print_count       INT NOT NULL DEFAULT 0,
  whatsapp_sent_at  TIMESTAMPTZ,
  cancelled_by      UUID REFERENCES public.profiles(id),
  cancelled_at      TIMESTAMPTZ,
  cancel_reason     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, receipt_no)
);

CREATE INDEX IF NOT EXISTS idx_fee_receipts_school_id ON public.fee_receipts(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_student_id ON public.fee_receipts(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_receipt_date ON public.fee_receipts(school_id, receipt_date);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_payment_group ON public.fee_receipts(payment_group_id) WHERE payment_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fee_receipts_idempotency ON public.fee_receipts(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ─── fee_receipt_items ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fee_receipt_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id       UUID NOT NULL REFERENCES public.fee_receipts(id) ON DELETE CASCADE,
  due_id           UUID NOT NULL REFERENCES public.student_dues(id),
  fee_head_id      UUID NOT NULL REFERENCES public.fee_heads(id),
  amount_paise     BIGINT NOT NULL CHECK (amount_paise >= 0),
  concession_paise BIGINT NOT NULL DEFAULT 0 CHECK (concession_paise >= 0)
);

CREATE INDEX IF NOT EXISTS idx_fee_receipt_items_receipt ON public.fee_receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_fee_receipt_items_due ON public.fee_receipt_items(due_id);

-- ─── fee_payments ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fee_payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id           UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  receipt_id          UUID NOT NULL REFERENCES public.fee_receipts(id) ON DELETE CASCADE,
  mode                TEXT NOT NULL CHECK (mode IN ('cash','upi','card','cheque','bank_transfer','dd','online','other')),
  amount_paise        BIGINT NOT NULL CHECK (amount_paise > 0),
  reference_no        TEXT,
  bank_name           TEXT,
  instrument_no       TEXT,
  instrument_date     DATE,
  cheque_status       TEXT CHECK (cheque_status IN ('received','deposited','cleared','bounced') OR cheque_status IS NULL),
  gateway_order_id    TEXT,
  gateway_payment_id  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fee_payments_receipt ON public.fee_payments(receipt_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_school ON public.fee_payments(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_mode ON public.fee_payments(school_id, mode);

-- ─── day_closings ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.day_closings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id            UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  business_date        DATE NOT NULL,
  opening_cash_paise   BIGINT NOT NULL DEFAULT 0,
  system_cash_paise    BIGINT NOT NULL DEFAULT 0,
  refunds_cash_paise   BIGINT NOT NULL DEFAULT 0,
  expected_cash_paise  BIGINT NOT NULL DEFAULT 0,
  counted_cash_paise   BIGINT,
  denominations        JSONB,
  difference_paise     BIGINT,
  notes                TEXT,
  status               TEXT NOT NULL DEFAULT 'closed' CHECK (status IN ('closed','reopened')),
  closed_by            UUID REFERENCES public.profiles(id),
  closed_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, business_date)
);

CREATE INDEX IF NOT EXISTS idx_day_closings_school ON public.day_closings(school_id, business_date);

-- ─── outbox (for async WhatsApp / SMS messages) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.fee_outbox (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,  -- 'receipt_created', 'receipt_cancelled', 'reminder'
  payload     JSONB NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  attempts    INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fee_outbox_pending ON public.fee_outbox(status, created_at) WHERE status = 'pending';

-- ─── fee_audit_log ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fee_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  actor_id     UUID REFERENCES public.profiles(id),
  event_type   TEXT NOT NULL,
  entity_type  TEXT,
  entity_id    UUID,
  before_json  JSONB,
  after_json   JSONB,
  ip_address   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fee_audit_log_school ON public.fee_audit_log(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fee_audit_log_entity ON public.fee_audit_log(entity_type, entity_id);

-- ─── Triggers ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_fee_receipts_updated_at') THEN
    CREATE TRIGGER trg_fee_receipts_updated_at
      BEFORE UPDATE ON public.fee_receipts
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_day_closings_updated_at') THEN
    CREATE TRIGGER trg_day_closings_updated_at
      BEFORE UPDATE ON public.day_closings
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.fee_receipts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_closings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_outbox        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_audit_log     ENABLE ROW LEVEL SECURITY;

-- fee_receipts: school members can SELECT; INSERT only for fees.collect; no DELETE; UPDATE only status/print_count via named function
CREATE POLICY "fee_receipts_school_isolation" ON public.fee_receipts
  USING (school_id = current_school_id());

CREATE POLICY "fee_receipt_items_isolation" ON public.fee_receipt_items
  USING (receipt_id IN (SELECT id FROM public.fee_receipts WHERE school_id = current_school_id()));

CREATE POLICY "fee_payments_isolation" ON public.fee_payments
  USING (school_id = current_school_id());

CREATE POLICY "day_closings_isolation" ON public.day_closings
  USING (school_id = current_school_id());

CREATE POLICY "fee_outbox_isolation" ON public.fee_outbox
  USING (school_id = current_school_id());

CREATE POLICY "fee_audit_log_isolation" ON public.fee_audit_log
  USING (school_id = current_school_id());

-- ─── Helper RPC: atomic receipt number from counters ─────────────────────────
CREATE OR REPLACE FUNCTION public.next_receipt_no(
  p_school_id      UUID,
  p_academic_year_id UUID,
  p_prefix         TEXT,
  p_year_label     TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_counter_key TEXT;
  v_next        BIGINT;
  v_receipt_no  TEXT;
BEGIN
  v_counter_key := 'receipt_no_' || p_academic_year_id::TEXT;

  -- Upsert counter row and atomically increment
  INSERT INTO public.counters (school_id, kind, last_value)
    VALUES (p_school_id, v_counter_key, 1)
    ON CONFLICT (school_id, kind)
    DO UPDATE SET last_value = counters.last_value + 1
    RETURNING last_value INTO v_next;

  v_receipt_no := p_prefix || '/' || p_year_label || '/' || LPAD(v_next::TEXT, 6, '0');
  RETURN v_receipt_no;
END;
$$;

-- ─── Helper RPC: collect_fees transaction ─────────────────────────────────────
-- This is called from the service layer; it runs atomically with row locks.
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
  p_payments         JSONB,  -- [{mode, amount_paise, ...}]
  p_advance_paise    BIGINT DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_receipt_id UUID;
  v_receipt_no          TEXT;
  v_receipt_id          UUID;
  v_alloc               JSONB;
  v_payment             JSONB;
  v_due_id              UUID;
  v_amount              BIGINT;
  v_due                 RECORD;
  v_new_paid            BIGINT;
  v_new_status          TEXT;
  v_head_id             UUID;
BEGIN
  -- Idempotency check
  SELECT id INTO v_existing_receipt_id
    FROM public.fee_receipts
    WHERE idempotency_key = p_idempotency_key AND school_id = p_school_id;

  IF v_existing_receipt_id IS NOT NULL THEN
    RETURN jsonb_build_object('receipt_id', v_existing_receipt_id, 'idempotent', true);
  END IF;

  -- Lock all target dues FOR UPDATE
  FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_allocations) LOOP
    v_due_id := (v_alloc->>'due_id')::UUID;
    SELECT * INTO v_due FROM public.student_dues WHERE id = v_due_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Due % not found', v_due_id;
    END IF;
    IF v_due.school_id != p_school_id THEN
      RAISE EXCEPTION 'Cross-tenant access denied';
    END IF;
  END LOOP;

  -- Get gap-free receipt number
  v_receipt_no := public.next_receipt_no(p_school_id, p_academic_year_id, p_prefix, p_year_label);

  -- Insert receipt
  INSERT INTO public.fee_receipts (
    school_id, receipt_no, student_id, academic_year_id,
    receipt_date, total_paise, status, source,
    payment_group_id, collected_by, remarks, idempotency_key
  ) VALUES (
    p_school_id, v_receipt_no, p_student_id, p_academic_year_id,
    p_receipt_date, p_total_paise, 'active', p_source,
    p_payment_group_id, p_collected_by, p_remarks, p_idempotency_key
  ) RETURNING id INTO v_receipt_id;

  -- Insert payment rows
  FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments) LOOP
    INSERT INTO public.fee_payments (school_id, receipt_id, mode, amount_paise, reference_no)
    VALUES (
      p_school_id, v_receipt_id,
      v_payment->>'mode',
      (v_payment->>'amount_paise')::BIGINT,
      v_payment->>'reference_no'
    );
  END LOOP;

  -- Apply allocations
  FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_allocations) LOOP
    v_due_id := (v_alloc->>'due_id')::UUID;
    v_amount := (v_alloc->>'amount_paise')::BIGINT;

    SELECT * INTO v_due FROM public.student_dues WHERE id = v_due_id;
    v_head_id := v_due.fee_head_id;

    -- Insert receipt item
    INSERT INTO public.fee_receipt_items (receipt_id, due_id, fee_head_id, amount_paise)
    VALUES (v_receipt_id, v_due_id, v_head_id, v_amount);

    -- Update due
    v_new_paid := v_due.paid_paise + v_amount;
    v_new_status := CASE
      WHEN v_new_paid >= v_due.net_paise THEN 'paid'
      WHEN v_new_paid > 0 THEN 'partial'
      ELSE v_due.status
    END;

    UPDATE public.student_dues
    SET paid_paise = v_new_paid, status = v_new_status, updated_at = now()
    WHERE id = v_due_id;

    -- Ledger row
    INSERT INTO public.fee_ledger (
      school_id, student_id, academic_year_id,
      due_id, receipt_id, entry_type, amount_paise, note, created_by
    ) VALUES (
      p_school_id, p_student_id, p_academic_year_id,
      v_due_id, v_receipt_id, 'payment', -v_amount,
      'Payment via ' || v_receipt_no, p_collected_by
    );
  END LOOP;

  -- Advance credit
  IF p_advance_paise > 0 THEN
    INSERT INTO public.fee_credits (school_id, student_id, academic_year_id, amount_paise, remaining_paise, source_receipt_id)
    VALUES (p_school_id, p_student_id, p_academic_year_id, p_advance_paise, p_advance_paise, v_receipt_id);

    INSERT INTO public.fee_ledger (
      school_id, student_id, academic_year_id,
      due_id, receipt_id, entry_type, amount_paise, note, created_by
    ) VALUES (
      p_school_id, p_student_id, p_academic_year_id,
      NULL, v_receipt_id, 'payment', -p_advance_paise,
      'Advance credit ' || v_receipt_no, p_collected_by
    );
  END IF;

  RETURN jsonb_build_object('receipt_id', v_receipt_id, 'receipt_no', v_receipt_no, 'idempotent', false);
END;
$$;

-- ─── Helper RPC: cancel_receipt transaction ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_receipt(
  p_school_id  UUID,
  p_receipt_id UUID,
  p_reason     TEXT,
  p_actor_id   UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_receipt  RECORD;
  v_item     RECORD;
  v_due      RECORD;
  v_new_paid BIGINT;
  v_new_status TEXT;
BEGIN
  -- Lock receipt
  SELECT * INTO v_receipt FROM public.fee_receipts
    WHERE id = p_receipt_id AND school_id = p_school_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Receipt not found';
  END IF;
  IF v_receipt.status != 'active' THEN
    RAISE EXCEPTION 'Receipt is already %', v_receipt.status;
  END IF;
  IF length(p_reason) < 10 THEN
    RAISE EXCEPTION 'Cancel reason must be at least 10 characters';
  END IF;

  -- Reverse each allocation item
  FOR v_item IN SELECT * FROM public.fee_receipt_items WHERE receipt_id = p_receipt_id LOOP
    SELECT * INTO v_due FROM public.student_dues WHERE id = v_item.due_id FOR UPDATE;

    v_new_paid := GREATEST(v_due.paid_paise - v_item.amount_paise, 0);
    v_new_status := CASE
      WHEN v_new_paid = 0 AND v_due.net_paise > 0 THEN 'pending'
      WHEN v_new_paid > 0 AND v_new_paid < v_due.net_paise THEN 'partial'
      WHEN v_new_paid >= v_due.net_paise THEN 'paid'
      ELSE 'pending'
    END;

    UPDATE public.student_dues
    SET paid_paise = v_new_paid, status = v_new_status, updated_at = now()
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
  END LOOP;

  -- Reverse any advance credit from this receipt
  UPDATE public.fee_credits
    SET remaining_paise = 0
    WHERE source_receipt_id = p_receipt_id AND school_id = p_school_id;

  -- Mark receipt cancelled
  UPDATE public.fee_receipts
  SET status = 'cancelled', cancelled_by = p_actor_id,
      cancelled_at = now(), cancel_reason = p_reason, updated_at = now()
  WHERE id = p_receipt_id;

  RETURN jsonb_build_object('cancelled', true, 'receipt_no', v_receipt.receipt_no);
END;
$$;

