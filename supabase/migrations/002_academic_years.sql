-- MyZkool Step 4: Academic Setup & Multi-Tenant Academic Years Schema
-- Migration: 002_academic_years.sql

-- 1. Create academic_years table (Tenant-Scoped)
CREATE TABLE IF NOT EXISTS public.academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  start_year INTEGER NOT NULL,
  end_year INTEGER NOT NULL,
  label TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_academic_year_range CHECK (end_year > start_year),
  CONSTRAINT chk_academic_year_bounds CHECK (start_year >= 1990 AND start_year <= 2100),
  CONSTRAINT chk_academic_date_order CHECK (end_date > start_date)
);

-- Indexing for tenant queries and active year lookups
CREATE INDEX IF NOT EXISTS idx_academic_years_school_id ON public.academic_years(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_school_current ON public.academic_years(school_id, is_current);
CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_years_school_label ON public.academic_years(school_id, LOWER(label));

-- Partial unique index ensuring at most one current academic year per school
CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_years_single_current 
  ON public.academic_years(school_id) 
  WHERE (is_current = true);

-- 2. Trigger for updated_at timestamps
DROP TRIGGER IF EXISTS trigger_academic_years_updated_at ON public.academic_years;
CREATE TRIGGER trigger_academic_years_updated_at
  BEFORE UPDATE ON public.academic_years
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3. Trigger to atomically ensure single current academic year per school
CREATE OR REPLACE FUNCTION public.handle_current_academic_year()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE public.academic_years
    SET is_current = false
    WHERE school_id = NEW.school_id
      AND id != NEW.id
      AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_handle_current_academic_year ON public.academic_years;
CREATE TRIGGER trigger_handle_current_academic_year
  BEFORE INSERT OR UPDATE OF is_current ON public.academic_years
  FOR EACH ROW
  WHEN (NEW.is_current = true)
  EXECUTE FUNCTION public.handle_current_academic_year();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for academic_years table

-- Read Policy: Authenticated users belonging to the school can view academic years
DROP POLICY IF EXISTS "School members can view own school academic years" ON public.academic_years;
CREATE POLICY "School members can view own school academic years"
  ON public.academic_years
  FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid()
    )
  );

-- Insert Policy: School Admins / Super Admins can insert academic years for their school
DROP POLICY IF EXISTS "School Admins can insert academic years for own school" ON public.academic_years;
CREATE POLICY "School Admins can insert academic years for own school"
  ON public.academic_years
  FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles 
      WHERE auth_id = auth.uid() AND role IN ('school_admin', 'super_admin')
    )
  );

-- Update Policy: School Admins / Super Admins can update academic years for their school
DROP POLICY IF EXISTS "School Admins can update academic years for own school" ON public.academic_years;
CREATE POLICY "School Admins can update academic years for own school"
  ON public.academic_years
  FOR UPDATE
  TO authenticated
  USING (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles 
      WHERE auth_id = auth.uid() AND role IN ('school_admin', 'super_admin')
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles 
      WHERE auth_id = auth.uid() AND role IN ('school_admin', 'super_admin')
    )
  );

-- Delete Policy: School Admins / Super Admins can delete academic years for their school
DROP POLICY IF EXISTS "School Admins can delete academic years for own school" ON public.academic_years;
CREATE POLICY "School Admins can delete academic years for own school"
  ON public.academic_years
  FOR DELETE
  TO authenticated
  USING (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles 
      WHERE auth_id = auth.uid() AND role IN ('school_admin', 'super_admin')
    )
  );
