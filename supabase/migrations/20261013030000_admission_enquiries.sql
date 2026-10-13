-- Migration: 20261013030000_admission_enquiries.sql
-- Description: Table and RLS policies for public school website admission enquiries

CREATE TABLE IF NOT EXISTS public.admission_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  parent_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  class_grade TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admission_enquiries_school_id
  ON public.admission_enquiries(school_id, created_at DESC);

ALTER TABLE public.admission_enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert admission enquiries" ON public.admission_enquiries;
CREATE POLICY "Public can insert admission enquiries"
  ON public.admission_enquiries FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "School members can view admission enquiries" ON public.admission_enquiries;
CREATE POLICY "School members can view admission enquiries"
  ON public.admission_enquiries FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS trigger_admission_enquiries_updated_at ON public.admission_enquiries;
CREATE TRIGGER trigger_admission_enquiries_updated_at
  BEFORE UPDATE ON public.admission_enquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
