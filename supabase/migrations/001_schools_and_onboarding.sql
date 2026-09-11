-- MyZkool Step 3: School Onboarding Foundation & Multi-Tenant Schema
-- Migration: 001_schools_and_onboarding.sql

-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create schools table (Tenant Root)
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT NOT NULL,
  school_type TEXT NOT NULL DEFAULT 'k12',
  affiliation_board TEXT,
  official_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pin_code TEXT NOT NULL,
  logo_url TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  onboarding_step INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subdomain_format_check CHECK (subdomain ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  CONSTRAINT onboarding_step_check CHECK (onboarding_step BETWEEN 1 AND 8)
);

-- Unique index on lowercase subdomain to guarantee case-insensitive uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_subdomain_unique ON public.schools (LOWER(subdomain));
CREATE INDEX IF NOT EXISTS idx_schools_created_by ON public.schools (created_by);
CREATE INDEX IF NOT EXISTS idx_schools_onboarding_status ON public.schools (onboarding_completed, onboarding_step);

-- 2. Create or verify profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'school_admin',
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  phone TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  current_onboarding_step TEXT NOT NULL DEFAULT '/onboarding/school',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_auth_id ON public.profiles (auth_id);
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON public.profiles (school_id);

-- 3. Trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_schools_updated_at ON public.schools;
CREATE TRIGGER trigger_schools_updated_at
  BEFORE UPDATE ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for schools table
-- School Admins can only view their own school
DROP POLICY IF EXISTS "School Admins can view own school" ON public.schools;
CREATE POLICY "School Admins can view own school"
  ON public.schools
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    id IN (SELECT school_id FROM public.profiles WHERE auth_id = auth.uid())
  );

-- Authenticated users can insert their initial school record
DROP POLICY IF EXISTS "Authenticated users can create a school" ON public.schools;
CREATE POLICY "Authenticated users can create a school"
  ON public.schools
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- School Admins can only update their own school
DROP POLICY IF EXISTS "School Admins can update own school" ON public.schools;
CREATE POLICY "School Admins can update own school"
  ON public.schools
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    id IN (SELECT school_id FROM public.profiles WHERE auth_id = auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid() OR
    id IN (SELECT school_id FROM public.profiles WHERE auth_id = auth.uid())
  );

-- 6. RLS Policies for profiles table
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

-- 7. Secure Subdomain Availability Check Function
-- Allows checking if a subdomain is taken without exposing other school records
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
  
  -- Reserved subdomains check
  IF v_normalized = ANY(ARRAY[
    'www', 'admin', 'api', 'app', 'login', 'support', 'help', 'status',
    'portal', 'mail', 'auth', 'myzkool', 'dev', 'staging', 'demo', 'test',
    'billing', 'account', 'dashboard', 'root', 'superadmin', 'cdn', 'assets',
    'static', 'secure', 'dns', 'mx', 'smtp', 'imap', 'ftp', 'ssh'
  ]) THEN
    RETURN FALSE;
  END IF;

  -- Regex format validation
  IF NOT (v_normalized ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$') THEN
    RETURN FALSE;
  END IF;

  -- Query existing schools
  SELECT EXISTS(
    SELECT 1 FROM public.schools
    WHERE LOWER(subdomain) = v_normalized
      AND (p_current_school_id IS NULL OR id != p_current_school_id)
  ) INTO v_exists;

  RETURN NOT v_exists;
END;
$$;
