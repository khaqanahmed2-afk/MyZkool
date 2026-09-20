-- Migration: 010_fees.sql
-- Phase 2: Fee setup, dues generation, approvals
-- All amounts in integer paise. Append-only ledger. Idempotent generation.

-- ============================================================
-- 1. fee_heads
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fee_heads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'recurring' CHECK (kind IN ('recurring', 'one_time')),
  is_refundable BOOLEAN NOT NULL DEFAULT false,
  rte_waivable BOOLEAN NOT NULL DEFAULT false,
  is_system BOOLEAN NOT NULL DEFAULT false,   -- Transport fee, Late fee, Previous year dues; not editable/deletable
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_fee_head_code_per_school UNIQUE (school_id, code)
);

CREATE INDEX IF NOT EXISTS idx_fee_heads_school_id ON public.fee_heads(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_heads_school_active ON public.fee_heads(school_id, is_active);

-- Seed system heads (inserted per school on first setup by application code)
-- System heads seeded: transport_fee, late_fee, prev_year_dues

-- ============================================================
-- 2. fee_terms
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fee_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  due_date DATE NOT NULL,
  late_grace_days INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fee_terms_school_year ON public.fee_terms(school_id, academic_year_id);

-- ============================================================
-- 3. fee_structures
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  applies_to TEXT NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all', 'new_admission', 'existing')),
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fee_structures_school_year ON public.fee_structures(school_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_class ON public.fee_structures(class_id);
-- Partial unique: only one active structure per (year, class, applies_to)
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_structure_per_class
  ON public.fee_structures(academic_year_id, class_id, applies_to)
  WHERE status = 'active';

-- ============================================================
-- 4. fee_structure_items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fee_structure_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  structure_id UUID NOT NULL REFERENCES public.fee_structures(id) ON DELETE CASCADE,
  fee_head_id UUID NOT NULL REFERENCES public.fee_heads(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL DEFAULT 'custom' CHECK (pattern IN ('equal_all_terms', 'first_term_only', 'custom')),
  CONSTRAINT unique_structure_head UNIQUE (structure_id, fee_head_id)
);

CREATE INDEX IF NOT EXISTS idx_fee_structure_items_structure ON public.fee_structure_items(structure_id);

-- ============================================================
-- 5. fee_structure_item_terms
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fee_structure_item_terms (
  item_id UUID NOT NULL REFERENCES public.fee_structure_items(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.fee_terms(id) ON DELETE CASCADE,
  amount_paise BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, term_id)
);

CREATE INDEX IF NOT EXISTS idx_fee_structure_item_terms_item ON public.fee_structure_item_terms(item_id);

-- ============================================================
-- 6. student_fee_assignments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.student_fee_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  structure_id UUID NOT NULL REFERENCES public.fee_structures(id) ON DELETE CASCADE,
  structure_version INTEGER NOT NULL DEFAULT 1,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'replaced'))
);

CREATE INDEX IF NOT EXISTS idx_student_fee_assignments_student ON public.student_fee_assignments(student_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_student_fee_assignments_school ON public.student_fee_assignments(school_id);

-- ============================================================
-- 7. fee_receipts (stub — filled in Phase 3)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fee_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  receipt_no TEXT NOT NULL,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  receipt_date DATE NOT NULL,
  total_paise BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'bounced')),
  source TEXT NOT NULL DEFAULT 'counter' CHECK (source IN ('counter', 'online', 'import')),
  payment_group_id UUID,
  collected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  remarks TEXT,
  idempotency_key TEXT UNIQUE,
  print_count INTEGER NOT NULL DEFAULT 0,
  whatsapp_sent_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_receipt_no_per_school UNIQUE (school_id, receipt_no)
);

CREATE INDEX IF NOT EXISTS idx_fee_receipts_school ON public.fee_receipts(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_student ON public.fee_receipts(student_id);

-- ============================================================
-- 8. student_dues
-- ============================================================
CREATE TABLE IF NOT EXISTS public.student_dues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  fee_head_id UUID NOT NULL REFERENCES public.fee_heads(id) ON DELETE CASCADE,
  term_id UUID REFERENCES public.fee_terms(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'structure' CHECK (source IN ('structure', 'transport', 'manual', 'late_fee', 'carry_forward', 'adjustment')),
  source_ref UUID,                              -- transport_assignment_id / parent_due_id / origin_due_id
  description TEXT,
  gross_paise BIGINT NOT NULL DEFAULT 0,
  concession_paise BIGINT NOT NULL DEFAULT 0,
  net_paise BIGINT NOT NULL DEFAULT 0,
  paid_paise BIGINT NOT NULL DEFAULT 0,
  balance_paise BIGINT NOT NULL DEFAULT 0,      -- maintained by service layer (= net_paise - paid_paise)
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'cancelled', 'carried_forward', 'waived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT chk_paid_paise CHECK (paid_paise >= 0 AND paid_paise <= net_paise),
  CONSTRAINT chk_concession_paise CHECK (concession_paise >= 0 AND concession_paise <= gross_paise),
  CONSTRAINT chk_net_paise CHECK (net_paise = gross_paise - concession_paise)
);

-- Idempotency index: unique (student, year, head, term, source) for structure-sourced dues
CREATE UNIQUE INDEX IF NOT EXISTS unique_due_per_student_head_term
  ON public.student_dues(student_id, academic_year_id, fee_head_id, term_id, source)
  WHERE source = 'structure' AND term_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_student_dues_school ON public.student_dues(school_id);
CREATE INDEX IF NOT EXISTS idx_student_dues_student_year ON public.student_dues(student_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_student_dues_status ON public.student_dues(school_id, status);
CREATE INDEX IF NOT EXISTS idx_student_dues_due_date ON public.student_dues(due_date);

-- ============================================================
-- 9. concession_rules
-- ============================================================
CREATE TABLE IF NOT EXISTS public.concession_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  basis TEXT NOT NULL CHECK (basis IN ('sibling', 'staff_ward', 'rte', 'ews', 'merit', 'management', 'other')),
  type TEXT NOT NULL CHECK (type IN ('percent', 'fixed')),
  value NUMERIC NOT NULL,
  fee_head_ids UUID[] NOT NULL DEFAULT '{}',    -- empty = all heads
  sibling_from_rank INTEGER,                     -- applies to sibling rank >= this value
  auto_apply BOOLEAN NOT NULL DEFAULT false,
  needs_approval BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concession_rules_school ON public.concession_rules(school_id);

-- ============================================================
-- 10. student_concessions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.student_concessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.concession_rules(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('percent', 'fixed')),
  value NUMERIC NOT NULL,
  fee_head_ids UUID[] NOT NULL DEFAULT '{}',
  reason TEXT NOT NULL,
  document_id UUID REFERENCES public.student_documents(id) ON DELETE SET NULL,
  from_term_id UUID REFERENCES public.fee_terms(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_concessions_student ON public.student_concessions(student_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_student_concessions_school ON public.student_concessions(school_id);

-- ============================================================
-- 11. late_fee_rules
-- ============================================================
CREATE TABLE IF NOT EXISTS public.late_fee_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fee_head_ids UUID[],                           -- null = all heads
  method TEXT NOT NULL CHECK (method IN ('flat_once', 'per_day', 'per_week', 'per_month', 'percent_once')),
  value NUMERIC NOT NULL,
  grace_days INTEGER NOT NULL DEFAULT 0,
  max_cap_paise BIGINT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_late_fee_rules_school ON public.late_fee_rules(school_id);

-- ============================================================
-- 12. fee_settings (one row per school)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fee_settings (
  school_id UUID PRIMARY KEY REFERENCES public.schools(id) ON DELETE CASCADE,
  receipt_prefix TEXT NOT NULL DEFAULT 'MZ',
  receipt_paper TEXT NOT NULL DEFAULT 'a5' CHECK (receipt_paper IN ('a5', 'thermal80')),
  receipt_language TEXT NOT NULL DEFAULT 'en' CHECK (receipt_language IN ('en', 'hi', 'both')),
  allow_partial BOOLEAN NOT NULL DEFAULT true,
  min_partial_paise BIGINT NOT NULL DEFAULT 0,
  allow_advance BOOLEAN NOT NULL DEFAULT true,
  allocation_mode TEXT NOT NULL DEFAULT 'auto_oldest_first' CHECK (allocation_mode IN ('auto_oldest_first', 'manual')),
  round_to_rupee BOOLEAN NOT NULL DEFAULT true,
  backdate_days_limit INTEGER NOT NULL DEFAULT 0,
  discount_approval_threshold_percent NUMERIC NOT NULL DEFAULT 10,
  auto_assign_fee_on_admission BOOLEAN NOT NULL DEFAULT true,
  auto_late_fee BOOLEAN NOT NULL DEFAULT false,
  cheque_receipt_timing TEXT NOT NULL DEFAULT 'on_receipt' CHECK (cheque_receipt_timing IN ('on_receipt', 'on_clearance')),
  parent_pay_enabled BOOLEAN NOT NULL DEFAULT false,
  gateway_fee_bearer TEXT NOT NULL DEFAULT 'school' CHECK (gateway_fee_bearer IN ('school', 'parent')),
  auto_print_receipt BOOLEAN NOT NULL DEFAULT false,
  owner_pin_hash TEXT,                           -- PBKDF2 hash of the owner PIN
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 13. fee_ledger (append-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fee_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  due_id UUID REFERENCES public.student_dues(id) ON DELETE SET NULL,
  receipt_id UUID REFERENCES public.fee_receipts(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'due_created', 'concession', 'payment', 'refund',
    'reversal', 'waiver', 'late_fee', 'adjustment',
    'carry_forward', 'cancel_due'
  )),
  amount_paise BIGINT NOT NULL,                  -- positive = student owes more, negative = reduces balance
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  -- NO updated_at — ledger is append-only
);

CREATE INDEX IF NOT EXISTS idx_fee_ledger_school ON public.fee_ledger(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_ledger_student_year ON public.fee_ledger(student_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_fee_ledger_due ON public.fee_ledger(due_id);
CREATE INDEX IF NOT EXISTS idx_fee_ledger_created_at ON public.fee_ledger(created_at DESC);

-- ============================================================
-- 14. fee_credits
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fee_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  amount_paise BIGINT NOT NULL,
  remaining_paise BIGINT NOT NULL,
  source_receipt_id UUID REFERENCES public.fee_receipts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fee_credits_student ON public.fee_credits(student_id, academic_year_id);

-- ============================================================
-- 15. approval_requests (shared across modules)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN (
    'discount', 'receipt_cancel', 'refund', 'backdate',
    'late_fee_waiver', 'tc_override', 'structure_change'
  )),
  entity_type TEXT,
  entity_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_school ON public.approval_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON public.approval_requests(school_id, status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_kind ON public.approval_requests(school_id, kind);

-- ============================================================
-- 16. day_closings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.day_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  business_date DATE NOT NULL,
  opening_cash_paise BIGINT NOT NULL DEFAULT 0,
  system_cash_paise BIGINT NOT NULL DEFAULT 0,
  refunds_cash_paise BIGINT NOT NULL DEFAULT 0,
  expected_cash_paise BIGINT NOT NULL DEFAULT 0,
  counted_cash_paise BIGINT NOT NULL DEFAULT 0,
  denominations JSONB NOT NULL DEFAULT '{}'::jsonb,
  difference_paise BIGINT NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'closed' CHECK (status IN ('closed', 'reopened')),
  closed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_day_closing UNIQUE (school_id, business_date)
);

CREATE INDEX IF NOT EXISTS idx_day_closings_school ON public.day_closings(school_id);

-- ============================================================
-- 17. updated_at triggers for mutable tables
-- ============================================================
DROP TRIGGER IF EXISTS trigger_fee_heads_updated_at ON public.fee_heads;
CREATE TRIGGER trigger_fee_heads_updated_at
  BEFORE UPDATE ON public.fee_heads
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_fee_terms_updated_at ON public.fee_terms;
CREATE TRIGGER trigger_fee_terms_updated_at
  BEFORE UPDATE ON public.fee_terms
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_fee_structures_updated_at ON public.fee_structures;
CREATE TRIGGER trigger_fee_structures_updated_at
  BEFORE UPDATE ON public.fee_structures
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_student_dues_updated_at ON public.student_dues;
CREATE TRIGGER trigger_student_dues_updated_at
  BEFORE UPDATE ON public.student_dues
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_concession_rules_updated_at ON public.concession_rules;
CREATE TRIGGER trigger_concession_rules_updated_at
  BEFORE UPDATE ON public.concession_rules
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_student_concessions_updated_at ON public.student_concessions;
CREATE TRIGGER trigger_student_concessions_updated_at
  BEFORE UPDATE ON public.student_concessions
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_late_fee_rules_updated_at ON public.late_fee_rules;
CREATE TRIGGER trigger_late_fee_rules_updated_at
  BEFORE UPDATE ON public.late_fee_rules
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_fee_settings_updated_at ON public.fee_settings;
CREATE TRIGGER trigger_fee_settings_updated_at
  BEFORE UPDATE ON public.fee_settings
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_student_fee_assignments_updated_at ON public.student_fee_assignments;
CREATE TRIGGER trigger_student_fee_assignments_updated_at
  BEFORE UPDATE ON public.student_fee_assignments
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_approval_requests_updated_at ON public.approval_requests;
CREATE TRIGGER trigger_approval_requests_updated_at
  BEFORE UPDATE ON public.approval_requests
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_fee_receipts_updated_at ON public.fee_receipts;
CREATE TRIGGER trigger_fee_receipts_updated_at
  BEFORE UPDATE ON public.fee_receipts
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 18. RLS policies
-- ============================================================
ALTER TABLE public.fee_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structure_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structure_item_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fee_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concession_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_concessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.late_fee_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_receipts ENABLE ROW LEVEL SECURITY;

-- fee_heads RLS
DROP POLICY IF EXISTS "Fee heads tenant isolation" ON public.fee_heads;
CREATE POLICY "Fee heads tenant isolation" ON public.fee_heads
  FOR ALL USING (school_id = current_school_id());

-- fee_terms RLS
DROP POLICY IF EXISTS "Fee terms tenant isolation" ON public.fee_terms;
CREATE POLICY "Fee terms tenant isolation" ON public.fee_terms
  FOR ALL USING (school_id = current_school_id());

-- fee_structures RLS
DROP POLICY IF EXISTS "Fee structures tenant isolation" ON public.fee_structures;
CREATE POLICY "Fee structures tenant isolation" ON public.fee_structures
  FOR ALL USING (school_id = current_school_id());

-- fee_structure_items RLS (join to fee_structures)
DROP POLICY IF EXISTS "Fee structure items tenant isolation" ON public.fee_structure_items;
CREATE POLICY "Fee structure items tenant isolation" ON public.fee_structure_items
  FOR ALL USING (school_id = current_school_id());

-- fee_structure_item_terms RLS (via item_id → fee_structure_items)
DROP POLICY IF EXISTS "Fee structure item terms tenant isolation" ON public.fee_structure_item_terms;
CREATE POLICY "Fee structure item terms tenant isolation" ON public.fee_structure_item_terms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.fee_structure_items fsi
      WHERE fsi.id = item_id AND fsi.school_id = current_school_id()
    )
  );

-- student_fee_assignments RLS
DROP POLICY IF EXISTS "Student fee assignments tenant isolation" ON public.student_fee_assignments;
CREATE POLICY "Student fee assignments tenant isolation" ON public.student_fee_assignments
  FOR ALL USING (school_id = current_school_id());

-- student_dues RLS
DROP POLICY IF EXISTS "Student dues tenant isolation" ON public.student_dues;
CREATE POLICY "Student dues tenant isolation" ON public.student_dues
  FOR ALL USING (school_id = current_school_id());

-- concession_rules RLS
DROP POLICY IF EXISTS "Concession rules tenant isolation" ON public.concession_rules;
CREATE POLICY "Concession rules tenant isolation" ON public.concession_rules
  FOR ALL USING (school_id = current_school_id());

-- student_concessions RLS
DROP POLICY IF EXISTS "Student concessions tenant isolation" ON public.student_concessions;
CREATE POLICY "Student concessions tenant isolation" ON public.student_concessions
  FOR ALL USING (school_id = current_school_id());

-- late_fee_rules RLS
DROP POLICY IF EXISTS "Late fee rules tenant isolation" ON public.late_fee_rules;
CREATE POLICY "Late fee rules tenant isolation" ON public.late_fee_rules
  FOR ALL USING (school_id = current_school_id());

-- fee_settings RLS
DROP POLICY IF EXISTS "Fee settings tenant isolation" ON public.fee_settings;
CREATE POLICY "Fee settings tenant isolation" ON public.fee_settings
  FOR ALL USING (school_id = current_school_id());

-- fee_ledger RLS (append-only: no delete/update for normal users)
DROP POLICY IF EXISTS "Fee ledger tenant read" ON public.fee_ledger;
CREATE POLICY "Fee ledger tenant read" ON public.fee_ledger
  FOR SELECT USING (school_id = current_school_id());

DROP POLICY IF EXISTS "Fee ledger tenant insert" ON public.fee_ledger;
CREATE POLICY "Fee ledger tenant insert" ON public.fee_ledger
  FOR INSERT WITH CHECK (school_id = current_school_id());

-- fee_credits RLS
DROP POLICY IF EXISTS "Fee credits tenant isolation" ON public.fee_credits;
CREATE POLICY "Fee credits tenant isolation" ON public.fee_credits
  FOR ALL USING (school_id = current_school_id());

-- approval_requests RLS
DROP POLICY IF EXISTS "Approval requests tenant isolation" ON public.approval_requests;
CREATE POLICY "Approval requests tenant isolation" ON public.approval_requests
  FOR ALL USING (school_id = current_school_id());

-- day_closings RLS
DROP POLICY IF EXISTS "Day closings tenant isolation" ON public.day_closings;
CREATE POLICY "Day closings tenant isolation" ON public.day_closings
  FOR ALL USING (school_id = current_school_id());

-- fee_receipts RLS
DROP POLICY IF EXISTS "Fee receipts tenant isolation" ON public.fee_receipts;
CREATE POLICY "Fee receipts tenant isolation" ON public.fee_receipts
  FOR ALL USING (school_id = current_school_id());

