-- Migration: 016_fix_students_rls_authorization.sql
-- Fixes RLS authorization on public.students table for SCHOOL_ADMIN
-- Preserves strict multi-tenant isolation, ensuring users only access their own school's data.

-- 1. Helper function: school_admin_school_ids()
-- Returns school IDs where current authenticated user is an authorized administrator:
-- A) Schools created by current user (created_by = auth.uid())
-- B) Schools where user's profile has an admin role ('school_admin', 'super_admin', 'owner', 'admin')
CREATE OR REPLACE FUNCTION public.school_admin_school_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Schools created by current user
  SELECT id FROM public.schools 
  WHERE created_by = auth.uid() 
    AND id IS NOT NULL
  UNION
  -- Schools where user has an administrative role in profiles
  SELECT school_id FROM public.profiles 
  WHERE auth_id = auth.uid() 
    AND school_id IS NOT NULL 
    AND LOWER(TRIM(role)) IN ('school_admin', 'super_admin', 'owner', 'admin');
$$;

-- 2. Helper function: is_school_admin(p_school_id UUID)
-- Scalar check returning boolean whether auth.uid() is an authorized administrator for p_school_id
CREATE OR REPLACE FUNCTION public.is_school_admin(p_school_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    p_school_id IS NOT NULL 
    AND auth.uid() IS NOT NULL
    AND p_school_id IN (SELECT public.school_admin_school_ids())
  );
$$;

-- 3. Fix school_member_school_ids()
-- Ensures NULLs from profile.school_id are filtered out so that IN expressions don't evaluate to NULL
CREATE OR REPLACE FUNCTION public.school_member_school_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Schools created by user
  SELECT id FROM public.schools 
  WHERE created_by = auth.uid() 
    AND id IS NOT NULL
  UNION
  -- Schools where user is a profile member
  SELECT school_id FROM public.profiles 
  WHERE auth_id = auth.uid() 
    AND school_id IS NOT NULL;
$$;

-- 4. Fix current_school_id()
-- Safely resolves the active school ID for auth.uid() without returning NULL if created_by matches
CREATE OR REPLACE FUNCTION public.current_school_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT school_id FROM public.profiles WHERE auth_id = auth.uid() AND school_id IS NOT NULL LIMIT 1),
    (SELECT id FROM public.schools WHERE created_by = auth.uid() AND id IS NOT NULL LIMIT 1)
  );
$$;

-- 5. Fix has_role(p_roles TEXT[])
-- Robust role resolution: handles case-insensitivity, whitespace, role aliases, and school creators
CREATE OR REPLACE FUNCTION public.has_role(p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_roles TEXT[];
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Normalize target roles to lowercase trimmed
  SELECT array_agg(LOWER(TRIM(r))) INTO v_normalized_roles
  FROM unnest(p_roles) AS r;

  -- If user created any school, they are considered owner/school_admin
  IF EXISTS (SELECT 1 FROM public.schools WHERE created_by = auth.uid()) THEN
    IF ('school_admin' = ANY(v_normalized_roles)) 
       OR ('super_admin' = ANY(v_normalized_roles)) 
       OR ('owner' = ANY(v_normalized_roles)) 
       OR ('admin' = ANY(v_normalized_roles)) THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Check profiles table (case-insensitive, trimmed, alias-aware)
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE auth_id = auth.uid() 
    AND (
      LOWER(TRIM(role)) = ANY(v_normalized_roles)
      OR (
        'school_admin' = ANY(v_normalized_roles) 
        AND LOWER(TRIM(role)) IN ('admin', 'school_admin')
      )
      OR (
        'super_admin' = ANY(v_normalized_roles) 
        AND LOWER(TRIM(role)) IN ('owner', 'super_admin')
      )
      OR (
        'admin' = ANY(v_normalized_roles) 
        AND LOWER(TRIM(role)) IN ('admin', 'school_admin')
      )
      OR (
        'owner' = ANY(v_normalized_roles) 
        AND LOWER(TRIM(role)) IN ('owner', 'super_admin')
      )
    )
  );
END;
$$;

-- 6. Re-apply students RLS policies
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School members can view own school students" ON public.students;
DROP POLICY IF EXISTS "School admins can insert students" ON public.students;
DROP POLICY IF EXISTS "School admins can update students" ON public.students;
DROP POLICY IF EXISTS "School admins can delete students" ON public.students;
DROP POLICY IF EXISTS "School Admins can manage students" ON public.students;
DROP POLICY IF EXISTS "tenant_isolation_students" ON public.students;

-- SELECT: Authenticated members of the school can view students of their school
CREATE POLICY "School members can view own school students"
  ON public.students FOR SELECT TO authenticated
  USING (
    school_id IN (SELECT public.school_member_school_ids())
  );

-- INSERT: Authenticated school admins can insert students into their school
CREATE POLICY "School admins can insert students"
  ON public.students FOR INSERT TO authenticated
  WITH CHECK (
    school_id IN (SELECT public.school_admin_school_ids())
  );

-- UPDATE: Authenticated school admins can update students of their school
CREATE POLICY "School admins can update students"
  ON public.students FOR UPDATE TO authenticated
  USING (
    school_id IN (SELECT public.school_admin_school_ids())
  )
  WITH CHECK (
    school_id IN (SELECT public.school_admin_school_ids())
  );

-- DELETE: Authenticated school admins can delete students of their school
CREATE POLICY "School admins can delete students"
  ON public.students FOR DELETE TO authenticated
  USING (
    school_id IN (SELECT public.school_admin_school_ids())
  );

-- 7. Ensure counters table has insert/manage policy for new school sequences
DROP POLICY IF EXISTS "School admins can insert counters" ON public.counters;
DROP POLICY IF EXISTS "School admins can view counters" ON public.counters;
DROP POLICY IF EXISTS "School admins can update counters" ON public.counters;
DROP POLICY IF EXISTS "School admins can manage counters" ON public.counters;

CREATE POLICY "School members can view counters"
  ON public.counters FOR SELECT TO authenticated
  USING (
    school_id IN (SELECT public.school_member_school_ids())
  );

CREATE POLICY "School admins can manage counters"
  ON public.counters FOR ALL TO authenticated
  USING (
    school_id IN (SELECT public.school_admin_school_ids())
  )
  WITH CHECK (
    school_id IN (SELECT public.school_admin_school_ids())
  );

-- 8. Bulk Import & Ancillary Tables RLS Policies
-- import_batches: Ensure school admins can insert, update, and manage import batches
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.import_batches ALTER COLUMN created_by SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "School members can view own school import batches" ON public.import_batches;
CREATE POLICY "School members can view own school import batches"
  ON public.import_batches FOR SELECT TO authenticated
  USING (
    school_id IN (SELECT public.school_member_school_ids())
  );

DROP POLICY IF EXISTS "School admins can manage import batches" ON public.import_batches;
CREATE POLICY "School admins can manage import batches"
  ON public.import_batches FOR ALL TO authenticated
  USING (
    school_id IN (SELECT public.school_admin_school_ids())
  )
  WITH CHECK (
    school_id IN (SELECT public.school_admin_school_ids())
  );

-- parents: Ensure school admins can insert/update/delete parents
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School members can view own school parents" ON public.parents;
CREATE POLICY "School members can view own school parents"
  ON public.parents FOR SELECT TO authenticated
  USING (
    school_id IN (SELECT public.school_member_school_ids())
  );

DROP POLICY IF EXISTS "School admins can manage parents" ON public.parents;
CREATE POLICY "School admins can manage parents"
  ON public.parents FOR ALL TO authenticated
  USING (
    school_id IN (SELECT public.school_admin_school_ids())
  )
  WITH CHECK (
    school_id IN (SELECT public.school_admin_school_ids())
  );

-- student_parents: Ensure school admins can manage student_parents
ALTER TABLE public.student_parents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School members can view own school student_parents" ON public.student_parents;
CREATE POLICY "School members can view own school student_parents"
  ON public.student_parents FOR SELECT TO authenticated
  USING (
    school_id IN (SELECT public.school_member_school_ids())
  );

DROP POLICY IF EXISTS "School admins can manage student_parents" ON public.student_parents;
CREATE POLICY "School admins can manage student_parents"
  ON public.student_parents FOR ALL TO authenticated
  USING (
    school_id IN (SELECT public.school_admin_school_ids())
  )
  WITH CHECK (
    school_id IN (SELECT public.school_admin_school_ids())
  );

-- student_enrollments: Ensure school admins can manage enrollments
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School members can view own school enrollments" ON public.student_enrollments;
CREATE POLICY "School members can view own school enrollments"
  ON public.student_enrollments FOR SELECT TO authenticated
  USING (
    school_id IN (SELECT public.school_member_school_ids())
  );

DROP POLICY IF EXISTS "School admins can manage enrollments" ON public.student_enrollments;
CREATE POLICY "School admins can manage enrollments"
  ON public.student_enrollments FOR ALL TO authenticated
  USING (
    school_id IN (SELECT public.school_admin_school_ids())
  )
  WITH CHECK (
    school_id IN (SELECT public.school_admin_school_ids())
  );

-- student_addresses: Ensure school admins can manage addresses
ALTER TABLE public.student_addresses ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  ALTER TABLE public.student_addresses ALTER COLUMN district DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DROP POLICY IF EXISTS "School members can view own school addresses" ON public.student_addresses;
CREATE POLICY "School members can view own school addresses"
  ON public.student_addresses FOR SELECT TO authenticated
  USING (
    school_id IN (SELECT public.school_member_school_ids())
  );

DROP POLICY IF EXISTS "School admins can manage addresses" ON public.student_addresses;
CREATE POLICY "School admins can manage addresses"
  ON public.student_addresses FOR ALL TO authenticated
  USING (
    school_id IN (SELECT public.school_admin_school_ids())
  )
  WITH CHECK (
    school_id IN (SELECT public.school_admin_school_ids())
  );

