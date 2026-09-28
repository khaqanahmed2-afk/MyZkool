-- Migration 015: Transport Assignments, Requests, and Absences (Spec C3, C5, C7, C13)
-- Creates tables for student transport assignments, requests, and absences with school_has_feature('transport') RLS.

-- 1. transport_assignments
CREATE TABLE IF NOT EXISTS public.transport_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.transport_routes(id) ON DELETE RESTRICT,
  pickup_stop_id UUID NOT NULL REFERENCES public.route_stops(id) ON DELETE RESTRICT,
  drop_stop_id UUID NOT NULL REFERENCES public.route_stops(id) ON DELETE RESTRICT,
  service_type TEXT NOT NULL CHECK (service_type IN ('both', 'pickup_only', 'drop_only')),
  effective_from DATE NOT NULL,
  effective_to DATE,
  monthly_fee_paise BIGINT NOT NULL CHECK (monthly_fee_paise >= 0),
  requires_guardian_handover BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  end_reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One active assignment per student per academic year (Rule C7.1)
CREATE UNIQUE INDEX IF NOT EXISTS idx_transport_assignments_active_student
  ON public.transport_assignments (school_id, student_id, academic_year_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_transport_assignments_route
  ON public.transport_assignments (route_id, status);

CREATE INDEX IF NOT EXISTS idx_transport_assignments_student
  ON public.transport_assignments (student_id);

-- 2. transport_requests
CREATE TABLE IF NOT EXISTS public.transport_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  requested_location TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transport_requests_school_status
  ON public.transport_requests (school_id, status);

CREATE INDEX IF NOT EXISTS idx_transport_requests_student
  ON public.transport_requests (student_id);

-- 3. transport_absences
CREATE TABLE IF NOT EXISTS public.transport_absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transport_absences_student_dates
  ON public.transport_absences (student_id, date_from, date_to);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_transport_assignments_updated_at ON public.transport_assignments;
CREATE TRIGGER trigger_transport_assignments_updated_at
  BEFORE UPDATE ON public.transport_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_transport_requests_updated_at ON public.transport_requests;
CREATE TRIGGER trigger_transport_requests_updated_at
  BEFORE UPDATE ON public.transport_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ─── Row Level Security with school_has_feature('transport') ─────────────────

ALTER TABLE public.transport_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_absences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transport_assignments_isolation" ON public.transport_assignments;
CREATE POLICY "transport_assignments_isolation" ON public.transport_assignments
  FOR ALL USING (
    school_id = public.current_school_id() 
    AND public.school_has_feature('transport')
  );

DROP POLICY IF EXISTS "transport_requests_isolation" ON public.transport_requests;
CREATE POLICY "transport_requests_isolation" ON public.transport_requests
  FOR ALL USING (
    school_id = public.current_school_id() 
    AND public.school_has_feature('transport')
  );

DROP POLICY IF EXISTS "transport_absences_isolation" ON public.transport_absences;
CREATE POLICY "transport_absences_isolation" ON public.transport_absences
  FOR ALL USING (
    school_id = public.current_school_id() 
    AND public.school_has_feature('transport')
  );

