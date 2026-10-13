-- Migration: 20261012180000_school_onboarding_upgrade.sql
-- Description: Modernize school profile schema with district, enhanced campus address constraints,
--              hardened RLS policies, and safe subdomain availability RPC.
-- Forward-only, idempotent, and non-destructive.

-- 1. Ensure district column exists on public.schools
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS district TEXT;

-- Populate district from city for any existing rows that lack it
UPDATE public.schools
SET district = COALESCE(NULLIF(TRIM(city), ''), 'Main District')
WHERE district IS NULL;

-- 2. Add performance index on state and district
CREATE INDEX IF NOT EXISTS idx_schools_state_district
  ON public.schools (state, district);

CREATE INDEX IF NOT EXISTS idx_schools_subdomain_lower
  ON public.schools (lower(subdomain));

-- 3. Validation Constraints (Safely add if not present)
DO $$
BEGIN
  -- PIN code check constraint (Indian 6-digit postal code)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.schools'::regclass
      AND conname = 'schools_pin_code_check'
  ) THEN
    ALTER TABLE public.schools
      ADD CONSTRAINT schools_pin_code_check
      CHECK (pin_code ~ '^\d{6}$');
  END IF;

  -- Official email format check constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.schools'::regclass
      AND conname = 'schools_official_email_check'
  ) THEN
    ALTER TABLE public.schools
      ADD CONSTRAINT schools_official_email_check
      CHECK (official_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;

  -- Contact phone minimum digits check
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.schools'::regclass
      AND conname = 'schools_contact_phone_check'
  ) THEN
    ALTER TABLE public.schools
      ADD CONSTRAINT schools_contact_phone_check
      CHECK (length(regexp_replace(contact_phone, '\D', '', 'g')) >= 10);
  END IF;
END $$;

-- 4. Reconcile Subdomain check constraint for 3 to 48 characters
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.schools'::regclass
      AND conname = 'subdomain_format_check'
  ) THEN
    ALTER TABLE public.schools DROP CONSTRAINT subdomain_format_check;
  END IF;

  ALTER TABLE public.schools
    ADD CONSTRAINT subdomain_format_check
    CHECK (subdomain ~ '^[a-z0-9]([a-z0-9-]{1,46}[a-z0-9])?$');
END $$;

-- 5. Hardened Row Level Security (RLS) Policies on public.schools
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Select Policy: School Admins, Owners, Creators, or Authorized School Members
DROP POLICY IF EXISTS "School Admins can view own school" ON public.schools;
DROP POLICY IF EXISTS "school_tenant_select" ON public.schools;
CREATE POLICY "school_tenant_select"
  ON public.schools
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR id IN (SELECT school_id FROM public.profiles WHERE auth_id = auth.uid())
    OR (
      to_regclass('public.school_members') IS NOT NULL
      AND id IN (
        SELECT school_id FROM public.school_members
        WHERE user_id = auth.uid() AND active = true
      )
    )
  );

-- Insert Policy: Authenticated users can insert their own initial school
DROP POLICY IF EXISTS "Authenticated users can create a school" ON public.schools;
DROP POLICY IF EXISTS "school_tenant_insert" ON public.schools;
CREATE POLICY "school_tenant_insert"
  ON public.schools
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Update Policy: Only creator or designated admin/owner of that specific school
DROP POLICY IF EXISTS "School Admins can update own school" ON public.schools;
DROP POLICY IF EXISTS "school_tenant_update" ON public.schools;
CREATE POLICY "school_tenant_update"
  ON public.schools
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR id IN (
      SELECT school_id FROM public.profiles
      WHERE auth_id = auth.uid()
        AND role IN ('school_admin', 'super_admin', 'owner', 'admin')
    )
    OR (
      to_regclass('public.school_members') IS NOT NULL
      AND id IN (
        SELECT school_id FROM public.school_members
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'admin')
          AND active = true
      )
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR id IN (
      SELECT school_id FROM public.profiles
      WHERE auth_id = auth.uid()
        AND role IN ('school_admin', 'super_admin', 'owner', 'admin')
    )
    OR (
      to_regclass('public.school_members') IS NOT NULL
      AND id IN (
        SELECT school_id FROM public.school_members
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'admin')
          AND active = true
      )
    )
  );

-- 6. Safe Subdomain Availability Check Function (SECURITY DEFINER)
-- Allows validation of unallocated slugs without leaking competitor rows
CREATE OR REPLACE FUNCTION public.check_subdomain_availability(
  p_subdomain TEXT,
  p_current_school_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_normalized TEXT;
  v_exists BOOLEAN;
BEGIN
  v_normalized := LOWER(TRIM(p_subdomain));
  IF v_normalized IS NULL OR length(v_normalized) < 3 OR length(v_normalized) > 48 THEN
    RETURN FALSE;
  END IF;

  IF p_current_school_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.schools
      WHERE LOWER(subdomain) = v_normalized
        AND id != p_current_school_id
    ) INTO v_exists;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.schools
      WHERE LOWER(subdomain) = v_normalized
    ) INTO v_exists;
  END IF;

  RETURN NOT v_exists;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_subdomain_availability(TEXT, UUID) TO authenticated, anon;

-- 7. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
