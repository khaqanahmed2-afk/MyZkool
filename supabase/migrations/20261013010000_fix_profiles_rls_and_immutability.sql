-- Migration: 20261013010000_fix_profiles_rls_and_immutability.sql
-- Description: Fix profiles table API errors:
-- 1. Update prevent_school_id_update() trigger function to allow initial school binding when school_id is NULL
-- 2. Add BEFORE INSERT trigger to auto-populate missing required columns (email, full_name) from auth.users
-- 3. Add AFTER INSERT trigger on auth.users to auto-provision profile rows on user signup
-- 4. Backfill any existing auth users without a profile
-- 5. Harden profiles RLS policies for SELECT, INSERT, UPDATE

-- ============================================================================
-- 1. UPDATE prevent_school_id_update() TRIGGER FUNCTION
-- ============================================================================
-- Allow transition from NULL to school_id (initial onboarding binding).
-- Strictly prohibit transferring or clearing school_id once bound.
CREATE OR REPLACE FUNCTION public.prevent_school_id_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Allow initial school binding if school_id was previously NULL (e.g. during onboarding)
  IF OLD.school_id IS NULL AND NEW.school_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Block any subsequent alteration or tampering of school_id across tenant entities
  IF OLD.school_id IS DISTINCT FROM NEW.school_id THEN
    RAISE EXCEPTION 'Security Violation: school_id is immutable and cannot be transferred (% -> %)', OLD.school_id, NEW.school_id;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. AUTO-POPULATE REQUIRED PROFILE FIELDS BEFORE INSERT
-- ============================================================================
-- Ensures upserts/inserts from client omitting email or full_name do not fail
-- with 23502 (NOT NULL constraint violation).
CREATE OR REPLACE FUNCTION public.sync_profile_auth_details()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If email is missing, resolve from auth.users
  IF NEW.email IS NULL OR NEW.email = '' THEN
    SELECT email INTO NEW.email FROM auth.users WHERE id = NEW.auth_id;
    IF NEW.email IS NULL THEN
      NEW.email := 'user@myzkool.internal';
    END IF;
  END IF;

  -- If full_name is missing, resolve from auth metadata or email
  IF NEW.full_name IS NULL OR NEW.full_name = '' THEN
    SELECT COALESCE(
      raw_user_meta_data->>'full_name',
      raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1),
      'School Administrator'
    )
    INTO NEW.full_name
    FROM auth.users
    WHERE id = NEW.auth_id;

    IF NEW.full_name IS NULL OR NEW.full_name = '' THEN
      NEW.full_name := 'School Administrator';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_profile_auth_details ON public.profiles;
CREATE TRIGGER trigger_sync_profile_auth_details
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_auth_details();

-- ============================================================================
-- 3. AUTO-PROVISION PROFILE ON AUTH USER CREATION
-- ============================================================================
-- Guarantees a public.profiles row exists immediately when an auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (
    auth_id,
    email,
    full_name,
    role,
    school_id,
    onboarding_completed,
    current_onboarding_step
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, 'user'), '@', 1),
      'School Administrator'
    ),
    COALESCE(NEW.raw_user_meta_data->>'role', 'school_admin'),
    CASE
      WHEN NEW.raw_user_meta_data->>'school_id' IS NOT NULL
           AND NEW.raw_user_meta_data->>'school_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (NEW.raw_user_meta_data->>'school_id')::uuid
      ELSE NULL
    END,
    COALESCE((NEW.raw_user_meta_data->>'onboarding_completed')::boolean, false),
    COALESCE(NEW.raw_user_meta_data->>'current_onboarding_step', '/onboarding/school')
  )
  ON CONFLICT (auth_id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = CASE
      WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = ''
      THEN EXCLUDED.full_name
      ELSE public.profiles.full_name
    END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

-- ============================================================================
-- 4. BACKFILL ORPHANED AUTH USERS INTO PROFILES
-- ============================================================================
INSERT INTO public.profiles (
  auth_id,
  email,
  full_name,
  role,
  school_id,
  onboarding_completed,
  current_onboarding_step
)
SELECT
  u.id,
  COALESCE(u.email, ''),
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(COALESCE(u.email, 'user'), '@', 1),
    'School Administrator'
  ),
  COALESCE(u.raw_user_meta_data->>'role', 'school_admin'),
  CASE
    WHEN u.raw_user_meta_data->>'school_id' IS NOT NULL
         AND u.raw_user_meta_data->>'school_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN (u.raw_user_meta_data->>'school_id')::uuid
    ELSE NULL
  END,
  COALESCE((u.raw_user_meta_data->>'onboarding_completed')::boolean, false),
  COALESCE(u.raw_user_meta_data->>'current_onboarding_step', '/onboarding/school')
FROM auth.users u
LEFT JOIN public.profiles p ON p.auth_id = u.id
WHERE p.id IS NULL
ON CONFLICT (auth_id) DO NOTHING;

-- ============================================================================
-- 5. VERIFY AND HARDEN RLS POLICIES ON PROFILES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
