-- 008_students_sensitive_and_records.sql
-- Dedicated student_sensitive table for AES-256-GCM encrypted Aadhaar and HMAC-SHA-256 search hash
-- Isolated with strict RLS requiring owner role or students.reveal_sensitive permission

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

-- Enable Row Level Security
ALTER TABLE public.student_sensitive ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS tenant_isolation_student_sensitive ON public.student_sensitive;

CREATE POLICY tenant_isolation_student_sensitive ON public.student_sensitive
  FOR ALL
  USING (
    school_id = current_school_id()
    AND (
      has_role(ARRAY['owner'])
      OR EXISTS (
        SELECT 1 FROM public.school_memberships sm
        WHERE sm.school_id = current_school_id()
          AND sm.user_id = auth.uid()
          AND 'students.reveal_sensitive' = ANY(sm.custom_permissions)
      )
    )
  );

