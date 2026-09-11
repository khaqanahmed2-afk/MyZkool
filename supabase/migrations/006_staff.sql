-- MyZkool Step 9: Staff Setup Schema
-- Migration: 006_staff.sql

-- 1. Create staff table (Tenant-scoped Staff Directory)
CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_code TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL,
  designation TEXT,
  joining_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_staff_role CHECK (role IN ('teacher', 'accountant')),
  CONSTRAINT valid_staff_status CHECK (status IN ('active', 'archived', 'inactive'))
);

-- Unique index on employee_code per school (case-insensitive, ignoring null/blank)
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_school_employee_code 
  ON public.staff (school_id, LOWER(employee_code)) 
  WHERE employee_code IS NOT NULL AND employee_code <> '';

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_staff_school_id 
  ON public.staff (school_id);

CREATE INDEX IF NOT EXISTS idx_staff_role 
  ON public.staff (school_id, role);

CREATE INDEX IF NOT EXISTS idx_staff_status 
  ON public.staff (school_id, status);

-- 2. Updated_at trigger
DROP TRIGGER IF EXISTS trigger_staff_updated_at ON public.staff;
CREATE TRIGGER trigger_staff_updated_at
  BEFORE UPDATE ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for public.staff
-- Authenticated school members can view their own school's staff directory
DROP POLICY IF EXISTS "School members can view own school staff" ON public.staff;
CREATE POLICY "School members can view own school staff"
  ON public.staff FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid()
    )
  );

-- Only School Admins and Super Admins can insert, update, and delete staff records
DROP POLICY IF EXISTS "School Admins can manage own school staff" ON public.staff;
CREATE POLICY "School Admins can manage own school staff"
  ON public.staff FOR ALL TO authenticated
  USING (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid() AND role IN ('school_admin', 'super_admin')
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid() AND role IN ('school_admin', 'super_admin')
    )
  );
