-- 008_students_sensitive_and_records.sql
-- Dedicated student_sensitive table for AES-256-GCM encrypted Aadhaar and HMAC-SHA-256 search hash
-- Isolated with strict RLS requiring owner role or students.reveal_sensitive permission

-- 1. Ensure profiles table has custom_permissions column for grantable permissions
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS custom_permissions TEXT[] NOT NULL DEFAULT '{}';

-- 2. Compatibility view for school_memberships mapping to profiles
CREATE OR REPLACE VIEW public.school_memberships AS
SELECT 
  id,
  school_id,
  auth_id AS user_id,
  role,
  custom_permissions,
  created_at,
  updated_at
FROM public.profiles;

-- 3. Dedicated student_sensitive table
CREATE TABLE IF NOT EXISTS public.student_sensitive (
  student_id UUID PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  aadhaar_enc BYTEA,
  aadhaar_last4 TEXT,
  aadhaar_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_sensitive_school_id ON public.student_sensitive(school_id);
CREATE INDEX IF NOT EXISTS idx_student_sensitive_aadhaar_hash ON public.student_sensitive(school_id, aadhaar_hash) WHERE aadhaar_hash IS NOT NULL;

-- 4. Enable Row Level Security
ALTER TABLE public.student_sensitive ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS tenant_isolation_student_sensitive ON public.student_sensitive;

CREATE POLICY tenant_isolation_student_sensitive ON public.student_sensitive
  FOR ALL
  USING (
    school_id = current_school_id()
    AND (
      has_role(ARRAY['owner'])
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.school_id = current_school_id()
          AND p.auth_id = auth.uid()
          AND 'students.reveal_sensitive' = ANY(p.custom_permissions)
      )
    )
  );
