-- MyZkool Students Module: Foundations Migration
-- Migration: 007_students_foundations.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. Create students table
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  admission_no TEXT NOT NULL,
  sr_no TEXT,
  apaar_id TEXT,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  dob DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  blood_group TEXT,
  nationality TEXT NOT NULL DEFAULT 'Indian',
  religion TEXT,
  category TEXT CHECK (category IN ('general', 'obc', 'sc', 'st', 'ews')),
  mother_tongue TEXT,
  is_rte BOOLEAN NOT NULL DEFAULT false,
  photo_path TEXT,
  aadhaar_enc BYTEA,
  aadhaar_last4 TEXT,
  aadhaar_hash TEXT,
  admission_date DATE NOT NULL,
  admission_type TEXT NOT NULL CHECK (admission_type IN ('new', 're_admission', 'transfer_in')),
  admission_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'inactive', 'transferred', 'withdrawn', 'passed_out')),
  status_changed_on DATE,
  status_reason TEXT,
  house TEXT,
  medium TEXT,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  delete_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT unique_admission_no_per_school UNIQUE (school_id, admission_no)
);

-- Indexes for students
CREATE INDEX IF NOT EXISTS idx_students_school_id ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(school_id, status);
CREATE INDEX IF NOT EXISTS idx_students_admission_class ON public.students(admission_class_id);
CREATE INDEX IF NOT EXISTS idx_students_name_trgm ON public.students USING gin (first_name gin_trgm_ops, last_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_students_aadhaar_hash ON public.students(school_id, aadhaar_hash) WHERE aadhaar_hash IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS unique_sr_no_per_school ON public.students(school_id, sr_no) WHERE sr_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS unique_apaar_id_per_school ON public.students(school_id, apaar_id) WHERE apaar_id IS NOT NULL;

-- 2. Create student_addresses table
CREATE TABLE IF NOT EXISTS public.student_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('current', 'permanent')),
  line1 TEXT NOT NULL,
  line2 TEXT,
  locality TEXT,
  landmark TEXT,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  pin CHAR(6) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_addresses_student_id ON public.student_addresses(student_id);
CREATE INDEX IF NOT EXISTS idx_student_addresses_school_id ON public.student_addresses(school_id);

-- 3. Create parents table (standalone)
CREATE TABLE IF NOT EXISTS public.parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp_phone TEXT,
  email TEXT,
  occupation TEXT,
  qualification TEXT,
  annual_income_band TEXT,
  photo_path TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_phone_per_school UNIQUE (school_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_parents_school_id ON public.parents(school_id);
CREATE INDEX IF NOT EXISTS idx_parents_phone ON public.parents(school_id, phone);

-- 4. Create student_parents join table
CREATE TABLE IF NOT EXISTS public.student_parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  relation TEXT NOT NULL CHECK (relation IN ('father', 'mother', 'guardian')),
  is_primary_contact BOOLEAN NOT NULL DEFAULT false,
  is_fee_payer BOOLEAN NOT NULL DEFAULT false,
  is_emergency_contact BOOLEAN NOT NULL DEFAULT false,
  can_pickup BOOLEAN NOT NULL DEFAULT false,
  lives_with BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_student_parent UNIQUE (student_id, parent_id)
);

-- Partial unique index: one primary contact per student
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_parents_one_primary 
  ON public.student_parents(student_id) 
  WHERE is_primary_contact = true;

CREATE INDEX IF NOT EXISTS idx_student_parents_student_id ON public.student_parents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_parents_parent_id ON public.student_parents(parent_id);
CREATE INDEX IF NOT EXISTS idx_student_parents_school_id ON public.student_parents(school_id);

-- 5. Create student_previous_schools table
CREATE TABLE IF NOT EXISTS public.student_previous_schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_name TEXT NOT NULL,
  board TEXT,
  last_class TEXT,
  tc_no TEXT,
  tc_date DATE,
  result_percent NUMERIC(5,2),
  reason_for_leaving TEXT,
  medium TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_previous_schools_student_id ON public.student_previous_schools(student_id);
CREATE INDEX IF NOT EXISTS idx_student_previous_schools_school_id ON public.student_previous_schools(school_id);

-- 6. Create student_achievements table
CREATE TABLE IF NOT EXISTS public.student_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('academic', 'sports', 'arts', 'olympiad', 'other')),
  title TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('school', 'district', 'state', 'national', 'international')),
  year INTEGER NOT NULL,
  position_or_award TEXT,
  document_id UUID REFERENCES public.student_documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_achievements_student_id ON public.student_achievements(student_id);
CREATE INDEX IF NOT EXISTS idx_student_achievements_school_id ON public.student_achievements(school_id);

-- 7. Create document_types table (per school, editable)
CREATE TABLE IF NOT EXISTS public.document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  required_for TEXT NOT NULL CHECK (required_for IN ('all', 'new', 'category', 'rte')),
  is_required BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_document_type_key_per_school UNIQUE (school_id, key)
);

CREATE INDEX IF NOT EXISTS idx_document_types_school_id ON public.document_types(school_id);

-- 8. Create student_documents table (Document Vault)
CREATE TABLE IF NOT EXISTS public.student_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  storage_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'verified', 'rejected')),
  expected_on DATE,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  file_name TEXT,
  mime TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_documents_student_id ON public.student_documents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_school_id ON public.student_documents(school_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_status ON public.student_documents(student_id, status);

-- 9. Create student_medical table (separate for RLS gating)
CREATE TABLE IF NOT EXISTS public.student_medical (
  student_id UUID PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  allergies TEXT,
  conditions TEXT,
  medications TEXT,
  special_needs TEXT,
  vision_hearing_aids TEXT,
  immunisation_notes TEXT,
  emergency_instructions TEXT,
  doctor_name TEXT,
  doctor_phone TEXT,
  preferred_hospital TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_medical_school_id ON public.student_medical(school_id);

-- 10. Create student_events table (timeline)
CREATE TABLE IF NOT EXISTS public.student_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('admitted', 'class_changed', 'status_changed', 'document_verified', 'promoted', 'tc_issued', 'readmitted', 'note')),
  summary TEXT NOT NULL,
  meta JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_events_student_id ON public.student_events(student_id);
CREATE INDEX IF NOT EXISTS idx_student_events_school_id ON public.student_events(school_id);
CREATE INDEX IF NOT EXISTS idx_student_events_created_at ON public.student_events(student_id, created_at DESC);

-- 11. Create student_drafts table (wizard drafts)
CREATE TABLE IF NOT EXISTS public.student_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step INTEGER NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_drafts_created_by ON public.student_drafts(created_by);
CREATE INDEX IF NOT EXISTS idx_student_drafts_school_id ON public.student_drafts(school_id);

-- 12. Create student_transfer_certificates table
CREATE TABLE IF NOT EXISTS public.student_transfer_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  tc_no TEXT NOT NULL,
  issued_on DATE NOT NULL,
  last_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  last_academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  conduct TEXT,
  remarks TEXT,
  dues_cleared BOOLEAN NOT NULL DEFAULT false,
  dues_override_reason TEXT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pdf_path TEXT,
  is_duplicate_copy BOOLEAN NOT NULL DEFAULT false,
  original_tc_id UUID REFERENCES public.student_transfer_certificates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_tc_no_per_school UNIQUE (school_id, tc_no)
);

CREATE INDEX IF NOT EXISTS idx_student_transfer_certificates_student_id ON public.student_transfer_certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_student_transfer_certificates_school_id ON public.student_transfer_certificates(school_id);

-- 13. Create import_batches table
CREATE TABLE IF NOT EXISTS public.import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  created_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'validated' CHECK (status IN ('validated', 'committed', 'rolled_back', 'failed')),
  error_report_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_batches_school_id ON public.import_batches(school_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_created_by ON public.import_batches(created_by);

-- 14. Create promotion_batches table
CREATE TABLE IF NOT EXISTS public.promotion_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  from_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  to_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'committed', 'failed', 'reverted')),
  summary JSONB,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promotion_batches_school_id ON public.promotion_batches(school_id);

-- 15. Create student_enrollments table (one row per student per academic year)
CREATE TABLE IF NOT EXISTS public.student_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  roll_no TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'promoted', 'detained', 'left', 'passed_out')),
  enrolled_on DATE NOT NULL DEFAULT CURRENT_DATE,
  ended_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_student_academic_year UNIQUE (student_id, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_student_id ON public.student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_academic_year ON public.student_enrollments(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_class_section ON public.student_enrollments(class_id, section_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_school_id ON public.student_enrollments(school_id);

-- 16. Create counters table (gap-free sequences)
CREATE TABLE IF NOT EXISTS public.counters (
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  next_value BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (school_id, key)
);

CREATE INDEX IF NOT EXISTS idx_counters_school_id ON public.counters(school_id);

-- 17. Create audit_logs table (append-only)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  before JSONB,
  after JSONB,
  reason TEXT,
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No UPDATE or DELETE policies - append only
CREATE INDEX IF NOT EXISTS idx_audit_logs_school_id ON public.audit_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 18. Create communication_consents table
CREATE TABLE IF NOT EXISTS public.communication_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email')),
  status TEXT NOT NULL DEFAULT 'opted_in' CHECK (status IN ('opted_in', 'opted_out')),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL CHECK (source IN ('admission_form', 'parent_reply', 'admin_entry')),
  captured_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_parent_channel UNIQUE (parent_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_communication_consents_parent_id ON public.communication_consents(parent_id);
CREATE INDEX IF NOT EXISTS idx_communication_consents_school_id ON public.communication_consents(school_id);

-- 19. Create notification_outbox table
CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email')),
  template_key TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_parent_id UUID REFERENCES public.parents(id) ON DELETE SET NULL,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  related_type TEXT,
  related_id UUID,
  dedupe_key TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed', 'skipped')),
  provider_message_id TEXT,
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_dedupe_key UNIQUE (dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_school_id ON public.notification_outbox(school_id);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_status ON public.notification_outbox(status);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_scheduled_at ON public.notification_outbox(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_dedupe_key ON public.notification_outbox(dedupe_key) WHERE dedupe_key IS NOT NULL;

-- 20. Create v_student_siblings view
CREATE OR REPLACE VIEW public.v_student_siblings AS
SELECT 
  s1.id AS student_id,
  s2.id AS sibling_id,
  s2.first_name AS sibling_first_name,
  s2.last_name AS sibling_last_name,
  s2.admission_no AS sibling_admission_no,
  e2.class_id AS sibling_class_id,
  e2.section_id AS sibling_section_id,
  c.name AS sibling_class_name,
  sec.name AS sibling_section_name
FROM public.students s1
JOIN public.student_parents sp1 ON sp1.student_id = s1.id
JOIN public.student_parents sp2 ON sp2.parent_id = sp1.parent_id
JOIN public.students s2 ON s2.id = sp2.student_id
LEFT JOIN public.student_enrollments e2 ON e2.student_id = s2.id AND e2.status = 'active'
LEFT JOIN public.classes c ON c.id = e2.class_id
LEFT JOIN public.sections sec ON sec.id = e2.section_id
WHERE s1.id != s2.id
  AND s1.school_id = s2.school_id
  AND s1.deleted_at IS NULL
  AND s2.deleted_at IS NULL;

-- 20b. Create school_plans table (Spec 1.5)
CREATE TABLE IF NOT EXISTS public.school_plans (
  school_id UUID PRIMARY KEY REFERENCES public.schools(id) ON DELETE CASCADE,
  plan_key TEXT NOT NULL CHECK (plan_key IN ('basic', 'pro', 'custom')),
  student_limit INTEGER NOT NULL DEFAULT 800,
  features JSONB NOT NULL DEFAULT '["students", "fees"]'::jsonb,
  billing_status TEXT NOT NULL DEFAULT 'active' CHECK (billing_status IN ('trialing', 'active', 'past_due', 'cancelled')),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_school_plans_school_id ON public.school_plans(school_id);

-- 21. SQL Helper Functions

-- current_school_id(): returns the school_id for the current authenticated user
CREATE OR REPLACE FUNCTION public.current_school_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT school_id FROM public.profiles WHERE auth_id = auth.uid()),
    (SELECT id FROM public.schools WHERE created_by = auth.uid() LIMIT 1)
  );
$$;

-- has_role(role text[]): checks if current user has any of the given roles
CREATE OR REPLACE FUNCTION public.has_role(p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE auth_id = auth.uid() 
    AND role = ANY(p_roles)
  );
$$;

-- school_has_feature(feature text): checks if the current user's school has a feature enabled
CREATE OR REPLACE FUNCTION public.school_has_feature(p_feature TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id UUID;
  v_plan JSONB;
BEGIN
  v_school_id := public.current_school_id();
  IF v_school_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check school_plans first (Spec 1.5)
  SELECT features INTO v_plan
  FROM public.school_plans
  WHERE school_id = v_school_id
    AND billing_status IN ('trialing', 'active')
    AND (valid_until IS NULL OR valid_until > now());
    
  IF v_plan IS NOT NULL THEN
    RETURN v_plan ? p_feature;
  END IF;

  -- Fallback to school_subscriptions joined with subscription_plans
  SELECT sp.features INTO v_plan
  FROM public.school_subscriptions ss
  JOIN public.subscription_plans sp ON sp.id = ss.plan_id
  WHERE ss.school_id = v_school_id
    AND ss.status IN ('trialing', 'active')
  ORDER BY ss.created_at DESC
  LIMIT 1;
  
  IF v_plan IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN v_plan ? p_feature;
END;
$$;

-- 22. Updated_at triggers for all new tables
DROP TRIGGER IF EXISTS trigger_students_updated_at ON public.students;
CREATE TRIGGER trigger_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_student_addresses_updated_at ON public.student_addresses;
CREATE TRIGGER trigger_student_addresses_updated_at
  BEFORE UPDATE ON public.student_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_parents_updated_at ON public.parents;
CREATE TRIGGER trigger_parents_updated_at
  BEFORE UPDATE ON public.parents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_student_parents_updated_at ON public.student_parents;
CREATE TRIGGER trigger_student_parents_updated_at
  BEFORE UPDATE ON public.student_parents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_student_previous_schools_updated_at ON public.student_previous_schools;
CREATE TRIGGER trigger_student_previous_schools_updated_at
  BEFORE UPDATE ON public.student_previous_schools
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_student_achievements_updated_at ON public.student_achievements;
CREATE TRIGGER trigger_student_achievements_updated_at
  BEFORE UPDATE ON public.student_achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_document_types_updated_at ON public.document_types;
CREATE TRIGGER trigger_document_types_updated_at
  BEFORE UPDATE ON public.document_types
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_student_documents_updated_at ON public.student_documents;
CREATE TRIGGER trigger_student_documents_updated_at
  BEFORE UPDATE ON public.student_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_student_medical_updated_at ON public.student_medical;
CREATE TRIGGER trigger_student_medical_updated_at
  BEFORE UPDATE ON public.student_medical
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_student_events_updated_at ON public.student_events;
CREATE TRIGGER trigger_student_events_updated_at
  BEFORE UPDATE ON public.student_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_student_drafts_updated_at ON public.student_drafts;
CREATE TRIGGER trigger_student_drafts_updated_at
  BEFORE UPDATE ON public.student_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_student_transfer_certificates_updated_at ON public.student_transfer_certificates;
CREATE TRIGGER trigger_student_transfer_certificates_updated_at
  BEFORE UPDATE ON public.student_transfer_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_import_batches_updated_at ON public.import_batches;
CREATE TRIGGER trigger_import_batches_updated_at
  BEFORE UPDATE ON public.import_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_promotion_batches_updated_at ON public.promotion_batches;
CREATE TRIGGER trigger_promotion_batches_updated_at
  BEFORE UPDATE ON public.promotion_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_student_enrollments_updated_at ON public.student_enrollments;
CREATE TRIGGER trigger_student_enrollments_updated_at
  BEFORE UPDATE ON public.student_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_counters_updated_at ON public.counters;
CREATE TRIGGER trigger_counters_updated_at
  BEFORE UPDATE ON public.counters
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_communication_consents_updated_at ON public.communication_consents;
CREATE TRIGGER trigger_communication_consents_updated_at
  BEFORE UPDATE ON public.communication_consents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_notification_outbox_updated_at ON public.notification_outbox;
CREATE TRIGGER trigger_notification_outbox_updated_at
  BEFORE UPDATE ON public.notification_outbox
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 23. Enable Row Level Security (RLS) on all new tables
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_previous_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_medical ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_transfer_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

-- 24. RLS Policies

-- Helper: school_member_school_ids() - returns school_ids the user belongs to
CREATE OR REPLACE FUNCTION public.school_member_school_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.schools WHERE created_by = auth.uid()
  UNION
  SELECT school_id FROM public.profiles WHERE auth_id = auth.uid();
$$;

-- students RLS
DROP POLICY IF EXISTS "School members can view own school students" ON public.students;
CREATE POLICY "School members can view own school students"
  ON public.students FOR SELECT TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()));

DROP POLICY IF EXISTS "School admins can insert students" ON public.students;
CREATE POLICY "School admins can insert students"
  ON public.students FOR INSERT TO authenticated
  WITH CHECK (
    school_id IN (SELECT public.school_member_school_ids())
    AND public.has_role(ARRAY['school_admin', 'super_admin', 'owner'])
  );

DROP POLICY IF EXISTS "School admins can update students" ON public.students;
CREATE POLICY "School admins can update students"
  ON public.students FOR UPDATE TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()))
  WITH CHECK (school_id IN (SELECT public.school_member_school_ids()));

-- student_addresses RLS
DROP POLICY IF EXISTS "School members can view own school student addresses" ON public.student_addresses;
CREATE POLICY "School members can view own school student addresses"
  ON public.student_addresses FOR SELECT TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()));

DROP POLICY IF EXISTS "School admins can manage student addresses" ON public.student_addresses;
CREATE POLICY "School admins can manage student addresses"
  ON public.student_addresses FOR ALL TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()))
  WITH CHECK (school_id IN (SELECT public.school_member_school_ids()));

-- parents RLS
DROP POLICY IF EXISTS "School members can view own school parents" ON public.parents;
CREATE POLICY "School members can view own school parents"
  ON public.parents FOR SELECT TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()));

DROP POLICY IF EXISTS "School admins can manage parents" ON public.parents;
CREATE POLICY "School admins can manage parents"
  ON public.parents FOR ALL TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()))
  WITH CHECK (school_id IN (SELECT public.school_member_school_ids()));

-- student_parents RLS
DROP POLICY IF EXISTS "School members can view own school student_parents" ON public.student_parents;
CREATE POLICY "School members can view own school student_parents"
  ON public.student_parents FOR SELECT TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()));

DROP POLICY IF EXISTS "School admins can manage student_parents" ON public.student_parents;
CREATE POLICY "School admins can manage student_parents"
  ON public.student_parents FOR ALL TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()))
  WITH CHECK (school_id IN (SELECT public.school_member_school_ids()));

-- student_previous_schools RLS
DROP POLICY IF EXISTS "School members can view own school previous schools" ON public.student_previous_schools;
CREATE POLICY "School members can view own school previous schools"
  ON public.student_previous_schools FOR SELECT TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()));

DROP POLICY IF EXISTS "School admins can manage previous schools" ON public.student_previous_schools;
CREATE POLICY "School admins can manage previous schools"
  ON public.student_previous_schools FOR ALL TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()))
  WITH CHECK (school_id IN (SELECT public.school_member_school_ids()));

-- student_achievements RLS
DROP POLICY IF EXISTS "School members can view own school achievements" ON public.student_achievements;
CREATE POLICY "School members can view own school achievements"
  ON public.student_achievements FOR SELECT TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()));

DROP POLICY IF EXISTS "School admins can manage achievements" ON public.student_achievements;
CREATE POLICY "School admins can manage achievements"
  ON public.student_achievements FOR ALL TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()))
  WITH CHECK (school_id IN (SELECT public.school_member_school_ids()));

-- document_types RLS
DROP POLICY IF EXISTS "School members can view own school document types" ON public.document_types;
CREATE POLICY "School members can view own school document types"
  ON public.document_types FOR SELECT TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()));

DROP POLICY IF EXISTS "School admins can manage document types" ON public.document_types;
CREATE POLICY "School admins can manage document types"
  ON public.document_types FOR ALL TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()))
  WITH CHECK (school_id IN (SELECT public.school_member_school_ids()));

-- student_documents RLS
DROP POLICY IF EXISTS "School members can view own school documents" ON public.student_documents;
CREATE POLICY "School members can view own school documents"
  ON public.student_documents FOR SELECT TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()));

DROP POLICY IF EXISTS "School admins can manage documents" ON public.student_documents;
CREATE POLICY "School admins can manage documents"
  ON public.student_documents FOR ALL TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()))
  WITH CHECK (school_id IN (SELECT public.school_member_school_ids()));

-- student_medical RLS (separate permission gating)
DROP POLICY IF EXISTS "Authorized staff can view medical records" ON public.student_medical;
CREATE POLICY "Authorized staff can view medical records"
  ON public.student_medical FOR SELECT TO authenticated
  USING (
    school_id IN (SELECT public.school_member_school_ids())
    AND public.has_role(ARRAY['owner', 'school_admin'])
  );

DROP POLICY IF EXISTS "Authorized staff can update medical records" ON public.student_medical;
CREATE POLICY "Authorized staff can update medical records"
  ON public.student_medical FOR ALL TO authenticated
  USING (
    school_id IN (SELECT public.school_member_school_ids())
    AND public.has_role(ARRAY['owner', 'school_admin'])
  )
  WITH CHECK (
    school_id IN (SELECT public.school_member_school_ids())
    AND public.has_role(ARRAY['owner', 'school_admin'])
  );

-- student_events RLS
DROP POLICY IF EXISTS "School members can view own school events" ON public.student_events;
CREATE POLICY "School members can view own school events"
  ON public.student_events FOR SELECT TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()));

DROP POLICY IF EXISTS "School admins can insert events" ON public.student_events;
CREATE POLICY "School admins can insert events"
  ON public.student_events FOR INSERT TO authenticated
  WITH CHECK (school_id IN (SELECT public.school_member_school_ids()));

-- student_drafts RLS (per user)
DROP POLICY IF EXISTS "Users can view own drafts" ON public.student_drafts;
CREATE POLICY "Users can view own drafts"
  ON public.student_drafts FOR SELECT TO authenticated
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can manage own drafts" ON public.student_drafts;
CREATE POLICY "Users can manage own drafts"
  ON public.student_drafts FOR ALL TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- student_transfer_certificates RLS
DROP POLICY IF EXISTS "School members can view own school TCs" ON public.student_transfer_certificates;
CREATE POLICY "School members can view own school TCs"
  ON public.student_transfer_certificates FOR SELECT TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()));

DROP POLICY IF EXISTS "School admins can manage TCs" ON public.student_transfer_certificates;
CREATE POLICY "School admins can manage TCs"
  ON public.student_transfer_certificates FOR ALL TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()))
  WITH CHECK (school_id IN (SELECT public.school_member_school_ids()));

-- import_batches RLS
DROP POLICY IF EXISTS "School members can view own school import batches" ON public.import_batches;
CREATE POLICY "School members can view own school import batches"
  ON public.import_batches FOR SELECT TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()));

DROP POLICY IF EXISTS "School admins can manage import batches" ON public.import_batches;
CREATE POLICY "School admins can manage import batches"
  ON public.import_batches FOR ALL TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()))
  WITH CHECK (school_id IN (SELECT public.school_member_school_ids()));

-- promotion_batches RLS
DROP POLICY IF EXISTS "School members can view own school promotion batches" ON public.promotion_batches;
CREATE POLICY "School members can view own school promotion batches"
  ON public.promotion_batches FOR SELECT TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()));

DROP POLICY IF EXISTS "School admins can manage promotion batches" ON public.promotion_batches;
CREATE POLICY "School admins can manage promotion batches"
  ON public.promotion_batches FOR ALL TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()))
  WITH CHECK (school_id IN (SELECT public.school_member_school_ids()));

-- student_enrollments RLS
DROP POLICY IF EXISTS "School members can view own school enrollments" ON public.student_enrollments;
CREATE POLICY "School members can view own school enrollments"
  ON public.student_enrollments FOR SELECT TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()));

DROP POLICY IF EXISTS "School admins can manage enrollments" ON public.student_enrollments;
CREATE POLICY "School admins can manage enrollments"
  ON public.student_enrollments FOR ALL TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()))
  WITH CHECK (school_id IN (SELECT public.school_member_school_ids()));

-- counters RLS
DROP POLICY IF EXISTS "School admins can view counters" ON public.counters;
CREATE POLICY "School admins can view counters"
  ON public.counters FOR SELECT TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()));

DROP POLICY IF EXISTS "School admins can update counters" ON public.counters;
CREATE POLICY "School admins can update counters"
  ON public.counters FOR UPDATE TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()))
  WITH CHECK (school_id IN (SELECT public.school_member_school_ids()));

-- audit_logs RLS (append-only, no UPDATE/DELETE)
DROP POLICY IF EXISTS "School members can view own school audit logs" ON public.audit_logs;
CREATE POLICY "School members can view own school audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()));

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (school_id IN (SELECT public.school_member_school_ids()));

-- communication_consents RLS
DROP POLICY IF EXISTS "School members can view own school consents" ON public.communication_consents;
CREATE POLICY "School members can view own school consents"
  ON public.communication_consents FOR SELECT TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()));

DROP POLICY IF EXISTS "School admins can manage consents" ON public.communication_consents;
CREATE POLICY "School admins can manage consents"
  ON public.communication_consents FOR ALL TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()))
  WITH CHECK (school_id IN (SELECT public.school_member_school_ids()));

-- notification_outbox RLS
DROP POLICY IF EXISTS "School members can view own school outbox" ON public.notification_outbox;
CREATE POLICY "School members can view own school outbox"
  ON public.notification_outbox FOR SELECT TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()));

DROP POLICY IF EXISTS "System can manage outbox" ON public.notification_outbox;
CREATE POLICY "System can manage outbox"
  ON public.notification_outbox FOR ALL TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()))
  WITH CHECK (school_id IN (SELECT public.school_member_school_ids()));

-- school_plans RLS (Spec 1.5)
ALTER TABLE public.school_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School members can view own school plan" ON public.school_plans;
CREATE POLICY "School members can view own school plan"
  ON public.school_plans FOR SELECT TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()));

DROP POLICY IF EXISTS "School admins can manage own school plan" ON public.school_plans;
CREATE POLICY "School admins can manage own school plan"
  ON public.school_plans FOR ALL TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()))
  WITH CHECK (school_id IN (SELECT public.school_member_school_ids()));

-- 25. Seed default document types
INSERT INTO public.document_types (school_id, key, label, required_for, is_required, display_order)
SELECT 
  s.id,
  dt.key,
  dt.label,
  dt.required_for,
  dt.is_required,
  dt.display_order
FROM public.schools s
CROSS JOIN (VALUES
  ('birth_certificate', 'Birth Certificate', 'new', true, 1),
  ('previous_tc', 'Previous Transfer Certificate', 'new', true, 2),
  ('previous_report_card', 'Previous Report Card', 'new', false, 3),
  ('address_proof', 'Address Proof', 'all', true, 4),
  ('passport_photo', 'Passport Photo', 'all', true, 5),
  ('aadhaar_copy', 'Aadhaar Copy (Optional)', 'all', false, 6),
  ('category_certificate', 'Category Certificate', 'category', true, 7),
  ('income_certificate', 'Income Certificate', 'rte', true, 8),
  ('immunisation_record', 'Immunisation Record', 'all', false, 9)
) AS dt(key, label, required_for, is_required, display_order)
ON CONFLICT (school_id, key) DO NOTHING;