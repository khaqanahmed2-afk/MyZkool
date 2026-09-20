-- ============================================================================
-- Migration 012: Fee Operations (Phase 4)
-- reminder rules, follow-ups, refunds, day close extensions, reports views
-- ============================================================================

-- ─── fee_reminder_rules ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fee_reminder_rules (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id          UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  days_offset        INT NOT NULL,                  -- negative = before due date, 0 = on due date, positive = after due date
  channel            TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'sms')),
  template_key       TEXT NOT NULL DEFAULT 'fee_reminder_overdue',
  is_active          BOOLEAN NOT NULL DEFAULT true,
  max_sends          INT NOT NULL DEFAULT 5,
  min_balance_paise  BIGINT NOT NULL DEFAULT 10000, -- Rs 100 default minimum
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fee_reminder_rules_school ON public.fee_reminder_rules(school_id);

-- ─── fee_followups ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fee_followups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  staff_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  note         TEXT NOT NULL,
  promise_date DATE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'kept', 'broken')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fee_followups_student ON public.fee_followups(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_fee_followups_promise ON public.fee_followups(school_id, promise_date);

-- ─── fee_refunds ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fee_refunds (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  receipt_id        UUID REFERENCES public.fee_receipts(id) ON DELETE SET NULL,
  academic_year_id  UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  amount_paise      BIGINT NOT NULL CHECK (amount_paise > 0),
  reason            TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected', 'paid')),
  payment_mode      TEXT NOT NULL DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'bank_transfer', 'cheque', 'upi', 'other')),
  reference_no      TEXT,
  requested_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at       TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  ledger_entry_id   UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fee_refunds_school ON public.fee_refunds(school_id, status);

-- ─── Extend day_closings with reopen and mode totals ─────────────────────────
ALTER TABLE public.day_closings ADD COLUMN IF NOT EXISTS totals_by_mode JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.day_closings ADD COLUMN IF NOT EXISTS reopened_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.day_closings ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMPTZ;
ALTER TABLE public.day_closings ADD COLUMN IF NOT EXISTS reopen_reason TEXT;

-- ─── SQL Views for High Performance Reports (B5.11) ──────────────────────────

-- 1. Day Book View
CREATE OR REPLACE VIEW public.v_fee_day_book WITH (security_invoker = true) AS
SELECT
  r.id AS entry_id,
  r.school_id,
  r.receipt_date AS business_date,
  'receipt' AS entry_type,
  r.receipt_no AS reference_no,
  r.student_id,
  s.first_name || ' ' || s.last_name AS student_name,
  s.admission_no,
  c.name AS class_name,
  p.mode AS payment_mode,
  p.amount_paise,
  r.collected_by,
  r.status,
  r.created_at
FROM public.fee_receipts r
JOIN public.fee_payments p ON p.receipt_id = r.id
JOIN public.students s ON s.id = r.student_id
LEFT JOIN public.student_enrollments enr ON enr.student_id = r.student_id AND enr.academic_year_id = r.academic_year_id
LEFT JOIN public.classes c ON c.id = COALESCE(enr.class_id, s.admission_class_id)
WHERE s.deleted_at IS NULL;

-- 2. Outstanding & Defaulters View
CREATE OR REPLACE VIEW public.v_fee_outstanding WITH (security_invoker = true) AS
SELECT
  d.school_id,
  d.student_id,
  d.academic_year_id,
  s.first_name || ' ' || s.last_name AS student_name,
  s.admission_no,
  c.id AS class_id,
  c.name AS class_name,
  sec.name AS section_name,
  s.is_rte,
  SUM(d.gross_paise) AS total_gross_paise,
  SUM(d.concession_paise) AS total_concession_paise,
  SUM(d.net_paise) AS total_net_paise,
  SUM(d.paid_paise) AS total_paid_paise,
  SUM(d.balance_paise) AS total_balance_paise,
  MIN(d.due_date) AS oldest_due_date,
  CURRENT_DATE - MIN(d.due_date) AS days_overdue,
  CASE
    WHEN CURRENT_DATE - MIN(d.due_date) <= 30 THEN '0_30'
    WHEN CURRENT_DATE - MIN(d.due_date) <= 60 THEN '31_60'
    WHEN CURRENT_DATE - MIN(d.due_date) <= 90 THEN '61_90'
    ELSE '90_plus'
  END AS aging_bucket
FROM public.student_dues d
JOIN public.students s ON s.id = d.student_id
LEFT JOIN public.student_enrollments enr ON enr.student_id = d.student_id AND enr.academic_year_id = d.academic_year_id
LEFT JOIN public.classes c ON c.id = COALESCE(enr.class_id, s.admission_class_id)
LEFT JOIN public.sections sec ON sec.id = enr.section_id
WHERE d.status IN ('pending', 'partial')
  AND d.balance_paise > 0
  AND s.deleted_at IS NULL
GROUP BY d.school_id, d.student_id, d.academic_year_id, s.first_name, s.last_name, s.admission_no, c.id, c.name, sec.name, s.is_rte;

-- 3. Concession Register View
CREATE OR REPLACE VIEW public.v_fee_concession_register WITH (security_invoker = true) AS
SELECT
  d.id AS due_id,
  d.school_id,
  d.student_id,
  d.academic_year_id,
  s.first_name || ' ' || s.last_name AS student_name,
  s.admission_no,
  c.name AS class_name,
  d.description AS due_description,
  d.gross_paise,
  d.concession_paise,
  d.net_paise,
  d.created_at
FROM public.student_dues d
JOIN public.students s ON s.id = d.student_id
LEFT JOIN public.student_enrollments enr ON enr.student_id = d.student_id AND enr.academic_year_id = d.academic_year_id
LEFT JOIN public.classes c ON c.id = COALESCE(enr.class_id, s.admission_class_id)
WHERE d.concession_paise > 0
  AND s.deleted_at IS NULL;

-- 4. Cancelled Receipts View
CREATE OR REPLACE VIEW public.v_fee_cancelled_receipts WITH (security_invoker = true) AS
SELECT
  r.id,
  r.school_id,
  r.receipt_no,
  r.receipt_date,
  r.student_id,
  s.first_name || ' ' || s.last_name AS student_name,
  s.admission_no,
  r.total_paise,
  r.cancel_reason,
  r.cancelled_by,
  r.cancelled_at
FROM public.fee_receipts r
JOIN public.students s ON s.id = r.student_id
WHERE r.status = 'cancelled';

-- ─── RLS Policies ─────────────────────────────────────────────────────────────
ALTER TABLE public.fee_reminder_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fee_reminder_rules_school" ON public.fee_reminder_rules
  FOR ALL USING (school_id = current_school_id());

CREATE POLICY "fee_followups_school" ON public.fee_followups
  FOR ALL USING (school_id = current_school_id());

CREATE POLICY "fee_refunds_school" ON public.fee_refunds
  FOR ALL USING (school_id = current_school_id());

