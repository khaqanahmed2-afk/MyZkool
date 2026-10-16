-- Migration: 20261016110000_student_concessions_workflow_enhancements.sql
-- Description: Expand student concessions and concession policies to support full lifecycle,
--              status workflows (pending, scheduled, active, expired, rejected, revoked),
--              validity date ranges, billing periods, supporting document links, and review audits.

-- 1. Update check constraint on student_concessions.status and concession_rules.basis
ALTER TABLE public.student_concessions DROP CONSTRAINT IF EXISTS student_concessions_status_check;
ALTER TABLE public.student_concessions ADD CONSTRAINT student_concessions_status_check 
  CHECK (status IN ('draft', 'pending', 'approved', 'active', 'scheduled', 'expired', 'revoked', 'rejected'));

ALTER TABLE public.concession_rules DROP CONSTRAINT IF EXISTS concession_rules_basis_check;
ALTER TABLE public.concession_rules ADD CONSTRAINT concession_rules_basis_check
  CHECK (basis IN ('sibling', 'staff_ward', 'rte', 'ews', 'merit', 'management', 'financial_aid', 'other'));


-- 2. Add lifecycle, validity, document, and audit columns to student_concessions
ALTER TABLE public.student_concessions 
  ADD COLUMN IF NOT EXISTS valid_from DATE,
  ADD COLUMN IF NOT EXISTS valid_to DATE,
  ADD COLUMN IF NOT EXISTS concession_type TEXT DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS billing_period TEXT DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS document_url TEXT,
  ADD COLUMN IF NOT EXISTS document_name TEXT,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Add policy description, cap and year linking to concession_rules
ALTER TABLE public.concession_rules
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS max_cap_paise BIGINT,
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL;

-- 4. Create performance indexes for concessions dashboard queries
CREATE INDEX IF NOT EXISTS idx_student_concessions_school_status 
  ON public.student_concessions(school_id, status);

CREATE INDEX IF NOT EXISTS idx_student_concessions_validity 
  ON public.student_concessions(school_id, valid_from, valid_to);

CREATE INDEX IF NOT EXISTS idx_student_concessions_concession_type
  ON public.student_concessions(school_id, concession_type);
